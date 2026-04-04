'use client'

import Link from 'next/link'

interface Company {
  id: string
  name: string
  slug: string
  category: string | null
  description: string | null
  logo_color: string | null
  hq: string | null
}

export default function CompanyTeaser({ company }: { company: Company }) {
  const color = company.logo_color ?? '#7C3AED'

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAFA', display: 'flex', flexDirection: 'column' }}>
      {/* Nav */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E4E4E7', padding: '0 24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', height: '56px', display: 'flex', alignItems: 'center' }}>
          <Link href="/" style={{ color: '#7C3AED', textDecoration: 'none', fontWeight: 800, fontSize: '15px', letterSpacing: '-0.03em' }}>
            Research<span style={{ color: '#09090B' }}>Org</span>
          </Link>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
        <div style={{ maxWidth: '480px', width: '100%', textAlign: 'center' }}>
          {/* Company pill */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '6px 14px 6px 6px', borderRadius: '100px', background: '#F5F3FF', border: '1px solid #DDD6FE', marginBottom: '24px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontSize: '12px', fontWeight: 800 }}>{company.name.charAt(0)}</span>
            </div>
            <span style={{ color: '#6D28D9', fontSize: '13px', fontWeight: 600 }}>{company.name}</span>
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
              <div style={{ background: '#fff', border: '1px solid #E4E4E7', borderRadius: '10px', padding: '10px 20px', color: '#09090B', fontSize: '13px', fontWeight: 600, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
                🔒 Sign in to view
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Link
              href={`/signup?next=/company/${company.slug}`}
              style={{ display: 'block', padding: '13px', background: '#7C3AED', color: '#fff', textDecoration: 'none', borderRadius: '10px', fontWeight: 600, fontSize: '15px', letterSpacing: '-0.01em', boxShadow: '0 4px 12px rgba(124,58,237,0.3)', transition: 'background 0.15s' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#6D28D9'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#7C3AED'}
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
    </div>
  )
}
