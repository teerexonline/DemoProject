'use client'

import { useState } from 'react'
import Link from 'next/link'

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
  { id: 'revenue',    label: 'Revenue',             icon: '💰' },
  { id: 'revdept',    label: 'Revenue by Dept',     icon: '📊' },
  { id: 'market',     label: 'Market Share',        icon: '🥧' },
  { id: 'units',      label: 'Business Units',      icon: '🔷' },
  { id: 'tools',      label: 'Internal Tools',      icon: '🔧' },
  { id: 'processes',  label: 'Internal Processes',  icon: '⚙️' },
  { id: 'product',    label: 'Product Use Case',    icon: '🎯' },
] as const
type SectionId = typeof NAV[number]['id']

function SectionContent({ id, company }: { id: SectionId; company: Company }) {
  const color = company.logo_color ?? '#7C3AED'

  switch (id) {
    case 'overview':
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
              { label: 'Employees', value: company.employees ? company.employees >= 1000 ? `${(company.employees/1000).toFixed(0)}k+` : `${company.employees}` : '—' },
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
        </div>
      )

    case 'org':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'inline-block', padding: '10px 28px', borderRadius: '10px', background: color, color: '#fff', fontWeight: 700, fontSize: '13px', boxShadow: `0 4px 12px ${color}40` }}>
              CEO &amp; Co-founder<br />
              <span style={{ fontSize: '11px', fontWeight: 400, opacity: 0.8 }}>{company.name} Leadership</span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
            {['President', 'CFO', 'CTO', 'CPO', 'CMO', 'CLO', 'CHRO', 'CRO'].map(title => (
              <div key={title} style={{ padding: '12px', borderRadius: '10px', background: '#F5F3FF', border: '1px solid #DDD6FE', textAlign: 'center' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#E5E7EB', margin: '0 auto 8px' }} />
                <div style={{ color: '#6D28D9', fontSize: '11.5px', fontWeight: 700 }}>{title}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {['Engineering', 'Product', 'Design', 'Sales', 'Marketing', 'Operations'].map(dept => (
              <div key={dept} style={{ padding: '12px 14px', borderRadius: '10px', background: '#fff', border: '1px solid #E4E4E7' }}>
                <div style={{ color: '#09090B', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>{dept}</div>
                <div style={{ color: '#A1A1AA', fontSize: '11.5px' }}>{Math.floor(Math.random() * 300 + 50)} people</div>
              </div>
            ))}
          </div>
        </div>
      )

    case 'revenue':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {[
              { label: 'Annual Revenue', value: company.revenue ?? '$—', change: '+24%' },
              { label: 'YoY Growth', value: '24%', change: '+5pp' },
              { label: 'Revenue / Employee', value: '$1.8M', change: '+12%' },
            ].map(m => (
              <div key={m.label} style={{ padding: '20px', borderRadius: '12px', background: '#F7F7F8', border: '1px solid #F0F0F2' }}>
                <div style={{ color: '#A1A1AA', fontSize: '11.5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>{m.label}</div>
                <div style={{ color: '#09090B', fontSize: '24px', fontWeight: 800, letterSpacing: '-0.04em' }}>{m.value}</div>
                <div style={{ color: '#16A34A', fontSize: '12px', fontWeight: 600, marginTop: '4px' }}>{m.change} vs last year</div>
              </div>
            ))}
          </div>
          <div style={{ padding: '20px', borderRadius: '12px', background: '#fff', border: '1px solid #E4E4E7' }}>
            <div style={{ color: '#09090B', fontSize: '13px', fontWeight: 700, marginBottom: '14px' }}>Revenue Growth (Last 5 Years)</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', height: '100px' }}>
              {[40, 58, 72, 84, 100].map((pct, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '100%', background: i === 4 ? color : '#E4E4E7', borderRadius: '4px 4px 0 0', height: `${pct}px`, transition: 'height 0.4s' }} />
                  <div style={{ color: '#A1A1AA', fontSize: '10.5px' }}>{2020 + i}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )

    case 'revdept':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ color: '#09090B', fontSize: '16px', fontWeight: 700, letterSpacing: '-0.03em' }}>Revenue by Department</div>
          {[
            { dept: 'Core Product / Services', pct: 62, color },
            { dept: 'Enterprise & Partnerships', pct: 22, color: '#06B6D4' },
            { dept: 'Platform & APIs', pct: 11, color: '#F59E0B' },
            { dept: 'Other / Misc', pct: 5, color: '#10B981' },
          ].map(d => (
            <div key={d.dept} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '120px', color: '#52525B', fontSize: '13px', flexShrink: 0 }}>{d.dept}</div>
              <div style={{ flex: 1, height: '10px', background: '#F0F0F2', borderRadius: '100px', overflow: 'hidden' }}>
                <div style={{ width: `${d.pct}%`, height: '100%', background: d.color, borderRadius: '100px', transition: 'width 0.6s cubic-bezier(0.22,1,0.36,1)' }} />
              </div>
              <div style={{ width: '36px', textAlign: 'right', color: '#09090B', fontSize: '13px', fontWeight: 700 }}>{d.pct}%</div>
            </div>
          ))}
        </div>
      )

    case 'market':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ color: '#09090B', fontSize: '16px', fontWeight: 700, letterSpacing: '-0.03em' }}>Market Share Analysis</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            {[
              { name: company.name, share: '34%', color },
              { name: 'Competitor A', share: '28%', color: '#E5E7EB' },
              { name: 'Competitor B', share: '19%', color: '#E5E7EB' },
              { name: 'Others', share: '19%', color: '#E5E7EB' },
            ].map(c => (
              <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', borderRadius: '10px', background: c.color === color ? '#F5F3FF' : '#F7F7F8', border: `1px solid ${c.color === color ? '#DDD6FE' : '#F0F0F2'}` }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                <div style={{ flex: 1, color: '#374151', fontSize: '13px', fontWeight: c.color === color ? 700 : 400 }}>{c.name}</div>
                <div style={{ color: c.color === color ? color : '#71717A', fontSize: '16px', fontWeight: 800 }}>{c.share}</div>
              </div>
            ))}
          </div>
          <div style={{ padding: '16px', borderRadius: '12px', background: '#F5F3FF', border: '1px solid #DDD6FE' }}>
            <div style={{ color: '#7C3AED', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>TAM / SAM / SOM</div>
            <div style={{ display: 'flex', gap: '16px' }}>
              {[{ l: 'TAM', v: '$420B' }, { l: 'SAM', v: '$86B' }, { l: 'SOM', v: '$14B' }].map(m => (
                <div key={m.l}>
                  <div style={{ color: '#09090B', fontSize: '18px', fontWeight: 800, letterSpacing: '-0.03em' }}>{m.v}</div>
                  <div style={{ color: '#A1A1AA', fontSize: '11px' }}>{m.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )

    case 'units':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ color: '#09090B', fontSize: '16px', fontWeight: 700, letterSpacing: '-0.03em' }}>Business Units</div>
          {[
            { name: 'Core Platform', status: 'primary', description: 'Main product serving the majority of customers. Drives ~62% of revenue.', growth: '+24%' },
            { name: 'Enterprise Division', status: 'growing', description: 'Dedicated enterprise sales and custom integration team.', growth: '+41%' },
            { name: 'Developer Tools', status: 'growing', description: 'SDKs, APIs, and developer platform for third-party integrations.', growth: '+18%' },
            { name: 'Emerging Products', status: 'early', description: 'New bets and experimental product lines.', growth: 'Early' },
          ].map(u => (
            <div key={u.name} style={{ padding: '16px', borderRadius: '12px', background: '#fff', border: '1px solid #E4E4E7', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', marginTop: '4px', flexShrink: 0, background: u.status === 'primary' ? color : u.status === 'growing' ? '#10B981' : '#F59E0B' }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <div style={{ color: '#09090B', fontSize: '14px', fontWeight: 700 }}>{u.name}</div>
                  <div style={{ color: '#16A34A', fontSize: '12px', fontWeight: 600 }}>{u.growth}</div>
                </div>
                <div style={{ color: '#71717A', fontSize: '12.5px', lineHeight: 1.5 }}>{u.description}</div>
              </div>
            </div>
          ))}
        </div>
      )

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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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
        </div>
      </div>

      {/* Main layout */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px', display: 'grid', gridTemplateColumns: '220px 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Sidebar */}
        <div style={{ position: 'sticky', top: '80px', background: '#fff', borderRadius: '14px', border: '1px solid #E4E4E7', padding: '12px 8px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          {/* Company header */}
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
          className="animate-tabIn"
          style={{ background: '#fff', borderRadius: '14px', border: '1px solid #E4E4E7', padding: '28px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', minHeight: '500px' }}
        >
          <SectionContent id={activeSection} company={company} />
        </div>
      </div>
    </div>
  )
}
