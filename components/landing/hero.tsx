'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import SearchAutocomplete from '@/components/SearchAutocomplete'
import { Building2, Network, TrendingUp, BarChart2, PieChart, Layers, Wrench, Settings, Package } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// ─── Logo helper ──────────────────────────────────────────────────────────────
const LOGOS: Record<string, { url: string; color: string }> = {
  // ── Local assets (always reliable) ──
  Google:      { url: '/logo/Google.svg',        color: '#4285F4' },
  Meta:        { url: '/logo/Meta.png',           color: '#0866FF' },
  Stripe:      { url: '/logo/Stripe.svg',         color: '#533AFD' },
  Airbnb:      { url: '/logo/Airbnb.svg',         color: '#FF385C' },
  Notion:      { url: '/logo/Notion.svg',         color: '#000'    },
  OpenAI:      { url: '/logo/OpenAI.svg',         color: '#000'    },
  Linear:      { url: '/logo/Linear.svg',         color: '#222326' },
  Figma:       { url: '/logo/Figma.svg',          color: '#F24E1E' },
  Anthropic:   { url: '/logo/Anthropic.svg',      color: '#181818' },
  Vercel:      { url: '/logo/Vercel.svg',         color: '#000'    },
  Canva:       { url: '/logo/Canva.jpeg',         color: '#00C4CC' },
  Databricks:  { url: '/logo/Databricks.svg',     color: '#FF3621' },
  // ── External — icon.horse (reliable, domain-based) ──
  Datadog:     { url: 'https://icon.horse/icon/datadoghq.com',   color: '#632CA6' },
  Slack:       { url: 'https://icon.horse/icon/slack.com',       color: '#4A154B' },
  GitHub:      { url: 'https://icon.horse/icon/github.com',      color: '#24292E' },
  PagerDuty:   { url: 'https://icon.horse/icon/pagerduty.com',   color: '#06AC38' },
  HashiCorp:   { url: 'https://icon.horse/icon/hashicorp.com',   color: '#7B42BC' },
  Retool:      { url: 'https://icon.horse/icon/retool.com',      color: '#3D63DD' },
  HubSpot:     { url: 'https://icon.horse/icon/hubspot.com',     color: '#FF7A59' },
  Shopify:     { url: 'https://icon.horse/icon/shopify.com',     color: '#96BF48' },
  Twilio:      { url: 'https://icon.horse/icon/twilio.com',      color: '#F22F46' },
  Snowflake:   { url: 'https://icon.horse/icon/snowflake.com',   color: '#29B5E8' },
  Salesforce:  { url: 'https://icon.horse/icon/salesforce.com',  color: '#00A1E0' },
  Atlassian:   { url: 'https://icon.horse/icon/atlassian.com',   color: '#0052CC' },
  Zoom:        { url: 'https://icon.horse/icon/zoom.us',         color: '#2D8CFF' },
  Adobe:       { url: 'https://icon.horse/icon/adobe.com',       color: '#FF0000' },
  Microsoft:   { url: 'https://icon.horse/icon/microsoft.com',   color: '#00A4EF' },
  Spotify:     { url: 'https://icon.horse/icon/spotify.com',     color: '#1DB954' },
  Netflix:     { url: 'https://icon.horse/icon/netflix.com',     color: '#E50914' },
  Uber:        { url: 'https://icon.horse/icon/uber.com',        color: '#000000' },
  Pinterest:   { url: 'https://icon.horse/icon/pinterest.com',   color: '#E60023' },
  Dropbox:     { url: 'https://icon.horse/icon/dropbox.com',     color: '#0061FF' },
}

