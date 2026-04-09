━━━ PRE-FLIGHT: READ REFERENCE DATA ━━━
Before starting any section, always:
1. Read referenceData.md to load the gold standard structure into context.
2. Pick ONE company at random from the "Companies with complete, verified data"
   table in referenceData.md and run a quick spot-check query on it:
     SELECT title, short_title, name, level FROM company_exec_groups
     WHERE company_id = (SELECT id FROM companies WHERE slug = '[random-slug]')
     ORDER BY sort_order LIMIT 5;
   Use this single query result as your live quality reference for the session.
   Do not check multiple companies — one random pick is enough.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Claude, research [COMPANY NAME] using the official website and reliable sources.
Populate ALL fields below into Supabase.

━━━ DUPLICATE CHECK — RUN THIS FIRST, EVERY TIME ━━━
Before doing ANYTHING else, run this query to check if the company already exists
AND what sections are already seeded:

  SELECT
    c.id, c.name, c.slug,
    (SELECT COUNT(*) FROM company_products    WHERE company_id = c.id) AS products,
    (SELECT COUNT(*) FROM company_news        WHERE company_id = c.id) AS news,
    (SELECT COUNT(*) FROM company_milestones  WHERE company_id = c.id) AS milestones,
    (SELECT COUNT(*) FROM company_financials  WHERE company_id = c.id) AS financials,
    (SELECT COUNT(*) FROM company_standards   WHERE company_id = c.id) AS standards,
    (SELECT COUNT(*) FROM company_departments WHERE company_id = c.id) AS departments,
    (SELECT COUNT(*) FROM company_roles       WHERE company_id = c.id) AS roles,
    (SELECT COUNT(*) FROM company_exec_groups WHERE company_id = c.id) AS exec_groups
  FROM companies c
  WHERE c.name ILIKE '[COMPANY NAME]';

Decision rules:
- If the query returns NO rows → company does not exist. Proceed with section 0.
- If the query returns a row AND all section counts are > 0 → company is fully seeded.
  SKIP this company entirely. Move to the next one.
- If the query returns a row BUT some sections have 0 count → company is partial.
  Use the returned id as company_id and fill in only the missing sections.
- Always check exec_groups: if exec_groups > 0 but names are null, rebuild them
  (DELETE + re-INSERT with real names in the 3-tier ceo/c_suite/vp structure).

━━━ 0. SEED COMPANY ROW (run script → INSERT into companies) ━━━
The duplicate gate above already determined whether this company exists.
If it does NOT exist (case A from the duplicate gate), run the seed script:
  python scripts/seed_company.py --name "[COMPANY NAME]" --website "[website]"

The script outputs JSON to stdout. Use the returned fields to INSERT the company row:
  INSERT INTO companies (name, slug, description, founded, hq, employees, revenue,
    valuation, tags, is_hiring, logo_url, logo_color, website)
  VALUES (
    '[name]', '[slug]', '[description]', [founded], '[hq]', [employees],
    '[revenue]', '[valuation]', ARRAY[...tags], [is_hiring],
    '[logo_url]',   -- from script output
    '[logo_color]', -- from script output (brand hex)
    '[website]'
  ) RETURNING id;

Capture the returned id as company_id for all subsequent inserts.

If the company already EXISTS (case B or C above), use the id already captured
from the duplicate gate query. For case C, only INSERT the missing sections.

IMPORTANT — same quality rules apply to seed_company.py output as all other sections:
- logo_url: the script scrapes from the company's official website. If it returns null
  or a broken URL, inspect the output and re-run. Never manually guess or invent a URL.
