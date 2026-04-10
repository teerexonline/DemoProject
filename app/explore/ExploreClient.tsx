'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import CategoryFilter from '@/components/CategoryFilter'
import CompanyLogo from '@/components/CompanyLogo'
import type { CompanyRow } from '@/app/actions/companies'

// ─── Sectors ────────────────────────────────────────────────────────────────

const SECTORS = [
  { id: 'all',        label: 'All Companies',        cats: [] as string[] },
  { id: 'tech',       label: 'Technology',            cats: [
    'software','enterprise software','saas','dev tools','developer tools','design software',
    'design','design tools','productivity','data cloud','database','industrial software',
    'business services','business software industry','process management','platform',
    'observability','big tech','ai','ai research','ai safety','data & ai','machine learning',
    'consumer tech','information technology','communications','computer hardware',
    'hardware','semiconductors',
  ]},
  { id: 'finance',    label: 'Finance',               cats: [
    'fintech','financial services','financial technology','banking','finance',
    'payments','payment processing','crypto','financial tech',
  ]},
  { id: 'defense',    label: 'Aerospace & Defense',   cats: [
    'aerospace & defense','aerospace','aircraft',
    'industrial technology','industrial automation',
  ]},
  { id: 'security',   label: 'Security',              cats: [
    'security','cybersecurity','network security','identity security','enterprise security',
    'infrastructure',
  ]},
  { id: 'consumer',   label: 'Consumer & Retail',     cats: [
    'retail','e-commerce','food delivery','restaurant technology',
    'transportation','travel','automotive renewable energy','automotive manufacturing',
    'streaming','entertainment','gaming','gaming & entertainment','music & audio',
  ]},
  { id: 'services',   label: 'Services',              cats: [
    'professional services','consulting','government it services','government',
    'human capital management',
  ]},
  { id: 'industrial', label: 'Industrial',            cats: [
    'manufacturing','industrial','industrial manufacturing','heavy industry',
    'chemicals','materials','paper & packaging','textiles','construction',
    'building materials','engineering','mechanical engineering',
  ]},
  { id: 'health',     label: 'Healthcare',            cats: [
    'healthcare','health','medtech','medical devices','medical technology',
    'pharmaceuticals','pharma','biotechnology','biotech','life sciences',
    'health systems','hospital','health insurance','health tech',
  ]},
  { id: 'energy',     label: 'Energy',                cats: [
    'energy','oil & gas','oil and gas','natural gas','utilities','electric utilities',
    'renewable energy','solar','wind','nuclear','power generation',
    'pipeline','energy infrastructure',
  ]},
  { id: 'infra',      label: 'Infrastructure', cats: [
    'infrastructure','cloud','cloud infrastructure','cloud computing','cloud services',
    'networking','networking & telecom','cdn','edge computing','data center',
    'hosting','platform infrastructure','devops',
  ]},
]

type SortMode = 'all' | 'trending' | 'recent'

const VIEW_MODES: { id: SortMode; label: string; icon: React.ReactNode }[] = [
  {
    id: 'all',
    label: 'All Companies',
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    ),
  },
  {
    id: 'trending',
    label: 'Trending This Week',
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
      </svg>
    ),
  },
  {
    id: 'recent',
    label: 'Recently Added',
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
  },
]

function inSector(c: CompanyRow, sectorId: string): boolean {
  if (sectorId === 'all') return true
  const s = SECTORS.find(x => x.id === sectorId)
  if (!s || s.cats.length === 0) return false
  return s.cats.includes((c.category ?? '').toLowerCase().trim())
}

// ─── Company grid card ───────────────────────────────────────────────────────

