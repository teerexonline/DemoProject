// Shared job role data — used by OrgChart, Internal Tools & Processes, and Interview Prep

export interface JobRole {
  id: string
  title: string
  level: string
  levelColor: string
  tools: string[]
  skills: string[]
  processes: string[]
  interviewQuestions: string[]
  keywords: string[]
}

export interface Dept {
  id: string
  name: string
  icon: string
  color: string
  headcount: number
  roles: JobRole[]
}

export interface ExecGroup {
  id: string
  title: string
  shortTitle: string
  depts: Dept[]
}

export const LEVEL_COLORS: Record<string, string> = {
  'L3':         '#10B981',
  'L4':         '#3B82F6',
  'L5':         '#063f76',
  'L6':         '#F59E0B',
  'L7 / Staff': '#EF4444',
  'Manager':    '#06B6D4',
  'Director':   '#063f76',
  'VP':         '#F97316',
}

function r(
  id: string, title: string, level: string,
  tools: string[], skills: string[], processes: string[],
  interviewQuestions: string[], keywords: string[]
): JobRole {
  return { id, title, level, levelColor: LEVEL_COLORS[level] ?? '#71717A', tools, skills, processes, interviewQuestions, keywords }
}

// ─── Engineering ──────────────────────────────────────────────────────────────

const ENG_ROLES: JobRole[] = [
  r('e1', 'Senior Software Engineer', 'L5',
    ['GitHub', 'Docker', 'Kubernetes', 'Datadog'],
    ['Distributed systems', 'API design', 'Code review', 'Mentorship'],
    ['6-week planning cycles', 'On-call rotation', 'Design docs before coding'],
    ['Design a URL shortener at scale.', 'Tell me about a time you improved system reliability.', 'How do you prioritize technical debt vs. new features?'],
    ['distributed systems', 'microservices', 'API design', 'scalability', 'incident response', 'technical mentorship', 'code quality']
  ),
  r('e2', 'Staff Engineer', 'L7 / Staff',
    ['GitHub', 'Terraform', 'AWS', 'Snowflake', 'Buildkite'],
    ['System architecture', 'Cross-team alignment', 'Technical strategy', 'Mentorship'],
    ['RFC process', 'Architecture review board', 'Quarterly engineering roadmap'],
    ['How do you influence without direct authority?', 'Walk me through an architectural decision you regret.', 'How do you measure engineering impact beyond shipping code?'],
    ['technical leadership', 'system design', 'architecture', 'RFC', 'engineering strategy', 'cross-functional influence', 'tech debt']
  ),
  r('e3', 'Engineering Manager', 'Manager',
    ['Linear', 'Notion', 'GitHub', 'Datadog', 'Lattice'],
    ['People management', 'Sprint planning', 'Performance reviews', 'Recruiting', 'Technical leadership'],
    ['Weekly 1:1s', 'OKR setting', 'Bi-annual performance cycles'],
    ['How do you handle an underperforming engineer?', 'Tell me about a team conflict you resolved.', 'How do you balance shipping velocity vs. engineering quality?'],
    ['people management', 'OKRs', 'engineering velocity', 'headcount planning', 'performance management', 'retention', 'hiring']
  ),
]

// ─── Infrastructure ────────────────────────────────────────────────────────────

const INFRA_ROLES: JobRole[] = [
  r('i1', 'Senior DevOps Engineer', 'L5',
    ['Terraform', 'Kubernetes', 'AWS', 'Datadog', 'PagerDuty'],
    ['Infrastructure as Code', 'CI/CD pipeline design', 'Incident response', 'Cost optimization'],
    ['On-call rotation', 'Blameless post-mortems within 48h', 'Change management windows'],
    ['How do you design a zero-downtime deployment pipeline?', 'Describe your approach to a major incident.', 'How have you reduced cloud costs without degrading reliability?'],
    ['IaC', 'CI/CD', 'zero-downtime deployments', 'GitOps', 'infrastructure scaling', 'cost optimization', 'SRE practices']
  ),
  r('i2', 'Site Reliability Engineer', 'L4',
    ['Prometheus', 'Grafana', 'AWS', 'Docker', 'Terraform'],
    ['SLO/SLA definition', 'Monitoring setup', 'Runbook creation', 'Capacity planning'],
    ['Error budget review process', 'Weekly reliability stand-up', 'Incident post-mortem culture'],
    ['What metrics do you use to measure service reliability?', 'Walk me through a major incident you owned.', 'How do you balance developer velocity with operational stability?'],
    ['SLOs', 'error budgets', 'toil reduction', 'reliability engineering', 'observability', 'runbooks', 'capacity planning']
  ),
]

