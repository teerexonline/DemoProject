import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getNextResetAt } from '@/lib/quota'
import ProfilePage from './ProfilePage'

export default async function Page() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [profileResult, savedResult] = await Promise.all([
    supabase.from('profiles').select('name, job_role, job_company, plan, email, free_token_reset_at').eq('id', user.id).single(),
    supabase
      .from('saved_companies')
      .select('company_id, companies(id, name, slug, category, logo_color, logo_url, hq, employees, valuation)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  const profile = profileResult.data
  const plan = profile?.plan ?? 'Free'

  // Compute quota period start for free users
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)
  const resetAt = profile?.free_token_reset_at ? new Date(profile.free_token_reset_at) : null
  const periodStart = resetAt && resetAt > startOfMonth ? resetAt : startOfMonth

  // For free users: find companies viewed (token-unlocked) in current quota period
  let unlockedIds: string[] = []
  if (plan === 'Free') {
    const { data: viewRows } = await supabase
      .from('company_views')
      .select('company_id')
      .eq('user_id', user.id)
      .gte('viewed_at', periodStart.toISOString())
    unlockedIds = [...new Set((viewRows ?? []).map(r => r.company_id as string))]

    // Backfill saved_companies for any unlocked company that wasn't auto-saved
    // (handles unlocks done before auto-save was introduced)
    if (unlockedIds.length > 0) {
      const savedIds = new Set((savedResult.data ?? []).map(r => r.company_id))
      const missing = unlockedIds.filter(id => !savedIds.has(id))
      if (missing.length > 0) {
        await supabase.from('saved_companies').upsert(
          missing.map(company_id => ({ user_id: user.id, company_id })),
          { onConflict: 'user_id,company_id' }
        )
        // Re-fetch saved list to include the newly backfilled companies
        const { data: refreshed } = await supabase
          .from('saved_companies')
          .select('company_id, companies(id, name, slug, category, logo_color, logo_url, hq, employees, valuation)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
        savedResult.data = refreshed ?? savedResult.data
      }
    }
  }

  type SavedCompany = {
    id: string; name: string; slug: string; category: string | null
    logo_color: string | null; logo_url: string | null; hq: string | null
    employees: number | null; valuation: string | null
  }

  const savedCompanies = (savedResult.data ?? [])
    .map(r => {
      const c = r.companies
      if (!c || Array.isArray(c)) return null
      return c as SavedCompany
    })
    .filter((c): c is SavedCompany => c !== null)
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <ProfilePage
      user={user}
      profile={{
        name: profile?.name ?? '',
        job_role: profile?.job_role ?? '',
        job_company: profile?.job_company ?? '',
        plan,
      }}
      savedCompanies={savedCompanies}
      unlockedCompanyIds={unlockedIds}
      nextResetAt={getNextResetAt()}
    />
  )
}
