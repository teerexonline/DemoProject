import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProfilePage from './ProfilePage'

export default async function Page() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [profileResult, savedResult] = await Promise.all([
    supabase.from('profiles').select('name, job_role, job_company, plan').eq('id', user.id).single(),
    supabase
      .from('saved_companies')
      .select('company_id, companies(id, name, slug, category, logo_color, hq, employees, valuation)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  const profile = profileResult.data
  const savedRows = savedResult.data ?? []

  // Flatten and sort alphabetically
  type SavedCompany = { id: string; name: string; slug: string; category: string | null; logo_color: string | null; hq: string | null; employees: number | null; valuation: string | null }
  const savedCompanies = savedRows
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
        plan: profile?.plan ?? 'Free',
      }}
      savedCompanies={savedCompanies}
    />
  )
}
