'use client'

import { useState } from 'react'
import { EXEC_GROUPS, DEPARTMENTS, LEVEL_COLORS, type Dept, type ExecGroup } from './jobData'

interface Company {
  id: string
  name: string
  logo_color: string | null
  logo_url: string | null
  employees: number | null
}

type DbDept       = { id: string; name: string; icon: string; color: string; headcount: number }
type DbRole       = { department_id: string; title: string; level: string; tools: unknown; skills: unknown; processes: unknown; interview_questions: unknown; keywords: unknown }
type DbExecGroup  = { title: string; short_title: string | null; department_ids: unknown }

interface Props {
  company: Company
  dbDepts: DbDept[]
  dbRoles: DbRole[]
  dbExecGroups: DbExecGroup[]
}

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

function buildExecGroups(dbExecGroups: DbExecGroup[], depts: Dept[]): ExecGroup[] {
  if (dbExecGroups.length === 0) return EXEC_GROUPS
  return dbExecGroups.map((eg, i) => {
    const deptIds = (eg.department_ids as string[]) ?? []
    return {
      id: `exec-${i}`,
      title: eg.title,
      shortTitle: eg.short_title ?? eg.title.split(' ').map(w => w[0]).join(''),
      depts: depts.filter(d => deptIds.includes(d.id)),
    }
  })
}

const NODE_W = 130
const NODE_GAP = 8
const LINE_COLOR = '#D4D4D8'

