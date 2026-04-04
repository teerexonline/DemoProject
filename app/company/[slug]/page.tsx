import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserTier } from '@/lib/access'
import { getMonthlyViewCount, hasViewedThisMonth, recordCompanyView } from '@/lib/quota'
import CompanyFull from './CompanyFull'
import CompanyBlurred from './CompanyBlurred'
import CompanyTeaser from './CompanyTeaser'

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

  // Free tier: check if they've already viewed this company this month
  const alreadyViewed = await hasViewedThisMonth(user!.id, company.id)
  if (alreadyViewed) {
    return <CompanyFull company={company} />
  }

  // Check monthly count
  const monthlyCount = await getMonthlyViewCount(user!.id)
  if (monthlyCount === 0) {
    // Still have their free slot — record and show full
    await recordCompanyView(user!.id, company.id)
    return <CompanyFull company={company} />
  }

  // Quota exhausted — show blurred with upgrade prompt
  return <CompanyBlurred company={company} />
}
