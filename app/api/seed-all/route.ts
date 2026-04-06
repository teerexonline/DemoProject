/**
 * Global Seed — streams SSE progress while running all scrapers for every
 * company in the database sequentially.
 *
 * Sequence per company:
 *   1. seed_departments.py
 *   2. seed_exec_groups.py
 *   3. seed_roles.py          (needs departments to exist first)
 *   4. seed_news.py
 *   5. seed_milestones.py
 *   6. seed_products.py
 *   7. seed_financials.py
 *
 * SSE event format:
 *   data: {"type":"start","company":"Stripe","total":29,"index":1}\n\n
 *   data: {"type":"step","company":"Stripe","step":"departments","status":"ok","count":9}\n\n
 *   data: {"type":"step","company":"Stripe","step":"roles","status":"error","message":"…"}\n\n
 *   data: {"type":"done","company":"Stripe","index":1}\n\n
 *   data: {"type":"summary","succeeded":27,"failed":2,"total":29}\n\n
 */
import { NextRequest }  from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient }   from '@/lib/supabase/server'
import { runScript }      from '@/lib/run-scraper'

async function getAdminClient() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('plan').eq('id', user.id).single()
  if (!['Admin', 'SuperAdmin'].includes(profile?.plan ?? '')) return null
  return { supabase, user }
}

const SCRAPERS: { key: string; script: string; extraArgs?: string[] }[] = [
  { key: 'departments',  script: 'seed_departments.py'  },
  { key: 'exec_groups',  script: 'seed_exec_groups.py'  },
  { key: 'roles',        script: 'seed_roles.py'        },
  { key: 'news',         script: 'seed_news.py'         },
  { key: 'milestones',   script: 'seed_milestones.py'   },
  { key: 'products',     script: 'seed_products.py'     },
  { key: 'financials',   script: 'seed_financials.py'   },
]

export async function POST(req: NextRequest) {
  void req
  console.log('[seed-all] global seed requested')
  const admin = await getAdminClient()
  if (!admin) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const { supabase } = admin
  const { data: { session } } = await supabase.auth.getSession()
  const authToken = session?.access_token ?? ''
  const appUrl    = process.env.NEXT_PUBLIC_APP_URL ?? `http://localhost:${process.env.PORT ?? 3000}`

  // Fetch all companies with name + website
  const { data: companies } = await supabase
    .from('companies')
    .select('id, name, website, slug, category, employees')
    .not('website', 'is', null)
    .order('name')

  if (!companies?.length) {
    return new Response(JSON.stringify({ error: 'No companies found' }), { status: 404 })
  }

  const enc = new TextEncoder()

  // SSE ReadableStream — runs scrapers while streaming progress
  const stream = new ReadableStream({
    async start(controller) {
      function send(data: Record<string, unknown>) {
        try {
          controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch { /* client disconnected */ }
      }

      let succeeded = 0
      let failed    = 0

      for (let i = 0; i < companies.length; i++) {
        const co = companies[i]
        if (!co.name || !co.website) { failed++; continue }

        send({ type: 'start', company: co.name, index: i + 1, total: companies.length })

        const baseArgs = [
          '--company',    co.name,
          '--website',    co.website,
          '--timeout',    '14',
          '--company-id', co.id,
          '--auth-token', authToken,
          '--app-url',    appUrl,
        ]

        let companyOk = true

        for (const { key, script, extraArgs = [] } of SCRAPERS) {
          // Departments gets extra category/employees args
          const args = key === 'departments'
            ? [...baseArgs, '--category', co.category ?? '', ...(co.employees ? ['--employees', String(co.employees)] : []), ...extraArgs]
            : [...baseArgs, ...extraArgs]

          try {
            const stdout = await runScript(script, args, 90_000)
            const parsed = JSON.parse(stdout)
            if (parsed?.error) {
              send({ type: 'step', company: co.name, step: key, status: 'error', message: parsed.error })
              if (key === 'departments') companyOk = false
            } else {
              send({ type: 'step', company: co.name, step: key, status: 'ok', count: parsed?.count ?? 0 })
            }
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err)
            send({ type: 'step', company: co.name, step: key, status: 'error', message })
            if (key === 'departments') companyOk = false
          }
        }

        if (co.slug) {
          try { revalidatePath(`/company/${co.slug}`) } catch { /* non-fatal */ }
        }

        if (companyOk) succeeded++; else failed++
        send({ type: 'done', company: co.name, index: i + 1 })
      }

      console.log(`[seed-all] complete — ${succeeded} succeeded, ${failed} failed / ${companies.length} total`)
      send({ type: 'summary', succeeded, failed, total: companies.length })
      try { controller.close() } catch { /* already closed */ }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection':    'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
