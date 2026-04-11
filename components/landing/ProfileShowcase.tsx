'use client'

// ── Data ──────────────────────────────────────────────────────────────────────

const MARKET = [
  { name: 'SpaceX',      pct: 65, color: '#3B82F6' },
  { name: 'ULA',         pct: 16, color: '#8B5CF6' },
  { name: 'Rocket Lab',  pct: 8,  color: '#10B981' },
  { name: 'Arianespace', pct: 6,  color: '#F59E0B' },
  { name: 'Others',      pct: 5,  color: '#6B7280' },
]

const COMPS = [
  {
    name: 'Honeywell CN80',
    desc: "Rugged Android mobile computer designed for warehouse scanning with extended battery life and a physical keyboard for high-volume data entry.",
    edge: 'Wider AOSP customization + deeper DataWedge integration',
    color: '#22C55E',
  },
  {
    name: 'Datalogic Memor 20',
    desc: "All-touch rugged handheld with integrated 2D imager for retail, manufacturing, and healthcare workflows.",
    edge: 'Single-device RFID + barcode via unified Zebra DNA platform',
    color: '#38BDF8',
  },
]

const USE_CASES = [
  { label: 'EU Compliance', text: 'Embedding SCA-compliant 3DS2 checkout flows for EU merchants via Stripe.js and PaymentIntents' },
  { label: 'Marketplace',   text: 'Processing marketplace split payouts with Stripe Connect across 40+ countries' },
  { label: 'Fraud',         text: 'Reducing card fraud with Radar ML models trained continuously on Stripe network-wide transaction data' },
]

const TOOLS = [
  { name: 'TypeScript', color: '#3178C6' },
  { name: 'Go',         color: '#00ADD8' },
  { name: 'Ruby',       color: '#CC342D' },
  { name: 'AWS',        color: '#FF9900' },
  { name: 'Terraform',  color: '#7B42BC' },
  { name: 'PostgreSQL', color: '#336791' },
  { name: 'Kafka',      color: '#A78BFA' },
  { name: 'Datadog',    color: '#632CA6' },
  { name: 'PagerDuty',  color: '#06AC38' },
  { name: 'Kubernetes', color: '#326CE5' },
  { name: 'Sorbet',     color: '#EA580C' },
  { name: 'Hadoop',     color: '#F59E0B' },
]

const REV = [
  { y: '2020', v: 7.4 },
  { y: '2021', v: 10.2 },
  { y: '2022', v: 12.6 },
  { y: '2023', v: 14.3 },
  { y: '2024', v: 17.5 },
]

const EXECS = [
  { name: 'Patrick Collison', initials: 'PC', title: 'CEO & Co-founder', color: '#3B82F6' },
  { name: 'John Collison',    initials: 'JC', title: 'President',         color: '#8B5CF6' },
  { name: 'Dhivya S.',        initials: 'DS', title: 'CFO',               color: '#10B981' },
  { name: 'David Singleton',  initials: 'DS', title: 'CTO',               color: '#F59E0B' },
  { name: 'Will Gaybrick',    initials: 'WG', title: 'CPO',               color: '#F43F5E' },
]

// ── Donut chart ───────────────────────────────────────────────────────────────

function DonutChart() {
  let deg = 0
  const stops = MARKET.map(s => {
    const start = deg
    deg += (s.pct / 100) * 360
    return `${s.color} ${start}deg ${deg}deg`
  })
  const gradient = `conic-gradient(from -90deg, ${stops.join(', ')})`

  return (
    <div style={{ position: 'relative', width: 132, height: 132, flexShrink: 0 }}>
      <div style={{ width: 132, height: 132, borderRadius: '50%', background: gradient }} />
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        width: 76, height: 76, borderRadius: '50%',
        background: '#0B1424',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ color: '#fff', fontSize: '18px', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1 }}>65%</span>
        <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '9px', marginTop: '2px', letterSpacing: '0.04em' }}>LEADER</span>
      </div>
    </div>
  )
}

// ── Section ───────────────────────────────────────────────────────────────────

