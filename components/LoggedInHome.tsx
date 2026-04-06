'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'
import SearchAutocomplete from '@/components/SearchAutocomplete'
import SaveButton from '@/components/SaveButton'
import CompanyLogo from '@/components/CompanyLogo'

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
}

interface Props {
  user: User
  plan: string
  companies: Company[]
  isPro: boolean
  savedIds: string[]
}

// ─── Data ────────────────────────────────────────────────────────────────────

const FALLBACK: Company[] = [
  { id: '1',  name: 'Stripe',     slug: 'stripe',     category: 'Fintech',        description: 'Global payment infrastructure for the internet.',             logo_color: '#635BFF', logo_url: null, employees: 7000,  founded: 2010, hq: 'San Francisco, CA', valuation: '$65B'    },
  { id: '2',  name: 'Linear',     slug: 'linear',     category: 'SaaS',           description: 'Issue tracking built for high-performance teams.',             logo_color: '#5E6AD2', logo_url: null, employees: 80,    founded: 2019, hq: 'San Francisco, CA', valuation: '$1.2B'   },
  { id: '3',  name: 'Vercel',     slug: 'vercel',     category: 'Infrastructure', description: 'The platform for frontend developers.',                        logo_color: '#000000', logo_url: null, employees: 400,   founded: 2015, hq: 'San Francisco, CA', valuation: '$3.25B'  },
  { id: '4',  name: 'Figma',      slug: 'figma',      category: 'SaaS',           description: 'Collaborative design for all.',                                logo_color: '#F24E1E', logo_url: null, employees: 1000,  founded: 2012, hq: 'San Francisco, CA', valuation: '$20B'    },
  { id: '5',  name: 'Notion',     slug: 'notion',     category: 'SaaS',           description: 'The connected workspace for notes, docs, and tasks.',          logo_color: '#191919', logo_url: null, employees: 400,   founded: 2016, hq: 'San Francisco, CA', valuation: '$10B'    },
  { id: '6',  name: 'Shopify',    slug: 'shopify',    category: 'E-Commerce',     description: 'Commerce platform powering millions of businesses.',           logo_color: '#96BF48', logo_url: null, employees: 11600, founded: 2006, hq: 'Ottawa, Canada',     valuation: '$70B'    },
  { id: '7',  name: 'Anthropic',  slug: 'anthropic',  category: 'AI Research',    description: 'AI safety research and advanced model deployment.',            logo_color: '#C4875A', logo_url: null, employees: 500,   founded: 2021, hq: 'San Francisco, CA', valuation: '$18B'    },
  { id: '8',  name: 'Airbnb',     slug: 'airbnb',     category: 'E-Commerce',     description: 'Marketplace for unique travel experiences globally.',          logo_color: '#FF5A5F', logo_url: null, employees: 6900,  founded: 2008, hq: 'San Francisco, CA', valuation: '$78B'    },
  { id: '9',  name: 'OpenAI',     slug: 'openai',     category: 'AI Research',    description: 'Advancing artificial intelligence for all of humanity.',       logo_color: '#10A37F', logo_url: null, employees: 900,   founded: 2015, hq: 'San Francisco, CA', valuation: '$80B'    },
  { id: '10', name: 'Twilio',     slug: 'twilio',     category: 'SaaS',           description: 'Cloud communications platform for developers.',                logo_color: '#F22F46', logo_url: null, employees: 8000,  founded: 2008, hq: 'San Francisco, CA', valuation: '$12B'    },
  { id: '11', name: 'Datadog',    slug: 'datadog',    category: 'Infrastructure', description: 'Monitoring and security for cloud-scale apps.',                logo_color: '#632CA6', logo_url: null, employees: 5200,  founded: 2010, hq: 'New York, NY',       valuation: '$28B'    },
  { id: '12', name: 'HubSpot',    slug: 'hubspot',    category: 'SaaS',           description: 'CRM platform for scaling businesses.',                         logo_color: '#FF7A59', logo_url: null, employees: 7400,  founded: 2006, hq: 'Cambridge, MA',      valuation: '$16B'    },
  { id: '13', name: 'Snowflake',  slug: 'snowflake',  category: 'Infrastructure', description: 'The AI Data Cloud — data warehousing at scale.',               logo_color: '#29B5E8', logo_url: null, employees: 6800,  founded: 2012, hq: 'Bozeman, MT',        valuation: '$50B'    },
  { id: '14', name: 'Canva',      slug: 'canva',      category: 'SaaS',           description: 'Visual communication platform for everyone.',                  logo_color: '#00C4CC', logo_url: null, employees: 4000,  founded: 2013, hq: 'Sydney, Australia',  valuation: '$26B'    },
  { id: '15', name: 'Brex',       slug: 'brex',       category: 'Fintech',        description: 'AI-powered spend management for modern companies.',            logo_color: '#FF4E00', logo_url: null, employees: 1200,  founded: 2017, hq: 'San Francisco, CA', valuation: '$12.3B'  },
  { id: '16', name: 'Rippling',   slug: 'rippling',   category: 'SaaS',           description: 'Workforce management connecting HR, IT, and Finance.',         logo_color: '#F5A623', logo_url: null, employees: 2500,  founded: 2016, hq: 'San Francisco, CA', valuation: '$11.25B' },
  { id: '17', name: 'Retool',     slug: 'retool',     category: 'Infrastructure', description: 'Build internal tools at the speed of thought.',                logo_color: '#3D63DD', logo_url: null, employees: 300,   founded: 2017, hq: 'San Francisco, CA', valuation: '$3.2B'   },
  { id: '18', name: 'Scale AI',   slug: 'scale-ai',   category: 'AI Research',    description: 'The data foundry accelerating AI development.',                logo_color: '#FF6B35', logo_url: null, employees: 800,   founded: 2016, hq: 'San Francisco, CA', valuation: '$7.3B'   },
  { id: '19', name: 'Intercom',   slug: 'intercom',   category: 'SaaS',           description: 'Complete customer messaging for support and engagement.',      logo_color: '#286EFA', logo_url: null, employees: 1300,  founded: 2011, hq: 'San Francisco, CA', valuation: '$1.3B'   },
  { id: '20', name: 'Plaid',      slug: 'plaid',      category: 'Fintech',        description: 'The financial data network powering the fintech ecosystem.',   logo_color: '#111827', logo_url: null, employees: 1400,  founded: 2013, hq: 'San Francisco, CA', valuation: '$13.4B'  },
]

