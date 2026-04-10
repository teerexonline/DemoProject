import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

const BASE_URL = 'https://www.researchorg.com'

// Static pages with their priority and change frequency
const STATIC_PAGES: MetadataRoute.Sitemap = [
  { url: BASE_URL,                    lastModified: new Date(), changeFrequency: 'weekly',  priority: 1.0 },
  { url: `${BASE_URL}/explore`,       lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },
  { url: `${BASE_URL}/features`,      lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
  { url: `${BASE_URL}/pricing`,       lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
  { url: `${BASE_URL}/about`,         lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
  { url: `${BASE_URL}/blog`,          lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.7 },
  { url: `${BASE_URL}/careers`,       lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.6 },
  { url: `${BASE_URL}/privacy`,       lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.3 },
  { url: `${BASE_URL}/terms`,         lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.3 },
  { url: `${BASE_URL}/cookies`,       lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.3 },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient()

  // Fetch all company slugs
  const { data: companies } = await supabase
    .from('companies')
    .select('slug, created_at')
    .order('name')

  const companyPages: MetadataRoute.Sitemap = (companies ?? []).map(c => ({
    url: `${BASE_URL}/company/${c.slug}`,
    lastModified: c.created_at ? new Date(c.created_at) : new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  // Fetch all blog post slugs
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
