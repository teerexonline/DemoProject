
You are an expert full-stack developer specializing in Next.js 16 (App Router), React 19, TypeScript, and Supabase. You write clean, production-ready code that follows official documentation exactly. You don't over-engineer solutions or add unnecessary complexity. When implementing authentication, you copy patterns directly from Supabase's official examples rather than inventing custom approaches.

# Task: Build Landing Page with Supabase Authentication

## Overview
Build a marketing landing page with full Supabase email/password authentication for a Next.js 16 App Router project.

---
## Inspiration
use this website as inspiration
website name: framer.io
screenshot: 
Style: "<style>:root {--window-width: 551px !important;--vh: 8.61px;--top-bottom-mask-md: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><rect width="100%" height="100%" rx="20px" ry="20px" fill="black" /></svg>');--top-mask-md: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><rect width="100%" height="100%" rx="20px" ry="20px" fill="black" /><rect width="100%" height="100%" y="20px" fill="black" /></svg>');--bottom-mask-md: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><rect width="100%" height="100%" rx="20px" ry="20px" fill="black" /><rect width="100%" height="calc(100% - 20px)" y="0" fill="black" /></svg>');--top-bottom-mask-sm: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><rect width="100%" height="100%" rx="20px" ry="20px" fill="black" /></svg>');--top-mask-sm: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><rect width="100%" height="100%" rx="20px" ry="20px" fill="black" /><rect width="100%" height="100%" y="20px" fill="black" /></svg>');--bottom-mask-sm: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><rect width="100%" height="100%" rx="20px" ry="20px" fill="black" /><rect width="100%" height="calc(100% - 20px)" y="0" fill="black" /></svg>');--top-mask-12px: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><rect width="100%" height="100%" rx="12px" ry="12px" fill="black" /><rect width="100%" height="100%" y="12px" fill="black" /></svg>');--top-mask-8px: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><rect width="100%" height="100%" rx="8px" ry="8px" fill="black" /><rect width="100%" height="100%" y="8px" fill="black" /></svg>');--top-bottom-mask-20px: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><rect width="100%" height="100%" rx="20px" ry="20px" fill="black" /></svg>');--top-bottom-mask-12px: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><rect width="100%" height="100%" rx="10px" ry="10px" fill="black" /></svg>');--top-bottom-mask-10px: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><rect width="100%" height="100%" rx="10px" ry="10px" fill="black" /></svg>');--top-bottom-mask-8px: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><rect width="100%" height="100%" rx="8px" ry="8px" fill="black" /></svg>');--top-bottom-mask-5px: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><rect width="100%" height="100%" rx="5px" ry="5px" fill="black" /></svg>');--top-bottom-mask-3px: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><rect width="100%" height="100%" rx="3px" ry="3px" fill="black" /></svg>');--scroll-padding-top: 126px}</style>"

## Task 1: Landing Page Components

Create these sections in `components/landing/`:

### Header (`header.tsx`)
- Logo on left, navigation links center, Login button right, search bar also included
- Auth-aware: Show "Login" when logged out, Avatar dropdown with "Logout" when logged in
- Sticky positioning

### Hero (`hero.tsx`)
- Two-column layout: left side headline + CTA, right side image/graphic
- Primary CTA button linking to signup

### Features (`features.tsx`)
- 6 feature cards in a grid (3x2 on desktop, 1 column mobile)
- Each card: icon, title, description

### Pricing (`pricing.tsx`)
- 3 pricing tiers: Free, Pro, Enterprise
- Card layout with feature lists and CTA buttons
- Highlight the recommended tier

### Footer (`footer.tsx`)
- Multi-column links, copyright, social icons

---

## Task 2: Supabase Authentication

### Files to Create (in this order):

| Order | File                            | Purpose                       |
|-------|---------------------------------|-------------------------------|
| 1     | `.env.local`                    | Supabase credentials          |
| 2     | `lib/supabase/client.ts`        | Browser client                |
| 3     | `lib/supabase/server.ts`        | Server client                 |
| 4     | `lib/supabase/proxy.ts`         | Session refresh               |
| 5     | `proxy.ts`                      | Root proxy                    |
| 6     | `app/auth/callback/route.ts`    | Code exchange                 |
| 7     | `app/login/page.tsx`            | Login form                    |
| 8     | `app/signup/page.tsx`           | Signup form                   |
| 9     | `app/forgot-password/page.tsx`  | Request reset                 |
| 10    | `app/reset-password/page.tsx`   | Enter new password            |
| 11    | `app/logout/page.tsx`           | Sign out (server component)   |

