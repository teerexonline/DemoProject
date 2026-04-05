'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import CompanyLogo from '@/components/CompanyLogo'
import {
  adminUpsertCompany, adminDeleteCompany,
  adminUpdateUserPlan, adminUpdateUserProfile,
  adminGetCompanyContent,
  adminUpsertNews, adminDeleteNews,
  adminUpsertMilestone, adminDeleteMilestone,
  adminUpsertProduct, adminDeleteProduct,
  adminUpsertFinancials,
  adminUpsertStandard, adminDeleteStandard,
  adminUpsertDepartment, adminDeleteDepartment,
  adminUpsertRole, adminDeleteRole,
  adminUpsertExecGroup, adminDeleteExecGroup,
  adminSeedCompanyContent,
} from '@/app/actions/admin'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Company { id: string; name: string; slug: string; category: string; description: string | null; logo_color: string; logo_url: string | null; employees: number | null; founded: number | null; hq: string | null; valuation: string | null; revenue: string | null; website: string | null; is_hiring: boolean; trending_rank: number | null; tags: string[]; created_at: string }
interface Profile {
  id: string
  email: string | null
  name: string | null
  job_role: string | null
  job_company: string | null
  plan: string
  created_at: string
  updated_at: string | null
  last_sign_in_at: string | null
  email_confirmed_at: string | null
}
interface Props {
  currentUser: { id: string; email: string; name: string; plan: string }
  initialCompanies: Company[]
  initialProfiles: Profile[]
  analytics: { views: { company_id: string; companies: { name: string } | { name: string }[] | null }[]; saves: { company_id: string; companies: { name: string } | { name: string }[] | null; created_at: string | null }[] }
}

type NavSection = 'companies' | 'content' | 'users' | 'analytics'
type ContentTab = 'news' | 'milestones' | 'products' | 'financials' | 'standards' | 'departments' | 'roles' | 'exec_groups'

const PLANS = ['Free', 'Pro', 'Admin', 'SuperAdmin']
const NEWS_TYPES = ['NEWS', 'PRESS RELEASE', 'FUNDING', 'ACQUISITION', 'EARNINGS', 'PRODUCT', 'PARTNERSHIP']
const MILESTONE_TYPES = ['founding', 'funding', 'acquisition', 'product', 'milestone', 'leadership']
const STANDARD_STATUSES = ['Certified', 'Compliant', 'In Progress', 'Planned']
const LEVELS = ['L3', 'L4', 'L5', 'L6', 'L7 / Staff', 'Manager', 'Director', 'VP']

// ─── Tiny helpers ─────────────────────────────────────────────────────────────

function Badge({ label, color }: { label: string; color: string }) {
  return <span style={{ padding: '2px 8px', borderRadius: 5, background: `${color}15`, color, fontSize: 11, fontWeight: 700, border: `1px solid ${color}30` }}>{label}</span>
}

function Pill({ label }: { label: string }) {
  return <span style={{ padding: '2px 8px', borderRadius: 5, background: '#F4F4F5', color: '#52525B', fontSize: 11, border: '1px solid #E4E4E7' }}>{label}</span>
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 800, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '14px 16px 6px' }}>{children}</div>
}

function NavItem({ label, active, onClick, count }: { label: string; active: boolean; onClick: () => void; count?: number }) {
  return (
    <button onClick={onClick} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', borderRadius: 8, border: 'none', background: active ? '#F5F3FF' : 'transparent', color: active ? '#7C3AED' : '#52525B', fontSize: 13, fontWeight: active ? 700 : 400, cursor: 'pointer', textAlign: 'left', transition: 'background 0.12s' }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = '#F7F7F8' }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
      {label}
      {count !== undefined && <span style={{ fontSize: 10.5, color: active ? '#7C3AED' : '#A1A1AA', background: active ? '#EDE9FE' : '#F4F4F5', padding: '1px 6px', borderRadius: 4 }}>{count}</span>}
    </button>
  )
}

// ─── JSON textarea helper ─────────────────────────────────────────────────────

function JsonField({ label, value, onChange }: { label: string; value: unknown; onChange: (v: unknown) => void }) {
  const [raw, setRaw] = useState(JSON.stringify(value ?? [], null, 2))
  const [err, setErr] = useState(false)
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{label}</label>
      <textarea value={raw} rows={4}
        onChange={e => {
          setRaw(e.target.value)
          try { onChange(JSON.parse(e.target.value)); setErr(false) } catch { setErr(true) }
        }}
        style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: `1.5px solid ${err ? '#EF4444' : '#E4E4E7'}`, background: '#F7F7F8', fontSize: 11.5, fontFamily: 'monospace', resize: 'vertical', outline: 'none', boxSizing: 'border-box', color: '#09090B' }}
      />
      {err && <div style={{ fontSize: 11, color: '#EF4444', marginTop: 3 }}>Invalid JSON</div>}
    </div>
  )
}

// ─── Field components ─────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  )
}

function Input({ value, onChange, placeholder, type = 'text' }: { value: string | number; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #E4E4E7', background: '#F7F7F8', fontSize: 13, outline: 'none', boxSizing: 'border-box', color: '#09090B', transition: 'border-color 0.15s' }}
      onFocus={e => (e.currentTarget as HTMLInputElement).style.borderColor = '#7C3AED'}
      onBlur={e => (e.currentTarget as HTMLInputElement).style.borderColor = '#E4E4E7'}
    />
  )
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #E4E4E7', background: '#F7F7F8', fontSize: 13, outline: 'none', color: '#09090B', cursor: 'pointer' }}>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

function Textarea({ value, onChange, placeholder, rows = 3 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
      style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #E4E4E7', background: '#F7F7F8', fontSize: 13, outline: 'none', boxSizing: 'border-box', resize: 'vertical', color: '#09090B', fontFamily: 'inherit', transition: 'border-color 0.15s' }}
      onFocus={e => (e.currentTarget as HTMLTextAreaElement).style.borderColor = '#7C3AED'}
      onBlur={e => (e.currentTarget as HTMLTextAreaElement).style.borderColor = '#E4E4E7'}
    />
  )
}

// ─── Slide-over panel ─────────────────────────────────────────────────────────

function SlideOver({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 40, backdropFilter: 'blur(2px)' }} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 480, background: '#fff', zIndex: 50, boxShadow: '-8px 0 40px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #F4F4F5', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#09090B', letterSpacing: '-0.03em' }}>{title}</div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid #E4E4E7', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#71717A', fontSize: 16 }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px' }}>{children}</div>
      </div>
    </>
  )
}

// ─── Data table ───────────────────────────────────────────────────────────────

