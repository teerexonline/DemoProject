'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getPaddleInstance } from '@paddle/paddle-js'
import { createClient } from '@/lib/supabase/client'

interface Props {
  label?: string
  style?: React.CSSProperties
  className?: string
  onClick?: () => void
}

export default function UpgradeButton({ label = 'Upgrade to Pro', style, className, onClick }: Props) {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setEmail(user?.email ?? null)
    })
  }, [])

  useEffect(() => {
    if (!showPicker) return
    function handleOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowPicker(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [showPicker])

  function handleClick() {
    if (!email) { onClick?.(); router.push('/signup?plan=pro'); return }
    setShowPicker(prev => !prev)
  }

  async function openCheckout(priceId: string) {
    setShowPicker(false)
    onClick?.()
    setLoading(true)
    try {
      const paddle = getPaddleInstance()
      if (!paddle) { router.push('/pricing'); return }
      paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        customer: { email: email! },
        settings: { displayMode: 'overlay', theme: 'light', locale: 'en' },
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div ref={wrapperRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={handleClick}
        disabled={loading}
        className={className}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          padding: '9px 20px', borderRadius: 9,
          background: '#063f76', color: '#fff',
          border: 'none', fontSize: 13, fontWeight: 700,
          boxShadow: '0 4px 14px rgba(6,63,118,0.3)',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1,
          transition: 'background 0.15s, opacity 0.15s',
          whiteSpace: 'nowrap',
          textDecoration: 'none',
          ...style,
        }}
        onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = '#04294f' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#063f76' }}
      >
        {loading ? 'Opening…' : label}
      </button>

      {showPicker && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', left: 0,
          background: '#fff', borderRadius: 12, border: '1px solid #E4E4E7',
          boxShadow: '0 8px 30px rgba(0,0,0,0.12)', padding: 6,
          minWidth: 200, zIndex: 200,
        }}>
          <button
            onClick={() => openCheckout(process.env.NEXT_PUBLIC_PADDLE_PRICE_MONTHLY!)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '100%', padding: '10px 12px', borderRadius: 8,
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, color: '#09090B', textAlign: 'left',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F4F4F5'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'none'}
          >
            <span style={{ fontWeight: 600 }}>Monthly</span>
            <span style={{ color: '#63636e', fontSize: 12 }}>$7.99 / mo</span>
          </button>
          <button
            onClick={() => openCheckout(process.env.NEXT_PUBLIC_PADDLE_PRICE_YEARLY!)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '100%', padding: '10px 12px', borderRadius: 8,
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, color: '#09090B', textAlign: 'left',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F4F4F5'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'none'}
          >
            <span style={{ fontWeight: 600 }}>Yearly</span>
            <span style={{ color: '#16A34A', fontSize: 12, fontWeight: 600 }}>$79.99 / yr · Save 17%</span>
          </button>
        </div>
      )}
    </div>
  )
}
