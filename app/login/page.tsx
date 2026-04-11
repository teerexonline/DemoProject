'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { LogoFull } from '@/components/Logo'

const TurnstileWidget = dynamic(() => import('@/components/TurnstileWidget'), { ssr: false })

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState('')
  const handleTurnstile = useCallback((token: string) => setTurnstileToken(token), [])
  const handleTurnstileExpire = useCallback(() => setTurnstileToken(''), [])

  async function handleGoogleSignIn() {
    setGoogleLoading(true)
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin}/auth/callback` },
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!turnstileToken) { setError('Please wait for the security check to complete.'); return }
    setLoading(true)

    const verify = await fetch('/api/turnstile/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: turnstileToken }),
    })
    const { success } = await verify.json()
    if (!success) { setError('Security check failed. Please refresh and try again.'); setLoading(false); return }

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F7F7F8',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%)',
        width: '500px', height: '500px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(109,40,217,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        width: '100%',
        maxWidth: '400px',
        background: '#fff',
        border: '1px solid #E4E4E7',
        borderRadius: '20px',
        padding: '40px 36px',
        position: 'relative',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
      }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'block', marginBottom: '32px' }}>
          <LogoFull height={44} />
        </Link>

        <h1 style={{
          fontFamily: '"Syne", sans-serif',
          fontSize: '22px',
          fontWeight: 700,
          color: '#09090B',
          letterSpacing: '-0.03em',
          margin: '0 0 6px',
        }}>Welcome back</h1>
        <p style={{ color: '#52525B', fontSize: '14px', margin: '0 0 24px' }}>
          Sign in to your ResearchOrg account.
        </p>

        {/* Google sign-in */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
          style={{
            width: '100%', padding: '11px', marginBottom: '16px',
            background: '#fff', border: '1px solid #E4E4E7', borderRadius: '9px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            fontSize: '14px', fontWeight: 600, color: '#09090B',
            cursor: googleLoading ? 'default' : 'pointer',
            transition: 'background 0.15s, border-color 0.15s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}
          onMouseEnter={e => { if (!googleLoading) { (e.currentTarget as HTMLElement).style.background = '#F7F7F8'; (e.currentTarget as HTMLElement).style.borderColor = '#D4D4D8' } }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#fff'; (e.currentTarget as HTMLElement).style.borderColor = '#E4E4E7' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {googleLoading ? 'Redirecting...' : 'Continue with Google'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{ flex: 1, height: '1px', background: '#F0F0F2' }} />
          <span style={{ color: '#A1A1AA', fontSize: '12px' }}>or</span>
          <div style={{ flex: 1, height: '1px', background: '#F0F0F2' }} />
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', color: '#A1A1AA', fontSize: '12.5px', fontWeight: 500, marginBottom: '6px', letterSpacing: '-0.01em' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="you@company.com"
              style={{
                width: '100%',
                padding: '10px 14px',
                background: '#F7F7F8',
                border: '1px solid #E4E4E7',
                borderRadius: '9px',
                color: '#09090B',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => (e.target as HTMLInputElement).style.borderColor = 'rgba(6,63,118,0.5)'}
              onBlur={e => (e.target as HTMLInputElement).style.borderColor = '#E4E4E7'}
            />
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ color: '#A1A1AA', fontSize: '12.5px', fontWeight: 500, letterSpacing: '-0.01em' }}>
                Password
              </label>
              <Link href="/forgot-password" style={{ color: '#063f76', fontSize: '12px', textDecoration: 'none' }}>
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '10px 14px',
                background: '#F7F7F8',
                border: '1px solid #E4E4E7',
                borderRadius: '9px',
                color: '#09090B',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => (e.target as HTMLInputElement).style.borderColor = 'rgba(6,63,118,0.5)'}
              onBlur={e => (e.target as HTMLInputElement).style.borderColor = '#E4E4E7'}
            />
          </div>

          <TurnstileWidget onVerify={handleTurnstile} onExpire={handleTurnstileExpire} />

          {error && (
            <div style={{
              padding: '10px 14px',
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: '8px',
              color: '#FCA5A5',
              fontSize: '13px',
            }}>{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: loading ? '#04294f' : '#063f76',
              border: '1px solid rgba(6,63,118,0.4)',
              borderRadius: '9px',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: loading ? 'default' : 'pointer',
              boxShadow: '0 0 20px rgba(6,63,118,0.25)',
              transition: 'background 0.15s',
              letterSpacing: '-0.01em',
              marginTop: '4px',
            }}
            onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = '#04294f' }}
            onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = '#063f76' }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', color: '#52525B', fontSize: '13.5px', marginTop: '24px', marginBottom: 0 }}>
          Don&apos;t have an account?{' '}
          <Link href="/signup" style={{ color: '#063f76', textDecoration: 'none', fontWeight: 500 }}>
            Sign up free
          </Link>
        </p>
      </div>
    </div>
  )
}