function DataTable({ cols, rows, onEdit, onDelete }: { cols: string[]; rows: (string | React.ReactNode)[][]; onEdit?: (i: number) => void; onDelete?: (i: number) => void }) {
  return (
    <div style={{ borderRadius: 12, border: '1px solid #E4E4E7', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
        <thead>
          <tr style={{ background: '#F7F7F8', borderBottom: '1px solid #E4E4E7' }}>
            {cols.map(c => <th key={c} style={{ padding: '9px 14px', textAlign: 'left', fontWeight: 700, color: '#71717A', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>{c}</th>)}
            {(onEdit || onDelete) && <th style={{ width: 80, padding: '9px 14px' }} />}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={cols.length + 1} style={{ padding: '28px 14px', textAlign: 'center', color: '#A1A1AA', fontSize: 13 }}>No records</td></tr>
          ) : rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: i < rows.length - 1 ? '1px solid #F4F4F5' : 'none', transition: 'background 0.1s' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#FAFAFA'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
              {row.map((cell, j) => (
                <td key={j} style={{ padding: '9px 14px', color: '#09090B', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cell}</td>
              ))}
              {(onEdit || onDelete) && (
                <td style={{ padding: '6px 14px', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {onEdit && <button onClick={() => onEdit(i)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #E4E4E7', background: '#fff', fontSize: 11.5, fontWeight: 600, color: '#52525B', cursor: 'pointer' }}>Edit</button>}
                    {onDelete && <button onClick={() => onDelete(i)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #FECACA', background: '#FEF2F2', fontSize: 11.5, fontWeight: 600, color: '#DC2626', cursor: 'pointer' }}>Del</button>}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SaveBtn({ onClick, pending, label = 'Save' }: { onClick: () => void; pending: boolean; label?: string }) {
  return (
    <button onClick={onClick} disabled={pending} style={{ width: '100%', padding: '10px', borderRadius: 9, border: 'none', background: pending ? '#A78BFA' : '#7C3AED', color: '#fff', fontSize: 13, fontWeight: 600, cursor: pending ? 'default' : 'pointer', marginTop: 8 }}>
      {pending ? 'Saving…' : label}
    </button>
  )
}

function DeleteBtn({ onClick, pending }: { onClick: () => void; pending: boolean }) {
  return (
    <button onClick={onClick} disabled={pending} style={{ width: '100%', padding: '10px', borderRadius: 9, border: '1px solid #FECACA', background: '#FEF2F2', color: '#DC2626', fontSize: 13, fontWeight: 600, cursor: pending ? 'default' : 'pointer', marginTop: 6 }}>
      {pending ? 'Deleting…' : 'Delete'}
    </button>
  )
}

function SeedIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22V12"/><path d="M5 3a7 7 0 0 0 7 7 7 7 0 0 0 7-7"/>
      <path d="M5 3c0 4.97 3.13 9.16 7 10.93"/>
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
      style={{ animation: 'spin 0.75s linear infinite' }}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </svg>
  )
}

// ─── Logo upload field ────────────────────────────────────────────────────────

function LogoField({
  logoUrl, slug, onLogoUrl,
}: {
  logoUrl: string | null | undefined
  slug: string | undefined
  onLogoUrl: (url: string) => void
}) {
  const inputRef   = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState('')

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) { setUploadErr('File must be an image'); return }
    if (file.size > 524_288) { setUploadErr('Image must be under 512 KB'); return }
    if (!slug) { setUploadErr('Enter a slug before uploading'); return }

    setUploading(true); setUploadErr('')
    try {
      const supabase = createClient()
      const ext      = file.name.split('.').pop() ?? 'png'
      const filePath = `${slug}.${ext}`
      const { error } = await supabase.storage
        .from('logos')
        .upload(filePath, file, { upsert: true, cacheControl: '3600' })
      if (error) { setUploadErr(error.message); return }
      const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(filePath)
      onLogoUrl(publicUrl)
    } catch (e) {
      setUploadErr(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
        Logo
      </label>

      {/* Preview + drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
        style={{
          width: '100%', height: 88, borderRadius: 10,
          border: '1.5px dashed #D4D4D8', background: '#F7F7F8',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', gap: 12, position: 'relative', overflow: 'hidden',
          transition: 'border-color 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = '#7C3AED'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = '#D4D4D8'}
      >
        {logoUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt="Logo" style={{ maxHeight: 56, maxWidth: 120, objectFit: 'contain', borderRadius: 6 }} />
            <div style={{ fontSize: 11, color: '#71717A' }}>Click or drag to replace</div>
          </>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>🖼</div>
            <div style={{ fontSize: 12, color: '#71717A' }}>{uploading ? 'Uploading…' : 'Click or drag an image'}</div>
            <div style={{ fontSize: 10.5, color: '#A1A1AA', marginTop: 2 }}>PNG · JPG · SVG · WebP · max 512 KB</div>
          </div>
        )}
        {uploading && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#7C3AED', fontWeight: 600 }}>
            Uploading…
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />

      {/* URL field — shows stored URL, allows manual paste */}
      <input
        value={logoUrl ?? ''}
        onChange={e => onLogoUrl(e.target.value)}
        placeholder="Logo URL (auto-filled by Seed or upload)"
        style={{ marginTop: 6, width: '100%', padding: '7px 10px', borderRadius: 8, border: '1.5px solid #E4E4E7', background: '#F7F7F8', fontSize: 11.5, outline: 'none', boxSizing: 'border-box', color: '#09090B' }}
        onFocus={e => (e.currentTarget as HTMLInputElement).style.borderColor = '#7C3AED'}
        onBlur={e => (e.currentTarget as HTMLInputElement).style.borderColor = '#E4E4E7'}
      />

      {uploadErr && <div style={{ fontSize: 11, color: '#DC2626', marginTop: 3 }}>{uploadErr}</div>}
    </div>
  )
}

// ─── Section components ───────────────────────────────────────────────────────

// Companies
function CompaniesSection({ companies, onRefresh }: { companies: Company[]; onRefresh: (c: Company[]) => void }) {
  const [editing, setEditing] = useState<Company | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [pending, startTx] = useTransition()
  const [search, setSearch] = useState('')
  const [form, setForm] = useState<Partial<Company>>({})
  const [err, setErr] = useState('')
  const [seeding, setSeeding] = useState(false)
  const [seedMsg, setSeedMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const filtered = companies.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.category?.toLowerCase().includes(search.toLowerCase()))

  function openEdit(c: Company) { setForm(c); setEditing(c); setIsNew(false); setErr(''); setSeedMsg(null) }
  function openNew() { setForm({ logo_color: '#7C3AED', logo_url: null, is_hiring: true, tags: [] }); setEditing({} as Company); setIsNew(true); setErr(''); setSeedMsg(null) }
  function close() { setEditing(null); setForm({}); setSeedMsg(null) }

  async function handleSeed() {
    setSeedMsg(null)
    const name    = (form.name    ?? '').trim()
    const website = (form.website ?? '').trim()
    const missing: string[] = []
    if (!name)    missing.push('Company Name')
    if (!website) missing.push('Website')
    if (missing.length) {
      setSeedMsg({ type: 'err', text: `Please fill in: ${missing.join(' and ')} before seeding.` })
      return
    }
    setSeeding(true)
    try {
      const res = await fetch('/api/seed-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, website }),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        setSeedMsg({ type: 'err', text: json.error ?? 'Seed failed. Check server logs.' })
        return
      }
      const d = json.data
      // Merge scraped data into form — only overwrite empty fields
      setForm(prev => ({
        ...prev,
        slug:        prev.slug        || d.slug        || prev.slug,
        category:    prev.category    || d.category    || prev.category,
        description: prev.description || d.description || prev.description,
        employees:   prev.employees   ?? (d.employees  ?? prev.employees),
        founded:     prev.founded     ?? (d.founded     ?? prev.founded),
        hq:          prev.hq          || d.hq          || prev.hq,
        valuation:   prev.valuation   || d.valuation   || prev.valuation,
        revenue:     prev.revenue     || d.revenue     || prev.revenue,
        is_hiring:   d.is_hiring      ?? prev.is_hiring,
        tags:        (prev.tags && prev.tags.length > 0) ? prev.tags : (d.tags ?? prev.tags ?? []),
        logo_url:    prev.logo_url    || d.logo_url    || prev.logo_url,
      }))
      const filledCount = [
        d.slug, d.category, d.description, d.employees, d.founded,
        d.hq, d.valuation, d.revenue,
      ].filter(Boolean).length
      setSeedMsg({ type: 'ok', text: `Seeded ${filledCount} fields from ${Object.keys(d._sources ?? {}).length > 0 ? Object.keys(d._sources ?? {}).length + ' sources' : 'web'}.` })
    } catch (e) {
      setSeedMsg({ type: 'err', text: `Network error: ${e instanceof Error ? e.message : String(e)}` })
    } finally {
      setSeeding(false)
    }
  }

  function save() {
    if (!form.name || !form.slug || !form.category) { setErr('Name, slug and category are required'); return }
    startTx(async () => {
      const res = await adminUpsertCompany({
        ...(isNew ? {} : { id: form.id }),
        name: form.name!, slug: form.slug!, category: form.category!,
        description: form.description ?? undefined, logo_color: form.logo_color ?? '#7C3AED',
        logo_url: form.logo_url ?? undefined,
        employees: form.employees ? Number(form.employees) : null,
        founded: form.founded ? Number(form.founded) : null,
        hq: form.hq ?? undefined, valuation: form.valuation ?? undefined, revenue: form.revenue ?? undefined,
        website: form.website ?? undefined, is_hiring: form.is_hiring ?? true,
        trending_rank: form.trending_rank ? Number(form.trending_rank) : null,
        tags: form.tags ?? [],
      })
      if (res.error) { setErr(res.error); return }
      if (isNew) onRefresh([...companies, res.data as Company].sort((a, b) => a.name.localeCompare(b.name)))
      else onRefresh(companies.map(c => c.id === res.data!.id ? res.data as Company : c))
      close()
    })
  }

  function del() {
    if (!form.id) return
    startTx(async () => {
      const res = await adminDeleteCompany(form.id!)
      if (res.error) { setErr(res.error); return }
      onRefresh(companies.filter(c => c.id !== form.id))
      close()
    })
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search companies…"
          style={{ flex: 1, padding: '8px 12px', borderRadius: 9, border: '1.5px solid #E4E4E7', background: '#F7F7F8', fontSize: 13, outline: 'none' }} />
        <button onClick={openNew} style={{ padding: '8px 16px', borderRadius: 9, border: 'none', background: '#7C3AED', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>+ Add Company</button>
      </div>
      <DataTable
        cols={['Company', 'Category', 'HQ', 'Employees', 'Valuation', 'Hiring']}
        rows={filtered.map(c => [
          <span key="n" style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <CompanyLogo name={c.name} logoUrl={c.logo_url} logoColor={c.logo_color} size={28} />
            <span style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <span style={{ fontWeight: 700, color: '#09090B', fontSize: 13 }}>{c.name}</span>
              {!c.logo_url && (
                <span style={{ fontSize: 10, color: '#F59E0B', fontWeight: 600 }}>No logo</span>
              )}
            </span>
          </span>,
          c.category,
          c.hq ?? '—',
          c.employees?.toLocaleString() ?? '—',
          c.valuation ?? '—',
          c.is_hiring ? <Badge key="h" label="Yes" color="#10B981" /> : <span style={{ color: '#A1A1AA' }}>No</span>,
        ])}
        onEdit={i => openEdit(filtered[i])}
        onDelete={i => { setForm(filtered[i]); setEditing(filtered[i]); startTx(async () => { await adminDeleteCompany(filtered[i].id); onRefresh(companies.filter(c => c.id !== filtered[i].id)) }) }}
      />

      {editing !== null && (
        <SlideOver title={isNew ? 'Add Company' : `Edit: ${editing.name}`} onClose={close}>
          {/* Logo upload spans full width */}
          <LogoField
            logoUrl={form.logo_url}
            slug={form.slug}
            onLogoUrl={url => setForm(p => ({ ...p, logo_url: url }))}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            <Field label="Name"><Input value={form.name ?? ''} onChange={v => setForm(p => ({ ...p, name: v }))} /></Field>
            <Field label="Slug"><Input value={form.slug ?? ''} onChange={v => setForm(p => ({ ...p, slug: v }))} /></Field>
            <Field label="Category"><Input value={form.category ?? ''} onChange={v => setForm(p => ({ ...p, category: v }))} /></Field>
            <Field label="Logo Color"><Input value={form.logo_color ?? ''} onChange={v => setForm(p => ({ ...p, logo_color: v }))} /></Field>
            <Field label="HQ"><Input value={form.hq ?? ''} onChange={v => setForm(p => ({ ...p, hq: v }))} /></Field>
            <Field label="Website"><Input value={form.website ?? ''} onChange={v => setForm(p => ({ ...p, website: v }))} /></Field>
            <Field label="Employees"><Input type="number" value={form.employees ?? ''} onChange={v => setForm(p => ({ ...p, employees: v ? Number(v) : null }))} /></Field>
            <Field label="Founded"><Input type="number" value={form.founded ?? ''} onChange={v => setForm(p => ({ ...p, founded: v ? Number(v) : null }))} /></Field>
            <Field label="Valuation"><Input value={form.valuation ?? ''} onChange={v => setForm(p => ({ ...p, valuation: v }))} /></Field>
            <Field label="Revenue"><Input value={form.revenue ?? ''} onChange={v => setForm(p => ({ ...p, revenue: v }))} /></Field>
            <Field label="Trending Rank"><Input type="number" value={form.trending_rank ?? ''} onChange={v => setForm(p => ({ ...p, trending_rank: v ? Number(v) : null }))} /></Field>
            <Field label="Is Hiring">
              <select value={form.is_hiring ? 'Yes' : 'No'} onChange={e => setForm(p => ({ ...p, is_hiring: e.target.value === 'Yes' }))}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #E4E4E7', background: '#F7F7F8', fontSize: 13, outline: 'none', color: '#09090B' }}>
                <option>Yes</option><option>No</option>
              </select>
            </Field>
          </div>
          <Field label="Description"><Textarea value={form.description ?? ''} onChange={v => setForm(p => ({ ...p, description: v }))} rows={3} /></Field>
          {err && <div style={{ padding: '8px 12px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: 12.5, marginBottom: 8 }}>{err}</div>}
          <SaveBtn onClick={save} pending={pending} />

          {/* ── Seed button ──────────────────────────────────────── */}
          <button
            onClick={handleSeed}
            disabled={seeding || pending}
            style={{
              width: '100%', marginTop: 8, padding: '10px', borderRadius: 9,
              border: '1.5px solid #D97706',
              background: seeding ? '#FEF3C7' : '#FFFBEB',
              color: seeding ? '#92400E' : '#B45309',
              fontSize: 13, fontWeight: 600,
              cursor: (seeding || pending) ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { if (!seeding && !pending) (e.currentTarget as HTMLElement).style.background = '#FEF3C7' }}
            onMouseLeave={e => { if (!seeding && !pending) (e.currentTarget as HTMLElement).style.background = '#FFFBEB' }}
          >
            {seeding
              ? (<><SpinnerIcon />Scraping web sources…</>)
              : (<><SeedIcon />Seed from Web</>)
            }
          </button>

          {seedMsg && (
            <div style={{
              marginTop: 8, padding: '8px 12px', borderRadius: 8, fontSize: 12.5,
              background: seedMsg.type === 'ok' ? '#F0FDF4' : '#FEF2F2',
              border:     `1px solid ${seedMsg.type === 'ok' ? '#BBF7D0' : '#FECACA'}`,
              color:      seedMsg.type === 'ok' ? '#15803D' : '#DC2626',
            }}>
              {seedMsg.type === 'ok' ? '✓ ' : '⚠ '}{seedMsg.text}
            </div>
          )}

          {!isNew && <DeleteBtn onClick={del} pending={pending} />}
        </SlideOver>
      )}
    </div>
  )
}

// Users
function UsersSection({ profiles, onPlanUpdate }: { profiles: Profile[]; onPlanUpdate: (id: string, fields: Partial<Profile>) => void }) {
  const [editing, setEditing] = useState<Profile | null>(null)
  const [form, setForm] = useState({ name: '', job_role: '', job_company: '', plan: 'Free' })
  const [pending, startTx] = useTransition()
  const [msg, setMsg] = useState('')

  function openEdit(p: Profile) {
    setEditing(p)
    setForm({ name: p.name ?? '', job_role: p.job_role ?? '', job_company: p.job_company ?? '', plan: p.plan })
    setMsg('')
  }

  function save() {
    if (!editing) return
    startTx(async () => {
      const res = await adminUpdateUserProfile(editing.id, {
        name: form.name || undefined,
        job_role: form.job_role || undefined,
        job_company: form.job_company || undefined,
        plan: form.plan,
      })
      if (res.error) { setMsg(res.error); return }
      onPlanUpdate(editing.id, { name: form.name || null, job_role: form.job_role || null, job_company: form.job_company || null, plan: form.plan })
      setMsg('✓ Saved')
      setTimeout(() => { setMsg(''); setEditing(null) }, 1200)
    })
  }

  const planColor = (p: string) => p === 'SuperAdmin' ? '#EF4444' : p === 'Admin' ? '#F59E0B' : p === 'Pro' ? '#7C3AED' : '#A1A1AA'
  const fmt = (d: string | null) => d ? new Date(d).toLocaleDateString() : '—'
  const fmtFull = (d: string | null) => d ? new Date(d).toLocaleString() : '—'

  return (
    <div>
      <DataTable
        cols={['Email', 'Name', 'Position', 'Company', 'Plan', 'Joined', 'Last Sign In', 'Verified']}
        rows={profiles.map(p => [
          <span key="email" style={{ fontSize: 12, color: '#52525B' }}>{p.email ?? '—'}</span>,
          p.name ?? '—',
          p.job_role ?? '—',
          p.job_company ?? '—',
          <Badge key="plan" label={p.plan} color={planColor(p.plan)} />,
          fmt(p.created_at),
          fmt(p.last_sign_in_at),
          p.email_confirmed_at
            ? <Badge key="v" label="Verified" color="#10B981" />
            : <Badge key="v" label="Unverified" color="#A1A1AA" />,
        ])}
        onEdit={i => openEdit(profiles[i])}
      />

      {editing && (
        <SlideOver title="Edit User" onClose={() => setEditing(null)}>
          {/* Read-only info */}
          <div style={{ marginBottom: 16, padding: 14, borderRadius: 10, background: '#F7F7F8', border: '1px solid #E4E4E7', fontSize: 12 }}>
            <div style={{ fontWeight: 700, color: '#09090B', marginBottom: 4, fontSize: 13 }}>{editing.email ?? 'No email'}</div>
            <div style={{ color: '#A1A1AA', fontFamily: 'monospace', marginBottom: 6 }}>{editing.id}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, color: '#71717A' }}>
              <div><span style={{ fontWeight: 600 }}>Joined:</span> {fmtFull(editing.created_at)}</div>
              <div><span style={{ fontWeight: 600 }}>Last sign in:</span> {fmtFull(editing.last_sign_in_at)}</div>
              <div><span style={{ fontWeight: 600 }}>Updated:</span> {fmtFull(editing.updated_at)}</div>
              <div><span style={{ fontWeight: 600 }}>Email verified:</span> {editing.email_confirmed_at ? fmtFull(editing.email_confirmed_at) : 'No'}</div>
            </div>
          </div>

          {/* Editable fields */}
          <Field label="Name">
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Full name"
              style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #E4E4E7', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
          </Field>
          <Field label="Position / Role">
            <input value={form.job_role} onChange={e => setForm(f => ({ ...f, job_role: e.target.value }))}
              placeholder="e.g. Software Engineer"
              style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #E4E4E7', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
          </Field>
          <Field label="Company">
            <input value={form.job_company} onChange={e => setForm(f => ({ ...f, job_company: e.target.value }))}
              placeholder="e.g. Google"
              style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #E4E4E7', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
          </Field>
          <Field label="Plan">
            <Select value={form.plan} onChange={v => setForm(f => ({ ...f, plan: v }))} options={PLANS} />
          </Field>

          {msg && <div style={{ fontSize: 12.5, color: msg.startsWith('✓') ? '#10B981' : '#EF4444', marginBottom: 8 }}>{msg}</div>}
          <SaveBtn onClick={save} pending={pending} label="Save Changes" />
        </SlideOver>
      )}
    </div>
  )
}

// Analytics
function AnalyticsSection({ analytics }: { analytics: Props['analytics'] }) {
  const viewCounts: Record<string, { name: string; count: number }> = {}
  analytics.views.forEach(v => {
    const name = v.companies ? (Array.isArray(v.companies) ? v.companies[0]?.name : v.companies.name) ?? v.company_id : v.company_id
    if (!viewCounts[v.company_id]) viewCounts[v.company_id] = { name, count: 0 }
    viewCounts[v.company_id].count++
  })
  const saveCounts: Record<string, { name: string; count: number }> = {}
  analytics.saves.forEach(s => {
    const name = s.companies ? (Array.isArray(s.companies) ? s.companies[0]?.name : s.companies.name) ?? s.company_id : s.company_id
    if (!saveCounts[s.company_id]) saveCounts[s.company_id] = { name, count: 0 }
    saveCounts[s.company_id].count++
  })
  const topViews = Object.values(viewCounts).sort((a, b) => b.count - a.count)
  const topSaves = Object.values(saveCounts).sort((a, b) => b.count - a.count)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#09090B', marginBottom: 10 }}>Company Views <span style={{ color: '#A1A1AA', fontWeight: 400, fontSize: 12 }}>({analytics.views.length} total)</span></div>
        <DataTable cols={['Company', 'Views']} rows={topViews.map(r => [r.name, String(r.count)])} />
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#09090B', marginBottom: 10 }}>Saved Companies <span style={{ color: '#A1A1AA', fontWeight: 400, fontSize: 12 }}>({analytics.saves.length} total)</span></div>
        <DataTable cols={['Company', 'Saves']} rows={topSaves.map(r => [r.name, String(r.count)])} />
      </div>
      <div style={{ gridColumn: '1/-1', padding: 16, borderRadius: 12, background: '#F7F7F8', border: '1px solid #E4E4E7' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[
            { label: 'Total Views', value: analytics.views.length, color: '#7C3AED' },
            { label: 'Total Saves', value: analytics.saves.length, color: '#10B981' },
            { label: 'Unique Companies Viewed', value: Object.keys(viewCounts).length, color: '#F59E0B' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: s.color, letterSpacing: '-0.04em' }}>{s.value}</div>
              <div style={{ fontSize: 11.5, color: '#71717A', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Company Content Section ──────────────────────────────────────────────────

type ContentData = Awaited<ReturnType<typeof adminGetCompanyContent>>

function ContentSection({ companies }: { companies: Company[] }) {
  const [selectedId, setSelectedId] = useState(companies[0]?.id ?? '')
  const [tab, setTab] = useState<ContentTab>('news')
  const [content, setContent] = useState<ContentData | null>(null)
  const [loading, setLoading] = useState(false)
  const [pending, startTx] = useTransition()
  const [seeding, startSeed] = useTransition()
  const [panel, setPanel] = useState<{ type: ContentTab; data: Record<string, unknown> | null } | null>(null)
  const [err, setErr] = useState('')
  const [seedMsg, setSeedMsg] = useState('')

  const company = companies.find(c => c.id === selectedId)

  useEffect(() => {
    if (!selectedId) return
    setLoading(true)
    adminGetCompanyContent(selectedId).then(c => { setContent(c); setLoading(false) })
  }, [selectedId])

  function refresh() {
    adminGetCompanyContent(selectedId).then(setContent)
  }

  function closePanel() { setPanel(null); setErr('') }

  function handleSeedDefaults() {
    setSeedMsg('')
    startSeed(async () => {
      const res = await adminSeedCompanyContent(selectedId)
      if (res?.error) { setSeedMsg(`Error: ${res.error}`); return }
      setSeedMsg('✓ Content seeded from web successfully.')
      adminGetCompanyContent(selectedId).then(setContent)
    })
  }

  function handleSeedFinancials() {
    setSeedMsg('')
    const name    = (company?.name    ?? '').trim()
    const website = (company?.website ?? '').trim()
    if (!name || !website) { setSeedMsg('Error: Company name and website are required.'); return }
    startSeed(async () => {
      try {
        const resp = await fetch('/api/seed-financials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ companyId: selectedId, name, website }),
        })
        const json = await resp.json()
        if (!resp.ok || json.error) { setSeedMsg(`Error: ${json.error ?? 'Unknown error'}`); return }
        setSeedMsg('✓ Financials updated from web successfully.')
        adminGetCompanyContent(selectedId).then(setContent)
      } catch (e) {
        setSeedMsg(`Error: ${e instanceof Error ? e.message : 'Network error'}`)
      }
    })
  }

  const TABS: { id: ContentTab; label: string; count: number }[] = [
    { id: 'news', label: 'News', count: content?.news.length ?? 0 },
    { id: 'milestones', label: 'Milestones', count: content?.milestones.length ?? 0 },
    { id: 'products', label: 'Products', count: content?.products.length ?? 0 },
    { id: 'financials', label: 'Financials', count: content?.financials ? 1 : 0 },
    { id: 'standards', label: 'Standards', count: content?.standards.length ?? 0 },
    { id: 'departments', label: 'Departments', count: content?.departments.length ?? 0 },
    { id: 'roles', label: 'Roles', count: content?.roles.length ?? 0 },
    { id: 'exec_groups', label: 'Exec Groups', count: content?.execGroups.length ?? 0 },
  ]

  // ── Generic save/delete helpers ──
  async function saveNews(form: Record<string, unknown>) {
    const res = await adminUpsertNews({ company_id: selectedId, type: String(form.type ?? 'NEWS'), headline: String(form.headline ?? ''), summary: String(form.summary ?? ''), published_date: String(form.published_date ?? ''), type_color: String(form.type_color ?? '#1D4ED8'), type_bg: String(form.type_bg ?? '#EFF6FF'), dot_color: String(form.dot_color ?? '#3B82F6'), sort_order: Number(form.sort_order ?? 0), ...(form.id ? { id: String(form.id) } : {}) })
    if (res.error) { setErr(res.error); return }
    refresh(); closePanel()
  }
  async function saveMilestone(form: Record<string, unknown>) {
    const res = await adminUpsertMilestone({ company_id: selectedId, year: Number(form.year ?? new Date().getFullYear()), type: String(form.type ?? 'milestone'), icon: String(form.icon ?? '⭐'), accent_color: String(form.accent_color ?? '#7C3AED'), bg_color: String(form.bg_color ?? '#F5F3FF'), title: String(form.title ?? ''), detail: String(form.detail ?? ''), badge: String(form.badge ?? ''), sort_order: Number(form.sort_order ?? 0), ...(form.id ? { id: String(form.id) } : {}) })
    if (res.error) { setErr(res.error); return }
    refresh(); closePanel()
  }
  async function saveProduct(form: Record<string, unknown>) {
    const res = await adminUpsertProduct({ company_id: selectedId, name: String(form.name ?? ''), tagline: String(form.tagline ?? ''), description: String(form.description ?? ''), category: String(form.category ?? ''), cat_color: String(form.cat_color ?? '#7C3AED'), use_cases: form.use_cases ?? [], customers: form.customers ?? [], competitors: form.competitors ?? [], sort_order: Number(form.sort_order ?? 0), ...(form.id ? { id: String(form.id) } : {}) })
    if (res.error) { setErr(res.error); return }
    refresh(); closePanel()
  }
  async function saveFinancials(form: Record<string, unknown>) {
    const res = await adminUpsertFinancials({ company_id: selectedId, tam: String(form.tam ?? ''), sam: String(form.sam ?? ''), som: String(form.som ?? ''), arr: String(form.arr ?? ''), yoy_growth: String(form.yoy_growth ?? ''), revenue_per_employee: String(form.revenue_per_employee ?? ''), revenue_streams: form.revenue_streams ?? [], business_units: form.business_units ?? [], market_share: form.market_share ?? [], revenue_growth: form.revenue_growth ?? [], ...(form.id ? { id: String(form.id) } : {}) })
    if (res.error) { setErr(res.error); return }
    refresh(); closePanel()
  }
  async function saveStandard(form: Record<string, unknown>) {
    const res = await adminUpsertStandard({ company_id: selectedId, code: String(form.code ?? ''), category: String(form.category ?? ''), cat_color: String(form.cat_color ?? '#7C3AED'), status: String(form.status ?? 'Compliant'), description: String(form.description ?? ''), sort_order: Number(form.sort_order ?? 0), ...(form.id ? { id: String(form.id) } : {}) })
    if (res.error) { setErr(res.error); return }
    refresh(); closePanel()
  }
  async function saveDepartment(form: Record<string, unknown>) {
    const res = await adminUpsertDepartment({ company_id: selectedId, name: String(form.name ?? ''), icon: String(form.icon ?? '🏢'), color: String(form.color ?? '#7C3AED'), headcount: Number(form.headcount ?? 0), sort_order: Number(form.sort_order ?? 0), ...(form.id ? { id: String(form.id) } : {}) })
    if (res.error) { setErr(res.error); return }
    refresh(); closePanel()
  }
  async function saveRole(form: Record<string, unknown>) {
    const res = await adminUpsertRole({ company_id: selectedId, department_id: String(form.department_id ?? ''), title: String(form.title ?? ''), level: String(form.level ?? 'L4'), tools: form.tools ?? [], skills: form.skills ?? [], processes: form.processes ?? [], interview_questions: form.interview_questions ?? [], keywords: form.keywords ?? [], sort_order: Number(form.sort_order ?? 0), ...(form.id ? { id: String(form.id) } : {}) })
    if (res.error) { setErr(res.error); return }
    refresh(); closePanel()
  }
  async function saveExecGroup(form: Record<string, unknown>) {
    const res = await adminUpsertExecGroup({ company_id: selectedId, title: String(form.title ?? ''), short_title: String(form.short_title ?? ''), department_ids: form.department_ids ?? [], sort_order: Number(form.sort_order ?? 0), ...(form.id ? { id: String(form.id) } : {}) })
    if (res.error) { setErr(res.error); return }
    refresh(); closePanel()
  }

  function handleSave() {
    if (!panel) return
    startTx(async () => {
      const f = panel.data ?? {}
      if (panel.type === 'news') await saveNews(f)
      else if (panel.type === 'milestones') await saveMilestone(f)
      else if (panel.type === 'products') await saveProduct(f)
      else if (panel.type === 'financials') await saveFinancials(f)
      else if (panel.type === 'standards') await saveStandard(f)
      else if (panel.type === 'departments') await saveDepartment(f)
      else if (panel.type === 'roles') await saveRole(f)
      else if (panel.type === 'exec_groups') await saveExecGroup(f)
    })
  }

  function handleDelete(type: ContentTab, id: string) {
    startTx(async () => {
      if (type === 'news') await adminDeleteNews(id)
      else if (type === 'milestones') await adminDeleteMilestone(id)
      else if (type === 'products') await adminDeleteProduct(id)
      else if (type === 'standards') await adminDeleteStandard(id)
      else if (type === 'departments') await adminDeleteDepartment(id)
      else if (type === 'roles') await adminDeleteRole(id)
      else if (type === 'exec_groups') await adminDeleteExecGroup(id)
      refresh()
    })
  }

  function PanelField({ key2, label, type = 'text', options, isJson, placeholder }: { key2: string; label: string; type?: string; options?: string[]; isJson?: boolean; placeholder?: string }) {
    const val = panel?.data?.[key2]
    if (isJson) return <JsonField key={key2} label={label} value={val ?? []} onChange={v => setPanel(p => p ? { ...p, data: { ...(p.data ?? {}), [key2]: v } } : p)} />
    if (options) return <Field label={label}><Select value={String(val ?? options[0])} onChange={v => setPanel(p => p ? { ...p, data: { ...(p.data ?? {}), [key2]: v } } : p)} options={options} /></Field>
    if (type === 'textarea') return <Field label={label}><Textarea value={String(val ?? '')} onChange={v => setPanel(p => p ? { ...p, data: { ...(p.data ?? {}), [key2]: v } } : p)} /></Field>
    return <Field label={label}><Input type={type} value={String(val ?? '')} onChange={v => setPanel(p => p ? { ...p, data: { ...(p.data ?? {}), [key2]: v } } : p)} /></Field>
  }

  // Render the edit panel form based on type
  function renderPanelForm() {
    if (!panel) return null
    const t = panel.type
    if (t === 'news') return (<>
      <PanelField key2="type" label="Type" options={NEWS_TYPES} />
      <PanelField key2="headline" label="Headline" />
      <PanelField key2="summary" label="Summary" type="textarea" />
      <PanelField key2="published_date" label="Published Date" placeholder="e.g. 3 weeks ago" />
      <PanelField key2="type_color" label="Type Color" />
      <PanelField key2="type_bg" label="Type Background" />
      <PanelField key2="dot_color" label="Dot Color" />
      <PanelField key2="sort_order" label="Sort Order" type="number" />
    </>)
    if (t === 'milestones') return (<>
      <PanelField key2="year" label="Year" type="number" />
      <PanelField key2="type" label="Type" options={MILESTONE_TYPES} />
      <PanelField key2="icon" label="Icon (emoji)" />
      <PanelField key2="title" label="Title" />
      <PanelField key2="detail" label="Detail" type="textarea" />
      <PanelField key2="badge" label="Badge" />
      <PanelField key2="accent_color" label="Accent Color" />
      <PanelField key2="bg_color" label="Background Color" />
      <PanelField key2="sort_order" label="Sort Order" type="number" />
    </>)
    if (t === 'products') return (<>
      <PanelField key2="name" label="Name" />
      <PanelField key2="tagline" label="Tagline" />
      <PanelField key2="description" label="Description" type="textarea" />
      <PanelField key2="category" label="Category" />
      <PanelField key2="cat_color" label="Category Color" />
      <PanelField key2="use_cases" label='Use Cases (JSON: ["Case1","Case2"])' isJson />
      <PanelField key2="customers" label='Customers (JSON: [{"name":"X","abbr":"X","bg":"#hex"}])' isJson />
      <PanelField key2="competitors" label='Competitors (JSON: [{"name":"X","edge":"..."}])' isJson />
      <PanelField key2="sort_order" label="Sort Order" type="number" />
    </>)
    if (t === 'financials') return (<>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
        <PanelField key2="tam" label="TAM" /><PanelField key2="sam" label="SAM" />
        <PanelField key2="som" label="SOM" /><PanelField key2="arr" label="ARR" />
        <PanelField key2="yoy_growth" label="YoY Growth" /><PanelField key2="revenue_per_employee" label="Rev/Employee" />
      </div>
      <PanelField key2="revenue_streams" label='Revenue Streams (JSON: [{"name":"X","pct":62,"clr":"#hex"}])' isJson />
      <PanelField key2="business_units" label='Business Units (JSON: [{"name":"X","growth":"+24%","status":"primary","desc":"..."}])' isJson />
      <PanelField key2="market_share" label='Market Share (JSON: [{"name":"X","pct":34,"clr":"#hex"}])' isJson />
      <PanelField key2="revenue_growth" label='Revenue Growth (JSON: [{"year":2020,"height":40}])' isJson />
    </>)
    if (t === 'standards') return (<>
      <PanelField key2="code" label="Code (e.g. SOC 2 Type II)" />
      <PanelField key2="category" label="Category" />
      <PanelField key2="cat_color" label="Category Color" />
      <PanelField key2="status" label="Status" options={STANDARD_STATUSES} />
      <PanelField key2="description" label="Description" type="textarea" />
      <PanelField key2="sort_order" label="Sort Order" type="number" />
    </>)
    if (t === 'departments') return (<>
      <PanelField key2="name" label="Name" />
      <PanelField key2="icon" label="Icon (emoji)" />
      <PanelField key2="color" label="Color" />
      <PanelField key2="headcount" label="Headcount" type="number" />
      <PanelField key2="sort_order" label="Sort Order" type="number" />
    </>)
    if (t === 'roles') return (<>
      <PanelField key2="department_id" label="Department ID (UUID)" />
      <PanelField key2="title" label="Title" />
      <PanelField key2="level" label="Level" options={LEVELS} />
      <PanelField key2="tools" label='Tools (JSON: ["Tool1","Tool2"])' isJson />
      <PanelField key2="skills" label='Skills (JSON: ["Skill1","Skill2"])' isJson />
      <PanelField key2="processes" label='Processes (JSON: ["Process1"])' isJson />
      <PanelField key2="interview_questions" label='Interview Questions (JSON: ["Q1","Q2"])' isJson />
      <PanelField key2="keywords" label='Keywords (JSON: ["kw1","kw2"])' isJson />
      <PanelField key2="sort_order" label="Sort Order" type="number" />
    </>)
    if (t === 'exec_groups') return (<>
      <PanelField key2="title" label="Title" />
      <PanelField key2="short_title" label="Short Title" />
      <PanelField key2="department_ids" label='Department IDs (JSON: ["uuid1","uuid2"])' isJson />
      <PanelField key2="sort_order" label="Sort Order" type="number" />
    </>)
    return null
  }

  // Render tab content
  function renderTabContent() {
    if (!content) return <div style={{ padding: 40, textAlign: 'center', color: '#A1A1AA', fontSize: 13 }}>Loading…</div>
    const addBtn = (type: ContentTab) => (
      <button onClick={() => setPanel({ type, data: { company_id: selectedId } })} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: '#7C3AED', color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>+ Add</button>
    )

    if (tab === 'news') return (
      <div><div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>{addBtn('news')}</div>
        <DataTable cols={['Type', 'Headline', 'Date', 'Sort']}
          rows={content.news.map(n => [<Badge key="t" label={n.type} color={n.type_color} />, n.headline, n.published_date ?? '—', String(n.sort_order)])}
          onEdit={i => setPanel({ type: 'news', data: content.news[i] as unknown as Record<string, unknown> })}
          onDelete={i => handleDelete('news', content.news[i].id)} /></div>
    )
    if (tab === 'milestones') return (
      <div><div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>{addBtn('milestones')}</div>
        <DataTable cols={['Year', 'Type', 'Title', 'Badge']}
          rows={content.milestones.map(m => [String(m.year), m.type, m.title, m.badge ?? '—'])}
          onEdit={i => setPanel({ type: 'milestones', data: content.milestones[i] as unknown as Record<string, unknown> })}
          onDelete={i => handleDelete('milestones', content.milestones[i].id)} /></div>
    )
    if (tab === 'products') return (
      <div><div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>{addBtn('products')}</div>
        <DataTable cols={['Name', 'Category', 'Use Cases', 'Competitors']}
          rows={content.products.map(p => [<span key="n" style={{ fontWeight: 700 }}>{p.name}</span>, p.category ?? '—', String((p.use_cases as unknown[])?.length ?? 0), String((p.competitors as unknown[])?.length ?? 0)])}
          onEdit={i => setPanel({ type: 'products', data: content.products[i] as unknown as Record<string, unknown> })}
          onDelete={i => handleDelete('products', content.products[i].id)} /></div>
    )
    if (tab === 'financials') return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <button onClick={() => setPanel({ type: 'financials', data: (content.financials as unknown as Record<string, unknown>) ?? { company_id: selectedId } })} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: '#7C3AED', color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>{content.financials ? 'Edit Financials' : '+ Add Financials'}</button>
        </div>
        {content.financials ? (() => {
          const fin = content.financials as Record<string, unknown>
          const revenueStreams  = (fin.revenue_streams  as {name:string;description:string;percentage:number;type:string}[]|null) ?? []
          const businessUnits  = (fin.business_units   as {name:string;description:string;revenue_contribution:string}[]|null) ?? []
          const marketShare    = (fin.market_share      as {segment:string;percentage:number;context:string;year:number}[]|null) ?? []
          const revenueGrowth  = (fin.revenue_growth    as {year:number;revenue:string;growth_rate:string|null}[]|null) ?? []
          const streamTypeColor: Record<string,string> = { subscription:'#7C3AED', transactional:'#2563EB', advertising:'#D97706', product:'#059669', services:'#0891B2', other:'#71717A' }
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* ── Scalar metrics ── */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {(['tam','sam','som','arr','yoy_growth','revenue_per_employee'] as const).map(k => (
                  <div key={k} style={{ padding: '12px 14px', borderRadius: 10, background: '#F7F7F8', border: '1px solid #E4E4E7' }}>
                    <div style={{ fontSize: 10, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{k.replace(/_/g,' ')}</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#09090B' }}>{fin[k] as string || '—'}</div>
                  </div>
                ))}
              </div>

              {/* ── Revenue Growth History ── */}
              {revenueGrowth.length > 0 && (
                <div style={{ background: '#F7F7F8', border: '1px solid #E4E4E7', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Revenue Growth History</div>
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(revenueGrowth.length, 5)}, 1fr)`, gap: 8 }}>
                    {revenueGrowth.slice(0, 5).map((rg, i) => {
                      const rate = rg.growth_rate
                      const isPos = rate && (rate.startsWith('+') || (rate.startsWith('~') && !rate.includes('-')))
                      const isNeg = rate && rate.includes('-')
                      return (
                        <div key={i} style={{ textAlign: 'center', padding: '8px 6px', background: '#fff', borderRadius: 8, border: '1px solid #F0F0F2' }}>
                          <div style={{ fontSize: 10, color: '#A1A1AA', marginBottom: 2 }}>{rg.year}</div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: '#09090B', marginBottom: 2 }}>{rg.revenue}</div>
                          {rate && <div style={{ fontSize: 10.5, fontWeight: 700, color: isNeg ? '#DC2626' : isPos ? '#16A34A' : '#D97706' }}>{rate}</div>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* ── Revenue Streams + Business Units (side by side) ── */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {revenueStreams.length > 0 && (
                  <div style={{ background: '#F7F7F8', border: '1px solid #E4E4E7', borderRadius: 10, padding: '14px 16px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Revenue Streams</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {revenueStreams.map((s, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flexShrink: 0, width: 34, textAlign: 'right', fontSize: 12, fontWeight: 800, color: '#09090B' }}>{s.percentage}%</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 1 }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: '#09090B' }}>{s.name}</span>
                              <span style={{ fontSize: 9.5, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: streamTypeColor[s.type] ?? '#71717A', color: '#fff', textTransform: 'uppercase' }}>{s.type}</span>
                            </div>
                            <div style={{ fontSize: 11, color: '#71717A', lineHeight: 1.4 }}>{s.description}</div>
                          </div>
                          <div style={{ width: 60, height: 5, borderRadius: 3, background: '#E4E4E7', flexShrink: 0, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${s.percentage}%`, background: streamTypeColor[s.type] ?? '#7C3AED', borderRadius: 3 }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {businessUnits.length > 0 && (
                  <div style={{ background: '#F7F7F8', border: '1px solid #E4E4E7', borderRadius: 10, padding: '14px 16px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Business Units</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {businessUnits.map((u, i) => (
                        <div key={i} style={{ padding: '8px 10px', background: '#fff', borderRadius: 8, border: '1px solid #F0F0F2' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#09090B' }}>{u.name}</span>
                            <span style={{ fontSize: 11.5, fontWeight: 800, color: '#7C3AED' }}>{u.revenue_contribution}</span>
                          </div>
                          <div style={{ fontSize: 11, color: '#71717A', lineHeight: 1.4 }}>{u.description}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ── Market Share ── */}
              {marketShare.length > 0 && (
                <div style={{ background: '#F7F7F8', border: '1px solid #E4E4E7', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Market Share</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {marketShare.map((ms, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ flexShrink: 0 }}>
                          <div style={{ fontSize: 11, color: '#A1A1AA' }}>{ms.segment} {ms.year && <span style={{ color: '#C4C4C8' }}>({ms.year})</span>}</div>
                          <div style={{ fontSize: 11, color: '#71717A', marginTop: 1 }}>{ms.context}</div>
                        </div>
                        <div style={{ marginLeft: 'auto', flexShrink: 0, textAlign: 'right' }}>
                          <span style={{ fontSize: 15, fontWeight: 800, color: '#09090B' }}>{ms.percentage}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })() : <div style={{ padding: 24, textAlign: 'center', color: '#A1A1AA', fontSize: 13 }}>No financial data yet</div>}
      </div>
    )
    if (tab === 'standards') return (
      <div><div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>{addBtn('standards')}</div>
        <DataTable cols={['Code', 'Category', 'Status']}
          rows={content.standards.map(s => [<span key="c" style={{ fontWeight: 700 }}>{s.code}</span>, s.category ?? '—', <Badge key="st" label={s.status} color={s.status === 'Certified' || s.status === 'Compliant' ? '#10B981' : '#F59E0B'} />])}
          onEdit={i => setPanel({ type: 'standards', data: content.standards[i] as unknown as Record<string, unknown> })}
          onDelete={i => handleDelete('standards', content.standards[i].id)} /></div>
    )
    if (tab === 'departments') return (
      <div><div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>{addBtn('departments')}</div>
        <DataTable cols={['Icon', 'Name', 'Color', 'Headcount', 'ID']}
          rows={content.departments.map(d => [d.icon ?? '🏢', d.name, <Pill key="c" label={d.color} />, String(d.headcount), <span key="id" style={{ fontFamily: 'monospace', fontSize: 10.5, color: '#A1A1AA' }}>{d.id.slice(0,8)}…</span>])}
          onEdit={i => setPanel({ type: 'departments', data: content.departments[i] as unknown as Record<string, unknown> })}
          onDelete={i => handleDelete('departments', content.departments[i].id)} /></div>
    )
    if (tab === 'roles') return (
      <div><div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>{addBtn('roles')}</div>
        <DataTable cols={['Title', 'Level', 'Tools', 'Questions']}
          rows={content.roles.map(r => [r.title, <Pill key="l" label={r.level} />, String((r.tools as unknown[])?.length ?? 0), String((r.interview_questions as unknown[])?.length ?? 0)])}
          onEdit={i => setPanel({ type: 'roles', data: content.roles[i] as unknown as Record<string, unknown> })}
          onDelete={i => handleDelete('roles', content.roles[i].id)} /></div>
    )
    if (tab === 'exec_groups') return (
      <div><div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>{addBtn('exec_groups')}</div>
        <DataTable cols={['Title', 'Short Title', 'Dept Count']}
          rows={content.execGroups.map(g => [g.title, g.short_title ?? '—', String((g.department_ids as unknown[])?.length ?? 0)])}
          onEdit={i => setPanel({ type: 'exec_groups', data: content.execGroups[i] as unknown as Record<string, unknown> })}
          onDelete={i => handleDelete('exec_groups', content.execGroups[i].id)} /></div>
    )
    return null
  }

  const panelTitle = panel ? (panel.data?.id ? `Edit ${panel.type.replace('_',' ')}` : `Add ${panel.type.replace('_',' ')}`) : ''

  return (
    <div>
      {/* Company picker */}
      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: '#71717A', whiteSpace: 'nowrap' }}>Company</label>
        <select value={selectedId} onChange={e => { setSelectedId(e.target.value); setSeedMsg('') }} style={{ flex: 1, padding: '8px 12px', borderRadius: 9, border: '1.5px solid #E4E4E7', background: '#F7F7F8', fontSize: 13, outline: 'none', color: '#09090B' }}>
          {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {loading && <span style={{ fontSize: 12, color: '#A1A1AA' }}>Loading…</span>}
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid #E4E4E7', paddingBottom: 1 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '7px 12px', borderRadius: '8px 8px 0 0', border: 'none', background: tab === t.id ? '#fff' : 'transparent', color: tab === t.id ? '#7C3AED' : '#71717A', fontSize: 12.5, fontWeight: tab === t.id ? 700 : 400, cursor: 'pointer', borderBottom: tab === t.id ? '2px solid #7C3AED' : '2px solid transparent', marginBottom: -1 }}>
            {t.label} <span style={{ fontSize: 10.5, opacity: 0.7 }}>({t.count})</span>
          </button>
        ))}
      </div>

      {/* Tab-specific seed from web banner */}
      {content && (() => {
        const TAB_SEED: Record<ContentTab, { title: string; desc: string }> = {
          news:        { title: 'Seed News from Web',        desc: 'Fetches recent headlines and company announcements from the company website and public news sources.' },
          milestones:  { title: 'Seed Milestones from Web',  desc: 'Pulls key company events, product launches, and funding rounds from Wikipedia and web sources.' },
          products:    { title: 'Seed Products from Web',    desc: 'Imports product lines and service offerings from the company website and public data sources.' },
          financials:  { title: 'Seed Financials from Web',  desc: 'Fetches revenue, market share, TAM/SAM/SOM, and growth metrics from SEC EDGAR, Yahoo Finance, and Wikipedia. Updates all existing values.' },
          standards:   { title: 'Seed Standards from Web',   desc: 'Imports compliance certifications and industry standards from the company\'s public documentation.' },
          departments: { title: 'Seed Departments from Web', desc: 'Pulls organisational structure and department headcount from public sources and the company website.' },
          roles:       { title: 'Seed Roles from Web',       desc: 'Imports common job roles and level structures from public job postings and company data.' },
          exec_groups: { title: 'Seed Exec Groups from Web', desc: 'Fetches executive leadership and C-suite structure from Wikipedia, LinkedIn, and public filings.' },
        }
        const s = TAB_SEED[tab]
        return (
          <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: '#FFFBEB', border: '1px solid #FDE68A', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#92400E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: '#92400E' }}>{s.title}</span>
              </div>
              <div style={{ fontSize: 11.5, color: '#A16207' }}>{s.desc}{tab !== 'financials' && ' Only populates empty tables — existing data is never overwritten.'}</div>
              {seedMsg && <div style={{ fontSize: 11.5, color: seedMsg.startsWith('Error') ? '#DC2626' : '#16A34A', marginTop: 4, fontWeight: 600 }}>{seedMsg}</div>}
            </div>
            <button
              onClick={tab === 'financials' ? handleSeedFinancials : handleSeedDefaults}
              disabled={seeding}
              style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: seeding ? '#D1D5DB' : '#F59E0B', color: seeding ? '#9CA3AF' : '#fff', fontSize: 12.5, fontWeight: 700, cursor: seeding ? 'default' : 'pointer', flexShrink: 0, transition: 'background 0.15s', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
            >
              {seeding
                ? <><SpinnerIcon />Fetching from web…</>
                : <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>{s.title}</>
              }
            </button>
          </div>
        )
      })()}

      {renderTabContent()}

      {panel && (
        <SlideOver title={panelTitle} onClose={closePanel}>
          {renderPanelForm()}
          {err && <div style={{ padding: '8px 12px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: 12.5, marginBottom: 8 }}>{err}</div>}
          <SaveBtn onClick={handleSave} pending={pending} />
          {!!panel.data?.id && (
            <DeleteBtn onClick={() => startTx(async () => { await handleDelete(panel.type, String(panel.data!.id)); closePanel() })} pending={pending} />
          )}
        </SlideOver>
      )}
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function AdminDashboard({ currentUser, initialCompanies, initialProfiles, analytics }: Props) {
  const [nav, setNav] = useState<NavSection>('companies')
  const [companies, setCompanies] = useState<Company[]>(initialCompanies)
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles)

  function handlePlanUpdate(id: string, fields: Partial<Profile>) {
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, ...fields } : p))
  }

  const isSuperAdmin = currentUser.plan === 'SuperAdmin'

  return (
    <div style={{ minHeight: '100vh', background: '#F5F5F7', display: 'flex', flexDirection: 'column' }}>

      {/* Top bar */}
      <div style={{ background: '#09090B', borderBottom: '1px solid #1C1C1E', padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="#fff"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </div>
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 700, letterSpacing: '-0.02em' }}>ResearchOrg</span>
          </Link>
          <div style={{ width: 1, height: 16, background: '#2C2C2E' }} />
          <span style={{ color: '#A1A1AA', fontSize: 12.5 }}>Admin Dashboard</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ padding: '3px 10px', borderRadius: 6, background: isSuperAdmin ? '#EF444420' : '#7C3AED20', border: `1px solid ${isSuperAdmin ? '#EF444430' : '#7C3AED30'}` }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: isSuperAdmin ? '#EF4444' : '#A78BFA' }}>{currentUser.plan}</span>
          </div>
          <span style={{ color: '#71717A', fontSize: 12 }}>{currentUser.email}</span>
          <Link href="/logout" style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid #2C2C2E', background: 'transparent', color: '#A1A1AA', fontSize: 12, textDecoration: 'none', fontWeight: 500 }}>Sign out</Link>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '220px 1fr', overflow: 'hidden' }}>

        {/* Sidebar */}
        <div style={{ background: '#fff', borderRight: '1px solid #E4E4E7', padding: '12px 8px', overflowY: 'auto' }}>
          <SectionTitle>Company Data</SectionTitle>
          <NavItem label="Companies" active={nav === 'companies'} onClick={() => setNav('companies')} count={companies.length} />
          <NavItem label="Company Content" active={nav === 'content'} onClick={() => setNav('content')} />

          <SectionTitle>Users</SectionTitle>
          <NavItem label="All Users" active={nav === 'users'} onClick={() => setNav('users')} count={profiles.length} />

          <SectionTitle>Analytics</SectionTitle>
          <NavItem label="Views & Saves" active={nav === 'analytics'} onClick={() => setNav('analytics')} />

          <div style={{ marginTop: 20, padding: '0 8px' }}>
            <div style={{ padding: '12px 14px', borderRadius: 10, background: '#F5F3FF', border: '1px solid #EDE9FE' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#7C3AED', marginBottom: 4 }}>DB Summary</div>
              {[
                { label: 'Companies', value: companies.length },
                { label: 'Users', value: profiles.length },
                { label: 'Views', value: analytics.views.length },
                { label: 'Saves', value: analytics.saves.length },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: '#71717A', marginBottom: 2 }}>
                  <span>{s.label}</span><span style={{ fontWeight: 600, color: '#09090B' }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main content */}
        <div style={{ overflowY: 'auto', padding: '24px' }}>
          {/* Page title */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#09090B', letterSpacing: '-0.04em' }}>
              {nav === 'companies' ? 'Companies' : nav === 'content' ? 'Company Content' : nav === 'users' ? 'Users' : 'Analytics'}
            </div>
            <div style={{ fontSize: 12.5, color: '#A1A1AA', marginTop: 2 }}>
              {nav === 'companies' && `${companies.length} companies in the database`}
              {nav === 'content' && 'View and edit per-company content — news, products, financials, org chart and more'}
              {nav === 'users' && `${profiles.length} registered users`}
              {nav === 'analytics' && 'Company view and save activity'}
            </div>
          </div>

          {nav === 'companies' && <CompaniesSection companies={companies} onRefresh={setCompanies} />}
          {nav === 'content' && <ContentSection companies={companies} />}
          {nav === 'users' && <UsersSection profiles={profiles} onPlanUpdate={handlePlanUpdate} />}
          {nav === 'analytics' && <AnalyticsSection analytics={analytics} />}
        </div>
      </div>
    </div>
  )
}
