'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// ─── Auth guard ───────────────────────────────────────────────────────────────

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase.from('profiles').select('plan').eq('id', user.id).single()
  if (!profile || !['Admin', 'SuperAdmin'].includes(profile.plan)) throw new Error('Forbidden')
  return { supabase, user }
}

// ─── Cache helper ─────────────────────────────────────────────────────────────
// Revalidates the company profile page whenever company content is written.
// Called after every upsert/delete that touches a company_* table.

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

async function revalidateCompanyProfile(supabase: SupabaseClient, companyId: string) {
  const { data } = await supabase.from('companies').select('slug').eq('id', companyId).single()
  if (data?.slug) revalidatePath(`/company/${data.slug}`)
}

// ─── Companies ────────────────────────────────────────────────────────────────

export async function adminGetCompanies() {
  const { supabase } = await requireAdmin()
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .order('name')
  if (error) return { error: error.message, data: null }
  return { data, error: null }
}

export async function adminUpsertCompany(company: {
  id?: string; name: string; slug: string; category: string; description?: string
  logo_color?: string; logo_url?: string; employees?: number | null; founded?: number | null; hq?: string
  valuation?: string; revenue?: string; website?: string; is_hiring?: boolean; trending_rank?: number | null; tags?: string[]
}) {
  const { supabase } = await requireAdmin()
  const { data, error } = await supabase
    .from('companies')
    .upsert(company, { onConflict: 'id' })
    .select()
    .single()
  revalidatePath('/admin')
  if (!error && data?.slug) revalidatePath(`/company/${data.slug}`)
  return error ? { error: error.message, data: null } : { data, error: null }
}

export async function adminDeleteCompany(id: string) {
  const { supabase } = await requireAdmin()
  const { error } = await supabase.from('companies').delete().eq('id', id)
  revalidatePath('/admin')
  return error ? { error: error.message } : { error: null }
}

// ─── Profiles ─────────────────────────────────────────────────────────────────

export async function adminGetProfiles() {
  const { supabase } = await requireAdmin()
  const { data, error } = await supabase.rpc('admin_get_users')
  if (error) return { error: error.message, data: null }
  return { data, error: null }
}

export async function adminUpdateUserPlan(userId: string, plan: string) {
  const { supabase } = await requireAdmin()
  const { error } = await supabase.from('profiles').update({ plan }).eq('id', userId)
  revalidatePath('/admin')
  return error ? { error: error.message } : { error: null }
}

export async function adminUpdateUserProfile(userId: string, fields: {
  name?: string; job_role?: string; job_company?: string; plan?: string; email?: string
}) {
  const { supabase } = await requireAdmin()
  const { error } = await supabase.from('profiles').update(fields).eq('id', userId)
  revalidatePath('/admin')
  return error ? { error: error.message } : { error: null }
}

