import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserTier, isPaidTier } from '@/lib/access'
import { getMonthlyViewCount, hasViewedThisMonth } from '@/lib/quota'
import CompanyFull from './CompanyFull'
import CompanyTeaser from './CompanyTeaser'
import CompanyFreeGated from './CompanyFreeGated'

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

  // Fetch plan from profiles table
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .single()

  const tier = getUserTier(user, profile?.plan)

  if (tier === 'anonymous') {
    return <CompanyTeaser company={company} />
  }

  // Pro / Admin / SuperAdmin get full access
  if (isPaidTier(tier)) {
    return <CompanyFull company={company} />
  }

  // Free tier: if they've already used their token on this company, show full
  const alreadyViewed = await hasViewedThisMonth(user.id, company.id)
  if (alreadyViewed) {
    return <CompanyFull company={company} />
  }

  // Check if monthly token is still available
  const monthlyCount = await getMonthlyViewCount(user.id)
  const hasToken = monthlyCount === 0

  return <CompanyFreeGated company={company} hasToken={hasToken} />
}
