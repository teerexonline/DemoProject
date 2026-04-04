'use client'

import { useState } from 'react'

interface Company {
  id: string
  name: string
  logo_color: string | null
  employees: number | null
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface JobPosting {
  id: string
  title: string
  level: string
  levelColor: string
  tools: string[]
  skills: string[]
  processes: string[]
  interviewQuestions: string[]
}

interface Dept {
  id: string
  name: string
  icon: string
  color: string
  headcount: number
  postings: JobPosting[]
}

interface ExecRole {
  id: string
  title: string
  shortTitle: string
  depts: Dept[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LEVEL_COLORS: Record<string, string> = {
  'L3': '#10B981',
  'L4': '#3B82F6',
  'L5': '#7C3AED',
  'L6': '#F59E0B',
  'L7 / Staff': '#EF4444',
  'Manager': '#06B6D4',
  'Director': '#8B5CF6',
  'VP': '#F97316',
}

function jp(
  id: string, title: string, level: string, _year: number,
  tools: string[], skills: string[], processes: string[], questions: string[]
): JobPosting {
  return { id, title, level, levelColor: LEVEL_COLORS[level] ?? '#71717A', tools, skills, processes, interviewQuestions: questions }
}

// ─── Job Posting Data (Generic Placeholders) ──────────────────────────────────

const ENG_POSTINGS: JobPosting[] = [
  jp('e1', 'Senior Software Engineer', 'L5', 2023,
    ['GitHub', 'Docker', 'Kubernetes', 'Datadog'],
    ['Distributed systems', 'API design', 'Code review', 'Mentorship'],
    ['6-week planning cycles', 'On-call rotation', 'Design docs required before coding'],
    ['Design a URL shortener at scale.', 'Tell me about a time you improved system reliability.', 'How do you prioritize technical debt vs. new features?']
  ),
  jp('e2', 'Staff Engineer', 'L7 / Staff', 2022,
    ['GitHub', 'Terraform', 'AWS', 'Snowflake', 'Buildkite'],
    ['System architecture', 'Cross-team alignment', 'Technical strategy', 'Mentorship'],
    ['RFC process', 'Architecture review board', 'Quarterly engineering roadmap'],
    ['How do you influence without direct authority?', 'Walk me through an architectural decision you regret.', 'How do you measure engineering impact beyond shipping code?']
  ),
  jp('e3', 'Engineering Manager', 'Manager', 2023,
    ['Linear', 'Notion', 'GitHub', 'Datadog', 'Lattice'],
    ['People management', 'Sprint planning', 'Performance reviews', 'Recruiting', 'Technical leadership'],
    ['Weekly 1:1s', 'OKR setting', 'Bi-annual performance cycles'],
    ['How do you handle an underperforming engineer?', 'Tell me about a team conflict you resolved.', 'How do you balance shipping velocity vs. engineering quality?']
  ),
]

const INFRA_POSTINGS: JobPosting[] = [
  jp('i1', 'Senior DevOps Engineer', 'L5', 2023,
    ['Terraform', 'Kubernetes', 'AWS', 'Datadog', 'PagerDuty'],
    ['Infrastructure as Code', 'CI/CD pipeline design', 'Incident response', 'Cost optimization'],
    ['On-call rotation', 'Blameless post-mortems within 48h', 'Change management windows'],
    ['How do you design a zero-downtime deployment pipeline?', 'Describe your approach to a major incident.', 'How have you reduced cloud costs without degrading reliability?']
  ),
  jp('i2', 'Site Reliability Engineer', 'L4', 2022,
    ['Prometheus', 'Grafana', 'AWS', 'Docker', 'Terraform'],
    ['SLO/SLA definition', 'Monitoring setup', 'Runbook creation', 'Capacity planning'],
    ['Error budget review process', 'Weekly reliability stand-up', 'Incident post-mortem culture'],
    ['What metrics do you use to measure service reliability?', 'Walk me through a major incident you owned.', 'How do you balance developer velocity with operational stability?']
  ),
]

const SECURITY_POSTINGS: JobPosting[] = [
  jp('s1', 'Security Engineer', 'L5', 2023,
    ['Snyk', 'Okta', 'AWS Security Hub', 'CrowdStrike', 'Splunk'],
    ['Threat modeling', 'Penetration testing', 'Zero trust architecture', 'Vulnerability management'],
    ['Security review for all new features', 'Quarterly penetration tests', 'Vulnerability disclosure process'],
    ['How do you approach threat modeling for a new feature?', 'Describe your experience with zero trust architecture.', 'Tell me about a security incident you investigated and resolved.']
  ),
]

const PRODUCT_POSTINGS: JobPosting[] = [
  jp('p1', 'Senior Product Manager', 'L5', 2023,
    ['Figma', 'Linear', 'Mixpanel', 'Notion', 'Amplitude'],
    ['Product strategy', 'User research', 'PRD writing', 'Data analysis', 'Stakeholder management'],
    ['Monthly product reviews', 'Design sprints', 'Weekly user interview cadence'],
    ['Tell me about a feature you killed and why.', 'How do you prioritize a backlog when everything is urgent?', 'Describe a data-driven decision that changed your product direction.', 'How do you handle disagreement with engineering?']
  ),
  jp('p2', 'Product Manager', 'L4', 2022,
    ['Amplitude', 'Notion', 'Linear', 'Figma', 'FullStory'],
    ['A/B testing', 'Metrics definition', 'Feature scoping', 'Sprint collaboration'],
    ['Weekly grooming', 'Monthly roadmap reviews', 'Bi-weekly metrics reviews'],
    ['What makes a good product metric?', 'Walk me through your product development process.', 'How do you validate assumptions cheaply before building?']
  ),
  jp('p3', 'Director of Product', 'Director', 2021,
    ['Figma', 'Tableau', 'Notion', 'Salesforce', 'Linear'],
    ['Portfolio management', 'Team leadership', 'Go-to-market strategy', 'Platform thinking'],
    ['Quarterly OKR process', 'Exec-level roadmap reporting', 'Annual strategy reviews'],
    ['How do you build a product-driven culture?', 'Tell me about a long-term platform bet you made and how it played out.', 'How do you manage and develop multiple product managers?']
  ),
]

const DESIGN_POSTINGS: JobPosting[] = [
  jp('d1', 'Senior Product Designer', 'L5', 2023,
    ['Figma', 'Principle', 'Storybook', 'Zeroheight', 'Miro'],
    ['UX research', 'Interaction design', 'Design systems', 'Prototyping', 'Accessibility'],
    ['Weekly design crits', 'Bi-weekly cross-functional reviews', 'Design system contribution required'],
    ['Show me a project where you pushed back on requirements.', 'How do you balance user needs with business constraints?', 'Tell me about a design systems contribution you made.']
  ),
  jp('d2', 'Design Lead', 'Manager', 2022,
    ['Figma', 'Notion', 'Miro', 'UserTesting', 'Lookback'],
    ['Design leadership', 'Cross-functional collaboration', 'Portfolio reviews', 'Mentorship'],
    ['Monthly design all-hands', 'Quarterly design sprints', 'Weekly critique sessions'],
    ['How do you scale design quality as the team grows?', 'Tell me about a design decision that directly improved a key metric.', 'How do you hire for design talent?']
  ),
]

const SALES_POSTINGS: JobPosting[] = [
  jp('sa1', 'Enterprise Account Executive', 'L5', 2023,
    ['Salesforce', 'Gong', 'Outreach', 'LinkedIn Sales Navigator', 'DocuSign'],
    ['Enterprise prospecting', 'Contract negotiation', 'Multi-stakeholder selling', 'Pipeline management'],
    ['Weekly pipeline reviews', 'Monthly QBRs', 'MEDDIC methodology', 'Quarterly forecasting'],
    ['Walk me through the most complex deal you have ever closed.', 'How do you handle a deal that goes dark for weeks?', 'Tell me about a deal you lost and what you learned.']
  ),
  jp('sa2', 'Sales Development Representative', 'L3', 2023,
    ['Outreach', 'LinkedIn', 'Salesforce', 'ZoomInfo', 'Orum'],
    ['Cold outreach', 'Prospect qualification', 'CRM hygiene', 'Discovery calls'],
    ['Daily standup', 'Weekly pipeline review', 'Monthly coaching sessions with managers'],
    ['How do you research a prospect before cold outreach?', 'Role-play: pitch our product in 60 seconds.', 'How do you stay motivated after repeated rejection?']
  ),
  jp('sa3', 'VP of Sales', 'VP', 2021,
    ['Salesforce', 'Clari', 'Gong', 'Tableau', 'Outreach'],
    ['Sales strategy', 'Team building', 'Quota setting', 'Revenue forecasting', 'Sales coaching'],
    ['Monthly board-level revenue reporting', 'Annual territory planning', 'Compensation plan design'],
    ['How do you build a sales team from scratch?', 'How do you forecast revenue with high confidence?', 'Tell me about your biggest pipeline miss and how you recovered.']
  ),
]

const SUCCESS_POSTINGS: JobPosting[] = [
  jp('cs1', 'Customer Success Manager', 'L4', 2023,
    ['Salesforce', 'Gainsight', 'Notion', 'Zoom', 'ChurnZero'],
    ['QBR delivery', 'Churn prevention', 'Upsell identification', 'Onboarding programs'],
    ['Monthly health score reviews', 'Quarterly business reviews with accounts', 'Executive sponsor program'],
    ['How do you handle a customer who is determined to churn?', 'Tell me about an expansion deal you identified and closed.', 'How do you manage 40+ accounts without dropping the ball?']
  ),
  jp('cs2', 'Director of Customer Success', 'Director', 2021,
    ['Gainsight', 'Salesforce', 'Tableau', 'Notion'],
    ['CSM team management', 'Churn forecasting', 'Playbook creation', 'Executive relationships'],
    ['Weekly team syncs', 'Monthly churn forecasting', 'Quarterly CSM career development reviews'],
    ['How do you build a customer success function from scratch?', 'What churn metrics matter most and why?', 'How do you enable CSMs to find upsell opportunities?']
  ),
]

const MARKETING_POSTINGS: JobPosting[] = [
  jp('m1', 'Product Marketing Manager', 'L5', 2023,
    ['HubSpot', 'Figma', 'Google Analytics', 'Notion', 'Salesforce'],
    ['Go-to-market strategy', 'Competitive positioning', 'Launch planning', 'Sales enablement'],
    ['Monthly GTM reviews', 'Quarterly messaging workshops', 'Win/loss analysis cadence'],
    ['How do you build a product positioning framework?', 'Tell me about a product launch you led end-to-end.', 'How do you enable the sales team on a complex new product?']
  ),
  jp('m2', 'Growth Marketing Manager', 'L4', 2022,
    ['Google Ads', 'Segment', 'Braze', 'Looker', 'Amplitude'],
    ['Paid acquisition', 'Email marketing', 'A/B testing', 'Attribution modeling'],
    ['Weekly performance reviews', 'Monthly budget reconciliation', 'Quarterly channel strategy review'],
    ['How do you measure marketing efficiency?', 'Tell me about a campaign that underperformed and what you did about it.', 'How do you think about marketing attribution across a long B2B sales cycle?']
  ),
]

const BRAND_POSTINGS: JobPosting[] = [
  jp('b1', 'Communications Manager', 'L4', 2022,
    ['Notion', 'PR Newswire', 'Muck Rack', 'Cision', 'Slack'],
    ['Media relations', 'Executive communications', 'Crisis communications', 'Brand storytelling'],
    ['Weekly comms review with leadership', 'Monthly press coverage reporting', 'Quarterly brand sentiment analysis'],
    ['How do you handle a public PR crisis?', 'Tell me about a story you successfully placed in a major publication.', 'How do you prepare executives for media interviews?']
  ),
]

const FINANCE_POSTINGS: JobPosting[] = [
  jp('f1', 'Senior Financial Analyst', 'L5', 2023,
    ['Netsuite', 'Adaptive Insights', 'Excel', 'Tableau', 'Snowflake'],
    ['Financial modeling', 'Variance analysis', 'FP&A', 'Board reporting', 'Scenario planning'],
    ['Monthly close process', 'Quarterly forecast cycle', 'Annual operating plan'],
    ['Walk me through building a 3-statement financial model.', 'How do you build a reliable bottom-up forecast?', 'Tell me about a financial insight that changed a major business decision.']
  ),
  jp('f2', 'Finance Manager', 'Manager', 2022,
    ['Netsuite', 'Adaptive', 'Tableau', 'Excel', 'Notion'],
    ['Team management', 'Budget oversight', 'Stakeholder reporting', 'Process improvement'],
    ['Monthly leadership budget reviews', 'Quarterly reforecasts', 'Annual planning cycle'],
    ['How do you build finance business partner relationships?', 'How do you improve forecast accuracy?', 'Tell me about a time finance influenced a major strategic decision.']
  ),
]

const ACCOUNTING_POSTINGS: JobPosting[] = [
  jp('ac1', 'Senior Accountant', 'L4', 2022,
    ['Netsuite', 'Excel', 'FloQast', 'Concur', 'Tipalti'],
    ['Revenue recognition (ASC 606)', 'Month-end close', 'Reconciliations', 'Audit support'],
    ['15-day close cycle', 'Quarterly audit support', 'Monthly expense review process'],
    ['How do you ensure accuracy during a fast close?', 'Walk me through your month-end close checklist.', 'Explain ASC 606 and how it impacts SaaS revenue recognition.']
  ),
]

const RECRUITING_POSTINGS: JobPosting[] = [
  jp('r1', 'Senior Technical Recruiter', 'L5', 2023,
    ['Greenhouse', 'LinkedIn Recruiter', 'Gem', 'Notion', 'Calendly'],
    ['Technical sourcing', 'Employer branding', 'Candidate experience design', 'Offer negotiation'],
    ['Weekly hiring reviews with engineering managers', 'Monthly pipeline analytics reporting', 'Quarterly recruiter calibrations'],
    ['How do you source passive senior engineering talent?', 'Tell me about the hardest hire you ever closed.', 'How do you reduce time-to-hire without sacrificing quality?']
  ),
  jp('r2', 'Recruiting Coordinator', 'L3', 2023,
    ['Greenhouse', 'Google Calendar', 'Notion', 'Zoom', 'Slack'],
    ['Interview scheduling', 'Candidate communication', 'Offer letter processing', 'Data reporting'],
    ['Daily scheduling queue management', 'Weekly recruiter syncs', 'Monthly coordinator process reviews'],
    ['How do you manage a high-volume interview schedule without errors?', 'Tell me about a time you improved the candidate experience.', 'How do you handle last-minute reschedules?']
  ),
]

const PEOPLE_POSTINGS: JobPosting[] = [
  jp('pe1', 'HR Business Partner', 'L5', 2022,
    ['Workday', 'Lattice', 'Greenhouse', 'Slack', 'Notion'],
    ['Performance management', 'Employee relations', 'Change management', 'L&D program design'],
    ['Bi-annual performance cycles', 'Monthly town halls', 'Quarterly engagement surveys'],
    ['How do you handle a conflict between a manager and their direct report?', 'Tell me about an L&D program you built from scratch.', 'How do you measure and improve employee engagement?']
  ),
]

// ─── Org Structure ────────────────────────────────────────────────────────────

const EXEC_ROLES: ExecRole[] = [
  {
    id: 'cto', title: 'Chief Technology Officer', shortTitle: 'CTO',
    depts: [
      { id: 'engineering', name: 'Engineering', icon: '💻', color: '#3B82F6', headcount: 210, postings: ENG_POSTINGS },
      { id: 'infrastructure', name: 'Infrastructure', icon: '🔧', color: '#6366F1', headcount: 45, postings: INFRA_POSTINGS },
      { id: 'security', name: 'Security', icon: '🛡️', color: '#8B5CF6', headcount: 28, postings: SECURITY_POSTINGS },
    ]
  },
  {
    id: 'cpo', title: 'Chief Product Officer', shortTitle: 'CPO',
    depts: [
      { id: 'product', name: 'Product', icon: '🎯', color: '#7C3AED', headcount: 85, postings: PRODUCT_POSTINGS },
      { id: 'design', name: 'Design', icon: '🎨', color: '#A855F7', headcount: 42, postings: DESIGN_POSTINGS },
    ]
  },
  {
    id: 'cfo', title: 'Chief Financial Officer', shortTitle: 'CFO',
    depts: [
      { id: 'finance', name: 'Finance', icon: '📊', color: '#10B981', headcount: 38, postings: FINANCE_POSTINGS },
      { id: 'accounting', name: 'Accounting', icon: '📝', color: '#059669', headcount: 22, postings: ACCOUNTING_POSTINGS },
    ]
  },
  {
    id: 'cro', title: 'Chief Revenue Officer', shortTitle: 'CRO',
    depts: [
      { id: 'sales', name: 'Sales', icon: '🤝', color: '#F59E0B', headcount: 180, postings: SALES_POSTINGS },
      { id: 'success', name: 'Customer Success', icon: '⭐', color: '#F97316', headcount: 95, postings: SUCCESS_POSTINGS },
    ]
  },
  {
    id: 'cmo', title: 'Chief Marketing Officer', shortTitle: 'CMO',
    depts: [
      { id: 'marketing', name: 'Marketing', icon: '📢', color: '#EF4444', headcount: 65, postings: MARKETING_POSTINGS },
      { id: 'brand', name: 'Brand & Comms', icon: '🌟', color: '#F43F5E', headcount: 22, postings: BRAND_POSTINGS },
    ]
  },
  {
    id: 'chro', title: 'Chief Human Resources Officer', shortTitle: 'CHRO',
    depts: [
      { id: 'recruiting', name: 'Talent Acquisition', icon: '🔍', color: '#06B6D4', headcount: 30, postings: RECRUITING_POSTINGS },
      { id: 'people', name: 'People & Culture', icon: '💙', color: '#0EA5E9', headcount: 18, postings: PEOPLE_POSTINGS },
    ]
  },
]

// ─── Layout constants ─────────────────────────────────────────────────────────

const NODE_W = 130
const NODE_GAP = 8
const LINE_COLOR = '#D4D4D8'
const TREE_MIN_W = NODE_W * EXEC_ROLES.length + NODE_GAP * (EXEC_ROLES.length - 1)

// ─── Component ────────────────────────────────────────────────────────────────

export default function OrgChart({ company }: { company: Company }) {
  const color = company.logo_color ?? '#7C3AED'

  const [expandedExec, setExpandedExec] = useState<string | null>('cto')
  const [selectedDept, setSelectedDept] = useState<string | null>('engineering')
  const [expandedPostings, setExpandedPostings] = useState<Set<string>>(new Set())

  // The dept data currently selected for the job postings panel
  const selectedDeptData: Dept | undefined =
    expandedExec
      ? EXEC_ROLES.find(e => e.id === expandedExec)?.depts.find(d => d.id === selectedDept)
      : undefined

  function handleExecClick(execId: string) {
    if (expandedExec === execId) {
      setExpandedExec(null)
      setSelectedDept(null)
    } else {
      setExpandedExec(execId)
      const exec = EXEC_ROLES.find(e => e.id === execId)
      setSelectedDept(exec?.depts[0]?.id ?? null)
      setExpandedPostings(new Set())
    }
  }

  function handleDeptClick(deptId: string) {
    setSelectedDept(prev => {
      if (prev === deptId) return null
      setExpandedPostings(new Set())
      return deptId
    })
  }

  function togglePosting(postingId: string) {
    setExpandedPostings(prev => {
      const next = new Set(prev)
      if (next.has(postingId)) next.delete(postingId)
      else next.add(postingId)
      return next
    })
  }

  const activeExec = expandedExec ? EXEC_ROLES.find(e => e.id === expandedExec) : null

  return (
    <div>
      {/* Section header */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ color: '#09090B', fontSize: 15, fontWeight: 800, letterSpacing: '-0.04em', marginBottom: 2 }}>Org Chart</div>
          <div style={{ color: '#71717A', fontSize: 12, lineHeight: 1.5 }}>
            {company.employees?.toLocaleString() ?? '—'} employees · Click an executive to explore their team &amp; departments
          </div>
        </div>
        <div style={{ padding: '4px 10px', borderRadius: 8, background: '#F5F3FF', border: '1px solid #DDD6FE', color: '#7C3AED', fontSize: 11.5, fontWeight: 600 }}>
          {EXEC_ROLES.reduce((s, e) => s + e.depts.reduce((ds, d) => ds + d.headcount, 0), 0).toLocaleString()} across {EXEC_ROLES.reduce((s, e) => s + e.depts.length, 0)} departments
        </div>
      </div>

      {/* ── TREE ────────────────────────────────────────────────────────────── */}
      <div style={{ overflowX: 'auto', paddingBottom: 8, WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'] }}>
        {/* Outer centering shell */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: TREE_MIN_W }}>

          {/* CEO Node */}
          <div style={{
            padding: '10px 28px',
            borderRadius: 12,
            background: color,
            color: '#fff',
            textAlign: 'center',
            boxShadow: `0 4px 16px ${color}40`,
          }}>
            <div style={{ fontSize: 10, opacity: 0.75, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 2 }}>CEO &amp; Co-founder</div>
            <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '-0.03em' }}>{company.name} Leadership</div>
          </div>

          {/* Vertical line CEO → horizontal bar */}
          <div style={{ width: 1, height: 24, background: LINE_COLOR }} />

          {/* C-Suite row with horizontal connector */}
          <div style={{ position: 'relative', paddingTop: 24 }}>
            {/* Horizontal connector line (first-child-center → last-child-center) */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: NODE_W / 2,
              right: NODE_W / 2,
              height: 1,
              background: LINE_COLOR,
            }} />

