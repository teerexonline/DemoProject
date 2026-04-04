'use client'

import Link from 'next/link'

export default function Pricing() {
  const tiers = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      desc: 'For students and casual job seekers.',
      cta: 'Get Started',
      href: '/signup',
      features: ['1 company full access per month', 'Limited preview for all others', 'Basic company profiles', 'Public org structure', 'Email support'],
      highlight: false,
    },
    {
      name: 'Pro',
      price: '$29',
      period: 'per month',
      desc: 'For serious job seekers and career changers.',
      cta: 'Start Free Trial',
      href: '/signup',
      features: ['Unlimited searches', 'Full view on all companies', 'Deep org charts & headcount', 'Internal tools & tech stack', 'Revenue & funding data', 'Competitor comparisons', 'Export to PDF'],
      highlight: true,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: 'contact us',
      desc: 'For recruiting teams and career services.',
      cta: 'Contact Sales',
      href: '/contact',
      features: ['Everything in Pro', 'SSO & team management', 'API access', 'Bulk exports', 'Dedicated account manager', 'SLA & uptime guarantee'],
      highlight: false,
    },
  ]

  return (
    <section id="pricing" style={{ padding: '96px 24px', background: '#fff', borderTop: '1px solid #F4F4F5' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <p style={{ color: '#7C3AED', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>PRICING</p>
          <h2 style={{
            fontSize: 'clamp(26px, 3.5vw, 40px)',
            fontWeight: 800,
            letterSpacing: '-0.04em',
            color: '#09090B',
            margin: '0 0 14px',
          }}>Simple, transparent pricing.</h2>
          <p style={{ color: '#71717A', fontSize: '16px', margin: 0 }}>Start free. Upgrade when you need more depth.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', alignItems: 'start' }}>
          {tiers.map((tier) => (
            <div
              key={tier.name}
              style={{
                padding: '32px',
                borderRadius: '16px',
                background: tier.highlight ? '#7C3AED' : '#fff',
                border: tier.highlight ? '1px solid #7C3AED' : '1px solid #E4E4E7',
                position: 'relative',
                boxShadow: tier.highlight ? '0 8px 30px rgba(124,58,237,0.25)' : '0 1px 4px rgba(0,0,0,0.04)',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement
                el.style.transform = 'translateY(-4px)'
                el.style.boxShadow = tier.highlight ? '0 16px 40px rgba(124,58,237,0.3)' : '0 8px 24px rgba(0,0,0,0.08)'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement
                el.style.transform = 'translateY(0)'
                el.style.boxShadow = tier.highlight ? '0 8px 30px rgba(124,58,237,0.25)' : '0 1px 4px rgba(0,0,0,0.04)'
              }}
            >
              {tier.highlight && (
                <div style={{
                  position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)',
                  background: '#fff', color: '#7C3AED',
                  fontSize: '10.5px', fontWeight: 700, padding: '3px 14px',
                  borderRadius: '100px', letterSpacing: '0.06em', textTransform: 'uppercase',
                  whiteSpace: 'nowrap', border: '1px solid #DDD6FE',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                }}>Most Popular</div>
              )}

              <div style={{ marginBottom: '24px' }}>
                <h3 style={{
                  fontSize: '14px', fontWeight: 700,
                  color: tier.highlight ? 'rgba(255,255,255,0.75)' : '#71717A',
                  margin: '0 0 8px', letterSpacing: '-0.01em',
                }}>{tier.name}</h3>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '8px' }}>
                  <span style={{
                    fontSize: '38px', fontWeight: 800,
                    color: tier.highlight ? '#fff' : '#09090B',
                    letterSpacing: '-0.04em', lineHeight: 1,
                  }}>{tier.price}</span>
                  <span style={{ color: tier.highlight ? 'rgba(255,255,255,0.55)' : '#A1A1AA', fontSize: '13px' }}>/{tier.period}</span>
                </div>
                <p style={{ color: tier.highlight ? 'rgba(255,255,255,0.65)' : '#71717A', fontSize: '13px', margin: 0, lineHeight: 1.5 }}>{tier.desc}</p>
              </div>

              <Link
                href={tier.href}
                style={{
                  display: 'block', textAlign: 'center', textDecoration: 'none',
                  color: tier.highlight ? '#7C3AED' : '#fff',
                  fontSize: '14px', fontWeight: 600, padding: '11px',
                  borderRadius: '9px',
                  background: tier.highlight ? '#fff' : '#09090B',
                  border: 'none',
                  marginBottom: '28px',
                  transition: 'opacity 0.15s, transform 0.1s',
                  letterSpacing: '-0.01em',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement
                  el.style.opacity = '0.88'
                  el.style.transform = 'translateY(-1px)'
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement
                  el.style.opacity = '1'
                  el.style.transform = 'translateY(0)'
                }}
              >{tier.cta}</Link>

              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {tier.features.map((feat) => (
                  <li key={feat} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <span style={{ color: tier.highlight ? 'rgba(255,255,255,0.6)' : '#7C3AED', fontSize: '14px', lineHeight: 1.4, flexShrink: 0 }}>✓</span>
                    <span style={{ color: tier.highlight ? 'rgba(255,255,255,0.8)' : '#52525B', fontSize: '13.5px', lineHeight: 1.5 }}>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
