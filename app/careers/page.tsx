import type { Metadata } from 'next'
import Link from 'next/link'
import { adminGetCareerRoles } from '@/app/actions/admin'

export const metadata: Metadata = {
  title: 'Careers — ResearchOrg',
  description: 'Join the team building the company research platform for the next generation of job seekers.',
}

export const revalidate = 60

export default async function CareersPage() {
  const { data: roles } = await adminGetCareerRoles()
  const activeRoles = roles.filter(r => r.is_active)

  return (
    <main style={{ background: '#fff', minHeight: '100vh' }}>

      {/* Hero */}
      <section style={{ borderBottom: '1px solid #e2eaf2', padding: '80px 24px 72px', background: '#f8fbfe' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#609dd6', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
            Careers at ResearchOrg
          </p>
          <h1 style={{
            fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 900,
            letterSpacing: '-0.05em', color: '#063f76', lineHeight: 1.1,
            margin: '0 0 24px',
          }}>
            Help job seekers walk in prepared.
          </h1>
          <p style={{ fontSize: 17, color: '#52525B', lineHeight: 1.75, maxWidth: 540, margin: '0 auto' }}>
            We&apos;re a small team building deep company intelligence for the millions of people navigating job searches every year. If that mission resonates, we&apos;d love to hear from you.
          </p>
        </div>
      </section>

      {/* Why us */}
      <section style={{ padding: '72px 24px', borderBottom: '1px solid #e2eaf2' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 800, letterSpacing: '-0.04em', color: '#063f76', margin: '0 0 40px' }}>
            Why ResearchOrg
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {[
              { title: 'Hybrid & flexible', body: 'We support hybrid work with flexibility built in. Collaborate in person when it counts, work remotely when it suits.' },
              { title: 'Meaningful work', body: 'Every feature you ship helps real people prepare for interviews that can change the trajectory of their careers.' },
              { title: 'Small team, big scope', body: 'You will own entire areas of the product and see the direct impact of your work on users — no bureaucracy.' },
            ].map(p => (
              <div key={p.title} style={{ padding: '24px', borderRadius: 13, border: '1.5px solid #e2eaf2', background: '#f8fbfe' }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: '#eef4fb', border: '1px solid #a8cbe8', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#063f76' }} />
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: '#063f76', letterSpacing: '-0.03em', margin: '0 0 8px' }}>{p.title}</h3>
                <p style={{ fontSize: 13.5, color: '#71717A', lineHeight: 1.7, margin: 0 }}>{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Open roles */}
      <section style={{ padding: '72px 24px', borderBottom: '1px solid #e2eaf2' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 800, letterSpacing: '-0.04em', color: '#063f76', margin: '0 0 8px' }}>
            Open roles
          </h2>
          <p style={{ fontSize: 14, color: '#A1A1AA', margin: '0 0 36px' }}>
            {activeRoles.length > 0 ? `${activeRoles.length} open position${activeRoles.length !== 1 ? 's' : ''}` : 'No open positions right now — check back soon.'}
          </p>

          {activeRoles.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {activeRoles.map(role => (
                <div key={role.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: 24, padding: '22px 24px',
                  background: '#fff', borderRadius: 13, border: '1.5px solid #e2eaf2',
                  boxShadow: '0 1px 6px rgba(6,63,118,0.04)',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: '#09090B', letterSpacing: '-0.03em' }}>{role.title}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#063f76', background: '#eef4fb', border: '1px solid #a8cbe8', padding: '2px 8px', borderRadius: 5 }}>{role.team}</span>
                    </div>
                    <p style={{ fontSize: 13.5, color: '#71717A', lineHeight: 1.6, margin: '0 0 6px' }}>{role.description}</p>
                    <span style={{ fontSize: 12, color: '#A1A1AA' }}>{role.type}</span>
                  </div>
                  <a
                    href={`mailto:careers@researchorg.com?subject=Application: ${role.title}`}
                    style={{
                      flexShrink: 0, padding: '9px 20px', borderRadius: 9,
                      background: '#063f76', color: '#fff', fontSize: 13, fontWeight: 700,
                      textDecoration: 'none', whiteSpace: 'nowrap',
                      boxShadow: '0 2px 10px rgba(6,63,118,0.25)',
                    }}
                  >
                    Apply →
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* No role fits */}
      <section style={{ padding: '72px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#063f76', letterSpacing: '-0.04em', margin: '0 0 12px' }}>
            Don&apos;t see the right role?
          </h2>
          <p style={{ fontSize: 14.5, color: '#71717A', lineHeight: 1.7, marginBottom: 28 }}>
            We&apos;re always open to hearing from exceptional people. Send us a note and tell us how you&apos;d contribute.
          </p>
          <a
            href="mailto:careers@researchorg.com"
            style={{
              display: 'inline-block', padding: '12px 28px', borderRadius: 10,
              background: '#f8fbfe', color: '#063f76', fontSize: 14, fontWeight: 700,
              textDecoration: 'none', border: '1.5px solid #e2eaf2',
            }}
          >
            Get in touch
          </a>
        </div>
      </section>

      <style>{`
        @media (max-width: 768px) {
          section > div > div[style*="repeat(3"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </main>
  )
}