const SECTORS = [
  { id: 'all',    label: 'All',            color: '#063f76', kw: [] },
  { id: 'ai',     label: 'AI Research',    color: '#10A37F', kw: ['ai', 'machine', 'ml'] },
  { id: 'fintech',label: 'Fintech',        color: '#635BFF', kw: ['fin', 'pay', 'bank', 'credit'] },
  { id: 'saas',   label: 'SaaS',          color: '#F24E1E', kw: ['saas', 'crm', 'hr', 'workforce', 'communication'] },
  { id: 'infra',  label: 'Infrastructure', color: '#0EA5E9', kw: ['infra', 'cloud', 'devops', 'data', 'analytics', 'monitoring'] },
  { id: 'ecomm',  label: 'E-Commerce',    color: '#F59E0B', kw: ['commerce', 'retail', 'market'] },
]

const EDITOR_PICKS = [
  { slug: 'stripe',    note: 'The gold standard for eng culture, API design, and developer experience.' },
  { slug: 'linear',    note: 'Legendary for craft. A masterclass in how small teams build exceptional products.' },
  { slug: 'anthropic', note: 'The fastest-growing AI lab — deep technical culture and mission-driven hiring.' },
  { slug: 'vercel',    note: 'Redefining frontend infrastructure. Excellent for DevRel and platform roles.' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function fmtN(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(0)}k` : `${n}`
}

function inSector(c: Company, sectorId: string): boolean {
  if (sectorId === 'all') return true
  const s = SECTORS.find(x => x.id === sectorId)
  if (!s || s.kw.length === 0) return false
  const cat = (c.category ?? '').toLowerCase()
  return s.kw.some(k => cat.includes(k))
}

// ─── Logo helper (thin wrapper so card code stays terse) ─────────────────────

function Logo({ c, size = 36 }: { c: Company; size?: number }) {
  const color = c.logo_color ?? '#063f76'
  return (
    <CompanyLogo
      name={c.name}
      logoUrl={c.logo_url}
      logoColor={c.logo_color}
      size={size}
      style={{ boxShadow: `0 2px 8px ${color}35` }}
    />
  )
}

// ─── Section label ────────────────────────────────────────────────────────────

function SLabel({ title, sub, accent, action, href }: {
  title: string; sub?: string; accent: string; action?: string; href?: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 3, height: 18, borderRadius: 2, background: accent, flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#09090B', letterSpacing: '-0.03em', lineHeight: 1.2 }}>{title}</div>
          {sub && <div style={{ fontSize: 11, color: '#A1A1AA', marginTop: 1 }}>{sub}</div>}
        </div>
      </div>
      {action && href && (
        <Link href={href} style={{ color: accent, fontSize: 12, fontWeight: 600, textDecoration: 'none', opacity: 0.75, transition: 'opacity 0.15s' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '0.75'}
        >
          {action} →
        </Link>
      )}
    </div>
  )
}

// ─── Trending row card ───────────────────────────────────────────────────────

const TREND_DELTAS  = ['+34%','+28%','+21%','+19%','+15%','+12%']
const TREND_VIEWS   = ['18.4k','14.2k','11.8k','9.3k','7.6k','6.1k']

function TrendCard({ c, rank, initialSaved }: { c: Company; rank: number; initialSaved: boolean }) {
  const bg = c.logo_color ?? '#063f76'
  return (
    <div style={{ flexShrink: 0, width: 176, position: 'relative' }}>
      <Link href={`/company/${c.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
        <div style={{
          background: '#fff', border: '1.5px solid #EBEBED',
          borderRadius: 13, padding: '14px 14px 12px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
          transition: 'border-color 0.18s, box-shadow 0.18s, transform 0.18s',
          cursor: 'pointer', height: '100%',
        }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLElement
            el.style.borderColor = bg; el.style.boxShadow = `0 6px 22px ${bg}22`; el.style.transform = 'translateY(-3px)'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLElement
            el.style.borderColor = '#EBEBED'; el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'; el.style.transform = 'translateY(0)'
          }}
        >
          {/* Header: logo left, rank right — save button lives outside the link below */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
            <Logo c={c} size={34} />
            <span style={{ fontSize: 20, fontWeight: 900, color: '#F0F0F2', letterSpacing: '-0.05em', lineHeight: 1 }}>
              {rank < 10 ? `0${rank}` : rank}
            </span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#09090B', letterSpacing: '-0.03em', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
          <div style={{ fontSize: 11, color: '#A1A1AA', marginBottom: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.category}</div>
          {/* Stats row — right side has a spacer for the save button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 10.5, color: '#B4B4B4', marginBottom: 2 }}>{TREND_VIEWS[rank - 1]} views</div>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: '#10B981', background: '#F0FDF4', padding: '2px 6px', borderRadius: 4 }}>
                {TREND_DELTAS[rank - 1]}
              </span>
            </div>
            {/* 28px spacer so card text doesn't slide under the save button */}
            <div style={{ width: 28, flexShrink: 0 }} />
          </div>
        </div>
      </Link>
      {/* Save button bottom-right, outside the link to avoid nesting interactives */}
      <div style={{ position: 'absolute', bottom: 10, right: 10, zIndex: 2 }}>
        <SaveButton companyId={c.id} companyName={c.name} initialSaved={initialSaved} size="sm" logoColor={bg} />
      </div>
    </div>
  )
}

// ─── Featured spotlight card ─────────────────────────────────────────────────

function FeaturedCard({ c, initialSaved }: { c: Company; initialSaved: boolean }) {
  const bg = c.logo_color ?? '#063f76'
  return (
    <div style={{ position: 'relative' }}>
    <Link href={`/company/${c.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div style={{
        borderRadius: 14, border: `1.5px solid ${bg}30`, background: '#fff',
        overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        transition: 'box-shadow 0.2s, transform 0.2s', cursor: 'pointer',
      }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLElement
          el.style.boxShadow = `0 10px 36px ${bg}25`; el.style.transform = 'translateY(-2px)'
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLElement
          el.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'; el.style.transform = 'translateY(0)'
        }}
      >
        {/* Banner strip */}
        <div style={{ height: 72, background: `linear-gradient(120deg, ${bg}20 0%, ${bg}08 100%)`, position: 'relative', borderBottom: `1px solid ${bg}15` }}>
          <div style={{ position: 'absolute', bottom: -18, left: 20, border: '3px solid #fff', borderRadius: 13, boxShadow: `0 4px 14px ${bg}30` }}>
            <Logo c={c} size={44} />
          </div>
          <div style={{ position: 'absolute', top: 12, right: 14, display: 'flex', gap: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 5, background: bg, color: '#fff', letterSpacing: '0.04em' }}>FEATURED</span>
            {c.category && <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 9px', borderRadius: 5, background: `${bg}15`, color: bg, border: `1px solid ${bg}25` }}>{c.category}</span>}
          </div>
        </div>

        <div style={{ padding: '26px 22px 20px' }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: '#09090B', letterSpacing: '-0.04em', marginBottom: 2 }}>{c.name}</div>
          {c.hq && <div style={{ fontSize: 11.5, color: '#A1A1AA', marginBottom: 10 }}>{c.hq}</div>}
          {c.description && (
            <p style={{ fontSize: 13, color: '#52525B', lineHeight: 1.65, margin: '0 0 16px' }}>{c.description}</p>
          )}

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 0, marginBottom: 18, borderRadius: 10, overflow: 'hidden', border: '1px solid #F0F0F2' }}>
            {[
              c.employees ? { label: 'Employees', val: `${c.employees.toLocaleString()}+` } : null,
              c.valuation ? { label: 'Valuation', val: c.valuation } : null,
              c.founded   ? { label: 'Founded',   val: `${c.founded}` } : null,
            ].filter(Boolean).map((s, i, arr) => (
              <div key={s!.label} style={{ flex: 1, padding: '10px 14px', background: i % 2 === 0 ? '#FAFAFA' : '#fff', borderRight: i < arr.length - 1 ? '1px solid #F0F0F2' : 'none' }}>
                <div style={{ fontSize: 10, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{s!.label}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#09090B', letterSpacing: '-0.02em' }}>{s!.val}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: bg, fontSize: 13, fontWeight: 700 }}>
              Explore full profile
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </div>
            <div onClick={e => e.preventDefault()}>
              <SaveButton companyId={c.id} companyName={c.name} initialSaved={initialSaved} size="sm" logoColor={bg} />
            </div>
          </div>
        </div>
      </div>
    </Link>
    </div>
  )
}

// ─── Recently added mini card ────────────────────────────────────────────────

function RecentCard({ c, daysAgo, initialSaved }: { c: Company; daysAgo: number; initialSaved: boolean }) {
  const bg = c.logo_color ?? '#063f76'
  return (
    <div style={{ position: 'relative' }}>
    <Link href={`/company/${c.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div style={{
        background: '#fff', borderRadius: 11, border: '1.5px solid #EBEBED',
        overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        transition: 'border-color 0.18s, box-shadow 0.18s, transform 0.18s', cursor: 'pointer',
      }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLElement
          el.style.borderColor = bg; el.style.boxShadow = `0 4px 16px ${bg}18`; el.style.transform = 'translateY(-2px)'
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLElement
          el.style.borderColor = '#EBEBED'; el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; el.style.transform = 'translateY(0)'
        }}
      >
        <div style={{ height: 4, background: bg }} />
        <div style={{ padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
            <Logo c={c} size={30} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 9.5, fontWeight: 700, color: '#16A34A', background: '#F0FDF4', border: '1px solid #BBF7D0', padding: '2px 6px', borderRadius: 4 }}>NEW</span>
              <div onClick={e => e.preventDefault()}>
                <SaveButton companyId={c.id} companyName={c.name} initialSaved={initialSaved} size="sm" logoColor={bg} />
              </div>
            </div>
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: '#09090B', letterSpacing: '-0.02em', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
          <div style={{ fontSize: 11, color: '#A1A1AA', marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.category}</div>
          {c.description && (
            <p style={{ fontSize: 11, color: '#71717A', lineHeight: 1.5, margin: '0 0 8px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>
              {c.description}
            </p>
          )}
          <div style={{ fontSize: 10.5, color: '#C4C4C4' }}>Added {daysAgo}d ago</div>
        </div>
      </div>
    </Link>
    </div>
  )
}

// ─── Editor pick row ─────────────────────────────────────────────────────────

function PickRow({ c, note, rank, initialSaved }: { c: Company; note: string; rank: number; initialSaved: boolean }) {
  const bg = c.logo_color ?? '#063f76'
  return (
    <div style={{ position: 'relative' }}>
    <Link href={`/company/${c.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '13px 16px',
        background: '#fff', borderRadius: 11, border: '1.5px solid #EBEBED',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        transition: 'border-color 0.15s, box-shadow 0.15s', cursor: 'pointer',
      }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLElement; el.style.borderColor = bg; el.style.boxShadow = `0 4px 16px ${bg}18`
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLElement; el.style.borderColor = '#EBEBED'; el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'
        }}
      >
        <span style={{ fontSize: 18, fontWeight: 900, color: '#EBEBED', letterSpacing: '-0.05em', lineHeight: 1, minWidth: 26, flexShrink: 0 }}>
          {rank < 10 ? `0${rank}` : rank}
        </span>
        <Logo c={c} size={36} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#09090B', letterSpacing: '-0.03em' }}>{c.name}</span>
            {c.category && <span style={{ fontSize: 10, fontWeight: 600, color: bg, background: `${bg}12`, padding: '1px 6px', borderRadius: 4 }}>{c.category}</span>}
          </div>
          <p style={{ fontSize: 11.5, color: '#71717A', lineHeight: 1.5, margin: 0, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>{note}</p>
        </div>
        <div style={{ width: 32, flexShrink: 0 }} />
      </div>
    </Link>
      <div style={{ position: 'absolute', top: '50%', right: 14, transform: 'translateY(-50%)', zIndex: 2 }}>
        <SaveButton companyId={c.id} companyName={c.name} initialSaved={initialSaved} size="sm" logoColor={bg} />
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function LoggedInHome({ user, plan, companies, isPro, savedIds }: Props) {
  const [sector, setSector] = useState('all')
  const all = companies.length > 0 ? companies : FALLBACK
  const name = user.email?.split('@')[0] ?? 'there'

  // Section slices (deterministic)
  const trending     = all.slice(0, 6)
  const featured     = all[6] ?? all[0]
  const recentlyAdded = all.slice(7, 13)
  const editorPicks  = EDITOR_PICKS
    .map(ep => ({ ...ep, c: all.find(x => x.slug === ep.slug) ?? null }))
    .filter(ep => ep.c !== null) as { slug: string; note: string; c: Company }[]

  // Sidebar sector browse
  const sectorCounts = SECTORS.map(s => ({
    ...s,
    count: s.id === 'all' ? all.length : all.filter(c => inSector(c, s.id)).length,
  }))

  return (
    <div style={{ minHeight: '100vh', background: '#F5F5F7' }}>

      {/* ── Welcome strip ──────────────────────────────────────── */}
      <div style={{ background: '#09090B' }}>
        <div className="lh-welcome-inner" style={{ maxWidth: 1200, margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Avatar */}
            <div style={{ width: 32, height: 32, borderRadius: 9, background: '#063f76', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 10px rgba(6,63,118,0.45)', flexShrink: 0 }}>
              <span style={{ color: '#fff', fontSize: 13, fontWeight: 800 }}>{name.charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <div style={{ color: '#fff', fontSize: 13.5, fontWeight: 700, letterSpacing: '-0.02em' }}>
                {getGreeting()}, <span style={{ color: '#609dd6' }}>{name}</span>
              </div>
              <div style={{ color: '#3F3F46', fontSize: 11 }}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </div>
            </div>
          </div>

          <div className="lh-welcome-right" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Mini stats */}
            <div className="lh-welcome-stats" style={{ display: 'flex', gap: 16, borderRight: '1px solid #1C1C1E', paddingRight: 16 }}>
              {[{ v: `${all.length}+`, l: 'companies' }, { v: '18', l: 'sectors' }, { v: '8.2k', l: 'weekly users' }].map(s => (
                <div key={s.l} style={{ textAlign: 'center' }}>
                  <div style={{ color: '#fff', fontSize: 12.5, fontWeight: 800, lineHeight: 1.2 }}>{s.v}</div>
                  <div style={{ color: '#3F3F46', fontSize: 10 }}>{s.l}</div>
                </div>
              ))}
            </div>
            {/* Plan badge / CTA */}
            {isPro ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 11px', borderRadius: 7, background: 'linear-gradient(135deg, #063f76, #5B21B6)', border: '1px solid #04294f', boxShadow: '0 2px 10px rgba(6,63,118,0.35)' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="#a8cbe8"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                <span style={{ color: '#a8cbe8', fontSize: 11.5, fontWeight: 700 }}>Pro</span>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#3F3F46', fontSize: 11.5 }}>Free plan</span>
                <Link href="/signup?plan=pro" style={{ padding: '5px 13px', borderRadius: 7, background: '#063f76', color: '#fff', fontSize: 11.5, fontWeight: 600, textDecoration: 'none', boxShadow: '0 2px 10px rgba(6,63,118,0.4)', transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#04294f'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#063f76'}
                >
                  Upgrade →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Search zone ────────────────────────────────────────── */}
      <div className="lh-search-zone" style={{ background: '#fff', borderBottom: '1px solid #EBEBED', padding: '28px 24px 24px' }}>
        <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#09090B', letterSpacing: '-0.05em', lineHeight: 1.2, margin: '0 0 6px' }}>
            Research any company, inside out.
          </h1>
          <p style={{ color: '#A1A1AA', fontSize: 13, margin: '0 0 16px' }}>
            {all.length}+ companies · org charts, financials, internal tools &amp; more
          </p>
          <SearchAutocomplete placeholder="Search any company — Stripe, Airbnb, Google..." size="lg" />
        </div>
      </div>

      {/* ── Main 2-column layout ───────────────────────────────── */}
      <div className="lh-layout" style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 272px', gap: 24, alignItems: 'start' }}>

        {/* ──────────────── LEFT: main content ──────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32, minWidth: 0, overflow: 'hidden' }}>

          {/* 1. Featured Company of the Week */}
          <section>
            <SLabel title="Featured This Week" sub="Curated spotlight — deep-dive ready" accent="#063f76" />
            <FeaturedCard c={featured} initialSaved={savedIds.includes(featured.id)} />
          </section>

          {/* 2. Trending This Week */}
          <section>
            <SLabel title="Trending This Week" sub="Most-viewed companies in the last 7 days" accent="#F59E0B" action="See all" href="/" />
            <div className="lh-trend-scroll" style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none', marginRight: -4 } as React.CSSProperties}>
              {trending.map((c, i) => <TrendCard key={c.id} c={c} rank={i + 1} initialSaved={savedIds.includes(c.id)} />)}
            </div>
          </section>

          {/* 3. Recently Added */}
          <section>
            <SLabel title="Recently Added" sub="New companies on ResearchOrg" accent="#10B981" action="View all" href="/" />
            <div className="lh-recent-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {recentlyAdded.map((c, i) => (
                <RecentCard key={c.id} c={c} daysAgo={[2, 3, 4, 5, 6, 7][i] ?? 8} initialSaved={savedIds.includes(c.id)} />
              ))}
            </div>
          </section>

          {/* 4. Editor's Picks */}
          <section>
            <SLabel title="Editor's Picks" sub="Recommended for job seekers this week" accent="#3B82F6" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {editorPicks.map((ep, i) => (
                <PickRow key={ep.c.id} c={ep.c} note={ep.note} rank={i + 1} initialSaved={savedIds.includes(ep.c.id)} />
              ))}
            </div>
          </section>

        </div>

        {/* ──────────────── RIGHT: sidebar ──────────────────── */}
        <div className="lh-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 80 }}>

          {/* Browse by sector */}
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #EBEBED', overflow: 'hidden', boxShadow: '0 1px 5px rgba(0,0,0,0.04)' }}>
            <div style={{ padding: '13px 16px', borderBottom: '1px solid #F4F4F5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#09090B', letterSpacing: '-0.02em' }}>Browse by Sector</span>
              <span style={{ fontSize: 11, color: '#A1A1AA' }}>{all.length} total</span>
            </div>
            <div style={{ padding: '8px 6px' }}>
              {sectorCounts.map(s => {
                const active = sector === s.id
                return (
                  <button key={s.id} onClick={() => setSector(s.id)} style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 10px', borderRadius: 8, border: 'none',
                    background: active ? `${s.color}0C` : 'transparent',
                    cursor: 'pointer', transition: 'background 0.12s', marginBottom: 1,
                  }}
                    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = '#F7F7F8' }}
                    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 12.5, fontWeight: active ? 700 : 400, color: active ? s.color : '#3F3F46', letterSpacing: active ? '-0.02em' : 0 }}>{s.label}</span>
                    </div>
                    <span style={{ fontSize: 11, color: '#A1A1AA', background: active ? `${s.color}12` : '#F4F4F5', padding: '1px 7px', borderRadius: 5, fontWeight: active ? 600 : 400 }}>{s.count}</span>
                  </button>
                )
              })}
            </div>

            {/* Sector company list when filter active */}
            {sector !== 'all' && (() => {
              const filtered = all.filter(c => inSector(c, sector))
              const sc = SECTORS.find(s => s.id === sector)!
              return filtered.length > 0 ? (
                <div style={{ borderTop: '1px solid #F4F4F5', padding: '10px 10px 8px' }}>
                  <div style={{ fontSize: 10.5, color: '#A1A1AA', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, paddingLeft: 4 }}>
                    {sc.label}
                  </div>
                  {filtered.slice(0, 6).map(c => (
                    <Link key={c.id} href={`/company/${c.slug}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 6px', borderRadius: 8, transition: 'background 0.12s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F7F7F8'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                    >
                      <Logo c={c} size={24} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#09090B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                        <div style={{ fontSize: 10.5, color: '#A1A1AA' }}>{c.employees ? `${fmtN(c.employees)} emp.` : c.hq?.split(',')[0] ?? ''}</div>
                      </div>
                    </Link>
                  ))}
                  {filtered.length > 6 && (
                    <div style={{ fontSize: 11, color: '#A1A1AA', paddingLeft: 6, marginTop: 4 }}>+{filtered.length - 6} more</div>
                  )}
                </div>
              ) : null
            })()}
          </div>

          {/* Plan card */}
          {!isPro ? (
            <div style={{ borderRadius: 14, background: 'linear-gradient(145deg, #0F0A1E, #160D2E)', border: '1px solid #2D1F4E', padding: '18px 16px', boxShadow: '0 4px 20px rgba(6,63,118,0.18)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 9 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="#609dd6"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                <span style={{ color: '#609dd6', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.04em' }}>UPGRADE TO PRO</span>
              </div>
              <p style={{ color: '#6B5FA0', fontSize: 12, lineHeight: 1.6, margin: '0 0 12px' }}>
                Unlock all 6 sections — org charts, financials, internal tools, and interview prep — for every company.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14 }}>
                {['Full org chart & reporting lines', 'Financials & valuation data', 'Interview prep per role', 'Internal tools & processes'].map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#063f76" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    <span style={{ color: '#7C6FB5', fontSize: 11 }}>{f}</span>
                  </div>
                ))}
              </div>
              <Link href="/signup?plan=pro" style={{ display: 'block', textAlign: 'center', padding: '9px', borderRadius: 9, background: '#063f76', color: '#fff', textDecoration: 'none', fontSize: 12.5, fontWeight: 700, boxShadow: '0 4px 14px rgba(6,63,118,0.45)', transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#04294f'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#063f76'}
              >
                From $4.99 / month →
              </Link>
            </div>
          ) : (
            <div style={{ borderRadius: 14, background: '#fff', border: '1px solid #EBEBED', padding: '14px 16px', boxShadow: '0 1px 5px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981' }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#09090B' }}>Pro — Full Access</span>
              </div>
              <p style={{ color: '#71717A', fontSize: 12, lineHeight: 1.6, margin: 0 }}>
                All sections unlocked for every company. Unlimited research access.
              </p>
            </div>
          )}

          {/* Research tip */}
          <div style={{ borderRadius: 14, background: '#fff', border: '1px solid #EBEBED', padding: '14px 16px', boxShadow: '0 1px 5px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Research Tip</div>
            <p style={{ color: '#52525B', fontSize: 12, lineHeight: 1.65, margin: '0 0 8px' }}>
              Before your interview, check the <strong style={{ color: '#09090B' }}>Org Chart</strong> to understand reporting structure, then use <strong style={{ color: '#09090B' }}>Interview Prep</strong> for role-specific questions.
            </p>
            <div style={{ color: '#063f76', fontSize: 11.5, fontWeight: 600 }}>Tip from 3,200+ users ✦</div>
          </div>

        </div>
      </div>

      <style>{`
        /* ── Tablet: hide sidebar stats, collapse to 1 col ── */
        @media (max-width: 960px) {
          .lh-layout {
            grid-template-columns: 1fr !important;
            padding: 20px 16px !important;
          }
          .lh-sidebar {
            position: static !important;
          }
          .lh-welcome-stats {
            display: none !important;
          }
        }

        /* ── Mobile ── */
        @media (max-width: 640px) {
          .lh-search-zone {
            padding: 20px 16px 18px !important;
          }
          .lh-layout {
            padding: 16px 12px !important;
            gap: 24px !important;
          }
          .lh-welcome-inner {
            padding: 12px 16px !important;
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 10px !important;
          }
          .lh-welcome-right {
            width: 100% !important;
            justify-content: flex-start !important;
            gap: 10px !important;
          }
          .lh-recent-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .lh-trend-scroll {
            margin-left: -12px !important;
            margin-right: -12px !important;
            padding-left: 12px !important;
            padding-right: 12px !important;
          }
        }

        /* ── Very small (< 400px) ── */
        @media (max-width: 400px) {
          .lh-recent-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