export async function adminResetUserToken(userId: string) {
  const { supabase } = await requireAdmin()
  const { error } = await supabase
    .from('profiles')
    .update({ free_token_reset_at: new Date().toISOString() })
    .eq('id', userId)
  revalidatePath('/admin')
  return error ? { error: error.message } : { error: null }
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export async function adminGetAnalytics() {
  const { supabase } = await requireAdmin()
  const [viewsRes, savesRes] = await Promise.all([
    supabase.from('company_views').select('company_id, companies(name)').order('viewed_at', { ascending: false }),
    supabase.from('saved_companies').select('company_id, companies(name), created_at').order('created_at', { ascending: false }),
  ])
  return {
    views: viewsRes.data ?? [],
    saves: savesRes.data ?? [],
  }
}

// ─── Company Content ─────────────────────────────────────────────────────────

export async function adminGetCompanyContent(companyId: string) {
  const { supabase } = await requireAdmin()
  const [news, milestones, products, financials, standards, departments, roles, execGroups, leaders] = await Promise.all([
    supabase.from('company_news').select('*').eq('company_id', companyId).order('sort_order'),
    supabase.from('company_milestones').select('*').eq('company_id', companyId).order('sort_order'),
    supabase.from('company_products').select('*').eq('company_id', companyId).order('sort_order'),
    supabase.from('company_financials').select('*').eq('company_id', companyId).maybeSingle(),
    supabase.from('company_standards').select('*').eq('company_id', companyId).order('sort_order'),
    supabase.from('company_departments').select('*').eq('company_id', companyId).order('sort_order'),
    supabase.from('company_roles').select('*').eq('company_id', companyId).order('sort_order'),
    supabase.from('company_exec_groups').select('*').eq('company_id', companyId).order('sort_order'),
    supabase.from('company_leaders').select('*').eq('company_id', companyId).order('sort_order'),
  ])
  return {
    news: news.data ?? [],
    milestones: milestones.data ?? [],
    products: products.data ?? [],
    financials: financials.data ?? null,
    standards: standards.data ?? [],
    departments: departments.data ?? [],
    roles: roles.data ?? [],
    execGroups: execGroups.data ?? [],
    leaders: leaders.data ?? [],
  }
}

// ─── News CRUD ────────────────────────────────────────────────────────────────

export async function adminUpsertNews(row: {
  id?: string; company_id: string; type: string; headline: string; summary?: string
  published_date?: string; type_color?: string; type_bg?: string; dot_color?: string; sort_order?: number
}) {
  const { supabase } = await requireAdmin()
  const { data, error } = await supabase.from('company_news').upsert(row, { onConflict: 'id' }).select().single()
  revalidatePath('/admin')
  await revalidateCompanyProfile(supabase, row.company_id)
  return error ? { error: error.message, data: null } : { data, error: null }
}

export async function adminDeleteNews(id: string, companyId: string) {
  const { supabase } = await requireAdmin()
  const { error } = await supabase.from('company_news').delete().eq('id', id)
  revalidatePath('/admin')
  await revalidateCompanyProfile(supabase, companyId)
  return error ? { error: error.message } : { error: null }
}

// ─── Milestones CRUD ─────────────────────────────────────────────────────────

export async function adminUpsertMilestone(row: {
  id?: string; company_id: string; year: number; type: string; icon?: string
  accent_color?: string; bg_color?: string; title: string; detail?: string; badge?: string; sort_order?: number
}) {
  const { supabase } = await requireAdmin()
  const { data, error } = await supabase.from('company_milestones').upsert(row, { onConflict: 'id' }).select().single()
  revalidatePath('/admin')
  await revalidateCompanyProfile(supabase, row.company_id)
  return error ? { error: error.message, data: null } : { data, error: null }
}

export async function adminDeleteMilestone(id: string, companyId: string) {
  const { supabase } = await requireAdmin()
  const { error } = await supabase.from('company_milestones').delete().eq('id', id)
  revalidatePath('/admin')
  await revalidateCompanyProfile(supabase, companyId)
  return error ? { error: error.message } : { error: null }
}

// ─── Products CRUD ────────────────────────────────────────────────────────────

export async function adminUpsertProduct(row: {
  id?: string; company_id: string; name: string; tagline?: string; description?: string
  category?: string; cat_color?: string; use_cases?: unknown; customers?: unknown; competitors?: unknown; image_url?: string; sort_order?: number
}) {
  const { supabase } = await requireAdmin()
  const { data, error } = await supabase.from('company_products').upsert(row, { onConflict: 'id' }).select().single()
  revalidatePath('/admin')
  await revalidateCompanyProfile(supabase, row.company_id)
  return error ? { error: error.message, data: null } : { data, error: null }
}

export async function adminDeleteProduct(id: string, companyId: string) {
  const { supabase } = await requireAdmin()
  const { error } = await supabase.from('company_products').delete().eq('id', id)
  revalidatePath('/admin')
  await revalidateCompanyProfile(supabase, companyId)
  return error ? { error: error.message } : { error: null }
}

// ─── Financials CRUD ─────────────────────────────────────────────────────────

export async function adminUpsertFinancials(row: {
  id?: string; company_id: string; tam?: string; sam?: string; som?: string; arr?: string
  yoy_growth?: string; revenue_per_employee?: string; revenue_streams?: unknown
  business_units?: unknown; market_share?: unknown; revenue_growth?: unknown
}) {
  const { supabase } = await requireAdmin()
  const { data, error } = await supabase
    .from('company_financials')
    .upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: 'company_id' })
    .select().single()
  revalidatePath('/admin')
  await revalidateCompanyProfile(supabase, row.company_id)
  return error ? { error: error.message, data: null } : { data, error: null }
}

// ─── Standards CRUD ──────────────────────────────────────────────────────────

export async function adminUpsertStandard(row: {
  id?: string; company_id: string; code: string; category?: string; cat_color?: string
  status?: string; description?: string; sort_order?: number
}) {
  const { supabase } = await requireAdmin()
  const { data, error } = await supabase.from('company_standards').upsert(row, { onConflict: 'id' }).select().single()
  revalidatePath('/admin')
  await revalidateCompanyProfile(supabase, row.company_id)
  return error ? { error: error.message, data: null } : { data, error: null }
}

export async function adminDeleteStandard(id: string, companyId: string) {
  const { supabase } = await requireAdmin()
  const { error } = await supabase.from('company_standards').delete().eq('id', id)
  revalidatePath('/admin')
  await revalidateCompanyProfile(supabase, companyId)
  return error ? { error: error.message } : { error: null }
}

