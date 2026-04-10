'use client'

// ── Scenario data ─────────────────────────────────────────────────────────────

const SCENARIOS = [
  {
    id: 'competitive',
    accent: '#EA580C',
    accentBg: '#FFF7ED',
    tag: 'Competitive positioning',
    question: '"What sets Stripe apart from Adyen and Square — and where are they vulnerable?"',
    context: 'Asked in 4 of 5 Stripe product and go-to-market interviews',
    answer: 'Stripe dominates developer-first internet businesses through API depth and Connect marketplace rails. Adyen is stronger in enterprise in-person unified commerce. Square owns SMB POS but lacks Stripe\'s global payout infrastructure. Stripe\'s vulnerability: enterprise direct sales motion is still maturing versus Adyen\'s embedded bank relationships.',
    answerLabel: 'You\'ll be able to say:',
    featureTag: 'vs Competitors',
    mockup: 'competitors',
    competitors: [
      {
        name: 'Adyen',
        desc: 'Enterprise payment platform unifying in-person and online commerce for global retailers and airlines.',
        edge: 'Developer-first API + Connect marketplace split-payout rails',
        color: '#10B981',
      },
      {
        name: 'Square',
        desc: 'SMB-focused integrated POS and payments ecosystem targeting brick-and-mortar and micro-merchants.',
        edge: 'Internet business infrastructure and global payout reach at scale',
        color: '#3B82F6',
      },
    ],
  },
  {
    id: 'team',
    accent: '#7C3AED',
    accentBg: '#F5F3FF',
    tag: 'Role & team context',
    question: '"Tell me what you know about the day-to-day work of the team you\'d be joining."',
    context: 'The single most differentiating question in engineering and design loops',
    answer: 'Stripe\'s Infrastructure team works on Sorbet — their open-source Ruby type checker — Hadoop pipelines for fraud feature engineering, and P99 latency optimization for global payment routing. They run formal design reviews before any service change and use a blameless postmortem culture for incidents.',
    answerLabel: 'You\'ll be able to say:',
    featureTag: 'Roles & Internal Processes',
    mockup: 'role',
    role: {
      title: 'Software Engineer, Infrastructure',
      level: 'Senior · Payments Platform',
      tools: ['Sorbet', 'Hadoop', 'Ruby', 'Go', 'Kafka', 'Datadog'],
      processes: [
        'Optimizing Stripe payment routing latency at P99 across global traffic',
        'Maintaining Sorbet type annotations across Stripe\'s multi-million-line Ruby monorepo',
        'Running blameless postmortems after payment processing incidents',
      ],
    },
  },
  {
    id: 'financial',
    accent: '#059669',
    accentBg: '#ECFDF5',
    tag: 'Business & strategy',
    question: '"Where do you think Stripe is headed over the next three years?"',
    context: 'Tests whether you understand the business beyond the product surface',
    answer: 'Revenue has grown 136% over five years but payments processing is maturing — the real growth story is Financial Services (Capital, Treasury, Issuing) now representing 18% of revenue and growing faster. The strategic bet is owning the full financial stack for internet businesses, not just the payment moment.',
    answerLabel: 'You\'ll be able to say:',
    featureTag: 'Revenue & Financials',
    mockup: 'financials',
    streams: [
      { name: 'Payments Processing', pct: 72, color: '#533AFD' },
      { name: 'Financial Services',  pct: 18, color: '#0EA5E9' },
      { name: 'Platform & Other',    pct: 10, color: '#10B981' },
    ],
    growth: [
      { y: '2020', v: 7.4 },
      { y: '2021', v: 10.2 },
      { y: '2022', v: 12.6 },
      { y: '2023', v: 14.3 },
      { y: '2024', v: 17.5 },
    ],
  },
]

// ── Mini mockups ──────────────────────────────────────────────────────────────

