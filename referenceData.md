# Reference Data — Gold Standard Companies

This file is the single source of truth for data quality. Before seeding any company,
read this file and run a quick spot-check query on ONE company from the verified list.
Every section below shows the exact structure and depth required.

---

## Gold Standard: Zebra Technologies ✓

**Why it's the reference:** Real names at all 3 exec tiers, VPs linked to departments,
Lucide icons throughout, realistic headcounts, role-specific tools/skills/processes/
interview questions, complete financials with 5-year growth, company-specific standards.

---

### Section 1 — Company Overview

Fields required on the `companies` row:
- `description`: 2–3 sentences. What the company does + who it serves. No fluff.
- `founded`: integer year
- `hq`: "City, State/Country"
- `employees`: realistic integer (cross-check LinkedIn)
- `revenue`: string with unit e.g. `"$5.4B"`
- `valuation`: market cap if public, last round if private e.g. `"$14.8B"`
- `tags`: 3–5 string array e.g. `["Enterprise", "Hardware", "SaaS", "Logistics"]`
- `is_hiring`: true/false
- `logo_color`: brand hex e.g. `"#7C3AED"`

---

### Section 2 — Products

Quality bar (from Zebra):
- `name`: exact product name as marketed
- `tagline`: real product tagline from product page — never scraped meta garbage
- `description`: 2 real sentences explaining what it does and who uses it.
  NOT `"{name} by {company}. {tagline}."` — that's the scraper default, always replace.
- `category`: one of the allowed values — correct classification matters
  (e.g. TC73 → Mobile Computer, NOT Analytics)
- `use_cases`: 3 domain-specific real-world scenarios written as actions
  e.g. `"Configuring DataWedge profiles for warehouse scanning workflows"`
  NOT generic: `"Product Integration"`, `"Business Automation"`
- `customers`: 3 real named customers from official case studies
  `[{"name":"Boeing","abbr":"BA","bg":"#1a6396"}, ...]`
- `competitors`: 3 real competitors with a description of the competitor product and a one-line edge
  `[{"name":"Honeywell CN80","description":"Honeywell's CN80 is a rugged Android mobile computer designed for warehouse and distribution center scanning, offering extended battery life and a built-in physical keyboard for high-volume data entry.","edge":"Wider Android device portfolio with deeper AOSP customization"}, ...]`
  RULE: "description" must describe the COMPETITOR product — neutral and factual, not about this company.
- `image_url`: scraped og:image → logo_url for SaaS → NULL for hardware with no image

---

### Section 3 — News

Quality bar (from Zebra):
5 items. Each must be a real, dated, sourced event — not invented.

Example entries:
```
headline: "Zebra Technologies Announces Fourth-Quarter and Full-Year 2025 Results"
summary:  "Zebra reported full-year 2025 revenue of $5.4B, up 8.3% YoY, with Q4 net sales of $1.475B up 10.6%."
published_date: "Feb 12, 2026"
type: "Press Release"
type_color / type_bg / dot_color: tinted hex pair matching the type
```

Type → color mapping used at Zebra (use as reference):
| type | type_color | type_bg | dot_color |
|------|-----------|---------|-----------|
| Press Release | #0369A1 | #EFF6FF | #3B82F6 |
| Partnership | #065F46 | #ECFDF5 | #10B981 |
| Product Launch | #92400E | #FFFBEB | #F59E0B |
| Acquisition | #6D28D9 | #F5F3FF | #8B5CF6 |
| Award | #065F46 | #ECFDF5 | #10B981 |
| Funding | #065F46 | #ECFDF5 | #10B981 |

---

### Section 4 — Milestones

Quality bar (from Zebra):
8–10 items spanning founding → present. Each has a real date, real detail sentence,
correct type, matching lucide icon, tinted color pair, and short badge label.