// ─── Security ──────────────────────────────────────────────────────────────────

const SECURITY_ROLES: JobRole[] = [
  r('s1', 'Security Engineer', 'L5',
    ['Snyk', 'Okta', 'AWS Security Hub', 'CrowdStrike', 'Splunk'],
    ['Threat modeling', 'Penetration testing', 'Zero trust architecture', 'Vulnerability management'],
    ['Security review for all new features', 'Quarterly penetration tests', 'Vulnerability disclosure process'],
    ['How do you approach threat modeling for a new feature?', 'Describe your experience with zero trust architecture.', 'Tell me about a security incident you investigated and resolved.'],
    ['zero trust', 'threat modeling', 'shift-left security', 'vulnerability management', 'security posture', 'DevSecOps', 'cloud security']
  ),
]

// ─── Product ───────────────────────────────────────────────────────────────────

const PRODUCT_ROLES: JobRole[] = [
  r('p1', 'Senior Product Manager', 'L5',
    ['Figma', 'Linear', 'Mixpanel', 'Notion', 'Amplitude'],
    ['Product strategy', 'User research', 'PRD writing', 'Data analysis', 'Stakeholder management'],
    ['Monthly product reviews', 'Design sprints', 'Weekly user interview cadence'],
    ['Tell me about a feature you killed and why.', 'How do you prioritize a backlog when everything is urgent?', 'Describe a data-driven decision that changed your product direction.', 'How do you handle disagreement with engineering?'],
    ['product strategy', 'user research', 'OKRs', 'data-driven decisions', 'roadmap prioritization', 'product-market fit', 'metrics definition']
  ),
  r('p2', 'Product Manager', 'L4',
    ['Amplitude', 'Notion', 'Linear', 'Figma', 'FullStory'],
    ['A/B testing', 'Metrics definition', 'Feature scoping', 'Sprint collaboration'],
    ['Weekly grooming', 'Monthly roadmap reviews', 'Bi-weekly metrics reviews'],
    ['What makes a good product metric?', 'Walk me through your product development process.', 'How do you validate assumptions cheaply before building?'],
    ['A/B testing', 'north star metric', 'user stories', 'discovery', 'agile', 'prioritization frameworks', 'experimentation']
  ),
  r('p3', 'Director of Product', 'Director',
    ['Figma', 'Tableau', 'Notion', 'Salesforce', 'Linear'],
    ['Portfolio management', 'Team leadership', 'Go-to-market strategy', 'Platform thinking'],
    ['Quarterly OKR process', 'Exec-level roadmap reporting', 'Annual strategy reviews'],
    ['How do you build a product-driven culture?', 'Tell me about a long-term platform bet you made.', 'How do you manage and develop multiple product managers?'],
    ['portfolio management', 'platform thinking', 'go-to-market', 'product leadership', 'P&L ownership', 'product culture', 'strategic roadmap']
  ),
]

// ─── Design ────────────────────────────────────────────────────────────────────

const DESIGN_ROLES: JobRole[] = [
  r('d1', 'Senior Product Designer', 'L5',
    ['Figma', 'Principle', 'Storybook', 'Zeroheight', 'Miro'],
    ['UX research', 'Interaction design', 'Design systems', 'Prototyping', 'Accessibility'],
    ['Weekly design crits', 'Bi-weekly cross-functional reviews', 'Design system contribution required'],
    ['Show me a project where you pushed back on requirements.', 'How do you balance user needs with business constraints?', 'Tell me about a design systems contribution you made.'],
    ['design systems', 'accessibility', 'interaction design', 'prototyping', 'design thinking', 'user research', 'design critique']
  ),
  r('d2', 'Design Lead', 'Manager',
    ['Figma', 'Notion', 'Miro', 'UserTesting', 'Lookback'],
    ['Design leadership', 'Cross-functional collaboration', 'Portfolio reviews', 'Mentorship'],
    ['Monthly design all-hands', 'Quarterly design sprints', 'Weekly critique sessions'],
    ['How do you scale design quality as the team grows?', 'Tell me about a design decision that directly improved a key metric.', 'How do you hire for design talent?'],
    ['design operations', 'design culture', 'team leadership', 'cross-functional collaboration', 'design leadership', 'mentorship']
  ),
]

// ─── Finance ───────────────────────────────────────────────────────────────────

