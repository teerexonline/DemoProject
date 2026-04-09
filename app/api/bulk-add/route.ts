/**
 * Bulk Add Companies from CSV — validates CSV then streams SSE progress
 * while adding each company and running all content scrapers.
 *
 * Expected CSV format (header row optional):
 *   name,website
 *   Stripe,stripe.com
 *   Google,google.com
 *
 * Validation: every row must have a non-empty name AND website.
 * If any row is invalid the entire request is rejected with 422 before streaming.
 *
 * Seed sequence per company (mirrors global seed):
 *   seed_company.py → upsert + logo → departments → exec_groups → roles →
 *   news → milestones → products → financials
 *
 * SSE event format:
 *   data: {"type":"validated","rows":3}\n\n
 *   data: {"type":"start","company":"Stripe","index":1,"total":3}\n\n
 *   data: {"type":"step","company":"Stripe","step":"company","status":"ok"}\n\n
 *   data: {"type":"step","company":"Stripe","step":"departments","status":"ok","count":9}\n\n
 *   data: {"type":"step","company":"Stripe","step":"roles","status":"error","message":"…"}\n\n
 *   data: {"type":"done","company":"Stripe","index":1}\n\n
 *   data: {"type":"summary","added":3,"failed":0,"total":3}\n\n
 */
import { NextRequest }    from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient }   from '@/lib/supabase/server'
import { runScript }      from '@/lib/run-scraper'

// ─── Auth ─────────────────────────────────────────────────────────────────────

async function getAdminClient() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('plan').eq('id', user.id).single()
  if (!['Admin', 'SuperAdmin'].includes(profile?.plan ?? '')) return null
  return { supabase, user }
}

// ─── CSV parser ───────────────────────────────────────────────────────────────
// Handles quoted fields, Windows/Unix line endings, optional header row.

interface CsvRow  { name: string; website: string }
interface CsvError { row: number; message: string }

function parseCsv(text: string): { rows: CsvRow[]; errors: CsvError[] } {
  const lines  = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim())
  const rows: CsvRow[]   = []
  const errors: CsvError[] = []

  function unquote(s: string) {
    s = s.trim()
    if (s.startsWith('"') && s.endsWith('"')) s = s.slice(1, -1).replace(/""/g, '"')
    return s.trim()
  }

  // Detect and skip header row if first line contains "name" and "website" literally
  let start = 0
  const firstLineLower = lines[0]?.toLowerCase() ?? ''
  if (firstLineLower.includes('name') && firstLineLower.includes('website')) start = 1

  for (let i = start; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Split on first comma only (website URLs don't contain commas normally)
    const commaIdx = line.indexOf(',')
    if (commaIdx === -1) {
      errors.push({ row: i + 1, message: `Row ${i + 1}: missing comma separator — expected "name,website"` })
      continue
    }

    const name    = unquote(line.slice(0, commaIdx))
    const website = unquote(line.slice(commaIdx + 1))

    const rowErrors: string[] = []
    if (!name)    rowErrors.push('name is empty')
    if (!website) rowErrors.push('website is empty')
    if (rowErrors.length) {
      errors.push({ row: i + 1, message: `Row ${i + 1}: ${rowErrors.join(', ')}` })
    } else {
      rows.push({ name, website })
    }
  }

  return { rows, errors }
}

// ─── Logo uploader (mirrors seed-company route logic) ─────────────────────────

