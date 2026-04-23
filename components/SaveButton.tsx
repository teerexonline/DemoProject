'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { saveCompany, unsaveCompany } from '@/app/actions/profile'
import { createClient } from '@/lib/supabase/client'
import { Bookmark, Bell, TrendingUp } from 'lucide-react'

interface Props {
  companyId: string
  companyName: string
  initialSaved: boolean
  isLoggedIn?: boolean
  size?: 'sm' | 'md'
  logoColor?: string
}

const BENEFITS = [
  { icon: <Bookmark size={13} strokeWidth={2} />, text: 'Save companies to research lists' },
  { icon: <Bell size={13} strokeWidth={2} />, text: 'Get alerts when data changes' },
  { icon: <TrendingUp size={13} strokeWidth={2} />, text: 'Track hiring trends & org changes' },
]

export default function SaveButton({ companyId, companyName, initialSaved, isLoggedIn: isLoggedInProp = false, size = 'md', logoColor = '#063f76' }: Props) {
  const [saved, setSaved] = useState(initialSaved)
  const [isLoggedIn, setIsLoggedIn] = useState(isLoggedInProp)
  const [isPending, startTransition] = useTransition()
  const [showPrompt, setShowPrompt] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Client-side auth + saved state check.
  // The page is ISR so the server always passes isLoggedIn=false/initialSaved=false.
  // We hydrate the real state here after mount.
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      setIsLoggedIn(true)
      supabase
        .from('saved_companies')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('company_id', companyId)
        .maybeSingle()
        .then(({ data }) => { if (data) setSaved(true) })
    })
  }, [companyId])

  // Close prompt on outside click
  useEffect(() => {
    if (!showPrompt) return
    function handler(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowPrompt(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showPrompt])

  function toggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    if (!isLoggedIn) {
      setShowPrompt(prev => !prev)
      return
    }

    const next = !saved
    setSaved(next)
    startTransition(async () => {
      if (next) {
        const result = await saveCompany(companyId)
        if (result?.error) setSaved(!next)
      } else {
        const result = await unsaveCompany(companyId)
        if (result?.error) setSaved(!next)
      }
    })
  }

  const dim = size === 'sm' ? 28 : 32
  const iconSize = size === 'sm' ? 13 : 15

  return (
    <div ref={wrapperRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={toggle}
        disabled={isPending}
        title={isLoggedIn ? (saved ? `Unsave ${companyName}` : `Save ${companyName}`) : `Sign up to save ${companyName}`}
        style={{
          width: dim, height: dim,
          borderRadius: 8,
          border: saved ? `1.5px solid ${logoColor}40` : '1.5px solid #E4E4E7',
          background: saved ? `${logoColor}10` : '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: isPending ? 'default' : 'pointer',
          transition: 'border-color 0.15s, background 0.15s, transform 0.15s',
          flexShrink: 0,
          transform: isPending ? 'scale(0.9)' : 'scale(1)',
        }}
        onMouseEnter={e => {
          if (!isPending) {
            const el = e.currentTarget as HTMLElement
            el.style.borderColor = saved ? `${logoColor}60` : '#D4D4D8'
            el.style.background = saved ? `${logoColor}18` : '#F7F7F8'
            el.style.transform = 'scale(1.08)'
          }
        }}
        onMouseLeave={e => {
          if (!isPending) {
            const el = e.currentTarget as HTMLElement
            el.style.borderColor = saved ? `${logoColor}40` : '#E4E4E7'
            el.style.background = saved ? `${logoColor}10` : '#fff'
            el.style.transform = 'scale(1)'
          }
        }}
      >
        <svg
          width={iconSize} height={iconSize}
          viewBox="0 0 24 24"
          fill={saved ? logoColor : 'none'}
          stroke={saved ? logoColor : '#A1A1AA'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transition: 'fill 0.15s, stroke 0.15s' }}
        >
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
        </svg>
      </button>

      {/* Signup prompt popover — opens below the button */}
      {showPrompt && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 10px)',
          right: 0,
          width: 248,
          background: '#fff',
          border: '1px solid #E4E4E7',
          borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.13), 0 2px 8px rgba(0,0,0,0.06)',
          zIndex: 1000,
          overflow: 'hidden',
          animation: 'savePromptIn 0.18s cubic-bezier(0.16,1,0.3,1)',
        }}>
          <style>{`
            @keyframes savePromptIn {
              from { opacity: 0; transform: translateY(-6px) scale(0.97); }
              to   { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>

          {/* Arrow pointing up */}
          <div style={{
            position: 'absolute', top: -6, right: 10,
            width: 12, height: 12,
            background: '#fff',
            border: '1px solid #E4E4E7',
            borderBottom: 'none', borderRight: 'none',
            transform: 'rotate(45deg)',
          }} />

          {/* Header */}
          <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid #F4F4F5' }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#09090B', letterSpacing: '-0.01em' }}>
              Sign up to save {companyName}
            </p>
            <p style={{ margin: '3px 0 0', fontSize: 11.5, color: '#71717A' }}>
              Free account — no credit card needed
            </p>
          </div>

          {/* Benefits */}
          <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 7 }}>
            {BENEFITS.map(b => (
              <div key={b.text} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  flexShrink: 0, width: 22, height: 22, borderRadius: 6,
                  background: '#eef4fb', color: '#063f76',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {b.icon}
                </span>
                <span style={{ fontSize: 11.5, color: '#52525B', lineHeight: 1.4 }}>{b.text}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div style={{ padding: '0 14px 13px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <a
              href="/signup"
              style={{
                display: 'block', textAlign: 'center',
                padding: '9px 0', borderRadius: 8,
                background: '#063f76', color: '#fff',
                fontSize: 13, fontWeight: 700, textDecoration: 'none',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#04294f'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#063f76'}
            >
              Create free account
            </a>
            <a
              href="/login"
              style={{
                display: 'block', textAlign: 'center',
                padding: '6px 0',
                fontSize: 12, color: '#71717A', textDecoration: 'none',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#063f76'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#71717A'}
            >
              Already have an account? Log in
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
