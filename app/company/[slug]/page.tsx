import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserTier } from '@/lib/access'
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

  // Auth + tier
  const { data: { user } } = await supabase.auth.getUser()
  const tier = getUserTier(user)

  if (tier === 'anonymous') {
    return <CompanyTeaser company={company} />
  }

  if (tier === 'pro') {
    return <CompanyFull company={company} />
  }

  // Free tier: if they've already used their token on this company, show full
  const alreadyViewed = await hasViewedThisMonth(user!.id, company.id)
  if (alreadyViewed) {
    return <CompanyFull company={company} />
  }

  // Check if token is still available
  const monthlyCount = await getMonthlyViewCount(user!.id)
  const hasToken = monthlyCount === 0

  // Show overview freely; gate other sections with token/upgrade options
  return <CompanyFreeGated company={company} hasToken={hasToken} />
}