Example entries:
```
year: 1969, title: "Founded as Data Specialties Inc.", type: "founding"
icon: "rocket", accent_color: "#16A34A", bg_color: "#F0FDF4", badge: "Founded"

year: 2014, title: "Acquired Motorola Solutions Enterprise Division"
detail: "Zebra acquired Motorola Solutions' Enterprise Division for $3.45B..."
type: "acquisition", icon: "building-2", badge: "$3.45B Deal"
```

Type → icon mapping reference:
| type | icon |
|------|------|
| founding | rocket |
| funding | dollar-sign |
| acquisition | building-2 or handshake |
| ipo | trending-up |
| product | package or printer |
| award | trophy |
| expansion | globe |

---

### Section 5 — Financials

Quality bar (from Zebra):
```json
{
  "tam": "$65B",
  "sam": "$28B",
  "som": "$5.4B",
  "arr": "$5.4B",
  "yoy_growth": "+8.3%",
  "revenue_per_employee": "$514K",

  "revenue_streams": [
    {"name":"Hardware","type":"product","percentage":68,
     "description":"Revenue from mobile computers, barcode scanners... sold to enterprise customers."},
    {"name":"Software & Services","type":"subscription","percentage":20,
     "description":"Recurring revenue from Zebra DNA platform licenses, Reflexis workforce software..."},
    {"name":"Supplies","type":"product","percentage":12,
     "description":"Consumables including thermal labels, RFID inlays... through a recurring channel partner model."}
  ],

  "business_units": [
    {"name":"Connected Frontline (EVM)","revenue_contribution":"65%",
     "description":"Enterprise Visibility & Mobility segment covering mobile computers..."},
    {"name":"Asset Visibility & Automation (AIT)","revenue_contribution":"35%",
     "description":"Asset Intelligence & Tracking segment covering barcode scanners, RFID..."}
  ],

  "market_share": [
    {"segment":"Enterprise Mobile Computing & Barcode","percentage":34,"year":2025,
     "context":"Zebra holds approximately 34% of the global enterprise mobile computing..."}
  ],

  "revenue_growth": [
    {"year":2021,"revenue":"$5.6B","growth_rate":"+13%"},
    {"year":2022,"revenue":"$5.8B","growth_rate":"+3%"},
    {"year":2023,"revenue":"$4.4B","growth_rate":"-24%"},
    {"year":2024,"revenue":"$5.0B","growth_rate":"+14%"},
    {"year":2025,"revenue":"$5.4B","growth_rate":"+8%"}
  ],

  "competitors": [
    {"name":"Zebra Technologies","pct":34,"clr":"#7C3AED"},
    {"name":"Honeywell","pct":24,"clr":"#DC2626"},
    {"name":"Datalogic","pct":12,"clr":"#0369A1"},
    {"name":"Cognex","pct":10,"clr":"#16A34A"},
    {"name":"Others","pct":20,"clr":"#A1A1AA"}
  ]
}
```

Rules:
- `revenue_growth` must cover last 5 years ending in the current year (2025 or 2026)
- `competitors` pct must sum to exactly 100; always include this company first
- `revenue_streams` percentages must sum to 100
- `description` in each stream must be company-specific — not generic

---

### Section 6 — Standards

Quality bar (from Zebra — 10 entries):
Each entry must be specific to what THIS company does.

Example:
```
code: "HIPAA", category: "Privacy", cat_color: "#6D28D9", status: "Compliant"
description: "Zebra's healthcare mobile computers and software solutions are designed
to support HIPAA-compliant workflows, protecting patient data in clinical and hospital settings."
```

Rules:
- `description` must mention the company by name and explain WHY this cert matters to them
- Never write generic descriptions like "This company complies with HIPAA."
- `status`: Certified | Compliant | In Progress

Category → color reference:
| category | cat_color |
|----------|-----------|
| Security | #DC2626 |
| Quality | #16A34A |
| Privacy | #6D28D9 |
| Environmental | #065F46 |
| Safety | #CA8A04 |
| Regulatory | #0369A1 |
| Accessibility | #7C3AED |

---

### Section 7 — Departments

