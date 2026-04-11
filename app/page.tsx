import { createClient } from '@/lib/supabase/server'
import { getUserTier, isPaidTier } from '@/lib/access'
import MarketingPage from '@/components/landing/MarketingPage'
import LoggedInHome from '@/components/LoggedInHome'

export default async function Page() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return <MarketingPage />
  }

  const [profileResult, companiesResult, recentResult, savedResult] = await Promise.all([
    supabase.from('profiles').select('plan').eq('id', user.id).single(),
    supabase
      .from('companies')
      .select('id, name, slug, category, description, logo_color, logo_url, employees, founded, hq, valuation, trending_rank')
      .order('name'),
    supabase
      .from('companies')
      .select('id, name, slug, category, description, logo_color, logo_url, employees, founded, hq, valuation, trending_rank')
      .order('created_at', { ascending: false })
      .limit(6),
    supabase.from('saved_companies').select('company_id').eq('user_id', user.id),
  ])

  const plan = profileResult.data?.plan ?? 'Free'
  const tier = getUserTier(user, plan)
  const companies = companiesResult.data ?? []
  const recentlyAdded = recentResult.data ?? []
  const savedIds = (savedResult.data ?? []).map(r => r.company_id as string)

  return (
    <LoggedInHome
      user={user}
      plan={plan}
      companies={companies}
      recentlyAdded={recentlyAdded}
      isPro={isPaidTier(tier)}
      savedIds={savedIds}
    />
  )
}
