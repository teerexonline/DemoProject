'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useMonthlyToken } from './actions'
import CompanyOverview from './CompanyOverview'
import SaveButton from '@/components/SaveButton'
import CompanyLogo from '@/components/CompanyLogo'
import RelatedCompanies from '@/components/RelatedCompanies'
import { Building2, Network, TrendingUp, Settings, Target, Package, Lock, Gift } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface Company {
  id: string
  name: string
  slug: string
  category: string | null
  description: string | null
  logo_color: string | null
  logo_url: string | null
  employees: number | null
  founded: number | null
  hq: string | null
  valuation: string | null
  revenue: string | null
  website: string | null
}

const NAV: { id: string; label: string; color: string; icon: LucideIcon; pro: boolean }[] = [
  { id: 'overview',   label: 'Company Overview',          color: '#2563EB', icon: Building2,  pro: false },
  { id: 'org',        label: 'Org Chart',                  color: '#7C3AED', icon: Network,    pro: true  },
  { id: 'financials', label: 'Financials',                  color: '#16A34A', icon: TrendingUp, pro: true  },
  { id: 'internal',   label: 'Internal Tools & Processes',  color: '#EA580C', icon: Settings,   pro: true  },
  { id: 'prep',       label: 'Interview Prep',              color: '#DC2626', icon: Target,     pro: true  },
  { id: 'product',    label: 'Product Use Cases',            color: '#CA8A04', icon: Package,    pro: true  },
]
type SectionId = 'overview' | 'org' | 'financials' | 'internal' | 'prep' | 'product'

// ─── Guest gate (not logged in) ───────────────────────────────────────────────

