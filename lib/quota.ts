import { createClient } from '@/lib/supabase/server'

function startOfMonth(): string {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export async function getMonthlyViewCount(userId: string): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('company_views')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('viewed_at', startOfMonth())
  return count ?? 0
}

export async function hasViewedThisMonth(userId: string, companyId: string): Promise<boolean> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('company_views')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('company_id', companyId)
    .gte('viewed_at', startOfMonth())
  return (count ?? 0) > 0
}

export async function recordCompanyView(userId: string, companyId: string): Promise<void> {
  const supabase = await createClient()
  await supabase.from('company_views').insert({ user_id: userId, company_id: companyId })
}
