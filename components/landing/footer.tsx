'use client'

import Link from 'next/link'

export default function Footer() {
  const cols = [
    { title: 'Product', links: ['Features', 'Pricing', 'Changelog', 'Roadmap'] },
    { title: 'Company', links: ['About', 'Blog', 'Careers', 'Press'] },
    { title: 'Resources', links: ['Documentation', 'API Reference', 'Community', 'Status'] },
    { title: 'Legal', links: ['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'GDPR'] },
  ]

  return (
    <footer style={{ borderTop: '1px solid #F4F4F5', padding: '60px 24px 36px', background: '#FAFAFA' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div className="footer-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: '48px', marginBottom: '48px' }}>
          {/* Brand */}
          <div>
            <div style={{ fontWeight: 800, fontSize: '17px', letterSpacing: '-0.04em', color: '#09090B', marginBottom: '10px' }}>
              Research<span style={{ color: '#7C3AED' }}>Org</span>
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
                    border: '1px solid #E4E4E7', background: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#71717A', textDecoration: 'none', fontSize: '11px', fontWeight: 700,
                    transition: 'border-color 0.15s, color 0.15s, background 0.15s',
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement
                    el.style.borderColor = '#7C3AED'
                    el.style.color = '#7C3AED'
                    el.style.background = '#F5F3FF'
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement
                    el.style.borderColor = '#E4E4E7'
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
              <h4 style={{ color: '#09090B', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 14px' }}>
                {col.title}
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {col.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      style={{ color: '#71717A', textDecoration: 'none', fontSize: '13.5px', transition: 'color 0.15s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#09090B'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#71717A'}
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div style={{ borderTop: '1px solid #F4F4F5', paddingTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#A1A1AA', fontSize: '13px' }}>© 2026 ResearchOrg, Inc. All rights reserved.</span>
          <span style={{ color: '#A1A1AA', fontSize: '13px' }}>Made for ambitious job seekers.</span>
        </div>
      </div>
    </footer>
  )
}
