/**
 * Fix Logos — re-downloads and re-uploads logos for companies whose logo_url
 * is not already in Supabase storage.
 *
 * Usage (SSE stream):
 *   POST /api/fix-logos           — fix ALL companies with non-storage logos
 *   POST /api/fix-logos { slug }  — fix a single company
 *
 * SSE event format:
 *   data: {"type":"start","total":81}\n\n
 *   data: {"type":"ok","slug":"airbnb","url":"https://...supabase.co/storage/..."}\n\n
 *   data: {"type":"skip","slug":"stripe","reason":"already in storage"}\n\n
 *   data: {"type":"fail","slug":"amazon","reason":"download failed"}\n\n
 *   data: {"type":"summary","fixed":70,"skipped":5,"failed":6,"total":81}\n\n
 */
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ─── Auth ─────────────────────────────────────────────────────────────────────

async function getAdminClient() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('plan').eq('id', user.id).single()
  if (!['Admin', 'SuperAdmin'].includes(profile?.plan ?? '')) return null
  return supabase
}

// ─── Logo downloader + uploader ───────────────────────────────────────────────

const EXT_MAP: Record<string, string> = {
  'image/svg+xml': 'svg',
  'image/png':     'png',
  'image/jpeg':    'jpg',
  'image/webp':    'webp',
  'image/gif':     'gif',
  'image/x-icon':             'ico',
  'image/vnd.microsoft.icon': 'ico',
}

async function downloadAndUpload(
  supabase: Awaited<ReturnType<typeof createClient>>,
  logoUrl: string,
  slug: string,
): Promise<string | null> {
  try {
    const res = await fetch(logoUrl, {
      headers: { 'User-Agent': 'ResearchOrg/2.0 LogoUploader' },
      signal: AbortSignal.timeout(12_000),
    })
    if (!res.ok) return null

    const contentType = res.headers.get('content-type') ?? 'image/png'
    const ct = contentType.split(';')[0].trim()
    const buffer = await res.arrayBuffer()

    // Reject tiny files (< 200 bytes) or oversized (> 512 KB)
    if (buffer.byteLength < 200 || buffer.byteLength > 524_288) return null

    // For .ico files accept them but note they may look bad
    const ext = EXT_MAP[ct] ?? 'png'
    const filePath = `${slug}.${ext}`

    const { error } = await supabase.storage.from('logos').upload(filePath, buffer, {
      contentType: ct, upsert: true, cacheControl: '3600',
    })
    if (error) return null

    return supabase.storage.from('logos').getPublicUrl(filePath).data.publicUrl
  } catch {
    return null
  }
}

// ─── Try a list of candidate URLs in order, return first that uploads ─────────

async function resolveAndUpload(
  supabase: Awaited<ReturnType<typeof createClient>>,
  slug: string,
  website: string | null,
  currentLogoUrl: string | null,
): Promise<string | null> {
  const domain = (() => {
    const raw = website ?? `https://${slug.replace(/-/g, '')}.com`
    try { return new URL(raw.startsWith('http') ? raw : `https://${raw}`).hostname.replace(/^www\./, '') }
    catch { return '' }
  })()

  const candidates = [
    // 1. Try current URL first (might just need re-uploading)
    ...(currentLogoUrl && !currentLogoUrl.includes('supabase.co') ? [currentLogoUrl] : []),
    // 2. icon.horse — reliable fallback for any domain
    ...(domain ? [`https://icon.horse/icon/${domain}`] : []),
  ]

  for (const url of candidates) {
    const stored = await downloadAndUpload(supabase, url, slug)
    if (stored) return stored
  }
  return null
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  console.log('[fix-logos] request received')

  const supabase = await getAdminClient()
  if (!supabase) {
    console.warn('[fix-logos] unauthorized request rejected')
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  let targetSlug: string | null = null
  try {
    const body = await req.json()
    if (body?.slug) targetSlug = String(body.slug).trim()
  } catch { /* no body — fix all */ }

  console.log('[fix-logos] target:', targetSlug ?? 'all')

  const storagePrefix = 'supabase.co/storage'

  // Fetch companies to fix
  let query = supabase.from('companies').select('slug, logo_url, website')
  if (targetSlug) {
    query = query.eq('slug', targetSlug)
  } else {
    query = query.or(`logo_url.is.null,logo_url.eq.,logo_url.not.like.%${storagePrefix}%`)
  }
  const { data: companies, error } = await query

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
  if (!companies || companies.length === 0) {
    return new Response(JSON.stringify({ message: 'All logos already in storage', fixed: 0 }), { status: 200 })
  }

  const enc = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: Record<string, unknown>) {
        try { controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`)) }
        catch { /* client disconnected */ }
      }

      const total = companies.length
      send({ type: 'start', total })

      let fixed = 0, skipped = 0, failed = 0

      for (const co of companies) {
        const { slug, logo_url, website } = co as { slug: string; logo_url: string | null; website: string | null }

        // Double-check: skip if already in storage (handles the case where
        // the query returned it but it's actually fine)
        if (logo_url && logo_url.includes(storagePrefix)) {
          skipped++
          send({ type: 'skip', slug, reason: 'already in storage' })
          continue
        }

        const stored = await resolveAndUpload(supabase, slug, website, logo_url)

        if (stored) {
          // Update the DB
          await supabase.from('companies').update({ logo_url: stored }).eq('slug', slug)
          fixed++
          send({ type: 'ok', slug, url: stored })
        } else {
          failed++
          send({ type: 'fail', slug, reason: 'all sources failed' })
        }
      }

      send({ type: 'summary', fixed, skipped, failed, total })
      try { controller.close() } catch { /* already closed */ }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':      'text/event-stream',
      'Cache-Control':     'no-cache, no-transform',
      'Connection':        'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
