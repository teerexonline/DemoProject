import { notFound } from 'next/navigation'
import { createPublicClient } from '@/lib/supabase/public'
import CompanyFull from './CompanyFull'
import type { Metadata } from 'next'

// ISR: rebuild each company page at most once per hour.
// No cookies read here — auth/saved state is handled client-side in SaveButton.
export const revalidate = 3600

const BASE_URL = 'https://www.researchorg.com'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = createPublicClient()

  const { data: company } = await supabase
    .from('companies')
    .select('name, description, logo_url, hq, revenue, employees, category, founded')
    .eq('slug', slug)
    .single()

  if (!company) return { title: 'Company — ResearchOrg' }

  const title = `${company.name} Company Profile — Org Chart, Financials & Interview Prep | ResearchOrg`

  // Build a rich description that targets actual search queries
  const parts: string[] = []
  if (company.employees) parts.push(`${company.employees.toLocaleString()} employees`)
  if (company.hq) parts.push(company.hq)
  if (company.revenue) parts.push(company.revenue + ' revenue')

  const description = parts.length > 0
    ? `Explore ${company.name}'s full company profile — org chart, financials, tech stack, and interview prep. ${parts.join(' · ')}. Free on ResearchOrg.`
    : company.description
      ? `${company.description.slice(0, 120)} Explore ${company.name}'s org chart, financials, and interview prep on ResearchOrg.`
      : `Research ${company.name} on ResearchOrg — org chart, revenue, team structure, internal tools, and interview prep. Free access.`

  const canonicalUrl = `${BASE_URL}/company/${slug}`
  const ogImage = company.logo_url
    ? [{ url: company.logo_url, width: 256, height: 256, alt: company.name }]
    : []

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'ResearchOrg',
      images: ogImage,
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
  const supabase = createPublicClient()

  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!company) notFound()

  const { data: relatedCompanies } = company.category
    ? await supabase
        .from('companies')
        .select('id, name, slug, category, description, logo_color, logo_url')
        .eq('category', company.category)
        .neq('id', company.id)
        .limit(6)
    : { data: [] }

  const [newsRes, milestonesRes, productsRes, financialsRes, standardsRes, deptsRes, rolesRes, execRes, leadersRes] = await Promise.all([
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

  // JSON-LD structured data — helps Google understand the page content
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: company.name,
      ...(company.description && { description: company.description }),
      ...(company.website && { url: company.website }),
      ...(company.logo_url && { logo: company.logo_url }),
      ...(company.hq && { address: { '@type': 'PostalAddress', addressLocality: company.hq } }),
      ...(company.founded && { foundingDate: String(company.founded) }),
      ...(company.employees && {
        numberOfEmployees: { '@type': 'QuantitativeValue', value: company.employees },
      }),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
        { '@type': 'ListItem', position: 2, name: 'Explore', item: `${BASE_URL}/explore` },
        { '@type': 'ListItem', position: 3, name: company.name, item: `${BASE_URL}/company/${slug}` },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: `${company.name} Company Profile`,
      url: `${BASE_URL}/company/${slug}`,
      description: `Org chart, financials, tech stack, and interview prep for ${company.name}.`,
      isPartOf: { '@type': 'WebSite', name: 'ResearchOrg', url: BASE_URL },
    },
  ]

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CompanyFull
        company={company}
        initialSaved={false}
        isLoggedIn={false}
        dbContent={dbContent}
        relatedCompanies={relatedCompanies ?? []}
      />
    </>
  )
}
