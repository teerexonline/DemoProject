'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, ArrowRight, Building2, GraduationCap, Users } from 'lucide-react'

const FREE_BENEFITS = [
  'Save companies to your research list',
  'Watchlist alerts when data changes',
  'Access to 500+ company profiles',
  'Org structure & headcount data',
  'Interview prep content',
  'Free — no credit card ever',
]

const ENTERPRISE_FEATURES = [
  'Everything in the free plan',
  'API access for data integrations',
  'Bulk CSV & PDF exports',
  'SSO & team seat management',
  'Dedicated account manager',
  'Custom data coverage requests',
  'SLA & uptime guarantee',
  'Onboarding & training sessions',
]

const USE_CASES = [
  {
    icon: <Users size={20} strokeWidth={1.8} />,
    title: 'Recruiting & Talent Teams',
    desc: 'Map target company org structures, identify decision-makers, and track headcount trends before outreach.',
  },
  {
    icon: <Building2 size={20} strokeWidth={1.8} />,
    title: 'Career Services Offices',
    desc: 'Give students structured intelligence on employers — culture, funding stage, and hiring signals — before interviews.',
  },
  {
    icon: <GraduationCap size={20} strokeWidth={1.8} />,
    title: 'Research & Strategy Teams',
    desc: 'Benchmark competitors, monitor org changes, and pull structured data via API into your own workflows.',
  },
]

const FAQ = [
  {
    q: 'What does the free account include?',
    a: 'Every account is free. You get full access to 500+ company profiles including org charts, financials, interview prep content, and internal tools data. Save companies to your watchlist and receive alerts when data updates.',
  },
  {
    q: 'Who is the Enterprise plan for?',
    a: 'Enterprise is built for teams — recruiting firms, university career services, HR departments, and strategy teams who need API access, bulk exports, SSO, and a dedicated account manager.',
  },
  {
    q: 'How is Enterprise pricing structured?',
    a: 'Enterprise is custom-quoted based on team size, data volume, and integration requirements. Contact us and we\'ll put together a tailored proposal within one business day.',
  },
  {
    q: 'Can we get a demo before committing?',
    a: 'Yes. We offer a 30-minute walkthrough for enterprise prospects. Reach out via the contact form and we\'ll schedule a time that works for your team.',
  },
]

const ENTERPRISE_MAILTO = 'mailto:sales@researchorg.com?subject=ResearchOrg%20Enterprise&body=Hi%2C%20I%27d%20like%20to%20learn%20more%20about%20ResearchOrg%20Enterprise%20for%20my%20team.'

