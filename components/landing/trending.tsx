'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

const companies = [
  { rank: 1,  name: 'OpenAI',     category: 'AI Research',         searches: '24.3k', delta: '+142%', color: '#000',    logo: 'https://logo.clearbit.com/openai.com',      hot: true  },
  { rank: 2,  name: 'Anthropic',  category: 'AI Safety',           searches: '18.7k', delta: '+98%',  color: '#c85f3e', logo: 'https://logo.clearbit.com/anthropic.com',   hot: true  },
  { rank: 3,  name: 'Stripe',     category: 'Fintech',             searches: '15.2k', delta: '+12%',  color: '#635BFF', logo: 'https://logo.clearbit.com/stripe.com',      hot: false },
  { rank: 4,  name: 'Figma',      category: 'Design Tools',        searches: '12.8k', delta: '+34%',  color: '#F24E1E', logo: 'https://logo.clearbit.com/figma.com',       hot: false },
  { rank: 5,  name: 'Notion',     category: 'Productivity',        searches: '11.4k', delta: '+8%',   color: '#000',    logo: 'https://logo.clearbit.com/notion.so',       hot: false },
  { rank: 6,  name: 'Linear',     category: 'Dev Tools',           searches: '9.6k',  delta: '+67%',  color: '#5E6AD2', logo: 'https://logo.clearbit.com/linear.app',      hot: true  },
  { rank: 7,  name: 'Vercel',     category: 'Infrastructure',      searches: '8.9k',  delta: '+22%',  color: '#000',    logo: 'https://logo.clearbit.com/vercel.com',      hot: false },
  { rank: 8,  name: 'Airbnb',     category: 'Travel & Hospitality',searches: '8.1k',  delta: '+5%',   color: '#FF5A5F', logo: 'https://logo.clearbit.com/airbnb.com',      hot: false },
  { rank: 9,  name: 'Databricks', category: 'Data & AI',           searches: '7.4k',  delta: '+55%',  color: '#FF3621', logo: 'https://logo.clearbit.com/databricks.com',  hot: true  },
  { rank: 10, name: 'Canva',      category: 'Design',              searches: '6.8k',  delta: '+19%',  color: '#00C4CC', logo: 'https://logo.clearbit.com/canva.com',       hot: false },
]

function CompanyAvatar({ name, logo, color }: { name: string; logo: string; color: string }) {
  const [failed, setFailed] = useState(false)
  if (!failed) {
    return (
      <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fff', border: '1px solid #F0F0F0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
        <Image src={logo} alt={name} width={32} height={32} style={{ objectFit: 'contain', width: '100%', height: '100%' }} unoptimized onError={() => setFailed(true)} />
      </div>
    )
  }
  return (
    <div style={{ width: 32, height: 32, borderRadius: 8, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: 0.85 }}>
      <span style={{ color: '#fff', fontSize: 12, fontWeight: 800 }}>{name.charAt(0)}</span>
    </div>
  )
}

export default function Trending() {
  const [hovered, setHovered] = useState<number | null>(null)

  return (
    <section style={{ padding: '96px 24px', background: '#FAFAFA', borderTop: '1px solid #F4F4F5' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div className="trending-grid" style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '80px',
          alignItems: 'start',
        }}>
          {/* Left: heading */}
          <div className="trending-sticky" style={{ position: 'sticky', top: '80px' }}>
            <p style={{
              color: '#7C3AED', fontSize: '12px', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px',
            }}>TRENDING THIS WEEK</p>
            <h2 style={{
              fontSize: 'clamp(26px, 3.5vw, 40px)', fontWeight: 800,
              letterSpacing: '-0.04em', color: '#09090B',
              margin: '0 0 16px', lineHeight: 1.15,
            }}>
              Most researched companies right now.
            </h2>
            <p style={{ color: '#71717A', fontSize: '15px', lineHeight: 1.7, margin: '0 0 28px', maxWidth: '380px' }}>
              See which companies job seekers are researching the most. Trending companies often signal where the hiring momentum is.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{
                padding: '16px 20px', borderRadius: '12px',
                background: '#fff', border: '1px solid #E4E4E7',
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              }}>
                <div style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.04em', color: '#09090B' }}>10k+</div>
                <div style={{ color: '#71717A', fontSize: '12px', marginTop: '2px' }}>companies tracked</div>
              </div>
              <div style={{
                padding: '16px 20px', borderRadius: '12px',
                background: '#fff', border: '1px solid #E4E4E7',
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              }}>
                <div style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.04em', color: '#09090B' }}>2.4M</div>
                <div style={{ color: '#71717A', fontSize: '12px', marginTop: '2px' }}>searches this week</div>
              </div>
            </div>

            <Link
              href="/signup"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                marginTop: '28px', color: '#7C3AED', fontSize: '14px',
                fontWeight: 600, textDecoration: 'none',
                transition: 'gap 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.gap = '10px'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.gap = '6px'}
            >
              View all trending companies →
            </Link>
          </div>

          {/* Right: company list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {companies.map((co) => (
              <div
                key={co.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  background: hovered === co.rank ? '#fff' : 'transparent',
                  border: hovered === co.rank ? '1px solid #E4E4E7' : '1px solid transparent',
                  boxShadow: hovered === co.rank ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                  cursor: 'pointer',
                  transition: 'background 0.15s, border-color 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={() => setHovered(co.rank)}
                onMouseLeave={() => setHovered(null)}
              >
                {/* Rank */}
                <span style={{
                  width: '24px',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: co.rank <= 3 ? '#7C3AED' : '#A1A1AA',
                  textAlign: 'right',
                  flexShrink: 0,
                }}>
                  {co.rank}
                </span>

                {/* Logo */}
                <CompanyAvatar name={co.name} logo={co.logo} color={co.color} />

                {/* Name + category */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: '#09090B', fontSize: '14px', fontWeight: 600 }}>{co.name}</span>
                    {co.hot && (
                      <span style={{
                        background: '#FFF7ED', color: '#EA580C',
                        fontSize: '10px', fontWeight: 700,
                        padding: '1px 6px', borderRadius: '4px',
                        border: '1px solid #FED7AA',
                      }}>🔥 Hot</span>
                    )}
                  </div>
                  <div style={{ color: '#A1A1AA', fontSize: '12px', marginTop: '1px' }}>{co.category}</div>
                </div>

                {/* Searches */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ color: '#52525B', fontSize: '13px', fontWeight: 600 }}>{co.searches}</div>
                  <div style={{
                    color: '#16A34A', fontSize: '11.5px', fontWeight: 600,
                    marginTop: '1px',
                  }}>{co.delta}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
