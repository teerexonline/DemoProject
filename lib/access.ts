import type { User } from '@supabase/supabase-js'

export type UserTier = 'anonymous' | 'free' | 'pro'

export function getUserTier(user: User | null): UserTier {
  if (!user) return 'anonymous'
  if (user.user_metadata?.plan === 'pro') return 'pro'
  return 'free'
}
