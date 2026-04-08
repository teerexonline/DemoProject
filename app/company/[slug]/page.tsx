import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserTier, isPaidTier } from '@/lib/access'
import { getMonthlyViewCount, hasViewedThisMonth } from '@/lib/quota'
import CompanyFull from './CompanyFull'
import CompanyTeaser from './CompanyTeaser'
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

  // Auth
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return <CompanyTeaser company={company} />
  }

  // Fetch plan + saved state + all company content in parallel
  const [profileResult, savedResult, newsRes, milestonesRes, productsRes, financialsRes, standardsRes, deptsRes, rolesRes, execRes, leadersRes] = await Promise.all([
    supabase.from('profiles').select('plan').eq('id', user.id).single(),
    supabase.from('saved_companies').select('id').eq('user_id', user.id).eq('company_id', company.id).maybeSingle(),
    supabase.from('company_news').select('*').eq('company_id', company.id).order('sort_order'),
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

  if (tier === 'anonymous') {
    return <CompanyTeaser company={company} />
  }

  if (isPaidTier(tier)) {
    return <CompanyFull company={company} initialSaved={initialSaved} dbContent={dbContent} />
  }

  const alreadyViewed = await hasViewedThisMonth(user.id, company.id)
  if (alreadyViewed) {
    return <CompanyFull company={company} initialSaved={initialSaved} dbContent={dbContent} />
  }

  const monthlyCount = await getMonthlyViewCount(user.id)
  const hasToken = monthlyCount === 0

  return <CompanyFreeGated company={company} hasToken={hasToken} initialSaved={initialSaved} />
}
