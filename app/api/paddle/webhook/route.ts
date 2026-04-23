// PAYMENTS_DISABLED: Paddle billing is archived. Re-enable by setting PAYMENTS_ENABLED=true in env.
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function verifyPaddleSignature(request: NextRequest, rawBody: string): Promise<boolean> {
  const secret = process.env.PADDLE_WEBHOOK_SECRET
  if (!secret) return false

  const signatureHeader = request.headers.get('paddle-signature')
  if (!signatureHeader) return false

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

async function getEmailFromCustomerId(customerId: string): Promise<string | null> {
  const apiKey = process.env.PADDLE_API_KEY
  if (!apiKey) return null
  try {
    const res = await fetch(`https://api.paddle.com/customers/${customerId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (!res.ok) return null
    const body = await res.json()
    return body?.data?.email ?? null
  } catch { return null }
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()

  const valid = await verifyPaddleSignature(request, rawBody)
  if (!valid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const event = JSON.parse(rawBody)
  const supabase = createAdminClient()

  const eventType: string = event.event_type
  const data = event.data
  const subscriptionId: string | undefined = data?.id
  const customerId: string | undefined = data?.customer_id ?? data?.customer?.id
  const email: string | null = data?.customer?.email
    ?? (customerId ? await getEmailFromCustomerId(customerId) : null)

  async function setPlan(userEmail: string, plan: 'Pro' | 'Free', subId?: string) {
    const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 })
    const user = users?.find(u => u.email?.toLowerCase() === userEmail.toLowerCase())
    if (!user) return

    const update: Record<string, string | null> = { plan }
    if (subId !== undefined) update.paddle_subscription_id = subId

    await supabase.from('profiles').update(update).eq('id', user.id)
  }

  if (email) {
    switch (eventType) {
      case 'subscription.activated':
      case 'subscription.updated':
        await setPlan(email, 'Pro', subscriptionId)
        break
      case 'subscription.canceled':
        await setPlan(email, 'Free', subscriptionId)
        break
      case 'transaction.completed':
        await setPlan(email, 'Pro')
        break
    }
  }

  return NextResponse.json({ received: true })
}
