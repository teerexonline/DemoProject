'use client'

import { useState } from 'react'
import { DEPARTMENTS, LEVEL_COLORS, type Dept } from './jobData'

interface Company {
  id: string
  name: string
  logo_color: string | null
  logo_url: string | null
  employees: number | null
}

type DbLeader    = { id: string; name: string; title: string; level: string; parent_id: string | null; department_ids: unknown; sort_order: number }
type DbDept      = { id: string; name: string; icon: string; color: string; headcount: number }
type DbRole      = { department_id: string; title: string; level: string; tools: unknown; skills: unknown; processes: unknown; interview_questions: unknown; keywords: unknown }
type DbExecGroup = { id?: string; title: string; short_title: string | null; department_ids: unknown; level?: string; name?: string | null }

interface Props {
  company: Company
  dbDepts: DbDept[]
  dbRoles: DbRole[]
  dbExecGroups: DbExecGroup[]
  dbLeaders: DbLeader[]
}

const LINE_COLOR = '#D4D4D8'

function buildDepts(dbDepts: DbDept[], dbRoles: DbRole[]): Dept[] {
  if (dbDepts.length === 0) return DEPARTMENTS
  return dbDepts.map(d => ({
    id: d.id,
    name: d.name,
    icon: d.icon,
    color: d.color,
    headcount: d.headcount,
    roles: dbRoles
      .filter(r => r.department_id === d.id)
      .map((r, i) => ({
        id: `${d.id}-${i}`,
        title: r.title,
        level: r.level,
        levelColor: LEVEL_COLORS[r.level] ?? '#71717A',
        tools:              (r.tools as string[]) ?? [],
        skills:             (r.skills as string[]) ?? [],
        processes:          (r.processes as string[]) ?? [],
        interviewQuestions: (r.interview_questions as string[]) ?? [],
        keywords:           (r.keywords as string[]) ?? [],
      })),
  }))
}

// ── Leaders-based org chart ───────────────────────────────────────────────────