async function uploadLogo(logoUrl: string, slug: string): Promise<string | null> {
  try {
    const supabase = await createClient()
    const res = await fetch(logoUrl, {
      headers: { 'User-Agent': 'ResearchOrg/2.0 LogoUploader' },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return null
    const contentType = res.headers.get('content-type') ?? 'image/png'
    const buffer = await res.arrayBuffer()
    if (buffer.byteLength < 200 || buffer.byteLength > 524_288) return null
    const extMap: Record<string, string> = {
      'image/svg+xml': 'svg', 'image/png': 'png', 'image/jpeg': 'jpg',
      'image/webp': 'webp',   'image/gif': 'gif', 'image/x-icon': 'ico',
      'image/vnd.microsoft.icon': 'ico',
    }
    const ext      = extMap[contentType.split(';')[0].trim()] ?? 'png'
    const filePath = `${slug}.${ext}`
    const { error } = await supabase.storage.from('logos').upload(filePath, buffer, {
      contentType, upsert: true, cacheControl: '3600',
    })
    if (error) return null
    return supabase.storage.from('logos').getPublicUrl(filePath).data.publicUrl
  } catch { return null }
}

// ─── Content scrapers ─────────────────────────────────────────────────────────

const CONTENT_SCRAPERS = [
  'seed_departments.py',
  'seed_exec_groups.py',
  'seed_roles.py',
  'seed_news.py',
  'seed_milestones.py',
  'seed_products.py',
  'seed_financials.py',
] as const

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  console.log('[bulk-add] request received')

  const admin = await getAdminClient()
  if (!admin) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  // Read multipart form data
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return new Response(JSON.stringify({ error: 'Expected multipart/form-data with a CSV file' }), { status: 400 })
  }

  const file = formData.get('file')
  if (!file || typeof file === 'string') {
    return new Response(JSON.stringify({ error: 'No file uploaded. Send a CSV as form field "file".' }), { status: 422 })
  }

  const csvText = await (file as File).text()
  if (!csvText.trim()) {
    return new Response(JSON.stringify({ error: 'Uploaded CSV file is empty.' }), { status: 422 })
  }

  // ── Validate CSV before starting the stream ──────────────────────────────
  const { rows, errors } = parseCsv(csvText)

  if (errors.length > 0) {
    return new Response(
      JSON.stringify({
        error: `CSV validation failed — fix these errors before importing:`,
        details: errors.map(e => e.message),
      }),
      { status: 422, headers: { 'Content-Type': 'application/json' } },
    )
  }

  if (rows.length === 0) {
    return new Response(JSON.stringify({ error: 'CSV has no data rows.' }), { status: 422 })
  }

  // ── Get auth token for scrapers that write to Supabase ───────────────────
  const { supabase } = admin
  const { data: { session } } = await supabase.auth.getSession()
  const authToken = session?.access_token ?? ''
  const appUrl    = process.env.NEXT_PUBLIC_APP_URL ?? `http://localhost:${process.env.PORT ?? 3000}`

  const enc = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: Record<string, unknown>) {
        try { controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`)) }
        catch { /* client disconnected */ }
      }

      send({ type: 'validated', rows: rows.length })

      let added  = 0
      let failed = 0

      for (let i = 0; i < rows.length; i++) {
        const { name, website } = rows[i]
        send({ type: 'start', company: name, index: i + 1, total: rows.length })

        // Step 1: Scrape company metadata
        let companyId: string | null = null
        let slug: string | null      = null
        try {
          const stdout = await runScript('seed_company.py', [
            '--name', name, '--website', website, '--timeout', '12',
          ], 60_000)
          const json = JSON.parse(stdout)
          if (json.error) throw new Error(json.error)

          const { _sources, ...data } = json
          void _sources

          // Guarantee a logo — fall back to icon.horse if scraper found nothing
          if (!data.logo_url && data.slug) {
            const domain = (() => { try { return new URL(website.startsWith('http') ? website : `https://${website}`).hostname.replace(/^www\./, '') } catch { return '' } })()
            if (domain) data.logo_url = `https://icon.horse/icon/${domain}`
          }

          // Upload logo to storage
          if (data.logo_url && data.slug) {
            const stored = await uploadLogo(data.logo_url, data.slug)
            if (stored) data.logo_url = stored
          }

          // Upsert company to Supabase
          const { data: upserted, error: upsertErr } = await supabase
            .from('companies')
            .upsert(data, { onConflict: 'slug' })
            .select('id, slug')
            .single()

          if (upsertErr) throw new Error(upsertErr.message)
          companyId = upserted.id
          slug      = upserted.slug
          send({ type: 'step', company: name, step: 'company', status: 'ok', slug })
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          send({ type: 'step', company: name, step: 'company', status: 'error', message })
          failed++
          send({ type: 'done', company: name, index: i + 1, success: false })
          continue
        }

        // Step 2–8: Run all content scrapers
        // Re-fetch company for category/employees (set by seed_company.py)
        const { data: coData } = await supabase
          .from('companies')
          .select('category, employees')
          .eq('id', companyId)
          .single()

        const baseArgs = [
          '--company',    name,
          '--website',    website,
          '--timeout',    '14',
          '--company-id', companyId,
          '--auth-token', authToken,
          '--app-url',    appUrl,
        ]

        let contentOk = true
        for (const script of CONTENT_SCRAPERS) {
          const stepKey = script.replace('seed_', '').replace('.py', '')
          const args = script === 'seed_departments.py'
            ? [...baseArgs, '--category', coData?.category ?? '',
               ...(coData?.employees ? ['--employees', String(coData.employees)] : [])]
            : baseArgs

          try {
            const stdout  = await runScript(script, args, 90_000)
            const parsed  = JSON.parse(stdout)
            if (parsed?.error) {
              send({ type: 'step', company: name, step: stepKey, status: 'warn', message: parsed.error })
            } else {
              send({ type: 'step', company: name, step: stepKey, status: 'ok', count: parsed?.count ?? 0 })
            }
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err)
            send({ type: 'step', company: name, step: stepKey, status: 'error', message })
            if (script === 'seed_departments.py') contentOk = false
          }
        }

        if (slug) {
          try { revalidatePath(`/company/${slug}`) } catch { /* non-fatal */ }
        }

        if (contentOk) added++; else failed++
        send({ type: 'done', company: name, index: i + 1, success: contentOk, companyId, slug })
      }

      console.log(`[bulk-add] complete — ${added} added, ${failed} failed / ${rows.length} total`)
      send({ type: 'summary', added, failed, total: rows.length })
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