function CompanyCard({ c }: { c: CompanyRow }) {
  const bg = c.logo_color ?? '#063f76'
  return (
    <Link href={`/company/${c.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div
        style={{
          background: '#fff',
          borderRadius: 13,
          border: '1.5px solid #EBEBED',
          padding: '16px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          transition: 'border-color 0.18s, box-shadow 0.18s, transform 0.18s',
          cursor: 'pointer',
          height: '100%',
        }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLElement
          el.style.borderColor = bg
          el.style.boxShadow = `0 6px 22px ${bg}22`
          el.style.transform = 'translateY(-2px)'
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLElement
          el.style.borderColor = '#EBEBED'
          el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'
          el.style.transform = 'translateY(0)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
          <CompanyLogo
            name={c.name}
            logoUrl={c.logo_url}
            logoColor={c.logo_color}
            size={40}
            style={{ boxShadow: `0 2px 8px ${bg}30` }}
          />
          {c.is_hiring && (
            <span style={{ fontSize: 9.5, fontWeight: 700, color: '#16A34A', background: '#F0FDF4', border: '1px solid #BBF7D0', padding: '2px 7px', borderRadius: 4, letterSpacing: '0.02em' }}>
              HIRING
            </span>
          )}
        </div>

        <div style={{ fontSize: 14, fontWeight: 700, color: '#09090B', letterSpacing: '-0.03em', marginBottom: 2 }}>{c.name}</div>
        {c.category && (
          <div style={{ fontSize: 11, color: '#A1A1AA', marginBottom: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.category}</div>
        )}
        {c.description && (
          <p style={{
            fontSize: 11.5, color: '#71717A', lineHeight: 1.55, margin: '0 0 10px',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          } as React.CSSProperties}>
            {c.description}
          </p>
        )}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 'auto' }}>
          {c.hq && (
            <span style={{ fontSize: 10.5, color: '#A1A1AA', display: 'flex', alignItems: 'center', gap: 3 }}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
              {c.hq?.split(',')[0]}
            </span>
          )}
          {c.employees && (
            <span style={{ fontSize: 10.5, color: '#A1A1AA', display: 'flex', alignItems: 'center', gap: 3 }}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              {c.employees >= 1000 ? `${(c.employees / 1000).toFixed(0)}k` : c.employees}
            </span>
          )}
          {c.revenue && (
            <span style={{ fontSize: 10.5, color: '#A1A1AA' }}>{c.revenue}</span>
          )}
        </div>
      </div>
    </Link>
  )
}

// ─── View mode switcher ──────────────────────────────────────────────────────

function ViewModeSwitcher({ value, onChange }: { value: SortMode; onChange: (v: SortMode) => void }) {
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      background: '#F4F4F5',
      borderRadius: 10,
      padding: 3,
      gap: 2,
    }}>
      {VIEW_MODES.map(mode => {
        const active = value === mode.id
        return (
          <button
            key={mode.id}
            onClick={() => onChange(mode.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 8,
              border: 'none',
              background: active ? '#063f76' : 'transparent',
              color: active ? '#fff' : '#71717A',
              fontSize: 12.5,
              fontWeight: active ? 700 : 500,
              cursor: 'pointer',
              letterSpacing: active ? '-0.01em' : '0',
              transition: 'background 0.15s, color 0.15s',
              whiteSpace: 'nowrap',
              boxShadow: active ? '0 1px 6px rgba(6,63,118,0.25)' : 'none',
            }}
            onMouseEnter={e => {
              if (!active) {
                (e.currentTarget as HTMLElement).style.background = '#EBEBED'
                ;(e.currentTarget as HTMLElement).style.color = '#09090B'
              }
            }}
            onMouseLeave={e => {
              if (!active) {
                (e.currentTarget as HTMLElement).style.background = 'transparent'
                ;(e.currentTarget as HTMLElement).style.color = '#71717A'
              }
            }}
          >
            {mode.icon}
            {mode.label}
          </button>
        )
      })}
    </div>
  )
}

// ─── Main ────────────────────────────────────────────────────────────────────

interface Props {
  companies: CompanyRow[]
  initialCategory: string
  initialSort: SortMode
}

export default function ExploreClient({ companies, initialCategory, initialSort }: Props) {
  const router = useRouter()
  const [category, setCategory] = useState(initialCategory)
  const [sort, setSort] = useState<SortMode>(initialSort)
  const [search, setSearch] = useState('')

  // Keep URL in sync
  useEffect(() => {
    const params = new URLSearchParams()
    if (sort !== 'all') params.set('sort', sort)
    if (category !== 'all') params.set('category', category)
    const qs = params.toString()
    router.replace(`/explore${qs ? `?${qs}` : ''}`, { scroll: false })
  }, [category, sort, router])

  // Derive sector filter options that have at least 1 company
  const filterCategories = useMemo(() => {
    return SECTORS.filter(s =>
      s.id === 'all' || companies.some(c => inSector(c, s.id))
    ).map(s => ({ id: s.id, label: s.label }))
  }, [companies])

  const filtered = useMemo(() => {
    let result = [...companies]

    // Apply sector filter
    if (category !== 'all') {
      result = result.filter(c => inSector(c, category))
    }

    // Apply search
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.category ?? '').toLowerCase().includes(q) ||
        (c.hq ?? '').toLowerCase().includes(q)
      )
    }

    // Apply sort
    if (sort === 'trending') {
      result = result
        .filter(c => c.trending_rank != null)
        .sort((a, b) => (a.trending_rank ?? 999) - (b.trending_rank ?? 999))
        .concat(result.filter(c => c.trending_rank == null))
    } else if (sort === 'recent') {
      result = result.slice().sort((a, b) => {
        if (!a.created_at && !b.created_at) return 0
        if (!a.created_at) return 1
        if (!b.created_at) return -1
        return b.created_at.localeCompare(a.created_at)
      })
    }

    return result
  }, [companies, category, sort, search])

  const sectorLabel = SECTORS.find(s => s.id === category)?.label ?? 'All Companies'
  const heading = (() => {
    const hasSector = category !== 'all'
    if (sort === 'trending') return hasSector ? `Trending in ${sectorLabel}` : 'Trending This Week'
    if (sort === 'recent')   return hasSector ? `Recently Added · ${sectorLabel}` : 'Recently Added'
    return hasSector ? sectorLabel : 'All Companies'
  })()

  return (
    <div style={{ minHeight: '100vh', background: '#F5F5F7' }}>

      {/* Header */}
      <div style={{
        background: '#fff',
        borderBottom: '1px solid #EBEBED',
        padding: '32px 24px 0',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#A1A1AA', marginBottom: 16 }}>
            <Link href="/" style={{ color: '#A1A1AA', textDecoration: 'none' }}>Home</Link>
            <span>/</span>
            <span style={{ color: '#52525B' }}>Explore</span>
          </div>

          {/* Title + search row */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: '#09090B', letterSpacing: '-0.05em', lineHeight: 1.1, margin: 0 }}>
              {heading}
            </h1>

            {/* Search */}
            <div style={{ position: 'relative', width: '100%', maxWidth: 280 }}>
              <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="text"
                placeholder="Search companies..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '8px 12px 8px 32px',
                  border: '1.5px solid #E4E4E7',
                  borderRadius: 9, fontSize: 13, color: '#09090B',
                  background: '#FAFAFA', outline: 'none',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => (e.target as HTMLElement).style.borderColor = '#09090B'}
                onBlur={e => (e.target as HTMLElement).style.borderColor = '#E4E4E7'}
              />
            </div>
          </div>

          {/* View mode switcher */}
          <div style={{ marginBottom: 14 }}>
            <ViewModeSwitcher value={sort} onChange={setSort} />
          </div>

          {/* Sector chips — always visible */}
          <div style={{ paddingBottom: 20 }}>
            <CategoryFilter
              categories={filterCategories}
              value={category}
              onChange={setCategory}
            />
          </div>
        </div>
      </div>

      {/* Grid */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px 64px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#A1A1AA' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#D4D4D8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12 }}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#71717A', marginBottom: 4 }}>No companies found</div>
            <div style={{ fontSize: 13 }}>Try a different filter or search term</div>
          </div>
        ) : (
          <div className="explore-grid">
            {filtered.map(c => <CompanyCard key={c.id} c={c} />)}
          </div>
        )}
      </div>

      <style>{`
        .explore-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
        }
        @media (max-width: 1100px) {
          .explore-grid { grid-template-columns: repeat(3, 1fr); }
        }
        @media (max-width: 780px) {
          .explore-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 480px) {
          .explore-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}
