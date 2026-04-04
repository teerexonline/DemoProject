import type { User } from '@supabase/supabase-js'

export type UserTier = 'anonymous' | 'free' | 'pro' | 'admin' | 'superadmin'
export type Plan = 'Free' | 'Pro' | 'Admin' | 'SuperAdmin'

export function getUserTier(user: User | null, plan?: string | null): UserTier {
  if (!user) return 'anonymous'
  if (plan === 'SuperAdmin') return 'superadmin'
  if (plan === 'Admin') return 'admin'
  if (plan === 'Pro') return 'pro'
  // backwards-compat: honour user_metadata if no profile row yet
  if (user.user_metadata?.plan === 'pro') return 'pro'
  return 'free'
}

export function isPaidTier(tier: UserTier): boolean {
  return tier === 'pro' || tier === 'admin' || tier === 'superadmin'
}