### Official Supabase Examples (copy exactly):
- Browser Client: https://github.com/supabase/supabase/blob/master/examples/auth/nextjs/lib/supabase/client.ts
- Server Client: https://github.com/supabase/supabase/blob/master/examples/auth/nextjs/lib/supabase/server.ts
- Proxy Helper: https://github.com/supabase/supabase/blob/master/examples/auth/nextjs/lib/supabase/proxy.ts
- Root Proxy: https://github.com/supabase/supabase/blob/master/examples/auth/nextjs/proxy.ts

### Auth Flows (expected behavior):

**Signup Flow:**
1. User enters email/password on `/signup`
2. Call `supabase.auth.signUp()` with `emailRedirectTo: /auth/callback`
3. User receives confirmation email, clicks link
4. Supabase redirects to `/auth/callback?code=xxx`
5. Callback exchanges code via `exchangeCodeForSession(code)`
6. User redirects to home, logged in

**Login Flow:**
1. User enters credentials on `/login`
2. Call `supabase.auth.signInWithPassword()`
3. On success, redirect to home logged in

**Logout Flow:**
1. User clicks logout (navigates to `/logout`)
2. Server component calls `supabase.auth.signOut()`
3. Immediately redirects to home, logged out

**Password Reset Flow:**
1. User enters email on `/forgot-password`
2. Call `resetPasswordForEmail()` with `redirectTo: /auth/callback?next=/reset-password`
3. User receives reset email, clicks link
4. Supabase redirects to `/auth/callback?code=xxx&next=/reset-password`
5. Callback exchanges code, redirects to `/reset-password`
6. User enters new password, calls `updateUser({ password })`
7. On success, redirect to home

### Implementation Rules:

1. **Copy official examples exactly** - do not modify the patterns
2. **Use `getClaims()` not `getUser()`** in the proxy for session refresh
3. **Do NOT modify Supabase email templates** - the default flow works
4. **Auth callback only needs `code` param** via `exchangeCodeForSession(code)`
5. **Logout must be a server component** (not client with useEffect):
   ```typescript
   // app/logout/page.tsx
   import { redirect } from 'next/navigation'
   import { createClient } from '@/lib/supabase/server'

   export default async function LogoutPage() {
     const supabase = await createClient()
     await supabase.auth.signOut()
     redirect('/')
   }
   ```

### Do NOT:
- Modify Supabase email templates
- Add `token_hash` or `type` handling to auth callback
- Use `getUser()` in proxy (use `getClaims()`)
- Make logout a client component
- Add complexity when simple code works
- Blame cookies for HTTP 431 errors

---

## Guidelines

### Error Troubleshooting

| Error               | NOT the cause      | Actual cause            | Fix                       |
|---------------------|--------------------|-------------------------|---------------------------|
| HTTP 431            | Cookies, auth code | Corrupted .next cache   | Clear cache               |
| Turbopack panic     | Your code          | Cache corruption        | Clear cache               |
| Auth callback loops | Token handling     | Missing `next` param    | Add `?next=` to redirectTo|
| Logout spinning     | useEffect deps     | Should be server component | Use server component   |

**First response to ANY error:**

```bash
rm -rf .next node_modules/.cache && npm run dev
```

Do NOT modify auth code to "fix" cache issues.

### When Uncertain

Use the Supabase MCP tool to look up current documentation:
```
mcp__supabase__search_docs
```

Query the docs before implementing unfamiliar auth patterns.

---

## Environment Variables

Create `.env.local` and use Supabase MCP to extract the Supabase project URL and ANON key

