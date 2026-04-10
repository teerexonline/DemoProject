'use server'

import { createClient } from '@/lib/supabase/server'

export interface CompanyRow {
  id: string
  name: string
  slug: string
  category: string | null
  tags: string[] | null
  description: string | null
  logo_color: string | null
  logo_url: string | null
  employees: number | null
  founded: number | null
  hq: string | null
  valuation: string | null
  revenue: string | null
  trending_rank: number | null
  is_hiring: boolean | null
  created_at: string | null
}

export async function getCompanies(opts?: {
  limit?: number
  orderBy?: 'name' | 'trending_rank'
}): Promise<{ data: CompanyRow[]; error: string | null }> {
  const supabase = await createClient()

  let query = supabase
    .from('companies')
    .select('id, name, slug, category, tags, description, logo_color, logo_url, employees, founded, hq, valuation, revenue, trending_rank, is_hiring, created_at')

  if (opts?.orderBy === 'trending_rank') {
    query = query.order('trending_rank', { ascending: true, nullsFirst: false })
  } else {
    query = query.order('name', { ascending: true })
  }

  if (opts?.limit) {
    query = query.limit(opts.limit)
  }

  const { data, error } = await query

  return {
    data: (data as CompanyRow[]) ?? [],
    error: error?.message ?? null,
  }
}
