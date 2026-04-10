import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserTier, isPaidTier } from '@/lib/access'
import { getMonthlyViewCount, hasViewedThisMonth, getNextResetAt } from '@/lib/quota'
import CompanyFull from './CompanyFull'
import CompanyFreeGated from './CompanyFreeGated'

// Always fetch fresh data — never serve a cached version of a company profile
export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function CompanyPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  // Fetch company
  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!company) notFound()

  // Fetch related companies (same category, exclude current)
  const { data: relatedCompanies } = company.category
    ? await supabase
        .from('companies')
        .select('id, name, slug, category, description, logo_color, logo_url')
        .eq('category', company.category)
        .neq('id', company.id)
        .limit(6)
    : { data: [] }

  // Auth
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // Guests see company overview only — all other sections prompt sign-up
    return <CompanyFreeGated company={company} hasToken={false} initialSaved={false} isGuest relatedCompanies={relatedCompanies ?? []} />
  }

  // Fetch plan + saved state + all company content in parallel
  const [profileResult, savedResult, newsRes, milestonesRes, productsRes, financialsRes, standardsRes, deptsRes, rolesRes, execRes, leadersRes] = await Promise.all([
    supabase.from('profiles').select('plan, free_token_reset_at').eq('id', user.id).single(),
    supabase.from('saved_companies').select('id').eq('user_id', user.id).eq('company_id', company.id).maybeSingle(),
    supabase.from('company_news').select('*').eq('company_id', company.id).order('published_date', { ascending: false }),
    supabase.from('company_milestones').select('*').eq('company_id', company.id).order('sort_order'),
    supabase.from('company_products').select('*').eq('company_id', company.id).order('sort_order'),
    supabase.from('company_financials').select('*').eq('company_id', company.id).maybeSingle(),
    supabase.from('company_standards').select('*').eq('company_id', company.id).order('sort_order'),
    supabase.from('company_departments').select('*').eq('company_id', company.id).order('sort_order'),
    supabase.from('company_roles').select('*').eq('company_id', company.id).order('sort_order'),
    supabase.from('company_exec_groups').select('*').eq('company_id', company.id).order('sort_order'),
    supabase.from('company_leaders').select('*').eq('company_id', company.id).order('sort_order'),
  ])

  const tier = getUserTier(user, profileResult.data?.plan)
  const initialSaved = savedResult.data !== null

  // Bundle all DB content — components fall back to hardcoded defaults when arrays are empty
  const dbContent = {
    news:        newsRes.data ?? [],
    milestones:  milestonesRes.data ?? [],
    products:    productsRes.data ?? [],
    financials:  financialsRes.data ?? null,
    standards:   standardsRes.data ?? [],
    departments: deptsRes.data ?? [],
    roles:       rolesRes.data ?? [],
    execGroups:  execRes.data ?? [],
    leaders:     leadersRes.data ?? [],
  }

  const related = relatedCompanies ?? []

  if (isPaidTier(tier)) {
    return <CompanyFull company={company} initialSaved={initialSaved} dbContent={dbContent} relatedCompanies={related} />
  }

  const alreadyViewed = await hasViewedThisMonth(user.id, company.id)
  if (alreadyViewed) {
    return <CompanyFull company={company} initialSaved={initialSaved} dbContent={dbContent} relatedCompanies={related} />
  }

  const monthlyCount = await getMonthlyViewCount(user.id)
  const hasToken = monthlyCount === 0
  const nextResetAt = getNextResetAt()

  return <CompanyFreeGated company={company} hasToken={hasToken} initialSaved={initialSaved} relatedCompanies={related} nextResetAt={nextResetAt} />
}
