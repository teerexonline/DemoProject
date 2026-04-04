'use client'

import Link from 'next/link'

interface Company {
  id: string
  name: string
  slug: string
  category: string | null
  logo_color: string | null
}

export default function CompanyBlurred({ company }: { company: Company }) {
  const color = company.logo_color ?? '#7C3AED'

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAFA' }}>
      {/* Nav */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E4E4E7', padding: '0 24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', height: '56px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/" style={{ color: '#7C3AED', textDecoration: 'none', fontWeight: 800, fontSize: '15px', letterSpacing: '-0.03em' }}>
            Research<span style={{ color: '#09090B' }}>Org</span>
          </Link>
          <span style={{ color: '#D4D4D8' }}>›</span>
          <span style={{ color: '#09090B', fontSize: '14px', fontWeight: 600 }}>{company.name}</span>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px', display: 'grid', gridTemplateColumns: '220px 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Blurred sidebar */}
        <div style={{ filter: 'blur(4px)', userSelect: 'none', pointerEvents: 'none', background: '#fff', borderRadius: '14px', border: '1px solid #E4E4E7', padding: '20px 12px', opacity: 0.6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: color }} />
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
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#F5F3FF', border: '1px solid #DDD6FE', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '22px' }}>
                🔒
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.04em', color: '#09090B', margin: '0 0 8px' }}>
                Monthly limit reached
              </h2>
              <p style={{ color: '#71717A', fontSize: '13.5px', lineHeight: 1.6, margin: '0 0 24px' }}>
                Your free plan includes 1 full company view per month. Upgrade to Pro for unlimited access to all {company.name} research and more.
              </p>
              <Link
                href="/signup?plan=pro"
                style={{ display: 'block', padding: '12px', background: '#7C3AED', color: '#fff', textDecoration: 'none', borderRadius: '10px', fontWeight: 600, fontSize: '14px', marginBottom: '10px', boxShadow: '0 4px 12px rgba(124,58,237,0.3)', transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#6D28D9'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#7C3AED'}
              >
                Upgrade to Pro — from $4.99/mo
              </Link>
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
