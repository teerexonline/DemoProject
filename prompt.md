Claude, research [COMPANY NAME] using the official website and reliable sources.
Populate ALL fields below into Supabase. First run:
  SELECT id FROM companies WHERE name ILIKE '[COMPANY NAME]'
to get the company_id. Update ALL fields even if data already exists — always overwrite with the most accurate, up-to-date information.

━━━ 1. COMPANY OVERVIEW (UPDATE companies SET ... WHERE id = company_id) ━━━
- description: 2-3 sentence company summary
- founded: year (integer)
- hq: "City, Country"
- employees: headcount (integer)
- revenue: e.g. "$4.2B"
- valuation: e.g. "$18B" (use market cap if public)
- tags: string array e.g. ["Enterprise", "SaaS", "B2B"]
- is_hiring: true/false (check careers page)

━━━ 2. PRODUCTS (INSERT into company_products) ━━━
IMPORTANT — use the scraper first, then patch only what it cannot produce:

  STEP 1 — Run the scraper (scripts/seed_products.py) via the admin UI or CLI:
    python scripts/seed_products.py --company "[COMPANY NAME]" --website "[website]" \
        --company-id "[company_id]" --auth-token "[jwt]" --app-url "http://localhost:3000"
  The scraper handles: name, tagline, description, image_url, category, cat_color,
  use_cases. Do NOT manually re-insert these fields if the scraper ran successfully.

  STEP 2 — After the scraper completes, research and UPDATE only the two fields
  the scraper cannot produce:
  - customers: [{"name":"...", "abbr":"XX", "bg":"#hexcolor"}, ...] (3 entries)
    Source from the company's official customer success/case study pages.
    Use real named customers — never generic placeholders.
  - competitors: [{"name":"...", "edge":"one-line advantage over this competitor"},
    ...] (3 entries)
    Source from industry analyst reports and the company's own positioning pages.

  Run this SQL to patch all products at once after researching:
    UPDATE company_products SET customers = '[...]'::jsonb, competitors = '[...]'::jsonb
    WHERE company_id = '[company_id]' AND name = '[product name]';

  STEP 3 — Only fall back to full manual SQL inserts if:
  - The scraper returns 0 products (site is JS-rendered and Playwright is unavailable)
  - The site actively blocks scraping (Cloudflare, login-gated product pages)
  In that case, set image_url to NULL — do not manually hunt for product-specific image
  URLs via WebFetch, as this is expensive and inconsistent.

Fields reference (for manual fallback only):
- name, tagline, description (2 sentences)
- category: one of [Mobile Computer, Scanner, Printer, Software, Platform, Hardware,
  Analytics, Security, AI, Cloud, Payments, CRM, Data, Developer Tools, Product]
- cat_color: hex matching the category
- image_url: NULL
- use_cases: ["Use Case 1", "Use Case 2", "Use Case 3"]
- customers: [{"name":"...", "abbr":"XX", "bg":"#hexcolor"}, ...] (3 entries)
- competitors: [{"name":"...", "edge":"one-line advantage over this competitor"},
  ...] (3 entries)

━━━ 3. NEWS (INSERT into company_news) ━━━
5 most recent press releases or announcements. For each:
- headline, summary (1 sentence), published_date ("MMM DD, YYYY"), source_url
- type: one of [Press Release, Partnership, Product Launch, Award, Funding]
- type_color / type_bg / dot_color: matching tinted hex pair for the type

━━━ 4. MILESTONES (INSERT into company_milestones) ━━━
8-10 key company history moments (founding, funding, IPO, acquisitions, major
launches). For each:
- year (integer), title, detail (1 sentence)
- type: one of [founding, funding, acquisition, ipo, product, award, expansion]
- icon: lucide icon name matching the type (e.g. "rocket", "dollar-sign", "trophy")
- accent_color, bg_color: tinted hex pair matching the type
- badge: short label e.g. "Series A", "Acquired", "IPO"

━━━ 5. FINANCIALS (INSERT into company_financials) ━━━
Single row:
- tam, sam, som: market size strings e.g. "$180B"
- arr: annual recurring revenue if SaaS, else annual revenue
- yoy_growth: e.g. "+18%"
- revenue_per_employee: e.g. "$420K"
- revenue_streams: [{"name":"Subscription","percentage":60,"type":"subscription","description":"one sentence"},{"name":"Hardware","percentage":40,"type":"product","description":"one sentence"}]
  type must be one of: subscription, transactional, advertising, product, services, other