const FINANCE_ROLES: JobRole[] = [
  r('f1', 'Senior Financial Analyst', 'L5',
    ['Netsuite', 'Adaptive Insights', 'Excel', 'Tableau', 'Snowflake'],
    ['Financial modeling', 'Variance analysis', 'FP&A', 'Board reporting', 'Scenario planning'],
    ['Monthly close process', 'Quarterly forecast cycle', 'Annual operating plan'],
    ['Walk me through building a 3-statement financial model.', 'How do you build a reliable bottom-up forecast?', 'Tell me about a financial insight that changed a major business decision.'],
    ['financial modeling', 'FP&A', 'variance analysis', 'scenario planning', 'board reporting', 'forecasting accuracy', 'business partnering']
  ),
  r('f2', 'Finance Manager', 'Manager',
    ['Netsuite', 'Adaptive', 'Tableau', 'Excel', 'Notion'],
    ['Team management', 'Budget oversight', 'Stakeholder reporting', 'Process improvement'],
    ['Monthly leadership budget reviews', 'Quarterly reforecasts', 'Annual planning cycle'],
    ['How do you build finance business partner relationships?', 'How do you improve forecast accuracy?', 'Tell me about a time finance influenced a major strategic decision.'],
    ['business partnering', 'budget management', 'cost optimization', 'financial controls', 'strategic finance', 'operational efficiency']
  ),
]

// ─── Accounting ────────────────────────────────────────────────────────────────

const ACCOUNTING_ROLES: JobRole[] = [
  r('ac1', 'Senior Accountant', 'L4',
    ['Netsuite', 'Excel', 'FloQast', 'Concur', 'Tipalti'],
    ['Revenue recognition (ASC 606)', 'Month-end close', 'Reconciliations', 'Audit support'],
    ['15-day close cycle', 'Quarterly audit support', 'Monthly expense review process'],
    ['How do you ensure accuracy during a fast close?', 'Walk me through your month-end close checklist.', 'Explain ASC 606 and how it impacts SaaS revenue recognition.'],
    ['ASC 606', 'revenue recognition', 'GAAP', 'month-end close', 'audit readiness', 'reconciliations', 'financial controls']
  ),
]

// ─── Sales ─────────────────────────────────────────────────────────────────────

const SALES_ROLES: JobRole[] = [
  r('sa1', 'Enterprise Account Executive', 'L5',
    ['Salesforce', 'Gong', 'Outreach', 'LinkedIn Sales Navigator', 'DocuSign'],
    ['Enterprise prospecting', 'Contract negotiation', 'Multi-stakeholder selling', 'Pipeline management'],
    ['Weekly pipeline reviews', 'Monthly QBRs', 'MEDDIC methodology', 'Quarterly forecasting'],
    ['Walk me through the most complex deal you have ever closed.', 'How do you handle a deal that goes dark for weeks?', 'Tell me about a deal you lost and what you learned.'],
    ['MEDDIC', 'multi-threading', 'executive sponsorship', 'deal velocity', 'pipeline management', 'solution selling', 'value-based selling']
  ),
  r('sa2', 'Sales Development Representative', 'L3',
    ['Outreach', 'LinkedIn', 'Salesforce', 'ZoomInfo', 'Orum'],
    ['Cold outreach', 'Prospect qualification', 'CRM hygiene', 'Discovery calls'],
    ['Daily standup', 'Weekly pipeline review', 'Monthly coaching sessions'],
    ['How do you research a prospect before cold outreach?', 'Role-play: pitch our product in 60 seconds.', 'How do you stay motivated after repeated rejection?'],
    ['outbound prospecting', 'ICP', 'cold outreach', 'discovery', 'pipeline generation', 'objection handling', 'qualifying frameworks']
  ),
  r('sa3', 'VP of Sales', 'VP',
    ['Salesforce', 'Clari', 'Gong', 'Tableau', 'Outreach'],
    ['Sales strategy', 'Team building', 'Quota setting', 'Revenue forecasting', 'Sales coaching'],
    ['Monthly board-level revenue reporting', 'Annual territory planning', 'Compensation plan design'],
    ['How do you build a sales team from scratch?', 'How do you forecast revenue with high confidence?', 'Tell me about your biggest pipeline miss and how you recovered.'],
    ['revenue forecasting', 'territory design', 'sales enablement', 'quota attainment', 'GTM strategy', 'sales culture', 'headcount planning']
  ),
]

// ─── Customer Success ──────────────────────────────────────────────────────────

