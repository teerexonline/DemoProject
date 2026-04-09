import { createClient } from '@/lib/supabase/server'

function startOfMonth(): string {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

/**
 * Returns the effective quota period start for a user.
 * If the admin has reset the user's token after the current month start,
 * use that timestamp instead of the month start.
 */
async function getQuotaPeriodStart(userId: string, supabase: Awaited<ReturnType<typeof createClient>>): Promise<string> {
  const monthStart = startOfMonth()
  const { data } = await supabase
    .from('profiles')
    .select('free_token_reset_at')
    .eq('id', userId)
    .single()
  const resetAt = data?.free_token_reset_at
  if (resetAt && resetAt > monthStart) return resetAt
  return monthStart
}

export async function getMonthlyViewCount(userId: string): Promise<number> {
  const supabase = await createClient()
  const since = await getQuotaPeriodStart(userId, supabase)
  const { count } = await supabase
    .from('company_views')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('viewed_at', since)
  return count ?? 0
}

export async function hasViewedThisMonth(userId: string, companyId: string): Promise<boolean> {
  const supabase = await createClient()
  const since = await getQuotaPeriodStart(userId, supabase)
  const { count } = await supabase
    .from('company_views')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('company_id', companyId)
    .gte('viewed_at', since)
  return (count ?? 0) > 0
}

export async function recordCompanyView(userId: string, companyId: string): Promise<void> {
  const supabase = await createClient()
  await supabase.from('company_views').insert({ user_id: userId, company_id: companyId })
}

/**
 * Returns the next token reset date as ISO string.
 * If admin set a reset after month start, next reset is start of next month.
 * Otherwise it's just start of next month.
 */
export function getNextResetAt(): string {
  const d = new Date()
  d.setMonth(d.getMonth() + 1)
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}