- logo_color: the script extracts the brand hex from the site's meta/CSS. If it returns
  the default (#7C3AED), verify whether the company has a distinct brand color and patch:
    UPDATE companies SET logo_color = '#hexcolor' WHERE slug = '[slug]';
- description: the script pulls the first Wikipedia sentence. Always review it — if it's
  truncated, generic, or about the wrong entity, replace it with a clean 2-3 sentence
  summary sourced from the official website or reliable news.
- employees / revenue / founded / hq: the script sources from SEC EDGAR + Wikipedia.
  Cross-check against LinkedIn headcount and recent earnings reports. Patch if stale.
- revenue: MUST be the most recent COMPLETED full fiscal year only. Never use partial-year
  figures, TTM (trailing twelve months), or forward projections. If the latest completed
  full fiscal year is FY2024, use that — do not use a partial FY2025 figure.
  STALENESS RULE: Revenue data must not be more than 1 year old relative to today's date.
  If the most recent completed FY ended more than 12 months ago and a newer completed FY
  is now available, use the newer year. Only use older data when absolutely no current
  data exists (e.g. private company with no public filings).
- tags: the script may return generic tags. Replace with 3–5 tags that accurately
  reflect this company's market (e.g. ["Enterprise", "Cloud", "AI", "SaaS", "DevTools"]).
After inserting, verify:
  SELECT id, logo_url, logo_color, description FROM companies WHERE slug = '[slug]';

━━━ 1. COMPANY OVERVIEW (UPDATE companies SET ... WHERE id = company_id) ━━━
GOLD STANDARD: See referenceData.md Section 1 for field depth requirements.
- description: 2-3 sentence company summary
- founded: year (integer)
- hq: "City, State/Country"
- employees: headcount (integer) — cross-check LinkedIn
- revenue: e.g. "$4.2B" — MUST be the most recent completed full fiscal year only.
  Never use partial-year, TTM, or projected figures.
- valuation: market cap if public, last funding round if private e.g. "$18B"
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
  - competitors: [{"name":"...", "description":"1–2 sentences describing what the competitor product does and who it serves", "edge":"one-line advantage over this competitor"},
    ...] (3 entries)
    Source from industry analyst reports and the company's own positioning pages.
    RULE: "description" must be about the COMPETITOR product — not about this company's product.
    It should read as a neutral summary of what the competitor product is and does (as if
    writing about it independently). Do not mention this company's product in the description field.

  Run this SQL to patch all products at once after researching:
    UPDATE company_products SET customers = '[...]'::jsonb, competitors = '[...]'::jsonb
    WHERE company_id = '[company_id]' AND name = '[product name]';

  STEP 3 — Always inspect scraper output before inserting. Fix these scraper weaknesses:
  - category: scraper often misclassifies (e.g. Bitbucket→CRM, Trello→Design,
    MacBook→Analytics). Always correct to the right category before inserting.
  - use_cases: scraper generates generic fallbacks ("Product Integration", "Business
    Automation", "Workflow Optimization"). Always replace with 3 domain-specific use cases
    written as real-world scenarios (e.g. "Agile Sprint Planning & Backlog Management").
  - description: scraper auto-generates "{name} by {company}. {tagline}." Always replace
    with 2 proper sentences explaining what the product does and who uses it.
  - tagline: scraper sometimes grabs page meta text ("Get the highlights.", "We're
    currently checking your connection"). Always replace with a real product tagline.
  - image_url: use the scraped og:image if the scraper found one. For abstract/SaaS
    products with no scraped image, use logo_url. For physical hardware with no scraped
    image, use NULL.

  STEP 4 — Only fall back to full manual SQL inserts (no scraper run) if:
  - The scraper returns 0 products (site is JS-rendered and Playwright is unavailable)
  - The site actively blocks scraping (Cloudflare, login-gated product pages)
  In that case, use the company override in _COMPANY_OVERRIDES in seed_products.py,
  or insert manually. Same quality standards from STEP 3 apply.

Fields reference (for manual fallback only):
- name, tagline, description (2 real sentences — not "{name} by {company}. {tagline}.")
- category: one of [Mobile Computer, Scanner, Printer, Software, Platform, Hardware,
  Analytics, Security, AI, Cloud, Payments, CRM, Data, Developer Tools, Product,
  Collaboration, Aircraft, Simulation]
- cat_color: hex matching the category
- image_url: scraped og:image if available; logo_url for abstract/SaaS; NULL for hardware
- use_cases: 3 domain-specific real-world scenarios — never generic placeholders
- customers: [{"name":"...", "abbr":"XX", "bg":"#hexcolor"}, ...] (3 entries)
- competitors: [{"name":"...", "description":"1–2 sentences describing what the competitor product does and who it serves", "edge":"one-line advantage over this competitor"},
  ...] (3 entries)
  RULE: "description" must be about the COMPETITOR product itself — neutral, factual, as if written independently.

━━━ 3. NEWS (INSERT into company_news) ━━━
GOLD STANDARD: See referenceData.md Section 3 for type→color mapping and depth.
5 most recent press releases or announcements — real, dated, sourced events only.
For each:
- headline: exact headline from the press release or news article
- summary: 1 sentence — specific, not generic. Mention numbers/outcomes where available.
- published_date: "MMM DD, YYYY" (e.g. "Feb 12, 2026")
- source_url: direct URL to the press release or article
- type: one of [Press Release, Partnership, Product Launch, Award, Funding, Acquisition]
- type_color / type_bg / dot_color: use the color mapping in referenceData.md Section 3

━━━ 4. MILESTONES (INSERT into company_milestones) ━━━
GOLD STANDARD: See referenceData.md Section 4 for type→icon mapping and badge style.
8-10 key moments spanning founding → present. Each must be a real, verifiable event.
For each:
- year (integer), title, detail (1 sentence — include dollar amounts, deal names, real facts)
- type: one of [founding, funding, acquisition, ipo, product, award, expansion]
- icon: lucide icon name — use the type→icon table in referenceData.md Section 4
- accent_color, bg_color: tinted hex pair matching the type
- badge: short label e.g. "Series A", "Acquired", "IPO", "$3.45B Deal"

━━━ 5. FINANCIALS (INSERT into company_financials) ━━━
GOLD STANDARD: See referenceData.md Section 5 for the exact JSON structure.
Single row per company:
- tam, sam, som: market size strings e.g. "$180B"
- arr: annual recurring revenue if SaaS, else total annual revenue
- yoy_growth: e.g. "+18%"
- revenue_per_employee: e.g. "$420K"
- revenue_streams: percentages must sum to 100; descriptions must be company-specific
  [{"name":"...","type":"subscription|transactional|advertising|product|services|other",
    "percentage":60,"description":"company-specific 1 sentence"}]
- business_units: [{"name":"...","revenue_contribution":"60%","description":"1 sentence"}, ...]
- market_share: single entry — this company's share of its primary market segment
  [{"segment":"...","percentage":34,"context":"1 sentence with competitor context","year":2025}]
- revenue_growth: last 5 COMPLETED full fiscal years only. The most recent entry must
  be the latest completed full fiscal year (e.g. FY2024 for companies whose FY2024 is
  complete but FY2025 is not). Never include partial years or projections.
  STALENESS RULE: The most recent revenue_growth entry must not be more than 1 year old.
  If a newer completed FY is available, use it. Only omit if truly unavailable.
  [{"year":2021,"revenue":"$1.2B","growth_rate":"+18%"}, ...]
- competitors: pct must sum to exactly 100; this company listed first
  [{"name":"...","pct":34,"clr":"#hexcolor"}, ...]

━━━ REVENUE & EMPLOYEE ACCURACY CHECK (run after section 5) ━━━
After inserting financials, verify these three values are internally consistent:
1. companies.revenue (overview) must match the most recent COMPLETED full fiscal year
   entry in company_financials.revenue_growth. Both must reflect the same full year.
   Partial years, TTM, or forward projections are never acceptable in either field.
   (e.g., if revenue_growth latest entry is 2024: "$36.8B", then companies.revenue
   must also be "$36.8B"). Patch whichever is wrong:
     UPDATE companies SET revenue = '[value]' WHERE slug = '[slug]';
     -- OR update the revenue_growth JSON to match.
2. companies.employees must be current (cross-check LinkedIn). Patch if stale:
     UPDATE companies SET employees = [n] WHERE slug = '[slug]';
3. company_financials.revenue_per_employee must equal companies.revenue ÷
   companies.employees (rounded). Recalculate and patch if off:
     UPDATE company_financials SET revenue_per_employee = '[value]'
     WHERE company_id = '[id]';
Never leave these three values inconsistent — they are displayed together on the
company profile and any mismatch looks like a data error to users.

━━━ 6. STANDARDS (INSERT into company_standards) ━━━
GOLD STANDARD: See referenceData.md Section 6 for category→color mapping and depth.
Compliance certifications and regulatory approvals held by this company. Aim for 8–10.
For each:
- code: e.g. "ISO 27001", "SOC 2 Type II", "FedRAMP High"
- category: Security | Quality | Privacy | Environmental | Safety | Regulatory | Accessibility
- cat_color: use the category→color table in referenceData.md Section 6
- status: Certified | Compliant | In Progress
- description: 1 sentence — must mention the company by name and explain WHY this cert
  matters for their specific business. Never write generic descriptions.

━━━ 7. DEPARTMENTS (INSERT into company_departments) ━━━
GOLD STANDARD: Zebra Technologies. See referenceData.md for the exact structure.
Search LinkedIn and Indeed job postings for [COMPANY NAME]. Extract the exact
department and business unit names mentioned in job descriptions
(e.g. "you will join the Handheld Business Unit" → department name: "Handheld").
Use those exact names — do not invent generic names. For each:
- name: exact department/BU name as it appears in job postings
- headcount: realistic estimate from LinkedIn headcount data or web sources
- icon: lucide icon name ONLY — e.g. "cpu", "code", "users", "dollar-sign"
  NEVER use emoji (❌ "⚙️", "🧩", "📋"). Always use a valid lucide-react icon name.
- color: distinct hex color per department — no two departments should share the
  same color. Use the Zebra palette as reference (see referenceData.md).

USE RETURNING to capture dept UUIDs for linking roles and VPs:
  INSERT INTO company_departments (...) VALUES (...) RETURNING id, name;

IMPORTANT — do not rely solely on the careers page category filters. Those
filters aggregate roles into broad buckets and routinely omit real departments.
Cross-check by scanning actual job description text for department/team names.
Additionally, always verify these commonly omitted departments exist at the
company before skipping them — these are REQUIRED checks, not optional:
- Program Management / PMO — MUST be included for any hardware, enterprise tech,
  or manufacturing company. Look for TPM, NPI Program Manager, Senior Program
  Manager titles. Do NOT skip this department.
- Professional Services / Customer Success (look for Solutions Architect,
  Implementation Specialist, Customer Success Manager titles)
- Research & Development / Advanced Engineering (separate from core Engineering
  at hardware companies — look for Research Scientist, Principal Investigator)
- Corporate Affairs & Legal (look for Corporate Counsel, Paralegal, Compliance)
- Environmental Health & Safety (present at any company with manufacturing)
If job postings exist for roles that clearly belong to a department not on your
list, add that department — do not drop roles into an ill-fitting catch-all.

━━━ 8. ROLES (INSERT into company_roles, linked to department_id) ━━━
GOLD STANDARD: See referenceData.md Section 8 for the exact depth required per field.
Source from Glassdoor, LinkedIn job postings, and the company's careers page.
EXACTLY 3 roles per department (max 3 — do not add more). For each role:
- title: exact job title as it appears at this company (not invented)
- level: one of [Entry, Mid, Senior, Lead, Director, VP, C-Suite]
- tools: 5 items — MUST match the actual tech stack for this specific role type.
  A Firmware Engineer uses JTAG/RTOS tools, NOT Docker. A Field Sales rep uses
  Salesforce/Gong, NOT GitHub. Source from the actual JD or Glassdoor reviews.
- skills: 5 items — role AND company specific. Not generic buzzwords.
- processes: 5 items — written as actions the person actually does at this company.
  Must reference the company's real products/platform where applicable.
  BAD: "Data management"
  GOOD: "Configuring DataWedge profiles for warehouse scanning workflows"
- interview_questions: 5 items — grounded in THIS company's products, tech stack,
  and domain. Must name the company's actual tools/products in the question.
  BAD: "Tell me about yourself."
  GOOD: "How would you design a warehouse RFID solution using Zebra fixed readers?"
- keywords: 5–7 resume keywords a recruiter at this company would search for
Link each role to its department using the department_id from step 7.

━━━ 9. EXEC GROUPS (INSERT into company_exec_groups) ━━━
GOLD STANDARD: Zebra Technologies. See referenceData.md for the exact structure.
Three tiers — always use real names sourced from the company's official Leadership
page, LinkedIn, or reliable news. Never leave name as null.

Tier 1 — CEO (1 row):
  - title: full title e.g. "Chief Executive Officer"
  - short_title: "CEO"
  - name: real current CEO full name
  - level: "ceo"
  - department_ids: []
  - sort_order: 0

Tier 2 — C-Suite (one row per C-level officer, typically 6–10):
  Include: CFO, CTO, COO, CMO, CPO, CRO, CLO, CIO, CHRO (and others present).
  - title: full title e.g. "Chief Technology Officer"
  - short_title: abbreviation e.g. "CTO"
  - name: real current person's full name
  - level: "c_suite"
  - department_ids: [] (leave empty for c-suite)
  - sort_order: 1, 2, 3 ...

Tier 3 — VPs (one row per major VP, typically 4–8):
  Source VP names from LinkedIn or press releases for this company.
  - title: full VP title e.g. "VP, Engineering"
  - short_title: abbreviated e.g. "VP Eng"
  - name: real current VP full name
  - level: "vp"
  - department_ids: [uuid, uuid] — link to 1–3 relevant dept UUIDs from step 7
    Use the UUIDs returned by the RETURNING clause in step 7's INSERT.
  - sort_order: continuing after c-suite

IMPORTANT:
- All three tiers must be present. Do not skip VPs.
- department_ids for VPs must use the actual UUIDs inserted in step 7.
- Never use emoji in any field. name must never be null.

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
