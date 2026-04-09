'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import SearchAutocomplete from '@/components/SearchAutocomplete'
import { LogoFull, LogoIcon } from '@/components/Logo'

export default function Header() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<{ name?: string; plan?: string } | null>(null)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const pathname = usePathname()
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClient()
    let mounted = true

    async function sync(u: User | null) {
      if (!mounted) return
      setUser(u)
      if (u) {
        const { data } = await supabase
          .from('profiles')
          .select('name, plan, email')
          .eq('id', u.id)
          .single()
        if (mounted) { setProfile(data); setProfileLoaded(true) }
      } else {
        setProfile(null)
        setProfileLoaded(true)
      }
    }

    supabase.auth.getUser().then(({ data: { user } }) => sync(user))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      sync(session?.user ?? null)
    })

    return () => { mounted = false; subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const displayName = profile?.name || user?.email?.split('@')[0] || ''
  const initials = displayName
    ? displayName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
    : '?'
  const plan = profileLoaded ? (profile?.plan ?? 'Free') : null
  const isPro = plan === 'Pro' || plan === 'Admin' || plan === 'SuperAdmin'
  const isAdmin = plan === 'Admin' || plan === 'SuperAdmin'

  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      background: scrolled ? 'rgba(255,255,255,0.94)' : '#fff',
      backdropFilter: scrolled ? 'blur(14px)' : 'none',
      borderBottom: '1px solid #e2eaf2',
      transition: 'box-shadow 0.2s',
      boxShadow: scrolled ? '0 1px 12px rgba(6,63,118,0.07)' : 'none',
    }}>
      <div className="header-inner" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px', height: '60px', display: 'flex', alignItems: 'center', gap: '20px' }}>

        {/* Logo */}
        <Link href="/" style={{ textDecoration: 'none', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
          <LogoFull height={38} className="header-logo-full" />
          <LogoIcon height={34} className="header-logo-icon" style={{ display: 'none' }} />
        </Link>

        {/* Search */}
        <div className="header-search" style={{ flex: 1, maxWidth: '340px' }}>
          <SearchAutocomplete placeholder="Search any company..." size="sm" />
        </div>

        {/* Nav links */}
        <nav className="header-nav" style={{ display: 'flex', gap: '2px', marginLeft: '4px' }}>
          {['Features', 'Enterprise', 'Pricing'].map(item => (
            <Link key={item} href={`#${item.toLowerCase()}`}
              style={{ color: '#52525B', textDecoration: 'none', fontSize: '13.5px', fontWeight: 500, padding: '6px 11px', borderRadius: '7px', transition: 'color 0.15s, background 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#063f76'; (e.currentTarget as HTMLElement).style.background = '#eef4fb' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#52525B'; (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >{item}</Link>
          ))}
        </nav>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto', flexShrink: 0 }}>
          {user ? (
            <div ref={dropdownRef} className="header-user-desktop" style={{ position: 'relative' }}>
              {/* Avatar button */}
              <button
                onClick={() => setDropdownOpen(v => !v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '4px 8px 4px 4px', borderRadius: 10,
                  border: `1.5px solid ${dropdownOpen ? '#a8cbe8' : '#e2eaf2'}`,
                  background: dropdownOpen ? '#eef4fb' : '#fff',
                  cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s',
                }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; if (!dropdownOpen) { el.style.borderColor = '#a8cbe8'; el.style.background = '#eef4fb' } }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; if (!dropdownOpen) { el.style.borderColor = '#e2eaf2'; el.style.background = '#fff' } }}
              >
                <div style={{ width: 28, height: 28, borderRadius: 7, background: '#063f76', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 6px rgba(6,63,118,0.35)', flexShrink: 0 }}>
                  <span style={{ color: '#fff', fontSize: 11, fontWeight: 800 }}>{initials}</span>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: '#09090B', lineHeight: 1.2 }}>{displayName}</div>
                  {isPro && (
                    <div style={{ fontSize: 10, color: '#063f76', fontWeight: 700 }}>Pro</div>
                  )}
                </div>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.18s' }}
                >
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>

              {/* Dropdown */}
              {dropdownOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                  width: 220, background: '#fff',
                  border: '1px solid #e2eaf2', borderRadius: 14,
                  boxShadow: '0 8px 32px rgba(6,63,118,0.10), 0 2px 8px rgba(0,0,0,0.05)',
                  overflow: 'hidden', zIndex: 100,
                  animation: 'dropIn 0.15s ease',
                }}>
                  {/* User info block */}
                  <div style={{ padding: '14px 16px', borderBottom: '1px solid #f0f6fc', background: '#f8fbfe' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: '#063f76', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 10px rgba(6,63,118,0.25)' }}>
                        <span style={{ color: '#fff', fontSize: 14, fontWeight: 800 }}>{initials}</span>
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#09090B', letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</div>
                        <div style={{ fontSize: 11, color: '#A1A1AA', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</div>
                      </div>
                    </div>
                    <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 6, background: isPro ? 'rgba(6,63,118,0.06)' : '#F4F4F5', border: `1px solid ${isPro ? '#a8cbe8' : '#EBEBED'}`, width: 'fit-content' }}>
                      {isPro && <svg width="9" height="9" viewBox="0 0 24 24" fill="#063f76"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>}
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: isPro ? '#063f76' : '#71717A' }}>{plan ?? '…'} Plan</span>
                    </div>
                  </div>

                  {/* Menu items */}
                  <div style={{ padding: '6px' }}>
                    {[
                      { label: 'My Profile',       href: '/profile',  icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
                      { label: 'Account Settings', href: '/settings', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> },
                    ].map(item => (
                      <Link key={item.label} href={item.href} onClick={() => setDropdownOpen(false)}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 8, textDecoration: 'none', color: '#3F3F46', fontSize: 13, fontWeight: 500, transition: 'background 0.12s, color 0.12s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#eef4fb'; (e.currentTarget as HTMLElement).style.color = '#063f76' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#3F3F46' }}
                      >
                        <span style={{ color: 'inherit', opacity: 0.7 }}>{item.icon}</span>
                        {item.label}
                      </Link>
                    ))}
                    {isAdmin && (
                      <Link href="/admin" onClick={() => setDropdownOpen(false)}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 8, textDecoration: 'none', color: '#92400E', fontSize: 13, fontWeight: 600, transition: 'background 0.12s, color 0.12s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#FEF3C7' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                      >
                        <span style={{ opacity: 0.8 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                        </span>
                        Admin Dashboard
                      </Link>
                    )}
                    {!isPro && (
                      <Link href="/signup?plan=pro" onClick={() => setDropdownOpen(false)}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 8, textDecoration: 'none', color: '#063f76', fontSize: 13, fontWeight: 600, transition: 'background 0.12s' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#eef4fb'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="#063f76"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                        Upgrade to Pro
                      </Link>
                    )}
                  </div>

                  <div style={{ borderTop: '1px solid #f0f6fc', padding: '6px' }}>
                    <button
                      onClick={() => { setDropdownOpen(false); handleSignOut() }}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 8, border: 'none', background: 'transparent', color: '#71717A', fontSize: 13, fontWeight: 500, cursor: 'pointer', width: '100%', transition: 'background 0.12s, color 0.12s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#FEF2F2'; (e.currentTarget as HTMLElement).style.color = '#DC2626' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#71717A' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/login" className="header-signin-link"
                style={{ color: '#52525B', textDecoration: 'none', fontSize: '13.5px', fontWeight: 500, padding: '7px 14px', borderRadius: '8px', transition: 'color 0.15s' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#063f76'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#52525B'}
              >Sign In</Link>
              <Link href="/signup" className="header-cta-link"
                style={{ color: '#fff', textDecoration: 'none', fontSize: '13.5px', fontWeight: 600, padding: '8px 16px', borderRadius: '8px', background: '#063f76', transition: 'background 0.15s', letterSpacing: '-0.01em', boxShadow: '0 1px 3px rgba(6,63,118,0.3)' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#04294f'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#063f76'}
              >Get Started Free</Link>
            </>
          )}
        </div>

        {/* Mobile avatar (logged-in only) — replaces hamburger */}
        {user && (
          <button
            className="header-mobile-avatar"
            onClick={() => setMobileMenuOpen(v => !v)}
            style={{
              display: 'none', alignItems: 'center', gap: '6px',
              padding: '4px 8px 4px 4px', borderRadius: '10px',
              border: `1.5px solid ${mobileMenuOpen ? '#a8cbe8' : '#e2eaf2'}`,
              background: mobileMenuOpen ? '#eef4fb' : '#fff',
              cursor: 'pointer', flexShrink: 0,
            }}
            aria-label="Toggle menu"
          >
            <div style={{ width: 28, height: 28, borderRadius: 7, background: '#063f76', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ color: '#fff', fontSize: 11, fontWeight: 800 }}>{initials}</span>
            </div>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: mobileMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.18s' }}
            >
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
        )}

        {/* Mobile hamburger (logged-out only) */}
        {!user && (
          <button className="header-hamburger" onClick={() => setMobileMenuOpen(v => !v)}
            style={{ display: 'none', background: 'none', border: '1px solid #e2eaf2', borderRadius: '7px', padding: '6px 8px', cursor: 'pointer', color: '#52525B', flexShrink: 0 }}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen
              ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
              : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="8" x2="20" y2="8"/><line x1="4" y1="16" x2="20" y2="16"/></svg>
            }
          </button>
        )}
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="header-mobile-menu" style={{ borderTop: '1px solid #f0f6fc', background: '#fff', padding: '12px 16px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ marginBottom: '8px' }}>
            <SearchAutocomplete placeholder="Search any company..." size="sm" onSelect={() => setMobileMenuOpen(false)} />
          </div>
          {['Features', 'Enterprise', 'Pricing'].map(item => (
            <Link key={item} href={`#${item.toLowerCase()}`} onClick={() => setMobileMenuOpen(false)}
              style={{ color: '#52525B', textDecoration: 'none', fontSize: '14px', fontWeight: 500, padding: '10px 12px', borderRadius: '8px', background: '#f8fbfe' }}
            >{item}</Link>
          ))}
          {user ? (
            <>
              <Link href="/profile" onClick={() => setMobileMenuOpen(false)} style={{ color: '#52525B', textDecoration: 'none', fontSize: '14px', fontWeight: 500, padding: '10px 12px', borderRadius: '8px', background: '#f8fbfe' }}>My Profile</Link>
              <Link href="/settings" onClick={() => setMobileMenuOpen(false)} style={{ color: '#52525B', textDecoration: 'none', fontSize: '14px', fontWeight: 500, padding: '10px 12px', borderRadius: '8px', background: '#f8fbfe' }}>Settings</Link>
              {isAdmin && (
                <Link href="/admin" onClick={() => setMobileMenuOpen(false)} style={{ color: '#92400E', textDecoration: 'none', fontSize: '14px', fontWeight: 600, padding: '10px 12px', borderRadius: '8px', background: '#FEF3C7' }}>Admin Dashboard</Link>
              )}
              <button onClick={() => { setMobileMenuOpen(false); handleSignOut() }} style={{ color: '#DC2626', textDecoration: 'none', fontSize: '14px', fontWeight: 500, padding: '10px 12px', borderRadius: '8px', background: '#FEF2F2', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%' }}>Sign out</button>
            </>
          ) : (
            <>
              <Link href="/login" onClick={() => setMobileMenuOpen(false)} style={{ color: '#52525B', textDecoration: 'none', fontSize: '14px', fontWeight: 500, padding: '10px 12px', borderRadius: '8px', background: '#f8fbfe' }}>Sign In</Link>
              <Link href="/signup" onClick={() => setMobileMenuOpen(false)} style={{ color: '#fff', textDecoration: 'none', fontSize: '14px', fontWeight: 600, padding: '10px 12px', borderRadius: '8px', background: '#063f76', textAlign: 'center' }}>Get Started Free</Link>
            </>
          )}
        </div>
      )}

      <style>{`
        @keyframes dropIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)     scale(1);    }
        }
        @media (max-width: 768px) {
          .header-hamburger { display: flex !important; align-items: center; }
          .header-mobile-avatar { display: flex !important; align-items: center; }
          .header-user-desktop { display: none !important; }
          .header-signin-link, .header-cta-link { display: none !important; }
          .header-nav, .header-search { display: none !important; }
          .header-logo-full { display: none !important; }
          .header-logo-icon { display: block !important; }
        }
      `}</style>
    </header>
  )
}
