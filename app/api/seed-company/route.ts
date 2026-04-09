import { NextRequest, NextResponse } from 'next/server'
import { spawn }                      from 'child_process'
import path                            from 'path'
import { createClient }                from '@/lib/supabase/server'

// Only admin/superadmin may call this endpoint
async function isAdmin(): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    const { data: profile } = await supabase.from('profiles').select('plan').eq('id', user.id).single()
    return ['Admin', 'SuperAdmin'].includes(profile?.plan ?? '')
  } catch {
    return false
  }
}

// Run the Python scraper as a subprocess and collect stdout/stderr.
function runScraper(
  name: string,
  website: string,
  timeoutMs: number = 60_000,
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), 'scripts', 'seed_company.py')
    const pythonBin  = process.platform === 'win32' ? 'python' : 'python3'

    const child = spawn(pythonBin, [
      scriptPath,
      '--name',    name,
      '--website', website,
      '--timeout', '12',
    ], {
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
    })

    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString() })
    child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString() })

    const timer = setTimeout(() => {
      child.kill('SIGTERM')
      reject(new Error('Scraper timed out after 60 seconds'))
    }, timeoutMs)

    child.on('close', (code) => {
      clearTimeout(timer)
      if (code !== 0 && !stdout.trim()) {
        reject(new Error(`Scraper exited with code ${code}. Stderr: ${stderr.slice(-500)}`))
      } else {
        resolve({ stdout, stderr })
      }
    })

    child.on('error', (err) => {
      clearTimeout(timer)
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        reject(new Error('Python not found. Install Python 3 and run: pip install -r scripts/requirements.txt'))
      } else {
        reject(err)
      }
    })
  })
}

/**
 * Download a logo from a remote URL and upload it to Supabase Storage
 * under logos/{slug}.{ext}. Returns the public storage URL or null on failure.
 */
async function uploadLogoToStorage(
  logoUrl: string,
  slug: string,
): Promise<string | null> {
  try {
    const supabase = await createClient()

    // Download the image (cap at 512 KB)
    const response = await fetch(logoUrl, {
      headers: { 'User-Agent': 'ResearchOrg/2.0 LogoUploader' },
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) return null

    const contentType = response.headers.get('content-type') ?? 'image/png'
    const buffer      = await response.arrayBuffer()
    if (buffer.byteLength < 200 || buffer.byteLength > 524_288) return null

    // Determine extension from content-type
    const extMap: Record<string, string> = {
      'image/svg+xml': 'svg',
      'image/png':     'png',
      'image/jpeg':    'jpg',
      'image/webp':    'webp',
      'image/gif':     'gif',
      'image/x-icon':  'ico',
      'image/vnd.microsoft.icon': 'ico',
    }
    const ext      = extMap[contentType.split(';')[0].trim()] ?? 'png'
    const filePath = `${slug}.${ext}`

    // Upsert into the logos bucket (replace any existing logo for this slug)
    const { error } = await supabase.storage
      .from('logos')
      .upload(filePath, buffer, {
        contentType,
        upsert: true,
        cacheControl: '3600',
      })

    if (error) {
      console.error('[seed-company] storage upload error:', error.message)
      return null
    }

    // Return the permanent public URL
    const { data: { publicUrl } } = supabase.storage
      .from('logos')
      .getPublicUrl(filePath)

    return publicUrl
  } catch (err) {
    console.error('[seed-company] logo upload failed:', err)
    return null
  }
}

export async function POST(req: NextRequest) {
  // Auth guard
  if (!await isAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse + validate body
  let body: { name?: string; website?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const name    = (body.name    ?? '').trim()
  const website = (body.website ?? '').trim()

  const errors: string[] = []
  if (!name)    errors.push('Company name is required')
  if (!website) errors.push('Company website is required')
  if (errors.length) {
    return NextResponse.json({ error: errors.join('. ') }, { status: 422 })
  }

  // Basic URL sanity check
  const rawUrl = website.startsWith('http') ? website : `https://${website}`
  try { new URL(rawUrl) } catch {
    return NextResponse.json({ error: 'Invalid website URL' }, { status: 422 })
  }

  try {
    const { stdout, stderr } = await runScraper(name, website, 60_000)

    if (process.env.NODE_ENV === 'development' && stderr) {
      console.log('[seed-company] scraper log:\n', stderr)
    }

    const json = JSON.parse(stdout.trim())

    if (json.error) {
      return NextResponse.json({ error: json.error }, { status: 500 })
    }

    // Strip internal tracking fields
    const { _sources, ...data } = json
    void _sources

    // Upload scraped logo to Supabase Storage and swap in the permanent URL.
    // If the scraper found no logo, fall back to icon.horse (then Google S2).
    if (!data.logo_url && data.slug) {
      const domain = (() => { try { return new URL(website.startsWith('http') ? website : `https://${website}`).hostname.replace(/^www\./, '') } catch { return '' } })()
      if (domain) data.logo_url = `https://icon.horse/icon/${domain}`
    }

    if (data.logo_url && data.slug) {
      const storedUrl = await uploadLogoToStorage(data.logo_url, data.slug)
      if (storedUrl) {
        data.logo_url = storedUrl
      } else {
        // Keep the original remote URL as fallback if upload failed
        console.warn('[seed-company] logo upload failed; returning remote URL as fallback:', data.logo_url)
      }
    }

    return NextResponse.json({ data }, { status: 200 })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[seed-company] error:', message)

    if (message.includes('Python not found') || message.includes('requirements')) {
      return NextResponse.json({ error: message }, { status: 500 })
    }
    if (message.includes('timed out')) {
      return NextResponse.json(
        { error: 'Scraper timed out. The website may be slow or blocking requests.' },
        { status: 504 },
      )
    }
    return NextResponse.json({ error: `Scraper failed: ${message}` }, { status: 500 })
  }
}
