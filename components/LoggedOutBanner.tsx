'use client'

import { useEffect, useState, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface CompanyInfo {
  id: string
  name: string
  category: string
}

const DISMISS_KEY = 'researchorg_banner_dismissed_v1'
const DISMISS_EXPIRY_DAYS = 1

type Template = (company: CompanyInfo) => string

const COMPANY_TEMPLATES: Template[] = [
  (c) => `Researching ${c.name}? Get alerts when their org or headcount changes`,
  (c) => `Save ${c.name} to your research list — we'll notify you of updates`,
  (c) => `Interviewing at ${c.name}? Track their org structure and open roles`,
  (c) => `Watch ${c.name} — get notified when new data is added`,
  (c) => `Following up on ${c.name}? Save it and we'll keep you updated`,
  (c) => `${c.name} just updated — save it to stay in the loop`,
  (c) => `Track ${c.name}'s hiring trends and org changes`,
  (c) => `Add ${c.name} to your watchlist — free, no account needed`,
]

const FALLBACK_MESSAGES = [
  'Get alerts when companies you\'re researching update their data',
  'Save companies to your watchlist — no account needed',
  'Track 270+ companies. Get notified when things change.',
]

function pickIndex(slug: string, len: number): number {
  let hash = 0
  for (let i = 0; i < slug.length; i++) {
    hash = (hash * 31 + slug.charCodeAt(i)) >>> 0
  }
  return hash % len
}

function isDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY)
    if (!raw) return false
    const { expiry } = JSON.parse(raw)
    if (Date.now() > expiry) { localStorage.removeItem(DISMISS_KEY); return false }
    return true
  } catch { return false }
}

function dismiss() {
  try {
    const expiry = Date.now() + DISMISS_EXPIRY_DAYS * 24 * 60 * 60 * 1000
    localStorage.setItem(DISMISS_KEY, JSON.stringify({ expiry }))
  } catch {}
}

type State = 'idle' | 'capturing' | 'submitting' | 'done'

