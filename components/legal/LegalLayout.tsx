'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

export interface LegalSection {
  id: string
  title: string
  content: React.ReactNode
}

interface Props {
  badge: string
  title: string
  subtitle: string
  lastUpdated: string
  effectiveDate: string
  sections: LegalSection[]
}

export default function LegalLayout({ badge, title, subtitle, lastUpdated, effectiveDate, sections }: Props) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? '')
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        })
      },
      { rootMargin: '-20% 0px -70% 0px' }
    )
    sections.forEach(s => {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [sections])

  return (
    <div style={{ background: '#FAFAFA', minHeight: '100vh' }}>

      {/* Hero */}
      <div style={{
        background: '#fff',
        borderBottom: '1px solid #e2eaf2',
        padding: '56px 24px 48px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.02,
          backgroundImage: 'linear-gradient(#063f76 1px, transparent 1px), linear-gradient(90deg, #063f76 1px, transparent 1px)',
          backgroundSize: '40px 40px', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(255,255,255,0) 0%, #fff 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#eef4fb', border: '1px solid #a8cbe8', borderRadius: 100, padding: '4px 14px', marginBottom: 16 }}>
            <span style={{ color: '#063f76', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{badge}</span>
          </div>
          <h1 style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 800, letterSpacing: '-0.04em', color: '#063f76', margin: '0 0 10px', lineHeight: 1.15 }}>{title}</h1>
          <p style={{ color: '#71717A', fontSize: 15, margin: '0 0 16px', lineHeight: 1.6, maxWidth: 520 }}>{subtitle}</p>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12.5, color: '#A1A1AA' }}>Last updated: <strong style={{ color: '#52525B' }}>{lastUpdated}</strong></span>
            <span style={{ fontSize: 12.5, color: '#A1A1AA' }}>Effective: <strong style={{ color: '#52525B' }}>{effectiveDate}</strong></span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 24px 80px', display: 'grid', gridTemplateColumns: '220px 1fr', gap: 48, alignItems: 'start' }} className="legal-grid">

        {/* Sidebar */}
        <nav style={{ position: 'sticky', top: 80 }} className="legal-sidebar">
          <div style={{ fontSize: 10.5, fontWeight: 700, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Contents</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {sections.map(s => (
              <a
                key={s.id}
                href={`#${s.id}`}
                style={{
                  display: 'block', padding: '6px 10px', borderRadius: 7,
                  textDecoration: 'none', fontSize: 12.5, fontWeight: activeId === s.id ? 600 : 400,
                  color: activeId === s.id ? '#063f76' : '#71717A',
                  background: activeId === s.id ? '#eef4fb' : 'transparent',
                  borderLeft: `2px solid ${activeId === s.id ? '#063f76' : 'transparent'}`,
                  transition: 'color 0.15s, background 0.15s',
                  lineHeight: 1.4,
                }}
                onMouseEnter={e => { if (activeId !== s.id) { (e.currentTarget as HTMLElement).style.color = '#063f76'; (e.currentTarget as HTMLElement).style.background = '#f0f6fc' } }}
                onMouseLeave={e => { if (activeId !== s.id) { (e.currentTarget as HTMLElement).style.color = '#71717A'; (e.currentTarget as HTMLElement).style.background = 'transparent' } }}
              >
                {s.title}
              </a>
            ))}
          </div>

          {/* Other legal links */}
          <div style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid #e2eaf2' }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Also see</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[
                { label: 'Privacy Policy', href: '/privacy' },
                { label: 'Terms of Service', href: '/terms' },
                { label: 'Cookie Policy', href: '/cookies' },
              ].map(l => (
                <Link
                  key={l.href}
                  href={l.href}
                  style={{ fontSize: 12.5, color: '#71717A', textDecoration: 'none', padding: '4px 0', transition: 'color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#063f76'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#71717A'}
                >{l.label}</Link>
              ))}
            </div>
          </div>
        </nav>

        {/* Content */}
        <div ref={contentRef} style={{ minWidth: 0 }}>
          {sections.map((s, i) => (
            <section
              key={s.id}
              id={s.id}
              style={{
                paddingBottom: 40,
                marginBottom: i < sections.length - 1 ? 40 : 0,
                borderBottom: i < sections.length - 1 ? '1px solid #e2eaf2' : 'none',
              }}
            >
              <h2 style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.03em', color: '#09090B', margin: '0 0 16px', lineHeight: 1.3 }}>
                <span style={{ color: '#A1A1AA', fontWeight: 400, marginRight: 8, fontSize: 14 }}>{String(i + 1).padStart(2, '0')}.</span>
                {s.title}
              </h2>
              <div style={{ color: '#52525B', fontSize: 14.5, lineHeight: 1.8 }}>
                {s.content}
              </div>
            </section>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .legal-grid {
            grid-template-columns: 1fr !important;
            gap: 0 !important;
            padding-top: 24px !important;
          }
          .legal-sidebar {
            position: static !important;
            display: none !important;
          }
        }
        .legal-content p { margin: 0 0 12px; }
        .legal-content p:last-child { margin-bottom: 0; }
        .legal-content ul { margin: 0 0 12px; padding-left: 20px; }
        .legal-content ul li { margin-bottom: 6px; }
        .legal-content strong { color: #374151; font-weight: 600; }
        .legal-content a { color: #063f76; }
      `}</style>
    </div>
  )
}