function LeaderOrgChart({ company, depts, dbLeaders, color }: { company: Company; depts: Dept[]; dbLeaders: DbLeader[]; color: string }) {
  const ceo       = dbLeaders.find(l => l.level === 'ceo')
  const csuiteList = dbLeaders.filter(l => l.level === 'c-suite').sort((a, b) => a.sort_order - b.sort_order)
  const vpList     = dbLeaders.filter(l => l.level === 'vp').sort((a, b) => a.sort_order - b.sort_order)

  const [selectedCsuiteId, setSelectedCsuiteId] = useState<string | null>(csuiteList[0]?.id ?? null)
  const [selectedVpId, setSelectedVpId]         = useState<string | null>(null)
  const [selectedDeptId, setSelectedDeptId]     = useState<string | null>(null)

  const selectedCsuite = csuiteList.find(c => c.id === selectedCsuiteId) ?? null
  const selectedVp     = vpList.find(v => v.id === selectedVpId) ?? null

  // VPs under the selected C-suite person
  const visibleVps = selectedCsuiteId
    ? vpList.filter(v => v.parent_id === selectedCsuiteId)
    : []

  // Depts to show: from selected VP, else from selected C-suite, else all
  const activePerson = selectedVp ?? selectedCsuite
  const activeDeptIds: string[] = activePerson ? ((activePerson.department_ids as string[]) ?? []) : []
  const visibleDepts = activeDeptIds.length > 0
    ? depts.filter(d => activeDeptIds.includes(d.id))
    : depts

  const selectedDeptData = visibleDepts.find(d => d.id === selectedDeptId)

  function selectCsuite(id: string) {
    if (selectedCsuiteId === id) { setSelectedCsuiteId(null); setSelectedVpId(null); setSelectedDeptId(null) }
    else { setSelectedCsuiteId(id); setSelectedVpId(null); setSelectedDeptId(null) }
  }
  function selectVp(id: string) {
    if (selectedVpId === id) { setSelectedVpId(null); setSelectedDeptId(null) }
    else { setSelectedVpId(id); setSelectedDeptId(null) }
  }
  function selectDept(id: string) {
    setSelectedDeptId(prev => prev === id ? null : id)
  }

  const allDepts = depts.length > 0 ? depts : DEPARTMENTS

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ color: '#09090B', fontSize: 15, fontWeight: 800, letterSpacing: '-0.04em', marginBottom: 2 }}>Org Chart</div>
          <div style={{ color: '#71717A', fontSize: 12, lineHeight: 1.5 }}>
            {company.employees?.toLocaleString() ?? '—'} employees · Click a leader to explore their team
          </div>
        </div>
        <div style={{ padding: '4px 10px', borderRadius: 8, background: '#eef4fb', border: '1px solid #a8cbe8', color: '#063f76', fontSize: 11.5, fontWeight: 600 }}>
          {allDepts.reduce((s, d) => s + d.headcount, 0).toLocaleString()} across {allDepts.length} departments
        </div>
      </div>

      {/* Tree */}
      <div style={{ overflowX: 'auto', paddingBottom: 8, WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'] }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: Math.max(400, csuiteList.length * 148) }}>

          {/* ── Level 1: CEO ── */}
          {ceo && (
            <div style={{
              padding: '12px 28px', borderRadius: 14,
              background: color, color: '#fff', textAlign: 'center',
              boxShadow: `0 4px 16px ${color}40`, minWidth: 180,
            }}>
              <div style={{ fontSize: 10, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 3 }}>{ceo.title}</div>
              <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.03em' }}>{ceo.name}</div>
            </div>
          )}

          {csuiteList.length > 0 && (
            <>
              <div style={{ width: 1, height: 24, background: LINE_COLOR }} />

              {/* ── Level 2: C-Suite ── */}
              <div style={{ position: 'relative', paddingTop: 24 }}>
                <div style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: 1, background: LINE_COLOR }} />
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {csuiteList.map(person => {
                    const isSelected = selectedCsuiteId === person.id
                    return (
                      <div key={person.id} style={{ position: 'relative' }}>
                        <div style={{ position: 'absolute', top: -24, left: '50%', marginLeft: -0.5, width: 1, height: 24, background: LINE_COLOR }} />
                        <button
                          onClick={() => selectCsuite(person.id)}
                          style={{
                            width: 140, padding: '10px 8px', borderRadius: 12,
                            border: isSelected ? `2px solid ${color}` : '1.5px solid #E4E4E7',
                            background: isSelected ? `${color}0A` : '#fff',
                            cursor: 'pointer', textAlign: 'center',
                            boxShadow: isSelected ? `0 2px 12px ${color}25` : '0 1px 3px rgba(0,0,0,0.05)',
                            transition: 'border-color 0.15s, background 0.15s',
                          }}
                          onMouseEnter={e => { if (!isSelected) { const el = e.currentTarget as HTMLElement; el.style.borderColor = '#D4D4D8'; el.style.background = '#FAFAFA' } }}
                          onMouseLeave={e => { if (!isSelected) { const el = e.currentTarget as HTMLElement; el.style.borderColor = '#E4E4E7'; el.style.background = '#fff' } }}
                        >
                          <div style={{ width: 34, height: 34, borderRadius: '50%', background: isSelected ? color : '#F4F4F5', margin: '0 auto 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: isSelected ? `0 2px 8px ${color}40` : 'none' }}>
                            <span style={{ color: isSelected ? '#fff' : '#A1A1AA', fontSize: 12, fontWeight: 800 }}>
                              {person.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                            </span>
                          </div>
                          <div style={{ color: isSelected ? color : '#09090B', fontSize: 12, fontWeight: 700, lineHeight: 1.3, marginBottom: 2 }}>{person.name}</div>
                          <div style={{ color: '#A1A1AA', fontSize: 10.5, lineHeight: 1.3 }}>{person.title}</div>
                          {isSelected && (
                            <div style={{ position: 'absolute', bottom: -10, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: `7px solid ${color}` }} />
                          )}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}

          {/* ── Level 3: VP (only shown when a C-suite is selected and VPs exist) ── */}
          {selectedCsuiteId && visibleVps.length > 0 && (
            <>
              <div style={{ width: 1, height: 24, background: LINE_COLOR }} />
              <div style={{ position: 'relative', paddingTop: 24, width: '100%', display: 'flex', justifyContent: 'center' }}>
                <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: 1, background: LINE_COLOR }} />
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {visibleVps.map(vp => {
                    const isSelected = selectedVpId === vp.id
                    return (
                      <div key={vp.id} style={{ position: 'relative' }}>
                        <div style={{ position: 'absolute', top: -24, left: '50%', marginLeft: -0.5, width: 1, height: 24, background: LINE_COLOR }} />
                        <button
                          onClick={() => selectVp(vp.id)}
                          style={{
                            width: 130, padding: '8px 8px', borderRadius: 10,
                            border: isSelected ? `2px solid ${color}` : '1.5px solid #E4E4E7',
                            background: isSelected ? `${color}0A` : '#fff',
                            cursor: 'pointer', textAlign: 'center',
                            boxShadow: isSelected ? `0 2px 10px ${color}20` : '0 1px 3px rgba(0,0,0,0.04)',
                            transition: 'border-color 0.15s, background 0.15s',
                          }}
                          onMouseEnter={e => { if (!isSelected) { const el = e.currentTarget as HTMLElement; el.style.borderColor = '#D4D4D8'; el.style.background = '#FAFAFA' } }}
                          onMouseLeave={e => { if (!isSelected) { const el = e.currentTarget as HTMLElement; el.style.borderColor = '#E4E4E7'; el.style.background = '#fff' } }}
                        >
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: isSelected ? `${color}20` : '#F4F4F5', margin: '0 auto 5px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ color: isSelected ? color : '#A1A1AA', fontSize: 10.5, fontWeight: 800 }}>
                              {vp.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                            </span>
                          </div>
                          <div style={{ color: isSelected ? color : '#09090B', fontSize: 11, fontWeight: 700, lineHeight: 1.3, marginBottom: 2 }}>{vp.name}</div>
                          <div style={{ color: '#A1A1AA', fontSize: 10, lineHeight: 1.3 }}>{vp.title}</div>
                          {isSelected && (
                            <div style={{ position: 'absolute', bottom: -10, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: `6px solid ${color}` }} />
                          )}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}

        </div>
      </div>

      {/* ── Level 4: Departments ── */}
      {(selectedCsuiteId || vpList.length === 0) && visibleDepts.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ padding: '10px 16px', borderRadius: '12px 12px 0 0', background: '#F7F7F8', border: '1px solid #E4E4E7', borderBottom: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
            <div style={{ color: '#09090B', fontSize: 13, fontWeight: 700 }}>
              {selectedVp ? selectedVp.name : selectedCsuite ? selectedCsuite.name : company.name} — Departments
            </div>
            <div style={{ color: '#A1A1AA', fontSize: 12 }}>
              · {visibleDepts.reduce((s, d) => s + d.headcount, 0)} people across {visibleDepts.length} depts
            </div>
          </div>
          <div style={{ padding: 16, borderRadius: '0 0 12px 12px', background: '#F7F7F8', border: '1px solid #E4E4E7', borderTop: 'none', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {visibleDepts.map(dept => {
              const isSelected = selectedDeptId === dept.id
              return (
                <button
                  key={dept.id}
                  onClick={() => selectDept(dept.id)}
                  style={{
                    padding: '12px 16px', borderRadius: 10,
                    border: isSelected ? `2px solid ${dept.color}` : '1.5px solid #E4E4E7',
                    background: isSelected ? `${dept.color}0D` : '#fff',
                    cursor: 'pointer', textAlign: 'left',
                    minWidth: 150,
                    boxShadow: isSelected ? `0 2px 10px ${dept.color}25` : '0 1px 3px rgba(0,0,0,0.05)',
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                  onMouseEnter={e => { if (!isSelected) { const el = e.currentTarget as HTMLElement; el.style.borderColor = '#D4D4D8'; el.style.background = '#FAFAFA' } }}
                  onMouseLeave={e => { if (!isSelected) { const el = e.currentTarget as HTMLElement; el.style.borderColor = '#E4E4E7'; el.style.background = '#fff' } }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ color: isSelected ? dept.color : '#09090B', fontSize: 13, fontWeight: 700 }}>{dept.name}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <span style={{ color: '#71717A', fontSize: 11 }}>👥 {dept.headcount} people</span>
                    <span style={{ color: '#71717A', fontSize: 11 }}>💼 {dept.roles.length} roles</span>
                  </div>
                  {isSelected && (
                    <div style={{ marginTop: 5, color: dept.color, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Selected ↓</div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Level 5: Roles ── */}
      {selectedDeptData && (
        <div style={{ marginTop: 14 }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid #F0F0F2', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: '#09090B', fontSize: 14, fontWeight: 800, letterSpacing: '-0.03em' }}>{selectedDeptData.name}</span>
            <span style={{ color: '#A1A1AA', fontSize: 12 }}>— {selectedDeptData.roles.length} roles</span>
            <span style={{ marginLeft: 'auto', color: '#A1A1AA', fontSize: 11, fontStyle: 'italic' }}>
              See tools, skills &amp; interview prep in the other tabs
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '12px 0' }}>
            {selectedDeptData.roles.map(role => (
              <div key={role.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: '#fff', border: '1px solid #EBEBED' }}>
                <span style={{ padding: '2px 8px', borderRadius: 6, background: `${role.levelColor}15`, color: role.levelColor, fontSize: 10.5, fontWeight: 700, flexShrink: 0 }}>
                  {role.level}
                </span>
                <span style={{ color: '#09090B', fontSize: 13, fontWeight: 600 }}>{role.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!selectedCsuiteId && csuiteList.length > 0 && (
        <div style={{ marginTop: 24, textAlign: 'center', padding: '32px 16px', color: '#A1A1AA', fontSize: 12.5 }}>
          Click on a C-suite leader above to explore their team and departments.
        </div>
      )}
    </div>
  )
}

// ── Exec-groups org chart (uses level + name fields for 5-level hierarchy) ────

function ExecGroupOrgChart({ company, depts, dbExecGroups, color }: { company: Company; depts: Dept[]; dbExecGroups: DbExecGroup[]; color: string }) {
  const allDepts = depts.length > 0 ? depts : DEPARTMENTS

  // Split by level — if no level field, treat everything as c_suite
  const hasLevels = dbExecGroups.some(eg => eg.level && eg.level !== 'c_suite')
  const ceo        = hasLevels ? dbExecGroups.find(eg => eg.level === 'ceo') : null
  const csuiteList = hasLevels ? dbExecGroups.filter(eg => eg.level === 'c_suite') : dbExecGroups
  const vpList     = hasLevels ? dbExecGroups.filter(eg => eg.level === 'vp') : []

  const [selectedCsuiteIdx, setSelectedCsuiteIdx] = useState<number | null>(0)
  const [selectedVpIdx, setSelectedVpIdx]         = useState<number | null>(null)
  const [selectedDeptId, setSelectedDeptId]       = useState<string | null>(null)

  const selectedVp = selectedVpIdx !== null ? vpList[selectedVpIdx] : null

  // Departments visible under selected VP (or all if no VP selected)
  const activeDeptIds: string[] = selectedVp ? ((selectedVp.department_ids as string[]) ?? []) : []
  const visibleDepts = activeDeptIds.length > 0
    ? allDepts.filter(d => activeDeptIds.includes(d.id))
    : allDepts

  const selectedDeptData = visibleDepts.find(d => d.id === selectedDeptId)

  function selectCsuite(idx: number) {
    if (selectedCsuiteIdx === idx) { setSelectedCsuiteIdx(null); setSelectedVpIdx(null); setSelectedDeptId(null) }
    else { setSelectedCsuiteIdx(idx); setSelectedVpIdx(null); setSelectedDeptId(null) }
  }
  function selectVp(idx: number) {
    if (selectedVpIdx === idx) { setSelectedVpIdx(null); setSelectedDeptId(null) }
    else { setSelectedVpIdx(idx); setSelectedDeptId(null) }
  }
  function selectDept(id: string) {
    setSelectedDeptId(prev => prev === id ? null : id)
  }

  const selectedCsuite = selectedCsuiteIdx !== null ? csuiteList[selectedCsuiteIdx] : null

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ color: '#09090B', fontSize: 15, fontWeight: 800, letterSpacing: '-0.04em', marginBottom: 2 }}>Org Chart</div>
          <div style={{ color: '#71717A', fontSize: 12, lineHeight: 1.5 }}>
            {company.employees?.toLocaleString() ?? '—'} employees · Click a leader to explore their team
          </div>
        </div>
        <div style={{ padding: '4px 10px', borderRadius: 8, background: '#eef4fb', border: '1px solid #a8cbe8', color: '#063f76', fontSize: 11.5, fontWeight: 600 }}>
          {allDepts.reduce((s, d) => s + d.headcount, 0).toLocaleString()} across {allDepts.length} departments
        </div>
      </div>

      <div style={{ overflowX: 'auto', paddingBottom: 8, WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'] }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: Math.max(400, csuiteList.length * 148) }}>

          {/* ── Level 1: CEO ── */}
          {ceo ? (
            <div style={{ padding: '12px 28px', borderRadius: 14, background: color, color: '#fff', textAlign: 'center', boxShadow: `0 4px 16px ${color}40`, minWidth: 180 }}>
              <div style={{ fontSize: 10, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 3 }}>Chief Executive Officer</div>
              <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.03em' }}>{ceo.name ?? ceo.title}</div>
            </div>
          ) : (
            <div style={{ padding: '10px 28px', borderRadius: 12, background: color, color: '#fff', textAlign: 'center', boxShadow: `0 4px 16px ${color}40` }}>
              <div style={{ fontSize: 10, opacity: 0.75, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 2 }}>Leadership</div>
              <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '-0.03em' }}>{company.name}</div>
            </div>
          )}

          {csuiteList.length > 0 && (
            <>
              <div style={{ width: 1, height: 24, background: LINE_COLOR }} />
              {/* ── Level 2: C-Suite ── */}
              <div style={{ position: 'relative', paddingTop: 24 }}>
                <div style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: 1, background: LINE_COLOR }} />
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {csuiteList.map((exec, idx) => {
                    const isSelected = selectedCsuiteIdx === idx
                    const initials = (exec.name ?? exec.title).split(' ').map((w: string) => w[0]).join('').slice(0, 2)
                    return (
                      <div key={exec.id ?? idx} style={{ position: 'relative' }}>
                        <div style={{ position: 'absolute', top: -24, left: '50%', marginLeft: -0.5, width: 1, height: 24, background: LINE_COLOR }} />
                        <button
                          onClick={() => selectCsuite(idx)}
                          style={{ width: 140, padding: '10px 8px', borderRadius: 12, border: isSelected ? `2px solid ${color}` : '1.5px solid #E4E4E7', background: isSelected ? `${color}0A` : '#fff', cursor: 'pointer', textAlign: 'center', boxShadow: isSelected ? `0 2px 12px ${color}25` : '0 1px 3px rgba(0,0,0,0.05)', transition: 'border-color 0.15s, background 0.15s', position: 'relative' }}
                          onMouseEnter={e => { if (!isSelected) { const el = e.currentTarget as HTMLElement; el.style.borderColor = '#D4D4D8'; el.style.background = '#FAFAFA' } }}
                          onMouseLeave={e => { if (!isSelected) { const el = e.currentTarget as HTMLElement; el.style.borderColor = '#E4E4E7'; el.style.background = '#fff' } }}
                        >
                          <div style={{ width: 34, height: 34, borderRadius: '50%', background: isSelected ? color : '#F4F4F5', margin: '0 auto 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: isSelected ? `0 2px 8px ${color}40` : 'none' }}>
                            <span style={{ color: isSelected ? '#fff' : '#A1A1AA', fontSize: 12, fontWeight: 800 }}>{initials}</span>
                          </div>
                          <div style={{ color: isSelected ? color : '#09090B', fontSize: 12, fontWeight: 700, lineHeight: 1.3, marginBottom: 2 }}>{exec.name ?? exec.short_title ?? exec.title}</div>
                          <div style={{ color: '#A1A1AA', fontSize: 10.5, lineHeight: 1.3 }}>{exec.short_title ?? exec.title}</div>
                          {isSelected && <div style={{ position: 'absolute', bottom: -10, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: `7px solid ${color}` }} />}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}

          {/* ── Level 3: VPs ── */}
          {selectedCsuiteIdx !== null && vpList.length > 0 && (
            <>
              <div style={{ width: 1, height: 24, background: LINE_COLOR }} />
              <div style={{ position: 'relative', paddingTop: 24, width: '100%', display: 'flex', justifyContent: 'center' }}>
                <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: 1, background: LINE_COLOR }} />
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {vpList.map((vp, idx) => {
                    const isSelected = selectedVpIdx === idx
                    const initials = (vp.name ?? vp.title).split(' ').map((w: string) => w[0]).join('').slice(0, 2)
                    return (
                      <div key={vp.id ?? idx} style={{ position: 'relative' }}>
                        <div style={{ position: 'absolute', top: -24, left: '50%', marginLeft: -0.5, width: 1, height: 24, background: LINE_COLOR }} />
                        <button
                          onClick={() => selectVp(idx)}
                          style={{ width: 130, padding: '8px 8px', borderRadius: 10, border: isSelected ? `2px solid ${color}` : '1.5px solid #E4E4E7', background: isSelected ? `${color}0A` : '#fff', cursor: 'pointer', textAlign: 'center', boxShadow: isSelected ? `0 2px 10px ${color}20` : '0 1px 3px rgba(0,0,0,0.04)', transition: 'border-color 0.15s, background 0.15s', position: 'relative' }}
                          onMouseEnter={e => { if (!isSelected) { const el = e.currentTarget as HTMLElement; el.style.borderColor = '#D4D4D8'; el.style.background = '#FAFAFA' } }}
                          onMouseLeave={e => { if (!isSelected) { const el = e.currentTarget as HTMLElement; el.style.borderColor = '#E4E4E7'; el.style.background = '#fff' } }}
                        >
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: isSelected ? `${color}20` : '#F4F4F5', margin: '0 auto 5px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ color: isSelected ? color : '#A1A1AA', fontSize: 10.5, fontWeight: 800 }}>{initials}</span>
                          </div>
                          <div style={{ color: isSelected ? color : '#09090B', fontSize: 11, fontWeight: 700, lineHeight: 1.3, marginBottom: 2 }}>{vp.name ?? vp.short_title ?? vp.title}</div>
                          <div style={{ color: '#A1A1AA', fontSize: 10, lineHeight: 1.3 }}>{vp.short_title ?? vp.title}</div>
                          {isSelected && <div style={{ position: 'absolute', bottom: -10, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: `6px solid ${color}` }} />}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Level 4: Departments ── */}
      {(selectedCsuiteIdx !== null) && visibleDepts.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ padding: '10px 16px', borderRadius: '12px 12px 0 0', background: '#F7F7F8', border: '1px solid #E4E4E7', borderBottom: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
            <div style={{ color: '#09090B', fontSize: 13, fontWeight: 700 }}>
              {selectedVp ? (selectedVp.name ?? selectedVp.title) : selectedCsuite ? (selectedCsuite.name ?? selectedCsuite.title) : company.name} — Departments
            </div>
            <div style={{ color: '#A1A1AA', fontSize: 12 }}>
              · {visibleDepts.reduce((s, d) => s + d.headcount, 0)} people across {visibleDepts.length} depts
            </div>
          </div>
          <div style={{ padding: 16, borderRadius: '0 0 12px 12px', background: '#F7F7F8', border: '1px solid #E4E4E7', borderTop: 'none', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {visibleDepts.map(dept => {
              const isSelected = selectedDeptId === dept.id
              return (
                <button key={dept.id} onClick={() => selectDept(dept.id)}
                  style={{ padding: '12px 16px', borderRadius: 10, border: isSelected ? `2px solid ${dept.color}` : '1.5px solid #E4E4E7', background: isSelected ? `${dept.color}0D` : '#fff', cursor: 'pointer', textAlign: 'left', minWidth: 150, boxShadow: isSelected ? `0 2px 10px ${dept.color}25` : '0 1px 3px rgba(0,0,0,0.05)', transition: 'border-color 0.15s, background 0.15s' }}
                  onMouseEnter={e => { if (!isSelected) { const el = e.currentTarget as HTMLElement; el.style.borderColor = '#D4D4D8'; el.style.background = '#FAFAFA' } }}
                  onMouseLeave={e => { if (!isSelected) { const el = e.currentTarget as HTMLElement; el.style.borderColor = '#E4E4E7'; el.style.background = '#fff' } }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ color: isSelected ? dept.color : '#09090B', fontSize: 13, fontWeight: 700 }}>{dept.name}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <span style={{ color: '#71717A', fontSize: 11 }}>👥 {dept.headcount} people</span>
                    <span style={{ color: '#71717A', fontSize: 11 }}>💼 {dept.roles.length} roles</span>
                  </div>
                  {isSelected && <div style={{ marginTop: 5, color: dept.color, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Selected ↓</div>}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Level 5: Roles ── */}
      {selectedDeptData && (
        <div style={{ marginTop: 14 }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid #F0F0F2', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: '#09090B', fontSize: 14, fontWeight: 800, letterSpacing: '-0.03em' }}>{selectedDeptData.name}</span>
            <span style={{ color: '#A1A1AA', fontSize: 12 }}>— {selectedDeptData.roles.length} roles</span>
            <span style={{ marginLeft: 'auto', color: '#A1A1AA', fontSize: 11, fontStyle: 'italic' }}>See tools, skills &amp; interview prep in the other tabs</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '12px 0' }}>
            {selectedDeptData.roles.map(role => (
              <div key={role.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: '#fff', border: '1px solid #EBEBED' }}>
                <span style={{ padding: '2px 8px', borderRadius: 6, background: `${role.levelColor}15`, color: role.levelColor, fontSize: 10.5, fontWeight: 700, flexShrink: 0 }}>{role.level}</span>
                <span style={{ color: '#09090B', fontSize: 13, fontWeight: 600 }}>{role.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedCsuiteIdx === null && csuiteList.length > 0 && (
        <div style={{ marginTop: 24, textAlign: 'center', padding: '32px 16px', color: '#A1A1AA', fontSize: 12.5 }}>
          Click on a C-suite leader above to explore their team and departments.
        </div>
      )}
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function OrgChart({ company, dbDepts, dbRoles, dbExecGroups, dbLeaders }: Props) {
  const color = company.logo_color ?? '#063f76'
  const depts = buildDepts(dbDepts, dbRoles)

  if (dbLeaders.length > 0) {
    return <LeaderOrgChart company={company} depts={depts} dbLeaders={dbLeaders} color={color} />
  }

  return <ExecGroupOrgChart company={company} depts={depts} dbExecGroups={dbExecGroups} color={color} />
}
