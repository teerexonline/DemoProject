import { NextRequest, NextResponse } from 'next/server'
import { spawn }                      from 'child_process'
import path                            from 'path'
import { revalidatePath }              from 'next/cache'
import { createClient }                from '@/lib/supabase/server'

async function getAdminClient() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .single()
  if (!['Admin', 'SuperAdmin'].includes(profile?.plan ?? '')) return null
  return { supabase, user }
}

function runScraper(
  args: string[],
  timeoutMs: number = 90_000,
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), 'scripts', 'seed_news.py')
    const pythonBin  = process.platform === 'win32' ? 'python' : 'python3'

    const child = spawn(pythonBin, [scriptPath, ...args], {
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
    })

    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString() })
    child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString() })

    const timer = setTimeout(() => {
      child.kill('SIGTERM')
      reject(new Error('News scraper timed out after 90 seconds'))
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
  const admin = await getAdminClient()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
  if (errors.length) return NextResponse.json({ error: errors.join('. ') }, { status: 422 })

  try {
    const { supabase } = admin

    const { data: company } = await supabase
      .from('companies')
      .select('slug')
      .eq('id', companyId!)
      .single()

    const { data: { session } } = await supabase.auth.getSession()
    const authToken = session?.access_token ?? ''

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? `http://localhost:${process.env.PORT ?? 3000}`

    const scriptArgs = [
      '--company',    name!,
      '--website',    website!,
      '--timeout',    '12',
      '--company-id', companyId!,
      '--auth-token', authToken,
      '--app-url',    appUrl,
    ]

    const { stdout, stderr } = await runScraper(scriptArgs, 90_000)

    if (process.env.NODE_ENV === 'development' && stderr) {
      console.log('[seed-news] scraper log:\n', stderr)
    }

    const parsed = JSON.parse(stdout.trim())

    if (parsed?.error) {
      return NextResponse.json({ error: parsed.error }, { status: 500 })
    }

    const count: number = parsed?.count ?? 0
    if (count === 0) {
      return NextResponse.json({ error: `No news found for "${name}"` }, { status: 404 })
    }

    // Belt-and-suspenders revalidation from the API route side
    if (company?.slug) revalidatePath(`/company/${company.slug}`)

    return NextResponse.json({ count }, { status: 200 })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[seed-news] error:', message)

    if (message.includes('Python not found') || message.includes('requirements')) {
      return NextResponse.json({ error: message }, { status: 500 })
    }
    if (message.includes('timed out')) {
      return NextResponse.json(
        { error: 'News scraper timed out. Try again — some news sites can be slow.' },
        { status: 504 },
      )
    }
    return NextResponse.json({ error: `Scraper failed: ${message}` }, { status: 500 })
  }
}