const SUCCESS_ROLES: JobRole[] = [
  r('cs1', 'Customer Success Manager', 'L4',
    ['Salesforce', 'Gainsight', 'Notion', 'Zoom', 'ChurnZero'],
    ['QBR delivery', 'Churn prevention', 'Upsell identification', 'Onboarding programs'],
    ['Monthly health score reviews', 'Quarterly business reviews', 'Executive sponsor program'],
    ['How do you handle a customer who is determined to churn?', 'Tell me about an expansion deal you identified and closed.', 'How do you manage 40+ accounts without dropping the ball?'],
    ['health scoring', 'QBR', 'churn prevention', 'expansion revenue', 'customer advocacy', 'NRR', 'time-to-value']
  ),
  r('cs2', 'Director of Customer Success', 'Director',
    ['Gainsight', 'Salesforce', 'Tableau', 'Notion'],
    ['CSM team management', 'Churn forecasting', 'Playbook creation', 'Executive relationships'],
    ['Weekly team syncs', 'Monthly churn forecasting', 'Quarterly CSM career development reviews'],
    ['How do you build a customer success function from scratch?', 'What churn metrics matter most and why?', 'How do you enable CSMs to find upsell opportunities?'],
    ['NRR/GRR', 'CS playbook', 'CS operations', 'churn analysis', 'retention strategy', 'customer lifecycle', 'revenue retention']
  ),
]

// ─── Marketing ─────────────────────────────────────────────────────────────────

const MARKETING_ROLES: JobRole[] = [
  r('m1', 'Product Marketing Manager', 'L5',
    ['HubSpot', 'Figma', 'Google Analytics', 'Notion', 'Salesforce'],
    ['Go-to-market strategy', 'Competitive positioning', 'Launch planning', 'Sales enablement'],
    ['Monthly GTM reviews', 'Quarterly messaging workshops', 'Win/loss analysis cadence'],
    ['How do you build a product positioning framework?', 'Tell me about a product launch you led end-to-end.', 'How do you enable the sales team on a complex new product?'],
    ['positioning', 'messaging framework', 'competitive intelligence', 'GTM strategy', 'sales enablement', 'win/loss analysis', 'launch planning']
  ),
  r('m2', 'Growth Marketing Manager', 'L4',
    ['Google Ads', 'Segment', 'Braze', 'Looker', 'Amplitude'],
    ['Paid acquisition', 'Email marketing', 'A/B testing', 'Attribution modeling'],
    ['Weekly performance reviews', 'Monthly budget reconciliation', 'Quarterly channel strategy review'],
    ['How do you measure marketing efficiency?', 'Tell me about a campaign that underperformed and what you did about it.', 'How do you think about marketing attribution across a long B2B sales cycle?'],
    ['CAC', 'LTV', 'attribution modeling', 'conversion optimization', 'growth loops', 'paid acquisition', 'experimentation']
  ),
]

// ─── Brand & Comms ─────────────────────────────────────────────────────────────

const BRAND_ROLES: JobRole[] = [
  r('b1', 'Communications Manager', 'L4',
    ['Notion', 'PR Newswire', 'Muck Rack', 'Cision', 'Slack'],
    ['Media relations', 'Executive communications', 'Crisis communications', 'Brand storytelling'],
    ['Weekly comms review with leadership', 'Monthly press coverage reporting', 'Quarterly brand sentiment analysis'],
    ['How do you handle a public PR crisis?', 'Tell me about a story you successfully placed in a major publication.', 'How do you prepare executives for media interviews?'],
    ['media relations', 'crisis communications', 'brand narrative', 'executive visibility', 'thought leadership', 'editorial calendar', 'press relations']
  ),
]

// ─── Talent Acquisition ────────────────────────────────────────────────────────

const RECRUITING_ROLES: JobRole[] = [
  r('r1', 'Senior Technical Recruiter', 'L5',
    ['Greenhouse', 'LinkedIn Recruiter', 'Gem', 'Notion', 'Calendly'],
    ['Technical sourcing', 'Employer branding', 'Candidate experience design', 'Offer negotiation'],
    ['Weekly hiring reviews with engineering managers', 'Monthly pipeline analytics reporting', 'Quarterly recruiter calibrations'],
    ['How do you source passive senior engineering talent?', 'Tell me about the hardest hire you ever closed.', 'How do you reduce time-to-hire without sacrificing quality?'],
    ['passive sourcing', 'employer branding', 'technical screening', 'candidate experience', 'offer closing', 'pipeline velocity', 'sourcing strategy']
  ),
  r('r2', 'Recruiting Coordinator', 'L3',
    ['Greenhouse', 'Google Calendar', 'Notion', 'Zoom', 'Slack'],
    ['Interview scheduling', 'Candidate communication', 'Offer letter processing', 'Data reporting'],
    ['Daily scheduling queue management', 'Weekly recruiter syncs', 'Monthly coordinator process reviews'],
    ['How do you manage a high-volume interview schedule without errors?', 'Tell me about a time you improved the candidate experience.', 'How do you handle last-minute reschedules?'],
    ['ATS management', 'candidate experience', 'operational excellence', 'scheduling efficiency', 'interview coordination']
  ),
]

