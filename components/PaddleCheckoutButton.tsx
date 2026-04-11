'use client'

import { getPaddle } from '@paddle/paddle-js'
import { useState } from 'react'

interface Props {
  priceId: string
  userEmail: string
  label?: string
  style?: React.CSSProperties
}

export default function PaddleCheckoutButton({ priceId, userEmail, label = 'Upgrade to Pro', style }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const paddle = await getPaddle()
      if (!paddle) { setLoading(false); return }

      paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        customer: { email: userEmail },
        settings: {
          displayMode: 'overlay',
          theme: 'light',
          locale: 'en',
        },
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      style={{
        padding: '9px 20px', borderRadius: 9,
        background: '#063f76', color: '#fff',
        border: 'none', fontSize: 13, fontWeight: 700,
        boxShadow: '0 4px 14px rgba(6,63,118,0.3)',
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.7 : 1,
        transition: 'background 0.15s, opacity 0.15s',
        whiteSpace: 'nowrap',
        ...style,
      }}
      onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = '#04294f' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#063f76' }}
    >
      {loading ? 'Opening…' : label}
    </button>
  )
}