export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div style={{ background: '#F8FAFC', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <style>{`
        .price-hero-title { font-family: var(--font-serif), Georgia, serif; }
        .ent-card-hover { transition: box-shadow 0.2s, transform 0.2s; }
        .ent-card-hover:hover { transform: translateY(-3px); box-shadow: 0 24px 60px rgba(2,15,30,0.32), 0 4px 16px rgba(2,15,30,0.16) !important; }
        .free-card-hover { transition: box-shadow 0.2s, transform 0.2s; }
        .free-card-hover:hover { transform: translateY(-3px); box-shadow: 0 12px 40px rgba(6,63,118,0.12) !important; }
        .use-case-card { transition: border-color 0.2s, background 0.2s; }
        .use-case-card:hover { border-color: #a8cbe8 !important; background: #f0f6fb !important; }
        .faq-btn:hover { background: #f0f6fb !important; }
        .ent-cta-btn { transition: background 0.15s, transform 0.1s; }
        .ent-cta-btn:hover { background: rgba(255,255,255,0.18) !important; transform: translateY(-1px); }
        .free-cta-btn { transition: background 0.15s, transform 0.1s, box-shadow 0.15s; }
        .free-cta-btn:hover { background: #042a52 !important; box-shadow: 0 6px 20px rgba(6,63,118,0.3) !important; transform: translateY(-1px); }
        @media (max-width: 820px) {
          .plans-grid { grid-template-columns: 1fr !important; }
          .use-cases-grid { grid-template-columns: 1fr !important; }
          .price-hero-title { font-size: 34px !important; }
        }
        @media (max-width: 520px) {
          .price-hero-title { font-size: 28px !important; }
        }
      `}</style>

      {/* ─── Hero ─── */}
      <div style={{
        background: '#fff',
        borderBottom: '1px solid #e2eaf2',
        padding: '72px 24px 64px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Dot grid */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(#063f76 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          opacity: 0.028,
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 70% 55% at 50% 50%, rgba(255,255,255,0) 0%, #fff 75%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '640px', margin: '0 auto' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#eef4fb', border: '1px solid #a8cbe8',
            borderRadius: 100, padding: '4px 14px', marginBottom: 24,
          }}>
            <span style={{ color: '#063f76', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Access & Plans</span>
          </div>

          <h1 className="price-hero-title" style={{
            fontSize: 44, fontWeight: 700, letterSpacing: '-0.02em',
            color: '#021e3a', margin: '0 0 18px', lineHeight: 1.15,
          }}>
            Free for everyone.<br />
            <span style={{ color: '#063f76' }}>Enterprise-grade</span> for teams.
          </h1>
          <p style={{
            color: '#52525B', fontSize: 16, lineHeight: 1.7,
            margin: '0 auto', maxWidth: 460,
          }}>
            Every job seeker and researcher gets full access at no cost. Teams and organizations can unlock API, bulk exports, and dedicated support.
          </p>
        </div>
      </div>

      {/* ─── Plans ─── */}
      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '60px 24px 0' }}>
        <div className="plans-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'stretch' }}>

          {/* Free card */}
          <div className="free-card-hover" style={{
            background: '#fff',
            border: '1px solid #e2eaf2',
            borderRadius: 20,
            padding: '36px 36px 40px',
            boxShadow: '0 2px 12px rgba(6,63,118,0.05)',
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ marginBottom: 28 }}>
              <div style={{
                display: 'inline-block',
                background: '#eef4fb', color: '#063f76',
                fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                padding: '3px 10px', borderRadius: 6, marginBottom: 16,
              }}>Free Account</div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 10 }}>
                <span style={{ fontSize: 48, fontWeight: 800, letterSpacing: '-0.06em', color: '#09090B', lineHeight: 1 }}>$0</span>
                <span style={{ fontSize: 14, color: '#A1A1AA', fontWeight: 500 }}>/ forever</span>
              </div>
              <p style={{ color: '#71717A', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                For students, job seekers, and anyone researching companies. No card. No trial. Just access.
              </p>
            </div>

            <Link href="/signup" className="free-cta-btn" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '12px 0', borderRadius: 10,
              background: '#063f76', color: '#fff',
              fontSize: 14, fontWeight: 700, textDecoration: 'none',
              letterSpacing: '-0.01em',
              boxShadow: '0 4px 14px rgba(6,63,118,0.22)',
              marginBottom: 28,
            }}>
              Create free account
              <ArrowRight size={15} strokeWidth={2.5} />
            </Link>

            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {FREE_BENEFITS.map(b => (
                <li key={b} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{
                    flexShrink: 0, width: 18, height: 18, borderRadius: 5,
                    background: '#eef4fb', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginTop: 1,
                  }}>
                    <Check size={11} color="#063f76" strokeWidth={2.8} />
                  </div>
                  <span style={{ fontSize: 13.5, color: '#3F3F46', lineHeight: 1.5 }}>{b}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Enterprise card */}
          <div className="ent-card-hover" style={{
            background: 'linear-gradient(160deg, #021e3a 0%, #042a52 55%, #063f76 100%)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 20,
            padding: '36px 36px 40px',
            boxShadow: '0 16px 48px rgba(2,15,30,0.28), 0 2px 8px rgba(2,15,30,0.12)',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
          }}>
            {/* Subtle noise texture */}
            <div style={{
              position: 'absolute', inset: 0, opacity: 0.04,
              backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.75\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
              backgroundSize: '180px',
              pointerEvents: 'none',
            }} />
            {/* Top accent line */}
            <div style={{
              position: 'absolute', top: 0, left: 36, right: 36, height: 2,
              background: 'linear-gradient(90deg, transparent, rgba(99,179,237,0.6), transparent)',
              borderRadius: 1,
            }} />

            <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ marginBottom: 28 }}>
                <div style={{
                  display: 'inline-block',
                  background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.55)',
                  fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                  padding: '3px 10px', borderRadius: 6, marginBottom: 16,
                  border: '1px solid rgba(255,255,255,0.1)',
                }}>Enterprise</div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 10 }}>
                  <span style={{ fontSize: 48, fontWeight: 800, letterSpacing: '-0.06em', color: '#fff', lineHeight: 1 }}>Custom</span>
                </div>
                <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                  For recruiting teams, career services, and organizations that need API access, SSO, and dedicated support.
                </p>
              </div>

              <a href={ENTERPRISE_MAILTO} className="ent-cta-btn" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '12px 0', borderRadius: 10,
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff',
                fontSize: 14, fontWeight: 700, textDecoration: 'none',
                letterSpacing: '-0.01em',
                marginBottom: 28,
              }}>
                Contact Sales
                <ArrowRight size={15} strokeWidth={2.5} />
              </a>

              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {ENTERPRISE_FEATURES.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{
                      flexShrink: 0, width: 18, height: 18, borderRadius: 5,
                      background: 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginTop: 1,
                    }}>
                      <Check size={11} color="rgba(255,255,255,0.8)" strokeWidth={2.8} />
                    </div>
                    <span style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Who uses Enterprise ─── */}
      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '72px 24px 0' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h2 style={{
            fontSize: 'clamp(22px, 2.8vw, 30px)', fontWeight: 800,
            letterSpacing: '-0.04em', color: '#021e3a', margin: '0 0 10px',
          }}>Who uses Enterprise?</h2>
          <p style={{ color: '#71717A', fontSize: 14, margin: 0 }}>
            Built for teams that need structured company intelligence at scale.
          </p>
        </div>

        <div className="use-cases-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {USE_CASES.map(uc => (
            <div key={uc.title} className="use-case-card" style={{
              background: '#fff',
              border: '1px solid #e2eaf2',
              borderRadius: 14,
              padding: '28px 28px 30px',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: '#eef4fb', color: '#063f76',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 16,
              }}>
                {uc.icon}
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#09090B', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
                {uc.title}
              </h3>
              <p style={{ fontSize: 13.5, color: '#52525B', lineHeight: 1.65, margin: 0 }}>
                {uc.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ─── FAQ ─── */}
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '72px 24px 0' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <h2 style={{
            fontSize: 'clamp(22px, 2.8vw, 30px)', fontWeight: 800,
            letterSpacing: '-0.04em', color: '#021e3a', margin: '0 0 10px',
          }}>Common questions</h2>
          <p style={{ color: '#71717A', fontSize: 14, margin: 0 }}>
            Something else?{' '}
            <a href={ENTERPRISE_MAILTO} style={{ color: '#063f76', fontWeight: 600, textDecoration: 'none' }}>Email us</a>
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {FAQ.map((item, i) => (
            <div key={i} style={{
              background: '#fff',
              border: `1px solid ${openFaq === i ? '#a8cbe8' : '#e2eaf2'}`,
              borderRadius: 12,
              overflow: 'hidden',
              transition: 'border-color 0.15s',
              boxShadow: openFaq === i ? '0 2px 12px rgba(6,63,118,0.06)' : 'none',
            }}>
              <button
                className="faq-btn"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '18px 20px', background: 'none', border: 'none', cursor: 'pointer',
                  textAlign: 'left', gap: 16, transition: 'background 0.15s',
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 600, color: '#09090B', lineHeight: 1.4 }}>{item.q}</span>
                <div style={{
                  flexShrink: 0, width: 24, height: 24, borderRadius: '50%',
                  background: openFaq === i ? '#063f76' : '#F4F4F5',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.15s, transform 0.2s',
                  transform: openFaq === i ? 'rotate(45deg)' : 'none',
                }}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M5 1v8M1 5h8" stroke={openFaq === i ? '#fff' : '#71717A'} strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                </div>
              </button>
              {openFaq === i && (
                <div style={{ padding: '0 20px 18px' }}>
                  <p style={{ color: '#52525B', fontSize: 13.5, lineHeight: 1.7, margin: 0 }}>{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ─── Enterprise CTA strip ─── */}
      <div style={{ maxWidth: 1040, margin: '64px auto 0', padding: '0 24px 80px' }}>
        <div style={{
          background: 'linear-gradient(135deg, #021e3a 0%, #042a52 60%, #063f76 100%)',
          borderRadius: 20,
          padding: '48px 40px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 32, flexWrap: 'wrap',
          boxShadow: '0 12px 40px rgba(2,15,30,0.22)',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(99,179,237,0.4), transparent)',
          }} />
          <div>
            <h3 style={{
              fontSize: 'clamp(20px, 2.5vw, 26px)', fontWeight: 800,
              color: '#fff', margin: '0 0 8px', letterSpacing: '-0.03em',
            }}>
              Ready to bring ResearchOrg to your team?
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, margin: 0, lineHeight: 1.6 }}>
              We'll put together a custom proposal within one business day.
            </p>
          </div>
          <a href={ENTERPRISE_MAILTO} style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '13px 28px', borderRadius: 10,
            background: '#fff', color: '#021e3a',
            fontSize: 14, fontWeight: 700, textDecoration: 'none',
            letterSpacing: '-0.01em', flexShrink: 0,
            transition: 'opacity 0.15s, transform 0.1s',
            boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.92'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)' }}
          >
            Contact Sales
            <ArrowRight size={15} strokeWidth={2.5} />
          </a>
        </div>
      </div>
    </div>
  )
}