// ─── Departments CRUD ─────────────────────────────────────────────────────────

export async function adminUpsertDepartment(row: {
  id?: string; company_id: string; name: string; icon?: string; color?: string; headcount?: number; sort_order?: number
}) {
  const { supabase } = await requireAdmin()
  const { data, error } = await supabase.from('company_departments').upsert(row, { onConflict: 'id' }).select().single()
  revalidatePath('/admin')
  await revalidateCompanyProfile(supabase, row.company_id)
  return error ? { error: error.message, data: null } : { data, error: null }
}

export async function adminDeleteDepartment(id: string, companyId: string) {
  const { supabase } = await requireAdmin()
  const { error } = await supabase.from('company_departments').delete().eq('id', id)
  revalidatePath('/admin')
  await revalidateCompanyProfile(supabase, companyId)
  return error ? { error: error.message } : { error: null }
}

// ─── Roles CRUD ───────────────────────────────────────────────────────────────

export async function adminUpsertRole(row: {
  id?: string; company_id: string; department_id: string; title: string; level?: string
  tools?: unknown; skills?: unknown; processes?: unknown; interview_questions?: unknown; keywords?: unknown; sort_order?: number
}) {
  const { supabase } = await requireAdmin()
  const { data, error } = await supabase.from('company_roles').upsert(row, { onConflict: 'id' }).select().single()
  revalidatePath('/admin')
  await revalidateCompanyProfile(supabase, row.company_id)
  return error ? { error: error.message, data: null } : { data, error: null }
}

export async function adminDeleteRole(id: string, companyId: string) {
  const { supabase } = await requireAdmin()
  const { error } = await supabase.from('company_roles').delete().eq('id', id)
  revalidatePath('/admin')
  await revalidateCompanyProfile(supabase, companyId)
  return error ? { error: error.message } : { error: null }
}

// ─── Exec Groups CRUD ─────────────────────────────────────────────────────────

export async function adminUpsertExecGroup(row: {
  id?: string; company_id: string; title: string; short_title?: string; department_ids?: unknown; sort_order?: number
}) {
  const { supabase } = await requireAdmin()
  const { data, error } = await supabase.from('company_exec_groups').upsert(row, { onConflict: 'id' }).select().single()
  revalidatePath('/admin')
  await revalidateCompanyProfile(supabase, row.company_id)
  return error ? { error: error.message, data: null } : { data, error: null }
}

export async function adminDeleteExecGroup(id: string, companyId: string) {
  const { supabase } = await requireAdmin()
  const { error } = await supabase.from('company_exec_groups').delete().eq('id', id)
  revalidatePath('/admin')
  await revalidateCompanyProfile(supabase, companyId)
  return error ? { error: error.message } : { error: null }
}

// ─── Seed Defaults ────────────────────────────────────────────────────────────

