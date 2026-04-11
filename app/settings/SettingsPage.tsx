'use client'

import { useState, useTransition } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { changePassword } from '@/app/actions/profile'
import { cancelSubscription } from '@/app/actions/paddle'
import type { BillingInfo } from './page'

const PaddleCheckoutButton = dynamic(() => import('@/components/PaddleCheckoutButton'), { ssr: false })

interface Props {
  user: User
  profile: { plan: string }
  isPro: boolean
  billing?: BillingInfo
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  )
}

function TextInput({ value, onChange, placeholder, type = 'text', readOnly }: {
  value: string; onChange?: (v: string) => void; placeholder?: string; type?: string; readOnly?: boolean
}) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange?.(e.target.value)}
      placeholder={placeholder}
      readOnly={readOnly}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: '100%', padding: '10px 13px',
        background: readOnly ? '#F7F7F8' : focused ? '#fff' : '#F7F7F8',
        border: `1.5px solid ${focused && !readOnly ? '#063f76' : '#E4E4E7'}`,
        borderRadius: 9, color: readOnly ? '#71717A' : '#09090B', fontSize: 13.5,
        outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s, background 0.15s',
        cursor: readOnly ? 'not-allowed' : 'text',
      }}
    />
  )
}

function SectionCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E4E4E7', overflow: 'hidden', boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
      <div style={{ padding: '18px 22px', borderBottom: '1px solid #F4F4F5' }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#09090B', letterSpacing: '-0.03em' }}>{title}</div>
        {description && <div style={{ fontSize: 12, color: '#A1A1AA', marginTop: 2 }}>{description}</div>}
      </div>
      <div style={{ padding: '22px' }}>{children}</div>
    </div>
  )
}

function SaveBtn({ onClick, pending, label = 'Save changes' }: { onClick: () => void; pending: boolean; label?: string }) {
  return (
    <button onClick={onClick} disabled={pending} style={{ padding: '9px 20px', borderRadius: 9, border: 'none', background: pending ? '#609dd6' : '#063f76', color: '#fff', fontSize: 13, fontWeight: 600, cursor: pending ? 'default' : 'pointer', transition: 'background 0.15s' }}
      onMouseEnter={e => { if (!pending) (e.currentTarget as HTMLElement).style.background = '#04294f' }}
      onMouseLeave={e => { if (!pending) (e.currentTarget as HTMLElement).style.background = '#063f76' }}
    >
      {pending ? 'Saving…' : label}
    </button>
  )
}

