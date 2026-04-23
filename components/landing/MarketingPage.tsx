'use client'

import Hero from '@/components/landing/hero'
import Features from '@/components/landing/features'
import Testimonials from '@/components/landing/testimonials'
import Trending from '@/components/landing/trending'
const EXPLORE_SECTORS = [
  { id: 'tech',       label: 'Technology',           desc: 'Software, AI, Cloud & Dev Tools',     accent: '#2563EB', img: 'https://images.unsplash.com/photo-1587620962725-abab7fe55159?w=480&h=260&fit=crop&auto=format&q=75' },
  { id: 'finance',    label: 'Finance',              desc: 'Banking, Fintech & Capital Markets',  accent: '#059669', img: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=480&h=260&fit=crop&auto=format&q=75' },
  { id: 'defense',    label: 'Aerospace & Defense',  desc: 'Aviation, Space & Defense Systems',   accent: '#7C3AED', img: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=480&h=260&fit=crop&auto=format&q=75' },
  { id: 'security',   label: 'Security',             desc: 'Cybersecurity & Physical Security',   accent: '#DC2626', img: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=480&h=260&fit=crop&auto=format&q=75' },
  { id: 'consumer',   label: 'Consumer & Retail',    desc: 'E-commerce, CPG & Retail Brands',     accent: '#D97706', img: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=480&h=260&fit=crop&auto=format&q=75' },
  { id: 'services',   label: 'Services',             desc: 'Consulting, Staffing & Professional', accent: '#0891B2', img: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=480&h=260&fit=crop&auto=format&q=75' },
  { id: 'industrial', label: 'Industrial',           desc: 'Manufacturing, Energy & Utilities',   accent: '#92400E', img: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=480&h=260&fit=crop&auto=format&q=75' },
  { id: 'health',     label: 'Healthcare',           desc: 'MedTech, Pharma & Health Systems',    accent: '#BE185D', img: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=480&h=260&fit=crop&auto=format&q=75' },
  { id: 'energy',     label: 'Energy',               desc: 'Oil & Gas, Renewables & Utilities',   accent: '#CA8A04', img: 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=480&h=260&fit=crop&auto=format&q=75' },
  { id: 'infra',      label: 'Infrastructure', desc: 'Networking, CDN, Cloud & DevOps',      accent: '#0F766E', img: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=480&h=260&fit=crop&auto=format&q=75' },
]

export default function MarketingPage() {
  return (
    <main style={{ background: '#fff', minHeight: '100vh' }}>
      <Hero />

      {/* Showcase 1: Remove knowledge gaps */}
      <section className="section-pad" style={{ padding: '96px 24px', background: '#fff', borderTop: '1px solid #e2eaf2' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <p style={{ color: '#609dd6', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>DEEP RESEARCH</p>
          <h2 style={{
            fontSize: 'clamp(26px, 3.5vw, 44px)',
            fontWeight: 800, letterSpacing: '-0.04em',
            color: '#063f76', lineHeight: 1.1, margin: '0 0 48px', maxWidth: '600px',
          }}>
            Remove knowledge gaps<br />before every interview.
          </h2>

          <div className="section-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '56px', alignItems: 'center' }}>
            <div>
              <p style={{ color: '#52525B', fontSize: '16px', lineHeight: 1.7, margin: '0 0 24px' }}>
                Most candidates show up knowing only what&apos;s on a company&apos;s homepage. ResearchOrg gives you everything else — org depth, team structure, tooling, and strategic context.
              </p>
              <a
                href="/features"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  color: '#063f76', fontSize: '14px', fontWeight: 600, textDecoration: 'none',
                  transition: 'gap 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.gap = '10px'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.gap = '6px'}
              >
                See how it works →
              </a>
            </div>

            {/* Search results mockup */}
            <div style={{
              borderRadius: '14px', border: '1px solid #e2eaf2',
              background: '#fff', overflow: 'hidden',
              boxShadow: '0 4px 24px rgba(6,63,118,0.07)',
            }}>
              <div style={{ padding: '12px 14px', borderBottom: '1px solid #f0f6fc', background: '#f8fbfe', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ flex: 1, height: '30px', background: '#eef4fb', borderRadius: '7px', display: 'flex', alignItems: 'center', paddingLeft: '10px', gap: '8px' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#609dd6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                  </svg>
                  <span style={{ color: '#609dd6', fontSize: '11.5px' }}>Searching: Stripe Engineering team...</span>
                </div>
              </div>
              <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { name: 'Stripe', role: 'Engineering · Payments Infra', color: '#533AFD', logo: '/logo/Stripe.svg',     badge: '340 roles' },
                  { name: 'Linear', role: 'Design · Product Design',     color: '#222326', logo: '/logo/Linear.svg',     badge: '12 roles'  },
                  { name: 'Vercel', role: 'DevRel · Developer Experience',color: '#000',    logo: '/logo/Vercel.svg',     badge: '28 roles'  },
                  { name: 'Figma',  role: 'PM · Core Editor',            color: '#F24E1E', logo: '/logo/Figma.svg',      badge: '45 roles'  },
                ].map((item) => (
                  <div key={item.name} style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '10px 12px', borderRadius: '9px',
                    background: '#f8fbfe', border: '1px solid #eef4fb',
                  }}>
                    {item.logo
                      ? <img src={item.logo} alt={item.name} style={{ width: '28px', height: '28px', borderRadius: '7px', flexShrink: 0, display: 'block' }} />
                      : <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: item.color, flexShrink: 0 }} />
                    }
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#09090B', fontSize: '12.5px', fontWeight: 600 }}>{item.name}</div>
                      <div style={{ color: '#A1A1AA', fontSize: '11px', marginTop: '1px' }}>{item.role}</div>
                    </div>
                    <div style={{ color: '#063f76', fontSize: '11px', fontWeight: 600, background: '#eef4fb', padding: '3px 9px', borderRadius: '5px', border: '1px solid #a8cbe8' }}>{item.badge}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stat callout 1 */}
      <section className="section-pad-sm" style={{ padding: '72px 24px', background: '#eef4fb', borderTop: '1px solid #c8dff2', borderBottom: '1px solid #c8dff2' }}>
        <div className="stat-callout-inner" style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '24px' }}>
          <h3 style={{
            fontSize: 'clamp(20px, 3vw, 36px)', fontWeight: 800,
            letterSpacing: '-0.04em', color: '#063f76', margin: 0, lineHeight: 1.15,
          }}>
            ResearchOrg users are <span style={{ color: '#609dd6' }}>3×</span> more confident<br />walking into interviews.
          </h3>
          <a href="/blog" style={{ color: '#063f76', fontSize: '14px', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>
            Read the story →
          </a>
        </div>
      </section>

      <Features />

      {/* Showcase 2: Organize & save */}
      <section className="section-pad" style={{ padding: '96px 24px', background: '#fff', borderTop: '1px solid #e2eaf2' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div className="section-2col" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '56px', alignItems: 'center' }}>
            {/* Saved list mockup */}
            <div style={{
              borderRadius: '14px', border: '1px solid #e2eaf2',
              background: '#fff', overflow: 'hidden',
              boxShadow: '0 4px 24px rgba(6,63,118,0.07)',
              padding: '20px',
              display: 'flex', flexDirection: 'column', gap: '10px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #f0f6fc' }}>
                <span style={{ color: '#063f76', fontSize: '13.5px', fontWeight: 700 }}>Saved Research Lists</span>
                <span style={{ color: '#A1A1AA', fontSize: '11.5px' }}>12 companies saved</span>
              </div>
              {[
                { label: 'FAANG & Big Tech', count: 6, active: true },
                { label: 'Startups to Watch', count: 3, active: false },
                { label: 'Fintech Companies', count: 2, active: false },
                { label: 'Design-led Products', count: 1, active: false },
              ].map((folder) => (
                <div key={folder.label} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 12px', borderRadius: '9px',
                  background: folder.active ? '#eef4fb' : '#f8fbfe',
                  border: folder.active ? '1px solid #a8cbe8' : '1px solid #eef4fb',
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', color: '#063f76' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                  </span>
                  <span style={{ color: folder.active ? '#063f76' : '#52525B', fontSize: '13px', fontWeight: folder.active ? 600 : 400, flex: 1 }}>
                    {folder.label}
                  </span>
                  <span style={{ color: '#A1A1AA', fontSize: '11.5px' }}>{folder.count} co.</span>
                </div>
              ))}
            </div>

            <div>
              <p style={{ color: '#609dd6', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px' }}>ORGANIZE</p>
              <h2 style={{
                fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 800,
                letterSpacing: '-0.04em', color: '#063f76', lineHeight: 1.15, margin: '0 0 16px',
              }}>
                Save, organize, and track every company in one place.
              </h2>
              <p style={{ color: '#71717A', fontSize: '15px', lineHeight: 1.7, margin: '0 0 24px' }}>
                Build research lists by industry, role, or application stage. Never lose track of a company you wanted to research.
              </p>
              <a href="/explore" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#063f76', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.gap = '10px'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.gap = '6px'}
              >
                Manage research →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Showcase 3: Accuracy & control */}
      <section className="section-pad" style={{ padding: '96px 24px', background: '#f8fbfe', borderTop: '1px solid #e2eaf2' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div className="section-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '56px', alignItems: 'center' }}>
            <div>
              <p style={{ color: '#609dd6', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px' }}>DATA QUALITY</p>
              <h2 style={{
                fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 800,
                letterSpacing: '-0.04em', color: '#063f76', lineHeight: 1.15, margin: '0 0 24px',
              }}>
                Research with confidence and clarity.
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', marginBottom: '28px' }}>
                {[
                  { title: 'Verified Data Sources', desc: 'Sourced from public filings, LinkedIn, Crunchbase, and verified databases — not scraped guesswork.' },
                  { title: 'Live Change Tracking', desc: 'Get notified when companies update their org structure, headcount, or open roles.' },
                ].map(item => (
                  <div key={item.title} style={{ paddingLeft: '16px', borderLeft: '2px solid #609dd6' }}>
                    <div style={{ color: '#063f76', fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>{item.title}</div>
                    <div style={{ color: '#71717A', fontSize: '13.5px', lineHeight: 1.6 }}>{item.desc}</div>
                  </div>
                ))}
              </div>
              <a href="/features" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#063f76', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }}>
                Learn about our data →
              </a>
            </div>

            {/* Detail panel mockup */}
            <div style={{
              borderRadius: '14px', border: '1px solid #e2eaf2',
              background: '#fff', overflow: 'hidden',
              boxShadow: '0 4px 24px rgba(6,63,118,0.07)', padding: '20px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', paddingBottom: '14px', borderBottom: '1px solid #f0f6fc' }}>
                <img src="/logo/Google.svg" alt="Google" style={{ width: '36px', height: '36px', borderRadius: '9px', flexShrink: 0, display: 'block', objectFit: 'contain', background: '#fff', border: '1px solid #f0f0f2' }} />
                <div>
                  <div style={{ color: '#09090B', fontSize: '14px', fontWeight: 700 }}>Google</div>
                  <div style={{ color: '#71717A', fontSize: '12px' }}>Technology · Mountain View, CA</div>
                </div>
                <div style={{ marginLeft: 'auto', background: '#F0FDF4', color: '#16A34A', fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '100px', border: '1px solid #BBF7D0' }}>Verified ✓</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                {[
                  { label: 'Employees', value: '182,000+' },
                  { label: 'Revenue', value: '$307B' },
                  { label: 'Open Roles', value: '2,400+' },
                  { label: 'Last Updated', value: '2 days ago' },
                ].map(stat => (
                  <div key={stat.label} style={{ padding: '10px 12px', borderRadius: '8px', background: '#f8fbfe', border: '1px solid #eef4fb' }}>
                    <div style={{ color: '#A1A1AA', fontSize: '10.5px', marginBottom: '3px' }}>{stat.label}</div>
                    <div style={{ color: '#063f76', fontSize: '14px', fontWeight: 700 }}>{stat.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ padding: '10px 12px', borderRadius: '8px', background: '#eef4fb', border: '1px solid #a8cbe8' }}>
                <div style={{ color: '#063f76', fontSize: '11.5px', fontWeight: 600, marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                  Change detected
                </div>
                <div style={{ color: '#609dd6', fontSize: '12px' }}>Hiring in Engineering increased 18% this month</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stat callout 2 — dark CTA */}
      <section style={{ padding: '96px 24px', background: '#063f76', borderTop: '1px solid #04294f' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{
            fontSize: 'clamp(28px, 5vw, 56px)', fontWeight: 800,
            letterSpacing: '-0.04em', color: '#fff', margin: '0 0 16px', lineHeight: 1.05,
          }}>
            ResearchOrg helps you walk in<br />
            <span style={{ color: '#609dd6' }}>more prepared than anyone else.</span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '16px', margin: '0 0 32px' }}>
            500+ companies. Org charts, financials, team structure, and more — all free.
          </p>
          <a
            href="/explore"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              color: '#063f76', textDecoration: 'none', fontSize: '15px', fontWeight: 600,
              padding: '14px 28px', borderRadius: '11px', background: '#fff',
              boxShadow: '0 0 30px rgba(96,157,214,0.3)',
              transition: 'background 0.15s, transform 0.1s',
              letterSpacing: '-0.01em',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement
              el.style.background = '#eef4fb'
              el.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement
              el.style.background = '#fff'
              el.style.transform = 'translateY(0)'
            }}
          >
            Start exploring — it&apos;s free
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </a>
        </div>
      </section>

      <Testimonials />
      <Trending />

      {/* Browse Companies */}
      <section style={{ padding: '88px 24px', background: '#f8fbfe', borderTop: '1px solid #e2eaf2' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 40, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <p style={{ color: '#609dd6', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>EXPLORE</p>
              <h2 style={{ fontSize: 'clamp(22px, 3vw, 36px)', fontWeight: 800, letterSpacing: '-0.04em', color: '#09090B', lineHeight: 1.1, margin: 0 }}>
                Browse all companies
              </h2>
            </div>
            <a href="/explore" style={{ color: '#063f76', fontSize: '14px', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>
              See all companies →
            </a>
          </div>

          <div className="explore-sectors-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
            {EXPLORE_SECTORS.map(s => (
              <a
                key={s.id}
                href={`/explore?category=${s.id}`}
                style={{ textDecoration: 'none', display: 'block', borderRadius: 14, background: '#fff', border: '1.5px solid #e2eaf2', overflow: 'hidden', transition: 'border-color 0.15s, box-shadow 0.15s, transform 0.15s', cursor: 'pointer' }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = s.accent; el.style.boxShadow = `0 8px 28px ${s.accent}20`; el.style.transform = 'translateY(-3px)' }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = '#e2eaf2'; el.style.boxShadow = 'none'; el.style.transform = 'translateY(0)' }}
              >
                <div style={{ height: 130, overflow: 'hidden', background: '#f0f4f8' }}>
                  <img
                    src={s.img}
                    alt={s.label}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.4s ease' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
                  />
                </div>
                <div style={{ padding: '16px 18px 18px' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#09090B', letterSpacing: '-0.03em', marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 12, color: '#71717A', lineHeight: 1.5, marginBottom: 12 }}>{s.desc}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: s.accent }}>Explore →</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>


      <style>{`
        .section-2col {
          grid-template-columns: 1fr 1.5fr;
        }
        @media (max-width: 860px) {
          .section-2col {
            grid-template-columns: 1fr !important;
            gap: 36px !important;
          }
          .section-pad {
            padding: 56px 20px !important;
          }
          .section-pad-sm {
            padding: 40px 20px !important;
          }
          .stat-callout-inner {
            flex-direction: column !important;
            text-align: center !important;
            gap: 16px !important;
          }
        }
        @media (max-width: 480px) {
          .explore-sectors-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>
    </main>
  )
}