export async function adminSeedCompanyContent(companyId: string) {
  const { supabase } = await requireAdmin()

  const { data: co } = await supabase
    .from('companies')
    .select('name, category, hq, founded, logo_color')
    .eq('id', companyId)
    .single()
  if (!co) return { error: 'Company not found' }

  const name = co.name as string
  const category = (co.category ?? 'Technology') as string
  const hq = (co.hq ?? 'San Francisco, CA') as string
  const founded = (co.founded ?? 2010) as number
  const color = (co.logo_color ?? '#063f76') as string
  const now = new Date().getFullYear()

  // ── Check what already exists ──────────────────────────────────────────────
  const [nc, mc, pc, fc, sc, dc] = await Promise.all([
    supabase.from('company_news').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
    supabase.from('company_milestones').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
    supabase.from('company_products').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
    supabase.from('company_financials').select('company_id', { count: 'exact', head: true }).eq('company_id', companyId),
    supabase.from('company_standards').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
    supabase.from('company_departments').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
  ])

  // ── News (5 items) ─────────────────────────────────────────────────────────
  if ((nc.count ?? 0) === 0) {
    await supabase.from('company_news').insert([
      { company_id: companyId, sort_order: 0, type: 'PRESS RELEASE', type_color: '#1D4ED8', type_bg: '#EFF6FF', dot_color: '#3B82F6', headline: `${name} Launches Next-Generation ${category} Infrastructure Platform`, summary: `The new platform reduces deployment complexity by 60% and introduces real-time anomaly detection. Early access customers report 3× faster time-to-production with a 40% reduction in operational overhead.`, published_date: '2 days ago' },
      { company_id: companyId, sort_order: 1, type: 'FUNDING',        type_color: '#065F46', type_bg: '#ECFDF5', dot_color: '#10B981', headline: `${name} Secures $220M Series F at $6.8B Valuation`, summary: `The round was led by Andreessen Horowitz with participation from Sequoia and existing investors. Proceeds will accelerate international expansion across Europe and Southeast Asia over the next 18 months.`, published_date: '3 weeks ago' },
      { company_id: companyId, sort_order: 2, type: 'ACQUISITION',    type_color: '#5B21B6', type_bg: '#eef4fb', dot_color: '#063f76', headline: `${name} Acquires Developer Tooling Startup Stackform for $85M`, summary: `The 18-person Stackform team joins ${name} Engineering. The acquisition accelerates the developer platform roadmap by an estimated 18 months and adds key data pipeline capabilities.`, published_date: '5 weeks ago' },
      { company_id: companyId, sort_order: 3, type: 'PRESS RELEASE', type_color: '#1D4ED8', type_bg: '#EFF6FF', dot_color: '#3B82F6', headline: `${name} Expands Strategic Partnership with Google Cloud`, summary: `The expanded partnership enables native integrations across all major Google Cloud services. Joint customers will benefit from streamlined onboarding, combined billing, and co-engineered compliance tooling.`, published_date: '2 months ago' },
      { company_id: companyId, sort_order: 4, type: 'EARNINGS',       type_color: '#92400E', type_bg: '#FFFBEB', dot_color: '#F59E0B', headline: `${name} Reports Q3 Revenue Up 41% Year-Over-Year, Beats Estimates`, summary: `Strong enterprise adoption and geographic expansion drove results well above analyst consensus. Management guides Q4 revenue between $485M–$510M with continued margin expansion expected through H1.`, published_date: '3 months ago' },
    ])
  }

  // ── Milestones ─────────────────────────────────────────────────────────────
  if ((mc.count ?? 0) === 0) {
    const allMilestones = [
      { year: founded,      type: 'founding',    icon: '🚀', accent_color: '#063f76', bg_color: '#eef4fb', title: `${name} founded`,                   detail: `${name} is established with a founding team of 6. The company sets out to reimagine ${category.toLowerCase()} infrastructure from the ground up, with its first office in ${hq}.`, badge: 'Origin' },
      { year: founded+1,    type: 'funding',     icon: '💰', accent_color: '#059669', bg_color: '#F0FDF4', title: 'Seed Round — $4.2M',                  detail: 'Initial institutional funding secured from Y Combinator and angel investors. Capital used to hire the core engineering team and ship the first production version of the platform.', badge: 'Funding' },
      { year: founded+2,    type: 'funding',     icon: '💰', accent_color: '#059669', bg_color: '#F0FDF4', title: 'Series A — $22M',                     detail: 'Product-market fit confirmed with 200+ paying customers. Series A led by Accel Partners. Headcount grows from 12 to 45 over the following 12 months.', badge: 'Funding' },
      { year: founded+4,    type: 'acquisition', icon: '🏢', accent_color: '#2563EB', bg_color: '#EFF6FF', title: 'Acquires DataCore Systems',            detail: "Strategic talent-and-technology acquisition. DataCore's 14-person team and proprietary streaming engine are integrated into the core platform within 90 days, unlocking real-time data capabilities.", badge: 'M&A' },
      { year: founded+5,    type: 'funding',     icon: '💰', accent_color: '#059669', bg_color: '#F0FDF4', title: 'Series B — $90M',                     detail: 'Rapid enterprise adoption drives oversubscribed Series B. International expansion begins with offices opened in London and Singapore. ARR surpasses $40M.', badge: 'Funding' },
      { year: founded+6,    type: 'product',     icon: '🛠️', accent_color: '#D97706', bg_color: '#FFFBEB', title: 'Enterprise Platform v2.0 Launch',      detail: 'Dedicated enterprise tier launches with SSO, SOC 2 Type II compliance, audit logs, and a 99.99% SLA. First Fortune 500 customer signed within 30 days of launch.', badge: 'Product' },
      { year: founded+8,    type: 'milestone',   icon: '🦄', accent_color: '#063f76', bg_color: '#eef4fb', title: 'Achieves $1B Unicorn Valuation',       detail: `${name} joins the global unicorn club in a $180M Series D. The round values the company at $1.2B. More than 2,000 enterprises now use the platform across 34 countries.`, badge: 'Milestone' },
      { year: founded+10,   type: 'acquisition', icon: '🤝', accent_color: '#2563EB', bg_color: '#EFF6FF', title: 'Acquires CloudBridge Inc. for $340M',  detail: 'Largest acquisition to date. CloudBridge brings market-leading integration capabilities, 180 enterprise customers, and a 60-person team. Integration completes in under 6 months.', badge: 'M&A' },
      { year: founded+12,   type: 'milestone',   icon: '📈', accent_color: '#D97706', bg_color: '#FFFBEB', title: 'IPO on NYSE — $8.4B Valuation',        detail: `${name} goes public at $24 per share, valuing the company at $8.4B. Shares close up 38% on the first day of trading, the strongest tech IPO of the year.`, badge: 'IPO' },
    ].filter(m => m.year <= now)
    await supabase.from('company_milestones').insert(
      allMilestones.map((m, i) => ({ ...m, company_id: companyId, sort_order: i }))
    )
  }

  // ── Products (4 items) ─────────────────────────────────────────────────────
  if ((pc.count ?? 0) === 0) {
    await supabase.from('company_products').insert([
      { company_id: companyId, sort_order: 0, name: 'Core Platform',         tagline: 'The foundation layer for modern workflows',          description: 'The primary cloud-native platform that powers automation, data pipelines, and real-time collaboration at scale. Used by engineering and operations teams to replace fragmented tooling with a single, composable system.',                category: 'Platform',    cat_color: '#3B82F6', use_cases: ['Workflow Automation','API Orchestration','Real-time Analytics','Team Collaboration','Event Streaming'], customers: [{name:'Airbnb',abbr:'AB',bg:'#FF5A5F'},{name:'Shopify',abbr:'SH',bg:'#96BF48'},{name:'Stripe',abbr:'ST',bg:'#635BFF'},{name:'Notion',abbr:'NO',bg:'#191919'},{name:'Figma',abbr:'FG',bg:'#F24E1E'}], competitors: [{name:'Salesforce',edge:'More flexible APIs, lower implementation cost'},{name:'ServiceNow',edge:'Faster onboarding, better developer experience'},{name:'MuleSoft',edge:'Native cloud-first architecture'}] },
      { company_id: companyId, sort_order: 1, name: 'Enterprise Suite',      tagline: 'Governance, compliance, and scale for large orgs',   description: 'A dedicated tier of the platform with advanced role-based access controls, audit logging, SSO/SAML integration, and dedicated infrastructure. Designed for Fortune 500 security and compliance requirements.',                  category: 'Enterprise', cat_color: '#0EA5E9', use_cases: ['SSO & Identity Management','Audit Trails','Custom SLAs','Data Residency','Advanced Reporting'], customers: [{name:'JPMorgan',abbr:'JP',bg:'#003087'},{name:'Goldman',abbr:'GS',bg:'#4B5563'},{name:'Microsoft',abbr:'MS',bg:'#00A4EF'},{name:'Walmart',abbr:'WM',bg:'#007DC6'}], competitors: [{name:'Workday',edge:'Faster deployment cycle, open API ecosystem'},{name:'Oracle Cloud',edge:'Modern UI, superior integration flexibility'},{name:'SAP',edge:'Lower TCO, cloud-native from day one'}] },
      { company_id: companyId, sort_order: 2, name: 'Developer API',         tagline: 'Build anything on top of the platform',              description: 'A fully-documented RESTful and GraphQL API layer with SDKs for 12 languages. Enables third-party developers and partners to embed platform capabilities into their own products with usage-based pricing.',                   category: 'API & SDK', cat_color: '#063f76', use_cases: ['Third-party Integrations','Embedded Workflows','Webhook Automation','Custom Dashboards','Partner Ecosystem'], customers: [{name:'Vercel',abbr:'VC',bg:'#000'},{name:'Linear',abbr:'LN',bg:'#5E6AD2'},{name:'Retool',abbr:'RT',bg:'#3D63DD'},{name:'Descript',abbr:'DS',bg:'#FF4B4B'}], competitors: [{name:'Twilio',edge:'Broader functionality beyond messaging'},{name:'Segment',edge:'End-to-end workflow, not just data routing'},{name:'Zapier',edge:'Native SDK depth, no-code + pro-code hybrid'}] },
      { company_id: companyId, sort_order: 3, name: 'Analytics & Insights',  tagline: 'Turn platform data into strategic decisions',         description: 'An embedded analytics layer that surfaces usage patterns, funnel metrics, and predictive insights directly within the platform. Powered by a columnar data warehouse with sub-second query response times.',                     category: 'Analytics', cat_color: '#10B981', use_cases: ['Product Analytics','Revenue Attribution','Churn Prediction','Usage Funnels','Exec Dashboards'], customers: [{name:'HubSpot',abbr:'HS',bg:'#FF7A59'},{name:'Intercom',abbr:'IC',bg:'#286EFA'},{name:'Amplitude',abbr:'AM',bg:'#187AE0'},{name:'Brex',abbr:'BX',bg:'#1A1A2E'}], competitors: [{name:'Mixpanel',edge:'Integrated with operational data, not siloed'},{name:'Looker',edge:'No separate BI tool needed, native embedding'},{name:'Heap',edge:'Predictive models built-in, not bolted on'}] },
    ])
  }

  // ── Financials ─────────────────────────────────────────────────────────────
  if ((fc.count ?? 0) === 0) {
    await supabase.from('company_financials').insert({
      company_id: companyId,
      tam: '$420B', sam: '$86B', som: '$14B', arr: '$1.2B', yoy_growth: '41%', revenue_per_employee: '$1.8M',
      revenue_streams: [{name:'Core Product / Services',pct:62,clr:color},{name:'Enterprise & Partnerships',pct:22,clr:'#06B6D4'},{name:'Platform & APIs',pct:11,clr:'#F59E0B'},{name:'Other / Misc',pct:5,clr:'#10B981'}],
      business_units:  [{name:'Core Platform',growth:'+24%',status:'primary',desc:'Main product · ~62% of revenue'},{name:'Enterprise Division',growth:'+41%',status:'growing',desc:'Custom integrations & enterprise'},{name:'Developer Tools',growth:'+18%',status:'growing',desc:'SDKs, APIs & third-party platform'},{name:'Emerging Products',growth:'Early',status:'early',desc:'New bets & experimental lines'}],
      market_share:    [{name,pct:34,clr:color},{name:'Competitor A',pct:28,clr:'#94A3B8'},{name:'Competitor B',pct:19,clr:'#CBD5E1'},{name:'Others',pct:19,clr:'#E2E8F0'}],
      revenue_growth:  [{year:2020,height:40},{year:2021,height:54},{year:2022,height:66},{year:2023,height:81},{year:2024,height:100}],
    })
  }

  // ── Standards (8 items) ────────────────────────────────────────────────────
  if ((sc.count ?? 0) === 0) {
    await supabase.from('company_standards').insert([
      { company_id: companyId, sort_order: 0, code: 'SOC 2 Type II',   category: 'Security',      cat_color: '#EF4444', status: 'Certified',   description: 'Annual third-party audit of security, availability, and confidentiality controls.' },
      { company_id: companyId, sort_order: 1, code: 'ISO 27001',       category: 'Security',      cat_color: '#EF4444', status: 'Certified',   description: 'International standard for information security management systems.' },
      { company_id: companyId, sort_order: 2, code: 'GDPR',            category: 'Privacy',       cat_color: '#3B82F6', status: 'Compliant',   description: 'Full compliance with EU General Data Protection Regulation for user data.' },
      { company_id: companyId, sort_order: 3, code: 'CCPA',            category: 'Privacy',       cat_color: '#3B82F6', status: 'Compliant',   description: 'California Consumer Privacy Act compliance for all California residents.' },
      { company_id: companyId, sort_order: 4, code: 'ISO 9001:2015',   category: 'Quality',       cat_color: '#10B981', status: 'Certified',   description: 'Quality management system ensuring consistent product and service delivery.' },
      { company_id: companyId, sort_order: 5, code: 'PCI DSS Level 1', category: 'Payments',      cat_color: '#F59E0B', status: 'Compliant',   description: 'Highest level of PCI compliance for handling cardholder data at scale.' },
      { company_id: companyId, sort_order: 6, code: 'WCAG 2.1 AA',     category: 'Accessibility', cat_color: '#063f76', status: 'Compliant',   description: 'Web Content Accessibility Guidelines met across all customer-facing products.' },
      { company_id: companyId, sort_order: 7, code: 'ISO 22301',       category: 'Resilience',    cat_color: '#06B6D4', status: 'In Progress', description: 'Business continuity management standard — target certification Q3.' },
    ])
  }

  // ── Departments + Roles + Exec Groups ─────────────────────────────────────
  if ((dc.count ?? 0) === 0) {
    const deptDefs = [
      { id: 'engineering', name: 'Engineering',       icon: '💻', color: '#3B82F6', headcount: 210 },
      { id: 'infra',       name: 'Infrastructure',    icon: '🔧', color: '#6366F1', headcount: 45  },
      { id: 'security',    name: 'Security',          icon: '🛡️', color: '#063f76', headcount: 28  },
      { id: 'product',     name: 'Product',           icon: '🎯', color: '#063f76', headcount: 85  },
      { id: 'design',      name: 'Design',            icon: '🎨', color: '#A855F7', headcount: 42  },
      { id: 'finance',     name: 'Finance',           icon: '📊', color: '#10B981', headcount: 38  },
      { id: 'accounting',  name: 'Accounting',        icon: '📝', color: '#059669', headcount: 22  },
      { id: 'sales',       name: 'Sales',             icon: '🤝', color: '#F59E0B', headcount: 180 },
      { id: 'success',     name: 'Customer Success',  icon: '⭐', color: '#F97316', headcount: 95  },
      { id: 'marketing',   name: 'Marketing',         icon: '📢', color: '#EF4444', headcount: 65  },
      { id: 'brand',       name: 'Brand & Comms',     icon: '🌟', color: '#F43F5E', headcount: 22  },
      { id: 'recruiting',  name: 'Talent Acquisition',icon: '🔍', color: '#06B6D4', headcount: 30  },
      { id: 'people',      name: 'People & Culture',  icon: '💙', color: '#0EA5E9', headcount: 18  },
    ]
    const { data: insertedDepts } = await supabase
      .from('company_departments')
      .insert(deptDefs.map((d, i) => ({ company_id: companyId, name: d.name, icon: d.icon, color: d.color, headcount: d.headcount, sort_order: i })))
      .select('id, name')

    if (insertedDepts) {
      const deptMap = Object.fromEntries(insertedDepts.map(d => [d.name as string, d.id as string]))

      const roleRows: Record<string, unknown>[] = [
        // Engineering
        { dept: 'Engineering',       title: 'Senior Software Engineer',        level: 'L5', tools: ['VS Code','GitHub','Docker','Kubernetes','Datadog'], skills: ['System Design','Distributed Systems','Code Review','Mentorship'], processes: ['Agile/Scrum','CI/CD','On-call Rotation','Tech Design Docs'], interview_questions: ['Design a rate limiter at scale','Walk me through a distributed system you built','How do you handle data consistency?'], keywords: ['backend','distributed','microservices'] },
        { dept: 'Engineering',       title: 'Staff Engineer',                   level: 'L7 / Staff', tools: ['GitHub','Terraform','AWS','Grafana'], skills: ['Architecture','Technical Leadership','Cross-team Collaboration'], processes: ['RFC Process','Quarterly Planning','Incident Management'], interview_questions: ['How do you drive technical direction across teams?','Design a global-scale event bus'], keywords: ['staff','architecture','leadership'] },
        { dept: 'Engineering',       title: 'Software Engineer II',             level: 'L4', tools: ['VS Code','Git','Jest','PostgreSQL'], skills: ['Frontend Development','Testing','API Design'], processes: ['Code Review','Sprint Planning','On-call'], interview_questions: ['Implement a debounce function','Explain REST vs GraphQL'], keywords: ['frontend','testing','react'] },
        { dept: 'Infrastructure',    title: 'Site Reliability Engineer',        level: 'L5', tools: ['Terraform','Kubernetes','Prometheus','PagerDuty','AWS'], skills: ['Incident Response','Capacity Planning','Automation'], processes: ['SRE Runbooks','Post-mortem Reviews','Toil Reduction'], interview_questions: ['How do you approach a production outage?','Design a monitoring system for 10k services'], keywords: ['SRE','reliability','kubernetes'] },
        { dept: 'Infrastructure',    title: 'Platform Engineer',                level: 'L4', tools: ['Helm','ArgoCD','Docker','Vault'], skills: ['Container Orchestration','GitOps','Security Hardening'], processes: ['Change Management','Deployment Pipelines'], interview_questions: ['Explain blue-green deployments','How do you manage secrets at scale?'], keywords: ['platform','devops','cloud'] },
        { dept: 'Security',          title: 'Security Engineer',                level: 'L5', tools: ['Burp Suite','SAST Tools','AWS Security Hub','Splunk'], skills: ['Threat Modeling','Penetration Testing','Compliance'], processes: ['Vulnerability Management','Security Reviews','Incident Response'], interview_questions: ['How do you perform a threat model?','Walk through an XSS attack and mitigation'], keywords: ['appsec','threat modeling','pen test'] },
        { dept: 'Product',           title: 'Senior Product Manager',           level: 'L5', tools: ['Figma','Jira','Amplitude','Notion'], skills: ['Roadmap Planning','Stakeholder Management','Data-driven Decisions'], processes: ['OKR Setting','Sprint Reviews','User Research'], interview_questions: ['How do you prioritize a backlog?','Tell me about a product decision that failed'], keywords: ['roadmap','OKRs','growth'] },
        { dept: 'Product',           title: 'Product Manager',                  level: 'L4', tools: ['Linear','Mixpanel','Miro','Slack'], skills: ['Feature Specs','A/B Testing','Cross-functional Collaboration'], processes: ['Discovery Process','Go-to-market Planning'], interview_questions: ['How do you write a good PRD?','Design a notifications system'], keywords: ['specs','discovery','metrics'] },
        { dept: 'Design',            title: 'Senior Product Designer',          level: 'L5', tools: ['Figma','Principle','Maze','UserTesting'], skills: ['UX Research','Design Systems','Interaction Design'], processes: ['Design Sprints','Usability Testing','Design Critique'], interview_questions: ['Walk me through your design process','How do you handle conflicting feedback?'], keywords: ['ux','design systems','figma'] },
        { dept: 'Finance',           title: 'Financial Analyst',                level: 'L4', tools: ['Excel','Adaptive Planning','Salesforce','Tableau'], skills: ['Financial Modeling','Forecasting','Variance Analysis'], processes: ['Monthly Close','Budget Planning','Board Reporting'], interview_questions: ['Walk me through a DCF model','How do you approach financial forecasting?'], keywords: ['FP&A','modeling','forecasting'] },
        { dept: 'Sales',             title: 'Account Executive',                level: 'L4', tools: ['Salesforce','Outreach','ZoomInfo','Gong'], skills: ['Enterprise Sales','Negotiation','Pipeline Management'], processes: ['MEDDIC','QBR Prep','Deal Reviews'], interview_questions: ['Walk me through your sales process','How do you handle a stalled deal?'], keywords: ['enterprise','AE','closing'] },
        { dept: 'Sales',             title: 'Sales Development Representative', level: 'L3', tools: ['Outreach','LinkedIn Sales Navigator','Salesloft'], skills: ['Cold Outreach','Qualification','CRM hygiene'], processes: ['Cadence Management','Lead Scoring'], interview_questions: ['How do you handle rejection?','Give me a cold pitch for this product'], keywords: ['SDR','prospecting','outbound'] },
        { dept: 'Customer Success',  title: 'Customer Success Manager',         level: 'L4', tools: ['Gainsight','Salesforce','Zendesk','Looker'], skills: ['Relationship Management','Renewal Forecasting','Upselling'], processes: ['QBRs','Health Score Reviews','Churn Prevention'], interview_questions: ['How do you manage a customer at risk?','Tell me about a successful expansion you drove'], keywords: ['CSM','renewals','NRR'] },
        { dept: 'Marketing',         title: 'Product Marketing Manager',        level: 'L5', tools: ['HubSpot','Google Analytics','Marketo','Figma'], skills: ['Positioning','Competitive Analysis','Launch Planning'], processes: ['GTM Framework','Win/Loss Analysis','Sales Enablement'], interview_questions: ['How do you position a product in a crowded market?','Tell me about a launch you led'], keywords: ['PMM','positioning','GTM'] },
        { dept: 'Talent Acquisition',title: 'Senior Recruiter',                 level: 'L4', tools: ['Greenhouse','LinkedIn Recruiter','Notion','Lever'], skills: ['Technical Recruiting','Employer Branding','Pipeline Building'], processes: ['Structured Interviews','Headcount Planning'], interview_questions: ['How do you source passive candidates?','How do you partner with hiring managers?'], keywords: ['recruiting','sourcing','talent'] },
      ]

      await supabase.from('company_roles').insert(
        roleRows
          .filter(r => deptMap[r.dept as string])
          .map((r, i) => ({
            company_id: companyId,
            department_id: deptMap[r.dept as string],
            title: r.title, level: r.level, tools: r.tools, skills: r.skills,
            processes: r.processes, interview_questions: r.interview_questions,
            keywords: r.keywords, sort_order: i,
          }))
      )

      const execGroupDefs = [
        { key: 'cto',  title: 'Chief Technology Officer',       short_title: 'CTO',  deptNames: ['Engineering', 'Infrastructure', 'Security'] },
        { key: 'cpo',  title: 'Chief Product Officer',          short_title: 'CPO',  deptNames: ['Product', 'Design'] },
        { key: 'cfo',  title: 'Chief Financial Officer',        short_title: 'CFO',  deptNames: ['Finance', 'Accounting'] },
        { key: 'cro',  title: 'Chief Revenue Officer',          short_title: 'CRO',  deptNames: ['Sales', 'Customer Success'] },
        { key: 'cmo',  title: 'Chief Marketing Officer',        short_title: 'CMO',  deptNames: ['Marketing', 'Brand & Comms'] },
        { key: 'chro', title: 'Chief Human Resources Officer',  short_title: 'CHRO', deptNames: ['Talent Acquisition', 'People & Culture'] },
      ]
      await supabase.from('company_exec_groups').insert(
        execGroupDefs.map((eg, i) => ({
          company_id: companyId,
          title: eg.title, short_title: eg.short_title,
          department_ids: eg.deptNames.map(n => deptMap[n]).filter(Boolean),
          sort_order: i,
        }))
      )
    }
  }

  revalidatePath('/admin')
  await revalidateCompanyProfile(supabase, companyId)
  return { error: null }
}
