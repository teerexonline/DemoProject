'use client'

import { useState } from 'react'
import Image from 'next/image'

const COMPANY_LOGOS: Record<string, string> = {
  Google:  'https://logo.clearbit.com/google.com',
  Stripe:  'https://logo.clearbit.com/stripe.com',
  Notion:  'https://notion.so/front-static/logo-ios.png',
  Airbnb:  'https://logo.clearbit.com/airbnb.com',
  Linear:  'https://linear.app/static/favicon.svg',
}

function CompanyBadge({ company, color }: { company: string; color: string }) {
  const [failed, setFailed] = useState(false)
  // Extract company name for logo lookup (strip "Joined " prefix)
  const coName = company.replace(/^Joined /, '')
  const logoUrl = COMPANY_LOGOS[coName]

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
      {logoUrl && !failed ? (
        <div style={{ width: 16, height: 16, borderRadius: 4, background: '#fff', border: '1px solid #E4E4E7', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Image src={logoUrl} alt={coName} width={16} height={16} style={{ objectFit: 'contain', width: '100%', height: '100%' }} unoptimized onError={() => setFailed(true)} />
        </div>
      ) : logoUrl ? (
        <div style={{ width: 16, height: 16, borderRadius: 4, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ color: '#fff', fontSize: 8, fontWeight: 800 }}>{coName[0]}</span>
        </div>
      ) : null}
      <span style={{ color: '#063f76', fontWeight: 500 }}>{company}</span>
    </div>
  )
}

const testimonials = [
  {
    quote: "I used ResearchOrg before my Google L5 interview and already knew the exact teams, their tools, and how the org was structured. The interviewer was visibly impressed.",
    name: "Priya Sharma",
    role: "Software Engineer",
    company: "Joined Google",
    initials: "PS",
    color: "#4285F4",
  },
  {
    quote: "I researched three competing fintechs side by side. Showed up knowing their product strategy cold. Got the offer at Stripe.",
    name: "Marcus Webb",
    role: "Product Manager",
    company: "Joined Stripe",
    initials: "MW",
    color: "#635BFF",
  },
  {
    quote: "The internal tools breakdown is something I haven't seen anywhere else. Knowing they ran on Notion + Linear before my interview made a massive difference.",
    name: "Aisha Okafor",
    role: "Operations Lead",
    company: "Joined Notion",
    initials: "AO",
    color: "#000",
  },
  {
    quote: "As a career changer, I had no network. ResearchOrg gave me the company intelligence I needed to compete with people who'd been in the industry for years.",
    name: "James Liu",
    role: "Data Analyst",
    company: "Joined Airbnb",
    initials: "JL",
    color: "#FF5A5F",
  },
  {
    quote: "I send every student I mentor to ResearchOrg. It's the one tool that actually levels the playing field for people without insider access.",
    name: "Dr. Sarah Okonkwo",
    role: "Career Coach",
    company: "500+ students placed",
    initials: "SO",
    color: "#063f76",
  },
  {
    quote: "The org chart data helped me identify who the real decision-makers were before my series of interviews. I asked the right questions to the right people.",
    name: "Tomás Rivera",
    role: "UX Designer",
    company: "Joined Linear",
    initials: "TR",
    color: "#5E6AD2",
  },
]

export default function Testimonials() {
  return (
    <section style={{ padding: '96px 24px', background: '#fff', borderTop: '1px solid #F4F4F5' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <p style={{
            color: '#063f76', fontSize: '12px', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px',
          }}>CUSTOMER STORIES</p>
          <h2 style={{
            fontSize: 'clamp(26px, 3.5vw, 40px)', fontWeight: 800,
            letterSpacing: '-0.04em', color: '#09090B',
            margin: '0 0 14px', lineHeight: 1.15,
          }}>
            Job seekers who walked in prepared.
          </h2>
          <p style={{ color: '#71717A', fontSize: '16px', margin: 0 }}>
            Real stories from candidates who used ResearchOrg to get the edge.
          </p>
        </div>

        <div className="grid-3col" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '16px',
        }}>
          {testimonials.map((t) => (
            <div
              key={t.name}
              style={{
                padding: '28px',
                borderRadius: '14px',
                background: '#FAFAFA',
                border: '1px solid #F0F0F2',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                transition: 'box-shadow 0.2s, border-color 0.2s, transform 0.15s',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement
                el.style.boxShadow = '0 4px 20px rgba(0,0,0,0.07)'
                el.style.borderColor = '#E4E4E7'
                el.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement
                el.style.boxShadow = 'none'
                el.style.borderColor = '#F0F0F2'
                el.style.transform = 'translateY(0)'
              }}
            >
              {/* Stars */}
              <div style={{ display: 'flex', gap: '3px' }}>
                {[...Array(5)].map((_, i) => (
                  <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill="#F59E0B">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                ))}
              </div>

              <p style={{
                color: '#374151',
                fontSize: '14px',
                lineHeight: 1.7,
                margin: 0,
                flex: 1,
              }}>
                &ldquo;{t.quote}&rdquo;
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  background: t.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: '12px', fontWeight: 700,
                  flexShrink: 0,
                  opacity: 0.9,
                }}>
                  {t.initials}
                </div>
                <div>
                  <div style={{ color: '#09090B', fontSize: '13.5px', fontWeight: 700 }}>{t.name}</div>
                  <div style={{ color: '#71717A', fontSize: '12px', marginTop: '1px', display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                    {t.role} · <CompanyBadge company={t.company} color={t.color} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
