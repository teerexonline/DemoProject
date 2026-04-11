━━━ SESSION DATE ANCHOR — READ THIS FIRST, EVERY SESSION ━━━
Today's date is injected by the system via currentDate in MEMORY.md.
Read MEMORY.md before starting any session to confirm today's date.

MINIMUM ACCEPTABLE YEAR for all time-sensitive data = (current year − 1).
This means:
• Financial data (revenue, revenue_growth): most recent entry must be FY(current year − 1)
  or newer. FY(current year − 2) or older = stale = hard block, do not insert.
• News items: published_date must be within the last 12 months. Older items are not
  "recent news" — replace them.
• Milestones: at least one milestone entry must have year ≥ (current year − 2).
• Employee headcount: cross-check LinkedIn before inserting; reject Wikipedia/EDGAR
  values that are more than 18 months old without verification.

━━━ MANUAL DATA TAKES PRIORITY — NON-NEGOTIABLE ━━━
If the seeding request provides specific values (e.g. "revenue: $280M",
"employees: 2000", "founded: 1999"), those values are AUTHORITATIVE.
Do NOT replace them with scraper output. Do NOT "correct" them based on
Wikipedia or SEC EDGAR unless the request explicitly says the value is unknown.

Rules:
• Scraper output is a STARTING POINT, not a source of truth.
• Any field explicitly provided by the user = final answer. Insert it as-is.
• Any field NOT provided by the user = research it, but verify the year before inserting.
• If scraper output conflicts with a user-provided value, the user-provided value wins.
  Do not silently substitute. Do not average. Do not note the discrepancy as a reason
  to use the scraper number instead.

━━━ SCRAPER OUTPUT VALIDATION (run after ANY scraper call) ━━━
Before inserting ANY scraper output, check:

1. Does the JSON output contain a "_staleness_warning" key?
   YES → Stop. Read the warning. Do not insert until you have resolved it by finding
         current-year data from the company's investor relations page, latest 10-K,
         or an authoritative news source. Replace the stale entries before inserting.
   NO  → Proceed, but still verify the year of the most recent revenue_growth entry
         against today's date (see SESSION DATE ANCHOR above).

2. For seed_company.py output: check employees and revenue.
   • employees: if the value came from Wikipedia/EDGAR, cross-check LinkedIn now.
     If LinkedIn shows a materially different current headcount, use LinkedIn's value.
   • revenue: confirm it reflects the most recent completed full FY (not TTM, not partial).

3. For seed_news.py or manually researched news: check every published_date.
   Any item older than 12 months must be replaced with a genuinely recent item.
   "We couldn't find 5 recent items" is not an acceptable reason to use old items —
   use fewer items rather than insert stale news.
   TYPE: Use the most accurate type for each item — see referenceData.md Section 3 for valid types and color mapping.

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
  is available, use the newer year. Using stale data is a hard error, not a warning.
  Exception: only use older data after a manual check confirms the newer year is genuinely
  unavailable (e.g. private company, subsidiary with no public filings, or company acquired
  before the newer year closed). Document the reason in a SQL comment. Do not assume data
  is unavailable without first checking the company's investor relations page or official
  financial filings.
- tags: the script may return generic tags. Replace with 3–5 tags that accurately
  reflect this company's market (e.g. ["Enterprise", "Cloud", "AI", "SaaS", "DevTools"]).
After inserting, verify:
  SELECT id, logo_url, logo_color, description FROM companies WHERE slug = '[slug]';

━━━ LOGO STORAGE CHECK — MANDATORY BEFORE SECTION 1 ━━━
⛔ DO NOT proceed to section 1 until this check passes.

Run:
  SELECT slug, logo_url FROM companies WHERE slug = '[slug]';

The logo_url MUST start with the Supabase storage prefix:
  https://cznnhdeahfnowfimqbrg.supabase.co/storage/v1/object/public/logos/

