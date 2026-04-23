import { createClient } from '@supabase/supabase-js'

/**
 * Cookie-free Supabase client for use in ISR/statically-rendered pages.
 * Only reads publicly-accessible data (respects RLS anon policies).
 * Does NOT read cookies — safe to use without opting into dynamic rendering.
 */
export function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}
