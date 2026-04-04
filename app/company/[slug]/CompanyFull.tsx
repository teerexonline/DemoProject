'use client'

import { useState } from 'react'
import Link from 'next/link'
import CompanyOverview from './CompanyOverview'
import OrgChart from './OrgChart'

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
  { id: 'overview',   label: 'Company Overview',  icon: '🏢' },
  { id: 'org',        label: 'Org Chart',          icon: '🗂️' },
  { id: 'financials', label: 'Financials',          icon: '💹' },
  { id: 'tools',      label: 'Internal Tools',      icon: '🔧' },
  { id: 'processes',  label: 'Internal Processes',  icon: '⚙️' },
  { id: 'product',    label: 'Product Use Case',    icon: '🎯' },
] as const
type SectionId = typeof NAV[number]['id']

function SectionContent({ id, company }: { id: SectionId; company: Company }) {
  const color = company.logo_color ?? '#7C3AED'

  switch (id) {
    case 'overview':
      return <CompanyOverview company={company} />

    case 'org':
      return <OrgChart company={company} />

    case 'financials': {
      const MARKET = [
        { name: company.name,    pct: 34, clr: color },
        { name: 'Competitor A',  pct: 28, clr: '#94A3B8' },
        { name: 'Competitor B',  pct: 19, clr: '#CBD5E1' },
        { name: 'Others',        pct: 19, clr: '#E2E8F0' },
      ]
      let cum = 0
      const donut = `conic-gradient(${MARKET.map(m => { const f = cum; cum += m.pct; return `${m.clr} ${f}% ${cum}%` }).join(', ')})`

      const STREAMS = [
        { name: 'Core Product / Services',    pct: 62, clr: color },
        { name: 'Enterprise & Partnerships',  pct: 22, clr: '#06B6D4' },
        { name: 'Platform & APIs',            pct: 11, clr: '#F59E0B' },
        { name: 'Other / Misc',               pct: 5,  clr: '#10B981' },
      ]

      const UNITS = [
        { name: 'Core Platform',       growth: '+24%',  status: 'primary', desc: 'Main product · ~62% of revenue' },
        { name: 'Enterprise Division', growth: '+41%',  status: 'growing', desc: 'Custom integrations & enterprise' },
        { name: 'Developer Tools',     growth: '+18%',  status: 'growing', desc: 'SDKs, APIs & third-party platform' },
        { name: 'Emerging Products',   growth: 'Early', status: 'early',   desc: 'New bets & experimental lines' },
      ]

      const unitColor = (s: string) => s === 'primary' ? color : s === 'growing' ? '#10B981' : '#F59E0B'

      const cat = (company.category ?? '').toLowerCase()
      const marketLabel = (() => {
        if (cat.includes('payment') || cat.includes('fintech'))            return 'Digital Payments'
        if (cat.includes('cloud') || cat.includes('infrastructure'))       return 'Cloud Infrastructure'
        if (cat.includes('ecommerce') || cat.includes('e-commerce') || cat.includes('retail')) return 'E-commerce Platforms'
        if (cat.includes('saas') || cat.includes('software'))              return 'B2B SaaS Software'
        if (cat.includes('social') || cat.includes('media'))               return 'Social Media Platforms'
        if (cat.includes('health') || cat.includes('medical'))             return 'Health Technology'
        if (cat.includes('ai') || cat.includes('machine learning') || cat.includes('artificial')) return 'AI & ML Platforms'
        if (cat.includes('marketplace'))                                    return 'Online Marketplaces'
        if (cat.includes('gaming'))                                         return 'Gaming Platforms'
        if (cat.includes('crypto') || cat.includes('blockchain'))          return 'Crypto & Blockchain'
        if (cat.includes('cyber') || cat.includes('security'))             return 'Cybersecurity'
        if (cat.includes('data') || cat.includes('analytics'))             return 'Data & Analytics'
        if (cat.includes('hr') || cat.includes('workforce'))               return 'HR Technology'
        if (cat.includes('crm') || cat.includes('sales'))                  return 'CRM & Sales Tech'
        if (cat.includes('logistics') || cat.includes('supply'))           return 'Logistics & Supply Chain'
        if (cat.includes('devtools') || cat.includes('developer'))         return 'Developer Tools'
        if (cat.includes('streaming') || cat.includes('video'))            return 'Video Streaming'
        if (cat.includes('travel') || cat.includes('hospitality'))         return 'Travel & Hospitality'
        return company.category ?? 'Technology'
      })()

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* ── KPIs ──────────────────────────────────────────── */}
          <div className="co-3col" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {[
              { label: 'Annual Revenue',       value: company.revenue ?? '$—', sub: '+24% vs prior year' },
              { label: 'YoY Growth',           value: '24%',                   sub: '+5 pp vs prior year' },
              { label: 'Revenue / Employee',   value: '$1.8M',                 sub: '+12% vs prior year' },
            ].map(kpi => (
              <div key={kpi.label} style={{ padding: '14px 16px', borderRadius: 12, background: '#F7F7F8', border: '1px solid #F0F0F2' }}>
                <div style={{ color: '#A1A1AA', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                  {kpi.label}
                </div>
                <div style={{ color: '#09090B', fontSize: 22, fontWeight: 800, letterSpacing: '-0.04em', marginBottom: 3 }}>
                  {kpi.value}
                </div>
                <div style={{ color: '#16A34A', fontSize: 10.5, fontWeight: 600 }}>{kpi.sub}</div>
              </div>
            ))}
          </div>

          {/* ── Revenue chart + Market share ──────────────────── */}
          <div className="co-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>

            {/* Revenue growth bars */}
            <div style={{ padding: '14px 16px', borderRadius: 12, background: '#fff', border: '1px solid #E4E4E7' }}>
              <div style={{ color: '#A1A1AA', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
                Revenue Growth
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 76 }}>
                {[
                  { y: '2020', h: 40 }, { y: '2021', h: 54 },
                  { y: '2022', h: 66 }, { y: '2023', h: 81 }, { y: '2024', h: 100 },
                ].map((bar, i) => (
                  <div key={bar.y} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                    <div style={{
                      width: '100%',
                      height: `${Math.round(bar.h * 0.72)}px`,
                      background: i === 4 ? color : '#E4E4E7',
                      borderRadius: '3px 3px 0 0',
                      transition: 'height 0.4s ease',
                    }} />
                    <div style={{ color: '#A1A1AA', fontSize: 9.5 }}>{bar.y}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Market share donut */}
            <div style={{ padding: '14px 16px', borderRadius: 12, background: '#fff', border: '1px solid #E4E4E7' }}>
              <div style={{ marginBottom: 12 }}>
                <div style={{ color: '#A1A1AA', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
                  Market Share
                </div>
                <div style={{ color: '#09090B', fontSize: 12, fontWeight: 700, letterSpacing: '-0.02em' }}>
                  {marketLabel} Market
                </div>
              </div>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                {/* Donut via conic-gradient */}
                <div style={{
                  width: 88, height: 88, borderRadius: '50%',
                  background: donut,
                  flexShrink: 0, position: 'relative',
                }}>
                  <div style={{
                    position: 'absolute', top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 52, height: 52, borderRadius: '50%', background: '#fff',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#09090B', lineHeight: 1 }}>34%</div>
                    <div style={{ fontSize: 8, color: '#A1A1AA', marginTop: 1 }}>#1</div>
                  </div>
                </div>
                {/* Legend */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {MARKET.map(m => (
                    <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 7, height: 7, borderRadius: 2, background: m.clr, flexShrink: 0 }} />
                      <div style={{ flex: 1, color: '#52525B', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
                      <div style={{ color: m.clr === color ? color : '#71717A', fontSize: 11, fontWeight: m.clr === color ? 700 : 400 }}>{m.pct}%</div>
                    </div>
                  ))}
                </div>
              </div>
              {/* TAM/SAM/SOM */}
              <div style={{ marginTop: 11, paddingTop: 10, borderTop: '1px solid #F0F0F2', display: 'flex', gap: 16 }}>
                {[{ l: 'TAM', v: '$420B' }, { l: 'SAM', v: '$86B' }, { l: 'SOM', v: '$14B' }].map(m => (
                  <div key={m.l}>
                    <div style={{ color: '#09090B', fontSize: 12, fontWeight: 800, letterSpacing: '-0.02em' }}>{m.v}</div>
                    <div style={{ color: '#A1A1AA', fontSize: 9.5 }}>{m.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Revenue streams + Business units ──────────────── */}
          <div className="co-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>

            {/* Revenue streams */}
            <div style={{ padding: '14px 16px', borderRadius: 12, background: '#fff', border: '1px solid #E4E4E7' }}>
              <div style={{ color: '#A1A1AA', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                Revenue Streams
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {STREAMS.map(s => (
                  <div key={s.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ color: '#52525B', fontSize: 11.5 }}>{s.name}</span>
                      <span style={{ color: '#09090B', fontSize: 11.5, fontWeight: 700 }}>{s.pct}%</span>
                    </div>
                    <div style={{ height: 6, background: '#F0F0F2', borderRadius: 100, overflow: 'hidden' }}>
                      <div style={{ width: `${s.pct}%`, height: '100%', background: s.clr, borderRadius: 100, transition: 'width 0.6s cubic-bezier(0.22,1,0.36,1)' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Business units */}
            <div style={{ padding: '14px 16px', borderRadius: 12, background: '#fff', border: '1px solid #E4E4E7' }}>
              <div style={{ color: '#A1A1AA', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                Business Units
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {UNITS.map(u => (
                  <div key={u.name} style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: unitColor(u.status), flexShrink: 0, marginTop: 4 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: '#09090B', fontSize: 12, fontWeight: 600 }}>{u.name}</span>
                        <span style={{
                          padding: '1px 7px', borderRadius: 5, flexShrink: 0,
                          background: u.status === 'early' ? '#FEF3C7' : '#DCFCE7',
                          color: u.status === 'early' ? '#92400E' : '#15803D',
                          fontSize: 10, fontWeight: 700,
                        }}>{u.growth}</span>
                      </div>
                      <div style={{ color: '#A1A1AA', fontSize: 11, marginTop: 1 }}>{u.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )
    }

    case 'tools':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ color: '#09090B', fontSize: '16px', fontWeight: 700, letterSpacing: '-0.03em' }}>Internal Tools &amp; Tech Stack</div>
          {[
            { category: 'Engineering', tools: ['GitHub', 'Terraform', 'Datadog', 'PagerDuty', 'Buildkite'] },
            { category: 'Product & Design', tools: ['Figma', 'Linear', 'Notion', 'Mixpanel', 'FullStory'] },
            { category: 'Sales & CRM', tools: ['Salesforce', 'Gong', 'Outreach', 'ZoomInfo'] },
            { category: 'Infrastructure', tools: ['AWS', 'GCP', 'Cloudflare', 'Fastly', 'Snowflake'] },
          ].map(cat => (
            <div key={cat.category}>
              <div style={{ color: '#71717A', fontSize: '11.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>{cat.category}</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {cat.tools.map(t => (
                  <span key={t} style={{ padding: '5px 12px', borderRadius: '7px', background: '#F7F7F8', border: '1px solid #E4E4E7', color: '#374151', fontSize: '13px', fontWeight: 500 }}>{t}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )

    case 'processes':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ color: '#09090B', fontSize: '16px', fontWeight: 700, letterSpacing: '-0.03em' }}>Internal Processes</div>
          {[
            { title: 'Engineering Planning', detail: '6-week cycles with one-week cooldowns. Teams write detailed briefs before coding starts.', status: 'established' },
            { title: 'Design Review', detail: 'Weekly cross-functional design crits with product and engineering leadership.', status: 'established' },
            { title: 'Hiring Process', detail: '4-stage interview: resume → technical screen → systems design → culture fit + offer.', status: 'established' },
            { title: 'Incident Response', detail: 'On-call rotations with PagerDuty. 15-min P0 SLA, blameless post-mortems within 48h.', status: 'evolving' },
            { title: 'OKR Cadence', detail: 'Quarterly OKRs at company and team level. Monthly check-ins. Annual planning in October.', status: 'established' },
          ].map(p => (
            <div key={p.title} style={{ display: 'flex', gap: '12px', padding: '14px', borderRadius: '10px', background: '#F7F7F8', border: '1px solid #F0F0F2' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: p.status === 'established' ? '#10B981' : '#F59E0B', flexShrink: 0, marginTop: '4px' }} />
              <div>
                <div style={{ color: '#09090B', fontSize: '13.5px', fontWeight: 700, marginBottom: '3px' }}>{p.title}</div>
                <div style={{ color: '#71717A', fontSize: '12.5px', lineHeight: 1.5 }}>{p.detail}</div>
              </div>
            </div>
          ))}
        </div>
      )

    case 'product':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ padding: '18px', borderRadius: '12px', background: '#F5F3FF', border: '1px solid #DDD6FE' }}>
            <div style={{ color: '#6D28D9', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Core Product</div>
            <div style={{ color: '#09090B', fontSize: '15px', fontWeight: 800, marginBottom: '6px', letterSpacing: '-0.03em' }}>{company.category ?? 'Technology Platform'}</div>
            <div style={{ color: '#52525B', fontSize: '13px', lineHeight: 1.6 }}>{company.description ?? `${company.name} provides industry-leading solutions for enterprises and developers worldwide.`}</div>
          </div>
          <div className="co-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ padding: '16px', borderRadius: '12px', background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
              <div style={{ color: '#15803D', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Primary Users</div>
              {['Enterprises', 'Developers', 'SMBs', 'Startups'].map(u => (
                <div key={u} style={{ color: '#374151', fontSize: '12.5px', marginBottom: '3px' }}>• {u}</div>
              ))}
            </div>
            <div style={{ padding: '16px', borderRadius: '12px', background: '#FFF7ED', border: '1px solid #FED7AA' }}>
              <div style={{ color: '#C2410C', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Use Cases</div>
              {['Payments', 'Data', 'Communication', 'Infrastructure'].map(u => (
                <div key={u} style={{ color: '#374151', fontSize: '12.5px', marginBottom: '3px' }}>• {u}</div>
              ))}
            </div>
          </div>
          <div style={{ padding: '16px', borderRadius: '12px', background: '#fff', border: '1px solid #E4E4E7' }}>
            <div style={{ color: '#71717A', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Key Differentiators</div>
            {[`${company.name} is API-first — integrate in hours`, 'ML-powered automation and intelligence', 'Global scale with local compliance', 'World-class developer experience & docs'].map(d => (
              <div key={d} style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                <span style={{ color: '#7C3AED', fontSize: '12px', lineHeight: 1.4, flexShrink: 0 }}>✓</span>
                <span style={{ color: '#374151', fontSize: '13px', lineHeight: 1.5 }}>{d}</span>
              </div>
            ))}
          </div>
        </div>
      )
  }
}

export default function CompanyFull({ company }: { company: Company }) {
  const [activeSection, setActiveSection] = useState<SectionId>('overview')
  const [animKey, setAnimKey] = useState(0)
  const color = company.logo_color ?? '#7C3AED'

  function changeSection(id: SectionId) {
    setActiveSection(id)
    setAnimKey(k => k + 1)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAFA' }}>
      {/* Breadcrumb */}
      <div style={{ background: '#fff', borderBottom: '1px solid #F4F4F5' }}>
        <div className="company-breadcrumb" style={{ maxWidth: '1200px', margin: '0 auto', height: '44px', display: 'flex', alignItems: 'center', gap: '8px', padding: '0 24px' }}>
          <Link href="/" style={{ color: '#A1A1AA', textDecoration: 'none', fontSize: '13px', transition: 'color 0.15s' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#7C3AED'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#A1A1AA'}
          >Home</Link>
          <span style={{ color: '#D4D4D8', fontSize: '13px' }}>›</span>
          <span style={{ color: '#A1A1AA', fontSize: '13px' }}>{company.category}</span>
          <span style={{ color: '#D4D4D8', fontSize: '13px' }}>›</span>
          <span style={{ color: '#09090B', fontSize: '13px', fontWeight: 600 }}>{company.name}</span>
        </div>
      </div>

      {/* Mobile tab strip — hidden on desktop via CSS */}
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
            onClick={() => changeSection(nav.id)}
            style={{
              flexShrink: 0, padding: '7px 12px', borderRadius: '8px', border: 'none',
              background: activeSection === nav.id ? '#F5F3FF' : '#F4F4F5',
              color: activeSection === nav.id ? '#7C3AED' : '#52525B',
              fontSize: '12.5px', fontWeight: activeSection === nav.id ? 600 : 400,
              cursor: 'pointer', whiteSpace: 'nowrap',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {nav.icon} {nav.label}
          </button>
        ))}
      </div>

      {/* Main layout */}
      <div className="company-layout" style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 24px', display: 'grid', gridTemplateColumns: '220px 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Sidebar — hidden on mobile via CSS */}
        <div className="company-sidebar" style={{ position: 'sticky', top: '80px', background: '#fff', borderRadius: '14px', border: '1px solid #E4E4E7', padding: '12px 8px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
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
              <span style={{ fontSize: '12.5px', fontWeight: activeSection === nav.id ? 600 : 400, color: activeSection === nav.id ? '#7C3AED' : '#52525B' }}>
                {nav.label}
              </span>
            </button>
          ))}
        </div>

        {/* Content panel */}
        <div
          key={animKey}
          className="animate-tabIn company-panel"
          style={{ background: '#fff', borderRadius: '14px', border: '1px solid #E4E4E7', padding: '28px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', minHeight: '500px' }}
        >
          <SectionContent id={activeSection} company={company} />
        </div>
      </div>
    </div>
  )
}
