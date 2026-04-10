'use client'

import { useState, useTransition, useEffect } from 'react'
import { adminGetBlogPosts, adminUpsertBlogPost, adminDeleteBlogPost } from '@/app/actions/blog'
import type { BlogPost } from '@/app/actions/blog'

// ─── Shared UI atoms (mirrors AdminDashboard style) ───────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  )
}

function Input({ value, onChange, placeholder, type = 'text' }: { value: string | number; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #E4E4E7', background: '#F7F7F8', fontSize: 13, outline: 'none', boxSizing: 'border-box', color: '#09090B', transition: 'border-color 0.15s', fontFamily: 'inherit' }}
      onFocus={e => (e.currentTarget as HTMLInputElement).style.borderColor = '#063f76'}
      onBlur={e => (e.currentTarget as HTMLInputElement).style.borderColor = '#E4E4E7'}
    />
  )
}

function Textarea({ value, onChange, placeholder, rows = 4 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
      style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #E4E4E7', background: '#F7F7F8', fontSize: 13, outline: 'none', boxSizing: 'border-box', resize: 'vertical', color: '#09090B', fontFamily: 'inherit', transition: 'border-color 0.15s', lineHeight: 1.6 }}
      onFocus={e => (e.currentTarget as HTMLTextAreaElement).style.borderColor = '#063f76'}
      onBlur={e => (e.currentTarget as HTMLTextAreaElement).style.borderColor = '#E4E4E7'}
    />
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: 36, height: 20, borderRadius: 10, background: checked ? '#063f76' : '#E4E4E7',
          position: 'relative', transition: 'background 0.15s', cursor: 'pointer', flexShrink: 0,
        }}>
        <div style={{
          position: 'absolute', top: 3, left: checked ? 18 : 3,
          width: 14, height: 14, borderRadius: '50%', background: '#fff',
          transition: 'left 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
        }} />
      </div>
      <span style={{ fontSize: 13, color: '#52525B' }}>{label}</span>
    </label>
  )
}

// ─── Auto-formatter ───────────────────────────────────────────────────────────
// Converts pasted plain text / markdown-like content → clean HTML

function autoFormat(raw: string): string {
  const lines = raw.split('\n')
  const output: string[] = []
  let inList = false

  function closeList() {
    if (inList) { output.push('</ul>'); inList = false }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimEnd()

    // Empty line → close list / paragraph break
    if (line.trim() === '') {
      closeList()
      continue
    }

    // H1 → h2 (we never want h1 inside article body)
    if (/^# (.+)/.test(line)) {
      closeList()
      output.push(`<h2>${line.replace(/^# /, '').trim()}</h2>`)
      continue
    }

    // H2 → h2
    if (/^## (.+)/.test(line)) {
      closeList()
      output.push(`<h2>${line.replace(/^## /, '').trim()}</h2>`)
      continue
    }

    // H3 → h3
    if (/^### (.+)/.test(line)) {
      closeList()
      output.push(`<h3>${line.replace(/^### /, '').trim()}</h3>`)
      continue
    }

    // HR
    if (/^---+$/.test(line.trim())) {
      closeList()
      output.push('<hr />')
      continue
    }

    // Blockquote
    if (/^> (.+)/.test(line)) {
      closeList()
      output.push(`<blockquote>${inlineFormat(line.replace(/^> /, '').trim())}</blockquote>`)
      continue
    }

    // Bullet list
    if (/^[-*•] (.+)/.test(line)) {
      if (!inList) { output.push('<ul>'); inList = true }
      output.push(`<li>${inlineFormat(line.replace(/^[-*•] /, '').trim())}</li>`)
      continue
    }

    // Numbered list
    if (/^\d+\. (.+)/.test(line)) {
      if (!inList) { output.push('<ul>'); inList = true }
      output.push(`<li>${inlineFormat(line.replace(/^\d+\. /, '').trim())}</li>`)
      continue
    }

    // Plain paragraph
    closeList()
    output.push(`<p>${inlineFormat(line.trim())}</p>`)
  }

  closeList()
  return output.join('\n')
}

function inlineFormat(text: string): string {
  // Bold **text** or __text__
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  text = text.replace(/__(.+?)__/g, '<strong>$1</strong>')
  // Italic *text* or _text_
  text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  text = text.replace(/_([^_]+)_/g, '<em>$1</em>')
  // Inline code `code`
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>')
  // Links [text](url)
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
  return text
}

function slugify(title: string): string {
  return title.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
}

// ─── Blank post factory ───────────────────────────────────────────────────────

