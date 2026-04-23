import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CompanyFull from './CompanyFull'
import type { Metadata } from 'next'

// Always fetch fresh data — never serve a cached version of a company profile
export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()

  const { data: company } = await supabase
    .from('companies')
    .select('name, description, logo_url, hq, revenue, employees')
    .eq('slug', slug)
    .single()

  if (!company) return { title: 'Company — ResearchOrg' }

  const title = `${company.name} — ResearchOrg`
  const description = company.description
    ? company.description.slice(0, 160)
    : `Research ${company.name} on ResearchOrg — org charts, financials, tech stack, and more.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://researchorg.com/company/${slug}`,
      siteName: 'ResearchOrg',
      images: company.logo_url ? [{ url: company.logo_url, width: 256, height: 256, alt: company.name }] : [],
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
      images: company.logo_url ? [company.logo_url] : [],
    },
  }
}

export default async function CompanyPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  // Fetch company
  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!company) notFound()

  // Fetch related companies (same category, exclude current)
  const { data: relatedCompanies } = company.category
    ? await supabase
        .from('companies')
        .select('id, name, slug, category, description, logo_color, logo_url')
        .eq('category', company.category)
        .neq('id', company.id)
        .limit(6)
    : { data: [] }

  // Auth — only used to personalise saved state, never to gate content
  const { data: { user } } = await supabase.auth.getUser()

  const [savedResult, newsRes, milestonesRes, productsRes, financialsRes, standardsRes, deptsRes, rolesRes, execRes, leadersRes] = await Promise.all([
    user
      ? supabase.from('saved_companies').select('id').eq('user_id', user.id).eq('company_id', company.id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from('company_news').select('*').eq('company_id', company.id).order('published_date', { ascending: false }),
    supabase.from('company_milestones').select('*').eq('company_id', company.id).order('sort_order'),
    supabase.from('company_products').select('*').eq('company_id', company.id).order('sort_order'),
    supabase.from('company_financials').select('*').eq('company_id', company.id).maybeSingle(),
    supabase.from('company_standards').select('*').eq('company_id', company.id).order('sort_order'),
    supabase.from('company_departments').select('*').eq('company_id', company.id).order('sort_order'),
    supabase.from('company_roles').select('*').eq('company_id', company.id).order('sort_order'),
    supabase.from('company_exec_groups').select('*').eq('company_id', company.id).order('sort_order'),
    supabase.from('company_leaders').select('*').eq('company_id', company.id).order('sort_order'),
  ])

  const initialSaved = savedResult.data !== null

  const dbContent = {
    news:        newsRes.data ?? [],
    milestones:  milestonesRes.data ?? [],
    products:    productsRes.data ?? [],
    financials:  financialsRes.data ?? null,
    standards:   standardsRes.data ?? [],
    departments: deptsRes.data ?? [],
    roles:       rolesRes.data ?? [],
    execGroups:  execRes.data ?? [],
    leaders:     leadersRes.data ?? [],
  }

  return (
    <CompanyFull
      company={company}
      initialSaved={initialSaved}
      isLoggedIn={!!user}
      dbContent={dbContent}
      relatedCompanies={relatedCompanies ?? []}
    />
  )
}