Quality bar (from Zebra):
| name | icon | color | headcount |
|------|------|-------|-----------|
| Engineering | `cpu` | `#2563EB` | 2500 |
| Sales | `handshake` | `#16A34A` | 1500 |
| Manufacturing | `factory` | `#92400E` | 2000 |
| Supply Chain | `truck` | `#0369A1` | 800 |
| Program Management | `git-branch` | `#0F766E` | 380 |
| Products & Solutions | `package` | `#7C3AED` | 550 |
| Marketing | `megaphone` | `#CA8A04` | 420 |
| Customer Service & Support | `headphones` | `#0284C7` | 700 |
| Information Technology | `server` | `#64748B` | 260 |
| Finance | `dollar-sign` | `#059669` | 320 |
| Human Resources | `users` | `#F59E0B` | 310 |
| Strategic Planning & Corp Dev | `compass` | `#6D28D9` | 160 |
| Corporate Affairs & Legal | `scale` | `#4338CA` | 180 |

Rules:
- Icons are lucide-react names ONLY — NEVER emoji (❌ `⚙️`, `🧩`, `👥`)
- Every department has a distinct color — no two share the same hex
- Headcounts are realistic estimates, not round thousands

---

### Section 8 — Roles

Quality bar (from Zebra Engineering dept):

```
title: "Firmware Engineer", level: "Mid"
tools:   ["IAR Embedded Workbench", "GCC for ARM", "Yocto Project", "Lauterbach JTAG Debugger", "Git"]
skills:  ["C / C++ embedded programming", "RTOS (ThreadX / embedded Linux)", "Device driver development",
          "Low-power optimization", "Bootloader customization"]
processes: [
  "Firmware bring-up on new Zebra hardware platforms",
  "JTAG-based debugging and trace of bare-metal and RTOS code",
  "Cross-team hardware / firmware design reviews",
  "Writing unit tests on embedded targets using Google Test",
  "Building and releasing signed OTA firmware packages"
]
interview_questions: [
  "Describe your experience working with RTOS — how do you manage task priorities and avoid priority inversion?",
  "How would you debug a firmware crash with no console output, only a JTAG probe?",
  "What is your approach to porting an existing embedded codebase to a new ARM SoC?",
  "Walk us through how you used Yocto to build a custom Linux distribution for a new platform.",
  "How do you test firmware changes when hardware bring-up is still incomplete?"
]
keywords: ["firmware", "embedded C/C++", "RTOS", "ThreadX", "Yocto", "JTAG", "embedded Linux"]
```

Rules:
- `tools`: 5 items — must match the ACTUAL tech stack for this exact role. A firmware engineer
  uses JTAG and RTOS tools, NOT Docker/Kubernetes. A field sales rep uses Salesforce and Gong,
  NOT GitHub. Never copy tools from one role type to another.
- `skills`: 5 items — role AND company specific. Not generic.
- `processes`: 5 items — written as actions the person actually does at work.
  NOT abstract: "Data management". YES specific: "Configuring DataWedge profiles for warehouse scanning".
  Must mention the company's actual products/platform where relevant.
- `interview_questions`: 5 items — grounded in THIS company's products, tech stack, and domain.
  NOT generic: "Tell me about yourself." YES specific: "How would you design a warehouse RFID
  solution using Zebra fixed readers?"
- `keywords`: 5–7 resume keywords a recruiter at this company searches for

---

### Section 9 — Exec Groups

Quality bar (from Zebra — 3 tiers, all real names):

**Tier 1 — CEO (1 row):**
```
title: "Chief Executive Officer", short_title: "CEO"
name: "Bill Burns", level: "ceo", sort_order: 0, department_ids: []
```

