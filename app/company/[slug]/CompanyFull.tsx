'use client'

import { useState } from 'react'
import Link from 'next/link'
import CompanyOverview from './CompanyOverview'
import OrgChart from './OrgChart'
import { DEPARTMENTS, LEVEL_COLORS, type Dept } from './jobData'
import SaveButton from '@/components/SaveButton'
import CompanyLogo from '@/components/CompanyLogo'
import { Building2, Network, TrendingUp, Settings, Target, Package } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import RelatedCompanies from '@/components/RelatedCompanies'

// ─── DB → component data converters ──────────────────────────────────────────

function buildDepts(dbDepts: DbContent['departments'], dbRoles: DbContent['roles']): Dept[] {
  if (dbDepts.length === 0) return DEPARTMENTS
  return dbDepts.map(d => ({
    id: d.id,
    name: d.name,
    icon: d.icon,
    color: d.color,
    headcount: d.headcount,
    roles: dbRoles
      .filter(r => r.department_id === d.id)
      .map((r, i) => ({
        id: `${d.id}-${i}`,
        title: r.title,
        level: r.level,
        levelColor: LEVEL_COLORS[r.level] ?? '#71717A',
        tools:               (r.tools as string[]) ?? [],
        skills:              (r.skills as string[]) ?? [],
        processes:           (r.processes as string[]) ?? [],
        interviewQuestions:  (r.interview_questions as string[]) ?? [],
        keywords:            (r.keywords as string[]) ?? [],
      })),
  }))
}

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

// DB-driven content (from company_* tables). Empty arrays = fall back to hardcoded.
export interface DbContent {
  news:        { type: string; headline: string; summary: string | null; published_date: string | null; type_color: string; type_bg: string; dot_color: string; source_url?: string | null }[]
  milestones:  { year: number; type: string; icon: string; accent_color: string; bg_color: string; title: string; detail: string | null; badge: string | null }[]
  products:    { id: string; name: string; tagline: string | null; description: string | null; category: string | null; cat_color: string; use_cases: unknown; customers: unknown; competitors: unknown; image_url: string | null }[]
  financials:  { tam?: string | null; sam?: string | null; som?: string | null; arr?: string | null; yoy_growth?: string | null; revenue_per_employee?: string | null; revenue_streams?: unknown; business_units?: unknown; market_share?: unknown; revenue_growth?: unknown; competitors?: unknown } | null
  standards:   { code: string; category: string | null; cat_color: string; status: string; description: string | null }[]
  departments: { id: string; name: string; icon: string; color: string; headcount: number }[]
  roles:       { department_id: string; title: string; level: string; tools: unknown; skills: unknown; processes: unknown; interview_questions: unknown; keywords: unknown }[]
  execGroups:  { id?: string; title: string; short_title: string | null; department_ids: unknown; level?: string; name?: string | null }[]
  leaders:     { id: string; name: string; title: string; level: string; parent_id: string | null; department_ids: unknown; sort_order: number }[]
}

const NAV: { id: string; label: string; color: string; icon: LucideIcon }[] = [
  { id: 'overview',   label: 'Company Overview',          color: '#2563EB', icon: Building2  },
  { id: 'org',        label: 'Org Chart',                  color: '#7C3AED', icon: Network    },
  { id: 'financials', label: 'Financials',                  color: '#16A34A', icon: TrendingUp },
  { id: 'internal',   label: 'Internal Tools & Processes',  color: '#EA580C', icon: Settings   },
  { id: 'prep',       label: 'Interview Prep',              color: '#DC2626', icon: Target     },
  { id: 'product',    label: 'Product Use Cases',            color: '#CA8A04', icon: Package    },
]
type SectionId = 'overview' | 'org' | 'financials' | 'internal' | 'prep' | 'product'

// ─── Shared dept selector UI ─────────────────────────────────────────────────

function DeptSelector({ depts, activeDeptId, onSelect }: { depts: Dept[]; activeDeptId: string; onSelect: (id: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {depts.map(d => {
        const active = activeDeptId === d.id
        return (
          <button
            key={d.id}
            onClick={() => onSelect(d.id)}
            style={{
              padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: active ? d.color : '#F4F4F5',
              color: active ? '#fff' : '#52525B',
              fontSize: 12, fontWeight: active ? 700 : 500,
              transition: 'background 0.15s, color 0.15s',
              display: 'flex', alignItems: 'center', gap: 5,
            }}
            onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = '#EBEBED' }}
            onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = '#F4F4F5' }}
          >
            {d.name}
          </button>
        )
      })}
    </div>
  )
}

// ─── Internal Tools & Processes section ──────────────────────────────────────

