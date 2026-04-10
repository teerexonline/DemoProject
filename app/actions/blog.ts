'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BlogPost {
  id: string
  slug: string
  title: string
  excerpt: string | null
  content: string
  cover_image: string | null
  author: string
  category: string | null
  tags: string[]
  published: boolean
  featured: boolean
  reading_time: number | null
  seo_title: string | null
  seo_description: string | null
  published_at: string | null
  created_at: string
  updated_at: string
}

// ─── Auth guard ───────────────────────────────────────────────────────────────

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase.from('profiles').select('plan').eq('id', user.id).single()
  if (!profile || !['Admin', 'SuperAdmin'].includes(profile.plan)) throw new Error('Forbidden')
  return { supabase, user }
}

// ─── Public reads ─────────────────────────────────────────────────────────────

export async function getBlogPosts(options?: { category?: string; featured?: boolean; limit?: number }) {
  const supabase = await createClient()
  let query = supabase
    .from('blog_posts')
    .select('id,slug,title,excerpt,cover_image,author,category,tags,reading_time,published_at,featured,created_at')
    .eq('published', true)
    .order('published_at', { ascending: false })

  if (options?.category) query = query.eq('category', options.category)
  if (options?.featured !== undefined) query = query.eq('featured', options.featured)
  if (options?.limit) query = query.limit(options.limit)

  const { data, error } = await query
  if (error) return { data: null, error: error.message }
  return { data: data as Partial<BlogPost>[], error: null }
}

export async function getBlogPost(slug: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .single()
  if (error) return { data: null, error: error.message }
  return { data: data as BlogPost, error: null }
}

export async function getBlogCategories() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('blog_posts')
    .select('category')
    .eq('published', true)
    .not('category', 'is', null)
  const categories = [...new Set((data ?? []).map((r: { category: string | null }) => r.category).filter(Boolean))] as string[]
  return categories.sort()
}

// ─── Admin reads ──────────────────────────────────────────────────────────────

export async function adminGetBlogPosts() {
  const { supabase } = await requireAdmin()
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return { data: null, error: error.message }
  return { data: data as BlogPost[], error: null }
}

// ─── Admin writes ─────────────────────────────────────────────────────────────

export async function adminUpsertBlogPost(post: {
  id?: string
  slug: string
  title: string
  excerpt?: string
  content: string
  cover_image?: string
  author?: string
  category?: string
  tags?: string[]
  published?: boolean
  featured?: boolean
  reading_time?: number
  seo_title?: string
  seo_description?: string
  published_at?: string
}) {
  const { supabase } = await requireAdmin()

  const payload = {
    ...post,
    author: post.author || 'ResearchOrg Team',
    tags: post.tags ?? [],
    published: post.published ?? false,
    featured: post.featured ?? false,
    published_at: post.published ? (post.published_at || new Date().toISOString()) : null,
  }

  const { data, error } = await supabase
    .from('blog_posts')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  revalidatePath('/blog')
  revalidatePath(`/blog/${post.slug}`)
  return { data: data as BlogPost, error: null }
}

export async function adminDeleteBlogPost(id: string) {
  const { supabase } = await requireAdmin()
  const { data: post } = await supabase.from('blog_posts').select('slug').eq('id', id).single()
  const { error } = await supabase.from('blog_posts').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/blog')
  if (post?.slug) revalidatePath(`/blog/${post.slug}`)
  return { error: null }
}
