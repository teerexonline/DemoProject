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

interface Props {
  company: Company
  showProTeaser?: boolean
}

// ─── Data generators ──────────────────────────────────────────────

type NewsItem = {
  type: string
  typeColor: string
  typeBg: string
  dotColor: string
  headline: string
  summary: string
  date: string
}

type Milestone = {
  year: number
  type: 'founding' | 'funding' | 'acquisition' | 'product' | 'milestone' | 'leadership'
  icon: string
  accentColor: string
  bgColor: string
  title: string
  detail: string
  badge?: string
}

function generateNews(company: Company): NewsItem[] {
  const n = company.name
  const cat = company.category ?? 'Technology'
  return [
    {
      type: 'PRESS RELEASE',
      typeColor: '#1D4ED8',
      typeBg: '#EFF6FF',
      dotColor: '#3B82F6',
      headline: `${n} Launches Next-Generation ${cat} Infrastructure Platform`,
      summary: `The new platform reduces deployment complexity by 60% and introduces real-time anomaly detection. Early access customers report 3× faster time-to-production with a 40% reduction in operational overhead.`,
      date: '2 days ago',
    },
    {
      type: 'FUNDING',
      typeColor: '#065F46',
      typeBg: '#ECFDF5',
      dotColor: '#10B981',
      headline: `${n} Secures $220M Series F at $6.8B Valuation`,
      summary: `The round was led by Andreessen Horowitz with participation from Sequoia and existing investors. Proceeds will accelerate international expansion across Europe and Southeast Asia over the next 18 months.`,
      date: '3 weeks ago',
    },
    {
      type: 'ACQUISITION',
      typeColor: '#5B21B6',
      typeBg: '#F5F3FF',
      dotColor: '#7C3AED',
      headline: `${n} Acquires Developer Tooling Startup Stackform for $85M`,
      summary: `The 18-person Stackform team joins ${n} Engineering. The acquisition accelerates the developer platform roadmap by an estimated 18 months and adds key data pipeline capabilities.`,
      date: '5 weeks ago',
    },
    {
      type: 'PRESS RELEASE',
      typeColor: '#1D4ED8',
      typeBg: '#EFF6FF',
      dotColor: '#3B82F6',
      headline: `${n} Expands Strategic Partnership with Google Cloud`,
      summary: `The expanded partnership enables native integrations across all major Google Cloud services. Joint customers will benefit from streamlined onboarding, combined billing, and co-engineered compliance tooling.`,
      date: '2 months ago',
    },
    {
      type: 'EARNINGS',
      typeColor: '#92400E',
      typeBg: '#FFFBEB',
      dotColor: '#F59E0B',
      headline: `${n} Reports Q3 Revenue Up 41% Year-Over-Year, Beats Estimates`,
      summary: `Strong enterprise adoption and geographic expansion drove results well above analyst consensus. Management guides Q4 revenue between $485M–$510M with continued margin expansion expected through H1.`,
      date: '3 months ago',
    },
  ]
}