function CompetitorsMockup({ comps }: { comps: typeof SCENARIOS[0]['competitors'] }) {
  if (!comps) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {comps.map(c => (
        <div key={c.name} style={{
          padding: '13px 15px', borderRadius: '11px',
          background: '#fff', border: '1px solid #E4E4E7',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}>
          <p style={{ color: '#09090B', fontSize: '13px', fontWeight: 700, margin: '0 0 3px' }}>{c.name}</p>
          <p style={{ color: '#71717A', fontSize: '11.5px', lineHeight: 1.55, margin: '0 0 9px' }}>{c.desc}</p>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ flexShrink: 0, marginTop: '1px' }}>
              <circle cx="6.5" cy="6.5" r="6" fill={c.color} opacity="0.15" />
              <path d="M4 6.5l1.8 1.8 3.5-3.6" stroke={c.color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span style={{ color: c.color, fontSize: '11px', fontWeight: 600, lineHeight: 1.4 }}>{c.edge}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function RoleMockup({ role }: { role: typeof SCENARIOS[1]['role'] }) {
  if (!role) return null
  return (
    <div style={{
      borderRadius: '12px', background: '#fff',
      border: '1px solid #E4E4E7',
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      overflow: 'hidden',
    }}>
      <div style={{ padding: '13px 15px', borderBottom: '1px solid #F4F4F5' }}>
        <p style={{ color: '#09090B', fontSize: '13px', fontWeight: 700, margin: '0 0 2px' }}>{role.title}</p>
        <p style={{ color: '#71717A', fontSize: '11px', margin: 0 }}>{role.level}</p>
      </div>
      <div style={{ padding: '12px 15px', borderBottom: '1px solid #F4F4F5' }}>
        <p style={{ color: '#52525B', fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 7px' }}>Day-to-day</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {role.processes.map((p, i) => (
            <div key={i} style={{ display: 'flex', gap: '7px', alignItems: 'flex-start' }}>
              <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#7C3AED', flexShrink: 0, marginTop: '5px' }} />
              <span style={{ color: '#374151', fontSize: '11.5px', lineHeight: 1.5 }}>{p}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding: '12px 15px' }}>
        <p style={{ color: '#52525B', fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 7px' }}>Tools used</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
          {role.tools.map(t => (
            <span key={t} style={{ padding: '3px 9px', borderRadius: '5px', background: '#F4F4F5', border: '1px solid #E4E4E7', color: '#374151', fontSize: '11px', fontWeight: 600 }}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

function FinancialsMockup({ streams, growth }: { streams: typeof SCENARIOS[2]['streams']; growth: typeof SCENARIOS[2]['growth'] }) {
  if (!streams || !growth) return null
  const max = Math.max(...growth.map(g => g.v))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* Revenue streams */}
      <div style={{
        padding: '14px 15px', borderRadius: '11px',
        background: '#fff', border: '1px solid #E4E4E7',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      }}>
        <p style={{ color: '#52525B', fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 10px' }}>Revenue Mix</p>
        {streams.map(s => (
          <div key={s.name} style={{ marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: '#374151', fontSize: '11.5px', fontWeight: 500 }}>{s.name}</span>
              <span style={{ color: s.color, fontSize: '11.5px', fontWeight: 700 }}>{s.pct}%</span>
            </div>
            <div style={{ height: '4px', borderRadius: '2px', background: '#F4F4F5', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${s.pct}%`, background: s.color, borderRadius: '2px' }} />
            </div>
          </div>
        ))}
      </div>
      {/* Mini bar chart */}
      <div style={{
        padding: '13px 15px', borderRadius: '11px',
        background: '#fff', border: '1px solid #E4E4E7',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <p style={{ color: '#52525B', fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 }}>Annual Revenue</p>
          <span style={{ color: '#059669', fontSize: '10.5px', fontWeight: 700, background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '1px 8px', borderRadius: '5px' }}>↑ 136% 5yr</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '56px' }}>
          {growth.map((b, i) => (
            <div key={b.y} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', height: '100%', justifyContent: 'flex-end' }}>
              <div style={{
                width: '100%', borderRadius: '3px 3px 0 0',
                height: `${(b.v / max) * 44}px`,
                background: i === growth.length - 1 ? '#059669' : 'rgba(5,150,105,0.2)',
              }} />
              <span style={{ fontSize: '8.5px', color: '#A1A1AA' }}>{b.y}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main section ──────────────────────────────────────────────────────────────

export default function InterviewScenarios() {
  return (
    <section style={{ padding: '100px 24px', background: '#F7F8FC', borderTop: '1px solid #E4E4E7' }}>
      <style>{`
        .is-card {
          background: #fff;
          border-radius: 20px;
          border: 1px solid #E4E4E7;
          overflow: hidden;
          box-shadow: 0 2px 16px rgba(0,0,0,0.04);
          transition: box-shadow 0.25s ease;
        }
        .is-card:hover {
          box-shadow: 0 6px 32px rgba(0,0,0,0.08);
        }
        .is-answer-block {
          padding: 18px 22px;
          border-radius: 12px;
        }
        @media (max-width: 760px) {
          .is-body { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <p style={{ color: '#609dd6', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 14px' }}>Real interview moments</p>
          <h2 style={{
            fontSize: 'clamp(26px, 3.8vw, 48px)', fontWeight: 800,
            letterSpacing: '-0.04em', color: '#063f76',
            margin: '0 0 16px', lineHeight: 1.06,
          }}>
            Three questions every interviewer asks.<br />
            <span style={{ color: '#609dd6' }}>Now you have all three answers.</span>
          </h2>
          <p style={{ color: '#71717A', fontSize: '16px', lineHeight: 1.65, maxWidth: '500px', margin: '0 auto' }}>
            ResearchOrg connects data to the exact moments that win offers.
          </p>
        </div>

        {/* Scenario cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {SCENARIOS.map((s, idx) => (
            <div key={s.id} className="is-card">

              {/* Top accent bar */}
              <div style={{ height: '3px', background: s.accent }} />

              {/* Question area */}
              <div style={{ padding: '28px 32px 22px', borderBottom: '1px solid #F4F4F5' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <span style={{
                    padding: '3px 10px', borderRadius: '6px',
                    background: s.accentBg, border: `1px solid ${s.accent}30`,
                    color: s.accent, fontSize: '10.5px', fontWeight: 700,
                  }}>{s.tag}</span>
                  <span style={{ color: '#A1A1AA', fontSize: '11px' }}>{s.context}</span>
                </div>
                <p style={{
                  fontSize: 'clamp(17px, 2.2vw, 22px)', fontStyle: 'italic',
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  color: '#111827', fontWeight: 400,
                  margin: 0, lineHeight: 1.4,
                  letterSpacing: '-0.01em',
                }}>
                  {s.question}
                </p>
              </div>

              {/* Body: mockup + answer */}
              <div className="is-body" style={{
                display: 'grid',
                gridTemplateColumns: idx % 2 === 0 ? '1fr 1fr' : '1fr 1fr',
                gap: '0',
              }}>
                {/* Mockup side */}
                <div style={{
                  padding: '24px 28px',
                  background: '#FAFAFA',
                  borderRight: idx % 2 === 0 ? '1px solid #F4F4F5' : 'none',
                  borderLeft: idx % 2 !== 0 ? '1px solid #F4F4F5' : 'none',
                  order: idx % 2 === 0 ? 0 : 1,
                }}>
                  <p style={{ color: '#A1A1AA', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <rect width="10" height="10" rx="3" fill={s.accent} opacity="0.8" />
                      <path d="M2.5 5h5M5 2.5v5" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" />
                    </svg>
                    ResearchOrg · {s.featureTag}
                  </p>
                  {s.mockup === 'competitors' && <CompetitorsMockup comps={s.competitors!} />}
                  {s.mockup === 'role'         && <RoleMockup role={s.role!} />}
                  {s.mockup === 'financials'   && <FinancialsMockup streams={s.streams!} growth={s.growth!} />}
                </div>

                {/* Answer side */}
                <div style={{
                  padding: '28px 32px',
                  display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '20px',
                  order: idx % 2 === 0 ? 1 : 0,
                }}>
                  <div>
                    <p style={{ color: '#A1A1AA', fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>{s.answerLabel}</p>
                    <div style={{
                      padding: '16px 18px',
                      background: s.accentBg,
                      borderRadius: '12px',
                      borderLeft: `3px solid ${s.accent}`,
                    }}>
                      <p style={{ color: '#1F2937', fontSize: '13.5px', lineHeight: 1.7, margin: 0, fontStyle: 'italic' }}>
                        &ldquo;{s.answer}&rdquo;
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22C55E', flexShrink: 0 }} />
                    <span style={{ color: '#6B7280', fontSize: '12px' }}>
                      Sourced from the <strong style={{ color: '#374151' }}>{s.featureTag}</strong> section of every profile
                    </span>
                  </div>
                </div>
              </div>

            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
