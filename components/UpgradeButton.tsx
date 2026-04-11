'use client'

import { useState, useEffect } from 'react'
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

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setEmail(user?.email ?? null)
    })
  }, [])

  async function handleClick() {
    onClick?.()
    if (!email) {
      router.push('/signup?plan=pro')
      return
    }
    setLoading(true)
    try {
      const paddle = getPaddleInstance()
      if (!paddle) { router.push('/pricing'); return }
      paddle.Checkout.open({
        items: [{ priceId: process.env.NEXT_PUBLIC_PADDLE_PRICE_MONTHLY!, quantity: 1 }],
        customer: { email },
        settings: { displayMode: 'overlay', theme: 'light', locale: 'en' },
      })
    } finally {
      setLoading(false)
    }
  }

  return (
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
  )
}
