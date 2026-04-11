'use client'

import { useState } from 'react'
import Link from 'next/link'

type BillingPeriod = 'monthly' | 'yearly'

const PRO_PRICING: Record<BillingPeriod, { price: string; period: string; savings: string | null }> = {
  monthly: { price: '$7.99',  period: 'per month', savings: null },
  yearly:  { price: '$79.99', period: 'per year',  savings: 'Save 17%' },
}

export default function Pricing() {
  const [billing, setBilling] = useState<BillingPeriod>('monthly')

  const tiers = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      savings: null,
      desc: 'For students and casual job seekers.',
      cta: 'Get Started',
      href: '/signup',
      features: ['1 company full access per month', 'Limited preview for all others', 'Basic company profiles', 'Email support'],
      highlight: false,
    },
    {
      name: 'Pro',
      price: PRO_PRICING[billing].price,
      period: PRO_PRICING[billing].period,
      savings: PRO_PRICING[billing].savings,
      desc: 'For serious job seekers and career changers.',
      cta: 'Get Started',
      href: '/signup',
      features: ['Unlimited searches', 'Full view on all companies', 'Deep org charts & headcount', 'Internal tools & tech stack', 'Revenue & funding data', 'Competitor comparisons', 'Export to PDF'],
      highlight: true,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: 'contact us',
      savings: null,
      desc: 'For recruiting teams and career services.',
      cta: 'Contact Sales',
      href: 'mailto:sales@researchorg.com?subject=ResearchOrg%20Enterprise%20Plan&body=Hi%2C%20I%27m%20interested%20in%20the%20Enterprise%20plan%20for%20my%20team.',
      features: ['Everything in Pro', 'SSO & team management', 'API access', 'Bulk exports', 'Dedicated account manager', 'SLA & uptime guarantee'],
      highlight: false,
    },
  ]

  const toggleOptions: { key: BillingPeriod; label: string }[] = [
    { key: 'monthly', label: 'Monthly' },
    { key: 'yearly',  label: 'Yearly' },
  ]

  return (
    <section id="pricing" style={{ padding: '96px 24px', background: '#fff', borderTop: '1px solid #e2eaf2' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <p style={{ color: '#609dd6', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>PRICING</p>
          <h2 style={{
            fontSize: 'clamp(26px, 3.5vw, 40px)',
            fontWeight: 800,
            letterSpacing: '-0.04em',
            color: '#063f76',
            margin: '0 0 14px',
          }}>Simple, transparent pricing.</h2>
          <p style={{ color: '#71717A', fontSize: '16px', margin: '0 0 32px' }}>Start free. Upgrade when you need more depth.</p>

          {/* Billing toggle */}
          <div style={{ display: 'inline-flex', alignItems: 'center', background: '#eef4fb', borderRadius: '10px', padding: '4px', gap: '2px' }}>
            {toggleOptions.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setBilling(key)}
                style={{
                  padding: '7px 18px',
                  borderRadius: '7px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                  letterSpacing: '-0.01em',
                  transition: 'background 0.15s, color 0.15s, box-shadow 0.15s',
                  background: billing === key ? '#fff' : 'transparent',
                  color: billing === key ? '#063f76' : '#71717A',
                  boxShadow: billing === key ? '0 1px 4px rgba(6,63,118,0.12)' : 'none',
                }}
              >
                {label}
                {key !== 'monthly' && (
                  <span style={{
                    marginLeft: '6px',
                    fontSize: '10px',
                    fontWeight: 700,
                    color: billing === key ? '#063f76' : '#A1A1AA',
                    background: billing === key ? '#eef4fb' : 'transparent',
                    padding: billing === key ? '1px 5px' : '0',
                    borderRadius: '4px',
                    transition: 'all 0.15s',
                  }}>
                    {key === 'yearly' ? '33% off' : '55% off'}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="grid-3col" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', alignItems: 'start' }}>
          {tiers.map((tier) => (
            <div
              key={tier.name}
              style={{
                padding: '32px',
                borderRadius: '16px',
                background: tier.highlight ? '#063f76' : '#fff',
                border: tier.highlight ? '1px solid #063f76' : '1px solid #e2eaf2',
                position: 'relative',
                boxShadow: tier.highlight ? '0 8px 30px rgba(6,63,118,0.25)' : '0 1px 4px rgba(0,0,0,0.04)',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement
                el.style.transform = 'translateY(-4px)'
                el.style.boxShadow = tier.highlight ? '0 16px 40px rgba(6,63,118,0.30)' : '0 8px 24px rgba(6,63,118,0.10)'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement
                el.style.transform = 'translateY(0)'
                el.style.boxShadow = tier.highlight ? '0 8px 30px rgba(6,63,118,0.25)' : '0 1px 4px rgba(0,0,0,0.04)'
              }}
            >
              {tier.highlight && (
                <div style={{
                  position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)',
                  background: '#fff', color: '#063f76',
                  fontSize: '10.5px', fontWeight: 700, padding: '3px 14px',
                  borderRadius: '100px', letterSpacing: '0.06em', textTransform: 'uppercase',
                  whiteSpace: 'nowrap', border: '1px solid #a8cbe8',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                }}>Most Popular</div>
              )}

              <div style={{ marginBottom: '24px' }}>
                <h3 style={{
                  fontSize: '14px', fontWeight: 700,
                  color: tier.highlight ? 'rgba(255,255,255,0.75)' : '#71717A',
                  margin: '0 0 8px', letterSpacing: '-0.01em',
                }}>{tier.name}</h3>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: tier.savings ? '6px' : '8px' }}>
                  <span style={{
                    fontSize: '38px', fontWeight: 800,
                    color: tier.highlight ? '#fff' : '#063f76',
                    letterSpacing: '-0.04em', lineHeight: 1,
                  }}>{tier.price}</span>
                  <span style={{ color: tier.highlight ? 'rgba(255,255,255,0.55)' : '#A1A1AA', fontSize: '13px' }}>/{tier.period}</span>
                </div>

                {tier.savings && (
                  <div style={{ marginBottom: '8px' }}>
                    <span style={{
                      display: 'inline-block',
                      background: 'rgba(96,157,214,0.25)',
                      color: '#fff',
                      fontSize: '11px', fontWeight: 700,
                      padding: '2px 10px', borderRadius: '100px',
                      letterSpacing: '0.02em',
                    }}>{tier.savings} vs monthly</span>
                  </div>
                )}

                <p style={{ color: tier.highlight ? 'rgba(255,255,255,0.65)' : '#71717A', fontSize: '13px', margin: 0, lineHeight: 1.5 }}>{tier.desc}</p>
              </div>

              <Link
                href={tier.href}
                style={{
                  display: 'block', textAlign: 'center', textDecoration: 'none',
                  color: tier.highlight ? '#063f76' : '#fff',
                  fontSize: '14px', fontWeight: 600, padding: '11px',
                  borderRadius: '9px',
                  background: tier.highlight ? '#fff' : '#063f76',
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
                    <span style={{ color: tier.highlight ? 'rgba(255,255,255,0.6)' : '#609dd6', fontSize: '14px', lineHeight: 1.4, flexShrink: 0 }}>✓</span>
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