            <div style={{ display: 'flex', gap: NODE_GAP }}>
              {EXEC_ROLES.map(exec => {
                const isExpanded = expandedExec === exec.id
                return (
                  <div key={exec.id} style={{ width: NODE_W, position: 'relative' }}>
                    {/* Vertical line from horizontal bar → exec card */}
                    <div style={{
                      position: 'absolute',
                      top: -24,
                      left: '50%',
                      marginLeft: -0.5,
                      width: 1,
                      height: 24,
                      background: LINE_COLOR,
                    }} />

                    {/* Exec card */}
                    <button
                      onClick={() => handleExecClick(exec.id)}
                      style={{
                        width: '100%',
                        padding: '10px 6px',
                        borderRadius: 10,
                        border: isExpanded ? `2px solid ${color}` : '1.5px solid #E4E4E7',
                        background: isExpanded ? `${color}08` : '#fff',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'border-color 0.15s, background 0.15s, box-shadow 0.15s',
                        boxShadow: isExpanded ? `0 2px 12px ${color}25` : '0 1px 3px rgba(0,0,0,0.05)',
                        position: 'relative',
                      }}
                      onMouseEnter={e => {
                        if (!isExpanded) {
                          const el = e.currentTarget as HTMLElement
                          el.style.borderColor = '#D4D4D8'
                          el.style.background = '#FAFAFA'
                        }
                      }}
                      onMouseLeave={e => {
                        if (!isExpanded) {
                          const el = e.currentTarget as HTMLElement
                          el.style.borderColor = '#E4E4E7'
                          el.style.background = '#fff'
                        }
                      }}
                    >
                      {/* Avatar */}
                      <div style={{
                        width: 30, height: 30, borderRadius: '50%',
                        background: isExpanded ? color : '#F4F4F5',
                        margin: '0 auto 6px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <span style={{ color: isExpanded ? '#fff' : '#A1A1AA', fontSize: 11, fontWeight: 800 }}>
                          {exec.shortTitle.slice(0, 2)}
                        </span>
                      </div>

                      <div style={{
                        color: isExpanded ? color : '#09090B',
                        fontSize: 11.5, fontWeight: 700, lineHeight: 1.2, marginBottom: 3,
                      }}>
                        {exec.shortTitle}
                      </div>
                      <div style={{ color: '#A1A1AA', fontSize: 10 }}>
                        {exec.depts.length} teams
                      </div>

                      {/* Expanded indicator arrow */}
                      {isExpanded && (
                        <div style={{
                          position: 'absolute', bottom: -10, left: '50%', transform: 'translateX(-50%)',
                          width: 0, height: 0,
                          borderLeft: '6px solid transparent',
                          borderRight: '6px solid transparent',
                          borderTop: `7px solid ${color}`,
                          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))',
                        }} />
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
          {/* Exec header bar */}
          <div style={{
            padding: '10px 16px',
            borderRadius: '12px 12px 0 0',
            background: '#F7F7F8',
            border: '1px solid #E4E4E7',
            borderBottom: 'none',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
            <div style={{ color: '#09090B', fontSize: 13, fontWeight: 700 }}>{activeExec.title}</div>
            <div style={{ color: '#A1A1AA', fontSize: 12 }}>
              · {activeExec.depts.reduce((s, d) => s + d.headcount, 0)} people across {activeExec.depts.length} departments
            </div>
          </div>

          {/* Department cards */}
          <div style={{
            padding: 16,
            borderRadius: '0 0 12px 12px',
            background: '#F7F7F8',
            border: '1px solid #E4E4E7',
            borderTop: 'none',
            display: 'flex', gap: 10, flexWrap: 'wrap',
          }}>
            {activeExec.depts.map(dept => {
              const isSelected = selectedDept === dept.id
              return (
                <button
                  key={dept.id}
                  onClick={() => handleDeptClick(dept.id)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 10,
                    border: isSelected ? `2px solid ${dept.color}` : '1.5px solid #E4E4E7',
                    background: isSelected ? `${dept.color}0D` : '#fff',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'border-color 0.15s, background 0.15s, box-shadow 0.15s',
                    minWidth: 150,
                    boxShadow: isSelected ? `0 2px 10px ${dept.color}25` : '0 1px 3px rgba(0,0,0,0.05)',
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) {
                      const el = e.currentTarget as HTMLElement
                      el.style.borderColor = '#D4D4D8'
                      el.style.background = '#FAFAFA'
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) {
                      const el = e.currentTarget as HTMLElement
                      el.style.borderColor = '#E4E4E7'
                      el.style.background = '#fff'
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                    <span style={{ fontSize: 16 }}>{dept.icon}</span>
                    <span style={{ color: isSelected ? dept.color : '#09090B', fontSize: 13, fontWeight: 700 }}>
                      {dept.name}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <span style={{ color: '#71717A', fontSize: 11 }}>👥 {dept.headcount} people</span>
                    <span style={{ color: '#71717A', fontSize: 11 }}>📋 {dept.postings.length} roles</span>
                  </div>
                  {isSelected && (
                    <div style={{ marginTop: 6, color: dept.color, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                      Viewing roles ↓
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── JOB POSTINGS PANEL ────────────────────────────────────────────────── */}
      {selectedDeptData && (
        <div style={{ marginTop: 16 }}>
          {/* Panel header */}
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid #F0F0F2',
            display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: 18 }}>{selectedDeptData.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ color: '#09090B', fontSize: 14, fontWeight: 800, letterSpacing: '-0.03em' }}>
                {selectedDeptData.name}
              </span>
              <span style={{ color: '#A1A1AA', fontSize: 12, marginLeft: 8 }}>— Roles &amp; Positions</span>
            </div>
            <div style={{ color: '#A1A1AA', fontSize: 12, flexShrink: 0 }}>
              {selectedDeptData.postings.length} role{selectedDeptData.postings.length !== 1 ? 's' : ''}
            </div>
          </div>

          <div style={{ color: '#71717A', fontSize: 11.5, padding: '8px 16px 12px', lineHeight: 1.5 }}>
            Roles this team has hired for — expand any to see the tools, skills, processes, and likely interview questions.
          </div>

          {/* Posting accordion list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {selectedDeptData.postings.map(posting => {
              const isOpen = expandedPostings.has(posting.id)
              return (
                <div
                  key={posting.id}
                  style={{
                    borderRadius: 12,
                    border: `1px solid ${isOpen ? '#E4E4E7' : '#EBEBED'}`,
                    overflow: 'hidden',
                    transition: 'border-color 0.15s',
                    background: '#fff',
                  }}
                >
                  {/* Accordion header */}
                  <button
                    onClick={() => togglePosting(posting.id)}
                    style={{
                      width: '100%',
                      padding: '13px 16px',
                      background: isOpen ? '#FAFAFA' : '#fff',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      textAlign: 'left',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => { if (!isOpen) (e.currentTarget as HTMLElement).style.background = '#FAFAFA' }}
                    onMouseLeave={e => { if (!isOpen) (e.currentTarget as HTMLElement).style.background = '#fff' }}
                  >
                    {/* Level badge */}
                    <span style={{
                      padding: '2px 8px', borderRadius: 6,
                      background: `${posting.levelColor}18`,
                      color: posting.levelColor,
                      fontSize: 10.5, fontWeight: 700,
                      flexShrink: 0, whiteSpace: 'nowrap',
                    }}>
                      {posting.level}
                    </span>

                    {/* Title */}
                    <span style={{ flex: 1, color: '#09090B', fontSize: 13, fontWeight: 600, minWidth: 0 }}>
                      {posting.title}
                    </span>

                    {/* Chevron */}
                    <span style={{
                      width: 20, height: 20, borderRadius: '50%',
                      background: '#F4F4F5',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#71717A', fontSize: 10, flexShrink: 0,
                      transition: 'transform 0.2s',
                      transform: isOpen ? 'rotate(180deg)' : 'none',
                    }}>
                      ▼
                    </span>
                  </button>

                  {/* Accordion body */}
                  {isOpen && (
                    <div style={{ padding: '0 16px 16px', borderTop: '1px solid #F0F0F2' }}>
                      {/* Three-column grid: Tools / Skills / Processes */}
                      <div className="co-3col" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 14 }}>

                        {/* Tools */}
                        <div style={{ padding: 12, borderRadius: 10, background: '#F7F7F8', border: '1px solid #F0F0F2' }}>
                          <div style={{ color: '#71717A', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                            🔧 Tools
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                            {posting.tools.map(t => (
                              <span key={t} style={{
                                padding: '3px 8px', borderRadius: 5,
                                background: '#fff', border: '1px solid #E4E4E7',
                                color: '#374151', fontSize: 11, fontWeight: 500,
                              }}>
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Skills */}
                        <div style={{ padding: 12, borderRadius: 10, background: '#F7F7F8', border: '1px solid #F0F0F2' }}>
                          <div style={{ color: '#71717A', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                            ⚡ Key Skills
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                            {posting.skills.map(s => (
                              <span key={s} style={{
                                padding: '3px 8px', borderRadius: 5,
                                background: '#EFF6FF', border: '1px solid #BFDBFE',
                                color: '#1D4ED8', fontSize: 11,
                              }}>
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Processes */}
                        <div style={{ padding: 12, borderRadius: 10, background: '#F7F7F8', border: '1px solid #F0F0F2' }}>
                          <div style={{ color: '#71717A', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                            ⚙️ Processes
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            {posting.processes.map(p => (
                              <div key={p} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                                <span style={{ color: '#10B981', fontSize: 11, lineHeight: '18px', flexShrink: 0 }}>•</span>
                                <span style={{ color: '#52525B', fontSize: 11, lineHeight: 1.5 }}>{p}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Interview Prep */}
                      <div style={{
                        marginTop: 10, padding: '12px 14px',
                        borderRadius: 10, background: '#F5F3FF', border: '1px solid #DDD6FE',
                      }}>
                        <div style={{ color: '#6D28D9', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                          🎯 Interview Prep — Likely Questions
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                          {posting.interviewQuestions.map((q, i) => (
                            <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                              <span style={{
                                width: 18, height: 18, borderRadius: '50%',
                                background: '#7C3AED', color: '#fff',
                                fontSize: 9.5, fontWeight: 800,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0, marginTop: 1,
                              }}>
                                {i + 1}
                              </span>
                              <span style={{ color: '#3B0764', fontSize: 12.5, lineHeight: 1.55 }}>{q}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Empty state when no exec selected */}
      {!activeExec && (
        <div style={{ marginTop: 24, textAlign: 'center', padding: '32px 16px', color: '#A1A1AA', fontSize: 12.5 }}>
          Click on an executive above to explore their team, departments, and historical job postings.
        </div>
      )}
    </div>
  )
}
