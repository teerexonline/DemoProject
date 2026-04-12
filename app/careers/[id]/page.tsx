import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('career_roles').select('title, team').eq('id', id).single()
  if (!data) return { title: 'Job — ResearchOrg' }
  return {
    title: `${data.title} — ResearchOrg Careers`,
    description: `Join ResearchOrg as ${data.title} on the ${data.team} team.`,
  }
}

function renderDescription(description: string) {
  return description.split('\n').map((line, li) => {
    const isBullet = /^[•\-]\s/.test(line.trim())
    const raw = isBullet ? line.trim().replace(/^[•\-]\s/, '') : line
    if (!raw.trim()) return <div key={li} style={{ height: 8 }} />
    const parts = raw.split(/\*\*(.+?)\*\*/g).map((part, pi) =>
      pi % 2 === 1 ? <strong key={pi} style={{ color: '#09090B', fontWeight: 700 }}>{part}</strong> : part
    )
    return isBullet ? (
      <div key={li} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 6 }}>
        <span style={{ color: '#063f76', fontSize: 16, lineHeight: '22px', flexShrink: 0 }}>·</span>
        <span style={{ color: '#3F3F46', fontSize: 15, lineHeight: 1.7 }}>{parts}</span>
      </div>
    ) : (
      <p key={li} style={{ margin: '0 0 8px', color: '#3F3F46', fontSize: 15, lineHeight: 1.75 }}>{parts}</p>
    )
  })
}

export default async function JobDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: role } = await supabase
    .from('career_roles')
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .single()

  if (!role) notFound()

  const applyHref = `mailto:careers@researchorg.com?subject=Application: ${encodeURIComponent(role.title)}`

  return (
    <main style={{ background: '#f8fbfe', minHeight: '100vh' }}>

      {/* Breadcrumb */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2eaf2', padding: '0 24px' }}>
        <div style={{ maxWidth: 780, margin: '0 auto', height: 48, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link href="/careers" className="job-breadcrumb-link" style={{ color: '#A1A1AA', textDecoration: 'none', fontSize: 13 }}>
            Careers
          </Link>
          <span style={{ color: '#D4D4D8', fontSize: 13 }}>›</span>
          <span style={{ color: '#09090B', fontSize: 13, fontWeight: 600 }}>{role.title}</span>
        </div>
      </div>

      <div style={{ maxWidth: 780, margin: '0 auto', padding: '48px 24px 80px' }}>

        {/* Title block */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#063f76', background: '#eef4fb', border: '1px solid #a8cbe8', padding: '3px 10px', borderRadius: 6 }}>{role.team}</span>
            <span style={{ color: '#D4D4D8', fontSize: 12 }}>·</span>
            <span style={{ fontSize: 12, color: '#71717A', fontWeight: 500 }}>{role.type}</span>
          </div>
          <h1 style={{
            fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 900,
            letterSpacing: '-0.04em', color: '#09090B', lineHeight: 1.1,
            margin: '0 0 28px',
          }}>
            {role.title}
          </h1>
          <a href={applyHref} className="job-apply-btn">
            Apply for this role →
          </a>
        </div>

        {/* Description */}
        <div style={{
          background: '#fff', borderRadius: 16, border: '1px solid #e2eaf2',
          padding: '36px 40px', boxShadow: '0 1px 6px rgba(6,63,118,0.04)',
          marginBottom: 24,
        }}>
          <h2 style={{ fontSize: 12, fontWeight: 700, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 24px' }}>
            About the role
          </h2>
          <div>{renderDescription(role.description)}</div>
        </div>

        {/* Bottom CTA */}
        <div style={{
          padding: '28px 32px', borderRadius: 14,
          background: '#063f76', textAlign: 'center',
        }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', marginBottom: 6 }}>
            Ready to apply?
          </div>
          <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.7)', marginBottom: 20 }}>
            Send your resume and a short note about why you&apos;d be a great fit.
          </div>
          <a href={applyHref} className="job-apply-btn-secondary">
            careers@researchorg.com
          </a>
        </div>
      </div>

      <style>{`
        .job-breadcrumb-link:hover { color: #063f76 !important; }
        .job-apply-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 28px;
          border-radius: 10px;
          background: #063f76;
          color: #fff;
          text-decoration: none;
          font-size: 14px;
          font-weight: 700;
          box-shadow: 0 4px 16px rgba(6,63,118,0.28);
          transition: background 0.15s, transform 0.1s;
        }
        .job-apply-btn:hover { background: #04294f; transform: translateY(-1px); }
        .job-apply-btn-secondary {
          display: inline-flex;
          align-items: center;
          padding: 10px 24px;
          border-radius: 9px;
          background: #fff;
          color: #063f76;
          text-decoration: none;
          font-size: 13.5px;
          font-weight: 700;
          transition: opacity 0.15s;
        }
        .job-apply-btn-secondary:hover { opacity: 0.85; }
      `}</style>
    </main>
  )
}
