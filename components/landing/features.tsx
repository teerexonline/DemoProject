'use client'

export default function Features() {
  const features = [
    { icon: '🏢', title: 'Company Profiles', desc: 'Comprehensive snapshots of company culture, mission, recent news, leadership team, and growth trajectory.' },
    { icon: '🗂️', title: 'Org Charts', desc: 'Visual org structure by department, reporting lines, team headcount, and key decision-makers.' },
    { icon: '🎯', title: 'Interview Prep', desc: 'Role-specific insights: what the team works on, tech stack, culture signals, and common interview themes.' },
    { icon: '⚔️', title: 'Competitor Intel', desc: 'Compare companies side-by-side — funding rounds, growth, product strategy, and market positioning.' },
    { icon: '🔧', title: 'Internal Tools', desc: 'Discover the exact tools and platforms a company uses internally — from Jira to Notion to Datadog.' },
    { icon: '📈', title: 'Revenue & Growth', desc: 'Revenue estimates, funding history, headcount trends, and growth signals to size up any company.' },
  ]

  return (
    <section id="features" style={{
      padding: '96px 24px',
      background: '#f8fbfe',
      borderTop: '1px solid #e2eaf2',
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <p style={{
            color: '#609dd6',
            fontSize: '12px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginBottom: '12px',
          }}>WHAT YOU GET</p>
          <h2 style={{
            fontSize: 'clamp(26px, 3.5vw, 40px)',
            fontWeight: 800,
            letterSpacing: '-0.04em',
            color: '#063f76',
            margin: '0 0 16px',
            lineHeight: 1.15,
          }}>
            Whatever role you&apos;re targeting,<br />ResearchOrg helps you prepare faster.
          </h2>
          <p style={{ color: '#71717A', fontSize: '16px', margin: 0, maxWidth: '520px', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.65 }}>
            Stop going into interviews underprepared. Get the full picture on any company in minutes.
          </p>
        </div>

        <div className="grid-3col" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '16px',
        }}>
          {features.map((f) => (
            <div
              key={f.title}
              style={{
                padding: '28px 24px',
                background: '#fff',
                borderRadius: '14px',
                border: '1px solid #e2eaf2',
                transition: 'box-shadow 0.2s, border-color 0.2s, transform 0.15s',
                cursor: 'default',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement
                el.style.boxShadow = '0 4px 20px rgba(6,63,118,0.08)'
                el.style.borderColor = '#a8cbe8'
                el.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement
                el.style.boxShadow = 'none'
                el.style.borderColor = '#e2eaf2'
                el.style.transform = 'translateY(0)'
              }}
            >
              <div style={{ fontSize: '24px', marginBottom: '14px', lineHeight: 1 }}>{f.icon}</div>
              <h3 style={{
                fontSize: '15px',
                fontWeight: 700,
                color: '#063f76',
                letterSpacing: '-0.02em',
                margin: '0 0 8px',
              }}>{f.title}</h3>
              <p style={{ color: '#71717A', fontSize: '13.5px', lineHeight: 1.65, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
