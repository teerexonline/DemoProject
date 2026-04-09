'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function updateProfile(data: {
  name: string
  job_role: string
  job_company: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  await supabase
    .from('profiles')
    .update({ name: data.name, job_role: data.job_role, job_company: data.job_company, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  revalidatePath('/profile')
}

export async function saveCompany(companyId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('saved_companies')
    .insert({ user_id: user.id, company_id: companyId })

  if (error && error.code !== '23505') return { error: error.message }
  revalidatePath('/profile')
  return { success: true }
}

export async function unsaveCompany(companyId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Block removal if this company is an active free unlock for the current period
  const { data: profile } = await supabase.from('profiles').select('plan, free_token_reset_at').eq('id', user.id).single()
  if (profile?.plan === 'Free') {
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)
    const resetAt = profile.free_token_reset_at ? new Date(profile.free_token_reset_at) : null
    const periodStart = resetAt && resetAt > startOfMonth ? resetAt : startOfMonth
    const { count } = await supabase
      .from('company_views')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('company_id', companyId)
      .gte('viewed_at', periodStart.toISOString())
    if ((count ?? 0) > 0) {
      return { error: 'This company is your active free unlock and cannot be removed until the token resets.' }
    }
  }

  await supabase
    .from('saved_companies')
    .delete()
    .eq('user_id', user.id)
    .eq('company_id', companyId)

  revalidatePath('/profile')
  return { success: true }
}

export async function getSavedCompanyIds(): Promise<string[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('saved_companies')
    .select('company_id')
    .eq('user_id', user.id)

  return (data ?? []).map(r => r.company_id)
}

export async function changePassword(newPassword: string) {
  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) return { error: error.message }
  return { success: true }
}