export default function ProfileShowcase() {
  return (
    <section style={{
      padding: '100px 24px',
      background: 'radial-gradient(ellipse 90% 55% at 50% 0%, rgba(6,63,118,0.28) 0%, transparent 65%), #080F1E',
    }}>
      <style>{`
        .ps-card {
          background: rgba(255,255,255,0.028);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px;
          overflow: hidden;
          transition: border-color 0.25s ease, box-shadow 0.25s ease;
        }
        .ps-card:hover {
          border-color: rgba(96,157,214,0.3);
          box-shadow: 0 0 48px rgba(96,157,214,0.07);
        }
        .ps-label {
          color: rgba(255,255,255,0.3);
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin: 0 0 5px;
        }
        .ps-title {
          color: #fff;
          font-size: 13.5px;
          font-weight: 700;
          margin: 0;
          line-height: 1.3;
        }
        .ps-chip {
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
        }
        @media (max-width: 900px) {
          .ps-grid { grid-template-columns: 1fr 1fr !important; }
          .ps-market-card { grid-row: auto !important; grid-column: 1 / -1 !important; }
        }
        @media (max-width: 560px) {
          .ps-grid { grid-template-columns: 1fr !important; }
          .ps-market-card { grid-column: auto !important; }
        }
      `}</style>

      <div style={{ maxWidth: '1160px', margin: '0 auto' }}>

        {/* ── Header ── */}
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <p style={{
            color: '#609dd6', fontSize: '11px', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 16px',
          }}>Inside every profile</p>
          <h2 style={{
            fontSize: 'clamp(28px, 4vw, 50px)', fontWeight: 800,
            letterSpacing: '-0.04em', color: '#fff', margin: '0 0 18px', lineHeight: 1.05,
          }}>
            Every edge your interviewer has.<br />
            <span style={{ color: '#609dd6' }}>Now you have it too.</span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '16px', lineHeight: 1.7, maxWidth: '480px', margin: '0 auto' }}>
            Market position, competitive intel, product strategy — ResearchOrg surfaces what company career pages hide.
          </p>
        </div>

        {/* ── Bento grid ── */}
        <div className="ps-grid" style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '10px',
        }}>

          {/* 1 ── Market Share  (col 1, spans 2 rows) */}
          <div className="ps-card ps-market-card" style={{ gridRow: 'span 2', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <p className="ps-label">Market Share</p>
              <p className="ps-title">Global Orbital Launch Market</p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '22px', flexWrap: 'wrap' }}>
              <DonutChart />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', flex: 1, minWidth: '100px' }}>
                {MARKET.map(s => (
                  <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                    <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '12px', flex: 1 }}>{s.name}</span>
                    <span style={{ color: '#fff', fontSize: '12px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{s.pct}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{
              padding: '13px 15px',
              background: 'rgba(59,130,246,0.09)',
              borderRadius: '11px', border: '1px solid rgba(59,130,246,0.2)',
              marginTop: 'auto',
            }}>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', margin: '0 0 4px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Analyst note</p>
              <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: '11.5px', lineHeight: 1.6, margin: 0 }}>
                SpaceX launched 96 missions in 2023 — more than all global competitors combined — driven by Falcon 9 booster reuse cutting per-launch costs by 10×.
              </p>
            </div>

            {/* Secondary stat strip */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {[{ label: 'Missions 2023', value: '96' }, { label: 'Active satellites', value: '6,000+' }].map(s => (
                <div key={s.label} style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: '9px', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
                  <p style={{ color: '#fff', fontSize: '17px', fontWeight: 800, letterSpacing: '-0.04em', margin: '0 0 2px' }}>{s.value}</p>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', margin: 0 }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 2 ── vs Competitors */}
          <div className="ps-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <p className="ps-label">vs Competitors</p>
                <p className="ps-title">Zebra TC73</p>
              </div>
              <span style={{ padding: '3px 9px', borderRadius: '6px', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', color: '#22C55E', fontSize: '10px', fontWeight: 700, flexShrink: 0 }}>Zebra Edge ✓</span>
            </div>

            {COMPS.map(c => (
              <div key={c.name} style={{
                padding: '12px 14px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '11px', border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <p style={{ color: '#fff', fontSize: '12px', fontWeight: 700, margin: '0 0 4px' }}>{c.name}</p>
                <p style={{ color: 'rgba(255,255,255,0.42)', fontSize: '11px', lineHeight: 1.55, margin: '0 0 9px' }}>{c.desc}</p>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ flexShrink: 0, marginTop: '1px' }}>
                    <circle cx="6.5" cy="6.5" r="6" fill={c.color} opacity="0.18" />
                    <path d="M4 6.5l1.8 1.8 3.5-3.6" stroke={c.color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span style={{ color: c.color, fontSize: '10.5px', fontWeight: 600, lineHeight: 1.45 }}>Zebra edge: {c.edge}</span>
                </div>
              </div>
            ))}
          </div>

          {/* 3 ── Product Use Cases */}
          <div className="ps-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <p className="ps-label">Product Use Cases</p>
              <p className="ps-title">Stripe Payments</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              {USE_CASES.map((uc, i) => (
                <div key={i} style={{
                  display: 'flex', gap: '10px',
                  padding: '11px 13px',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)',
                  alignItems: 'flex-start',
                }}>
                  <div style={{
                    width: '20px', height: '20px', borderRadius: '7px',
                    background: 'rgba(83,58,253,0.75)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <span style={{ color: '#fff', fontSize: '9px', fontWeight: 800 }}>{i + 1}</span>
                  </div>
                  <div>
                    <span style={{
                      display: 'inline-block', marginBottom: '3px',
                      padding: '1px 7px', borderRadius: '4px',
                      background: 'rgba(83,58,253,0.2)', border: '1px solid rgba(83,58,253,0.35)',
                      color: '#A78BFA', fontSize: '9.5px', fontWeight: 700,
                    }}>{uc.label}</span>
                    <p style={{ color: 'rgba(255,255,255,0.62)', fontSize: '11px', lineHeight: 1.55, margin: 0 }}>{uc.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4 ── Revenue Growth */}
          <div className="ps-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <p className="ps-label">Revenue Growth</p>
                <p className="ps-title">Stripe · 2020–2024</p>
              </div>
              <span style={{ padding: '3px 9px', borderRadius: '6px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#22C55E', fontSize: '10.5px', fontWeight: 700, flexShrink: 0 }}>↑ 136% 5yr</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '7px', height: '76px' }}>
              {REV.map((b, i) => (
                <div key={b.y} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', height: '100%', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: '8.5px', color: 'rgba(255,255,255,0.45)', fontWeight: 600, whiteSpace: 'nowrap' }}>${b.v}B</span>
                  <div style={{
                    width: '100%',
                    borderRadius: '3px 3px 0 0',
                    height: `${(b.v / 17.5) * 56}px`,
                    background: i === REV.length - 1
                      ? 'linear-gradient(180deg, #60A5FA 0%, #2563EB 100%)'
                      : 'rgba(96,157,214,0.32)',
                    transition: 'opacity 0.2s',
                  }} />
                  <span style={{ fontSize: '8.5px', color: 'rgba(255,255,255,0.28)', whiteSpace: 'nowrap' }}>{b.y}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 5 ── Internal Tools */}
          <div className="ps-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <p className="ps-label">Internal Tools</p>
              <p className="ps-title">Stripe Engineering Stack</p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {TOOLS.map(t => (
                <span
                  key={t.name}
                  className="ps-chip"
                  style={{
                    color: t.color,
                    background: `${t.color}18`,
                    border: `1px solid ${t.color}35`,
                  }}
                >{t.name}</span>
              ))}
            </div>
          </div>

          {/* 6 ── Leadership */}
          <div className="ps-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <p className="ps-label">Leadership</p>
              <p className="ps-title">Stripe C-Suite</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {EXECS.map(e => (
                <div key={e.name} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '8px 10px',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)',
                }}>
                  <div style={{
                    width: '26px', height: '26px', borderRadius: '50%',
                    background: e.color, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', flexShrink: 0,
                  }}>
                    <span style={{ color: '#fff', fontSize: '9px', fontWeight: 800 }}>{e.initials}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: '#fff', fontSize: '11.5px', fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name}</p>
                    <p style={{ color: 'rgba(255,255,255,0.32)', fontSize: '10px', margin: 0 }}>{e.title}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* ── Bottom CTA strip ── */}
        <div style={{
          marginTop: '40px', padding: '22px 28px',
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '20px', flexWrap: 'wrap',
        }}>
          <div>
            <p style={{ color: '#fff', fontSize: '16px', fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.02em' }}>All of this. For every company in the database.</p>
            <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '13.5px', margin: 0 }}>Including SpaceX, Stripe, Google, Anthropic, and more.</p>
          </div>
          <a
            href="/signup"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '11px 22px', borderRadius: '10px',
              background: '#fff', color: '#063f76',
              fontSize: '14px', fontWeight: 700,
              textDecoration: 'none', whiteSpace: 'nowrap',
              letterSpacing: '-0.01em',
              boxShadow: '0 0 28px rgba(255,255,255,0.08)',
              transition: 'background 0.15s, transform 0.12s',
              flexShrink: 0,
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement
              el.style.background = '#eef4fb'
              el.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement
              el.style.background = '#fff'
              el.style.transform = 'translateY(0)'
            }}
          >
            Explore a company free →
          </a>
        </div>

      </div>
    </section>
  )
}
