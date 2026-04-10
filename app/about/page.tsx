import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'About — ResearchOrg',
  description: 'ResearchOrg is the company research platform built for job seekers who want to walk into every interview prepared.',
}

export default function AboutPage() {
  return (
    <main style={{ background: '#fff', minHeight: '100vh' }}>

      {/* Hero */}
      <section style={{ borderBottom: '1px solid #e2eaf2', padding: '80px 24px 72px', background: '#f8fbfe' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#609dd6', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
            About ResearchOrg
          </p>
          <h1 style={{
            fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 900,
            letterSpacing: '-0.05em', color: '#063f76', lineHeight: 1.1,
            margin: '0 0 24px',
          }}>
            Walk in prepared.<br />Every single time.
          </h1>
          <p style={{ fontSize: 17, color: '#52525B', lineHeight: 1.75, maxWidth: 560, margin: '0 auto' }}>
            ResearchOrg is the company intelligence platform built for job seekers — giving you the org depth, team structure, internal tooling, and strategic context that company homepages never show.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section style={{ padding: '80px 24px', borderBottom: '1px solid #e2eaf2' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#609dd6', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>Our Mission</p>
            <h2 style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 800, letterSpacing: '-0.04em', color: '#063f76', lineHeight: 1.15, margin: '0 0 20px' }}>
              Level the playing field for every candidate.
            </h2>
            <p style={{ fontSize: 15, color: '#52525B', lineHeight: 1.75, marginBottom: 16 }}>
              Most people walk into interviews knowing only what&apos;s on a company&apos;s public homepage. Meanwhile, a small number of candidates with insider connections arrive with a deep understanding of who runs what, how decisions are made, what tools teams use, and what questions will actually be asked.
            </p>
            <p style={{ fontSize: 15, color: '#52525B', lineHeight: 1.75, margin: 0 }}>
              ResearchOrg exists to close that gap — giving every job seeker, regardless of background or network, the same quality of company intelligence that used to require years of inside access.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[
              { num: '200+', label: 'Companies profiled' },
              { num: '10+', label: 'Sectors covered' },
              { num: '8.2k', label: 'Weekly active users' },
              { num: '3×', label: 'More confident in interviews' },
            ].map(stat => (
              <div key={stat.label} style={{
                background: '#f8fbfe', borderRadius: 14, border: '1px solid #e2eaf2',
                padding: '24px 20px', textAlign: 'center',
              }}>
                <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.05em', color: '#063f76', lineHeight: 1 }}>{stat.num}</div>
                <div style={{ fontSize: 12.5, color: '#71717A', marginTop: 6, lineHeight: 1.4 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section style={{ padding: '80px 24px', background: '#f8fbfe', borderBottom: '1px solid #e2eaf2' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#609dd6', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>What we believe</p>
          <h2 style={{ fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 800, letterSpacing: '-0.04em', color: '#063f76', lineHeight: 1.2, margin: '0 0 48px', maxWidth: 480 }}>
            Three principles guide everything we build.
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {[
              {
                title: 'Depth over breadth',
                body: 'We&apos;d rather have 200 companies profiled with genuine depth — org charts, financial history, internal processes — than 2,000 with surface-level data.',
              },
              {
                title: 'Built for the candidate',
                body: 'Every feature, every data point, every design decision is made with one user in mind: the person preparing for their next job interview.',
              },
              {
                title: 'Accuracy matters',
                body: 'We verify and curate data rather than scraping and shipping. If information can&apos;t be substantiated, it doesn&apos;t go live.',
              },
            ].map(v => (
              <div key={v.title} style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2eaf2', padding: '28px 24px', boxShadow: '0 2px 12px rgba(6,63,118,0.05)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#063f76', marginBottom: 16 }} />
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#063f76', letterSpacing: '-0.03em', margin: '0 0 10px' }}>{v.title}</h3>
                <p style={{ fontSize: 13.5, color: '#71717A', lineHeight: 1.7, margin: 0 }} dangerouslySetInnerHTML={{ __html: v.body }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 800, letterSpacing: '-0.04em', color: '#063f76', lineHeight: 1.15, margin: '0 0 16px' }}>
            Ready to research smarter?
          </h2>
          <p style={{ fontSize: 15, color: '#71717A', lineHeight: 1.7, marginBottom: 32 }}>
            Start with any company in our database — free, no credit card required.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/signup" style={{
              padding: '12px 28px', borderRadius: 10, background: '#063f76', color: '#fff',
              fontSize: 14, fontWeight: 700, textDecoration: 'none',
              boxShadow: '0 4px 14px rgba(6,63,118,0.3)',
            }}>
              Get started free →
            </Link>
            <Link href="/explore" style={{
              padding: '12px 28px', borderRadius: 10, background: '#f8fbfe', color: '#063f76',
              fontSize: 14, fontWeight: 600, textDecoration: 'none',
              border: '1.5px solid #e2eaf2',
            }}>
              Browse companies
            </Link>
          </div>
        </div>
      </section>

      <style>{`
        @media (max-width: 768px) {
          section > div { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 640px) {
          section > div > div[style*="repeat(3"] { grid-template-columns: 1fr !important; }
          section > div > div[style*="repeat(2"] { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </main>
  )
}
