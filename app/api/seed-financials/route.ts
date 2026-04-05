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
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single()
    return ['Admin', 'SuperAdmin'].includes(profile?.plan ?? '')
  } catch {
    return false
  }
}

// Run the Python financial scraper as a subprocess
function runScraper(
  company: string,
  website: string,
  timeoutMs: number = 90_000,
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), 'scripts', 'seed_financials.py')
    const pythonBin  = process.platform === 'win32' ? 'python' : 'python3'

    const child = spawn(pythonBin, [
      scriptPath,
      '--company', company,
      '--website', website,
      '--timeout', '14',
    ], {
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
    })

    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString() })
    child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString() })

    const timer = setTimeout(() => {
      child.kill('SIGTERM')
      reject(new Error('Scraper timed out after 90 seconds'))
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

export async function POST(req: NextRequest) {
  // Auth guard
  if (!await isAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse body
  let body: { companyId?: string; name?: string; website?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { companyId, name, website } = body
  const errors: string[] = []
  if (!companyId) errors.push('companyId is required')
  if (!name)      errors.push('name is required')
  if (!website)   errors.push('website is required')
  if (errors.length) {
    return NextResponse.json({ error: errors.join('. ') }, { status: 422 })
  }

  try {
    const { stdout, stderr } = await runScraper(name!, website!, 90_000)

    if (process.env.NODE_ENV === 'development' && stderr) {
      console.log('[seed-financials] scraper log:\n', stderr)
    }

    const json = JSON.parse(stdout.trim())

    if (json.error) {
      return NextResponse.json({ error: json.error }, { status: 500 })
    }

    // Strip internal tracking fields
    const { _sources, ...data } = json
    void _sources

    // Upsert into company_financials — overwrites ALL fields (this is intentional;
    // the scraper always returns our best estimate, empty string means no data found)
    const supabase = await createClient()
    const { error: upsertError } = await supabase
      .from('company_financials')
      .upsert({
        company_id:           companyId,
        tam:                  data.tam                  || null,
        sam:                  data.sam                  || null,
        som:                  data.som                  || null,
        arr:                  data.arr                  || null,
        yoy_growth:           data.yoy_growth           || null,
        revenue_per_employee: data.revenue_per_employee || null,
        revenue_streams:      data.revenue_streams?.length ? data.revenue_streams : null,
        business_units:       data.business_units?.length  ? data.business_units  : null,
        market_share:         data.market_share?.length    ? data.market_share    : null,
        revenue_growth:       data.revenue_growth?.length  ? data.revenue_growth  : null,
        updated_at:           new Date().toISOString(),
      }, { onConflict: 'company_id' })

    if (upsertError) {
      console.error('[seed-financials] upsert error:', upsertError.message)
      return NextResponse.json({ error: `Database error: ${upsertError.message}` }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 200 })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[seed-financials] error:', message)

    if (message.includes('Python not found') || message.includes('requirements')) {
      return NextResponse.json({ error: message }, { status: 500 })
    }
    if (message.includes('timed out')) {
      return NextResponse.json(
        { error: 'Scraper timed out. Try again — financial APIs can be slow.' },
        { status: 504 },
      )
    }
    return NextResponse.json({ error: `Scraper failed: ${message}` }, { status: 500 })
  }
}
