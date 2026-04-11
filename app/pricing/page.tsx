'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Check, Minus, HelpCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getPaddleInstance } from '@paddle/paddle-js'

type BillingPeriod = 'monthly' | 'yearly'

const PRO_PRICING: Record<BillingPeriod, { price: string; period: string; savings: string | null }> = {
  monthly: { price: '$4.99',  period: 'per month', savings: null },
  yearly:  { price: '$49.99', period: 'per year',  savings: 'Save 17%' },
}

const TOGGLE_OPTIONS: { key: BillingPeriod; label: string; badge?: string }[] = [
  { key: 'monthly', label: 'Monthly' },
  { key: 'yearly',  label: 'Yearly',  badge: '17% off' },
]

const COMPARISON: { category: string; rows: { label: string; free: string | boolean; pro: string | boolean; enterprise: string | boolean }[] }[] = [
  {
    category: 'Access',
    rows: [
      { label: 'Company search',              free: true,            pro: true,              enterprise: true },
      { label: 'Company overview',            free: true,            pro: true,              enterprise: true },
      { label: 'Full company profiles',       free: '1 per month',   pro: 'Unlimited',       enterprise: 'Unlimited' },
      { label: 'Org chart & headcount',       free: false,           pro: true,              enterprise: true },
      { label: 'Internal tools & processes', free: false,           pro: true,              enterprise: true },
      { label: 'Revenue & funding data',      free: false,           pro: true,              enterprise: true },
      { label: 'Interview prep content',      free: false,           pro: true,              enterprise: true },
      { label: 'Product use cases',           free: false,           pro: true,              enterprise: true },
    ],
  },
  {
    category: 'Features',
    rows: [
      { label: 'Save companies',              free: true,            pro: true,              enterprise: true },
      { label: 'Export to PDF',               free: false,           pro: true,              enterprise: true },
      { label: 'API access',                  free: false,           pro: false,             enterprise: true },
      { label: 'Bulk exports',                free: false,           pro: false,             enterprise: true },
    ],
  },
  {
    category: 'Support',
    rows: [
      { label: 'Email support',               free: true,            pro: true,              enterprise: true },
      { label: 'Priority support',            free: false,           pro: true,              enterprise: true },
      { label: 'Dedicated account manager',   free: false,           pro: false,             enterprise: true },
      { label: 'SSO & team management',       free: false,           pro: false,             enterprise: true },
      { label: 'SLA & uptime guarantee',      free: false,           pro: false,             enterprise: true },
    ],
  },
]

const FAQ = [
  {
    q: 'What does the free plan include?',
    a: 'The free plan gives you 1 full company profile view per month — including all sections like org chart, financials, and interview prep. All other companies show a limited overview only.',
  },
  {
    q: 'Can I cancel my Pro subscription at any time?',
    a: 'Yes. You can cancel anytime from your account settings. You keep Pro access until the end of your current billing period.',
  },
  {
    q: 'Is there a free trial?',
    a: 'There is no free trial, but the free plan lets you explore the platform at no cost. You get 1 full company unlock per month, forever.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept all major credit and debit cards. Payments are processed securely by Paddle.',
  },
  {
    q: 'What is the Enterprise plan?',
    a: 'Enterprise is designed for recruiting teams, career services, and universities who need multi-seat access, API integration, bulk exports, and a dedicated account manager. Contact us for a custom quote.',
  },
]

function CellValue({ value, highlight }: { value: string | boolean; highlight?: boolean }) {
  if (value === true) return <Check size={17} color={highlight ? '#fff' : '#063f76'} strokeWidth={2.5} />
  if (value === false) return <Minus size={15} color={highlight ? 'rgba(255,255,255,0.25)' : '#D4D4D8'} strokeWidth={2} />
  return (
    <span style={{
      fontSize: '12px', fontWeight: 600,
      color: highlight ? 'rgba(255,255,255,0.85)' : '#063f76',
      background: highlight ? 'rgba(255,255,255,0.12)' : '#eef4fb',
      padding: '2px 8px', borderRadius: '5px', whiteSpace: 'nowrap',
    }}>{value}</span>
  )
}

const ENTERPRISE_MAILTO = 'mailto:sales@researchorg.com?subject=ResearchOrg%20Enterprise%20Plan&body=Hi%2C%20I%27m%20interested%20in%20the%20Enterprise%20plan%20for%20my%20team.'

