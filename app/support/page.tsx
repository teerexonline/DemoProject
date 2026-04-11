import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Support — ResearchOrg',
  description: 'Get help with your ResearchOrg account. Contact our support team.',
}

const FAQS = [
  {
    q: 'How do I upgrade to Pro?',
    a: 'Go to your account settings or the pricing page and click "Upgrade to Pro". You can pay monthly or yearly via credit card.',
  },
  {
    q: 'How do I cancel my subscription?',
    a: 'Go to Settings → Subscription Plan → Cancel subscription. You keep Pro access until the end of your billing period.',
  },
  {
    q: 'Can I get a refund?',
    a: 'Yes. We offer a full refund within 30 days of purchase. Email us at support@researchorg.com with your order details.',
  },
  {
    q: 'Why is a company missing data?',
    a: 'We continuously update our database. If a company is missing key information, email us and we\'ll prioritize it.',
  },
  {
    q: 'I forgot my password. What do I do?',
    a: 'Go to the login page and click "Forgot password?" — we\'ll send a reset link to your email.',
  },
  {
    q: 'Do you offer student or team discounts?',
    a: 'For team or institutional pricing, email sales@researchorg.com. We work with career services and universities.',
  },
]

export default function SupportPage() {
  return (
    <div style={{ background: '#FAFAFA', minHeight: '100vh' }}>

      {/* Hero */}
      <div style={{
        background: '#fff',
        borderBottom: '1px solid #e2eaf2',
        padding: '72px 24px 64px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: '560px', margin: '0 auto' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: '#eef4fb', border: '1px solid #a8cbe8',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#063f76" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
              <circle cx="12" cy="17" r=".5" fill="#063f76"/>
            </svg>
          </div>
          <h1 style={{
            fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800,
            letterSpacing: '-0.04em', color: '#09090B',
            margin: '0 0 14px', lineHeight: 1.1,
          }}>
            How can we help?
          </h1>
          <p style={{ color: '#71717A', fontSize: '16px', lineHeight: 1.65, margin: '0 0 32px' }}>
            Browse common questions below, or reach out directly — we typically respond within one business day.
          </p>

          {/* Email CTA */}
          <a
            href="mailto:support@researchorg.com"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              padding: '13px 24px', borderRadius: 11,
              background: '#063f76', color: '#fff',
              textDecoration: 'none', fontSize: 14, fontWeight: 600,
              boxShadow: '0 4px 16px rgba(6,63,118,0.25)',
              transition: 'background 0.15s, transform 0.1s',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement
              el.style.background = '#04294f'
              el.style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement
              el.style.background = '#063f76'
              el.style.transform = 'translateY(0)'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2"/>
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
            </svg>
            support@researchorg.com
          </a>
        </div>
      </div>

      {/* FAQ */}
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '64px 24px 80px' }}>
        <h2 style={{
          fontSize: 'clamp(20px, 2.5vw, 28px)', fontWeight: 800,
          letterSpacing: '-0.04em', color: '#09090B',
          margin: '0 0 32px', textAlign: 'center',
        }}>
          Frequently asked questions
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {FAQS.map((item, i) => (
            <div key={i} style={{
              background: '#fff', borderRadius: 14,
              border: '1px solid #e2eaf2',
              padding: '20px 24px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
            }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#09090B', marginBottom: 8, letterSpacing: '-0.02em' }}>
                {item.q}
              </div>
              <div style={{ fontSize: 13.5, color: '#52525B', lineHeight: 1.65 }}>
                {item.a}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div style={{
          marginTop: 48, padding: '32px', borderRadius: 16,
          background: '#fff', border: '1px solid #e2eaf2',
          textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#09090B', marginBottom: 6, letterSpacing: '-0.03em' }}>
            Still need help?
          </div>
          <div style={{ fontSize: 13.5, color: '#71717A', marginBottom: 20, lineHeight: 1.6 }}>
            Our team is here to help. Send us an email and we&apos;ll get back to you within one business day.
          </div>
          <a
            href="mailto:support@researchorg.com"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 20px', borderRadius: 9,
              border: '1.5px solid #e2eaf2', background: '#fff',
              color: '#063f76', textDecoration: 'none',
              fontSize: 13.5, fontWeight: 600,
              transition: 'border-color 0.15s, background 0.15s',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement
              el.style.borderColor = '#a8cbe8'
              el.style.background = '#eef4fb'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement
              el.style.borderColor = '#e2eaf2'
              el.style.background = '#fff'
            }}
          >
            support@researchorg.com
          </a>
        </div>
      </div>
    </div>
  )
}
