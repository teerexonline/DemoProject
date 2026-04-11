'use server'

import { createClient } from '@/lib/supabase/server'

// Cancel the user's active Paddle subscription via the Paddle API.
// The webhook will fire subscription.canceled and downgrade the profile to Free.
export async function cancelSubscription(): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Fetch the paddle_subscription_id stored on the profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('paddle_subscription_id')
    .eq('id', user.id)
    .single()

  if (!profile?.paddle_subscription_id) return { error: 'No active subscription found' }

  const apiKey = process.env.PADDLE_API_KEY
  if (!apiKey) return { error: 'Paddle not configured' }

  // Cancel at end of billing period (effective_from: 'next_billing_period')
  const res = await fetch(`https://sandbox-api.paddle.com/subscriptions/${profile.paddle_subscription_id}/cancel`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ effective_from: 'next_billing_period' }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    return { error: body?.error?.detail ?? 'Failed to cancel subscription' }
  }

  return { error: null }
}