If logo_url is NULL, empty, points to a favicon.ico, icon.horse URL, Wikipedia URL,
or ANY external domain — the logo is NOT properly stored. Fix it before continuing:

  Option A (preferred): Go to Admin → Data Management → "Fix Broken Logos" and click
    "Fix All Logos" (or run: POST /api/fix-logos { "slug": "[slug]" }).

  Option B (manual): Download the image and upload it yourself:
    1. Find the company's logo URL (icon.horse/icon/{domain} is a reliable fallback)
    2. Call the seed-company API: POST /api/seed-company { "name": "...", "website": "..." }
       The API will scrape the logo and upload it to Supabase storage automatically.

Why this matters: External logo URLs (favicons, CDN links, icon.horse) break over time.
Third-party domains change, rate-limit, or block hotlinking. All logos MUST live in our
own Supabase storage bucket to guarantee they always load for users.

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
  - customers: [{"name":"...", "abbr":"XX", "bg":"#hexcolor"}, ...] (MAXIMUM 3 entries — never more than 3)
    Source from the company's official customer success/case study pages.
    Use real named customers — never generic placeholders.
  - competitors: [{"name":"...", "description":"1–2 sentences describing what the competitor product does and who it serves", "edge":"one-line advantage over this competitor"},
    ...] (3 entries)
    Source from industry analyst reports and the company's own positioning pages.
    RULE: "description" must be about the COMPETITOR product — not about this company's product.
    It should read as a neutral summary of what the competitor product is and does (as if
    writing about it independently). Do not mention this company's product in the description field.

  ⚠️ UNIQUENESS RULE — NEVER COPY-PASTE ACROSS PRODUCTS:
  Every product's customers and competitors arrays MUST be unique and specific to that
  product. NEVER use the same customers or competitors data across multiple products of
  the same company. This is the single most common data quality error.
  - customers: reflect who actually buys/uses THAT specific product (e.g. Merchant Platform
    customers are restaurant chains; DoorDash for Business customers are enterprise HR teams;
    DashPass customers are subscription-seeking consumers).
  - competitors: reflect who competes with THAT specific product (e.g. a whiteboard tool
    competes with Miro/Mural, not Sketch; an enterprise plan competes with enterprise tiers
    of other design tools, not their free-tier competitors).
  If you find yourself reusing the same 3 competitors for all 6+ products of a company,
  STOP — you are copy-pasting. Research each product's actual competitive landscape.

  Run this SQL to patch all products at once after researching:
    UPDATE company_products SET customers = '[...]'::jsonb, competitors = '[...]'::jsonb
    WHERE company_id = '[company_id]' AND name = '[product name]';

  STEP 3 — Always inspect scraper output before inserting. Fix these scraper weaknesses:
  - category: scraper often misclassifies (e.g. Bitbucket→CRM, Trello→Design,
    MacBook→Analytics). Always correct to the right category before inserting.
  - use_cases: scraper generates generic fallbacks ("Product Integration", "Business
    Automation", "Workflow Optimization"). Always replace with 3 domain-specific use cases
    written as real-world scenarios (e.g. "Agile Sprint Planning & Backlog Management").
    FORMAT RULE: use_cases MUST be a plain JSON array of strings — never an array of objects.
    CORRECT:   ["Scenario one", "Scenario two", "Scenario three"]
    INCORRECT: [{"text":"Scenario one"}, {"text":"Scenario two"}, {"text":"Scenario three"}]
    Wrapping strings in {text:"..."} objects will break the UI with a React key error.
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
- use_cases: ["Scenario one", "Scenario two", "Scenario three"] — plain array of strings ONLY.
  Never wrap in objects like [{"text":"..."}]. 3 domain-specific real-world scenarios, never generic placeholders.
- customers: [{"name":"...", "abbr":"XX", "bg":"#hexcolor"}, ...] (MAXIMUM 3 entries — never more than 3)
- competitors: [{"name":"...", "description":"1–2 sentences describing what the competitor product does and who it serves", "edge":"one-line advantage over this competitor"},
  ...] (3 entries)
  RULE: "description" must be about the COMPETITOR product itself — neutral, factual, as if written independently.

━━━ 3. NEWS (INSERT into company_news) ━━━
GOLD STANDARD: See referenceData.md Section 3 for type→color mapping and depth.
5 most recent press releases — real, dated, sourced events only.

TYPE RULE: Use the most accurate type for each item. Valid types: Press Release, Partnership, Product Launch, Award, Funding, Acquisition. Match the type to the nature of the news — acquisitions get "Acquisition", product launches get "Product Launch", etc.

DATE RULE: Every item must have published_date within the last 12 months relative to
today's date (from SESSION DATE ANCHOR). Do not insert items older than 12 months.
If fewer than 5 genuinely recent items exist, insert only what is recent — do not
pad with older items to reach 5. Inserting stale news is worse than inserting fewer items.

DATE FORMAT RULE — CRITICAL: published_date MUST be stored as 'YYYY-MM-DD' (ISO 8601).
  CORRECT:   '2026-02-12'
  INCORRECT: 'Feb 12, 2026' or 'February 12, 2026' or '02/12/2026'
  WHY: Text-format dates ('Feb 12, 2026') break all SQL date comparison queries. The
  staleness check (published_date < '[threshold]') silently produces wrong results
  when the column contains mixed-format strings. ISO format is the only safe format.

SORT ORDER RULE — CRITICAL: sort_order determines display order. Newest item = sort_order 1.
  sort_order 1 = most recent item (highest published_date)
  sort_order 2 = second most recent
  sort_order 3 = third most recent
  sort_order 4 = fourth most recent
  sort_order 5 = oldest item (lowest published_date)
  Always assign sequential integers starting at 1. NEVER use sort_order = 0.
  NEVER leave all items at sort_order 0 or duplicate sort_orders.
  When inserting 5 items: the item with the most recent published_date gets sort_order 1,
  the item with the oldest published_date gets sort_order 5.

For each:
- headline: exact headline from the press release or news article
- summary: 1 sentence — specific, not generic. Mention numbers/outcomes where available.
- published_date: 'YYYY-MM-DD' format ONLY (e.g. '2026-02-12') — must be within last 12 months
- source_url: REQUIRED. Direct URL to a specific article or press release. Every news item
  MUST have a real, verifiable source_url. Follow these rules strictly:

  PREFERRED SOURCES (highest to lowest trust):
    1. prnewswire.com, businesswire.com, globenewswire.com — official wire services
    2. Company investor relations pages WITH specific article path
       e.g. ir.company.com/news-releases/news-release-details/2026/Title/default.aspx ✓
    3. Company official newsroom WITH specific article path
       e.g. news.airbnb.com/airbnb-q4-2025-results/ ✓
    4. Major tech/business press: techcrunch.com, reuters.com, bloomberg.com, wsj.com,
       theverge.com, venturebeat.com, etc. — with full article URL

  URL MUST BE A SPECIFIC ARTICLE — not a listing page. A valid URL has an article-specific
  path after the domain. These patterns are ALWAYS WRONG and must never be inserted:
    ✗ company.com/newsroom                  (index page)
    ✗ company.com/blog                      (index page)
    ✗ company.com/press-releases            (index page)
    ✗ company.com/news                      (index page)
    ✗ ir.company.com                        (IR homepage, no specific release)
    ✗ investors.company.com/news-releases   (listing, not specific release)
    ✗ stocktitan.net/news/TICKER/           (ticker page, not specific article)
  These are not sources — they are the front door to sources. Find the actual article.

  NEVER FABRICATE A URL. Do not invent a plausible-looking path on a company's domain
  (e.g. company.com/news/product-launch-2025) unless you found that exact URL in a search
  result snippet. Fabricated URLs (even ones that look real) are worse than NULL — they
  mislead users and corrupt data audits. If you cannot find a real URL after 2–3 searches,
  use NULL or skip that item and find a different one that has a real URL.

  NO DUPLICATE URLs. Every URL must be unique within the company's 5 news items. If the
  same article covers two different events, use it once and find a different source for
  the second item. Duplicate URLs indicate copy-paste errors.

  NULL IS ACCEPTABLE as a last resort only for companies with genuinely no online press
  coverage (private companies, subsidiaries). Do not use NULL for public companies — they
  always have IR pages or wire service releases. If after a thorough search (official site +
  prnewswire + businesswire + globenewswire) no URL exists, skip that item entirely and
  use fewer than 5 items rather than inserting a NULL or fabricated URL.
- type: one of [Press Release, Partnership, Product Launch, Award, Funding, Acquisition] — match to the nature of the news
- type_color / type_bg / dot_color: use the color mapping in referenceData.md Section 3
- sort_order: integer 1–5, newest item = 1, oldest item = 5 (see SORT ORDER RULE above)

POST-INSERT VERIFICATION — MANDATORY: After inserting all news items, run this query:
  SELECT sort_order, published_date, headline,
    CASE WHEN source_url IS NULL THEN '❌ MISSING URL' ELSE '✓' END AS url_check,
    CASE WHEN published_date < '[today minus 12 months]' THEN '❌ STALE' ELSE '✓' END AS date_check,
    CASE WHEN published_date !~ '^\d{4}-\d{2}-\d{2}$' THEN '❌ WRONG FORMAT' ELSE '✓' END AS format_check
  FROM company_news
  WHERE company_id = '[company_id]'
  ORDER BY sort_order;
  Expected: all url_check = ✓, all date_check = ✓, all format_check = ✓, sort_orders 1–5 sequential.
  If any check fails, fix before proceeding.

━━━ NEWS URL AUDIT (run periodically) ━━━
Use these queries to find generic/listing URLs and duplicate URLs:

  -- Generic listing page URLs (not specific articles):
  SELECT c.name, cn.sort_order, cn.source_url
  FROM company_news cn JOIN companies c ON c.id = cn.company_id
  WHERE cn.source_url ~* '/(newsroom|blog|press-releases?|news|about/press|media-centre/press-releases|press-room|news-center|category/announcements|whats-new)(/?|\?.*)?$'
    OR cn.source_url ~* 'stocktitan\.net/news/[A-Z]+/?$'
    OR cn.source_url ~* '^https?://(ir|investors?)\.[^/]+\.[^/]+/?$'
  ORDER BY c.name, cn.sort_order;

  -- Duplicate URLs within same company:
  SELECT c.name, cn.sort_order, cn.source_url
  FROM company_news cn JOIN companies c ON c.id = cn.company_id
  WHERE (cn.company_id, cn.source_url) IN (
    SELECT company_id, source_url FROM company_news
    WHERE source_url IS NOT NULL
    GROUP BY company_id, source_url HAVING COUNT(*) > 1
  )
  ORDER BY c.name, cn.sort_order;

Fix generic URLs: set source_url = NULL and research real article URL.
Fix duplicates: keep lowest sort_order, NULL out the rest, research replacement URL for duplicate row.

━━━ NEWS SORT ORDER AUDIT (run periodically) ━━━
Use this query to find ALL companies where sort_order 1 is not the newest item:
  WITH company_sort1 AS (
    SELECT company_id, published_date::date AS sort1_date
    FROM company_news WHERE sort_order = 1
      AND published_date ~ '^\d{4}-\d{2}-\d{2}$'
  ),
  company_max AS (
    SELECT company_id, MAX(published_date::date) AS max_date
    FROM company_news WHERE published_date ~ '^\d{4}-\d{2}-\d{2}$'
    GROUP BY company_id
  )
  SELECT c.name, s.sort1_date, m.max_date
  FROM company_sort1 s
  JOIN company_max m ON m.company_id = s.company_id
  JOIN companies c ON c.id = s.company_id
  WHERE s.sort1_date < m.max_date
  ORDER BY c.name;
Fix with:
  WITH ranked AS (
    SELECT id,
      ROW_NUMBER() OVER (PARTITION BY company_id ORDER BY published_date::date DESC) AS new_sort_order
    FROM company_news WHERE published_date ~ '^\d{4}-\d{2}-\d{2}$'
  )
  UPDATE company_news cn SET sort_order = r.new_sort_order
  FROM ranked r WHERE cn.id = r.id AND cn.sort_order != r.new_sort_order;

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
  be the latest completed full fiscal year available. Never include partial years or projections.
  STALENESS RULE (hard): The most recent revenue_growth entry must not be more than 1 year
  old relative to today's date. If a newer completed FY has been reported, use it — this is
  a hard requirement, not a guideline.
  Exception procedure: if and only if the newer year's data is genuinely unavailable (private
  company, no public filings, subsidiary not broken out), you must:
    1. Manually check the company's investor relations page and latest press releases.
    2. Check SEC EDGAR (or equivalent national filing body) for the most recent 10-K/20-F.
    3. Only after confirming data does not exist publicly, leave the older year as the latest
       entry and add a SQL comment: -- FY[year] data not publicly available: [reason].
  Never skip this check and assume data is unavailable. Using stale data without the manual
  check is a seeding error. Format: [{"year":2021,"revenue":"$1.2B","growth_rate":"+18%"}, ...]