function generateMilestones(company: Company): Milestone[] {
  const y = company.founded ?? 2010
  const n = company.name
  const now = new Date().getFullYear()

  const all: Milestone[] = [
    {
      year: y,
      type: 'founding',
      icon: '🚀',
      accentColor: '#7C3AED',
      bgColor: '#F5F3FF',
      title: `${n} founded`,
      detail: `${n} is established with a founding team of 6. The company sets out to reimagine ${(company.category ?? 'technology').toLowerCase()} infrastructure from the ground up, with its first office in ${company.hq ?? 'San Francisco, CA'}.`,
      badge: 'Origin',
    },
    {
      year: y + 1,
      type: 'funding',
      icon: '💰',
      accentColor: '#059669',
      bgColor: '#F0FDF4',
      title: 'Seed Round — $4.2M',
      detail: 'Initial institutional funding secured from Y Combinator and angel investors. Capital used to hire the core engineering team and ship the first production version of the platform.',
      badge: 'Funding',
    },
    {
      year: y + 2,
      type: 'funding',
      icon: '💰',
      accentColor: '#059669',
      bgColor: '#F0FDF4',
      title: 'Series A — $22M',
      detail: 'Product-market fit confirmed with 200+ paying customers. Series A led by Accel Partners. Headcount grows from 12 to 45 over the following 12 months.',
      badge: 'Funding',
    },
    {
      year: y + 4,
      type: 'acquisition',
      icon: '🏢',
      accentColor: '#2563EB',
      bgColor: '#EFF6FF',
      title: 'Acquires DataCore Systems',
      detail: 'Strategic talent-and-technology acquisition. DataCore\'s 14-person team and proprietary streaming engine are integrated into the core platform within 90 days, unlocking real-time data capabilities.',
      badge: 'M&A',
    },
    {
      year: y + 5,
      type: 'funding',
      icon: '💰',
      accentColor: '#059669',
      bgColor: '#F0FDF4',
      title: 'Series B — $90M',
      detail: 'Rapid enterprise adoption drives oversubscribed Series B. International expansion begins with offices opened in London and Singapore. ARR surpasses $40M.',
      badge: 'Funding',
    },
    {
      year: y + 6,
      type: 'product',
      icon: '🛠️',
      accentColor: '#D97706',
      bgColor: '#FFFBEB',
      title: 'Enterprise Platform v2.0 Launch',
      detail: 'Dedicated enterprise tier launches with SSO, SOC 2 Type II compliance, audit logs, and a 99.99% SLA. First Fortune 500 customer signed within 30 days of launch.',
      badge: 'Product',
    },
    {
      year: y + 8,
      type: 'milestone',
      icon: '🦄',
      accentColor: '#7C3AED',
      bgColor: '#F5F3FF',
      title: 'Achieves $1B Unicorn Valuation',
      detail: `${n} joins the global unicorn club in a $180M Series D. The round values the company at $1.2B. More than 2,000 enterprises now use the platform across 34 countries.`,
      badge: 'Milestone',
    },
    {
      year: y + 10,
      type: 'acquisition',
      icon: '🤝',
      accentColor: '#2563EB',
      bgColor: '#EFF6FF',
      title: 'Acquires CloudBridge Inc. for $340M',
      detail: 'Largest acquisition to date. CloudBridge brings market-leading integration capabilities, 180 enterprise customers, and a 60-person team. Integration completes in under 6 months.',
      badge: 'M&A',
    },
    {
      year: y + 12,
      type: 'milestone',
      icon: '📈',
      accentColor: '#D97706',
      bgColor: '#FFFBEB',
      title: 'IPO on NYSE — $8.4B Valuation',
      detail: `${n} goes public at $24 per share, valuing the company at $8.4B. Shares close up 38% on the first day of trading, the strongest tech IPO of the year.`,
      badge: 'IPO',
    },
  ]

  return all.filter(m => m.year <= now)
}

// ─── Sub-components ───────────────────────────────────────────────

function StatCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{
      padding: '16px',
      borderRadius: '12px',
      background: '#FAFAFA',
      border: '1px solid #F0F0F2',
      borderTop: `3px solid ${accent}`,
      textAlign: 'center',
    }}>
      <div style={{ color: '#09090B', fontSize: '19px', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1 }}>{value}</div>
      <div style={{ color: '#A1A1AA', fontSize: '11px', marginTop: '5px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
    </div>
  )
}

function NewsTimeline({ items, color }: { items: NewsItem[]; color: string }) {
  const [hovered, setHovered] = useState<number | null>(null)
  return (
    <div style={{ position: 'relative', paddingLeft: '24px' }}>
      {/* Vertical line */}
      <div style={{
        position: 'absolute', left: '5px', top: '8px',
        width: '1px',
        bottom: '8px',
        background: 'linear-gradient(to bottom, #E4E4E7, #F4F4F5)',
      }} />

      {items.map((item, i) => (
        <div
          key={i}
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(null)}
          style={{
            position: 'relative',
            marginBottom: i < items.length - 1 ? '20px' : 0,
            padding: '14px 16px',
            borderRadius: '12px',
            background: hovered === i ? '#FAFAFA' : '#fff',
            border: `1px solid ${hovered === i ? '#E4E4E7' : '#F4F4F5'}`,
            transition: 'background 0.15s, border-color 0.15s, box-shadow 0.15s',
            boxShadow: hovered === i ? '0 2px 12px rgba(0,0,0,0.06)' : 'none',
            cursor: 'default',
          }}
        >
          {/* Timeline dot */}
          <div style={{
            position: 'absolute',
            left: '-20px',
            top: '18px',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: item.dotColor,
            border: '2px solid #fff',
            boxShadow: `0 0 0 2px ${item.dotColor}33`,
          }} />

          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <span style={{
              fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em',
              color: item.typeColor, background: item.typeBg,
              padding: '2px 8px', borderRadius: '4px',
              border: `1px solid ${item.typeColor}22`,
              flexShrink: 0,
            }}>
              {item.type}
            </span>
            <span style={{ color: '#C4C4C7', fontSize: '11px' }}>·</span>
            <span style={{ color: '#A1A1AA', fontSize: '11.5px' }}>{item.date}</span>
          </div>

          <div style={{ color: '#09090B', fontSize: '13.5px', fontWeight: 700, lineHeight: 1.4, marginBottom: '6px', letterSpacing: '-0.01em' }}>
            {item.headline}
          </div>
          <div style={{ color: '#71717A', fontSize: '12.5px', lineHeight: 1.65 }}>
            {item.summary}
          </div>
        </div>
      ))}
    </div>
  )
}

