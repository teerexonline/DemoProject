'use client'

import Header from '@/components/landing/header'
import Hero from '@/components/landing/hero'
import Features from '@/components/landing/features'
import Testimonials from '@/components/landing/testimonials'
import Trending from '@/components/landing/trending'
import Pricing from '@/components/landing/pricing'
import Footer from '@/components/landing/footer'

export default function Page() {
  return (
    <main style={{ background: '#fff', minHeight: '100vh' }}>
      <Header />
      <Hero />

      {/* Showcase 1: Remove knowledge gaps */}
      <section className="section-pad" style={{ padding: '96px 24px', background: '#fff', borderTop: '1px solid #F4F4F5' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <p style={{ color: '#7C3AED', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>DEEP RESEARCH</p>
          <h2 style={{
            fontSize: 'clamp(26px, 3.5vw, 44px)',
            fontWeight: 800, letterSpacing: '-0.04em',
            color: '#09090B', lineHeight: 1.1, margin: '0 0 48px', maxWidth: '600px',
          }}>
            Remove knowledge gaps<br />before every interview.
          </h2>

          <div className="section-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '56px', alignItems: 'center' }}>
            <div>
              <p style={{ color: '#52525B', fontSize: '16px', lineHeight: 1.7, margin: '0 0 24px' }}>
                Most candidates show up knowing only what&apos;s on a company&apos;s homepage. ResearchOrg gives you everything else — org depth, team structure, tooling, and strategic context.
              </p>
              <a
                href="#"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  color: '#7C3AED', fontSize: '14px', fontWeight: 600, textDecoration: 'none',
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
              borderRadius: '14px', border: '1px solid #E4E4E7',
              background: '#fff', overflow: 'hidden',
              boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
            }}>
              <div style={{ padding: '12px 14px', borderBottom: '1px solid #F4F4F5', background: '#FAFAFA', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ flex: 1, height: '30px', background: '#F0F0F2', borderRadius: '7px', display: 'flex', alignItems: 'center', paddingLeft: '10px', gap: '8px' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                  </svg>
                  <span style={{ color: '#A1A1AA', fontSize: '11.5px' }}>Searching: Stripe Engineering team...</span>
                </div>
              </div>
              <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { name: 'Stripe', role: 'Engineering · Payments Infra', color: '#635BFF', badge: '340 roles' },
                  { name: 'Linear', role: 'Design · Product Design', color: '#5E6AD2', badge: '12 roles' },
                  { name: 'Vercel', role: 'DevRel · Developer Experience', color: '#000', badge: '28 roles' },
                  { name: 'Figma', role: 'PM · Core Editor', color: '#F24E1E', badge: '45 roles' },
                ].map((item) => (
                  <div key={item.name} style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '10px 12px', borderRadius: '9px',
                    background: '#FAFAFA', border: '1px solid #F0F0F2',
                  }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: item.color, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#09090B', fontSize: '12.5px', fontWeight: 600 }}>{item.name}</div>
                      <div style={{ color: '#A1A1AA', fontSize: '11px', marginTop: '1px' }}>{item.role}</div>
                    </div>
                    <div style={{ color: '#7C3AED', fontSize: '11px', fontWeight: 600, background: '#F5F3FF', padding: '3px 9px', borderRadius: '5px', border: '1px solid #DDD6FE' }}>{item.badge}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stat callout 1 */}
      <section className="section-pad-sm" style={{ padding: '72px 24px', background: '#F7F5FF', borderTop: '1px solid #EDE9FE', borderBottom: '1px solid #EDE9FE' }}>
        <div className="stat-callout-inner" style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '24px' }}>
          <h3 style={{
            fontSize: 'clamp(20px, 3vw, 36px)', fontWeight: 800,
            letterSpacing: '-0.04em', color: '#09090B', margin: 0, lineHeight: 1.15,
          }}>
            ResearchOrg users are <span style={{ color: '#7C3AED' }}>3×</span> more confident<br />walking into interviews.
          </h3>
          <a href="#" style={{ color: '#7C3AED', fontSize: '14px', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>
            Read the story →
          </a>
        </div>
      </section>

      <Features />

      {/* Showcase 2: Organize & save */}
      <section className="section-pad" style={{ padding: '96px 24px', background: '#fff', borderTop: '1px solid #F4F4F5' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div className="section-2col" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '56px', alignItems: 'center' }}>
            {/* Saved list mockup */}
            <div style={{
              borderRadius: '14px', border: '1px solid #E4E4E7',
              background: '#fff', overflow: 'hidden',
              boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
              padding: '20px',
              display: 'flex', flexDirection: 'column', gap: '10px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #F4F4F5' }}>
                <span style={{ color: '#09090B', fontSize: '13.5px', fontWeight: 700 }}>Saved Research Lists</span>
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
                  background: folder.active ? '#F5F3FF' : '#FAFAFA',
                  border: folder.active ? '1px solid #DDD6FE' : '1px solid #F0F0F2',
                }}>
                  <span style={{ fontSize: '14px' }}>📁</span>
                  <span style={{ color: folder.active ? '#6D28D9' : '#52525B', fontSize: '13px', fontWeight: folder.active ? 600 : 400, flex: 1 }}>
                    {folder.label}
                  </span>
                  <span style={{ color: '#A1A1AA', fontSize: '11.5px' }}>{folder.count} co.</span>
                </div>
              ))}
            </div>

            <div>
              <p style={{ color: '#7C3AED', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px' }}>ORGANIZE</p>
              <h2 style={{
                fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 800,
                letterSpacing: '-0.04em', color: '#09090B', lineHeight: 1.15, margin: '0 0 16px',
              }}>
                Save, organize, and track every company in one place.
              </h2>
              <p style={{ color: '#71717A', fontSize: '15px', lineHeight: 1.7, margin: '0 0 24px' }}>
                Build research lists by industry, role, or application stage. Never lose track of a company you wanted to research.
              </p>
              <a href="#" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#7C3AED', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }}
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
      <section className="section-pad" style={{ padding: '96px 24px', background: '#FAFAFA', borderTop: '1px solid #F4F4F5' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div className="section-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '56px', alignItems: 'center' }}>
            <div>
              <p style={{ color: '#7C3AED', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px' }}>DATA QUALITY</p>
              <h2 style={{
                fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 800,
                letterSpacing: '-0.04em', color: '#09090B', lineHeight: 1.15, margin: '0 0 24px',
              }}>
                Research with confidence and clarity.
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', marginBottom: '28px' }}>
                {[
                  { title: 'Verified Data Sources', desc: 'Sourced from public filings, LinkedIn, Crunchbase, and verified databases — not scraped guesswork.' },
                  { title: 'Live Change Tracking', desc: 'Get notified when companies update their org structure, headcount, or open roles.' },
                ].map(item => (
                  <div key={item.title} style={{ paddingLeft: '16px', borderLeft: '2px solid #DDD6FE' }}>
                    <div style={{ color: '#09090B', fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>{item.title}</div>
                    <div style={{ color: '#71717A', fontSize: '13.5px', lineHeight: 1.6 }}>{item.desc}</div>
                  </div>
                ))}
              </div>
              <a href="#" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#7C3AED', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }}>
                Learn about our data →
              </a>
            </div>

            {/* Detail panel mockup */}
            <div style={{
              borderRadius: '14px', border: '1px solid #E4E4E7',
              background: '#fff', overflow: 'hidden',
              boxShadow: '0 4px 24px rgba(0,0,0,0.07)', padding: '20px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', paddingBottom: '14px', borderBottom: '1px solid #F4F4F5' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: '#4285F4', flexShrink: 0 }} />
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
                  <div key={stat.label} style={{ padding: '10px 12px', borderRadius: '8px', background: '#F7F7F8', border: '1px solid #F0F0F2' }}>
                    <div style={{ color: '#A1A1AA', fontSize: '10.5px', marginBottom: '3px' }}>{stat.label}</div>
                    <div style={{ color: '#09090B', fontSize: '14px', fontWeight: 700 }}>{stat.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ padding: '10px 12px', borderRadius: '8px', background: '#F5F3FF', border: '1px solid #DDD6FE' }}>
                <div style={{ color: '#6D28D9', fontSize: '11.5px', fontWeight: 600, marginBottom: '2px' }}>🔔 Change detected</div>
                <div style={{ color: '#7C3AED', fontSize: '12px' }}>Hiring in Engineering increased 18% this month</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stat callout 2 */}
      <section style={{ padding: '96px 24px', background: '#09090B', borderTop: '1px solid #09090B' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{
            fontSize: 'clamp(28px, 5vw, 56px)', fontWeight: 800,
            letterSpacing: '-0.04em', color: '#fff', margin: '0 0 16px', lineHeight: 1.05,
          }}>
            ResearchOrg helps you walk in<br />
            <span style={{ color: '#A78BFA' }}>more prepared than anyone else.</span>
          </h2>
          <p style={{ color: '#71717A', fontSize: '16px', margin: '0 0 32px' }}>
            Join 10,000+ job seekers who use ResearchOrg to research smarter and interview better.
          </p>
          <a
            href="/signup"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              color: '#fff', textDecoration: 'none', fontSize: '15px', fontWeight: 600,
              padding: '14px 28px', borderRadius: '11px', background: '#7C3AED',
              boxShadow: '0 0 30px rgba(124,58,237,0.4)',
              transition: 'background 0.15s, transform 0.1s',
              letterSpacing: '-0.01em',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement
              el.style.background = '#6D28D9'
              el.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement
              el.style.background = '#7C3AED'
              el.style.transform = 'translateY(0)'
            }}
          >
            Start for free — no credit card required
          </a>
        </div>
      </section>

      <Testimonials />
      <Trending />
      <Pricing />
      <Footer />
    </main>
  )
}
