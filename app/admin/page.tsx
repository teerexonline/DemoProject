import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserTier } from '@/lib/access'
import AdminDashboard from './AdminDashboard'
import { adminGetCompanies, adminGetProfiles, adminGetAnalytics } from '@/app/actions/admin'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('plan, name').eq('id', user.id).single()
  const tier = getUserTier(user, profile?.plan)

  if (tier !== 'admin' && tier !== 'superadmin') redirect('/')

  const [companiesRes, profilesRes, analytics] = await Promise.all([
    adminGetCompanies(),
    adminGetProfiles(),
    adminGetAnalytics(),
  ])

  return (
    <AdminDashboard
      currentUser={{ id: user.id, email: user.email ?? '', name: profile?.name ?? '', plan: profile?.plan ?? 'Admin' }}
      initialCompanies={companiesRes.data ?? []}
      initialProfiles={profilesRes.data ?? []}
      analytics={analytics}
    />
  )
}
