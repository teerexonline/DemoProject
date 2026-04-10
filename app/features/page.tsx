'use client'

import Link from 'next/link'
import { Building2, Network, TrendingUp, Settings, Target, Package, Check, ArrowRight } from 'lucide-react'

// ── Mini mockup components ─────────────────────────────────────────────────────

function CompanyOverviewMockup() {
  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2eaf2', overflow: 'hidden', boxShadow: '0 4px 20px rgba(6,63,118,0.07)' }}>
      {/* Header */}
      <div style={{ padding: '16px 18px', borderBottom: '1px solid #F4F4F5', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: '#063f76', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ color: '#fff', fontSize: 13, fontWeight: 800 }}>S</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#09090B', letterSpacing: '-0.03em' }}>Stripe</div>
          <div style={{ fontSize: 11, color: '#71717A' }}>Financial Infrastructure · San Francisco</div>
        </div>
        <div style={{ padding: '3px 8px', borderRadius: 5, background: '#eef4fb', border: '1px solid #a8cbe8', fontSize: 10, fontWeight: 700, color: '#063f76' }}>Private</div>
      </div>
      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, borderBottom: '1px solid #F4F4F5' }}>
        {[{ label: 'Founded', val: '2010' }, { label: 'Employees', val: '8,000+' }, { label: 'Stage', val: 'Late' }, { label: 'HQ', val: 'SF, CA' }].map((s, i) => (
          <div key={s.label} style={{ padding: '10px 14px', textAlign: 'center', borderRight: i < 3 ? '1px solid #F4F4F5' : 'none' }}>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: '#09090B', letterSpacing: '-0.02em' }}>{s.val}</div>
            <div style={{ fontSize: 9.5, color: '#A1A1AA', marginTop: 1 }}>{s.label}</div>
          </div>
        ))}
      </div>
      {/* Description */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #F4F4F5' }}>
        <div style={{ fontSize: 12, color: '#52525B', lineHeight: 1.6 }}>
          Stripe builds economic infrastructure for the internet. Businesses of every size use Stripe to accept payments and grow their revenue online.
        </div>
      </div>
      {/* Milestones preview */}
      <div style={{ padding: '12px 18px' }}>
        <div style={{ fontSize: 9.5, fontWeight: 700, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 10 }}>Company History</div>
        {[
          { year: '2010', title: 'Stripe founded', badge: 'Origin', color: '#063f76' },
          { year: '2016', title: 'Series D — $150M', badge: 'Funding', color: '#059669' },
          { year: '2023', title: 'Revenue surpasses $3B ARR', badge: 'Milestone', color: '#D97706' },
        ].map(m => (
          <div key={m.year} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid #F9F9F9' }}>
            <span style={{ fontSize: 10.5, fontWeight: 800, color: '#A1A1AA', minWidth: 32 }}>{m.year}</span>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: m.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: '#374151', flex: 1 }}>{m.title}</span>
            <span style={{ padding: '1px 7px', borderRadius: 4, background: `${m.color}15`, color: m.color, fontSize: 9.5, fontWeight: 700 }}>{m.badge}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function OrgChartMockup() {
  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2eaf2', padding: '20px', boxShadow: '0 4px 20px rgba(6,63,118,0.07)' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>Org Structure · 4 departments</div>
      {[
        { name: 'Engineering', headcount: 210, color: '#3B82F6', w: 68 },
        { name: 'Product', headcount: 85, color: '#7C3AED', w: 42 },
        { name: 'Sales', headcount: 180, color: '#F59E0B', w: 58 },
        { name: 'Design', headcount: 42, color: '#A855F7', w: 28 },
      ].map((d, i, arr) => (
        <div key={d.name} style={{ marginBottom: i < arr.length - 1 ? 10 : 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{d.name}</span>
            <span style={{ fontSize: 11, color: '#A1A1AA' }}>{d.headcount} people</span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: '#F4F4F5', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${d.w}%`, borderRadius: 3, background: d.color, opacity: 0.8 }} />
          </div>
        </div>
      ))}
      <div style={{ padding: '10px 12px', borderRadius: 8, background: '#eef4fb', border: '1px solid #a8cbe8' }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: '#063f76', marginBottom: 6 }}>Key decision-maker</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#063f76', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ color: '#fff', fontSize: 9, fontWeight: 800 }}>VP</span>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#09090B' }}>Head of Engineering</div>
            <div style={{ fontSize: 10.5, color: '#71717A' }}>Reports to CTO · 210 reports</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function FinancialsMockup() {
  const bars = [
    { year: '2020', value: 28 },
    { year: '2021', value: 45 },
    { year: '2022', value: 63 },
    { year: '2023', value: 82 },
    { year: '2024', value: 100 },
  ]
  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2eaf2', padding: '20px', boxShadow: '0 4px 20px rgba(6,63,118,0.07)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Annual Revenue</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#09090B', letterSpacing: '-0.04em' }}>$3.0B</div>
        </div>
        <div style={{ padding: '4px 10px', borderRadius: 100, background: '#F0FDF4', border: '1px solid #BBF7D0', fontSize: 11, fontWeight: 700, color: '#16A34A' }}>+20% YoY</div>
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 56, marginBottom: 14 }}>
        {bars.map(b => (
          <div key={b.year} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ width: '100%', height: `${b.value * 0.54}px`, borderRadius: '3px 3px 0 0', background: b.value === 100 ? '#16A34A' : '#a8cbe8', opacity: b.value === 100 ? 1 : 0.65 }} />
            <div style={{ fontSize: 9, color: '#A1A1AA', fontWeight: 500 }}>{b.year}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {[
          { round: 'Series A', amount: '$2M', year: '2011', color: '#059669' },
          { round: 'Series B', amount: '$18M', year: '2012', color: '#059669' },
          { round: 'Series D', amount: '$150M', year: '2016', color: '#059669' },
        ].map(r => (
          <div key={r.round} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 7, background: '#F9FFF9', border: '1px solid #DCFCE7' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: r.color, flexShrink: 0 }} />
            <span style={{ fontSize: 11.5, fontWeight: 600, color: '#09090B', flex: 1 }}>{r.round}</span>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: r.color }}>{r.amount}</span>
            <span style={{ fontSize: 10.5, color: '#A1A1AA' }}>{r.year}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function InternalToolsMockup() {
  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2eaf2', overflow: 'hidden', boxShadow: '0 4px 20px rgba(6,63,118,0.07)' }}>
      {/* Dept header */}
      <div style={{ padding: '12px 16px', background: '#3B82F608', borderBottom: '1px solid #3B82F620', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: '#09090B' }}>Engineering</span>
        <span style={{ fontSize: 11, color: '#A1A1AA' }}>· 210 people · 4 roles</span>
      </div>
      {/* Role row */}
      <div style={{ padding: '12px 16px', background: '#FAFAFA', borderBottom: '1px solid #F0F0F2', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ padding: '2px 8px', borderRadius: 6, background: '#2563EB15', color: '#2563EB', fontSize: 10.5, fontWeight: 700 }}>Senior</span>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#09090B' }}>Software Engineer</span>
        <span style={{ fontSize: 10, color: '#A1A1AA' }}>▲</span>
      </div>
      {/* Role detail */}
      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          <div style={{ padding: '10px', borderRadius: 8, background: '#F7F7F8', border: '1px solid #F0F0F2' }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 6 }}>Tools</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              {['GitHub', 'Datadog', 'Terraform'].map(t => (
                <span key={t} style={{ padding: '2px 6px', borderRadius: 4, background: '#fff', border: '1px solid #E4E4E7', color: '#374151', fontSize: 10 }}>{t}</span>
              ))}
            </div>
          </div>
          <div style={{ padding: '10px', borderRadius: 8, background: '#F7F7F8', border: '1px solid #F0F0F2' }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 6 }}>Key Skills</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              {['Go', 'Kubernetes', 'gRPC'].map(s => (
                <span key={s} style={{ padding: '2px 6px', borderRadius: 4, background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1D4ED8', fontSize: 10 }}>{s}</span>
              ))}
            </div>
          </div>
          <div style={{ padding: '10px', borderRadius: 8, background: '#F7F7F8', border: '1px solid #F0F0F2' }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 6 }}>Processes</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {['On-call rotation', 'Weekly sprints'].map(p => (
                <div key={p} style={{ display: 'flex', gap: 4 }}>
                  <span style={{ color: '#10B981', fontSize: 10 }}>•</span>
                  <span style={{ fontSize: 10, color: '#52525B' }}>{p}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Compliance */}
        <div style={{ marginTop: 10, padding: '8px 10px', borderRadius: 7, background: '#EFF6FF', border: '1px solid #BFDBFE', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 4, height: 28, borderRadius: 2, background: '#3B82F6', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: '#1D4ED8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Security</div>
            <div style={{ fontSize: 11.5, fontWeight: 800, color: '#09090B' }}>SOC 2 Type II</div>
          </div>
          <div style={{ marginLeft: 'auto', padding: '2px 8px', borderRadius: 4, background: '#DCFCE7', color: '#15803D', fontSize: 9.5, fontWeight: 700 }}>Certified</div>
        </div>
      </div>
    </div>
  )
}

function InterviewMockup() {
  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2eaf2', overflow: 'hidden', boxShadow: '0 4px 20px rgba(6,63,118,0.07)' }}>
      {/* Dept header */}
      <div style={{ padding: '12px 16px', background: '#DC262608', borderBottom: '1px solid #DC262620', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: '#09090B' }}>Engineering</span>
        <span style={{ fontSize: 11, color: '#A1A1AA' }}>· 4 roles</span>
      </div>
      {/* Role row */}
      <div style={{ padding: '12px 16px', background: '#FAFAFA', borderBottom: '1px solid #F0F0F2', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ padding: '2px 8px', borderRadius: 6, background: '#2563EB15', color: '#2563EB', fontSize: 10.5, fontWeight: 700 }}>Senior</span>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#09090B' }}>Software Engineer</span>
        <span style={{ fontSize: 10.5, color: '#A1A1AA' }}>5 questions · 8 keywords</span>
        <span style={{ fontSize: 10, color: '#A1A1AA' }}>▲</span>
      </div>
      {/* Interview content */}
      <div style={{ padding: '14px 16px' }}>
        <div style={{ padding: '12px 14px', borderRadius: 10, background: '#eef4fb', border: '1px solid #a8cbe8', marginBottom: 10 }}>
          <div style={{ fontSize: 9.5, fontWeight: 800, color: '#04294f', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
            Likely Interview Questions
          </div>
          {[
            'How does your team balance speed vs. reliability in production?',
            'Walk me through a time you navigated ambiguity in a large org.',
          ].map((q, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: i < 1 ? 8 : 0 }}>
              <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#063f76', color: '#fff', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
              <span style={{ fontSize: 11.5, color: '#3B0764', lineHeight: 1.5 }}>{q}</span>
            </div>
          ))}
        </div>
        <div style={{ padding: '10px 12px', borderRadius: 8, background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
          <div style={{ fontSize: 9.5, fontWeight: 800, color: '#15803D', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2H2v10l9.29 9.29a1 1 0 0 0 1.41 0l7.3-7.3a1 1 0 0 0 0-1.42L12 2z"/><circle cx="7" cy="7" r="1"/></svg>
            Keywords to Use
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {['distributed systems', 'SLO/SLA', 'on-call', 'platform eng', 'zero-downtime'].map(kw => (
              <span key={kw} style={{ padding: '3px 8px', borderRadius: 5, background: '#fff', border: '1px solid #BBF7D0', color: '#166534', fontSize: 10.5, fontWeight: 500 }}>{kw}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ProductUseCasesMockup() {
  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2eaf2', overflow: 'hidden', boxShadow: '0 4px 20px rgba(6,63,118,0.07)' }}>
      {/* Product tabs */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #F4F4F5', display: 'flex', gap: 6 }}>
        {[{ name: 'Payments', active: true }, { name: 'Billing', active: false }, { name: 'Radar', active: false }].map(p => (
          <div key={p.name} style={{ padding: '4px 10px', borderRadius: 6, background: p.active ? '#063f76' : '#F4F4F5', color: p.active ? '#fff' : '#71717A', fontSize: 11.5, fontWeight: 600, cursor: 'default' }}>{p.name}</div>
        ))}
      </div>
      <div style={{ padding: '16px' }}>
        {/* Product header */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{ padding: '2px 8px', borderRadius: 4, background: '#3B82F615', color: '#2563EB', fontSize: 10, fontWeight: 700 }}>Core Product</div>
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#09090B', letterSpacing: '-0.03em', marginBottom: 4 }}>Stripe Payments</div>
          <div style={{ fontSize: 11.5, color: '#71717A', lineHeight: 1.5 }}>Accept payments online, in-person, and globally with a single integration.</div>
        </div>
        {/* Use cases */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 6 }}>Use Cases</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {['Online Checkout', 'Subscriptions', 'Global Payments', 'Invoicing'].map(uc => (
              <span key={uc} style={{ padding: '3px 8px', borderRadius: 5, background: '#F4F4F5', color: '#374151', fontSize: 10.5, fontWeight: 500 }}>{uc}</span>
            ))}
          </div>
        </div>
        {/* Customers */}
        <div>
          <div style={{ fontSize: 9.5, fontWeight: 700, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 6 }}>Notable Customers</div>
          <div style={{ display: 'flex', gap: 5 }}>
            {[{ abbr: 'SH', bg: '#96BF48' }, { abbr: 'AW', bg: '#FF9900' }, { abbr: 'LY', bg: '#FF00BF' }, { abbr: 'ZM', bg: '#2D8CFF' }].map(c => (
              <div key={c.abbr} style={{ width: 26, height: 26, borderRadius: 7, background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#fff', fontSize: 9, fontWeight: 800 }}>{c.abbr}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Feature sections — matches the exact NAV order in CompanyFull.tsx ──────────

const FEATURES = [
  {
    icon: Building2,
    color: '#2563EB',
    bg: '#EFF6FF',
    label: 'Company Overview',
    title: 'The full picture on any company, fast.',
    body: 'Beyond the homepage. ResearchOrg gives you a structured snapshot of every company — founding story, mission, culture signals, key stats, recent news, and a full milestone history so you understand where they came from and where they\'re headed.',
    bullets: ['Company description, stage & headquarters', 'Key stats: headcount, founded, category', 'Company history & milestone timeline', 'Recent news & announcements'],
    mockup: <CompanyOverviewMockup />,
    flip: false,
  },
  {
    icon: Network,
    color: '#7C3AED',
    bg: '#F5F3FF',
    label: 'Org Chart',
    title: 'See who\'s who before the first interview.',
    body: 'Understand how a company is really structured — not just what\'s on their LinkedIn. See real department sizes, reporting lines, headcount distribution, and the people who actually make decisions in each team.',
    bullets: ['Department breakdown & headcount', 'Reporting lines & team structure', 'Key decision-makers identified', 'Headcount distribution across functions'],
    mockup: <OrgChartMockup />,
    flip: true,
  },
  {
    icon: TrendingUp,
    color: '#16A34A',
    bg: '#F0FDF4',
    label: 'Financials',
    title: 'Size up any company\'s financial health.',
    body: 'Revenue estimates, funding rounds, headcount trends, and year-over-year growth signals — all in one view. Walk into your interview knowing exactly how the company is performing and where it\'s headed financially.',
    bullets: ['Revenue estimates & annual growth', 'Funding rounds, amounts & investors', 'Headcount growth over time', 'Revenue growth chart'],
    mockup: <FinancialsMockup />,
    flip: false,
  },
  {
    icon: Settings,
    color: '#EA580C',
    bg: '#FFF7ED',
    label: 'Internal Tools & Processes',
    title: 'Know their stack before you walk through the door.',
    body: 'Discover the exact tools, skills, and processes each role and department uses. From Kubernetes to Notion to on-call rotations — plus compliance certifications that reveal how mature their engineering and security culture really is.',
    bullets: ['Per-role tools, skills & processes', 'Department-level internal tooling', 'Standards & compliance certifications', 'Security audits and frameworks held'],
    mockup: <InternalToolsMockup />,
    flip: true,
  },
  {
    icon: Target,
    color: '#DC2626',
    bg: '#FEF2F2',
    label: 'Interview Prep',
    title: 'Walk in with the answers they\'re looking for.',
    body: 'Role-specific interview guidance built from what companies actually care about. Know what questions to expect, which keywords signal you belong, and how to speak the language of each specific team you\'re interviewing with.',
    bullets: ['Likely interview questions per role', 'Keywords to use on resume & in interview', 'Department & role-level context', 'Browsable by department and seniority level'],
    mockup: <InterviewMockup />,
    flip: false,
  },
  {
    icon: Package,
    color: '#CA8A04',
    bg: '#FEFCE8',
    label: 'Product Use Cases',
    title: 'Understand what they actually build and sell.',
    body: 'Get a breakdown of each company\'s real products — what they do, who uses them, what problems they solve, and who the competitors are. Useful for understanding the business context before any product, sales, or engineering interview.',
    bullets: ['Product-by-product breakdown', 'Real-world use cases per product', 'Notable customers for each product', 'Competitors and strategic positioning'],
    mockup: <ProductUseCasesMockup />,
    flip: true,
  },
]

// ── Page ───────────────────────────────────────────────────────────────────────

export default function FeaturesPage() {
  return (
    <div style={{ background: '#FAFAFA', minHeight: '100vh' }}>

      {/* Hero */}
      <div style={{
        background: '#fff',
        borderBottom: '1px solid #e2eaf2',
        padding: '72px 24px 64px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.025,
          backgroundImage: 'linear-gradient(#063f76 1px, transparent 1px), linear-gradient(90deg, #063f76 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(255,255,255,0) 0%, #fff 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '640px', margin: '0 auto' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#eef4fb', border: '1px solid #a8cbe8',
            borderRadius: 100, padding: '4px 14px', marginBottom: 20,
          }}>
            <span style={{ color: '#063f76', fontSize: '11.5px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Product Features</span>
          </div>
          <h1 style={{
            fontSize: 'clamp(30px, 5vw, 52px)',
            fontWeight: 800,
            letterSpacing: '-0.04em',
            color: '#063f76',
            margin: '0 0 18px',
            lineHeight: 1.1,
          }}>
            Everything you need to<br />walk in prepared.
          </h1>
          <p style={{ color: '#71717A', fontSize: '17px', lineHeight: 1.65, margin: '0 0 36px', maxWidth: '460px', marginLeft: 'auto', marginRight: 'auto' }}>
            Six research modules. One platform. Built for job seekers who want to show up knowing more than everyone else in the room.
          </p>
          <div className="features-hero-btns" style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/signup"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '12px 24px', background: '#063f76', color: '#fff', textDecoration: 'none', borderRadius: 10, fontWeight: 600, fontSize: 14, letterSpacing: '-0.01em', boxShadow: '0 4px 12px rgba(6,63,118,0.3)', transition: 'background 0.15s' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#04294f'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#063f76'}
            >
              Get started free
              <ArrowRight size={14} />
            </Link>
            <Link
              href="/pricing"
              style={{ display: 'inline-flex', alignItems: 'center', padding: '12px 24px', background: '#fff', color: '#52525B', textDecoration: 'none', borderRadius: 10, fontWeight: 500, fontSize: 14, border: '1px solid #e2eaf2', transition: 'border-color 0.15s, color 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#a8cbe8'; (e.currentTarget as HTMLElement).style.color = '#063f76' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#e2eaf2'; (e.currentTarget as HTMLElement).style.color = '#52525B' }}
            >
              View pricing
            </Link>
          </div>
        </div>
      </div>

      {/* Feature quick-nav */}
      <div style={{ borderBottom: '1px solid #e2eaf2', background: '#fff', position: 'sticky', top: 60, zIndex: 40 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
          <div className="features-nav" style={{ display: 'flex', gap: 2, overflowX: 'auto', padding: '10px 0', scrollbarWidth: 'none' }}>
            {FEATURES.map(f => (
              <a
                key={f.label}
                href={`#${f.label.toLowerCase().replace(/[\s&]+/g, '-')}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 7, textDecoration: 'none', color: '#52525B', fontSize: 12.5, fontWeight: 500, whiteSpace: 'nowrap', transition: 'color 0.15s, background 0.15s', flexShrink: 0 }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#063f76'; (e.currentTarget as HTMLElement).style.background = '#eef4fb' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#52525B'; (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                <f.icon size={13} color={f.color} strokeWidth={1.75} />
                {f.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Feature deep-dives */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        {FEATURES.map((f, i) => (
          <section
            key={f.label}
            id={f.label.toLowerCase().replace(/[\s&]+/g, '-')}
            style={{
              padding: '80px 0',
              borderBottom: i < FEATURES.length - 1 ? '1px solid #e2eaf2' : 'none',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '64px',
              alignItems: 'center',
            }}
            className="features-section"
          >
            <div style={{ order: f.flip ? 2 : 1 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 12px 5px 8px', borderRadius: 8, background: f.bg, marginBottom: 20 }}>
                <f.icon size={14} color={f.color} strokeWidth={1.75} />
                <span style={{ fontSize: 11.5, fontWeight: 700, color: f.color, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{f.label}</span>
              </div>
              <h2 style={{
                fontSize: 'clamp(22px, 2.5vw, 32px)',
                fontWeight: 800,
                letterSpacing: '-0.04em',
                color: '#063f76',
                margin: '0 0 16px',
                lineHeight: 1.2,
              }}>{f.title}</h2>
              <p style={{ color: '#52525B', fontSize: '15.5px', lineHeight: 1.7, margin: '0 0 24px' }}>{f.body}</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {f.bullets.map(b => (
                  <li key={b} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: f.bg, border: `1px solid ${f.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Check size={10} color={f.color} strokeWidth={2.5} />
                    </div>
                    <span style={{ color: '#374151', fontSize: '13.5px', fontWeight: 500 }}>{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div style={{ order: f.flip ? 1 : 2 }}>
              {f.mockup}
            </div>
          </section>
        ))}
      </div>

      {/* Bottom CTA */}
      <div style={{
        background: '#063f76',
        padding: '80px 24px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.06,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 520, margin: '0 auto' }}>
          <h2 style={{
            fontSize: 'clamp(26px, 3.5vw, 40px)',
            fontWeight: 800,
            letterSpacing: '-0.04em',
            color: '#fff',
            margin: '0 0 14px',
            lineHeight: 1.15,
          }}>
            Ready to research smarter?
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 16, lineHeight: 1.6, margin: '0 0 32px' }}>
            Free plan includes 1 full company view per month. No credit card required.
          </p>
          <div className="features-cta-btns" style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/signup"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '13px 28px', background: '#fff', color: '#063f76', textDecoration: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14.5, letterSpacing: '-0.01em', boxShadow: '0 4px 16px rgba(0,0,0,0.2)', transition: 'opacity 0.15s' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '0.9'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
            >
              Create free account
              <ArrowRight size={14} />
            </Link>
            <Link
              href="/pricing"
              style={{ display: 'inline-flex', alignItems: 'center', padding: '13px 24px', background: 'transparent', color: 'rgba(255,255,255,0.8)', textDecoration: 'none', borderRadius: 10, fontWeight: 500, fontSize: 14, border: '1px solid rgba(255,255,255,0.25)', transition: 'border-color 0.15s, color 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.5)'; (e.currentTarget as HTMLElement).style.color = '#fff' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.25)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.8)' }}
            >
              Compare plans
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .features-section {
            grid-template-columns: 1fr !important;
            gap: 32px !important;
            padding: 48px 0 !important;
          }
          .features-section > div {
            order: unset !important;
          }
          .features-hero-btns {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .features-hero-btns a {
            justify-content: center !important;
          }
          .features-cta-btns {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .features-cta-btns a {
            justify-content: center !important;
          }
        }
        .features-nav::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  )
}
