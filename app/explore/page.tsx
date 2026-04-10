import type { Metadata } from 'next'
import { getCompanies } from '@/app/actions/companies'
import { createClient } from '@/lib/supabase/server'
import ExploreClient from './ExploreClient'

export const metadata: Metadata = {
  title: 'Explore Companies — ResearchOrg',
  description: 'Browse all companies on ResearchOrg. Filter by sector to find the right companies to research before your next interview.',
}

interface Props {
  searchParams: Promise<{ category?: string; sort?: string }>
}

export default async function ExplorePage({ searchParams }: Props) {
  const { category, sort } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: companies }, savedResult] = await Promise.all([
    getCompanies(),
    user ? supabase.from('saved_companies').select('company_id').eq('user_id', user.id) : Promise.resolve({ data: [] }),
  ])

  const savedIds = (savedResult.data ?? []).map(r => r.company_id as string)

  return (
    <ExploreClient
      companies={companies}
      initialCategory={category ?? 'all'}
      initialSort={(sort === 'trending' || sort === 'recent') ? sort : 'all'}
      savedIds={savedIds}
    />
  )
}