function GuestGatePanel({ section, company }: { section: typeof NAV[number]; company: Company }) {
  const Icon = section.icon
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '420px', padding: '40px 24px', textAlign: 'center' }}>
      {/* Blurred preview rows */}
      <div style={{ width: '100%', marginBottom: '32px', filter: 'blur(4px)', userSelect: 'none', pointerEvents: 'none', opacity: 0.4 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ height: '48px', borderRadius: '10px', background: i % 2 === 0 ? '#F4F4F5' : '#EBEBED', marginBottom: '8px' }} />
        ))}
      </div>

      {/* Gate card */}
      <div style={{
        background: '#fff', borderRadius: '20px',
        border: '1px solid #E4E4E7',
        boxShadow: '0 16px 48px rgba(0,0,0,0.10), 0 4px 12px rgba(0,0,0,0.06)',
        padding: '32px 36px', maxWidth: '380px', width: '100%',
        marginTop: '-160px', position: 'relative', zIndex: 2,
      }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: `${section.color}12`, border: `1px solid ${section.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
          <Icon size={22} color={section.color} strokeWidth={1.75} />
        </div>
        <h2 style={{ fontSize: '17px', fontWeight: 800, letterSpacing: '-0.04em', color: '#09090B', margin: '0 0 8px' }}>
          {section.label}
        </h2>
        <p style={{ color: '#71717A', fontSize: '13px', lineHeight: 1.6, margin: '0 0 24px' }}>
          Create a free account to access this section.<br />No credit card needed.
        </p>

        <Link
          href={`/signup?next=/company/${company.slug}`}
          style={{
            display: 'block', padding: '12px', background: '#063f76',
            color: '#fff', textDecoration: 'none', borderRadius: '10px',
            fontWeight: 600, fontSize: '14px', marginBottom: '10px',
            boxShadow: '0 4px 12px rgba(6,63,118,0.28)',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#04294f'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#063f76'}
        >
          Sign up for free
        </Link>

        <Link
          href={`/login?next=/company/${company.slug}`}
          style={{ display: 'block', color: '#71717A', fontSize: '12.5px', textDecoration: 'none', padding: '6px' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#063f76'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#71717A'}
        >
          Already have an account? Sign in
        </Link>
      </div>
    </div>
  )
}

// ─── Free-user gate (logged in, no token / Pro teaser) ────────────────────────

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
  const Icon = section.icon
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
        <div style={{ width: 48, height: 48, borderRadius: 14, background: `${section.color}12`, border: `1px solid ${section.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
          <Icon size={22} color={section.color} strokeWidth={1.75} />
        </div>
        <h2 style={{ fontSize: '17px', fontWeight: 800, letterSpacing: '-0.04em', color: '#09090B', margin: '0 0 8px' }}>
          {section.label}
        </h2>
        <p style={{ color: '#71717A', fontSize: '13px', lineHeight: 1.6, margin: '0 0 24px' }}>
          This section is available on the Pro plan. Unlock deep insights for {company.name} and every other company on ResearchOrg.
        </p>

        {hasToken && (
          <>
            {/* Token option */}
            <div style={{ background: '#eef4fb', border: '1px solid #a8cbe8', borderRadius: '12px', padding: '16px', marginBottom: '12px', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
                <Gift size={18} color="#063f76" strokeWidth={1.75} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ color: '#04294f', fontSize: '13px', fontWeight: 700, marginBottom: '3px' }}>
                    You have 1 free company unlock
                  </div>
                  <div style={{ color: '#063f76', fontSize: '12px', lineHeight: 1.5, opacity: 0.8 }}>
                    Use your monthly token to unlock all sections of {company.name} for the rest of this month.
                  </div>
                </div>
              </div>
              <button
                onClick={onUseToken}
                disabled={isPending}
                style={{
                  width: '100%', padding: '10px', borderRadius: '9px', border: 'none',
                  background: isPending ? '#609dd6' : '#063f76',
                  color: '#fff', fontSize: '13.5px', fontWeight: 600,
                  cursor: isPending ? 'not-allowed' : 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (!isPending) (e.currentTarget as HTMLElement).style.background = '#04294f' }}
                onMouseLeave={e => { if (!isPending) (e.currentTarget as HTMLElement).style.background = '#063f76' }}
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
            display: 'block', padding: '11px', background: hasToken ? '#09090B' : '#063f76',
            color: '#fff', textDecoration: 'none', borderRadius: '10px',
            fontWeight: 600, fontSize: '14px', marginBottom: '10px',
            boxShadow: hasToken ? '0 2px 8px rgba(0,0,0,0.15)' : '0 4px 12px rgba(6,63,118,0.3)',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = hasToken ? '#18181B' : '#04294f'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = hasToken ? '#09090B' : '#063f76'}
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

// ─── Main component ───────────────────────────────────────────────────────────

interface RelatedCompany {
  id: string; name: string; slug: string; category: string | null
  description: string | null; logo_color: string | null; logo_url: string | null
}

export default function CompanyFreeGated({ company, hasToken, initialSaved, isGuest = false, relatedCompanies = [] }: { company: Company; hasToken: boolean; initialSaved: boolean; isGuest?: boolean; relatedCompanies?: RelatedCompany[] }) {
  const [activeSection, setActiveSection] = useState<SectionId>('overview')
  const [animKey, setAnimKey] = useState(0)
  const [isPending, startTransition] = useTransition()
  const color = company.logo_color ?? '#063f76'

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
      {/* Breadcrumb */}
      <div style={{ background: '#fff', borderBottom: '1px solid #F4F4F5' }}>
        <div className="company-breadcrumb" style={{ maxWidth: '1200px', margin: '0 auto', height: '44px', display: 'flex', alignItems: 'center', gap: '8px', padding: '0 24px' }}>
          <Link href="/" style={{ color: '#A1A1AA', textDecoration: 'none', fontSize: '13px', transition: 'color 0.15s' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#063f76'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#A1A1AA'}
          >Home</Link>
          <span style={{ color: '#D4D4D8', fontSize: '13px' }}>›</span>
          <span style={{ color: '#A1A1AA', fontSize: '13px' }}>{company.category}</span>
          <span style={{ color: '#D4D4D8', fontSize: '13px' }}>›</span>
          <span style={{ color: '#09090B', fontSize: '13px', fontWeight: 600 }}>{company.name}</span>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            {!isGuest && hasToken && (
              <div style={{ background: '#eef4fb', border: '1px solid #a8cbe8', borderRadius: '8px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Gift size={12} color="#063f76" strokeWidth={2} />
                <span style={{ color: '#063f76', fontSize: '12px', fontWeight: 600 }}>1 free unlock</span>
              </div>
            )}
            {isGuest ? (
              <Link href={`/signup?next=/company/${company.slug}`}
                style={{ padding: '6px 14px', borderRadius: '8px', background: '#063f76', color: '#fff', textDecoration: 'none', fontSize: '12.5px', fontWeight: 600, transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#04294f'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#063f76'}
              >Sign up free</Link>
            ) : (
              <SaveButton companyId={company.id} companyName={company.name} initialSaved={initialSaved} logoColor={color} />
            )}
          </div>
        </div>
      </div>

      {/* Mobile tab strip — matches CompanyFull exactly */}
      <div className="company-mobile-tabs" style={{
        display: 'none',
        overflowX: 'auto',
        padding: '10px 16px',
        gap: '6px',
        background: '#fff',
        borderBottom: '1px solid #E4E4E7',
        WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'],
        scrollbarWidth: 'none' as React.CSSProperties['scrollbarWidth'],
      }}>
        {NAV.map(nav => (
          <button
            key={nav.id}
            onClick={() => changeSection(nav.id as SectionId)}
            style={{
              flexShrink: 0, padding: '7px 12px', borderRadius: '8px', border: 'none',
              background: activeSection === nav.id ? '#eef4fb' : '#F4F4F5',
              color: activeSection === nav.id ? '#063f76' : '#52525B',
              fontSize: '12.5px', fontWeight: activeSection === nav.id ? 600 : 400,
              cursor: 'pointer', whiteSpace: 'nowrap',
              transition: 'background 0.15s, color 0.15s',
              display: 'inline-flex', alignItems: 'center', gap: '6px',
            }}
          >
            <nav.icon size={13} color={activeSection === nav.id ? nav.color : '#A1A1AA'} strokeWidth={1.75} style={{ flexShrink: 0 }} />
            {nav.label}
            {nav.pro && <Lock size={10} color="#A1A1AA" strokeWidth={2.5} style={{ flexShrink: 0 }} />}
          </button>
        ))}
      </div>

      <div className="company-layout" style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 24px', display: 'grid', gridTemplateColumns: '220px 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Sidebar */}
        <div className="company-sidebar" style={{ position: 'sticky', top: '80px', background: '#fff', borderRadius: '14px', border: '1px solid #E4E4E7', padding: '12px 8px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ padding: '8px 8px 14px', borderBottom: '1px solid #F4F4F5', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CompanyLogo name={company.name} logoUrl={company.logo_url} logoColor={company.logo_color} size={36} />
              <div>
                <div style={{ color: '#09090B', fontSize: '13px', fontWeight: 700 }}>{company.name}</div>
                <div style={{ color: '#A1A1AA', fontSize: '11px' }}>{company.category}</div>
              </div>
            </div>
          </div>

          {NAV.map(nav => (
            <button
              key={nav.id}
              onClick={() => changeSection(nav.id as SectionId)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 10px', borderRadius: '8px', border: 'none',
                background: activeSection === nav.id ? '#eef4fb' : 'transparent',
                cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s',
                marginBottom: '1px',
              }}
              onMouseEnter={e => { if (activeSection !== nav.id) (e.currentTarget as HTMLElement).style.background = '#F7F7F8' }}
              onMouseLeave={e => { if (activeSection !== nav.id) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <nav.icon size={14} color={activeSection === nav.id ? nav.color : '#A1A1AA'} strokeWidth={1.75} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '12.5px', fontWeight: activeSection === nav.id ? 600 : 400, color: activeSection === nav.id ? '#063f76' : '#52525B', flex: 1 }}>
                {nav.label}
              </span>
              {nav.pro && <Lock size={11} color="#C4C4C8" strokeWidth={2.2} style={{ flexShrink: 0 }} />}
            </button>
          ))}

          {/* Nudge card */}
          <div style={{ marginTop: '12px', padding: '12px', borderRadius: '10px', background: '#eef4fb', border: '1px solid #a8cbe8' }}>
            {isGuest ? (
              <>
                <div style={{ color: '#04294f', fontSize: '11.5px', fontWeight: 700, marginBottom: '10px', textAlign: 'center' }}>Create a free account</div>
                <Link
                  href={`/signup?next=/company/${company.slug}`}
                  style={{ display: 'block', textAlign: 'center', background: '#063f76', color: '#fff', textDecoration: 'none', borderRadius: '8px', padding: '8px', fontSize: '12px', fontWeight: 600, transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#04294f'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#063f76'}
                >Sign up for free</Link>
              </>
            ) : (
              <>
                <div style={{ color: '#04294f', fontSize: '11.5px', fontWeight: 700, marginBottom: '6px', textAlign: 'center' }}>Unlock everything</div>
                <div style={{ color: '#063f76', fontSize: '11px', lineHeight: 1.5, marginBottom: '10px', opacity: 0.85 }}>
                  Get access to all sections for every company.
                </div>
                <Link
                  href="/signup?plan=pro"
                  style={{ display: 'block', textAlign: 'center', background: '#063f76', color: '#fff', textDecoration: 'none', borderRadius: '8px', padding: '8px', fontSize: '12px', fontWeight: 600, transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#04294f'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#063f76'}
                >Upgrade to Pro</Link>
              </>
            )}
          </div>
        </div>

        {/* Content panel */}
        <div
          key={animKey}
          className="animate-tabIn company-panel"
          style={{ background: '#fff', borderRadius: '14px', border: '1px solid #E4E4E7', padding: '28px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', minHeight: '500px' }}
        >
          {activeSection === 'overview' ? (
            <CompanyOverview company={company} showProTeaser />
          ) : isGuest ? (
            <GuestGatePanel section={activeNav} company={company} />
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

      {/* Related companies */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px 40px' }}>
        <RelatedCompanies companies={relatedCompanies} />
      </div>
    </div>
  )
}