export default function OrgChart({ company, dbDepts, dbRoles, dbExecGroups }: Props) {
  const color = company.logo_color ?? '#063f76'

  const depts = buildDepts(dbDepts, dbRoles)
  const execGroups = buildExecGroups(dbExecGroups, depts)

  const TREE_MIN_W = NODE_W * execGroups.length + NODE_GAP * (execGroups.length - 1)
  const allDepts = depts.length > 0 ? depts : DEPARTMENTS

  const [expandedExec, setExpandedExec] = useState<string | null>(execGroups[0]?.id ?? null)
  const [selectedDept, setSelectedDept] = useState<string | null>(execGroups[0]?.depts[0]?.id ?? null)

  const selectedDeptData: Dept | undefined =
    expandedExec
      ? execGroups.find(e => e.id === expandedExec)?.depts.find(d => d.id === selectedDept)
      : undefined

  function handleExecClick(execId: string) {
    if (expandedExec === execId) {
      setExpandedExec(null)
      setSelectedDept(null)
    } else {
      setExpandedExec(execId)
      const exec = execGroups.find(e => e.id === execId)
      setSelectedDept(exec?.depts[0]?.id ?? null)
    }
  }

  function handleDeptClick(deptId: string) {
    setSelectedDept(prev => prev === deptId ? null : deptId)
  }

  const activeExec = expandedExec ? execGroups.find(e => e.id === expandedExec) : null

  return (
    <div>
      {/* Section header */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ color: '#09090B', fontSize: 15, fontWeight: 800, letterSpacing: '-0.04em', marginBottom: 2 }}>Org Chart</div>
          <div style={{ color: '#71717A', fontSize: 12, lineHeight: 1.5 }}>
            {company.employees?.toLocaleString() ?? '—'} employees · Click an executive to explore their team
          </div>
        </div>
        <div style={{ padding: '4px 10px', borderRadius: 8, background: '#eef4fb', border: '1px solid #a8cbe8', color: '#063f76', fontSize: 11.5, fontWeight: 600 }}>
          {allDepts.reduce((s, d) => s + d.headcount, 0).toLocaleString()} across {allDepts.length} departments
        </div>
      </div>

      {/* ── TREE ────────────────────────────────────────────────────────────── */}
      <div style={{ overflowX: 'auto', paddingBottom: 8, WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'] }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: TREE_MIN_W }}>

          {/* CEO Node */}
          <div style={{
            padding: '10px 28px', borderRadius: 12,
            background: color, color: '#fff', textAlign: 'center',
            boxShadow: `0 4px 16px ${color}40`,
          }}>
            <div style={{ fontSize: 10, opacity: 0.75, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 2 }}>CEO &amp; Co-founder</div>
            <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '-0.03em' }}>{company.name} Leadership</div>
          </div>

          <div style={{ width: 1, height: 24, background: LINE_COLOR }} />

          {/* C-Suite row */}
          <div style={{ position: 'relative', paddingTop: 24 }}>
            <div style={{ position: 'absolute', top: 0, left: NODE_W / 2, right: NODE_W / 2, height: 1, background: LINE_COLOR }} />
            <div style={{ display: 'flex', gap: NODE_GAP }}>
              {execGroups.map(exec => {
                const isExpanded = expandedExec === exec.id
                return (
                  <div key={exec.id} style={{ width: NODE_W, position: 'relative' }}>
                    <div style={{ position: 'absolute', top: -24, left: '50%', marginLeft: -0.5, width: 1, height: 24, background: LINE_COLOR }} />
                    <button
                      onClick={() => handleExecClick(exec.id)}
                      style={{
                        width: '100%', padding: '10px 6px', borderRadius: 10,
                        border: isExpanded ? `2px solid ${color}` : '1.5px solid #E4E4E7',
                        background: isExpanded ? `${color}08` : '#fff',
                        cursor: 'pointer', textAlign: 'center',
                        transition: 'border-color 0.15s, background 0.15s, box-shadow 0.15s',
                        boxShadow: isExpanded ? `0 2px 12px ${color}25` : '0 1px 3px rgba(0,0,0,0.05)',
                        position: 'relative',
                      }}
                      onMouseEnter={e => { if (!isExpanded) { const el = e.currentTarget as HTMLElement; el.style.borderColor = '#D4D4D8'; el.style.background = '#FAFAFA' } }}
                      onMouseLeave={e => { if (!isExpanded) { const el = e.currentTarget as HTMLElement; el.style.borderColor = '#E4E4E7'; el.style.background = '#fff' } }}
                    >
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: isExpanded ? color : '#F4F4F5', margin: '0 auto 6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: isExpanded ? '#fff' : '#A1A1AA', fontSize: 11, fontWeight: 800 }}>{exec.shortTitle.slice(0, 2)}</span>
                      </div>
                      <div style={{ color: isExpanded ? color : '#09090B', fontSize: 11.5, fontWeight: 700, lineHeight: 1.2, marginBottom: 3 }}>{exec.shortTitle}</div>
                      <div style={{ color: '#A1A1AA', fontSize: 10 }}>{exec.depts.length} teams</div>
                      {isExpanded && (
                        <div style={{ position: 'absolute', bottom: -10, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: `7px solid ${color}` }} />
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── DEPARTMENT PANEL ──────────────────────────────────────────────────── */}
      {activeExec && (
        <div style={{ marginTop: 24 }}>
          <div style={{ padding: '10px 16px', borderRadius: '12px 12px 0 0', background: '#F7F7F8', border: '1px solid #E4E4E7', borderBottom: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
            <div style={{ color: '#09090B', fontSize: 13, fontWeight: 700 }}>{activeExec.title}</div>
            <div style={{ color: '#A1A1AA', fontSize: 12 }}>
              · {activeExec.depts.reduce((s, d) => s + d.headcount, 0)} people across {activeExec.depts.length} departments
            </div>
          </div>
          <div style={{ padding: 16, borderRadius: '0 0 12px 12px', background: '#F7F7F8', border: '1px solid #E4E4E7', borderTop: 'none', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {activeExec.depts.map(dept => {
              const isSelected = selectedDept === dept.id
              return (
                <button
                  key={dept.id}
                  onClick={() => handleDeptClick(dept.id)}
                  style={{
                    padding: '12px 16px', borderRadius: 10,
                    border: isSelected ? `2px solid ${dept.color}` : '1.5px solid #E4E4E7',
                    background: isSelected ? `${dept.color}0D` : '#fff',
                    cursor: 'pointer', textAlign: 'left',
                    transition: 'border-color 0.15s, background 0.15s, box-shadow 0.15s',
                    minWidth: 150,
                    boxShadow: isSelected ? `0 2px 10px ${dept.color}25` : '0 1px 3px rgba(0,0,0,0.05)',
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

      {/* ── ROLES PANEL (flat — no expansion) ────────────────────────────────── */}
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
                <span style={{
                  padding: '2px 8px', borderRadius: 6,
                  background: `${role.levelColor}15`, color: role.levelColor,
                  fontSize: 10.5, fontWeight: 700, flexShrink: 0,
                }}>
                  {role.level}
                </span>
                <span style={{ color: '#09090B', fontSize: 13, fontWeight: 600 }}>{role.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!activeExec && (
        <div style={{ marginTop: 24, textAlign: 'center', padding: '32px 16px', color: '#A1A1AA', fontSize: 12.5 }}>
          Click on an executive above to explore their team and departments.
        </div>
      )}
    </div>
  )
}
