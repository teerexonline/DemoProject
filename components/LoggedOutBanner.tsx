'use client'

import { useEffect, useState, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface CompanyInfo {
  name: string
  category: string
}

const DISMISS_KEY = 'researchorg_banner_dismissed_v1'
const DISMISS_EXPIRY_DAYS = 1

type Template = (company: CompanyInfo) => string

const COMPANY_TEMPLATES: Template[] = [
  (c) => `What makes ${c.name} different from its competitors? Sign up to find out`,
  (c) => `Is ${c.name} actually stable? Sign up before you apply`,
  (c) => `Interviewing at ${c.name}? Sign up to see their org structure first`,
  (c) => `You're missing half the picture on ${c.name} — sign up free`,
  (c) => `Who really runs ${c.name}? Sign up to see their leadership`,
  (c) => `Applying to ${c.name}? Know their financials and culture first`,
  (c) => `${c.name}'s org chart and hiring trends are locked — sign up free`,
  (c) => `Don't interview at ${c.name} unprepared — sign up free`,
]

const FALLBACK_MESSAGES = [
  'Sign up to research 270+ companies before your next interview',
  'Your next employer is here — sign up to start researching',
  'Job seekers who research companies get offers. Sign up free.',
]

function pickTemplate(slug: string, templates: Template[] | string[]): number {
  let hash = 0
  for (let i = 0; i < slug.length; i++) {
    hash = (hash * 31 + slug.charCodeAt(i)) >>> 0
  }
  return hash % templates.length
}

function isDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY)
    if (!raw) return false
    const { expiry } = JSON.parse(raw)
    if (Date.now() > expiry) {
      localStorage.removeItem(DISMISS_KEY)
      return false
    }
    return true
  } catch {
    return false
  }
}

function dismiss() {
  try {
    const expiry = Date.now() + DISMISS_EXPIRY_DAYS * 24 * 60 * 60 * 1000
    localStorage.setItem(DISMISS_KEY, JSON.stringify({ expiry }))
  } catch {}
}

export default function LoggedOutBanner() {
  const pathname = usePathname()
  const router = useRouter()
  const [visible, setVisible] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const isAuthed = useRef<boolean | null>(null)

  useEffect(() => {
    async function init() {
      // Check dismissal first (fast)
      if (isDismissed()) {
        setMounted(false)
        return
      }

      const supabase = createClient()

      // Check auth once, cache result
      if (isAuthed.current === null) {
        const { data: { session } } = await supabase.auth.getSession()
        isAuthed.current = !!session
      }
      if (isAuthed.current) return

      // Determine message for current page
      const companyMatch = pathname.match(/^\/company\/([^/]+)/)
      if (companyMatch) {
        const slug = companyMatch[1]
        try {
          const { data: company } = await supabase
            .from('companies')
            .select('name, category')
            .eq('slug', slug)
            .single()

          if (company) {
            const idx = pickTemplate(slug, COMPANY_TEMPLATES)
            setMessage(COMPANY_TEMPLATES[idx](company))
          } else {
            const idx = pickTemplate(slug, FALLBACK_MESSAGES)
            setMessage(FALLBACK_MESSAGES[idx])
          }
        } catch {
          setMessage(FALLBACK_MESSAGES[0])
        }
      } else {
        const pageKey = pathname || '/'
        const idx = pickTemplate(pageKey, FALLBACK_MESSAGES)
        setMessage(FALLBACK_MESSAGES[idx])
      }

      setLoading(false)
      setMounted(true)
      setVisible(true)
    }

    init()
  }, [pathname])

  function handleDismiss() {
    setVisible(false)
    dismiss()
    setTimeout(() => setMounted(false), 400)
  }

  function handleSignUp() {
    dismiss()
    router.push('/login')
  }

  if (!mounted || loading) return null

  return (
    <>
      <style>{`
        @keyframes bannerSlideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);   opacity: 1; }
        }
        @keyframes accentPulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .banner-cta:hover {
          background: #fff !important;
          color: #042a52 !important;
          transform: translateY(-1px);
        }
        .banner-dismiss:hover {
          background: rgba(255,255,255,0.12) !important;
        }
        @media (max-width: 640px) {
          .banner-lock-icon { display: none !important; }
          .banner-inner { justify-content: flex-start !important; flex-wrap: nowrap !important; gap: 10px !important; }
          .banner-group { flex-wrap: nowrap !important; gap: 10px !important; justify-content: flex-start !important; min-width: 0; }
          .banner-message { font-size: 12.5px !important; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
          .banner-cta { font-size: 12px !important; padding: 6px 12px !important; flex-shrink: 0; }
          .banner-dismiss { position: static !important; transform: none !important; flex-shrink: 0; }
        }
      `}</style>

      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          opacity: visible ? 1 : 0,
          transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease',
        }}
      >
        {/* Accent top border — pulsing */}
        <div style={{
          height: 2,
          background: 'linear-gradient(90deg, #1a7fd4 0%, #63b3ed 40%, #1a7fd4 70%, #4fa8e0 100%)',
          backgroundSize: '200% auto',
          animation: 'shimmer 3s linear infinite',
        }} />

        <div style={{
          background: 'linear-gradient(135deg, #021e3a 0%, #042a52 60%, #063f76 100%)',
          borderTop: 'none',
          boxShadow: '0 -4px 40px rgba(0,0,0,0.35), 0 -1px 0 rgba(255,255,255,0.04)',
          padding: '14px 20px',
        }}>
          <div
            className="banner-inner"
            style={{
              maxWidth: 1100,
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 16,
              position: 'relative',
            }}
          >
            {/* Icon */}
            <div className="banner-lock-icon" style={{
              flexShrink: 0,
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>

            {/* Message + CTA grouped */}
            <div className="banner-group" style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
              <p className="banner-message" style={{
                margin: 0,
                fontSize: 15,
                lineHeight: 1.5,
                color: 'rgba(255,255,255,0.88)',
                letterSpacing: '-0.01em',
                fontWeight: 500,
              }}>
                {message}
              </p>

              {/* CTA */}
              <button
                onClick={handleSignUp}
                className="banner-cta"
                style={{
                  flexShrink: 0,
                  padding: '8px 20px',
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.13)',
                  border: '1px solid rgba(255,255,255,0.25)',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  letterSpacing: '-0.01em',
                  transition: 'background 0.15s, color 0.15s, transform 0.1s',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  whiteSpace: 'nowrap',
                }}
              >
                Sign up free
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </button>
            </div>

            {/* Dismiss */}
            <button
              onClick={handleDismiss}
              className="banner-dismiss"
              aria-label="Dismiss"
              style={{
                position: 'absolute',
                right: 0,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 28,
                height: 28,
                borderRadius: 6,
                background: 'transparent',
                border: 'none',
                color: 'rgba(255,255,255,0.45)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.15s, color 0.15s',
                padding: 0,
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