**Tier 2 — C-Suite (6–10 rows):**
```
{title:"Chief Financial Officer", short_title:"CFO", name:"Nathan Winters", level:"c_suite"}
{title:"Chief Technology Officer", short_title:"CTO", name:"Tom Bianculli",  level:"c_suite"}
{title:"Chief Revenue Officer",    short_title:"CRO", name:"Richard Hudson", level:"c_suite"}
{title:"Chief Marketing Officer",  short_title:"CMO", name:"Robert Armstrong", level:"c_suite"}
{title:"Chief Supply Chain Officer",short_title:"CSCO",name:"Tamara Froese",  level:"c_suite"}
{title:"Chief Information Officer", short_title:"CIO", name:"Matt Ausman",    level:"c_suite"}
{title:"Chief Legal Officer",       short_title:"CLO", name:"Cristen Kogl",   level:"c_suite"}
{title:"Chief People Officer",      short_title:"CPO", name:"Melissa Luff Loizides", level:"c_suite"}
```

**Tier 3 — VPs (4–8 rows), with department_ids:**
```
{title:"VP, Engineering", short_title:"VP Eng", name:"Isidre Martos", level:"vp",
 department_ids:["<engineering-uuid>","<products-uuid>"]}
{title:"VP, Sales", short_title:"VP Sales", name:"Marcos Bordin", level:"vp",
 department_ids:["<sales-uuid>","<customer-service-uuid>"]}
{title:"VP, Marketing", short_title:"VP Mktg", name:"Bill Cate", level:"vp",
 department_ids:["<marketing-uuid>"]}
{title:"VP, Supply Chain", short_title:"VP SC", name:"Tamara Froese", level:"vp",
 department_ids:["<manufacturing-uuid>","<supply-chain-uuid>"]}
{title:"VP, People & Talent", short_title:"VP HR", name:"Laura Mansen", level:"vp",
 department_ids:["<hr-uuid>"]}
```

Rules:
- `name` is NEVER null — always a real person's full name sourced from the company website/LinkedIn
- All 3 tiers must be present — do not skip VPs
- VP `department_ids` must use real UUIDs from the departments inserted in step 7

---

## Companies with complete, verified data

| Company | Seeded | All sections | Exec names | VP dept_ids | Lucide icons |
|---------|--------|-------------|-----------|-------------|--------------|
| Zebra Technologies | 2026-04-07 | ✓ | ✓ | ✓ | ✓ |
| Vercel | — | partial | ✗ | ✗ | ✓ |

---

## Companies pending upgrade to gold standard

| Company | Exec names | VP tier | Lucide icons |
|---------|-----------|---------|--------------|
| Airbnb | ✗ | ✗ | ✓ |
| Anthropic | ✗ | ✗ | ✓ |
| Apple | ✗ | ✗ | ✓ |
| Atlassian | ✗ | ✗ | ✗ emoji |
| Bombardier | ✗ | ✗ | ✓ |
| CAE | ✗ | ✗ | ✓ |
| Canva | ✗ | ✗ | ✗ emoji |
| Cloudflare | ✗ | ✗ | ✗ emoji |
| Coinbase | ✗ | ✗ | ✗ emoji |
| Databricks | ✗ | ✗ | ✗ emoji |
| Datadog | ✗ | ✗ | ✗ emoji |
| DoorDash | ✗ | ✗ | ✗ emoji |
| Figma | ✗ | ✗ | ✗ emoji |
| Google | ✗ | ✗ | ✓ |
| Linear | ✗ | ✗ | ✓ |
| Meta | ✗ | ✗ | ✓ |
| MongoDB | ✗ | ✗ | ✓ |
| Netflix | ✗ | ✗ | ✓ |
| Notion | ✗ | ✗ | ✓ |
| OpenAI | ✗ | ✗ | ✓ |
| Palantir | ✗ | ✗ | ✓ |
| Shopify | ✗ | ✗ | ✓ |
| Snowflake | ✗ | ✗ | ✓ |
| Spotify | ✗ | ✗ | ✓ |
| Stripe | ✗ | ✗ | ✓ |
| Tesla | ✗ | ✗ | ✓ |
| Twilio | ✗ | ✗ | ✓ |
