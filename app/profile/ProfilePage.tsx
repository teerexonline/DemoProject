'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'
import { updateProfile, unsaveCompany } from '@/app/actions/profile'
import CompanyLogo from '@/components/CompanyLogo'

interface SavedCompany {
  id: string
  name: string
  slug: string
  category: string | null
  logo_color: string | null
  logo_url: string | null
  hq: string | null
  employees: number | null
  valuation: string | null
}

interface Profile {
  name: string
  job_role: string
  job_company: string
  plan: string
}

interface Props {
  user: User
  profile: Profile
  savedCompanies: SavedCompany[]
  unlockedCompanyIds: string[]
  nextResetAt: string
}

function InputField({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
        {label}
      </label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%', padding: '10px 13px',
          background: focused ? '#fff' : '#F7F7F8',
          border: `1.5px solid ${focused ? '#063f76' : '#E4E4E7'}`,
          borderRadius: 9, color: '#09090B', fontSize: 13.5,
          outline: 'none', boxSizing: 'border-box',
          transition: 'border-color 0.15s, background 0.15s',
        }}
      />
    </div>
  )
}

// ── Countdown helper ──────────────────────────────────────────────────────────

function daysUntil(isoDate: string): number {
  return Math.ceil((new Date(isoDate).getTime() - Date.now()) / 86_400_000)
}

function formatResetDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── Free Unlock card ──────────────────────────────────────────────────────────

function UnlockedCard({ company, nextResetAt }: { company: SavedCompany; nextResetAt: string }) {
  const color = company.logo_color ?? '#063f76'
  const days = daysUntil(nextResetAt)
  const resetLabel = formatResetDate(nextResetAt)

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 13,
        border: '1.5px solid #c5ddf5',
        overflow: 'hidden',
        boxShadow: '0 2px 12px rgba(6,63,118,0.08)',
        position: 'relative',
        transition: 'box-shadow 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(6,63,118,0.13)'}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(6,63,118,0.08)'}
    >
      {/* Top accent bar */}
      <div style={{ height: 3, background: 'linear-gradient(90deg, #063f76, #3B82F6)' }} />

      {/* Unlock badge */}
      <div style={{
        position: 'absolute', top: 11, right: 11,
        display: 'flex', alignItems: 'center', gap: 4,
        background: '#eef4fb', border: '1px solid #a8cbe8',
        borderRadius: 6, padding: '3px 7px',
      }}>
        <svg width="9" height="10" viewBox="0 0 12 14" fill="none">
          <rect x="1" y="5" width="10" height="8" rx="2" fill="#063f76" opacity="0.15" stroke="#063f76" strokeWidth="1.2"/>
          <path d="M4 5V3.5a2 2 0 0 1 4 0V5" stroke="#063f76" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
          <circle cx="6" cy="9" r="1.2" fill="#063f76"/>
        </svg>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#063f76', letterSpacing: '0.02em' }}>UNLOCKED</span>
      </div>

      <div style={{ padding: '13px 14px 14px' }}>
        {/* Company info */}
        <Link href={`/company/${company.slug}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 9, marginBottom: 11, marginRight: 70 }}>
          <CompanyLogo name={company.name} logoUrl={company.logo_url} logoColor={company.logo_color} size={32} style={{ boxShadow: `0 2px 8px ${color}30` }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#09090B', letterSpacing: '-0.02em' }}>{company.name}</div>
            <div style={{ fontSize: 11, color: '#A1A1AA' }}>{company.category}</div>
          </div>
        </Link>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 11 }}>
          {company.employees && <span style={{ fontSize: 10.5, color: '#A1A1AA' }}>{company.employees >= 1000 ? `${(company.employees / 1000).toFixed(0)}k` : company.employees} emp.</span>}
          {company.valuation && <span style={{ fontSize: 10.5, color: '#A1A1AA' }}>· {company.valuation}</span>}
          {company.hq && <span style={{ fontSize: 10.5, color: '#A1A1AA' }}>· {company.hq.split(',')[0]}</span>}
        </div>

        {/* Reset countdown */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#eef4fb', borderRadius: 8, padding: '8px 10px',
          border: '1px solid #d0e8f7',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#063f76" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            <span style={{ fontSize: 11, color: '#063f76', fontWeight: 600 }}>
              Resets {days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`}
            </span>
          </div>
          <span style={{ fontSize: 10.5, color: '#5B8AB5', fontWeight: 500 }}>{resetLabel}</span>
        </div>

        <Link href={`/company/${company.slug}`} style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 10, fontSize: 11.5, fontWeight: 600, color, textDecoration: 'none' }}>
          View profile
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </Link>
      </div>
    </div>
  )
}

