'use server'

import { createClient } from '@/lib/supabase/server'
import { recordCompanyView } from '@/lib/quota'
import { redirect } from 'next/navigation'

export async function useMonthlyToken(companyId: string, slug: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  await recordCompanyView(user.id, companyId)
  redirect(`/company/${slug}`)
}