function HistoryTimeline({ milestones, color }: { milestones: Milestone[]; color: string }) {
  const [expanded, setExpanded] = useState<number | null>(0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {milestones.map((m, i) => {
        const isOpen = expanded === i
        return (
          <div
            key={i}
            style={{
              borderRadius: '10px',
              border: `1px solid ${isOpen ? m.accentColor + '30' : '#F0F0F2'}`,
              background: isOpen ? m.bgColor : '#fff',
              overflow: 'hidden',
              transition: 'border-color 0.2s, background 0.2s',
            }}
          >
            {/* Row trigger */}
            <button
              onClick={() => setExpanded(isOpen ? null : i)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 14px', background: 'none', border: 'none',
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              {/* Year badge */}
              <div style={{
                flexShrink: 0, minWidth: '42px', textAlign: 'center',
                fontSize: '11px', fontWeight: 800, color: isOpen ? m.accentColor : '#A1A1AA',
                letterSpacing: '-0.02em', lineHeight: 1,
              }}>
                {m.year}
              </div>

              {/* Connector dot */}
              <div style={{
                width: '8px', height: '8px', borderRadius: '50%',
                flexShrink: 0,
                background: isOpen ? m.accentColor : '#D4D4D8',
                transition: 'background 0.2s',
                boxShadow: isOpen ? `0 0 0 3px ${m.accentColor}22` : 'none',
              }} />

              {/* Icon + title */}
              <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px', lineHeight: 1, flexShrink: 0 }}>{m.icon}</span>
                <span style={{
                  fontSize: '13px', fontWeight: isOpen ? 700 : 500,
                  color: isOpen ? '#09090B' : '#374151',
                  letterSpacing: '-0.01em',
                  transition: 'font-weight 0.15s, color 0.15s',
                }}>{m.title}</span>
              </div>

              {/* Badge */}
              {m.badge && (
                <span style={{
                  fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em',
                  color: isOpen ? m.accentColor : '#A1A1AA',
                  background: isOpen ? m.accentColor + '15' : '#F4F4F5',
                  padding: '2px 8px', borderRadius: '4px',
                  flexShrink: 0,
                  transition: 'color 0.2s, background 0.2s',
                }}>
                  {m.badge}
                </span>
              )}

              {/* Chevron */}
              <svg
                width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke={isOpen ? m.accentColor : '#C4C4C7'} strokeWidth="2.2"
                strokeLinecap="round" strokeLinejoin="round"
                style={{
                  flexShrink: 0,
                  transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s cubic-bezier(0.22,1,0.36,1)',
                }}
              >
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </button>

            {/* Expanded detail */}
            {isOpen && (
              <div style={{
                padding: '0 14px 16px 76px',
                color: '#52525B',
                fontSize: '13px',
                lineHeight: 1.7,
                animation: 'fadeIn 0.18s ease both',
              }}>
                {m.detail}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────

export default function CompanyOverview({ company, showProTeaser = false }: Props) {
  const color = company.logo_color ?? '#7C3AED'
  const news = generateNews(company)
  const milestones = generateMilestones(company)

  const employeeStr = company.employees
    ? company.employees >= 1000
      ? `${(company.employees / 1000).toFixed(0)}k+`
      : `${company.employees}`
    : '—'

  const NAV_LOCKED = [
    'Org Chart', 'Financials',
    'Internal Tools', 'Internal Processes', 'Product Use Case',
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

      {/* ── 1. Company header ─────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: '16px',
        padding: '20px', borderRadius: '14px',
        background: `linear-gradient(135deg, ${color}08 0%, #fff 60%)`,
        border: `1px solid ${color}20`,
      }}>
        {/* Logo */}
        <div style={{
          width: '56px', height: '56px', borderRadius: '14px',
          background: color, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 4px 16px ${color}40`,
        }}>
          <span style={{ color: '#fff', fontSize: '22px', fontWeight: 800, letterSpacing: '-0.04em' }}>
            {company.name.charAt(0)}
          </span>
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, letterSpacing: '-0.04em', color: '#09090B' }}>
              {company.name}
            </h1>
            <span style={{
              background: '#F0FDF4', color: '#16A34A', fontSize: '10.5px', fontWeight: 700,
              padding: '3px 10px', borderRadius: '100px', border: '1px solid #BBF7D0',
            }}>● Active</span>
          </div>
          <div style={{ color: '#71717A', fontSize: '12.5px', marginBottom: '10px' }}>
            {company.category}{company.hq ? ` · ${company.hq}` : ''}{company.founded ? ` · Est. ${company.founded}` : ''}
          </div>
          {/* Tags */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[company.category, 'B2B', 'SaaS', 'Developer-first'].filter(Boolean).map(t => (
              <span key={t} style={{
                padding: '3px 10px', borderRadius: '5px',
                background: '#F5F3FF', border: '1px solid #DDD6FE',
                color: '#7C3AED', fontSize: '11.5px', fontWeight: 500,
              }}>{t}</span>
            ))}
            {company.website && (
              <Link
                href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '3px 10px', borderRadius: '5px',
                  background: '#F4F4F5', border: '1px solid #E4E4E7',
                  color: '#52525B', fontSize: '11.5px', fontWeight: 500,
                  textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px',
                }}
              >
                ↗ Website
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── 2. Key metrics ────────────────────────────────── */}
      <div className="co-4col" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
        <StatCard label="Valuation" value={company.valuation ?? '—'} accent={color} />
        <StatCard label="Revenue" value={company.revenue ?? '—'} accent="#10B981" />
        <StatCard label="Employees" value={employeeStr} accent="#3B82F6" />
        <StatCard label="Founded" value={company.founded?.toString() ?? '—'} accent="#F59E0B" />
      </div>

      {/* ── 3. Description ────────────────────────────────── */}
      {company.description && (
        <div style={{
          padding: '16px 18px', borderRadius: '12px',
          background: '#F7F7F8', border: '1px solid #F0F0F2',
        }}>
          <p style={{ color: '#374151', fontSize: '14px', lineHeight: 1.75, margin: 0 }}>
            {company.description}
          </p>
        </div>
      )}

      {/* ── 4. Recent press ───────────────────────────────── */}
      <div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px',
        }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Recent Press
          </span>
          <div style={{ flex: 1, height: '1px', background: '#F0F0F2' }} />
          <span style={{
            fontSize: '10.5px', fontWeight: 600, color: '#A1A1AA',
            background: '#F4F4F5', padding: '2px 8px', borderRadius: '4px',
          }}>5 items</span>
        </div>
        <NewsTimeline items={news} color={color} />
      </div>

      {/* ── 5. Company history ────────────────────────────── */}
      <div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px',
        }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Company History
          </span>
          <div style={{ flex: 1, height: '1px', background: '#F0F0F2' }} />
          <span style={{
            fontSize: '10.5px', fontWeight: 600, color: '#A1A1AA',
            background: '#F4F4F5', padding: '2px 8px', borderRadius: '4px',
          }}>{milestones.length} milestones</span>
        </div>
        <HistoryTimeline milestones={milestones} color={color} />
      </div>

      {/* ── 6. Pro teaser (free users only) ──────────────── */}
      {showProTeaser && (
        <div style={{
          padding: '20px', borderRadius: '14px',
          background: 'linear-gradient(135deg, #F5F3FF 0%, #EFF6FF 100%)',
          border: '1px solid #DDD6FE',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span style={{ fontSize: '15px' }}>🔓</span>
            <span style={{ color: '#5B21B6', fontSize: '13px', fontWeight: 700 }}>
              More available with Pro
            </span>
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {NAV_LOCKED.map(label => (
              <span key={label} style={{
                padding: '4px 10px', borderRadius: '6px',
                background: '#fff', border: '1px solid #DDD6FE',
                color: '#7C3AED', fontSize: '11.5px',
                display: 'inline-flex', alignItems: 'center', gap: '4px',
              }}>
                <span style={{ fontSize: '10px', opacity: 0.6 }}>🔒</span> {label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
