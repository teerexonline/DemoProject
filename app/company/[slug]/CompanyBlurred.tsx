'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import CompanyLogo from '@/components/CompanyLogo'
const UpgradeButton = dynamic(() => import('@/components/UpgradeButton'), { ssr: false })

interface Company {
  id: string
  name: string
  slug: string
  category: string | null
  logo_color: string | null
  logo_url: string | null
}

export default function CompanyBlurred({ company }: { company: Company }) {
  return (
    <div style={{ minHeight: '100vh', background: '#FAFAFA' }}>
      <div className="company-layout" style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px', display: 'grid', gridTemplateColumns: '220px 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Blurred sidebar — hidden on mobile */}
        <div className="company-sidebar" style={{ filter: 'blur(4px)', userSelect: 'none', pointerEvents: 'none', background: '#fff', borderRadius: '14px', border: '1px solid #E4E4E7', padding: '20px 12px', opacity: 0.6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <CompanyLogo name={company.name} logoUrl={company.logo_url} logoColor={company.logo_color} size={36} />
            <div>
              <div style={{ height: '10px', width: '80px', background: '#E4E4E7', borderRadius: '4px', marginBottom: '5px' }} />
              <div style={{ height: '8px', width: '56px', background: '#F0F0F2', borderRadius: '4px' }} />
            </div>
          </div>
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} style={{ height: '32px', borderRadius: '8px', background: '#F4F4F5', marginBottom: '3px' }} />
          ))}
        </div>

        {/* Upgrade panel */}
        <div style={{ position: 'relative' }}>
          <div style={{ filter: 'blur(6px)', userSelect: 'none', pointerEvents: 'none', background: '#fff', borderRadius: '14px', border: '1px solid #E4E4E7', padding: '28px', opacity: 0.5 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ padding: '16px', borderRadius: '12px', background: '#F7F7F8', textAlign: 'center' }}>
                  <div style={{ height: '24px', background: '#E4E4E7', borderRadius: '6px', marginBottom: '6px' }} />
                  <div style={{ height: '10px', background: '#F0F0F2', borderRadius: '4px' }} />
                </div>
              ))}
            </div>
            <div style={{ height: '120px', background: '#F4F4F5', borderRadius: '12px' }} />
          </div>

          {/* Overlay */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#fff', borderRadius: '20px', border: '1px solid #E4E4E7', boxShadow: '0 20px 60px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06)', padding: '36px 40px', maxWidth: '380px', width: '100%', textAlign: 'center' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#eef4fb', border: '1px solid #a8cbe8', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#063f76" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.04em', color: '#09090B', margin: '0 0 8px' }}>
                Monthly limit reached
              </h2>
              <p style={{ color: '#71717A', fontSize: '13.5px', lineHeight: 1.6, margin: '0 0 24px' }}>
                Your free plan includes 1 full company view per month. Upgrade to Pro for unlimited access to all {company.name} research and more.
              </p>
              <UpgradeButton
                label="Upgrade to Pro — $7.99/mo"
                style={{ width: '100%', padding: '12px', borderRadius: '10px', fontSize: '14px', marginBottom: '10px', boxShadow: '0 4px 12px rgba(6,63,118,0.3)' }}
              />
              <Link
                href="/"
                style={{ display: 'block', color: '#71717A', fontSize: '13px', textDecoration: 'none' }}
              >
                ← Back to search
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