function blankPost(): Partial<BlogPost> & { _rawContent: string } {
  return {
    slug: '',
    title: '',
    excerpt: '',
    content: '',
    author: 'ResearchOrg Team',
    category: '',
    tags: [],
    published: false,
    featured: false,
    reading_time: undefined,
    seo_title: '',
    seo_description: '',
    _rawContent: '',
  }
}

// ─── SlideOver ────────────────────────────────────────────────────────────────

function SlideOver({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 40, backdropFilter: 'blur(2px)' }} />
      <div className="admin-slideover-panel" style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 560, background: '#fff', zIndex: 50, boxShadow: '-8px 0 40px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #F4F4F5', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#09090B', letterSpacing: '-0.03em' }}>{title}</div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid #E4E4E7', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#71717A', fontSize: 16 }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px' }}>{children}</div>
      </div>
    </>
  )
}

// ─── Blog status badge ────────────────────────────────────────────────────────

function StatusBadge({ published, featured }: { published: boolean; featured: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <span style={{ padding: '2px 8px', borderRadius: 5, background: published ? '#0e7a4a15' : '#F4F4F5', color: published ? '#0e7a4a' : '#A1A1AA', fontSize: 11, fontWeight: 700, border: `1px solid ${published ? '#0e7a4a30' : '#E4E4E7'}` }}>
        {published ? 'Published' : 'Draft'}
      </span>
      {featured && (
        <span style={{ padding: '2px 8px', borderRadius: 5, background: '#063f7615', color: '#063f76', fontSize: 11, fontWeight: 700, border: '1px solid #063f7625' }}>
          Featured
        </span>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function BlogAdmin() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<(Partial<BlogPost> & { _rawContent: string }) | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [autoFormatMode, setAutoFormatMode] = useState(false)

  useEffect(() => {
    adminGetBlogPosts().then(({ data }) => {
      if (data) setPosts(data)
      setLoading(false)
    })
  }, [])

  function openNew() {
    setEditing(blankPost())
    setError(null)
    setSuccess(null)
  }

  function openEdit(post: BlogPost) {
    setEditing({ ...post, _rawContent: '' })
    setError(null)
    setSuccess(null)
  }

  function handleTitleChange(title: string) {
    if (!editing) return
    const updated = { ...editing, title }
    // Auto-generate slug if it's new (no id) and slug hasn't been manually edited
    if (!editing.id) updated.slug = slugify(title)
    setEditing(updated)
  }

  function handleApplyFormat() {
    if (!editing || !editing._rawContent) return
    const html = autoFormat(editing._rawContent)
    setEditing({ ...editing, content: html, _rawContent: '' })
  }

  function handleSave() {
    if (!editing) return
    if (!editing.title?.trim()) { setError('Title is required'); return }
    if (!editing.slug?.trim()) { setError('Slug is required'); return }
    if (!editing.content?.trim()) { setError('Content is required'); return }
    setError(null)

    startTransition(async () => {
      const result = await adminUpsertBlogPost({
        id: editing.id,
        slug: editing.slug!,
        title: editing.title!,
        excerpt: editing.excerpt ?? undefined,
        content: editing.content!,
        cover_image: editing.cover_image ?? undefined,
        author: editing.author ?? 'ResearchOrg Team',
        category: editing.category ?? undefined,
        tags: editing.tags ?? [],
        published: editing.published ?? false,
        featured: editing.featured ?? false,
        reading_time: editing.reading_time ?? undefined,
        seo_title: editing.seo_title ?? undefined,
        seo_description: editing.seo_description ?? undefined,
      })
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(editing.id ? 'Post updated.' : 'Post created.')
        setEditing(null)
        const { data } = await adminGetBlogPosts()
        if (data) setPosts(data)
      }
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await adminDeleteBlogPost(id)
      if (result.error) {
        setError(result.error)
      } else {
        setDeleteConfirm(null)
        setPosts(prev => prev.filter(p => p.id !== id))
        setSuccess('Post deleted.')
      }
    })
  }

  if (loading) {
    return <div style={{ color: '#A1A1AA', fontSize: 13, padding: '32px 0' }}>Loading posts…</div>
  }

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 12.5, color: '#A1A1AA' }}>{posts.length} blog post{posts.length !== 1 ? 's' : ''}</div>
        <button onClick={openNew} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#063f76', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Post
        </button>
      </div>

      {/* Feedback */}
      {success && <div style={{ padding: '10px 14px', borderRadius: 8, background: '#0e7a4a15', border: '1px solid #0e7a4a30', color: '#0e7a4a', fontSize: 13, marginBottom: 16 }}>{success}</div>}
      {error && <div style={{ padding: '10px 14px', borderRadius: 8, background: '#EF444415', border: '1px solid #EF444430', color: '#EF4444', fontSize: 13, marginBottom: 16 }}>{error}</div>}

      {/* Posts table */}
      {posts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#A1A1AA', fontSize: 13 }}>No posts yet. Create your first post.</div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #E4E4E7', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E4E4E7' }}>
                {['Title', 'Category', 'Status', 'Reading Time', 'Published', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {posts.map((post, i) => (
                <tr key={post.id} style={{ borderBottom: i < posts.length - 1 ? '1px solid #F4F4F5' : 'none', transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#FAFAFA'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#09090B', maxWidth: 260 }}>{post.title}</div>
                    <div style={{ fontSize: 11.5, color: '#A1A1AA', marginTop: 2, fontFamily: 'monospace' }}>{post.slug}</div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    {post.category ? <span style={{ fontSize: 12, color: '#52525B' }}>{post.category}</span> : <span style={{ color: '#A1A1AA', fontSize: 12 }}>—</span>}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <StatusBadge published={post.published} featured={post.featured} />
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 12.5, color: '#71717A' }}>
                    {post.reading_time ? `${post.reading_time} min` : '—'}
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 12.5, color: '#71717A', whiteSpace: 'nowrap' }}>
                    {post.published_at ? new Date(post.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => openEdit(post)} style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid #E4E4E7', background: '#fff', fontSize: 12, color: '#52525B', cursor: 'pointer', fontFamily: 'inherit' }}>Edit</button>
                      <a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer" style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid #E4E4E7', background: '#fff', fontSize: 12, color: '#52525B', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                      </a>
                      {deleteConfirm === post.id ? (
                        <>
                          <button onClick={() => handleDelete(post.id)} disabled={isPending} style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid #EF444430', background: '#EF444415', fontSize: 12, color: '#EF4444', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>Confirm</button>
                          <button onClick={() => setDeleteConfirm(null)} style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid #E4E4E7', background: '#fff', fontSize: 12, color: '#52525B', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                        </>
                      ) : (
                        <button onClick={() => setDeleteConfirm(post.id)} style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid #E4E4E7', background: '#fff', fontSize: 12, color: '#A1A1AA', cursor: 'pointer', fontFamily: 'inherit' }}>Delete</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit/Create slide-over */}
      {editing && (
        <SlideOver title={editing.id ? 'Edit Post' : 'New Post'} onClose={() => setEditing(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

            {/* Basic info */}
            <Field label="Title">
              <Input value={editing.title ?? ''} onChange={handleTitleChange} placeholder="Post title" />
            </Field>

            <Field label="Slug (URL)">
              <Input value={editing.slug ?? ''} onChange={v => setEditing(e => e ? { ...e, slug: v } : e)} placeholder="my-post-title" />
              <div style={{ fontSize: 11, color: '#A1A1AA', marginTop: 3 }}>researchorg.com/blog/{editing.slug || 'slug'}</div>
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Category">
                <Input value={editing.category ?? ''} onChange={v => setEditing(e => e ? { ...e, category: v } : e)} placeholder="Interview Prep" />
              </Field>
              <Field label="Reading Time (min)">
                <Input type="number" value={editing.reading_time ?? ''} onChange={v => setEditing(e => e ? { ...e, reading_time: v ? Number(v) : undefined } : e)} placeholder="5" />
              </Field>
            </div>

            <Field label="Excerpt">
              <Textarea value={editing.excerpt ?? ''} onChange={v => setEditing(e => e ? { ...e, excerpt: v } : e)} placeholder="Short summary shown in listings…" rows={2} />
            </Field>

            <Field label="Author">
              <Input value={editing.author ?? 'ResearchOrg Team'} onChange={v => setEditing(e => e ? { ...e, author: v } : e)} />
            </Field>

            <Field label="Tags (comma-separated)">
              <Input
                value={(editing.tags ?? []).join(', ')}
                onChange={v => setEditing(e => e ? { ...e, tags: v.split(',').map(s => s.trim()).filter(Boolean) } : e)}
                placeholder="job search, interview prep, research"
              />
            </Field>

            {/* Content */}
            <div style={{ borderTop: '1px solid #F4F4F5', paddingTop: 16, marginTop: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Content (HTML)</div>
                <button
                  onClick={() => setAutoFormatMode(v => !v)}
                  style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #e2eaf2', background: autoFormatMode ? '#eef4fb' : '#fff', color: autoFormatMode ? '#063f76' : '#52525B', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s' }}>
                  {autoFormatMode ? '← Back to HTML' : '✦ Auto-Format'}
                </button>
              </div>

              {autoFormatMode ? (
                <div>
                  <div style={{ fontSize: 11.5, color: '#71717A', marginBottom: 8, lineHeight: 1.5 }}>
                    Paste plain text or markdown here. Supports **bold**, *italic*, `code`, [links](url), # headings, - lists, &gt; blockquotes, and ---.
                  </div>
                  <textarea
                    value={editing._rawContent}
                    onChange={e => setEditing(prev => prev ? { ...prev, _rawContent: e.target.value } : prev)}
                    rows={14}
                    placeholder="Paste your article content here…"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #E4E4E7', background: '#F7F7F8', fontSize: 13, outline: 'none', boxSizing: 'border-box', resize: 'vertical', color: '#09090B', fontFamily: 'inherit', lineHeight: 1.65, transition: 'border-color 0.15s' }}
                    onFocus={e => (e.currentTarget as HTMLTextAreaElement).style.borderColor = '#063f76'}
                    onBlur={e => (e.currentTarget as HTMLTextAreaElement).style.borderColor = '#E4E4E7'}
                  />
                  <button
                    onClick={handleApplyFormat}
                    disabled={!editing._rawContent?.trim()}
                    style={{ marginTop: 8, padding: '8px 16px', borderRadius: 8, border: 'none', background: editing._rawContent?.trim() ? '#063f76' : '#E4E4E7', color: editing._rawContent?.trim() ? '#fff' : '#A1A1AA', fontSize: 12.5, fontWeight: 700, cursor: editing._rawContent?.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
                    Convert to HTML →
                  </button>
                </div>
              ) : (
                <textarea
                  value={editing.content ?? ''}
                  onChange={e => setEditing(prev => prev ? { ...prev, content: e.target.value } : prev)}
                  rows={14}
                  placeholder="<p>Start writing your article HTML here…</p>"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #E4E4E7', background: '#F7F7F8', fontSize: 12.5, outline: 'none', boxSizing: 'border-box', resize: 'vertical', color: '#09090B', fontFamily: 'monospace', lineHeight: 1.6, transition: 'border-color 0.15s' }}
                  onFocus={e => (e.currentTarget as HTMLTextAreaElement).style.borderColor = '#063f76'}
                  onBlur={e => (e.currentTarget as HTMLTextAreaElement).style.borderColor = '#E4E4E7'}
                />
              )}
            </div>

            {/* SEO */}
            <div style={{ borderTop: '1px solid #F4F4F5', paddingTop: 16, marginTop: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>SEO</div>
              <Field label="SEO Title (overrides page title)">
                <Input value={editing.seo_title ?? ''} onChange={v => setEditing(e => e ? { ...e, seo_title: v } : e)} placeholder="Leave blank to use post title" />
              </Field>
              <Field label="SEO Description">
                <Textarea value={editing.seo_description ?? ''} onChange={v => setEditing(e => e ? { ...e, seo_description: v } : e)} placeholder="150–160 char description for search results…" rows={2} />
              </Field>
            </div>

            {/* Flags */}
            <div style={{ borderTop: '1px solid #F4F4F5', paddingTop: 16, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Toggle checked={editing.published ?? false} onChange={v => setEditing(e => e ? { ...e, published: v } : e)} label="Published (visible to public)" />
              <Toggle checked={editing.featured ?? false} onChange={v => setEditing(e => e ? { ...e, featured: v } : e)} label="Featured (shown at top of blog)" />
            </div>

            {/* Error */}
            {error && <div style={{ padding: '10px 12px', borderRadius: 8, background: '#EF444415', border: '1px solid #EF444430', color: '#EF4444', fontSize: 12.5, marginTop: 12 }}>{error}</div>}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, marginTop: 20, paddingTop: 16, borderTop: '1px solid #F4F4F5' }}>
              <button onClick={handleSave} disabled={isPending} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', background: '#063f76', color: '#fff', fontSize: 13.5, fontWeight: 700, cursor: isPending ? 'not-allowed' : 'pointer', opacity: isPending ? 0.7 : 1, fontFamily: 'inherit' }}>
                {isPending ? 'Saving…' : editing.id ? 'Save Changes' : 'Create Post'}
              </button>
              <button onClick={() => setEditing(null)} style={{ padding: '10px 18px', borderRadius: 8, border: '1px solid #E4E4E7', background: '#fff', fontSize: 13.5, color: '#52525B', cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancel
              </button>
            </div>
          </div>
        </SlideOver>
      )}
    </div>
  )
}