function ctaStyle(variant: 'primary' | 'secondary' | 'ghost' | 'disabled' | 'danger', highlight: boolean): React.CSSProperties {
  if (variant === 'disabled') return {
    display: 'block', textAlign: 'center', textDecoration: 'none',
    fontSize: '14px', fontWeight: 600, padding: '11px', borderRadius: '9px', marginBottom: '28px',
    background: highlight ? 'rgba(255,255,255,0.12)' : '#F4F4F5',
    color: highlight ? 'rgba(255,255,255,0.35)' : '#A1A1AA',
    border: 'none', cursor: 'default', letterSpacing: '-0.01em',
  }
  if (variant === 'danger') return {
    display: 'block', textAlign: 'center', textDecoration: 'none',
    fontSize: '14px', fontWeight: 600, padding: '11px', borderRadius: '9px', marginBottom: '28px',
    background: 'transparent', color: '#71717A',
    border: '1.5px solid #D4D4D8', cursor: 'pointer', letterSpacing: '-0.01em',
  }
  if (variant === 'ghost') return {
    display: 'block', textAlign: 'center', textDecoration: 'none',
    fontSize: '14px', fontWeight: 600, padding: '11px', borderRadius: '9px', marginBottom: '28px',
    background: 'transparent', color: '#09090B',
    border: '1.5px solid #D4D4D8', cursor: 'pointer', letterSpacing: '-0.01em',
  }
  if (variant === 'secondary') return {
    display: 'block', textAlign: 'center', textDecoration: 'none',
    fontSize: '14px', fontWeight: 600, padding: '11px', borderRadius: '9px', marginBottom: '28px',
    background: '#063f76', color: '#fff', border: 'none', cursor: 'pointer',
    letterSpacing: '-0.01em', boxShadow: '0 4px 12px rgba(6,63,118,0.25)',
  }
  // primary
  return {
    display: 'block', textAlign: 'center', textDecoration: 'none',
    fontSize: '14px', fontWeight: 600, padding: '11px', borderRadius: '9px', marginBottom: '28px',
    background: highlight ? '#fff' : '#063f76',
    color: highlight ? '#063f76' : '#fff',
    border: 'none', cursor: 'pointer', letterSpacing: '-0.01em',
    boxShadow: highlight ? '0 4px 12px rgba(255,255,255,0.25)' : '0 4px 12px rgba(6,63,118,0.25)',
  }
}

