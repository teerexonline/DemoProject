'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import SearchAutocomplete from '@/components/SearchAutocomplete'

export default function Header() {
  const [user, setUser] = useState<User | null>(null)
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header style={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      zIndex: 50,
      background: scrolled ? 'rgba(255,255,255,0.92)' : '#fff',
      backdropFilter: scrolled ? 'blur(12px)' : 'none',
      borderBottom: '1px solid #E4E4E7',
      transition: 'box-shadow 0.2s',
      boxShadow: scrolled ? '0 1px 12px rgba(0,0,0,0.06)' : 'none',
    }}>
      <div className="header-inner" style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 24px',
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
      }}>
        {/* Logo */}
        <Link href="/" style={{ textDecoration: 'none', flexShrink: 0 }}>
          <span style={{
            fontWeight: 800,
            fontSize: '17px',
            letterSpacing: '-0.04em',
            color: '#09090B',
          }}>
            Research<span style={{ color: '#7C3AED' }}>Org</span>
          </span>
        </Link>

        {/* Search bar */}
        <div className="header-search" style={{ flex: 1, maxWidth: '340px' }}>
          <SearchAutocomplete placeholder="Search any company..." size="sm" />
        </div>

        {/* Nav */}
        <nav className="header-nav" style={{ display: 'flex', gap: '2px', marginLeft: '4px' }}>
          {['Features', 'Enterprise', 'Pricing'].map((item) => (
            <Link
              key={item}
              href={`#${item.toLowerCase()}`}
              style={{
                color: '#52525B',
                textDecoration: 'none',
                fontSize: '13.5px',
                fontWeight: 500,
                padding: '6px 11px',
                borderRadius: '7px',
                transition: 'color 0.15s, background 0.15s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.color = '#09090B'
                ;(e.currentTarget as HTMLElement).style.background = '#F4F4F5'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.color = '#52525B'
                ;(e.currentTarget as HTMLElement).style.background = 'transparent'
              }}
            >
              {item}
            </Link>
          ))}
        </nav>

        {/* Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto', flexShrink: 0 }}>
          {user ? (
            <>
              <span className="header-username" style={{ color: '#71717A', fontSize: '13px' }}>
                {user.email?.split('@')[0]}
              </span>
              <Link
                href="/logout"
                style={{
                  color: '#52525B',
                  textDecoration: 'none',
                  fontSize: '13.5px',
                  fontWeight: 500,
                  padding: '7px 14px',
                  borderRadius: '8px',
                  border: '1px solid #E4E4E7',
                  background: '#fff',
                  transition: 'background 0.15s, border-color 0.15s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = '#F4F4F5'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = '#fff'
                }}
              >
                Sign Out
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="header-signin-link"
                style={{
                  color: '#52525B',
                  textDecoration: 'none',
                  fontSize: '13.5px',
                  fontWeight: 500,
                  padding: '7px 14px',
                  borderRadius: '8px',
                  transition: 'color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#09090B'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#52525B'}
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="header-cta-link"
                style={{
                  color: '#fff',
                  textDecoration: 'none',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: '#7C3AED',
                  transition: 'background 0.15s',
                  letterSpacing: '-0.01em',
                  boxShadow: '0 1px 3px rgba(124,58,237,0.3)',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#6D28D9'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#7C3AED'}
              >
                Get Started Free
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="header-hamburger"
          onClick={() => setMobileMenuOpen(v => !v)}
          style={{
            display: 'none',
            background: 'none',
            border: '1px solid #E4E4E7',
            borderRadius: '7px',
            padding: '6px 8px',
            cursor: 'pointer',
            color: '#52525B',
            flexShrink: 0,
          }}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="8" x2="20" y2="8"/><line x1="4" y1="16" x2="20" y2="16"/>
            </svg>
          )}
        </button>
      </div>

      {/* Mobile dropdown menu */}
      {mobileMenuOpen && (
        <div className="header-mobile-menu" style={{
          borderTop: '1px solid #F4F4F5',
          background: '#fff',
          padding: '12px 16px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}>
          {/* Search in mobile menu */}
          <div style={{ marginBottom: '8px' }}>
            <SearchAutocomplete placeholder="Search any company..." size="sm" />
          </div>
          {['Features', 'Enterprise', 'Pricing'].map((item) => (
            <Link
              key={item}
              href={`#${item.toLowerCase()}`}
              onClick={() => setMobileMenuOpen(false)}
              style={{
                color: '#52525B',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: 500,
                padding: '10px 12px',
                borderRadius: '8px',
                background: '#FAFAFA',
              }}
            >
              {item}
            </Link>
          ))}
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .header-hamburger { display: flex !important; align-items: center; }
        }
      `}</style>
    </header>
  )
}
