import { NextRequest, NextResponse } from 'next/server'
import { writeFileSync }               from 'fs'
import path                            from 'path'
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

  writeFileSync(
    path.join(process.cwd(), 'Execution.md'),
    `Claude, just directly get the product list for the ${name} reference the official website. Get the lowest product name not high level product group. also, use reliable sources for: use cases for each product, images for each, key customer for each, and competitors for each. Once done update the company data. Speed and accuracy are very high priority. Log what you have done in company.md knowledge so we dont have to spend time next time we rerun\n`,
    'utf8',
  )

  return NextResponse.json({ count: 0 }, { status: 200 })
}
