'use client'

import Link from 'next/link'
import { LogoFull } from '@/components/Logo'

export default function Footer() {
  const cols: { title: string; links: { label: string; href: string }[] }[] = [
    { title: 'Platform', links: [{ label: 'Explore', href: '/explore' }, { label: 'Features', href: '/features' }, { label: 'Pricing', href: '/pricing' }] },
    { title: 'Company',  links: [{ label: 'About', href: '/about' }, { label: 'Blog', href: '/blog' }, { label: 'Careers', href: '/careers' }] },
    { title: 'Legal',    links: [{ label: 'Privacy Policy', href: '/privacy' }, { label: 'Terms of Service', href: '/terms' }, { label: 'Cookie Policy', href: '/cookies' }] },
  ]

  return (
    <footer style={{ borderTop: '1px solid #e2eaf2', padding: '60px 24px 36px', background: '#f8fbfe' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div className="footer-grid" style={{ marginBottom: '48px' }}>
          {/* Brand */}
          <div>
            <div style={{ marginBottom: '12px' }}>
              <LogoFull height={34} />
            </div>
            <p style={{ color: '#71717A', fontSize: '13.5px', lineHeight: 1.65, margin: '0 0 20px', maxWidth: '240px' }}>
              The company research platform built for job seekers who want to walk in prepared.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              {['X', 'Li', 'Gh'].map((label) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  style={{
                    width: '32px', height: '32px', borderRadius: '7px',
                    border: '1px solid #e2eaf2', background: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#71717A', textDecoration: 'none', fontSize: '11px', fontWeight: 700,
                    transition: 'border-color 0.15s, color 0.15s, background 0.15s',
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement
                    el.style.borderColor = '#609dd6'
                    el.style.color = '#063f76'
                    el.style.background = '#eef4fb'
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement
                    el.style.borderColor = '#e2eaf2'
                    el.style.color = '#71717A'
                    el.style.background = '#fff'
                  }}
                >
                  {label}
                </a>
              ))}
            </div>
          </div>

          {cols.map((col) => (
            <div key={col.title}>
              <h4 style={{ color: '#063f76', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 14px' }}>
                {col.title}
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      style={{ color: '#71717A', textDecoration: 'none', fontSize: '13.5px', transition: 'color 0.15s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#063f76'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#71717A'}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div style={{ borderTop: '1px solid #e2eaf2', paddingTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ color: '#A1A1AA', fontSize: '13px' }}>© 2026 ResearchOrg, Inc. All rights reserved.</span>
          <span style={{ color: '#A1A1AA', fontSize: '13px' }}>Made for ambitious job seekers.</span>
        </div>
      </div>

      <style>{`
        .footer-grid {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr;
          gap: 48px;
        }
        @media (max-width: 860px) {
          .footer-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 32px !important;
          }
          .footer-grid > div:first-child {
            grid-column: 1 / -1;
          }
        }
        @media (max-width: 480px) {
          .footer-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 24px !important;
          }
        }
      `}</style>
    </footer>
  )
}
