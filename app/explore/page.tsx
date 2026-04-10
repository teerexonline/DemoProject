import type { Metadata } from 'next'
import { getCompanies } from '@/app/actions/companies'
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
  const { data: companies } = await getCompanies()

  return (
    <ExploreClient
      companies={companies}
      initialCategory={category ?? 'all'}
      initialSort={(sort === 'trending' || sort === 'recent') ? sort : 'all'}
    />
  )
}
