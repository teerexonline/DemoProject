'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import CompanyLogo from '@/components/CompanyLogo'

interface Company {
  id: string
  name: string
  slug: string
  category: string | null
  logo_color: string | null
  logo_url: string | null
}

interface Props {
  placeholder?: string
  size?: 'sm' | 'lg'
  autoFocus?: boolean
}

export default function SearchAutocomplete({ placeholder = 'Search any company...', size = 'sm', autoFocus = false }: Props) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Company[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const [user, setUser] = useState<User | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  function navigate(path: string) {
    if (!user) {
      router.push('/signup')
      return
    }
    router.push(path)
  }

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setOpen(false); return }
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('companies')
      .select('id, name, slug, category, logo_color, logo_url')
      .ilike('name', `%${q}%`)
      .order('name')
      .limit(7)
    setResults(data ?? [])
    setOpen(true)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) { setResults([]); setOpen(false); setActiveIdx(-1); return }
    debounceRef.current = setTimeout(() => search(query), 220)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, search])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleSelect(company: Company) {
    setQuery('')
    setResults([])
    setOpen(false)
    inputRef.current?.blur()
    navigate(`/company/${company.slug}`)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, -1)) }
    else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIdx >= 0 && results[activeIdx]) handleSelect(results[activeIdx])
      else if (query.trim()) navigate(`/company?q=${encodeURIComponent(query)}`)
    }
    else if (e.key === 'Escape') { setOpen(false); setActiveIdx(-1) }
  }

  const isLg = size === 'lg'

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div
        style={{
          display: 'flex', alignItems: 'center',
          background: isLg ? '#fff' : '#F4F4F5',
          border: `${isLg ? '1.5px' : '1px'} solid #E4E4E7`,
          borderRadius: isLg ? '12px' : '8px',
          overflow: 'visible',
          boxShadow: isLg ? '0 2px 12px rgba(0,0,0,0.06)' : 'none',
          transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
        onFocusCapture={e => {
          const el = e.currentTarget as HTMLElement
          el.style.borderColor = '#7C3AED'
          el.style.boxShadow = isLg ? '0 0 0 3px rgba(124,58,237,0.1)' : 'none'
          if (!isLg) el.style.background = '#fff'
        }}
        onBlurCapture={e => {
          const el = e.currentTarget as HTMLElement
          el.style.borderColor = '#E4E4E7'
          el.style.boxShadow = isLg ? '0 2px 12px rgba(0,0,0,0.06)' : 'none'
          if (!isLg) el.style.background = '#F4F4F5'
        }}
      >
        <div style={{ paddingLeft: isLg ? '14px' : '10px', color: '#A1A1AA', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          {loading ? (
            <svg width={isLg ? 16 : 14} height={isLg ? 16 : 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 0.7s linear infinite' }}>
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
          ) : (
            <svg width={isLg ? 16 : 14} height={isLg ? 16 : 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          )}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setActiveIdx(-1) }}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (results.length > 0) setOpen(true) }}
          placeholder={placeholder}
          autoFocus={autoFocus}
          autoComplete="off"
          style={{
            flex: 1,
            padding: isLg ? '12px 12px' : '8px 10px',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontSize: isLg ? '14px' : '13.5px',
            color: '#09090B',
          }}
        />
        {isLg && (
          <button
            onClick={() => query.trim() && navigate(`/company?q=${encodeURIComponent(query)}`)}
            style={{
              margin: '5px', padding: '9px 16px',
              background: '#7C3AED', color: '#fff', border: 'none', borderRadius: '8px',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              transition: 'background 0.15s', whiteSpace: 'nowrap', flexShrink: 0,
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#6D28D9'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#7C3AED'}
          >Search →</button>
        )}
      </div>

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div
          className="animate-dropdown"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0, right: 0,
            background: '#fff',
            border: '1px solid #E4E4E7',
            borderRadius: '12px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
            zIndex: 9999,
            overflow: 'hidden',
          }}
        >
          {results.map((company, i) => (
            <button
              key={company.id}
              onClick={() => handleSelect(company)}
              onMouseEnter={() => setActiveIdx(i)}
              style={{
                width: '100%',
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 14px',
                background: i === activeIdx ? '#F5F3FF' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.1s',
                borderBottom: i < results.length - 1 ? '1px solid #F4F4F5' : 'none',
              }}
            >
              <CompanyLogo name={company.name} logoUrl={company.logo_url} logoColor={company.logo_color} size={28} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: '#09090B', fontSize: '13.5px', fontWeight: 600, lineHeight: 1.3 }}>
                  {highlightMatch(company.name, query)}
                </div>
                {company.category && (
                  <div style={{ color: '#A1A1AA', fontSize: '11.5px', marginTop: '1px' }}>{company.category}</div>
                )}
              </div>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          ))}
          <div style={{ padding: '8px 14px 10px', borderTop: '1px solid #F4F4F5' }}>
            <button
              onClick={() => query.trim() && navigate(`/company?q=${encodeURIComponent(query)}`)}
              style={{
                color: '#7C3AED', fontSize: '12px', fontWeight: 600,
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              }}
            >
              See all results for &ldquo;{query}&rdquo; →
            </button>
          </div>
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function highlightMatch(text: string, query: string) {
  if (!query) return <>{text}</>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: 'rgba(124,58,237,0.12)', color: '#6D28D9', padding: '0 1px', borderRadius: '2px' }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  )
}