```
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```
## Python code 1st run
Four independent scrapers run concurrently via ThreadPoolExecutor:                                                    
                                                                                                                        
  ┌─────────────────┬─────────────┬─────────────────────────────────────────────────────────────────────┐               
  │     Source      │    Tier     │                            Data provided                            │               
  ├─────────────────┼─────────────┼─────────────────────────────────────────────────────────────────────┤               
  │ SEC EDGAR       │ 1 (highest) │ Revenue, employees, HQ, industry/SIC code, public float/valuation   │             
  ├─────────────────┼─────────────┼─────────────────────────────────────────────────────────────────────┤             
  │ Wikidata        │ 1           │ Founded year, HQ, employee count, revenue, description, industry    │               
  ├─────────────────┼─────────────┼─────────────────────────────────────────────────────────────────────┤               
  │ Yahoo Finance   │ 2           │ Market cap, TTM revenue, sector, industry, description              │               
  ├─────────────────┼─────────────┼─────────────────────────────────────────────────────────────────────┤               
  │ Company website │ 3           │ Schema.org/Organization, OpenGraph description, hiring status, tags │             
  └─────────────────┴─────────────┴─────────────────────────────────────────────────────────────────────┘               
                                                                                                                  
  Key engineering decisions:                                                                                            
  - Priority-ranked field merging — Tier 1 data never gets overwritten by Tier 3                                      
  - RobustSession — Retries, rate-limit respect (Retry-After header), timeout handling                                  
  - Graceful degradation — works for private companies (no SEC data) by falling back to Wikidata/website
  - Clean output contract — JSON to stdout, all logs to stderr                                                          
                                                                                                                        
  app/api/seed-company/route.ts — Auth-gated Next.js route that spawns the Python process, handles                      
  timeout/crash/missing-Python errors with actionable messages.                                                         
                                                                                                                        
  Admin dashboard — "Seed from Web" button (amber, below Save):                                                         
  - Validates Name + Website are filled — shows inline error if not                                                   
  - Shows spinner + "Scraping web sources…" while running                                                               
  - On success: merges scraped data into form without overwriting existing values                                     
  - Shows "✓ Seeded N fields from M sources" or a specific error message

## PYTHON Prompt
You are a senior Python engineer. Build a production-quality Python script that collects structured company data with the following priority order and logic.

## 🎯 Goal
Create a data pipeline that retrieves the following fields for a given company name or ticker:

- name  
- slug  
- category (industry)  
- headquarters (city, country)  
- website  
- employees  
- founded year  
- revenue  
- valuation  
- description  
- is_hiring (if possible)  
- data_source (track origin of each field)  
- confidence_score (high / medium / low)

---

## 🔥 Priority Data Source (MANDATORY FIRST STEP)

### 1. SEC EDGAR (PRIMARY SOURCE)
Use the SEC EDGAR system as the FIRST attempt for data retrieval.

Requirements:
- Use the SEC submissions API: https://data.sec.gov/submissions/
- Identify the company via ticker or CIK
- Automatically detect and download the latest 10-K (Q4 annual report)
- Parse the filing (HTML or text)

Extract:
- revenue
- net income (optional)
- company description (business section)
- headquarters (if available)

Implementation details:
- Use requests
- Parse HTML using BeautifulSoup or lxml
- Handle rate limits (add headers with User-Agent)
- Build a function:
  get_edgar_data(company_name_or_ticker) -> dict

---

## ⚠️ If EDGAR fails (PRIVATE COMPANY OR NO DATA)

Implement FALLBACK SYSTEM:

---

## 2. Wikipedia Scraper
Scrape https://en.wikipedia.org/wiki/{company}

Extract from infobox + page:
- name
- founded
- headquarters
- industry (category)
- employees (if available)
- revenue (if available)
- website
- description (first paragraph)

---

## 3. News Scraper (for valuation)
Scrape recent articles from:
- TechCrunch
- Forbes

Goal:
- Extract valuation using regex patterns like:
  "$X valuation"
  "valued at $X"

---

## 4. OpenCorporates API
Use:
https://api.opencorporates.com/

Extract:
- incorporation date
- registered address

---

## 5. Company Website Scraper
If website is known:
- Scrape "About" page
- Extract description and possible HQ

---

## 6. Revenue Estimation (LAST RESORT)
If revenue is missing:
- Estimate using:

revenue = employees * multiplier

Multipliers:
- software: 200000
- fintech: 250000
- ecommerce: 300000
- default: 150000

---

## 🧠 Data Merging Logic

- Prioritize EDGAR over all sources
- Then Wikipedia
- Then others

Example:
if edgar["revenue"]:
    use it
else if wikipedia["revenue"]:
    use it
else:
    estimate

---

## 📊 Confidence Scoring

Assign:
- HIGH → EDGAR
- MEDIUM → Wikipedia / OpenCorporates
- LOW → estimates / scraping

---

## 🧱 Code Requirements

- Use Python
- Use:
  - requests
  - BeautifulSoup
  - re (regex)
- Modular structure:
  - edgar.py
  - wikipedia.py
  - news_scraper.py
  - aggregator.py

- Include:
  - error handling
  - retry logic
  - clean JSON output

---

## 📦 Output Format

Return structured JSON like:

{
  "name": "...",
  "revenue": {
    "value": 500000000,
    "source": "EDGAR",
    "confidence": "high"
  },
  ...
}

---

## 🚀 Extra (if possible)

- Auto-detect if company is public or private
- If ticker not provided, attempt lookup
- Add caching to avoid repeated requests

---

Write full working Python code with clear comments.
