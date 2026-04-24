import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

// Force runtime rendering so Supabase queries run against the live DB,
// not during a build where the connection may not be available.
export const dynamic = 'force-dynamic'

const BASE_URL = 'https://www.researchorg.com'

const STATIC_PAGES: MetadataRoute.Sitemap = [
  { url: BASE_URL,                    lastModified: new Date(), changeFrequency: 'weekly',  priority: 1.0 },
  { url: `${BASE_URL}/explore`,       lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },
  { url: `${BASE_URL}/features`,      lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
  { url: `${BASE_URL}/pricing`,       lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  { url: `${BASE_URL}/about`,         lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
  { url: `${BASE_URL}/blog`,          lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.7 },
  { url: `${BASE_URL}/careers`,       lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.6 },
  { url: `${BASE_URL}/privacy`,       lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.2 },
  { url: `${BASE_URL}/terms`,         lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.2 },
  { url: `${BASE_URL}/cookies`,       lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.2 },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient()

  const { data: companies } = await supabase
    .from('companies')
    .select('slug, updated_at, created_at')
    .order('name')

  const companyPages: MetadataRoute.Sitemap = (companies ?? []).map(c => ({
    url: `${BASE_URL}/company/${c.slug}`,
    lastModified: c.updated_at
      ? new Date(c.updated_at)
      : c.created_at
        ? new Date(c.created_at)
        : new Date(),
    changeFrequency: 'weekly',
    priority: 0.9,
  }))

  const { data: posts } = await supabase
    .from('blog_posts')
    .select('slug, updated_at')
    .eq('published', true)
    .order('created_at', { ascending: false })

  const blogPages: MetadataRoute.Sitemap = (posts ?? []).map(p => ({
    url: `${BASE_URL}/blog/${p.slug}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
    changeFrequency: 'monthly',
    priority: 0.6,
  }))

  return [...STATIC_PAGES, ...companyPages, ...blogPages]
}