export default function SettingsPage({ user, profile, isPro, billing }: Props) {
  // Password section state
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw]         = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwMsg, setPwMsg]         = useState('')
  const [pwError, setPwError]     = useState('')
  const [pwPending, startPwTransition] = useTransition()

  // Reset password
  const [resetSent, setResetSent] = useState(false)
  const [resetPending, setResetPending] = useState(false)

  // Subscription cancel
  const [cancelConfirm, setCancelConfirm] = useState(false)
  const [cancelMsg, setCancelMsg] = useState('')
  const [cancelPending, startCancelTransition] = useTransition()

  function handleCancel() {
    startCancelTransition(async () => {
      const { error } = await cancelSubscription()
      if (error) { setCancelMsg(error); setCancelConfirm(false) }
      else { setCancelMsg('Subscription cancelled. You keep Pro access until the end of your billing period.'); setCancelConfirm(false) }
    })
  }

  function handleChangePassword() {
    setPwError('')
    if (newPw.length < 8) { setPwError('Password must be at least 8 characters'); return }
    if (newPw !== confirmPw) { setPwError('Passwords do not match'); return }
    startPwTransition(async () => {
      const result = await changePassword(newPw)
      if (result?.error) {
        setPwError(result.error)
      } else {
        setPwMsg('Password updated successfully')
        setCurrentPw(''); setNewPw(''); setConfirmPw('')
        setTimeout(() => setPwMsg(''), 3000)
      }
    })
  }

  async function handleResetPassword() {
    setResetPending(true)
    const supabase = createClient()
    await supabase.auth.resetPasswordForEmail(user.email!, {
      redirectTo: `${(process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin)}/reset-password`,
    })
    setResetSent(true)
    setResetPending(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F5F5F7' }}>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '36px 24px' }}>

        {/* Page header */}
        <div style={{ marginBottom: 28, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/profile" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, border: '1.5px solid #E4E4E7', background: '#fff', textDecoration: 'none', transition: 'border-color 0.15s' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = '#063f76'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = '#E4E4E7'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#52525B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          </Link>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#09090B', letterSpacing: '-0.04em' }}>Account Settings</div>
            <div style={{ fontSize: 13, color: '#A1A1AA', marginTop: 2 }}>Manage your account, security, and subscription</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* ── 1. Subscription Plan ── */}
          <SectionCard title="Subscription Plan" description="Your current plan and billing">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: isPro ? 'linear-gradient(135deg, #063f76, #5B21B6)' : '#F4F4F5', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: isPro ? '0 4px 14px rgba(6,63,118,0.3)' : 'none' }}>
                  {isPro
                    ? <svg width="18" height="18" viewBox="0 0 24 24" fill="#a8cbe8"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                    : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                  }
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#09090B', letterSpacing: '-0.03em' }}>{profile.plan} Plan</div>
                  <div style={{ fontSize: 12.5, color: '#71717A', marginTop: 1 }}>
                    {isPro
                      ? 'Full access to all sections for every company'
                      : '1 free company unlock per month · limited sections'}
                  </div>
                </div>
              </div>
              {!isPro && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <PaddleCheckoutButton
                    priceId={process.env.NEXT_PUBLIC_PADDLE_PRICE_MONTHLY!}
                    userEmail={user.email!}
                    label="Monthly — $7.99"
                  />
                  <PaddleCheckoutButton
                    priceId={process.env.NEXT_PUBLIC_PADDLE_PRICE_YEARLY!}
                    userEmail={user.email!}
                    label="Yearly — $79.99"
                    style={{ background: '#04294f' }}
                  />
                </div>
              )}
              {isPro && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ padding: '6px 14px', borderRadius: 8, background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#16A34A', fontSize: 12.5, fontWeight: 600 }}>
                    Active ✓
                  </div>
                  {!cancelConfirm && !cancelMsg && (
                    <button
                      onClick={() => setCancelConfirm(true)}
                      style={{ background: 'none', border: 'none', color: '#A1A1AA', fontSize: 12, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                    >Cancel subscription</button>
                  )}
                  {cancelConfirm && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, color: '#52525B' }}>Are you sure?</span>
                      <button onClick={handleCancel} disabled={cancelPending}
                        style={{ fontSize: 12, fontWeight: 600, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                        {cancelPending ? 'Cancelling…' : 'Yes, cancel'}
                      </button>
                      <button onClick={() => setCancelConfirm(false)}
                        style={{ fontSize: 12, color: '#71717A', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                        Never mind
                      </button>
                    </div>
                  )}
                  {cancelMsg && <span style={{ fontSize: 12, color: '#52525B' }}>{cancelMsg}</span>}
                </div>
              )}
            </div>
            {isPro && billing && (billing.nextBillingAt || billing.interval || billing.status) && (
              <div style={{ marginTop: 16, padding: '14px 16px', borderRadius: 10, background: '#F8FBFE', border: '1px solid #e2eaf2', display: 'flex', gap: 32, flexWrap: 'wrap' }}>
                {billing.interval && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Billing cycle</div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: '#09090B' }}>{billing.interval === 'month' ? 'Monthly' : 'Yearly'}</div>
                  </div>
                )}
                {billing.nextBillingAt && billing.status !== 'canceled' && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Next billing date</div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: '#09090B' }}>
                      {new Date(billing.nextBillingAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                  </div>
                )}
                {billing.status === 'canceled' && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Status</div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: '#DC2626' }}>Cancelled — access until end of period</div>
                  </div>
                )}
                {billing.interval && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Amount</div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: '#09090B' }}>{billing.interval === 'month' ? '$7.99 / month' : '$79.99 / year'}</div>
                  </div>
                )}
              </div>
            )}
            {!isPro && (
              <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 10, background: '#FAFAFA', border: '1px solid #F0F0F2' }}>
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                  {['Full org charts', 'Financials & valuation', 'Interview prep by role', 'Internal tools & processes', 'Product use cases'].map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      <span style={{ fontSize: 12, color: '#71717A' }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </SectionCard>

          {/* ── 2. Password & Security ── */}
          <SectionCard title="Password & Security" description="Update your password or request a reset link">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
              <Field label="Current password">
                <TextInput type="password" value={currentPw} onChange={setCurrentPw} placeholder="••••••••" />
              </Field>
              <div />
              <Field label="New password">
                <TextInput type="password" value={newPw} onChange={setNewPw} placeholder="Min. 8 characters" />
              </Field>
              <Field label="Confirm new password">
                <TextInput type="password" value={confirmPw} onChange={setConfirmPw} placeholder="Repeat password" />
              </Field>
            </div>
            {pwError && (
              <div style={{ padding: '9px 13px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: 12.5, marginBottom: 12 }}>
                {pwError}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <SaveBtn onClick={handleChangePassword} pending={pwPending} label="Update password" />
              {pwMsg && <span style={{ fontSize: 12.5, color: '#10B981', fontWeight: 600 }}>✓ {pwMsg}</span>}
              <div style={{ height: 20, width: 1, background: '#E4E4E7' }} />
              {!resetSent ? (
                <button onClick={handleResetPassword} disabled={resetPending} style={{ fontSize: 12.5, color: '#063f76', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}>
                  {resetPending ? 'Sending…' : 'Send password reset email'}
                </button>
              ) : (
                <span style={{ fontSize: 12.5, color: '#10B981', fontWeight: 600 }}>✓ Reset email sent to {user.email}</span>
              )}
            </div>
          </SectionCard>

          {/* ── 4. Danger zone ── */}
          <SectionCard title="Account" description="Manage your account access">
            <div style={{ display: 'flex', gap: 10 }}>
              <Link href="/logout" style={{ padding: '9px 18px', borderRadius: 9, border: '1.5px solid #E4E4E7', background: '#fff', fontSize: 13, fontWeight: 600, color: '#52525B', textDecoration: 'none', transition: 'border-color 0.15s, color 0.15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#D4D4D8'; (e.currentTarget as HTMLElement).style.color = '#09090B' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#E4E4E7'; (e.currentTarget as HTMLElement).style.color = '#52525B' }}
              >
                Sign out
              </Link>
            </div>
          </SectionCard>

        </div>
      </div>
    </div>
  )
}
