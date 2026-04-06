'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSent(true)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#F7F7F8',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%)',
        width: '500px', height: '500px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(109,40,217,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        width: '100%', maxWidth: '400px',
        background: '#fff', border: '1px solid #E4E4E7',
        borderRadius: '20px', padding: '40px 36px', position: 'relative',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
      }}>
        <Link href="/" style={{
          fontFamily: 'inherit', fontWeight: 800, fontSize: '17px',
          color: '#09090B', textDecoration: 'none', letterSpacing: '-0.02em', display: 'block', marginBottom: '32px',
        }}>
          Research<span style={{ color: '#063f76' }}>Org</span>
        </Link>

        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>📬</div>
            <h2 style={{
              fontFamily: '"Syne", sans-serif', fontSize: '20px', fontWeight: 700,
              color: '#fff', letterSpacing: '-0.03em', margin: '0 0 10px',
            }}>Reset email sent</h2>
            <p style={{ color: '#71717A', fontSize: '14px', lineHeight: 1.6, margin: '0 0 24px' }}>
              Check <strong style={{ color: '#A1A1AA' }}>{email}</strong> for a link to reset your password.
            </p>
            <Link href="/login" style={{ color: '#063f76', fontSize: '14px', fontWeight: 500, textDecoration: 'none' }}>
              ← Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <h1 style={{
              fontFamily: '"Syne", sans-serif', fontSize: '22px', fontWeight: 700,
              color: '#09090B', letterSpacing: '-0.03em', margin: '0 0 6px',
            }}>Reset your password</h1>
            <p style={{ color: '#52525B', fontSize: '14px', margin: '0 0 28px', lineHeight: 1.6 }}>
              Enter your email and we&apos;ll send you a reset link.
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', color: '#A1A1AA', fontSize: '12.5px', fontWeight: 500, marginBottom: '6px' }}>Email</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  required placeholder="you@company.com"
                  style={{
                    width: '100%', padding: '10px 14px',
                    background: '#F7F7F8', border: '1px solid #E4E4E7',
                    borderRadius: '9px', color: '#fff', fontSize: '14px', outline: 'none',
                    boxSizing: 'border-box', transition: 'border-color 0.15s',
                  }}
                  onFocus={e => (e.target as HTMLInputElement).style.borderColor = 'rgba(6,63,118,0.5)'}
                  onBlur={e => (e.target as HTMLInputElement).style.borderColor = '#E4E4E7'}
                />
              </div>

              {error && (
                <div style={{
                  padding: '10px 14px', background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px',
                  color: '#FCA5A5', fontSize: '13px',
                }}>{error}</div>
              )}

              <button
                type="submit" disabled={loading}
                style={{
                  width: '100%', padding: '12px',
                  background: loading ? '#4C1D95' : '#063f76',
                  border: '1px solid rgba(6,63,118,0.4)', borderRadius: '9px',
                  color: '#fff', fontSize: '14px', fontWeight: 600,
                  cursor: loading ? 'default' : 'pointer',
                  boxShadow: '0 0 20px rgba(6,63,118,0.25)',
                  transition: 'background 0.15s', letterSpacing: '-0.01em', marginTop: '4px',
                }}
                onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = '#04294f' }}
                onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = '#063f76' }}
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>

            <p style={{ textAlign: 'center', color: '#52525B', fontSize: '13.5px', marginTop: '24px', marginBottom: 0 }}>
              <Link href="/login" style={{ color: '#063f76', textDecoration: 'none', fontWeight: 500 }}>← Back to sign in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
