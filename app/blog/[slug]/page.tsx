import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getBlogPost, getBlogPosts } from '@/app/actions/blog'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const { data: post } = await getBlogPost(slug)
  if (!post) return { title: 'Post not found — ResearchOrg' }

  const title = post.seo_title ?? `${post.title} — ResearchOrg`
  const description = post.seo_description ?? post.excerpt ?? ''

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      publishedTime: post.published_at ?? undefined,
      authors: [post.author],
      tags: post.tags,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function categoryColor(cat: string | null | undefined) {
  const map: Record<string, string> = {
    'Interview Prep': '#063f76',
    'Company Research': '#0e7a4a',
    'Career Strategy': '#7c3aed',
    'Engineering': '#b45309',
  }
  return map[cat ?? ''] ?? '#52525B'
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const [{ data: post }, relatedResult] = await Promise.all([
    getBlogPost(slug),
    getBlogPosts({ limit: 4 }),
  ])

  if (!post) notFound()

  const related = (relatedResult.data ?? []).filter(p => p.slug !== slug).slice(0, 3)

  // JSON-LD structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    author: { '@type': 'Organization', name: post.author },
    publisher: {
      '@type': 'Organization',
      name: 'ResearchOrg',
      url: 'https://researchorg.com',
    },
    datePublished: post.published_at,
    dateModified: post.updated_at,
    keywords: post.tags.join(', '),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <style>{`
        .blog-post-content { font-size: 16.5px; line-height: 1.75; color: #18181B; }
        .blog-post-content h2 { font-size: 24px; font-weight: 800; color: #09090B; letter-spacing: -0.03em; margin: 40px 0 16px; line-height: 1.25; }
        .blog-post-content h3 { font-size: 18px; font-weight: 700; color: #09090B; letter-spacing: -0.02em; margin: 32px 0 12px; }
        .blog-post-content p { margin: 0 0 20px; }
        .blog-post-content ul, .blog-post-content ol { margin: 0 0 20px; padding-left: 24px; }
        .blog-post-content li { margin-bottom: 8px; line-height: 1.65; }
        .blog-post-content strong { color: #09090B; font-weight: 700; }
        .blog-post-content a { color: #063f76; text-decoration: underline; }
        .blog-post-content a:hover { color: #0a5299; }
        .blog-post-content blockquote { border-left: 3px solid #063f76; margin: 24px 0; padding: 16px 20px; background: #f0f6ff; border-radius: 0 8px 8px 0; font-style: italic; color: #52525B; }
        .blog-post-content hr { border: none; border-top: 1px solid #e2eaf2; margin: 32px 0; }
        .blog-related-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        @media (max-width: 900px) {
          .blog-post-layout { grid-template-columns: 1fr !important; }
          .blog-post-sidebar { display: none !important; }
          .blog-related-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 600px) {
          .blog-related-grid { grid-template-columns: 1fr; }
          .blog-post-content h2 { font-size: 20px; }
          .blog-post-content { font-size: 15.5px; }
        }
      `}</style>

      {/* Article header */}
      <div style={{
        background: 'linear-gradient(135deg, #f0f6ff 0%, #f8fbfe 100%)',
        borderBottom: '1px solid #e2eaf2',
        padding: '56px 24px 48px',
      }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#A1A1AA', marginBottom: 24 }}>
            <Link href="/" style={{ color: '#A1A1AA', textDecoration: 'none' }}>Home</Link>
            <span>/</span>
            <Link href="/blog" style={{ color: '#A1A1AA', textDecoration: 'none' }}>Blog</Link>
            <span>/</span>
            <span style={{ color: '#52525B' }}>{post.title}</span>
          </div>

          {post.category && (
            <div style={{ marginBottom: 16 }}>
              <span style={{
                display: 'inline-block', padding: '3px 12px', borderRadius: 20,
                background: `${categoryColor(post.category)}15`, color: categoryColor(post.category),
                border: `1px solid ${categoryColor(post.category)}25`,
                fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                {post.category}
              </span>
            </div>
          )}

          <h1 style={{ fontSize: 38, fontWeight: 900, color: '#09090B', letterSpacing: '-0.04em', lineHeight: 1.15, margin: '0 0 16px' }}>
            {post.title}
          </h1>

          {post.excerpt && (
            <p style={{ fontSize: 17, color: '#52525B', lineHeight: 1.6, margin: '0 0 24px' }}>
              {post.excerpt}
            </p>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: '#A1A1AA' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#eef4fb', border: '1px solid #d4e8f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#063f76" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <span style={{ color: '#52525B', fontWeight: 600 }}>{post.author}</span>
            <span>·</span>
            <span>{formatDate(post.published_at)}</span>
            {post.reading_time && (
              <><span>·</span><span>{post.reading_time} min read</span></>
            )}
            {post.tags.length > 0 && (
              <>
                <span>·</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {post.tags.slice(0, 3).map(tag => (
                    <span key={tag} style={{ padding: '2px 8px', borderRadius: 5, background: '#F4F4F5', border: '1px solid #E4E4E7', fontSize: 11, color: '#52525B' }}>{tag}</span>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Article body */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 24px' }}>
        <div className="blog-post-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 48, alignItems: 'start' }}>

          {/* Content */}
          <article>
            <div
              className="blog-post-content"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />

            {/* Tags */}
            {post.tags.length > 0 && (
              <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid #e2eaf2' }}>
                <div style={{ fontSize: 11.5, color: '#A1A1AA', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Tags</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {post.tags.map(tag => (
                    <span key={tag} style={{ padding: '4px 12px', borderRadius: 6, background: '#F4F4F5', border: '1px solid #E4E4E7', fontSize: 12.5, color: '#52525B' }}>{tag}</span>
                  ))}
                </div>
              </div>
            )}
          </article>

          {/* Sidebar */}
          <aside className="blog-post-sidebar" style={{ position: 'sticky', top: 24 }}>
            <div style={{ padding: '20px', borderRadius: 14, background: '#f8fbfe', border: '1px solid #e2eaf2', marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#063f76', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
                Research smarter
              </div>
              <p style={{ fontSize: 13, color: '#52525B', lineHeight: 1.6, margin: '0 0 16px' }}>
                Get company org charts, financials, internal tools, and interview prep — all in one place.
              </p>
              <Link href="/signup" style={{ display: 'block', padding: '10px 16px', borderRadius: 8, background: '#063f76', color: '#fff', fontSize: 13, fontWeight: 700, textDecoration: 'none', textAlign: 'center' }}>
                Get started free
              </Link>
            </div>

            <div style={{ padding: '16px 20px', borderRadius: 14, background: '#fff', border: '1px solid #e2eaf2' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                More articles
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {related.map(r => (
                  <Link key={r.id} href={`/blog/${r.slug}`} style={{ textDecoration: 'none' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#09090B', lineHeight: 1.4, marginBottom: 4 }}>{r.title}</div>
                    <div style={{ fontSize: 11.5, color: '#A1A1AA' }}>{r.reading_time ? `${r.reading_time} min read` : formatDate(r.published_at ?? null)}</div>
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>

        {/* Related posts */}
        {related.length > 0 && (
          <div style={{ marginTop: 64, paddingTop: 40, borderTop: '1px solid #e2eaf2' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 24 }}>More articles</div>
            <div className="blog-related-grid">
              {related.map(r => (
                <Link key={r.id} href={`/blog/${r.slug}`} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', background: '#fff', border: '1px solid #e2eaf2', borderRadius: 12, padding: '20px', transition: 'box-shadow 0.15s, transform 0.15s' }}
                  onMouseEnter={undefined}>
                  {r.category && (
                    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 12, background: `${categoryColor(r.category)}12`, color: categoryColor(r.category), fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, alignSelf: 'flex-start' }}>
                      {r.category}
                    </span>
                  )}
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: '#09090B', lineHeight: 1.4, marginBottom: 8, flex: 1 }}>{r.title}</div>
                  <div style={{ fontSize: 11.5, color: '#A1A1AA' }}>{r.reading_time ? `${r.reading_time} min read` : formatDate(r.published_at ?? null)}</div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
