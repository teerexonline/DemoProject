import type { Metadata } from 'next'
import Link from 'next/link'
import { getBlogPosts, getBlogCategories } from '@/app/actions/blog'

export const metadata: Metadata = {
  title: 'Blog — ResearchOrg',
  description: 'Career strategy, company research tips, and interview preparation guides for ambitious job seekers.',
  openGraph: {
    title: 'Blog — ResearchOrg',
    description: 'Career strategy, company research tips, and interview preparation guides for ambitious job seekers.',
    type: 'website',
  },
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

export default async function BlogPage() {
  const [postsResult, categories] = await Promise.all([
    getBlogPosts(),
    getBlogCategories(),
  ])

  const posts = postsResult.data ?? []
  const featured = posts.find(p => p.featured)
  const rest = posts.filter(p => !p.featured)

  return (
    <>
      <style>{`
        .blog-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
        .blog-card { background: #fff; border: 1px solid #e2eaf2; border-radius: 14px; overflow: hidden; transition: box-shadow 0.18s, transform 0.18s; text-decoration: none; display: flex; flex-direction: column; }
        .blog-card:hover { box-shadow: 0 8px 32px rgba(6,63,118,0.10); transform: translateY(-2px); }
        .blog-featured-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; align-items: center; }
        .blog-category-pill { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; }
        .blog-filter-btn { padding: 6px 14px; border-radius: 20px; border: 1px solid #e2eaf2; background: #fff; font-size: 12.5px; color: #52525B; cursor: pointer; transition: all 0.15s; font-family: inherit; }
        .blog-filter-btn:hover { border-color: #063f76; color: #063f76; }
        .blog-filter-btn.active { background: #063f76; color: #fff; border-color: #063f76; }
        @media (max-width: 900px) {
          .blog-grid { grid-template-columns: repeat(2, 1fr); }
          .blog-featured-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 600px) {
          .blog-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #f0f6ff 0%, #f8fbfe 50%, #f0f5f0 100%)',
        borderBottom: '1px solid #e2eaf2',
        padding: '72px 24px 56px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Grid pattern */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(#e2eaf240 1px, transparent 1px), linear-gradient(90deg, #e2eaf240 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'inline-block', padding: '4px 14px', borderRadius: 20, background: '#eef4fb', border: '1px solid #d4e8f6', color: '#063f76', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 20 }}>
            ResearchOrg Blog
          </div>
          <h1 style={{ fontSize: 44, fontWeight: 900, color: '#09090B', letterSpacing: '-0.04em', lineHeight: 1.1, margin: '0 0 16px' }}>
            Research smarter.<br />Interview better.
          </h1>
          <p style={{ fontSize: 17, color: '#52525B', lineHeight: 1.6, maxWidth: 520, margin: '0 auto 0' }}>
            Career strategy, company research deep-dives, and interview prep guides for job seekers who want to walk in prepared.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 24px' }}>

        {/* Featured post */}
        {featured && (
          <div style={{ marginBottom: 56 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>Featured</div>
            <Link href={`/blog/${featured.slug}`} style={{ display: 'block', textDecoration: 'none' }}>
              <div className="blog-card" style={{ borderRadius: 18, padding: 0, border: '1px solid #e2eaf2', overflow: 'hidden' }}>
                <div className="blog-featured-grid" style={{ padding: '40px 44px' }}>
                  <div>
                    <span className="blog-category-pill" style={{ background: `${categoryColor(featured.category)}15`, color: categoryColor(featured.category), border: `1px solid ${categoryColor(featured.category)}25`, marginBottom: 16 }}>
                      {featured.category}
                    </span>
                    <h2 style={{ fontSize: 28, fontWeight: 800, color: '#09090B', letterSpacing: '-0.03em', lineHeight: 1.25, margin: '0 0 14px' }}>
                      {featured.title}
                    </h2>
                    <p style={{ fontSize: 15, color: '#52525B', lineHeight: 1.65, margin: '0 0 20px' }}>
                      {featured.excerpt}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12.5, color: '#A1A1AA' }}>
                      <span>{featured.author}</span>
                      <span>·</span>
                      <span>{formatDate(featured.published_at ?? null)}</span>
                      {featured.reading_time && <><span>·</span><span>{featured.reading_time} min read</span></>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{
                      width: '100%', maxWidth: 340, aspectRatio: '4/3',
                      borderRadius: 14, overflow: 'hidden',
                      border: '1px solid #e2eaf2',
                      background: 'linear-gradient(135deg, #eef4fb 0%, #f0f6ff 100%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {featured.cover_image
                        ? <img src={featured.cover_image} alt={featured.title ?? ''} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        : <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#063f7640" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                          </svg>
                      }
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* Category filters */}
        {categories.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 32 }}>
            <span style={{ fontSize: 12.5, color: '#A1A1AA', alignSelf: 'center', marginRight: 4 }}>Filter:</span>
            {categories.map(cat => (
              <span key={cat} className="blog-filter-btn" style={{ cursor: 'default' }}
                data-cat={cat}>
                {cat}
              </span>
            ))}
          </div>
        )}

        {/* Post grid */}
        {rest.length > 0 ? (
          <div className="blog-grid">
            {rest.map(post => (
              <Link key={post.id} href={`/blog/${post.slug}`} className="blog-card">
                {/* Card cover area */}
                <div style={{
                  height: 160, overflow: 'hidden',
                  background: 'linear-gradient(135deg, #eef4fb 0%, #f5f8fd 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderBottom: '1px solid #e2eaf2', flexShrink: 0,
                }}>
                  {post.cover_image
                    ? <img src={post.cover_image} alt={post.title ?? ''} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    : <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#063f7650" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                      </svg>
                  }
                </div>
                <div style={{ padding: '20px 22px 24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  {post.category && (
                    <span className="blog-category-pill" style={{ background: `${categoryColor(post.category)}12`, color: categoryColor(post.category), border: `1px solid ${categoryColor(post.category)}20`, marginBottom: 12, alignSelf: 'flex-start' }}>
                      {post.category}
                    </span>
                  )}
                  <h3 style={{ fontSize: 16.5, fontWeight: 800, color: '#09090B', letterSpacing: '-0.025em', lineHeight: 1.35, margin: '0 0 10px', flex: 1 }}>
                    {post.title}
                  </h3>
                  <p style={{ fontSize: 13, color: '#71717A', lineHeight: 1.6, margin: '0 0 16px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {post.excerpt}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: '#A1A1AA', marginTop: 'auto' }}>
                    <span>{formatDate(post.published_at ?? null)}</span>
                    {post.reading_time && <><span>·</span><span>{post.reading_time} min read</span></>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          posts.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#A1A1AA' }}>
              No posts yet. Check back soon.
            </div>
          )
        )}

        {/* CTA */}
        <div style={{ marginTop: 80, padding: '48px 40px', borderRadius: 20, background: 'linear-gradient(135deg, #063f76 0%, #0a5299 100%)', textAlign: 'center' }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', margin: '0 0 12px' }}>
            Research any company in minutes
          </h2>
          <p style={{ fontSize: 15, color: '#93c5fd', lineHeight: 1.6, margin: '0 0 28px' }}>
            Get org charts, financial data, internal tools, and interview insights — all in one place.
          </p>
          <Link href="/signup" style={{ display: 'inline-block', padding: '12px 28px', borderRadius: 10, background: '#fff', color: '#063f76', fontSize: 14, fontWeight: 700, textDecoration: 'none', letterSpacing: '-0.01em' }}>
            Get started free
          </Link>
        </div>
      </div>
    </>
  )
}