export default function PricingPage() {
  const [billing, setBilling] = useState<BillingPeriod>('monthly')
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [userPlan, setUserPlan] = useState<string>('') // '' = loading
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setUserPlan('anonymous'); return }
      setUserEmail(user.email ?? null)
      const { data: profile } = await supabase.from('profiles').select('plan').eq('id', user.id).single()
      setUserPlan(profile?.plan ?? 'Free')
    })
  }, [])

  const isPro = ['Pro', 'Admin', 'SuperAdmin'].includes(userPlan)
  const isFree = userPlan === 'Free'
  const isAnonymous = userPlan === 'anonymous'

  function openCheckout(priceId: string) {
    const paddle = getPaddleInstance()
    if (!paddle || !userEmail) return
    paddle.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      customer: { email: userEmail },
      settings: { displayMode: 'overlay', theme: 'light', locale: 'en' },
    })
  }

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
      href: '/signup?plan=pro',
      features: ['Unlimited searches', 'Full view on all companies', 'Deep org charts & headcount', 'Internal tools & processes', 'Revenue & funding data', 'Interview prep content', 'Export to PDF'],
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

  return (
    <div style={{ background: '#FAFAFA', minHeight: '100vh' }}>

      {/* Hero */}
      <div style={{
        background: '#fff',
        borderBottom: '1px solid #e2eaf2',
        padding: '64px 24px 56px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Subtle grid pattern */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.025,
          backgroundImage: 'linear-gradient(#063f76 1px, transparent 1px), linear-gradient(90deg, #063f76 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          pointerEvents: 'none',
        }} />
        {/* Radial fade overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(255,255,255,0) 0%, #fff 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '600px', margin: '0 auto' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: '#eef4fb', border: '1px solid #a8cbe8',
            borderRadius: '100px', padding: '4px 14px',
            marginBottom: '20px',
          }}>
            <span style={{ color: '#063f76', fontSize: '11.5px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Pricing</span>
          </div>

          <h1 style={{
            fontSize: 'clamp(30px, 4.5vw, 48px)',
            fontWeight: 800,
            letterSpacing: '-0.04em',
            color: '#063f76',
            margin: '0 0 16px',
            lineHeight: 1.1,
          }}>
            Simple pricing.<br />No surprises.
          </h1>
          <p style={{ color: '#71717A', fontSize: '16px', lineHeight: 1.6, margin: '0 0 36px', maxWidth: '420px', marginLeft: 'auto', marginRight: 'auto' }}>
            Start free and upgrade when you need unlimited depth.
          </p>

          {/* Billing toggle */}
          <div className="pricing-hero-toggle" style={{ display: 'inline-flex', alignItems: 'center', background: '#F4F4F5', borderRadius: '10px', padding: '4px', gap: '2px' }}>
            {TOGGLE_OPTIONS.map(({ key, label, badge }) => (
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
                  transition: 'background 0.15s, color 0.15s, box-shadow 0.15s',
                  background: billing === key ? '#fff' : 'transparent',
                  color: billing === key ? '#063f76' : '#71717A',
                  boxShadow: billing === key ? '0 1px 4px rgba(6,63,118,0.12)' : 'none',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                {label}
                {badge && (
                  <span style={{
                    fontSize: '10px', fontWeight: 700,
                    color: billing === key ? '#fff' : '#71717A',
                    background: billing === key ? '#063f76' : 'transparent',
                    padding: billing === key ? '1px 6px' : '0',
                    borderRadius: '4px',
                    transition: 'all 0.15s',
                  }}>{badge}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing cards */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '48px 24px 0' }}>
        <div className="pricing-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', alignItems: 'start' }}>
          {tiers.map((tier) => (
            <div
              key={tier.name}
              style={{
                padding: '32px',
                borderRadius: '18px',
                background: tier.highlight ? '#063f76' : '#fff',
                border: tier.highlight ? '1px solid #063f76' : '1px solid #e2eaf2',
                position: 'relative',
                boxShadow: tier.highlight
                  ? '0 12px 40px rgba(6,63,118,0.28), 0 2px 8px rgba(6,63,118,0.12)'
                  : '0 1px 4px rgba(0,0,0,0.04)',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement
                el.style.transform = 'translateY(-4px)'
                el.style.boxShadow = tier.highlight
                  ? '0 20px 52px rgba(6,63,118,0.34), 0 4px 12px rgba(6,63,118,0.16)'
                  : '0 8px 28px rgba(6,63,118,0.10)'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement
                el.style.transform = 'translateY(0)'
                el.style.boxShadow = tier.highlight
                  ? '0 12px 40px rgba(6,63,118,0.28), 0 2px 8px rgba(6,63,118,0.12)'
                  : '0 1px 4px rgba(0,0,0,0.04)'
              }}
            >
              {tier.highlight && (
                <div style={{
                  position: 'absolute', top: '-13px', left: '50%', transform: 'translateX(-50%)',
                  background: '#fff', color: '#063f76',
                  fontSize: '10.5px', fontWeight: 700, padding: '3px 14px',
                  borderRadius: '100px', letterSpacing: '0.06em', textTransform: 'uppercase',
                  whiteSpace: 'nowrap', border: '1px solid #a8cbe8',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                }}>Most Popular</div>
              )}

              <div style={{ marginBottom: '24px' }}>
                <h3 style={{
                  fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em',
                  color: tier.highlight ? 'rgba(255,255,255,0.6)' : '#A1A1AA',
                  margin: '0 0 10px',
                }}>{tier.name}</h3>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: tier.savings ? '6px' : '8px' }}>
                  <span style={{
                    fontSize: '40px', fontWeight: 800, letterSpacing: '-0.05em', lineHeight: 1,
                    color: tier.highlight ? '#fff' : '#09090B',
                  }}>{tier.price}</span>
                  <span style={{ color: tier.highlight ? 'rgba(255,255,255,0.45)' : '#A1A1AA', fontSize: '13px' }}>
                    /{tier.period}
                  </span>
                </div>

                {tier.savings && (
                  <div style={{ marginBottom: '10px' }}>
                    <span style={{
                      display: 'inline-block',
                      background: 'rgba(96,157,214,0.22)',
                      color: '#fff',
                      fontSize: '11px', fontWeight: 700,
                      padding: '2px 10px', borderRadius: '100px',
                    }}>{tier.savings} vs monthly</span>
                  </div>
                )}

                <p style={{ color: tier.highlight ? 'rgba(255,255,255,0.6)' : '#71717A', fontSize: '13px', margin: 0, lineHeight: 1.5 }}>{tier.desc}</p>
              </div>

              {/* CTA Button */}
              {tier.name === 'Enterprise' ? (
                <a href={tier.href} style={ctaStyle('ghost', false)}>Contact Sales</a>
              ) : tier.name === 'Free' ? (
                isPro ? (
                  <Link href="/settings" style={ctaStyle('danger', false)}>Downgrade</Link>
                ) : isFree ? (
                  <span style={ctaStyle('disabled', false)}>Current Plan</span>
                ) : (
                  <Link href="/signup" style={ctaStyle('primary', false)}>Get Started</Link>
                )
              ) : tier.name === 'Pro' ? (
                isPro ? (
                  <span style={ctaStyle('disabled', true)}>Current Plan</span>
                ) : isFree ? (
                  <button
                    onClick={() => openCheckout(billing === 'monthly' ? process.env.NEXT_PUBLIC_PADDLE_PRICE_MONTHLY! : process.env.NEXT_PUBLIC_PADDLE_PRICE_YEARLY!)}
                    style={ctaStyle('primary', true)}
                  >Upgrade to Pro</button>
                ) : (
                  <Link href="/signup?plan=pro" style={ctaStyle('primary', true)}>Get Started</Link>
                )
              ) : null}

              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '11px' }}>
                {tier.features.map((feat) => (
                  <li key={feat} style={{ display: 'flex', alignItems: 'flex-start', gap: '9px' }}>
                    <Check size={14} color={tier.highlight ? 'rgba(255,255,255,0.6)' : '#609dd6'} strokeWidth={2.5} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span style={{ color: tier.highlight ? 'rgba(255,255,255,0.8)' : '#52525B', fontSize: '13px', lineHeight: 1.5 }}>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Comparison table */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '72px 24px 0' }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <h2 style={{ fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 800, letterSpacing: '-0.04em', color: '#09090B', margin: '0 0 10px' }}>
            Compare plans
          </h2>
          <p style={{ color: '#71717A', fontSize: '14px', margin: 0 }}>Everything side by side.</p>
        </div>

        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'], borderRadius: '16px', border: '1px solid #e2eaf2', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div style={{ background: '#fff', borderRadius: '16px', overflow: 'hidden', minWidth: '560px' }}>
          {/* Table header */}
          <div className="compare-header" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', borderBottom: '1px solid #e2eaf2' }}>
            <div style={{ padding: '20px 24px' }} />
            {['Free', 'Pro', 'Enterprise'].map((name, i) => (
              <div key={name} style={{
                padding: '20px 16px', textAlign: 'center',
                background: name === 'Pro' ? '#063f76' : 'transparent',
                borderLeft: '1px solid #e2eaf2',
              }}>
                <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: name === 'Pro' ? 'rgba(255,255,255,0.6)' : '#A1A1AA', marginBottom: '4px' }}>{name}</div>
                <div style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.03em', color: name === 'Pro' ? '#fff' : '#09090B' }}>
                  {name === 'Free' ? '$0' : name === 'Pro' ? PRO_PRICING[billing].price : 'Custom'}
                </div>
                {name === 'Pro' && PRO_PRICING[billing].savings && (
                  <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.55)', marginTop: '2px' }}>{PRO_PRICING[billing].savings}</div>
                )}
                {name === 'Enterprise' ? (
                  <a href={ENTERPRISE_MAILTO} style={{ display: 'inline-block', marginTop: '10px', padding: '6px 16px', borderRadius: '7px', fontSize: '11.5px', fontWeight: 600, textDecoration: 'none', background: 'transparent', color: '#52525B', border: '1px solid #D4D4D8' }}>Contact Sales</a>
                ) : name === 'Free' ? (
                  isPro ? (
                    <Link href="/settings" style={{ display: 'inline-block', marginTop: '10px', padding: '6px 16px', borderRadius: '7px', fontSize: '11.5px', fontWeight: 600, textDecoration: 'none', background: 'transparent', color: '#71717A', border: '1px solid #D4D4D8' }}>Downgrade</Link>
                  ) : isFree ? (
                    <span style={{ display: 'inline-block', marginTop: '10px', padding: '6px 16px', borderRadius: '7px', fontSize: '11.5px', fontWeight: 600, background: '#F4F4F5', color: '#A1A1AA' }}>Current Plan</span>
                  ) : (
                    <Link href="/signup" style={{ display: 'inline-block', marginTop: '10px', padding: '6px 16px', borderRadius: '7px', fontSize: '11.5px', fontWeight: 600, textDecoration: 'none', background: '#063f76', color: '#fff' }}>Get Started</Link>
                  )
                ) : name === 'Pro' ? (
                  isPro ? (
                    <span style={{ display: 'inline-block', marginTop: '10px', padding: '6px 16px', borderRadius: '7px', fontSize: '11.5px', fontWeight: 600, background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.4)' }}>Current Plan</span>
                  ) : isFree ? (
                    <button onClick={() => openCheckout(billing === 'monthly' ? process.env.NEXT_PUBLIC_PADDLE_PRICE_MONTHLY! : process.env.NEXT_PUBLIC_PADDLE_PRICE_YEARLY!)} style={{ display: 'inline-block', marginTop: '10px', padding: '6px 16px', borderRadius: '7px', fontSize: '11.5px', fontWeight: 600, background: '#fff', color: '#063f76', border: 'none', cursor: 'pointer' }}>Upgrade to Pro</button>
                  ) : (
                    <Link href="/signup?plan=pro" style={{ display: 'inline-block', marginTop: '10px', padding: '6px 16px', borderRadius: '7px', fontSize: '11.5px', fontWeight: 600, textDecoration: 'none', background: '#fff', color: '#063f76' }}>Get Started</Link>
                  )
                ) : null}
              </div>
            ))}
          </div>

          {/* Table rows */}
          {COMPARISON.map((section, si) => (
            <div key={section.category}>
              <div style={{
                padding: '10px 24px', background: '#F7F9FC',
                borderTop: si === 0 ? 'none' : '1px solid #e2eaf2',
                borderBottom: '1px solid #e2eaf2',
              }}>
                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#A1A1AA' }}>{section.category}</span>
              </div>
              {section.rows.map((row, ri) => (
                <div
                  key={row.label}
                  className="compare-row"
                  style={{
                    display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
                    borderBottom: ri < section.rows.length - 1 ? '1px solid #F4F4F5' : 'none',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#FAFAFA'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  <div style={{ padding: '14px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', color: '#52525B' }}>{row.label}</span>
                  </div>
                  {(['free', 'pro', 'enterprise'] as const).map((tier) => (
                    <div key={tier} style={{
                      padding: '14px 16px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: tier === 'pro' ? 'rgba(6,63,118,0.04)' : 'transparent',
                      borderLeft: '1px solid #e2eaf2',
                    }}>
                      <CellValue value={row[tier]} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
        </div>
      </div>

      {/* FAQ */}
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '72px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h2 style={{ fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 800, letterSpacing: '-0.04em', color: '#09090B', margin: '0 0 10px' }}>
            Frequently asked questions
          </h2>
          <p style={{ color: '#71717A', fontSize: '14px', margin: 0 }}>
            Still have questions?{' '}
            <Link href="/contact" style={{ color: '#063f76', fontWeight: 600, textDecoration: 'none' }}>Contact us</Link>
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {FAQ.map((item, i) => (
            <div
              key={i}
              style={{
                background: '#fff',
                border: `1px solid ${openFaq === i ? '#a8cbe8' : '#e2eaf2'}`,
                borderRadius: '12px',
                overflow: 'hidden',
                transition: 'border-color 0.15s',
                boxShadow: openFaq === i ? '0 2px 12px rgba(6,63,118,0.06)' : 'none',
              }}
            >
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '18px 20px', background: 'none', border: 'none', cursor: 'pointer',
                  textAlign: 'left', gap: '16px',
                }}
              >
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#09090B', lineHeight: 1.4 }}>{item.q}</span>
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
                  <p style={{ color: '#52525B', fontSize: '13.5px', lineHeight: 1.7, margin: 0 }}>{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Mobile responsive styles */}
      <style>{`
        @media (max-width: 900px) {
          .pricing-cards-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 600px) {
          .pricing-cards-grid { grid-template-columns: 1fr !important; }
          .pricing-hero-toggle { flex-wrap: wrap; justify-content: center; }
        }
      `}</style>
    </div>
  )
}