- competitors: pct must sum to exactly 100; this company listed first
  [{"name":"...","pct":34,"clr":"#hexcolor"}, ...]

━━━ GLOBAL REVENUE STALENESS AUDIT (run periodically, not just per-company) ━━━
Use this query at the start of any bulk seeding session to find ALL companies whose
revenue_growth is more than 1 year stale. Fix them before adding new companies.

  SELECT c.name, c.slug,
    (cf.revenue_growth->-1->>'year')::int AS latest_year,
    cf.revenue_growth->-1->>'revenue' AS latest_rev
  FROM companies c
  JOIN company_financials cf ON cf.company_id = c.id
  WHERE cf.revenue_growth IS NOT NULL
    AND cf.revenue_growth != '[]'::jsonb
    AND (cf.revenue_growth->-1->>'year')::int < EXTRACT(YEAR FROM NOW()) - 1
  ORDER BY c.name;

For each result: either update the revenue_growth to include the newer completed FY,
OR perform the manual check exception procedure described in Section 5 above and add
a comment explaining why the data is unavailable. Zero rows is the target.

━━━ REVENUE & EMPLOYEE ACCURACY CHECK (run after section 5) ━━━
After inserting financials, verify these three values are internally consistent:
1. companies.revenue (overview) must match the most recent COMPLETED full fiscal year
   entry in company_financials.revenue_growth. Both must reflect the same full year.
   Partial years, TTM, or forward projections are never acceptable in either field.
   (e.g., if revenue_growth latest entry is 2024: "$36.8B", then companies.revenue
   must also be "$36.8B"). Patch whichever is wrong:
     UPDATE companies SET revenue = '[value]' WHERE slug = '[slug]';
     -- OR update the revenue_growth JSON to match.
   FORMAT CONSISTENCY: Both values must use identical string format — not just the same
   number. "$2.2B" ≠ "$2,168M" ≠ "$2.17B" even though they are the same figure.
   Use the same format in both fields. Preferred format: "$X.XB" (e.g. "$2.17B", "$36.8B").
   Never use comma-thousands notation like "$2,168M" — use "$2.17B" instead.
   ARRAY ORDER: revenue_growth entries must be stored oldest-first (ascending year).
   Newest-first ordering causes staleness checks to silently fail.
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

⚠️ LEADERSHIP RECENCY CHECK — MANDATORY BEFORE INSERTING ANY EXEC:
Executive turnover is common and LinkedIn/company pages often lag weeks or months
behind actual changes. Before inserting ANY name (CEO, C-Suite, or VP), you MUST:
  1. Web search "[Company Name] CEO 2025" or "[Name] leaves [Company]" to check for
     recent departures, replacements, or role changes in the last 12 months.
  2. Check the company's official newsroom or press releases for leadership announcements.
  3. Only insert a name after confirming it is current via a source dated within the
     last 6 months. If no recent confirmation is found, note it as "unverified" in
     the company.md log — do not fabricate or assume the role is unchanged.
This check is non-negotiable. Inserting a departed executive is a data quality error.

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
