'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px',
    background: '#F7F7F8', border: '1px solid #E4E4E7',
    borderRadius: '9px', color: '#fff', fontSize: '14px', outline: 'none',
    boxSizing: 'border-box', transition: 'border-color 0.15s',
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

        <h1 style={{
          fontFamily: '"Syne", sans-serif', fontSize: '22px', fontWeight: 700,
          color: '#09090B', letterSpacing: '-0.03em', margin: '0 0 6px',
        }}>Set new password</h1>
        <p style={{ color: '#52525B', fontSize: '14px', margin: '0 0 28px' }}>
          Choose a strong password for your account.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', color: '#A1A1AA', fontSize: '12.5px', fontWeight: 500, marginBottom: '6px' }}>New Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Min. 8 characters" style={inputStyle}
              onFocus={e => (e.target as HTMLInputElement).style.borderColor = 'rgba(6,63,118,0.5)'}
              onBlur={e => (e.target as HTMLInputElement).style.borderColor = '#E4E4E7'}
            />
          </div>
          <div>
            <label style={{ display: 'block', color: '#A1A1AA', fontSize: '12.5px', fontWeight: 500, marginBottom: '6px' }}>Confirm Password</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required placeholder="Repeat password" style={inputStyle}
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
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
