import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserTier, isPaidTier } from '@/lib/access'
import SettingsPage from './SettingsPage'

export default async function Page() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .single()

  const tier = getUserTier(user, profile?.plan)

  return (
    <SettingsPage
      user={user}
      profile={{ plan: profile?.plan ?? 'Free' }}
      isPro={isPaidTier(tier)}
    />
  )
}
