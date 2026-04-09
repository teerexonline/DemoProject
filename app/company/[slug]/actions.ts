'use server'

import { createClient } from '@/lib/supabase/server'
import { recordCompanyView } from '@/lib/quota'
import { redirect } from 'next/navigation'

export async function useMonthlyToken(companyId: string, slug: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Record the view (uses the token)
  await recordCompanyView(user.id, companyId)

  // Auto-save the company to their profile
  await supabase
    .from('saved_companies')
    .upsert({ user_id: user.id, company_id: companyId }, { onConflict: 'user_id,company_id' })

  redirect(`/company/${slug}`)
}