// ── Regular saved card ────────────────────────────────────────────────────────

function SavedCard({ company, onUnsave }: { company: SavedCompany; onUnsave: (id: string) => void }) {
  const color = company.logo_color ?? '#063f76'
  return (
    <div
      style={{ background: '#fff', borderRadius: 12, border: '1.5px solid #E4E4E7', overflow: 'hidden', boxShadow: '0 1px 5px rgba(0,0,0,0.04)', transition: 'box-shadow 0.15s' }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 16px ${color}18`}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 5px rgba(0,0,0,0.04)'}
    >
      <div style={{ height: 4, background: color }} />
      <div style={{ padding: '14px 14px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
          <Link href={`/company/${company.slug}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 9 }}>
            <CompanyLogo name={company.name} logoUrl={company.logo_url} logoColor={company.logo_color} size={32} style={{ boxShadow: `0 2px 8px ${color}30` }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#09090B', letterSpacing: '-0.02em' }}>{company.name}</div>
              <div style={{ fontSize: 11, color: '#A1A1AA' }}>{company.category}</div>
            </div>
          </Link>
          <button
            onClick={() => onUnsave(company.id)}
            title="Remove from saved"
            style={{ width: 26, height: 26, borderRadius: 7, border: '1px solid #E4E4E7', background: '#F7F7F8', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.12s, border-color 0.12s', flexShrink: 0 }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#FEF2F2'; (e.currentTarget as HTMLElement).style.borderColor = '#FECACA' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#F7F7F8'; (e.currentTarget as HTMLElement).style.borderColor = '#E4E4E7' }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {company.employees && <span style={{ fontSize: 10.5, color: '#A1A1AA' }}>{company.employees >= 1000 ? `${(company.employees / 1000).toFixed(0)}k` : company.employees} emp.</span>}
          {company.valuation && <span style={{ fontSize: 10.5, color: '#A1A1AA' }}>· {company.valuation}</span>}
          {company.hq && <span style={{ fontSize: 10.5, color: '#A1A1AA' }}>· {company.hq.split(',')[0]}</span>}
        </div>
        <Link href={`/company/${company.slug}`} style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 10, fontSize: 11.5, fontWeight: 600, color, textDecoration: 'none' }}>
          View profile
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </Link>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ProfilePage({ user, profile, savedCompanies: initialSaved, unlockedCompanyIds, nextResetAt }: Props) {
  const [name, setName] = useState(profile.name)
  const [jobRole, setJobRole] = useState(profile.job_role)
  const [jobCompany, setJobCompany] = useState(profile.job_company)
  const [saved, setSaved] = useState(initialSaved)
  const [editMode, setEditMode] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [isPending, startTransition] = useTransition()

  const displayName = name || user.email?.split('@')[0] || 'User'
  const initials = displayName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)

  const unlockedSet = new Set(unlockedCompanyIds)
  const isFree = profile.plan === 'Free'

  // Split: unlocked (free token, can't remove) vs regular saves
  const unlockedSaved = isFree ? saved.filter(c => unlockedSet.has(c.id)) : []
  const regularSaved  = saved.filter(c => !unlockedSet.has(c.id))

  function handleSaveProfile() {
    startTransition(async () => {
      await updateProfile({ name, job_role: jobRole, job_company: jobCompany })
      setEditMode(false)
      setSaveMsg('Profile saved')
      setTimeout(() => setSaveMsg(''), 2500)
    })
  }

  function handleUnsave(companyId: string) {
    setSaved(prev => prev.filter(c => c.id !== companyId))
    startTransition(async () => {
      await unsaveCompany(companyId)
    })
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F5F5F7' }}>
      <div className="pp-container" style={{ maxWidth: 1100, margin: '0 auto', padding: '36px 24px' }}>

        {/* Page header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#09090B', letterSpacing: '-0.04em', marginBottom: 4 }}>My Profile</div>
          <div style={{ fontSize: 13, color: '#A1A1AA' }}>Manage your personal info and saved companies</div>
        </div>

        <div className="pp-grid" style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 24, alignItems: 'start' }}>

          {/* ── Left: Profile card ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E4E4E7', overflow: 'hidden', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
              {/* Avatar header */}
              <div style={{ background: 'linear-gradient(135deg, #063f7615, #3B82F610)', padding: '28px 24px 20px', borderBottom: '1px solid #F0F0F2', textAlign: 'center' }}>
                <div style={{
                  width: 72, height: 72, borderRadius: 20, background: '#063f76',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 12px',
                  boxShadow: '0 4px 20px rgba(6,63,118,0.35)',
                  fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em',
                }}>
                  {initials}
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#09090B', letterSpacing: '-0.03em' }}>{displayName}</div>
                {jobRole && <div style={{ fontSize: 12, color: '#71717A', marginTop: 2 }}>{jobRole}{jobCompany ? ` · ${jobCompany}` : ''}</div>}
                <div style={{ fontSize: 11.5, color: '#A1A1AA', marginTop: 4 }}>{user.email}</div>
                <div style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 6, background: profile.plan === 'Pro' ? '#063f76' : '#F4F4F5', border: `1px solid ${profile.plan === 'Pro' ? '#04294f' : '#E4E4E7'}` }}>
                  {profile.plan === 'Pro' && <svg width="9" height="9" viewBox="0 0 24 24" fill="#a8cbe8"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>}
                  <span style={{ fontSize: 11, fontWeight: 700, color: profile.plan === 'Pro' ? '#a8cbe8' : '#52525B' }}>{profile.plan} Plan</span>
                </div>
              </div>

              {/* Edit form */}
              <div style={{ padding: '20px 20px' }}>
                {!editMode ? (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                      {[
                        { label: 'Full name', value: name || '—' },
                        { label: 'Current role', value: jobRole || '—' },
                        { label: 'Company', value: jobCompany || '—' },
                      ].map(f => (
                        <div key={f.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 8, background: '#F7F7F8' }}>
                          <span style={{ fontSize: 11, color: '#A1A1AA', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{f.label}</span>
                          <span style={{ fontSize: 13, color: f.value === '—' ? '#D4D4D8' : '#09090B', fontWeight: f.value === '—' ? 400 : 600 }}>{f.value}</span>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => setEditMode(true)}
                      style={{ width: '100%', padding: '9px', borderRadius: 9, border: '1.5px solid #E4E4E7', background: '#fff', fontSize: 13, fontWeight: 600, color: '#52525B', cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#063f76'; (e.currentTarget as HTMLElement).style.color = '#063f76' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#E4E4E7'; (e.currentTarget as HTMLElement).style.color = '#52525B' }}
                    >
                      Edit profile
                    </button>
                    {saveMsg && <div style={{ textAlign: 'center', color: '#10B981', fontSize: 12, marginTop: 8, fontWeight: 600 }}>✓ {saveMsg}</div>}
                  </>
                ) : (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 }}>
                      <InputField label="Full name" value={name} onChange={setName} placeholder="Your name" />
                      <InputField label="Current role" value={jobRole} onChange={setJobRole} placeholder="e.g. Software Engineer" />
                      <InputField label="Company" value={jobCompany} onChange={setJobCompany} placeholder="e.g. Stripe" />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={handleSaveProfile}
                        disabled={isPending}
                        style={{ flex: 1, padding: '9px', borderRadius: 9, border: 'none', background: isPending ? '#609dd6' : '#063f76', color: '#fff', fontSize: 13, fontWeight: 600, cursor: isPending ? 'default' : 'pointer', transition: 'background 0.15s' }}
                        onMouseEnter={e => { if (!isPending) (e.currentTarget as HTMLElement).style.background = '#04294f' }}
                        onMouseLeave={e => { if (!isPending) (e.currentTarget as HTMLElement).style.background = '#063f76' }}
                      >
                        {isPending ? 'Saving…' : 'Save changes'}
                      </button>
                      <button
                        onClick={() => { setEditMode(false); setName(profile.name); setJobRole(profile.job_role); setJobCompany(profile.job_company) }}
                        style={{ padding: '9px 14px', borderRadius: 9, border: '1.5px solid #E4E4E7', background: '#fff', fontSize: 13, fontWeight: 500, color: '#71717A', cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Quick links */}
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E4E4E7', overflow: 'hidden', boxShadow: '0 1px 5px rgba(0,0,0,0.04)' }}>
              {[
                { label: 'Account Settings', href: '/settings', icon: (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
                  )},
                { label: 'Pricing & Plans',  href: '/pricing',  icon: (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
                  )},
                { label: 'Browse Companies', href: '/',         icon: (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                  )},
              ].map(l => (
                <Link key={l.label} href={l.href} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', textDecoration: 'none', borderBottom: l.label !== 'Browse Companies' ? '1px solid #F4F4F5' : 'none', transition: 'background 0.12s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F7F7F8'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  <span style={{ width: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#71717A' }}>{l.icon}</span>
                  <span style={{ fontSize: 13, color: '#3F3F46', fontWeight: 500 }}>{l.label}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#D4D4D8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 'auto' }}><path d="M9 18l6-6-6-6"/></svg>
                </Link>
              ))}
            </div>
          </div>

          {/* ── Right: Saved sections ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

            {/* ── Free Unlock section (only for free plan users with an active unlock) ── */}
            {isFree && unlockedSaved.length > 0 && (
              <div>
                {/* Section header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: '#eef4fb', border: '1px solid #a8cbe8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="13" height="13" viewBox="0 0 12 14" fill="none">
                        <rect x="1" y="5" width="10" height="8" rx="2" fill="#063f76" opacity="0.15" stroke="#063f76" strokeWidth="1.2"/>
                        <path d="M4 5V3.5a2 2 0 0 1 4 0V5" stroke="#063f76" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
                        <circle cx="6" cy="9" r="1.2" fill="#063f76"/>
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#09090B', letterSpacing: '-0.03em' }}>Free Unlock</div>
                      <div style={{ fontSize: 11, color: '#A1A1AA', marginTop: 1 }}>
                        Auto-saved · resets {formatResetDate(nextResetAt)}
                      </div>
                    </div>
                  </div>
                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, background: '#eef4fb', border: '1px solid #c5ddf5' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#063f76" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#063f76' }}>
                      {daysUntil(nextResetAt)}d left
                    </span>
                  </div>
                </div>

                {/* Info notice */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '10px 13px', borderRadius: 10, background: '#eef4fb', border: '1px solid #c5ddf5', marginBottom: 12 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#5B8AB5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <p style={{ margin: 0, fontSize: 11.5, color: '#3a6e9e', lineHeight: 1.55 }}>
                    This company was unlocked with your free monthly token and saved automatically. It will move to your Saved Companies when your token resets on <strong>{formatResetDate(nextResetAt)}</strong>.
                  </p>
                </div>

                <div className="pp-saved-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                  {unlockedSaved.map(c => (
                    <UnlockedCard key={c.id} company={c} nextResetAt={nextResetAt} />
                  ))}
                </div>
              </div>
            )}

            {/* ── Saved Companies section ── */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#09090B', letterSpacing: '-0.03em' }}>Saved Companies</div>
                  <div style={{ fontSize: 12, color: '#A1A1AA', marginTop: 1 }}>
                    {regularSaved.length} {regularSaved.length === 1 ? 'company' : 'companies'} · sorted A–Z
                  </div>
                </div>
                <Link href="/" style={{ fontSize: 12, fontWeight: 600, color: '#063f76', textDecoration: 'none', opacity: 0.8 }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '0.8'}
                >
                  Browse more →
                </Link>
              </div>

              {regularSaved.length === 0 ? (
                <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E4E4E7', padding: '48px 24px', textAlign: 'center' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: '#F4F4F5', border: '1px solid #E4E4E7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#09090B', marginBottom: 6 }}>No saved companies yet</div>
                  <p style={{ fontSize: 13, color: '#A1A1AA', lineHeight: 1.6, margin: '0 0 20px' }}>
                    Click the bookmark icon on any company profile to save it here.
                  </p>
                  <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 9, background: '#063f76', color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
                    Browse companies
                  </Link>
                </div>
              ) : (
                <div className="pp-saved-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                  {regularSaved.map(c => (
                    <SavedCard key={c.id} company={c} onUnsave={handleUnsave} />
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .pp-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 640px) {
          .pp-container { padding: 20px 16px !important; }
          .pp-saved-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 400px) {
          .pp-container { padding: 16px 12px !important; }
        }
      `}</style>
    </div>
  )
}
