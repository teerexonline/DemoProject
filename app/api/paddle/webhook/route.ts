import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Paddle sends a signature header we must verify to ensure the request is genuine.
async function verifyPaddleSignature(request: NextRequest, rawBody: string): Promise<boolean> {
  const secret = process.env.PADDLE_WEBHOOK_SECRET
  if (!secret) return false

  const signatureHeader = request.headers.get('paddle-signature')
  if (!signatureHeader) return false

  // Header format: ts=timestamp;h1=hash
  const parts = Object.fromEntries(signatureHeader.split(';').map(p => p.split('=')))
  const ts = parts['ts']
  const h1 = parts['h1']
  if (!ts || !h1) return false

  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)
  const msgData = encoder.encode(`${ts}:${rawBody}`)

  const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, msgData)
  const computed = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('')

  return computed === h1
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()

  const valid = await verifyPaddleSignature(request, rawBody)
  console.log('[Paddle webhook] signature valid:', valid)
  if (!valid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const event = JSON.parse(rawBody)
  const supabase = createAdminClient()

  const eventType: string = event.event_type
  const data = event.data

  console.log('[Paddle webhook] event_type:', eventType)
  console.log('[Paddle webhook] customer email:', data?.customer?.email)
  console.log('[Paddle webhook] subscription id:', data?.id)

  // Helper: look up user by email directly and update their plan + subscription ID
  async function setPlan(email: string, plan: 'Pro' | 'Free', subscriptionId?: string) {
    console.log('[Paddle webhook] setPlan called:', email, plan)
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 })
    console.log('[Paddle webhook] listUsers error:', listError, 'count:', users?.length)
    const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase())
    console.log('[Paddle webhook] user found:', user?.id, user?.email)
    if (!user) return

    const update: Record<string, string | null> = { plan }
    if (subscriptionId !== undefined) update.paddle_subscription_id = subscriptionId

    const { error: updateError } = await supabase
      .from('profiles')
      .update(update)
      .eq('id', user.id)
    console.log('[Paddle webhook] profile update error:', updateError)
  }

  switch (eventType) {
    case 'subscription.activated':
    case 'subscription.updated': {
      const email = data?.customer?.email
      const subscriptionId = data?.id
      if (email) await setPlan(email, 'Pro', subscriptionId)
      break
    }

    case 'subscription.canceled': {
      const email = data?.customer?.email
      const subscriptionId = data?.id
      if (email) await setPlan(email, 'Free', subscriptionId)
      break
    }

    case 'transaction.completed': {
      const email = data?.customer?.email
      if (email) await setPlan(email, 'Pro')
      break
    }

    default:
      break
  }

  return NextResponse.json({ received: true })
}
