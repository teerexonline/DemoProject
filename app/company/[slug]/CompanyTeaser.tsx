'use client'

import Link from 'next/link'
import CompanyLogo from '@/components/CompanyLogo'
import RelatedCompanies from '@/components/RelatedCompanies'

interface Company {
  id: string
  name: string
  slug: string
  category: string | null
  description: string | null
  logo_color: string | null
  logo_url: string | null
  hq: string | null
}

interface RelatedCompany {
  id: string; name: string; slug: string; category: string | null
  description: string | null; logo_color: string | null; logo_url: string | null
}

export default function CompanyTeaser({ company, relatedCompanies = [] }: { company: Company; relatedCompanies?: RelatedCompany[] }) {
  return (
    <div style={{ minHeight: '100vh', background: '#FAFAFA', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
        <div style={{ maxWidth: '480px', width: '100%', textAlign: 'center' }}>
          {/* Company pill */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '6px 14px 6px 6px', borderRadius: '100px', background: '#eef4fb', border: '1px solid #a8cbe8', marginBottom: '24px' }}>
            <CompanyLogo name={company.name} logoUrl={company.logo_url} logoColor={company.logo_color} size={28} />
            <span style={{ color: '#04294f', fontSize: '13px', fontWeight: 600 }}>{company.name}</span>
          </div>

          <h1 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.04em', color: '#09090B', margin: '0 0 12px', lineHeight: 1.2 }}>
            Unlock full research on<br />{company.name}
          </h1>
          <p style={{ color: '#71717A', fontSize: '15px', lineHeight: 1.6, margin: '0 0 32px' }}>
            Get org charts, revenue data, internal tools, market share, and everything you need to walk into any interview fully prepared.
          </p>

          {/* Blurred preview */}
          <div style={{ position: 'relative', marginBottom: '32px', borderRadius: '14px', overflow: 'hidden', border: '1px solid #E4E4E7' }}>
            <div style={{ filter: 'blur(6px)', userSelect: 'none', pointerEvents: 'none', padding: '20px', background: '#fff', opacity: 0.7 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '12px' }}>
                {['$65B', '$14.3B', '8,000+', '46'].map((v, i) => (
                  <div key={i} style={{ padding: '12px', borderRadius: '8px', background: '#F7F7F8', textAlign: 'center' }}>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#09090B' }}>{v}</div>
                    <div style={{ fontSize: '10px', color: '#A1A1AA' }}>Stat</div>
                  </div>
                ))}
              </div>
              <div style={{ height: '80px', background: '#F4F4F5', borderRadius: '8px' }} />
            </div>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.5)' }}>
              <div style={{ background: '#fff', border: '1px solid #E4E4E7', borderRadius: '10px', padding: '10px 20px', color: '#09090B', fontSize: '13px', fontWeight: 600, boxShadow: '0 4px 16px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: '7px' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                Sign in to view
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Link
              href={`/signup?next=/company/${company.slug}`}
              style={{ display: 'block', padding: '13px', background: '#063f76', color: '#fff', textDecoration: 'none', borderRadius: '10px', fontWeight: 600, fontSize: '15px', letterSpacing: '-0.01em', boxShadow: '0 4px 12px rgba(6,63,118,0.3)', transition: 'background 0.15s' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#04294f'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#063f76'}
            >
              Create free account
            </Link>
            <Link
              href={`/login?next=/company/${company.slug}`}
              style={{ display: 'block', padding: '13px', background: '#fff', color: '#52525B', textDecoration: 'none', borderRadius: '10px', fontWeight: 500, fontSize: '14px', border: '1px solid #E4E4E7', transition: 'background 0.15s' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F4F4F5'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#fff'}
            >
              Sign in to existing account
            </Link>
          </div>
          <p style={{ color: '#A1A1AA', fontSize: '12px', marginTop: '16px' }}>Free plan includes 1 full company view per month.</p>
        </div>
      </div>
      {relatedCompanies.length > 0 && (
        <div style={{ maxWidth: '960px', margin: '0 auto', padding: '0 24px 48px', width: '100%' }}>
          <RelatedCompanies companies={relatedCompanies} />
        </div>
      )}
    </div>
  )
}