export default function LoggedOutBanner() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [message, setMessage] = useState('')
  const [company, setCompany] = useState<CompanyInfo | null>(null)
  const [uiState, setUiState] = useState<State>('idle')
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const isAuthed = useRef<boolean | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function init() {
      if (isDismissed()) return

      const supabase = createClient()
      if (isAuthed.current === null) {
        const { data: { session } } = await supabase.auth.getSession()
        isAuthed.current = !!session
      }
      if (isAuthed.current) return

      const companyMatch = pathname.match(/^\/company\/([^/]+)/)
      if (companyMatch) {
        const slug = companyMatch[1]
        try {
          const { data } = await supabase
            .from('companies')
            .select('id, name, category')
            .eq('slug', slug)
            .single()

          if (data) {
            setCompany(data)
            const idx = pickIndex(slug, COMPANY_TEMPLATES.length)
            setMessage(COMPANY_TEMPLATES[idx](data))
          } else {
            setMessage(FALLBACK_MESSAGES[pickIndex(slug, FALLBACK_MESSAGES.length)])
          }
        } catch {
          setMessage(FALLBACK_MESSAGES[0])
        }
      } else {
        const key = pathname || '/'
        setMessage(FALLBACK_MESSAGES[pickIndex(key, FALLBACK_MESSAGES.length)])
      }

      setMounted(true)
      setVisible(true)
    }

    setUiState('idle')
    setEmail('')
    setEmailError('')
    init()
  }, [pathname])

  // Focus input when capturing
  useEffect(() => {
    if (uiState === 'capturing') {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [uiState])

  function handleDismiss() {
    setVisible(false)
    dismiss()
    setTimeout(() => setMounted(false), 400)
  }

  async function handleSubmit() {
    const trimmed = email.trim()
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError('Enter a valid email')
      return
    }
    setEmailError('')
    setUiState('submitting')

    try {
      await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmed,
          company_id: company?.id ?? null,
          source: 'banner',
        }),
      })
    } catch {}

    setUiState('done')
    setTimeout(() => {
      setVisible(false)
      dismiss()
      setTimeout(() => setMounted(false), 400)
    }, 2200)
  }

  if (!mounted) return null

  return (
    <>
      <style>{`
        @keyframes bannerSlideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);   opacity: 1; }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        .bnr-cta {
          flex-shrink: 0;
          padding: 8px 18px;
          border-radius: 8px;
          background: rgba(255,255,255,0.13);
          border: 1px solid rgba(255,255,255,0.25);
          color: #fff;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          letter-spacing: -0.01em;
          transition: background 0.15s, transform 0.1s;
          white-space: nowrap;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .bnr-cta:hover { background: rgba(255,255,255,0.22) !important; transform: translateY(-1px); }
        .bnr-dismiss:hover { background: rgba(255,255,255,0.1) !important; }
        .bnr-input {
          flex: 1;
          min-width: 0;
          max-width: 240px;
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.25);
          background: rgba(255,255,255,0.1);
          color: #fff;
          font-size: 13px;
          outline: none;
          transition: border-color 0.15s, background 0.15s;
        }
        .bnr-input::placeholder { color: rgba(255,255,255,0.4); }
        .bnr-input:focus { border-color: rgba(255,255,255,0.5); background: rgba(255,255,255,0.15); }
        .bnr-submit {
          flex-shrink: 0;
          padding: 8px 16px;
          border-radius: 8px;
          background: #fff;
          border: none;
          color: #042a52;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: opacity 0.15s, transform 0.1s;
          white-space: nowrap;
        }
        .bnr-submit:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
        .bnr-submit:disabled { opacity: 0.5; cursor: not-allowed; }
        @media (max-width: 640px) {
          .bnr-icon { display: none !important; }
          .bnr-inner { justify-content: flex-start !important; gap: 8px !important; }
          .bnr-group { flex: 1 !important; flex-wrap: nowrap !important; gap: 8px !important; min-width: 0; }
          .bnr-message { flex: 1 !important; font-size: 12.5px !important; white-space: normal !important; min-width: 0; }
          .bnr-cta { font-size: 12px !important; padding: 7px 12px !important; }
          .bnr-dismiss { position: static !important; transform: none !important; flex-shrink: 0 !important; }
          .bnr-input { max-width: 140px !important; font-size: 12px !important; }
          .bnr-submit { font-size: 12px !important; padding: 7px 12px !important; }
        }
      `}</style>

      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
        transform: visible ? 'translateY(0)' : 'translateY(100%)',
        opacity: visible ? 1 : 0,
        transition: 'transform 0.4s cubic-bezier(0.16,1,0.3,1), opacity 0.4s ease',
      }}>
        {/* Shimmer accent bar */}
        <div style={{
          height: 2,
          background: 'linear-gradient(90deg, #1a7fd4 0%, #63b3ed 40%, #1a7fd4 70%, #4fa8e0 100%)',
          backgroundSize: '200% auto',
          animation: 'shimmer 3s linear infinite',
        }} />

        <div style={{
          background: 'linear-gradient(135deg, #021e3a 0%, #042a52 60%, #063f76 100%)',
          boxShadow: '0 -4px 40px rgba(0,0,0,0.35), 0 -1px 0 rgba(255,255,255,0.04)',
          padding: '13px 20px',
        }}>
          <div className="bnr-inner" style={{
            maxWidth: 1100, margin: '0 auto',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 16, position: 'relative',
          }}>
            {/* Bell icon */}
            <div className="bnr-icon" style={{
              flexShrink: 0, width: 32, height: 32, borderRadius: 8,
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </div>

            {/* DONE state */}
            {uiState === 'done' ? (
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>
                ✓ You're on the list — we'll notify you when things change.
              </p>
            ) : uiState === 'idle' ? (
              /* Default: message + CTA */
              <div className="bnr-group" style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
                <p className="bnr-message" style={{
                  margin: 0, fontSize: 14.5, lineHeight: 1.5,
                  color: 'rgba(255,255,255,0.88)', letterSpacing: '-0.01em', fontWeight: 500,
                }}>
                  {message}
                </p>
                <button className="bnr-cta" onClick={() => setUiState('capturing')}>
                  Save to watchlist
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </button>
              </div>
            ) : (
              /* Email capture */
              <div className="bnr-group" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                <p className="bnr-message" style={{
                  margin: 0, fontSize: 13.5, color: 'rgba(255,255,255,0.7)', fontWeight: 500,
                  whiteSpace: 'nowrap',
                }}>
                  {company ? `Watch ${company.name}` : 'Get research alerts'}
                </p>
                <input
                  ref={inputRef}
                  className="bnr-input"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setEmailError('') }}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  autoComplete="email"
                />
                <button
                  className="bnr-submit"
                  onClick={handleSubmit}
                  disabled={uiState === 'submitting'}
                >
                  {uiState === 'submitting' ? 'Saving…' : 'Notify me'}
                </button>
                {emailError && (
                  <span style={{ fontSize: 11, color: '#fca5a5', whiteSpace: 'nowrap' }}>{emailError}</span>
                )}
              </div>
            )}

            {/* Dismiss */}
            {uiState !== 'done' && (
              <button
                onClick={handleDismiss}
                className="bnr-dismiss"
                aria-label="Dismiss"
                style={{
                  position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
                  width: 28, height: 28, borderRadius: 6,
                  background: 'transparent', border: 'none',
                  color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.15s', padding: 0,
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