// ─── People & Culture ──────────────────────────────────────────────────────────

const PEOPLE_ROLES: JobRole[] = [
  r('pe1', 'HR Business Partner', 'L5',
    ['Workday', 'Lattice', 'Greenhouse', 'Slack', 'Notion'],
    ['Performance management', 'Employee relations', 'Change management', 'L&D program design'],
    ['Bi-annual performance cycles', 'Monthly town halls', 'Quarterly engagement surveys'],
    ['How do you handle a conflict between a manager and their direct report?', 'Tell me about an L&D program you built from scratch.', 'How do you measure and improve employee engagement?'],
    ['employee engagement', 'performance management', 'change management', 'HRBP', 'organizational design', 'L&D', 'retention strategy']
  ),
]

// ─── Departments (flat list) ───────────────────────────────────────────────────

export const DEPARTMENTS: Dept[] = [
  { id: 'engineering',  name: 'Engineering',        icon: '💻', color: '#3B82F6', headcount: 210, roles: ENG_ROLES },
  { id: 'infra',        name: 'Infrastructure',      icon: '🔧', color: '#6366F1', headcount: 45,  roles: INFRA_ROLES },
  { id: 'security',     name: 'Security',            icon: '🛡️', color: '#063f76', headcount: 28,  roles: SECURITY_ROLES },
  { id: 'product',      name: 'Product',             icon: '🎯', color: '#063f76', headcount: 85,  roles: PRODUCT_ROLES },
  { id: 'design',       name: 'Design',              icon: '🎨', color: '#A855F7', headcount: 42,  roles: DESIGN_ROLES },
  { id: 'finance',      name: 'Finance',             icon: '📊', color: '#10B981', headcount: 38,  roles: FINANCE_ROLES },
  { id: 'accounting',   name: 'Accounting',          icon: '📝', color: '#059669', headcount: 22,  roles: ACCOUNTING_ROLES },
  { id: 'sales',        name: 'Sales',               icon: '🤝', color: '#F59E0B', headcount: 180, roles: SALES_ROLES },
  { id: 'success',      name: 'Customer Success',    icon: '⭐', color: '#F97316', headcount: 95,  roles: SUCCESS_ROLES },
  { id: 'marketing',    name: 'Marketing',           icon: '📢', color: '#EF4444', headcount: 65,  roles: MARKETING_ROLES },
  { id: 'brand',        name: 'Brand & Comms',       icon: '🌟', color: '#F43F5E', headcount: 22,  roles: BRAND_ROLES },
  { id: 'recruiting',   name: 'Talent Acquisition',  icon: '🔍', color: '#06B6D4', headcount: 30,  roles: RECRUITING_ROLES },
  { id: 'people',       name: 'People & Culture',    icon: '💙', color: '#0EA5E9', headcount: 18,  roles: PEOPLE_ROLES },
]

// ─── Exec groups (for org chart tree) ─────────────────────────────────────────

export const EXEC_GROUPS: ExecGroup[] = [
  { id: 'cto',  title: 'Chief Technology Officer',    shortTitle: 'CTO',
    depts: DEPARTMENTS.filter(d => ['engineering', 'infra', 'security'].includes(d.id)) },
  { id: 'cpo',  title: 'Chief Product Officer',       shortTitle: 'CPO',
    depts: DEPARTMENTS.filter(d => ['product', 'design'].includes(d.id)) },
  { id: 'cfo',  title: 'Chief Financial Officer',     shortTitle: 'CFO',
    depts: DEPARTMENTS.filter(d => ['finance', 'accounting'].includes(d.id)) },
  { id: 'cro',  title: 'Chief Revenue Officer',       shortTitle: 'CRO',
    depts: DEPARTMENTS.filter(d => ['sales', 'success'].includes(d.id)) },
  { id: 'cmo',  title: 'Chief Marketing Officer',     shortTitle: 'CMO',
    depts: DEPARTMENTS.filter(d => ['marketing', 'brand'].includes(d.id)) },
  { id: 'chro', title: 'Chief Human Resources Officer', shortTitle: 'CHRO',
    depts: DEPARTMENTS.filter(d => ['recruiting', 'people'].includes(d.id)) },
]