function InternalSection({ company: _company, dbDepts, dbRoles, dbStandards }: { company: Company; dbDepts: DbContent['departments']; dbRoles: DbContent['roles']; dbStandards: DbContent['standards'] }) {
  const depts = buildDepts(dbDepts, dbRoles)
  const [activeDept, setActiveDept] = useState(depts[0]?.id ?? '')
  const [expandedRole, setExpandedRole] = useState<string | null>(null)

  const dept = depts.find(d => d.id === activeDept) ?? depts[0]

  function toggleRole(id: string) {
    setExpandedRole(prev => prev === id ? null : id)
  }

  function handleDeptChange(id: string) {
    setActiveDept(id)
    setExpandedRole(null)
  }

  const STANDARDS = dbStandards.length > 0
    ? dbStandards.map(s => ({ code: s.code, category: s.category ?? '', catColor: s.cat_color, status: s.status, desc: s.description ?? '' }))
    : [
      { code: 'SOC 2 Type II',   category: 'Security',      catColor: '#EF4444', status: 'Certified',    desc: 'Annual third-party audit of security, availability, and confidentiality controls.' },
      { code: 'ISO 27001',       category: 'Security',      catColor: '#EF4444', status: 'Certified',    desc: 'International standard for information security management systems.' },
      { code: 'GDPR',            category: 'Privacy',       catColor: '#3B82F6', status: 'Compliant',    desc: 'Full compliance with EU General Data Protection Regulation for user data.' },
      { code: 'CCPA',            category: 'Privacy',       catColor: '#3B82F6', status: 'Compliant',    desc: 'California Consumer Privacy Act compliance for all California residents.' },
      { code: 'ISO 9001:2015',   category: 'Quality',       catColor: '#10B981', status: 'Certified',    desc: 'Quality management system ensuring consistent product and service delivery.' },
      { code: 'PCI DSS Level 1', category: 'Payments',      catColor: '#F59E0B', status: 'Compliant',    desc: 'Highest level of PCI compliance for handling cardholder data at scale.' },
      { code: 'WCAG 2.1 AA',     category: 'Accessibility', catColor: '#063f76', status: 'Compliant',    desc: 'Web Content Accessibility Guidelines met across all customer-facing products.' },
      { code: 'ISO 22301',       category: 'Resilience',    catColor: '#06B6D4', status: 'In Progress',  desc: 'Business continuity management standard — target certification Q3.' },
    ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

      {/* ── Internal Tools ────────────────────────────────────────── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span style={{ color: '#09090B', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Internal Tools</span>
          <div style={{ flex: 1, height: 1, background: '#F0F0F2' }} />
          <span style={{ color: '#A1A1AA', fontSize: 10.5 }}>{depts.length} departments</span>
        </div>

        {/* Department tabs */}
        <DeptSelector depts={depts} activeDeptId={activeDept} onSelect={handleDeptChange} />

        {/* Selected dept roles */}
        <div style={{ marginTop: 14, borderRadius: 12, border: `1px solid ${dept.color}30`, overflow: 'hidden' }}>
          {/* Dept header */}
          <div style={{ padding: '12px 16px', background: `${dept.color}08`, borderBottom: `1px solid ${dept.color}20`, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div>
              <span style={{ color: '#09090B', fontSize: 13, fontWeight: 800 }}>{dept.name}</span>
              <span style={{ color: '#A1A1AA', fontSize: 11.5, marginLeft: 8 }}>{dept.headcount} people · {dept.roles.length} roles</span>
            </div>
          </div>

          {/* Role accordion */}
          {dept.roles.map((role, i) => {
            const isOpen = expandedRole === role.id
            const isLast = i === dept.roles.length - 1
            return (
              <div key={role.id} style={{ borderBottom: isLast ? 'none' : '1px solid #F0F0F2' }}>
                <button
                  onClick={() => toggleRole(role.id)}
                  style={{
                    width: '100%', padding: '12px 16px', background: isOpen ? '#FAFAFA' : '#fff',
                    border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                    textAlign: 'left', transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { if (!isOpen) (e.currentTarget as HTMLElement).style.background = '#FAFAFA' }}
                  onMouseLeave={e => { if (!isOpen) (e.currentTarget as HTMLElement).style.background = '#fff' }}
                >
                  <span style={{ padding: '2px 8px', borderRadius: 6, background: `${role.levelColor}15`, color: role.levelColor, fontSize: 10.5, fontWeight: 700, flexShrink: 0 }}>
                    {role.level}
                  </span>
                  <span style={{ flex: 1, color: '#09090B', fontSize: 13, fontWeight: 600 }}>{role.title}</span>
                  <span style={{ color: '#A1A1AA', fontSize: 11, transition: 'transform 0.2s', display: 'inline-block', transform: isOpen ? 'rotate(180deg)' : 'none' }}>▼</span>
                </button>

                {isOpen && (
                  <div style={{ padding: '0 16px 16px', borderTop: '1px solid #F5F5F5' }}>
                    {role.tools.length === 0 && role.skills.length === 0 && role.processes.length === 0 ? (
                      <div style={{ marginTop: 12, padding: '14px 16px', borderRadius: 10, background: '#F7F7F8', border: '1px dashed #E4E4E7', textAlign: 'center' }}>
                        <span style={{ color: '#A1A1AA', fontSize: 12 }}>No data yet — re-seed roles from the Admin Dashboard to populate tools, skills &amp; processes.</span>
                      </div>
                    ) : (
                      <div className="co-3col" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 12 }}>
                        {/* Tools */}
                        <div style={{ padding: 12, borderRadius: 10, background: '#F7F7F8', border: '1px solid #F0F0F2' }}>
                          <div style={{ color: '#71717A', fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 8 }}>🔧 Tools</div>
                          {role.tools.length > 0
                            ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                {role.tools.map(t => (
                                  <span key={t} style={{ padding: '3px 8px', borderRadius: 5, background: '#fff', border: '1px solid #E4E4E7', color: '#374151', fontSize: 11, fontWeight: 500 }}>{t}</span>
                                ))}
                              </div>
                            : <span style={{ color: '#A1A1AA', fontSize: 11 }}>—</span>
                          }
                        </div>
                        {/* Skills */}
                        <div style={{ padding: 12, borderRadius: 10, background: '#F7F7F8', border: '1px solid #F0F0F2' }}>
                          <div style={{ color: '#71717A', fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 8 }}>⚡ Key Skills</div>
                          {role.skills.length > 0
                            ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                {role.skills.map(s => (
                                  <span key={s} style={{ padding: '3px 8px', borderRadius: 5, background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1D4ED8', fontSize: 11 }}>{s}</span>
                                ))}
                              </div>
                            : <span style={{ color: '#A1A1AA', fontSize: 11 }}>—</span>
                          }
                        </div>
                        {/* Processes */}
                        <div style={{ padding: 12, borderRadius: 10, background: '#F7F7F8', border: '1px solid #F0F0F2' }}>
                          <div style={{ color: '#71717A', fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 8 }}>⚙️ Processes</div>
                          {role.processes.length > 0
                            ? <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                {role.processes.map(p => (
                                  <div key={p} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                                    <span style={{ color: '#10B981', fontSize: 11, lineHeight: '17px', flexShrink: 0 }}>•</span>
                                    <span style={{ color: '#52525B', fontSize: 11, lineHeight: 1.5 }}>{p}</span>
                                  </div>
                                ))}
                              </div>
                            : <span style={{ color: '#A1A1AA', fontSize: 11 }}>—</span>
                          }
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Standards & Certifications ───────────────────────────── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <span style={{ color: '#09090B', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Standards &amp; Certifications</span>
          <div style={{ flex: 1, height: 1, background: '#F0F0F2' }} />
          <span style={{ color: '#A1A1AA', fontSize: 10.5 }}>{STANDARDS.length} standards</span>
        </div>
        <div style={{ color: '#A1A1AA', fontSize: 11.5, marginBottom: 14, lineHeight: 1.5 }}>
          Compliance frameworks, security audits, and quality certifications this company maintains.
        </div>
        <div className="co-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {STANDARDS.map(s => (
            <div key={s.code} style={{
              borderRadius: 10, background: '#fff',
              border: '1px solid #E4E4E7',
              borderLeft: `3px solid ${s.catColor}`,
              padding: '12px 14px',
              display: 'flex', flexDirection: 'column', gap: 6,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <div>
                  <div style={{ color: s.catColor, fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 3 }}>
                    {s.category}
                  </div>
                  <div style={{ color: '#09090B', fontSize: 13, fontWeight: 800, letterSpacing: '-0.02em' }}>
                    {s.code}
                  </div>
                </div>
                <span style={{
                  padding: '2px 8px', borderRadius: 5, flexShrink: 0, marginTop: 2,
                  background: s.status === 'Certified' ? '#DCFCE7' : s.status === 'Compliant' ? '#EFF6FF' : '#FEF3C7',
                  color: s.status === 'Certified' ? '#15803D' : s.status === 'Compliant' ? '#1D4ED8' : '#92400E',
                  fontSize: 9.5, fontWeight: 700,
                }}>
                  {s.status}
                </span>
              </div>
              <div style={{ color: '#71717A', fontSize: 11.5, lineHeight: 1.5 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Interview Prep section ───────────────────────────────────────────────────

function PrepSection({ dbDepts, dbRoles }: { dbDepts: DbContent['departments']; dbRoles: DbContent['roles'] }) {
  const depts = buildDepts(dbDepts, dbRoles)
  const [activeDept, setActiveDept] = useState(depts[0]?.id ?? '')
  const [expandedRole, setExpandedRole] = useState<string | null>(null)

  const dept = depts.find(d => d.id === activeDept) ?? depts[0]

  function toggleRole(id: string) {
    setExpandedRole(prev => prev === id ? null : id)
  }

  function handleDeptChange(id: string) {
    setActiveDept(id)
    setExpandedRole(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* Header */}
      <div>
        <div style={{ color: '#09090B', fontSize: 15, fontWeight: 800, letterSpacing: '-0.04em', marginBottom: 4 }}>Interview Prep</div>
        <div style={{ color: '#71717A', fontSize: 12, lineHeight: 1.6 }}>
          Role-specific interview questions and keywords. Select a department, then click any role to prepare.
        </div>
      </div>

      {/* Department tabs */}
      <DeptSelector depts={depts} activeDeptId={activeDept} onSelect={handleDeptChange} />

      {/* Roles */}
      <div style={{ borderRadius: 12, border: `1px solid ${dept.color}30`, overflow: 'hidden' }}>
        {/* Dept header */}
        <div style={{ padding: '12px 16px', background: `${dept.color}08`, borderBottom: `1px solid ${dept.color}20`, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: '#09090B', fontSize: 13, fontWeight: 800 }}>{dept.name}</span>
          <span style={{ color: '#A1A1AA', fontSize: 11.5, marginLeft: 4 }}>· {dept.roles.length} roles</span>
        </div>

        {dept.roles.map((role, i) => {
          const isOpen = expandedRole === role.id
          const isLast = i === dept.roles.length - 1
          return (
            <div key={role.id} style={{ borderBottom: isLast ? 'none' : '1px solid #F0F0F2' }}>
              <button
                onClick={() => toggleRole(role.id)}
                style={{
                  width: '100%', padding: '12px 16px', background: isOpen ? '#FAFAFA' : '#fff',
                  border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                  textAlign: 'left', transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (!isOpen) (e.currentTarget as HTMLElement).style.background = '#FAFAFA' }}
                onMouseLeave={e => { if (!isOpen) (e.currentTarget as HTMLElement).style.background = '#fff' }}
              >
                <span style={{ padding: '2px 8px', borderRadius: 6, background: `${role.levelColor}15`, color: role.levelColor, fontSize: 10.5, fontWeight: 700, flexShrink: 0 }}>{role.level}</span>
                <span style={{ flex: 1, color: '#09090B', fontSize: 13, fontWeight: 600 }}>{role.title}</span>
                <span style={{ color: '#A1A1AA', fontSize: 11 }}>
                  {role.interviewQuestions.length} questions · {role.keywords.length} keywords
                </span>
                <span style={{ color: '#A1A1AA', fontSize: 11, transition: 'transform 0.2s', display: 'inline-block', transform: isOpen ? 'rotate(180deg)' : 'none', marginLeft: 6 }}>▼</span>
              </button>

              {isOpen && (
                <div style={{ padding: '0 16px 18px', borderTop: '1px solid #F5F5F5' }}>

                  {/* Interview Questions */}
                  <div style={{ marginTop: 14, padding: '14px 16px', borderRadius: 10, background: '#eef4fb', border: '1px solid #a8cbe8' }}>
                    <div style={{ color: '#04294f', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 12 }}>
                      🎯 Likely Interview Questions
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {role.interviewQuestions.map((q, qi) => (
                        <div key={qi} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                          <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#063f76', color: '#fff', fontSize: 9.5, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                            {qi + 1}
                          </span>
                          <span style={{ color: '#3B0764', fontSize: 12.5, lineHeight: 1.6 }}>{q}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Keywords */}
                  <div style={{ marginTop: 10, padding: '14px 16px', borderRadius: 10, background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                    <div style={{ color: '#15803D', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 10 }}>
                      🏷️ Keywords to Use — Resume &amp; Interview
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {role.keywords.map(kw => (
                        <span key={kw} style={{ padding: '4px 10px', borderRadius: 6, background: '#fff', border: '1px solid #BBF7D0', color: '#166534', fontSize: 11.5, fontWeight: 500, letterSpacing: '-0.01em' }}>{kw}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── ProductSection ──────────────────────────────────────────────────────────

interface Product {
  id: string
  name: string
  tagline: string
  description: string
  category: string
  catColor: string
  useCases: string[]
  customers: { name: string; abbr: string; bg: string }[]
  competitors: { name: string; description?: string; edge: string }[]
  imageUrl?: string | null
}

const PRODUCTS: Product[] = [
  {
    id: 'core',
    name: 'Core Platform',
    tagline: 'The foundation layer for modern workflows',
    description: 'The primary cloud-native platform that powers automation, data pipelines, and real-time collaboration at scale. Used by engineering and operations teams to replace fragmented tooling with a single, composable system.',
    category: 'Platform',
    catColor: '#3B82F6',
    useCases: ['Workflow Automation', 'API Orchestration', 'Real-time Analytics', 'Team Collaboration', 'Event Streaming'],
    customers: [
      { name: 'Airbnb',    abbr: 'AB', bg: '#FF5A5F' },
      { name: 'Shopify',   abbr: 'SH', bg: '#96BF48' },
      { name: 'Stripe',    abbr: 'ST', bg: '#635BFF' },
      { name: 'Notion',    abbr: 'NO', bg: '#191919' },
      { name: 'Figma',     abbr: 'FG', bg: '#F24E1E' },
    ],
    competitors: [
      { name: 'Salesforce',  edge: 'More flexible APIs, lower implementation cost' },
      { name: 'ServiceNow',  edge: 'Faster onboarding, better developer experience' },
      { name: 'MuleSoft',    edge: 'Native cloud-first architecture' },
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise Suite',
    tagline: 'Governance, compliance, and scale for large orgs',
    description: 'A dedicated tier of the platform with advanced role-based access controls, audit logging, SSO/SAML integration, and dedicated infrastructure. Designed for Fortune 500 security and compliance requirements.',
    category: 'Enterprise',
    catColor: '#0EA5E9',
    useCases: ['SSO & Identity Management', 'Audit Trails', 'Custom SLAs', 'Data Residency', 'Advanced Reporting'],
    customers: [
      { name: 'JPMorgan',  abbr: 'JP', bg: '#003087' },
      { name: 'Goldman',   abbr: 'GS', bg: '#4B5563' },
      { name: 'Microsoft', abbr: 'MS', bg: '#00A4EF' },
      { name: 'Walmart',   abbr: 'WM', bg: '#007DC6' },
    ],
    competitors: [
      { name: 'Workday',      edge: 'Faster deployment cycle, open API ecosystem' },
      { name: 'Oracle Cloud', edge: 'Modern UI, superior integration flexibility' },
      { name: 'SAP',          edge: 'Lower TCO, cloud-native from day one' },
    ],
  },
  {
    id: 'devapi',
    name: 'Developer API',
    tagline: 'Build anything on top of the platform',
    description: 'A fully-documented RESTful and GraphQL API layer with SDKs for 12 languages. Enables third-party developers and partners to embed platform capabilities into their own products with usage-based pricing.',
    category: 'API & SDK',
    catColor: '#063f76',
    useCases: ['Third-party Integrations', 'Embedded Workflows', 'Webhook Automation', 'Custom Dashboards', 'Partner Ecosystem'],
    customers: [
      { name: 'Vercel',   abbr: 'VC', bg: '#000' },
      { name: 'Linear',   abbr: 'LN', bg: '#5E6AD2' },
      { name: 'Retool',   abbr: 'RT', bg: '#3D63DD' },
      { name: 'Descript', abbr: 'DS', bg: '#FF4B4B' },
    ],
    competitors: [
      { name: 'Twilio',    edge: 'Broader functionality beyond messaging' },
      { name: 'Segment',   edge: 'End-to-end workflow, not just data routing' },
      { name: 'Zapier',    edge: 'Native SDK depth, no-code + pro-code hybrid' },
    ],
  },
  {
    id: 'analytics',
    name: 'Analytics & Insights',
    tagline: 'Turn platform data into strategic decisions',
    description: 'An embedded analytics layer that surfaces usage patterns, funnel metrics, and predictive insights directly within the platform. Powered by a columnar data warehouse with sub-second query response times.',
    category: 'Analytics',
    catColor: '#10B981',
    useCases: ['Product Analytics', 'Revenue Attribution', 'Churn Prediction', 'Usage Funnels', 'Exec Dashboards'],
    customers: [
      { name: 'HubSpot',   abbr: 'HS', bg: '#FF7A59' },
      { name: 'Intercom',  abbr: 'IC', bg: '#286EFA' },
      { name: 'Amplitude', abbr: 'AM', bg: '#187AE0' },
      { name: 'Brex',      abbr: 'BX', bg: '#1A1A2E' },
    ],
    competitors: [
      { name: 'Mixpanel',  edge: 'Integrated with operational data, not siloed' },
      { name: 'Looker',    edge: 'No separate BI tool needed, native embedding' },
      { name: 'Heap',      edge: 'Predictive models built-in, not bolted on' },
    ],
  },
]

function ProductSection({ company, dbProducts }: { company: Company; dbProducts: DbContent['products'] }) {
  const color = company.logo_color ?? '#063f76'
  const products = dbProducts.length > 0
    ? dbProducts.map(p => ({
        id: p.id,
        name: p.name,
        tagline: p.tagline ?? '',
        description: p.description ?? '',
        category: p.category ?? '',
        catColor: p.cat_color,
        useCases:    (() => {
          const raw = Array.isArray(p.use_cases) ? p.use_cases : (typeof p.use_cases === 'string' ? (() => { try { return JSON.parse(p.use_cases as string) } catch { return [] } })() : [])
          return (raw as unknown[]).map((uc) => (typeof uc === 'string' ? uc : (uc && typeof (uc as Record<string,unknown>).text === 'string' ? (uc as Record<string,unknown>).text as string : String(uc))))
        })(),
        customers:   (p.customers as { name: string; abbr: string; bg: string }[]) ?? [],
        competitors: (p.competitors as { name: string; description?: string; edge: string }[]) ?? [],
        imageUrl:    p.image_url ?? null,
      }))
    : PRODUCTS
  const [activeId, setActiveId] = useState<string>(products[0]?.id ?? 'core')
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({})

  const p = products.find(x => x.id === activeId) ?? products[0]
  const imgError = imgErrors[p?.id ?? ''] ?? false

  return (
    <div>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ color: '#09090B', fontSize: 15, fontWeight: 800, letterSpacing: '-0.04em' }}>Product Suite</div>
          <div style={{ color: '#71717A', fontSize: 12, marginTop: 2 }}>
            {products.length} products · select one to explore
          </div>
        </div>
        <div style={{ padding: '4px 10px', borderRadius: 8, background: `${color}10`, border: `1px solid ${color}30`, color, fontSize: 11.5, fontWeight: 700 }}>
          {company.category ?? 'Technology'}
        </div>
      </div>

      {/* Product switcher tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {products.map(prod => {
          const isActive = prod.id === activeId
          return (
            <button
              key={prod.id}
              onClick={() => { setActiveId(prod.id) }}
              style={{
                padding: '7px 14px', borderRadius: 9,
                border: isActive ? `1.5px solid ${color}` : '1.5px solid #E4E4E7',
                background: isActive ? `${color}08` : '#fff',
                color: isActive ? color : '#52525B',
                fontSize: 12.5, fontWeight: isActive ? 700 : 400,
                cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s, color 0.15s',
                boxShadow: isActive ? `0 2px 8px ${color}20` : '0 1px 3px rgba(0,0,0,0.04)',
              }}
              onMouseEnter={e => { if (!isActive) { const el = e.currentTarget as HTMLElement; el.style.borderColor = '#D4D4D8'; el.style.background = '#FAFAFA' } }}
              onMouseLeave={e => { if (!isActive) { const el = e.currentTarget as HTMLElement; el.style.borderColor = '#E4E4E7'; el.style.background = '#fff' } }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: isActive ? color : '#D4D4D8', display: 'inline-block', flexShrink: 0, transition: 'background 0.15s' }} />
                {prod.name}
              </span>
            </button>
          )
        })}
      </div>

      {/* Detail card */}
      <div style={{ borderRadius: 14, border: '1px solid #E4E4E7', overflow: 'hidden', background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>

        {/* ── Full-width: header + description ── */}
        <div style={{ padding: '18px 20px 16px', borderBottom: '1px solid #F0F0F2' }}>
          <span style={{ display: 'inline-block', padding: '3px 9px', borderRadius: 5, background: p.catColor, color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', marginBottom: 8 }}>
            {p.category}
          </span>
          <div style={{ color: '#09090B', fontSize: 16, fontWeight: 800, letterSpacing: '-0.04em', marginBottom: 2 }}>{p.name}</div>
          <div style={{ color: '#71717A', fontSize: 12.5, fontStyle: 'italic', marginBottom: 12 }}>{p.tagline}</div>
          <p style={{ color: '#3F3F46', fontSize: 13, lineHeight: 1.75, margin: 0 }}>{p.description}</p>
        </div>

        {/* ── Use cases: full width ── */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #F0F0F2' }}>
          <div style={{ color: '#A1A1AA', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Use Cases</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {p.useCases.map(uc => (
              <span key={uc} style={{ padding: '4px 10px', borderRadius: 6, background: `${color}0D`, color, fontSize: 12, fontWeight: 600, border: `1px solid ${color}22` }}>
                {uc}
              </span>
            ))}
          </div>
        </div>

        {/* ── Bottom: sidebar + competitor cards ── */}
        <div className="product-detail-grid" style={{ display: 'grid', gridTemplateColumns: '190px 1fr' }}>

          {/* ── Left sidebar: image on top, customers below ── */}
          <div className="product-detail-col" style={{ borderRight: '1px solid #F0F0F2', display: 'flex', flexDirection: 'column' }}>

            {/* Product image */}
            <div className="product-detail-img" style={{
              background: `linear-gradient(145deg, ${color}08 0%, ${color}03 100%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '20px 16px', minHeight: 120, borderBottom: '1px solid #F0F0F2',
            }}>
              {p.imageUrl && !imgError ? (
                <img
                  src={p.imageUrl}
                  alt={p.name}
                  onError={() => setImgErrors(prev => ({ ...prev, [p.id]: true }))}
                  style={{ width: '100%', maxHeight: 90, objectFit: 'contain', display: 'block' }}
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                  </div>
                  <span style={{ color, fontSize: 10, fontWeight: 600, opacity: 0.3 }}>No image</span>
                </div>
              )}
            </div>

            {/* Key customers */}
            <div style={{ padding: '14px 16px', flex: 1 }}>
              <div style={{ color: '#A1A1AA', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Key Customers</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {p.customers.length > 0 ? p.customers.map(c => (
                  <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 22, height: 22, borderRadius: 5, background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ color: '#fff', fontSize: 8.5, fontWeight: 800 }}>{c.abbr}</span>
                    </div>
                    <span style={{ color: '#3F3F46', fontSize: 12, fontWeight: 500 }}>{c.name}</span>
                  </div>
                )) : (
                  <span style={{ color: '#D4D4D8', fontSize: 11.5, fontStyle: 'italic' }}>Not specified</span>
                )}
              </div>
            </div>
          </div>

          {/* ── Right: competitor intelligence cards ── */}
          <div style={{ padding: '16px 20px' }}>
            <div style={{ color: '#A1A1AA', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Competitive Intelligence</div>

            {p.competitors.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {p.competitors.map(c => (
                  <div key={c.name} style={{
                    borderRadius: 10,
                    border: '1px solid #F0F0F2',
                    overflow: 'hidden',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}>
                    {/* Card header */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 7,
                      padding: '8px 12px',
                      background: '#FAFAFA',
                      borderBottom: '1px solid #F0F0F2',
                    }}>
                      <span style={{
                        fontSize: 8.5, color: '#EF4444', fontWeight: 800,
                        background: '#FEF2F2', border: '1px solid #FECACA',
                        borderRadius: 3, padding: '1px 5px', letterSpacing: '0.04em', flexShrink: 0,
                      }}>VS</span>
                      <span style={{ color: '#09090B', fontSize: 12.5, fontWeight: 700, letterSpacing: '-0.01em' }}>{c.name}</span>
                    </div>

                    {/* THEM row */}
                    {c.description && (
                      <div style={{
                        display: 'flex', gap: 0,
                        borderBottom: '1px solid #F0F0F2',
                      }}>
                        <div style={{
                          width: 36, flexShrink: 0,
                          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                          paddingTop: 9,
                          background: '#F7F7F8',
                          borderRight: '1px solid #F0F0F2',
                        }}>
                          <span style={{ fontSize: 8, fontWeight: 800, color: '#A1A1AA', letterSpacing: '0.06em', writingMode: 'vertical-rl', transform: 'rotate(180deg)', userSelect: 'none' }}>THEM</span>
                        </div>
                        <div style={{ padding: '8px 12px', flex: 1 }}>
                          <p style={{ margin: 0, color: '#71717A', fontSize: 11.5, lineHeight: 1.6 }}>{c.description}</p>
                        </div>
                      </div>
                    )}

                    {/* EDGE row */}
                    <div style={{ display: 'flex', gap: 0 }}>
                      <div style={{
                        width: 36, flexShrink: 0,
                        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                        paddingTop: 9,
                        background: `${color}08`,
                        borderRight: `1px solid ${color}20`,
                      }}>
                        <span style={{ fontSize: 8, fontWeight: 800, color, letterSpacing: '0.06em', writingMode: 'vertical-rl', transform: 'rotate(180deg)', userSelect: 'none', opacity: 0.7 }}>EDGE</span>
                      </div>
                      <div style={{ padding: '8px 12px', flex: 1, background: `${color}04` }}>
                        <p style={{ margin: 0, color: '#1a1a1a', fontSize: 12, lineHeight: 1.6, fontWeight: 500 }}>{c.edge}</p>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            ) : (
              <span style={{ color: '#D4D4D8', fontSize: 11.5, fontStyle: 'italic' }}>No competitive data available</span>
            )}
          </div>

        </div>
      </div>
      <style>{`
        @media (max-width: 600px) {
          .product-detail-grid { grid-template-columns: 1fr !important; }
          .product-detail-col { border-right: none !important; border-bottom: 1px solid #F0F0F2; }
          .product-detail-img { border-top: 1px solid #F0F0F2 !important; min-height: 100px; }
        }
      `}</style>
    </div>
  )
}

// ─── SectionContent ───────────────────────────────────────────────────────────

function SectionContent({ id, company, dbContent }: { id: SectionId; company: Company; dbContent: DbContent }) {
  const color = company.logo_color ?? '#063f76'

  switch (id) {
    case 'overview':
      return <CompanyOverview company={company} dbNews={dbContent.news} dbMilestones={dbContent.milestones} />

    case 'org':
      return <OrgChart company={company} dbDepts={dbContent.departments} dbRoles={dbContent.roles} dbExecGroups={dbContent.execGroups} dbLeaders={dbContent.leaders} />

    case 'financials': {
      const fin = dbContent.financials

      // ── Parse revenue_growth → normalised bar heights ──────────────────────
      type RgDb = { year: number; revenue: string; growth_rate: string | null }
      const rgRaw = (fin?.revenue_growth as RgDb[] | null) ?? []
      // Parse revenue strings like "$12.2B", "$391.0B", "~$500M" into numbers
      const parseRev = (s: string): number => {
        const m = s.replace(/[~,]/g, '').match(/([\d.]+)\s*([TBMKtbmk])?/)
        if (!m) return 0
        const n = parseFloat(m[1])
        const mult: Record<string, number> = { T:1e12, B:1e9, M:1e6, K:1e3, t:1e12, b:1e9, m:1e6, k:1e3 }
        return n * (mult[m[2] ?? ''] ?? 1)
      }
      const rgSorted = [...rgRaw].sort((a, b) => a.year - b.year).slice(-6)
      const maxRev = Math.max(...rgSorted.map(r => parseRev(r.revenue)), 1)
      const BARS = rgSorted.length > 0
        ? rgSorted.map(r => ({ year: r.year, revenue: r.revenue, growth_rate: r.growth_rate, height: Math.max(12, Math.round(parseRev(r.revenue) / maxRev * 100)) }))
        : [{ year: 2020, revenue: '', growth_rate: null, height: 40 }, { year: 2021, revenue: '', growth_rate: null, height: 54 },
           { year: 2022, revenue: '', growth_rate: null, height: 66 }, { year: 2023, revenue: '', growth_rate: null, height: 81 },
           { year: 2024, revenue: '', growth_rate: null, height: 100 }]

      // ── Parse revenue_streams ──────────────────────────────────────────────
      type StreamDb = { name: string; description?: string; percentage: number; type?: string }
      const STREAM_COLORS: Record<string, string> = {
        subscription: color, transactional: '#2563EB', advertising: '#D97706',
        product: '#059669', services: '#0891B2', other: '#A1A1AA',
      }
      const FALLBACK_STREAM_COLORS = [color, '#06B6D4', '#F59E0B', '#10B981', '#063f76', '#EC4899']
      const rawStreams = (fin?.revenue_streams as StreamDb[] | null) ?? []
      const STREAMS = rawStreams.length > 0
        ? rawStreams.map((s, i) => ({
            name: s.name,
            desc: s.description ?? '',
            pct:  s.percentage,
            clr:  STREAM_COLORS[s.type ?? ''] ?? FALLBACK_STREAM_COLORS[i % FALLBACK_STREAM_COLORS.length],
          }))
        : [
            { name: 'Core Product / Services',   desc: '', pct: 62, clr: color },
            { name: 'Enterprise & Partnerships', desc: '', pct: 22, clr: '#06B6D4' },
            { name: 'Platform & APIs',           desc: '', pct: 11, clr: '#F59E0B' },
            { name: 'Other / Misc',              desc: '', pct: 5,  clr: '#10B981' },
          ]

      // ── Parse business_units ───────────────────────────────────────────────
      type UnitDb = { name: string; description?: string; revenue_contribution?: string }
      const rawUnits = (fin?.business_units as UnitDb[] | null) ?? []
      const UNITS = rawUnits.length > 0
        ? rawUnits.map((u, i) => {
            const pctNum = parseInt(u.revenue_contribution ?? '0')
            const status = i === 0 || pctNum >= 40 ? 'primary' : pctNum >= 15 ? 'growing' : 'early'
            return { name: u.name, growth: u.revenue_contribution ?? '—', status, desc: u.description ?? '' }
          })
        : [
            { name: 'Core Platform',       growth: '~62%',  status: 'primary', desc: 'Main product · primary revenue driver' },
            { name: 'Enterprise Division', growth: '~22%',  status: 'growing', desc: 'Custom integrations & enterprise' },
            { name: 'Developer Tools',     growth: '~11%',  status: 'growing', desc: 'SDKs, APIs & third-party platform' },
            { name: 'Emerging Products',   growth: 'Early', status: 'early',   desc: 'New bets & experimental lines' },
          ]
      const unitColor = (s: string) => s === 'primary' ? color : s === 'growing' ? '#10B981' : '#F59E0B'

      // ── Parse competitors for market-share donut ───────────────────────────
      // DB stores {name, pct, clr}[] in competitors field; fallback to market_share context
      type CompDb = { name: string; pct: number; clr: string }
      type MsDb   = { segment: string; percentage: number; context: string; year?: number }
      const rawCompetitors = (fin?.competitors as CompDb[] | null) ?? []
      const rawMarketShare = (fin?.market_share as MsDb[] | null) ?? []

      // Build MARKET array: company first, then competitors
      const MARKET: { name: string; pct: number; clr: string }[] = rawCompetitors.length > 0
        ? rawCompetitors
        : [
            { name: company.name,   pct: 34, clr: color },
            { name: 'Competitor A', pct: 28, clr: '#94A3B8' },
            { name: 'Competitor B', pct: 19, clr: '#CBD5E1' },
            { name: 'Others',       pct: 19, clr: '#E2E8F0' },
          ]

      // Company's own share for donut centre label
      const ownEntry = MARKET.find(m => m.name === company.name) ?? MARKET[0]
      const ownPct   = ownEntry?.pct ?? rawMarketShare[0]?.percentage ?? 34

      // Market label from market_share context or category
      const msContext  = rawMarketShare[0]?.segment ?? ''
      const cat        = (company.category ?? '').toLowerCase()
      const marketLabel = msContext || (() => {
        if (cat.includes('payment') || cat.includes('fintech'))      return 'Digital Payments'
        if (cat.includes('cloud') || cat.includes('infrastructure')) return 'Cloud Infrastructure'
        if (cat.includes('ecommerce') || cat.includes('e-commerce')) return 'E-commerce Platforms'
        if (cat.includes('saas') || cat.includes('software'))        return 'B2B SaaS Software'
        if (cat.includes('social') || cat.includes('media'))         return 'Social Media Platforms'
        if (cat.includes('ai') || cat.includes('machine learning'))  return 'AI & ML Platforms'
        if (cat.includes('crypto') || cat.includes('blockchain'))    return 'Crypto & Blockchain'
        if (cat.includes('cyber') || cat.includes('security'))       return 'Cybersecurity'
        if (cat.includes('data') || cat.includes('analytics'))       return 'Data & Analytics'
        if (cat.includes('streaming') || cat.includes('video'))      return 'Video Streaming'
        if (cat.includes('travel') || cat.includes('hospitality'))   return 'Travel & Hospitality'
        return company.category ?? 'Technology'
      })()

      let cum = 0
      const donut = `conic-gradient(${MARKET.map(m => { const f = cum; cum += m.pct; return `${m.clr} ${f}% ${cum}%` }).join(', ')})`

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* ── KPIs ──────────────────────────────────────────── */}
          <div className="co-3col" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {[
              { label: 'Annual Revenue',     value: company.revenue ?? fin?.arr ?? '$—',      sub: fin?.yoy_growth ? `${fin.yoy_growth} vs prior year` : 'See revenue growth below' },
              { label: 'YoY Growth',         value: fin?.yoy_growth ?? '—',                    sub: BARS.length > 1 ? `From ${BARS[0]?.revenue} to ${BARS[BARS.length-1]?.revenue}` : 'Year-over-year revenue change' },
              { label: 'Revenue / Employee', value: fin?.revenue_per_employee ?? '—',           sub: 'Annual revenue per full-time employee' },
            ].map(kpi => (
              <div key={kpi.label} style={{ padding: '14px 16px', borderRadius: 12, background: '#F7F7F8', border: '1px solid #F0F0F2' }}>
                <div style={{ color: '#A1A1AA', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{kpi.label}</div>
                <div style={{ color: '#09090B', fontSize: 22, fontWeight: 800, letterSpacing: '-0.04em', marginBottom: 3 }}>{kpi.value}</div>
                <div style={{ color: '#71717A', fontSize: 10.5, fontWeight: 500 }}>{kpi.sub}</div>
              </div>
            ))}
          </div>

          {/* ── Revenue chart + Market share ──────────────────── */}
          <div className="co-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>

            {/* Revenue growth bars */}
            <div style={{ padding: '14px 16px', borderRadius: 12, background: '#fff', border: '1px solid #E4E4E7' }}>
              <div style={{ color: '#A1A1AA', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Revenue Growth</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 76 }}>
                {BARS.map((bar, i, arr) => (
                  <div key={bar.year} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                    <div title={bar.revenue || ''} style={{
                      width: '100%', height: `${Math.round(bar.height * 0.72)}px`,
                      background: i === arr.length - 1 ? color : '#E4E4E7',
                      borderRadius: '3px 3px 0 0', transition: 'height 0.4s ease',
                    }} />
                    <div style={{ color: '#A1A1AA', fontSize: 9.5 }}>{bar.year}</div>
                  </div>
                ))}
              </div>
              {/* Revenue labels under bars */}
              {BARS.some(b => b.revenue) && (
                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  {BARS.map(bar => (
                    <div key={bar.year} style={{ flex: 1, textAlign: 'center', fontSize: 8.5, color: '#A1A1AA', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {bar.revenue}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Market share donut */}
            <div style={{ padding: '14px 16px', borderRadius: 12, background: '#fff', border: '1px solid #E4E4E7' }}>
              <div style={{ marginBottom: 12 }}>
                <div style={{ color: '#A1A1AA', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Market Share</div>
                <div style={{ color: '#09090B', fontSize: 12, fontWeight: 700, letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{marketLabel}</div>
              </div>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <div style={{ width: 88, height: 88, borderRadius: '50%', background: donut, flexShrink: 0, position: 'relative' }}>
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 52, height: 52, borderRadius: '50%', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#09090B', lineHeight: 1 }}>{ownPct}%</div>
                    <div style={{ fontSize: 8, color: '#A1A1AA', marginTop: 1 }}>share</div>
                  </div>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {MARKET.slice(0, 5).map(m => (
                    <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 7, height: 7, borderRadius: 2, background: m.clr, flexShrink: 0 }} />
                      <div style={{ flex: 1, color: '#52525B', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
                      <div style={{ color: m.name === company.name ? color : '#71717A', fontSize: 11, fontWeight: m.name === company.name ? 700 : 400 }}>{m.pct}%</div>
                    </div>
                  ))}
                </div>
              </div>
              {/* TAM/SAM/SOM */}
              <div style={{ marginTop: 11, paddingTop: 10, borderTop: '1px solid #F0F0F2', display: 'flex', gap: 16 }}>
                {[{ l: 'TAM', v: fin?.tam ?? '—' }, { l: 'SAM', v: fin?.sam ?? '—' }, { l: 'SOM', v: fin?.som ?? '—' }].map(m => (
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
              <div style={{ color: '#A1A1AA', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Revenue Streams</div>
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
              <div style={{ color: '#A1A1AA', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Business Units</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {UNITS.map(u => (
                  <div key={u.name} style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: unitColor(u.status), flexShrink: 0, marginTop: 4 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: '#09090B', fontSize: 12, fontWeight: 600 }}>{u.name}</span>
                        <span style={{ padding: '1px 7px', borderRadius: 5, flexShrink: 0, background: u.status === 'early' ? '#FEF3C7' : '#DCFCE7', color: u.status === 'early' ? '#92400E' : '#15803D', fontSize: 10, fontWeight: 700 }}>{u.growth}</span>
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

    case 'internal':
      return <InternalSection company={company} dbDepts={dbContent.departments} dbRoles={dbContent.roles} dbStandards={dbContent.standards} />

    case 'prep':
      return <PrepSection dbDepts={dbContent.departments} dbRoles={dbContent.roles} />

    case 'product':
      return <ProductSection company={company} dbProducts={dbContent.products} />
  }
}

interface RelatedCompany {
  id: string; name: string; slug: string; category: string | null
  description: string | null; logo_color: string | null; logo_url: string | null
}

export default function CompanyFull({ company, initialSaved, dbContent, relatedCompanies = [] }: { company: Company; initialSaved: boolean; dbContent: DbContent; relatedCompanies?: RelatedCompany[] }) {
  const [activeSection, setActiveSection] = useState<SectionId>('overview')
  const [animKey, setAnimKey] = useState(0)
  const color = company.logo_color ?? '#063f76'

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
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#063f76'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#A1A1AA'}
          >Home</Link>
          <span style={{ color: '#D4D4D8', fontSize: '13px' }}>›</span>
          <span style={{ color: '#A1A1AA', fontSize: '13px' }}>{company.category}</span>
          <span style={{ color: '#D4D4D8', fontSize: '13px' }}>›</span>
          <span style={{ color: '#09090B', fontSize: '13px', fontWeight: 600 }}>{company.name}</span>
          <div style={{ marginLeft: 'auto' }}>
            <SaveButton companyId={company.id} companyName={company.name} initialSaved={initialSaved} logoColor={color} />
          </div>
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
          </button>
        ))}
      </div>

      {/* Main layout */}
      <div className="company-layout" style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 24px', display: 'grid', gridTemplateColumns: '220px 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Sidebar — hidden on mobile via CSS */}
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
              <span style={{ fontSize: '12.5px', fontWeight: activeSection === nav.id ? 600 : 400, color: activeSection === nav.id ? '#063f76' : '#52525B' }}>
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
          <SectionContent id={activeSection} company={company} dbContent={dbContent} />
        </div>
      </div>

      {/* Related companies */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px 40px' }}>
        <RelatedCompanies companies={relatedCompanies} />
      </div>
    </div>
  )
}