function LogoImg({ name, size = 24, radius = 6 }: { name: string; size?: number; radius?: number }) {
  const [failed, setFailed] = useState(false)
  const entry = LOGOS[name]
  if (!entry || failed) {
    return (
      <div style={{ width: size, height: size, borderRadius: radius, background: entry?.color ?? '#E4E4E7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ color: '#fff', fontSize: size * 0.42, fontWeight: 800 }}>{name[0]}</span>
      </div>
    )
  }
  return (
    <div style={{ width: size, height: size, borderRadius: radius, background: '#fff', border: '1px solid #F0F0F2', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
      <Image src={entry.url} alt={name} width={size} height={size} style={{ objectFit: 'contain', width: '100%', height: '100%' }} unoptimized onError={() => setFailed(true)} />
    </div>
  )
}

// ─── Sidebar nav items ────────────────────────────────────────────
const NAV: { id: string; label: string; color: string; icon: LucideIcon }[] = [
  { id: 'overview',   label: 'Company Overview',  color: '#2563EB', icon: Building2  },
  { id: 'org',        label: 'Org Chart',          color: '#7C3AED', icon: Network    },
  { id: 'revenue',    label: 'Revenue',             color: '#16A34A', icon: TrendingUp },
  { id: 'revdept',    label: 'Revenue by Dept',     color: '#059669', icon: BarChart2  },
  { id: 'market',     label: 'Market Share',        color: '#EA580C', icon: PieChart   },
  { id: 'units',      label: 'Business Units',      color: '#F59E0B', icon: Layers     },
  { id: 'tools',      label: 'Internal Tools',      color: '#DC2626', icon: Wrench     },
  { id: 'processes',  label: 'Internal Processes',  color: '#06B6D4', icon: Settings   },
  { id: 'product',    label: 'Product Use Cases',    color: '#CA8A04', icon: Package    },
]
type SectionId = 'overview' | 'org' | 'revenue' | 'revdept' | 'market' | 'units' | 'tools' | 'processes' | 'product'

// ─── Section renderers ────────────────────────────────────────────

function CompanyOverview() {
  return (
    <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <LogoImg name="Stripe" size={38} radius={10} />
        <div style={{ flex: 1 }}>
          <div style={{ color: '#09090B', fontSize: '14px', fontWeight: 700 }}>Stripe, Inc.</div>
          <div style={{ color: '#71717A', fontSize: '11px' }}>Financial Infrastructure · San Francisco, CA · Founded 2010</div>
        </div>
        <div style={{ background: '#F0FDF4', color: '#16A34A', fontSize: '10.5px', fontWeight: 700, padding: '3px 9px', borderRadius: '100px', border: '1px solid #BBF7D0' }}>Public</div>
      </div>
      <p style={{ color: '#52525B', fontSize: '11.5px', lineHeight: 1.6, margin: 0, padding: '10px 12px', background: '#F7F7F8', borderRadius: '8px', border: '1px solid #F0F0F2' }}>
        Stripe builds economic infrastructure for the internet. Businesses of every size use it to accept payments, send payouts, and manage their finances online.
      </p>
      {/* Key stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '7px' }}>
        {[
          { label: 'Valuation', value: '$65B' },
          { label: 'Revenue', value: '$14.3B' },
          { label: 'Employees', value: '8,000+' },
          { label: 'Countries', value: '46' },
        ].map(s => (
          <div key={s.label} style={{ padding: '8px 10px', borderRadius: '8px', background: '#F7F7F8', border: '1px solid #F0F0F2', textAlign: 'center' }}>
            <div style={{ color: '#09090B', fontSize: '13px', fontWeight: 800, letterSpacing: '-0.03em' }}>{s.value}</div>
            <div style={{ color: '#A1A1AA', fontSize: '10px', marginTop: '2px' }}>{s.label}</div>
          </div>
        ))}
      </div>
      {/* Tags */}
      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
        {['Payments API', 'SaaS', 'B2B', 'Developer-first', 'Series I'].map(t => (
          <span key={t} style={{ padding: '3px 9px', borderRadius: '5px', background: '#eef4fb', border: '1px solid #a8cbe8', color: '#063f76', fontSize: '10.5px', fontWeight: 500 }}>{t}</span>
        ))}
      </div>
      {/* Recent news */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <div style={{ color: '#09090B', fontSize: '11px', fontWeight: 700, marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Recent News</div>
        {[
          { text: 'Stripe launches new AI-powered fraud detection suite', time: '2d ago' },
          { text: 'Headcount up 18% in Engineering this quarter', time: '1w ago' },
        ].map(n => (
          <div key={n.text} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', padding: '7px 10px', borderRadius: '7px', background: '#FAFAFA', border: '1px solid #F0F0F2' }}>
            <span style={{ color: '#374151', fontSize: '11px', lineHeight: 1.5 }}>{n.text}</span>
            <span style={{ color: '#A1A1AA', fontSize: '10px', flexShrink: 0 }}>{n.time}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function OrgChart() {
  return (
    <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* CEO node */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0' }}>
        <div style={{ padding: '8px 20px', borderRadius: '8px', background: '#063f76', color: '#fff', fontSize: '11.5px', fontWeight: 700, textAlign: 'center', boxShadow: '0 2px 8px rgba(6,63,118,0.25)', minWidth: '140px' }}>
          <div>Patrick Collison</div>
          <div style={{ fontWeight: 400, opacity: 0.75, fontSize: '10px', marginTop: '2px' }}>CEO & Co-founder</div>
        </div>
        <div style={{ width: '1px', height: '12px', background: '#a8cbe8' }} />
      </div>
      {/* L2 */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
        {[{ name: 'John Collison', title: 'President' }, { name: 'Dhivya S.', title: 'CFO' }, { name: 'David S.', title: 'CTO' }, { name: 'Will G.', title: 'CPO' }].map(p => (
          <div key={p.title} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0' }}>
            <div style={{ padding: '6px 10px', borderRadius: '7px', background: '#eef4fb', border: '1px solid #a8cbe8', fontSize: '10.5px', fontWeight: 600, color: '#04294f', textAlign: 'center', minWidth: '72px' }}>
              <div>{p.name}</div>
              <div style={{ fontWeight: 400, color: '#063f76', fontSize: '9.5px', marginTop: '1px' }}>{p.title}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ width: '100%', height: '1px', background: '#F0F0F2', margin: '2px 0' }} />
      {/* L3 departments */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
        {[
          { dept: 'Payments', lead: 'Jeanne DeWitt', count: '420', color: '#d4e8f6' },
          { dept: 'Risk & Compliance', lead: 'Bryan Duxbury', count: '280', color: '#FEF3C7' },
          { dept: 'Platform Eng', lead: 'Evan Broder', count: '350', color: '#DCFCE7' },
          { dept: 'Developer Exp', lead: 'Michelle Bu', count: '190', color: '#E0F2FE' },
          { dept: 'Financial Products', lead: 'Dileep Thazhmon', count: '240', color: '#FCE7F3' },
          { dept: 'Infrastructure', lead: 'Taylor Savage', count: '310', color: '#F3F4F6' },
        ].map(t => (
          <div key={t.dept} style={{ padding: '7px 9px', borderRadius: '7px', background: t.color, border: '1px solid rgba(0,0,0,0.04)' }}>
            <div style={{ color: '#09090B', fontSize: '10.5px', fontWeight: 700 }}>{t.dept}</div>
            <div style={{ color: '#52525B', fontSize: '9.5px', marginTop: '2px' }}>{t.lead}</div>
            <div style={{ color: '#A1A1AA', fontSize: '9.5px', marginTop: '1px' }}>{t.count} people</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Revenue() {
  const bars = [
    { year: '2020', value: 7.4, rev: '$7.4B' },
    { year: '2021', value: 10.2, rev: '$10.2B' },
    { year: '2022', value: 12.6, rev: '$12.6B' },
    { year: '2023', value: 14.3, rev: '$14.3B' },
    { year: '2024E', value: 17.5, rev: '$17.5B' },
  ]
  const max = 17.5
  return (
    <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '7px' }}>
        {[
          { label: 'Annual Revenue', value: '$14.3B', sub: '↑ 13% YoY', up: true },
          { label: 'Payment Volume', value: '$1.0T', sub: '↑ 25% YoY', up: true },
          { label: 'Net Revenue Rate', value: '1.4%', sub: 'of GMV', up: false },
        ].map(k => (
          <div key={k.label} style={{ padding: '9px 11px', borderRadius: '8px', background: '#F7F7F8', border: '1px solid #F0F0F2' }}>
            <div style={{ color: '#A1A1AA', fontSize: '10px', marginBottom: '3px' }}>{k.label}</div>
            <div style={{ color: '#09090B', fontSize: '15px', fontWeight: 800, letterSpacing: '-0.03em' }}>{k.value}</div>
            <div style={{ color: k.up ? '#16A34A' : '#71717A', fontSize: '10px', marginTop: '2px', fontWeight: 600 }}>{k.sub}</div>
          </div>
        ))}
      </div>
      {/* Bar chart */}
      <div style={{ padding: '12px', borderRadius: '10px', background: '#FAFAFA', border: '1px solid #F0F0F2' }}>
        <div style={{ color: '#09090B', fontSize: '11px', fontWeight: 700, marginBottom: '10px' }}>Annual Revenue (USD)</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '80px' }}>
          {bars.map(b => (
            <div key={b.year} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%', justifyContent: 'flex-end' }}>
              <div style={{ fontSize: '9.5px', color: '#063f76', fontWeight: 700 }}>{b.rev}</div>
              <div style={{
                width: '100%', borderRadius: '4px 4px 0 0',
                background: b.year === '2024E' ? 'repeating-linear-gradient(45deg, #a8cbe8, #a8cbe8 3px, #d4e8f6 3px, #d4e8f6 6px)' : '#063f76',
                height: `${(b.value / max) * 62}px`,
                opacity: b.year === '2024E' ? 0.9 : 1,
                border: b.year === '2024E' ? '1px dashed #609dd6' : 'none',
                transition: 'opacity 0.2s',
              }} />
              <div style={{ fontSize: '9.5px', color: '#A1A1AA', fontWeight: 500 }}>{b.year}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function RevenueByDept() {
  const depts = [
    { name: 'Payments Core', pct: 68, amount: '$9.7B', color: '#063f76' },
    { name: 'Stripe Treasury', pct: 15, amount: '$2.1B', color: '#609dd6' },
    { name: 'Radar & Risk', pct: 9, amount: '$1.3B', color: '#86bce0' },
    { name: 'Billing & Revenue', pct: 5, amount: '$0.7B', color: '#a8cbe8' },
    { name: 'Other Products', pct: 3, amount: '$0.5B', color: '#d4e8f6' },
  ]
  return (
    <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ color: '#09090B', fontSize: '12px', fontWeight: 700 }}>Revenue Breakdown by Business Line</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {depts.map(d => (
          <div key={d.name}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: d.color, flexShrink: 0 }} />
                <span style={{ color: '#374151', fontSize: '11.5px', fontWeight: 500 }}>{d.name}</span>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{ color: '#09090B', fontSize: '11.5px', fontWeight: 700 }}>{d.amount}</span>
                <span style={{ color: '#A1A1AA', fontSize: '11px', minWidth: '28px', textAlign: 'right' }}>{d.pct}%</span>
              </div>
            </div>
            <div style={{ height: '6px', borderRadius: '3px', background: '#F0F0F2', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: '3px', background: d.color, width: `${d.pct}%`, transition: 'width 0.5s ease' }} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: '9px 12px', borderRadius: '8px', background: '#eef4fb', border: '1px solid #a8cbe8', marginTop: '2px' }}>
        <div style={{ color: '#04294f', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          Insight: Payments Core dominates but Treasury growing fastest at 38% YoY
        </div>
      </div>
    </div>
  )
}

function MarketShare() {
  const segments = [
    { name: 'PayPal', pct: 32, color: '#003087' },
    { name: 'Stripe', pct: 22, color: '#063f76' },
    { name: 'Adyen', pct: 12, color: '#0ABF53' },
    { name: 'Square', pct: 9, color: '#3E4348' },
    { name: 'Others', pct: 25, color: '#E4E4E7' },
  ]
  // Build conic gradient
  let cumulative = 0
  const conicParts = segments.map(s => {
    const start = cumulative
    cumulative += s.pct
    return `${s.color} ${start}% ${cumulative}%`
  })
  return (
    <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ color: '#09090B', fontSize: '12px', fontWeight: 700 }}>Online Payments Market Share (2024)</div>
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        {/* Donut chart */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{
            width: '90px', height: '90px', borderRadius: '50%',
            background: `conic-gradient(${conicParts.join(', ')})`,
          }} />
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)',
            width: '52px', height: '52px', borderRadius: '50%',
            background: '#fff', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ color: '#063f76', fontSize: '13px', fontWeight: 800 }}>22%</div>
            <div style={{ color: '#A1A1AA', fontSize: '8.5px' }}>Stripe</div>
          </div>
        </div>
        {/* Legend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
          {segments.map(s => (
            <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: '7px', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: s.color, flexShrink: 0 }} />
                <span style={{ color: s.name === 'Stripe' ? '#063f76' : '#374151', fontSize: '11.5px', fontWeight: s.name === 'Stripe' ? 700 : 400 }}>{s.name}</span>
              </div>
              <span style={{ color: '#09090B', fontSize: '11.5px', fontWeight: 700 }}>{s.pct}%</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px' }}>
        {[
          { label: 'TAM (2024)', value: '$2.3T' },
          { label: 'YoY Share Gain', value: '+1.8pp' },
          { label: 'Enterprise Win Rate', value: '74%' },
          { label: 'NPS Score', value: '68' },
        ].map(m => (
          <div key={m.label} style={{ padding: '8px 10px', borderRadius: '7px', background: '#F7F7F8', border: '1px solid #F0F0F2' }}>
            <div style={{ color: '#A1A1AA', fontSize: '10px' }}>{m.label}</div>
            <div style={{ color: '#09090B', fontSize: '13px', fontWeight: 800, marginTop: '1px' }}>{m.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function BusinessUnits() {
  const units = [
    { name: 'Stripe Payments', desc: 'Core payment processing APIs for online and in-person transactions', revenue: '$9.7B', growth: '+11%', tag: 'Core' },
    { name: 'Stripe Treasury', desc: 'Banking-as-a-service: accounts, cards, and money movement', revenue: '$2.1B', growth: '+38%', tag: 'Growing' },
    { name: 'Stripe Radar', desc: 'ML-powered fraud detection and prevention engine', revenue: '$1.3B', growth: '+19%', tag: 'Growing' },
    { name: 'Stripe Billing', desc: 'Subscription and recurring revenue management platform', revenue: '$0.7B', growth: '+24%', tag: 'Growing' },
    { name: 'Stripe Atlas', desc: 'Company formation and global incorporation for startups', revenue: '$0.3B', growth: '+8%', tag: 'Strategic' },
  ]
  return (
    <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
      <div style={{ color: '#09090B', fontSize: '12px', fontWeight: 700, marginBottom: '2px' }}>5 Active Business Units</div>
      {units.map(u => (
        <div key={u.name} style={{ padding: '10px 12px', borderRadius: '9px', background: '#FAFAFA', border: '1px solid #F0F0F2', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '3px' }}>
              <span style={{ color: '#09090B', fontSize: '12px', fontWeight: 700 }}>{u.name}</span>
              <span style={{
                padding: '2px 7px', borderRadius: '4px', fontSize: '10px', fontWeight: 600,
                background: u.tag === 'Core' ? '#d4e8f6' : u.tag === 'Growing' ? '#DCFCE7' : '#FEF9C3',
                color: u.tag === 'Core' ? '#04294f' : u.tag === 'Growing' ? '#15803D' : '#92400E',
                border: u.tag === 'Core' ? '1px solid #a8cbe8' : u.tag === 'Growing' ? '1px solid #BBF7D0' : '1px solid #FDE68A',
              }}>{u.tag}</span>
            </div>
            <div style={{ color: '#71717A', fontSize: '11px', lineHeight: 1.5 }}>{u.desc}</div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ color: '#09090B', fontSize: '12px', fontWeight: 700 }}>{u.revenue}</div>
            <div style={{ color: '#16A34A', fontSize: '10.5px', fontWeight: 600, marginTop: '1px' }}>{u.growth}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

function InternalTools() {
  const tools = [
    { name: 'Linear', category: 'Project Mgmt', color: '#5E6AD2' },
    { name: 'Notion', category: 'Docs & Wiki', color: '#000' },
    { name: 'Figma', category: 'Design', color: '#F24E1E' },
    { name: 'Datadog', category: 'Monitoring', color: '#632CA6' },
    { name: 'Slack', category: 'Communication', color: '#4A154B' },
    { name: 'GitHub', category: 'Version Control', color: '#24292E' },
    { name: 'PagerDuty', category: 'Incident Mgmt', color: '#06AC38' },
    { name: 'Terraform', category: 'Infrastructure', color: '#7B42BC' },
    { name: 'Retool', category: 'Internal Apps', color: '#3D63DD' },
    { name: 'Hex', category: 'Data Analytics', color: '#FF6B35' },
  ]
  return (
    <div style={{ padding: '14px' }}>
      <div style={{ color: '#09090B', fontSize: '12px', fontWeight: 700, marginBottom: '10px' }}>Confirmed Internal Stack · {tools.length} tools</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
        {tools.map(t => (
          <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '8px 10px', borderRadius: '8px', background: '#FAFAFA', border: '1px solid #F0F0F2' }}>
            <LogoImg name={t.name} size={24} radius={6} />
            <div>
              <div style={{ color: '#09090B', fontSize: '11.5px', fontWeight: 600 }}>{t.name}</div>
              <div style={{ color: '#A1A1AA', fontSize: '10px', marginTop: '1px' }}>{t.category}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function InternalProcesses() {
  const processes = [
    { title: 'Engineering Sprints', detail: '2-week cycles · Linear for tracking', status: 'green' },
    { title: 'Code Review Policy', detail: '2 engineer approval required on all PRs', status: 'green' },
    { title: 'On-call Rotation', detail: 'PagerDuty · weekly rotation · 15-min SLA on P0', status: 'yellow' },
    { title: 'RFC Process', detail: 'Written proposals for all major architecture changes', status: 'green' },
    { title: 'Quarterly OKRs', detail: 'Set at company, team, and individual level', status: 'green' },
    { title: 'Incident Response', detail: 'P0 → 5-min ack · post-mortems required', status: 'red' },
    { title: 'Hiring Process', detail: '5-stage loop: screen → tech → system design → culture → offer', status: 'green' },
    { title: 'Deployment Cadence', detail: 'Continuous deploy via Buildkite · feature flags via LaunchDarkly', status: 'green' },
  ]
  const dot: Record<string, string> = { green: '#22C55E', yellow: '#F59E0B', red: '#EF4444' }
  return (
    <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <div style={{ color: '#09090B', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Documented Internal Processes</div>
      {processes.map(p => (
        <div key={p.title} style={{ display: 'flex', alignItems: 'flex-start', gap: '9px', padding: '8px 10px', borderRadius: '7px', background: '#FAFAFA', border: '1px solid #F0F0F2' }}>
          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: dot[p.status], flexShrink: 0, marginTop: '3px' }} />
          <div>
            <div style={{ color: '#09090B', fontSize: '11.5px', fontWeight: 600 }}>{p.title}</div>
            <div style={{ color: '#71717A', fontSize: '10.5px', lineHeight: 1.5, marginTop: '1px' }}>{p.detail}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

function ProductUseCase() {
  return (
    <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '9px' }}>
      <div style={{ padding: '11px 13px', borderRadius: '9px', background: '#eef4fb', border: '1px solid #a8cbe8' }}>
        <div style={{ color: '#04294f', fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '5px' }}>Core Product</div>
        <div style={{ color: '#09090B', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>Payments Infrastructure & Financial Stack</div>
        <div style={{ color: '#52525B', fontSize: '11px', lineHeight: 1.6 }}>Stripe processes online and in-person payments for businesses. Its API-first approach lets developers integrate payments in hours, not months.</div>
      </div>
      <div style={{ padding: '11px 13px', borderRadius: '9px', background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
        <div style={{ color: '#15803D', fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '5px' }}>Who Uses It</div>
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
          {['SaaS', 'Marketplaces', 'E-commerce', 'Platforms', 'Non-profits', 'Enterprises'].map(u => (
            <span key={u} style={{ padding: '3px 8px', borderRadius: '5px', background: '#fff', border: '1px solid #BBF7D0', color: '#15803D', fontSize: '10.5px', fontWeight: 500 }}>{u}</span>
          ))}
        </div>
      </div>
      <div style={{ padding: '11px 13px', borderRadius: '9px', background: '#FAFAFA', border: '1px solid #F0F0F2' }}>
        <div style={{ color: '#71717A', fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Key Differentiators</div>
        {['Developer-first API — integrate in hours, not months', 'ML-powered fraud prevention (Radar) with 99.98% accuracy', '135+ currencies, local payment methods in 46 countries', 'Full financial stack: payments → banking → billing → taxes'].map(d => (
          <div key={d} style={{ display: 'flex', gap: '7px', alignItems: 'flex-start', marginBottom: '4px' }}>
            <span style={{ color: '#063f76', fontSize: '11px', lineHeight: 1.4, flexShrink: 0, marginTop: '1px' }}>✓</span>
            <span style={{ color: '#374151', fontSize: '11px', lineHeight: 1.5 }}>{d}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────
export default function Hero() {
  const [activeSection, setActiveSection] = useState<SectionId>('overview')

  const sectionContent: Record<SectionId, React.ReactNode> = {
    overview:   <CompanyOverview />,
    org:        <OrgChart />,
    revenue:    <Revenue />,
    revdept:    <RevenueByDept />,
    market:     <MarketShare />,
    units:      <BusinessUnits />,
    tools:      <InternalTools />,
    processes:  <InternalProcesses />,
    product:    <ProductUseCase />,
  }

  return (
    <section className="hero-section" style={{
      paddingTop: '48px', paddingBottom: '72px',
      paddingLeft: '24px', paddingRight: '0',
      background: '#fff', position: 'relative', overflow: 'visible',
    }}>
      <div style={{
        position: 'absolute', top: '-80px', right: '-60px',
        width: '480px', height: '480px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(6,63,118,0.05) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div className="hero-container" style={{ maxWidth: '1440px', margin: '0 auto', paddingRight: '0', position: 'relative' }}>
        <div className="hero-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 520px) 1fr',
          gap: '48px',
          alignItems: 'center',
          paddingLeft: 'max(0px, calc((100% - 1200px) / 2))',
        }}>
          {/* ── Left: text ── */}
          <div style={{ paddingRight: '0' }}>
            <div className="animate-fadeUp delay-0" style={{
              display: 'inline-flex', alignItems: 'center', gap: '7px',
              padding: '5px 12px 5px 6px', borderRadius: '100px',
              background: '#eef4fb', border: '1px solid #a8cbe8', marginBottom: '24px',
            }}>
              <span style={{ background: '#063f76', color: '#fff', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '100px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>New</span>
              <span style={{ color: '#04294f', fontSize: '13px', fontWeight: 500 }}>Deep org chart data now available</span>
            </div>

            <h1 className="animate-fadeUp delay-75" style={{
              fontSize: 'clamp(30px, 3.5vw, 50px)', fontWeight: 800,
              lineHeight: 1.1, letterSpacing: '-0.04em', color: '#09090B', margin: '0 0 18px',
            }}>
              Turn company research<br />into your{' '}
              <span style={{ background: 'linear-gradient(135deg, #063f76 0%, #609dd6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                job search edge.
              </span>
            </h1>

            <p className="animate-fadeUp delay-150" style={{ color: '#52525B', fontSize: '15.5px', lineHeight: 1.7, margin: '0 0 28px', maxWidth: '460px' }}>
              Get access to org charts, revenue breakdowns, market share, business units, internal tools &amp; processes, and product use cases — everything to walk in fully prepared.
            </p>

            {/* Search bar */}
            <div className="animate-fadeUp delay-225" style={{ marginBottom: '12px', position: 'relative', zIndex: 10 }}>
              <SearchAutocomplete
                placeholder="Search any company — Google, Stripe, Airbnb..."
                size="lg"
              />
            </div>

            {/* Popular chips */}
            <div className="animate-fadeUp delay-300 hero-chips" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '24px' }}>
              <span style={{ color: '#A1A1AA', fontSize: '12px' }}>Popular:</span>
              {['Google', 'Stripe', 'Notion', 'Airbnb', 'OpenAI'].map(co => (
                <Link key={co} href={`/company/${co.toLowerCase()}`}
                  style={{ background: 'none', border: '1px solid #E4E4E7', borderRadius: '6px', padding: '3px 9px', fontSize: '12px', color: '#52525B', textDecoration: 'none', cursor: 'pointer', transition: 'border-color 0.15s, color 0.15s, background 0.15s' }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = '#063f76'; el.style.color = '#063f76'; el.style.background = '#eef4fb' }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = '#E4E4E7'; el.style.color = '#52525B'; el.style.background = 'none' }}
                >{co}</Link>
              ))}
            </div>

            <div className="animate-fadeUp delay-375" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <Link href="/signup"
                style={{ color: '#fff', textDecoration: 'none', fontSize: '14px', fontWeight: 600, padding: '11px 22px', borderRadius: '10px', background: '#063f76', boxShadow: '0 1px 4px rgba(6,63,118,0.3)', transition: 'background 0.15s, transform 0.1s' }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = '#04294f'; el.style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = '#063f76'; el.style.transform = 'translateY(0)' }}
              >Start for free</Link>
              <span style={{ color: '#A1A1AA', fontSize: '13px' }}>No credit card required</span>
            </div>
          </div>

          {/* ── Right: Full-bleed tabbed mockup ── */}
          <div className="animate-fadeUp delay-150 hero-mockup" style={{
            borderRadius: '16px 0 0 16px',
            border: '1px solid #E4E4E7',
            borderRight: 'none',
            background: '#fff',
            overflow: 'hidden',
            boxShadow: '-8px 8px 40px rgba(0,0,0,0.08)',
            height: '520px',
            display: 'flex',
            flexDirection: 'column',
          }}>
            {/* Titlebar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 14px', borderBottom: '1px solid #F4F4F5', background: '#FAFAFA', flexShrink: 0 }}>
              {['#FF5F57','#FEBC2E','#28C840'].map((c, i) => (
                <div key={i} style={{ width: '9px', height: '9px', borderRadius: '50%', background: c }} />
              ))}
              <div style={{ marginLeft: '8px', flex: 1, height: '22px', borderRadius: '5px', background: '#F0F0F2', display: 'flex', alignItems: 'center', paddingLeft: '10px', gap: '7px' }}>
                <LogoImg name="Stripe" size={12} radius={3} />
                <span style={{ color: '#71717A', fontSize: '11px' }}>researchorg.com/company/stripe</span>
              </div>
            </div>

            {/* App body: sidebar + content */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
              {/* Sidebar */}
              <div style={{ width: '152px', borderRight: '1px solid #F4F4F5', background: '#FAFAFA', padding: '10px 6px', display: 'flex', flexDirection: 'column', gap: '1px', flexShrink: 0, overflowY: 'auto' }}>
                <div style={{ padding: '4px 8px', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <LogoImg name="Stripe" size={20} radius={5} />
                    <span style={{ color: '#09090B', fontSize: '11.5px', fontWeight: 700 }}>Stripe</span>
                  </div>
                </div>
                {NAV.map(item => (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id as SectionId)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '7px',
                      padding: '6px 8px', borderRadius: '6px', border: 'none',
                      background: activeSection === item.id ? '#d4e8f6' : 'transparent',
                      color: activeSection === item.id ? '#04294f' : '#71717A',
                      fontSize: '11px', fontWeight: activeSection === item.id ? 600 : 400,
                      cursor: 'pointer', textAlign: 'left', width: '100%',
                      transition: 'background 0.1s, color 0.1s',
                    }}
                    onMouseEnter={e => { if (activeSection !== item.id) { (e.currentTarget as HTMLElement).style.background = '#F4F4F5'; (e.currentTarget as HTMLElement).style.color = '#09090B' } }}
                    onMouseLeave={e => { if (activeSection !== item.id) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#71717A' } }}
                  >
                    <item.icon size={12} color={activeSection === item.id ? item.color : '#A1A1AA'} strokeWidth={1.75} style={{ flexShrink: 0 }} />
                    <span style={{ lineHeight: 1.3 }}>{item.label}</span>
                  </button>
                ))}
              </div>

              {/* Content */}
              <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
                {sectionContent[activeSection]}
              </div>
            </div>
          </div>
        </div>

        {/* Logo strip */}
        <div className="hero-logo-strip" style={{ marginTop: '56px', paddingTop: '32px', borderTop: '1px solid #F4F4F5', paddingRight: '24px', paddingLeft: 'max(24px, calc((100% - 1200px) / 2))' }}>
          <p style={{ color: '#A1A1AA', fontSize: '12px', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '24px' }}>
            Used by job seekers researching teams at
          </p>
          <div className="hero-logo-strip-inner" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '36px', flexWrap: 'wrap' }}>
            {['Google', 'Meta', 'Stripe', 'Airbnb', 'Notion', 'OpenAI'].map(name => (
              <Link key={name} href={`/company/${name.toLowerCase()}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', opacity: 0.55, transition: 'opacity 0.15s', textDecoration: 'none' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '0.55'}
              >
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fff', border: '1px solid #E4E4E7', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                  <LogoImg name={name} size={36} radius={10} />
                </div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#A1A1AA', letterSpacing: '-0.01em' }}>{name}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
