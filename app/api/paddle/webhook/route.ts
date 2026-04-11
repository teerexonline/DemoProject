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

export async function POST(request: NextRequest) {
  const rawBody = await request.text()

  // Signature check temporarily disabled for debugging — re-enable before go-live
  // const valid = await verifyPaddleSignature(request, rawBody)
  // if (!valid) {
  //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  // }

  const event = JSON.parse(rawBody)
  const supabase = createAdminClient()

  const eventType: string = event.event_type
  const data = event.data
  const email: string | undefined = data?.customer?.email
  const subscriptionId: string | undefined = data?.id

  const debug: Record<string, unknown> = {
    eventType,
    email: email ?? null,
    subscriptionId: subscriptionId ?? null,
    dataKeys: Object.keys(data ?? {}),
    customerRaw: data?.customer ?? null,
    customDataRaw: data?.custom_data ?? null,
    itemsRaw: data?.items?.[0] ?? null,
  }

  if (email && (eventType === 'subscription.activated' || eventType === 'subscription.updated' || eventType === 'transaction.completed')) {
    const plan = 'Pro'
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 })
    debug.listError = listError?.message ?? null
    debug.userCount = users?.length ?? 0

    const user = users?.find(u => u.email?.toLowerCase() === email.toLowerCase())
    debug.userFound = user ? { id: user.id, email: user.email } : null

    if (user) {
      const update: Record<string, string | null> = { plan }
      if (eventType !== 'transaction.completed') update.paddle_subscription_id = subscriptionId ?? null

      const { error: updateError } = await supabase
        .from('profiles')
        .update(update)
        .eq('id', user.id)
      debug.updateError = updateError?.message ?? null
      debug.updated = !updateError
    }
  }

  if (email && eventType === 'subscription.canceled') {
    const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 })
    const user = users?.find(u => u.email?.toLowerCase() === email.toLowerCase())
    if (user) {
      await supabase.from('profiles').update({ plan: 'Free', paddle_subscription_id: subscriptionId ?? null }).eq('id', user.id)
    }
  }

  return NextResponse.json({ received: true, debug })
}