- business_units: [{"name":"Unit Name","revenue_contribution":"60%","description":"one sentence"}, ...]
- market_share: [{"segment":"Market Name","percentage":34,"context":"one sentence describing the market","year":2025}]
  (single entry describing this company's share and the market segment)
- revenue_growth: [{"year":2021,"revenue":"$1.2B","growth_rate":"+18%"}, ...] last 5 years, revenue as string with unit
- competitors: [{"name":"Competitor","pct":28,"clr":"#hexcolor"}, ...]
  (used for market share donut — include this company first, then top 4 competitors, pct must sum to 100)

━━━ 6. STANDARDS (INSERT into company_standards) ━━━
Compliance certifications and regulatory approvals held by this company. For each:
- code: e.g. "ISO 27001", "SOC 2 Type II", "FedRAMP"
- category: e.g. "Security", "Quality", "Privacy", "Regulatory"
- cat_color: hex for the category
- status: one of [Certified, Compliant, In Progress]
- description: one sentence explaining relevance to this specific company

━━━ 7. DEPARTMENTS (INSERT into company_departments) ━━━
Search LinkedIn and Indeed job postings for [COMPANY NAME]. Extract the exact
department and business unit names mentioned in job descriptions
(e.g. "you will join the Handheld Business Unit" → department name: "Handheld").
Use those exact names — do not invent generic names. For each:
- name: exact department/BU name as it appears in job postings
- headcount: estimate from LinkedIn or web
- icon: lucide icon name matching the department function
- color: hex color for the department badge

IMPORTANT — do not rely solely on the careers page category filters. Those
filters aggregate roles into broad buckets and routinely omit real departments.
Cross-check by scanning actual job description text for department/team names.
Additionally, always verify these commonly omitted departments exist at the
company before skipping them:
- Program Management / PMO (present at almost every hardware or enterprise
  tech company — look for TPM, NPI Program Manager, Senior Program Manager titles)
- Professional Services / Customer Success (look for Solutions Architect,
  Implementation Specialist, Customer Success Manager titles)
- Research & Development / Advanced Engineering (separate from core Engineering
  at hardware companies — look for Research Scientist, Principal Investigator)
- Corporate Affairs & Legal (look for Corporate Counsel, Paralegal, Compliance)
- Environmental Health & Safety (present at any company with manufacturing)
If job postings exist for roles that clearly belong to a department not on your
list, add that department — do not drop roles into an ill-fitting catch-all.

━━━ 8. ROLES (INSERT into company_roles, linked to department_id) ━━━
Source from Glassdoor historical job titles, LinkedIn job postings, and the
company's own careers page for [COMPANY NAME]. For each department seeded
above, find 3-5 real role titles. For each role:
- title: exact historical job title as it appears at this company
- level: one of [Entry, Mid, Senior, Lead, Director, VP, C-Suite]
- tools: ["Tool1", ...] (5 tools — MUST match the actual tech stack for this
  specific role type. A Firmware Engineer uses JTAG debuggers and RTOS toolchains,
  NOT Docker/Kubernetes. A Hardware Engineer uses Altium and oscilloscopes, NOT
  AWS. A Field Sales rep uses Salesforce and Gong, NOT GitHub. Never copy tools
  from one role type to another. Source tools from the actual JD or Glassdoor
  reviews for this exact role at this company.)
- skills: ["Skill1", ...] (5 skills specific to this role AND company — not
  generic. A Solutions Architect at a hardware company needs different skills than
  one at a SaaS startup. Reference what the company's JDs emphasize.)
- processes: ["Process1", ...] (5 day-to-day processes — written as actions the
  person actually does at work, not abstract skills. e.g. "Configuring DataWedge
  profiles for warehouse scanning workflows" not "Data management".)
- interview_questions: ["Question?", ...] (5 realistic questions grounded in this
  company's products, tech stack, and domain — not generic. e.g. for Zebra FAE:
  "How would you design a warehouse RFID solution using Zebra fixed readers?" not
  "Tell me about yourself.")
- keywords: ["keyword1", ...] (5 resume keywords a recruiter at this company
  would search for when hiring for this exact role)
Link each role to its department using the department_id from step 7.

━━━ 9. EXEC GROUPS (INSERT into company_exec_groups) ━━━
Two types of entries:
1. CEO only — find the actual current CEO name from the official website or
   reliable source:
   - title: "Chief Executive Officer — [Full Name]"
   - short_title: "CEO"
2. One entry per department/BU seeded in step 7 — these represent leadership
   layers, not individual people:
   - title: "[Department Name] Leadership"
   - short_title: abbreviated BU/dept name (max 4 chars)
- department_ids: [] for all entries (leave empty, linked separately)

━━━ LOGGING ━━━
After completing all sections, append the following block to company.md
in the project root:

## [COMPANY NAME]
- **Seeded:** [today's date]
- **Sources:** [list main sources used per section]
- **CEO:** [name found]
- **Departments found:** [comma-separated list from job postings]
- **Products count:** [n]
- **Notes:** [anything missing, blocked, or unusual]

---

Speed and accuracy are top priority. Use web search for every section.
