'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useMonthlyToken } from './actions'

interface Company {
  id: string
  name: string
  slug: string
  category: string | null
  description: string | null
  logo_color: string | null
  employees: number | null
  founded: number | null
  hq: string | null
  valuation: string | null
  revenue: string | null
  website: string | null
}

const NAV = [
  { id: 'overview',   label: 'Company Overview',  icon: '🏢', pro: false },
  { id: 'org',        label: 'Org Chart',          icon: '🗂️',  pro: true },
  { id: 'revenue',    label: 'Revenue',             icon: '💰', pro: true },
  { id: 'revdept',    label: 'Revenue by Dept',     icon: '📊', pro: true },
  { id: 'market',     label: 'Market Share',        icon: '🥧', pro: true },
  { id: 'units',      label: 'Business Units',      icon: '🔷', pro: true },
  { id: 'tools',      label: 'Internal Tools',      icon: '🔧', pro: true },
  { id: 'processes',  label: 'Internal Processes',  icon: '⚙️',  pro: true },
  { id: 'product',    label: 'Product Use Case',    icon: '🎯', pro: true },
] as const
type SectionId = typeof NAV[number]['id']

function CompanyOverview({ company }: { company: Company }) {
  const color = company.logo_color ?? '#7C3AED'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 4px 12px ${color}33` }}>
          <span style={{ color: '#fff', fontSize: '20px', fontWeight: 800 }}>{company.name.charAt(0)}</span>
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, letterSpacing: '-0.04em', color: '#09090B' }}>{company.name}</h1>
          <div style={{ color: '#71717A', fontSize: '13px', marginTop: '2px' }}>
            {company.category} · {company.hq ?? 'Global'} · Founded {company.founded ?? '—'}
          </div>
        </div>
        <div style={{ marginLeft: 'auto', background: '#F0FDF4', color: '#16A34A', fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '100px', border: '1px solid #BBF7D0' }}>Active</div>
      </div>

      {company.description && (
        <p style={{ color: '#374151', fontSize: '14.5px', lineHeight: 1.7, margin: 0, padding: '16px 18px', background: '#F7F7F8', borderRadius: '12px', border: '1px solid #F0F0F2' }}>
          {company.description}
        </p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        {[
          { label: 'Valuation', value: company.valuation ?? '—' },
          { label: 'Revenue', value: company.revenue ?? '—' },
          { label: 'Employees', value: company.employees ? company.employees >= 1000 ? `${(company.employees / 1000).toFixed(0)}k+` : `${company.employees}` : '—' },
          { label: 'Founded', value: company.founded?.toString() ?? '—' },
        ].map(s => (
          <div key={s.label} style={{ padding: '16px', borderRadius: '12px', background: '#F7F7F8', border: '1px solid #F0F0F2', textAlign: 'center' }}>
            <div style={{ color: '#09090B', fontSize: '18px', fontWeight: 800, letterSpacing: '-0.04em' }}>{s.value}</div>
            <div style={{ color: '#A1A1AA', fontSize: '11.5px', marginTop: '3px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {[company.category, 'B2B', 'SaaS', 'Developer-first'].filter(Boolean).map(t => (
          <span key={t} style={{ padding: '4px 11px', borderRadius: '6px', background: '#F5F3FF', border: '1px solid #DDD6FE', color: '#7C3AED', fontSize: '12px', fontWeight: 500 }}>{t}</span>
        ))}
      </div>

      {/* Teaser of what's locked */}
      <div style={{ padding: '18px 20px', borderRadius: '12px', background: '#FAFAFA', border: '1px solid #F0F0F2' }}>
        <div style={{ color: '#71717A', fontSize: '11.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
          More available with Pro
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {NAV.filter(n => n.pro).map(n => (
            <span key={n.id} style={{ padding: '4px 10px', borderRadius: '6px', background: '#fff', border: '1px solid #E4E4E7', color: '#A1A1AA', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '11px' }}>🔒</span> {n.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function ProGatePanel({
  section,
  company,
  hasToken,
  isPending,
  onUseToken,
}: {
  section: typeof NAV[number]
  company: Company
  hasToken: boolean
  isPending: boolean
  onUseToken: () => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '420px', padding: '40px 24px', textAlign: 'center' }}>
      {/* Blurred preview rows */}
      <div style={{ width: '100%', marginBottom: '32px', filter: 'blur(4px)', userSelect: 'none', pointerEvents: 'none', opacity: 0.5 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ height: '48px', borderRadius: '10px', background: i % 2 === 0 ? '#F4F4F5' : '#EBEBED', marginBottom: '8px' }} />
        ))}
      </div>

      {/* Gate card */}
      <div style={{ background: '#fff', borderRadius: '20px', border: '1px solid #E4E4E7', boxShadow: '0 16px 48px rgba(0,0,0,0.10), 0 4px 12px rgba(0,0,0,0.06)', padding: '32px 36px', maxWidth: '380px', width: '100%', marginTop: '-160px', position: 'relative', zIndex: 2 }}>
        <div style={{ fontSize: '28px', marginBottom: '12px' }}>{section.icon}</div>
        <h2 style={{ fontSize: '17px', fontWeight: 800, letterSpacing: '-0.04em', color: '#09090B', margin: '0 0 8px' }}>
          {section.label}
        </h2>
        <p style={{ color: '#71717A', fontSize: '13px', lineHeight: 1.6, margin: '0 0 24px' }}>
          This section is available on the Pro plan. Unlock deep insights for {company.name} and every other company on ResearchOrg.
        </p>

        {hasToken && (
          <>
            {/* Token option */}
            <div style={{ background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: '12px', padding: '16px', marginBottom: '12px', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
                <div style={{ fontSize: '20px', lineHeight: 1 }}>🎁</div>
                <div>
                  <div style={{ color: '#6D28D9', fontSize: '13px', fontWeight: 700, marginBottom: '3px' }}>
                    You have 1 free company unlock
                  </div>
                  <div style={{ color: '#7C3AED', fontSize: '12px', lineHeight: 1.5, opacity: 0.8 }}>
                    Use your monthly token to unlock all sections of {company.name} for the rest of this month.
                  </div>
                </div>
              </div>
              <button
                onClick={onUseToken}
                disabled={isPending}
                style={{
                  width: '100%', padding: '10px', borderRadius: '9px', border: 'none',
                  background: isPending ? '#A78BFA' : '#7C3AED',
                  color: '#fff', fontSize: '13.5px', fontWeight: 600,
                  cursor: isPending ? 'not-allowed' : 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (!isPending) (e.currentTarget as HTMLElement).style.background = '#6D28D9' }}
                onMouseLeave={e => { if (!isPending) (e.currentTarget as HTMLElement).style.background = '#7C3AED' }}
              >
                {isPending ? 'Unlocking…' : `Unlock ${company.name} for this month`}
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ flex: 1, height: '1px', background: '#E4E4E7' }} />
              <span style={{ color: '#A1A1AA', fontSize: '11.5px', fontWeight: 500 }}>or</span>
              <div style={{ flex: 1, height: '1px', background: '#E4E4E7' }} />
            </div>
          </>
        )}

        {/* Upgrade to Pro */}
        <Link
          href="/signup?plan=pro"
          style={{
            display: 'block', padding: '11px', background: hasToken ? '#09090B' : '#7C3AED',
            color: '#fff', textDecoration: 'none', borderRadius: '10px',
            fontWeight: 600, fontSize: '14px', marginBottom: '10px',
            boxShadow: hasToken ? '0 2px 8px rgba(0,0,0,0.15)' : '0 4px 12px rgba(124,58,237,0.3)',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = hasToken ? '#18181B' : '#6D28D9'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = hasToken ? '#09090B' : '#7C3AED'}
        >
          Upgrade to Pro — from $4.99/mo
        </Link>

        <Link href="/pricing" style={{ display: 'block', color: '#A1A1AA', fontSize: '12px', textDecoration: 'none' }}>
          View all plans →
        </Link>
      </div>
    </div>
  )
}

export default function CompanyFreeGated({ company, hasToken }: { company: Company; hasToken: boolean }) {
  const [activeSection, setActiveSection] = useState<SectionId>('overview')
  const [animKey, setAnimKey] = useState(0)
  const [isPending, startTransition] = useTransition()
  const color = company.logo_color ?? '#7C3AED'

  function changeSection(id: SectionId) {
    setActiveSection(id)
    setAnimKey(k => k + 1)
  }

  function handleUseToken() {
    startTransition(async () => {
      await useMonthlyToken(company.id, company.slug)
    })
  }

  const activeNav = NAV.find(n => n.id === activeSection)!

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAFA' }}>
      {/* Back nav */}
      <div style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #E4E4E7', padding: '0 24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', height: '56px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/" style={{ color: '#7C3AED', textDecoration: 'none', fontWeight: 800, fontSize: '15px', letterSpacing: '-0.03em' }}>
            Research<span style={{ color: '#09090B' }}>Org</span>
          </Link>
          <span style={{ color: '#D4D4D8' }}>›</span>
          <span style={{ color: '#52525B', fontSize: '14px' }}>{company.category}</span>
          <span style={{ color: '#D4D4D8' }}>›</span>
          <span style={{ color: '#09090B', fontSize: '14px', fontWeight: 600 }}>{company.name}</span>

          {hasToken && (
            <div style={{ marginLeft: 'auto', background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: '8px', padding: '5px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '13px' }}>🎁</span>
              <span style={{ color: '#7C3AED', fontSize: '12px', fontWeight: 600 }}>1 free unlock available</span>
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px', display: 'grid', gridTemplateColumns: '220px 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Sidebar */}
        <div style={{ position: 'sticky', top: '80px', background: '#fff', borderRadius: '14px', border: '1px solid #E4E4E7', padding: '12px 8px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ padding: '8px 8px 14px', borderBottom: '1px solid #F4F4F5', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ color: '#fff', fontSize: '14px', fontWeight: 800 }}>{company.name.charAt(0)}</span>
              </div>
              <div>
                <div style={{ color: '#09090B', fontSize: '13px', fontWeight: 700 }}>{company.name}</div>
                <div style={{ color: '#A1A1AA', fontSize: '11px' }}>{company.category}</div>
              </div>
            </div>
          </div>

          {NAV.map(nav => (
            <button
              key={nav.id}
              onClick={() => changeSection(nav.id)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 10px', borderRadius: '8px', border: 'none',
                background: activeSection === nav.id ? '#F5F3FF' : 'transparent',
                cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s',
                marginBottom: '1px',
              }}
              onMouseEnter={e => { if (activeSection !== nav.id) (e.currentTarget as HTMLElement).style.background = '#F7F7F8' }}
              onMouseLeave={e => { if (activeSection !== nav.id) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <span style={{ fontSize: '13px' }}>{nav.icon}</span>
              <span style={{ fontSize: '12.5px', fontWeight: activeSection === nav.id ? 600 : 400, color: activeSection === nav.id ? '#7C3AED' : '#52525B', flex: 1 }}>
                {nav.label}
              </span>
              {nav.pro && (
                <span style={{ fontSize: '10px', color: '#A1A1AA' }}>🔒</span>
              )}
            </button>
          ))}

          {/* Upgrade nudge */}
          <div style={{ marginTop: '12px', padding: '12px', borderRadius: '10px', background: '#F5F3FF', border: '1px solid #DDD6FE' }}>
            <div style={{ color: '#6D28D9', fontSize: '11.5px', fontWeight: 700, marginBottom: '6px' }}>Unlock everything</div>
            <div style={{ color: '#7C3AED', fontSize: '11px', lineHeight: 1.5, marginBottom: '10px', opacity: 0.85 }}>
              Get access to all 8 sections for every company.
            </div>
            <Link
              href="/signup?plan=pro"
              style={{ display: 'block', textAlign: 'center', background: '#7C3AED', color: '#fff', textDecoration: 'none', borderRadius: '8px', padding: '8px', fontSize: '12px', fontWeight: 600, transition: 'background 0.15s' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#6D28D9'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#7C3AED'}
            >
              Upgrade to Pro
            </Link>
          </div>
        </div>

        {/* Content panel */}
        <div
          key={animKey}
          className="animate-tabIn"
          style={{ background: '#fff', borderRadius: '14px', border: '1px solid #E4E4E7', padding: '28px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', minHeight: '500px' }}
        >
          {activeSection === 'overview' ? (
            <CompanyOverview company={company} />
          ) : (
            <ProGatePanel
              section={activeNav}
              company={company}
              hasToken={hasToken}
              isPending={isPending}
              onUseToken={handleUseToken}
            />
          )}
        </div>
      </div>
    </div>
  )
}
