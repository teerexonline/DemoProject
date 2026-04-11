import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserTier, isPaidTier } from '@/lib/access'
import SettingsPage from './SettingsPage'

export interface BillingInfo {
  nextBillingAt: string | null   // ISO date string
  interval: 'month' | 'year' | null
  status: string | null          // active, canceled, past_due, etc.
}

async function getPaddleBilling(subscriptionId: string): Promise<BillingInfo> {
  const apiKey = process.env.PADDLE_API_KEY
  if (!apiKey || !subscriptionId) return { nextBillingAt: null, interval: null, status: null }

  try {
    const res = await fetch(`https://api.paddle.com/subscriptions/${subscriptionId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      next: { revalidate: 0 },
    })
    if (!res.ok) return { nextBillingAt: null, interval: null, status: null }
    const body = await res.json()
    const sub = body.data
    return {
      nextBillingAt: sub?.next_billed_at ?? null,
      interval: sub?.items?.[0]?.price?.billing_cycle?.interval ?? null,
      status: sub?.status ?? null,
    }
  } catch {
    return { nextBillingAt: null, interval: null, status: null }
  }
}

export default async function Page() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, paddle_subscription_id')
    .eq('id', user.id)
    .single()

  const tier = getUserTier(user, profile?.plan)
  const billing = profile?.paddle_subscription_id
    ? await getPaddleBilling(profile.paddle_subscription_id)
    : { nextBillingAt: null, interval: null, status: null }

  return (
    <SettingsPage
      user={user}
      profile={{ plan: profile?.plan ?? 'Free' }}
      isPro={isPaidTier(tier)}
      billing={billing}
    />
  )
}
