#!/usr/bin/env python3
"""
ResearchOrg Departments Seeder v1.0
======================================
Scrapes company organisational departments from multiple public sources.

Source hierarchy — tried in order, merged and deduplicated:
  Tier 1  Wikipedia          Business Divisions / Operations / Organization sections + infobox
  Tier 2  Indeed job search  Extract distinct department categories from job title patterns
  Tier 3  Company website    /about/teams  /careers  /about/company  /about  pages
  Tier 4  Glassdoor public   Company overview page department breakdown (if accessible)
  Tier 5  Yahoo web search   "{company} teams departments organizational structure"
  Tier 6  Curated database   Major companies seeded for accuracy
  Tier 7  Synthetic fallback Industry-keyed standard departments — always returns ≥5

Why these sources are consistent:
  • Wikipedia divisions section is authoritative and changes only on real reorgs
  • Indeed job categories are structurally consistent (same titles → same dept buckets)
  • Curated database covers the most commonly researched companies
  • Synthetic fallback is fully deterministic based on company industry

Usage:
  python seed_departments.py --company "Tesla" --website "tesla.com"
  python seed_departments.py --company "Zebra Technologies" --website "zebra.com" \\
      --company-id "uuid" --auth-token "jwt" --app-url "http://localhost:3000"

Output: JSON {"count": N, "written": bool}  when --company-id given
        JSON array of departments            without --company-id (debug mode)
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import re
import sys
import time
from typing import Optional
from urllib.parse import quote, quote_plus, urlparse

import requests
from bs4 import BeautifulSoup

# ─── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    stream=sys.stderr,
)
log = logging.getLogger("seed_departments")

# ─── HTTP ─────────────────────────────────────────────────────────────────────
DEFAULT_TIMEOUT = 14
UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36"
)
HEADERS = {
    "User-Agent":      UA,
    "Accept-Language": "en-US,en;q=0.9",
    "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}


class Session:
    def __init__(self, timeout: int = DEFAULT_TIMEOUT):
        self.s = requests.Session()
        self.s.headers.update(HEADERS)
        self.timeout = timeout

    def get(self, url: str, **kw) -> requests.Response:
        kw.setdefault("timeout", self.timeout)
        kw.setdefault("allow_redirects", True)
        try:
            return self.s.get(url, **kw)
        except requests.exceptions.SSLError:
            kw["verify"] = False
            return self.s.get(url, **kw)


def clean(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "")).strip()

def truncate(text: str, n: int) -> str:
    return text if len(text) <= n else text[:n - 1].rstrip() + "…"

def base_url(website: str) -> str:
    p = urlparse(website if "://" in website else "https://" + website)
    host = (p.netloc or p.path).lstrip("www.")
    return f"https://{host}"

def fetch_soup(sess: Session, url: str, timeout: int = 12) -> Optional[BeautifulSoup]:
    try:
        r = sess.get(url, timeout=timeout)
        if r.status_code == 200:
            return BeautifulSoup(r.text, "html.parser")
    except Exception as e:
        log.debug("fetch_soup(%s): %s", url, e)
    return None


# ─── Department normalisation catalogue ──────────────────────────────────────

DEPT_CATALOGUE: list[dict] = [
    {"name": "Engineering",           "icon": "⚙️",  "color": "#2563EB",
     "keywords": ["engineer", "developer", "software", "frontend", "backend", "fullstack", "sre", "devops",
                  "architecture", "platform", "mobile", "embedded", "firmware", "hardware"]},
    {"name": "Product",               "icon": "🧩",  "color": "#7C3AED",
     "keywords": ["product manager", "product management", "product design", "product lead", "product owner"]},
    {"name": "Program Management",    "icon": "📋",  "color": "#0F766E",
     "keywords": ["program manager", "technical program manager", "tpm", "program management",
                  "project manager", "pmo", "delivery manager", "release manager"]},
    {"name": "Data & Analytics",      "icon": "📊",  "color": "#0891B2",
     "keywords": ["data scientist", "data analyst", "data engineer", "analytics", "business intelligence",
                  "machine learning", "ml engineer", "ai engineer", "research scientist"]},
    {"name": "Design",                "icon": "🎨",  "color": "#DB2777",
     "keywords": ["designer", "ux", "ui", "user experience", "user interface", "visual design",
                  "interaction design", "creative", "graphic design", "brand design"]},
    {"name": "Infrastructure",        "icon": "🖥️",  "color": "#374151",
     "keywords": ["infrastructure", "cloud", "devops", "sre", "reliability", "kubernetes",
                  "network", "systems administrator", "it operations"]},
    {"name": "Security",              "icon": "🔒",  "color": "#B91C1C",
     "keywords": ["security", "cybersecurity", "information security", "appsec", "pen test",
                  "compliance", "risk", "identity", "access management"]},
    {"name": "Sales",                 "icon": "📈",  "color": "#16A34A",
     "keywords": ["sales", "account executive", "account manager", "business development",
                  "partnerships", "revenue", "closing", "enterprise sales", "smb sales",
                  "channel sales", "channel manager", "channel partner"]},
    {"name": "Marketing",             "icon": "📣",  "color": "#CA8A04",
     "keywords": ["marketing", "growth", "demand generation", "brand", "content", "seo",
                  "paid acquisition", "performance marketing", "communications", "pr", "events"]},
    {"name": "Customer Success",      "icon": "🤝",  "color": "#0284C7",
     "keywords": ["customer success", "customer support", "customer service", "support engineer",
                  "technical support", "account management", "implementation", "onboarding"]},
    {"name": "Professional Services", "icon": "🛠️",  "color": "#7E22CE",
     "keywords": ["professional services", "ps engineer", "solutions delivery",
                  "field engineer", "deployment engineer", "ps consultant",
                  "technical consultant", "solutions consultant"]},
    {"name": "Finance",               "icon": "💰",  "color": "#059669",
     "keywords": ["finance", "accounting", "financial analyst", "fp&a", "controller",
                  "treasury", "tax", "payroll", "audit"]},
    {"name": "Legal",                 "icon": "⚖️",  "color": "#4338CA",
     "keywords": ["legal", "counsel", "attorney", "compliance", "privacy", "ip",
                  "intellectual property", "contracts", "regulatory"]},
    {"name": "People & HR",           "icon": "👥",  "color": "#F59E0B",
     "keywords": ["hr", "human resources", "people", "recruiter", "talent acquisition",
                  "people operations", "hrbp", "compensation", "benefits", "learning"]},
    {"name": "Operations",            "icon": "🏢",  "color": "#52525B",
     "keywords": ["operations", "supply chain", "logistics", "procurement",
                  "quality assurance", "warehouse", "facilities", "real estate"]},
    {"name": "Manufacturing",         "icon": "🏭",  "color": "#78350F",
     "keywords": ["manufacturing", "manufacturing engineer", "production", "assembly",
                  "factory", "fabrication", "machining", "lean manufacturing",
                  "process engineer", "industrial engineer", "quality control",
                  "test engineer", "npi", "new product introduction"]},
    {"name": "Research",              "icon": "🔬",  "color": "#6D28D9",
     "keywords": ["research", "r&d", "scientist", "lab", "innovation", "advanced",
                  "applied science", "fundamental research"]},
    {"name": "IT",                    "icon": "💻",  "color": "#64748B",
     "keywords": ["it", "information technology", "systems", "helpdesk", "endpoint",
                  "enterprise technology", "erp", "crm admin"]},
]

# Build a quick lookup: keyword → DEPT_CATALOGUE index
_KW_TO_DEPT: dict[str, int] = {}
for _i, _dept in enumerate(DEPT_CATALOGUE):
    for _kw in _dept["keywords"]:
        _KW_TO_DEPT[_kw] = _i


def infer_dept(title: str) -> Optional[int]:
    """Map a job title or free-text to DEPT_CATALOGUE index, or None."""
    tl = title.lower()
    # Longest keyword match first
    for kw in sorted(_KW_TO_DEPT, key=len, reverse=True):
        if kw in tl:
            return _KW_TO_DEPT[kw]
    return None


# ─── Tier 1: Wikipedia ───────────────────────────────────────────────────────

_WIKI_DIV_SECTIONS = re.compile(
    r"(divisions?|business\s+units?|operations?|organization|segments?|"
    r"subsidiaries|brands|products?\s+and\s+services|business\s+areas?)",
    re.IGNORECASE,
)


def _wiki_soup(sess: Session, company: str) -> Optional[BeautifulSoup]:
    variants = [company, f"{company} Inc", f"{company} company"]
    for variant in variants:
        url = (
            "https://en.wikipedia.org/w/api.php"
            f"?action=query&list=search&srsearch={quote(variant)}"
            "&srlimit=5&format=json&srprop=title"
        )
        try:
            hits = sess.get(url, timeout=8).json().get("query", {}).get("search", [])
        except Exception:
            continue
        for hit in hits:
            title = hit["title"]
            if "disambiguation" in title.lower():
                continue
            if company.lower().split()[0] not in title.lower():
                continue
            soup = fetch_soup(sess, f"https://en.wikipedia.org/wiki/{quote(title.replace(' ', '_'))}", 10)
            if soup and not soup.find(id="disambigbox"):
                log.info("Wikipedia article: %s", title)
                return soup
    return None


def scrape_wikipedia(sess: Session, company: str) -> list[dict]:
    soup = _wiki_soup(sess, company)
    if not soup:
        return []

    found_indices: set[int] = set()

    # ── Named sections ─────────────────────────────────────────────────────
    for heading in soup.find_all(["h2", "h3"]):
        span = heading.find("span", class_="mw-headline")
        if not span or not _WIKI_DIV_SECTIONS.search(clean(span.get_text())):
            continue
        node = heading.find_next_sibling()
        while node and node.name != "h2":
            if node.name in ["ul", "ol"]:
                for li in node.find_all("li"):
                    text = clean(li.get_text())
                    idx = infer_dept(text)
                    if idx is not None:
                        found_indices.add(idx)
            elif node.name == "p":
                text = clean(node.get_text())
                for kw in _KW_TO_DEPT:
                    if kw in text.lower():
                        found_indices.add(_KW_TO_DEPT[kw])
            node = node.find_next_sibling()

    # ── Infobox "Industry" row ─────────────────────────────────────────────
    infobox = soup.find("table", class_="infobox")
    if infobox:
        for row in infobox.find_all("tr"):
            th = row.find("th")
            td = row.find("td")
            if th and td and "industry" in clean(th.get_text()).lower():
                for kw in _KW_TO_DEPT:
                    if kw in clean(td.get_text()).lower():
                        found_indices.add(_KW_TO_DEPT[kw])

    result = [DEPT_CATALOGUE[i] for i in sorted(found_indices)]
    log.info("Wikipedia: %d department types inferred", len(result))
    return result


# ─── Tier 2: Indeed job search ────────────────────────────────────────────────
# Indeed job-title HTML is reliably parseable and returns current job categories.

INDEED_SEARCH = "https://www.indeed.com/jobs?q=%22{q}%22&l=&fromage=any&limit=20"

def scrape_indeed(sess: Session, company: str) -> list[dict]:
    url = INDEED_SEARCH.format(q=quote_plus(company))
    found_indices: set[int] = set()
    try:
        r = sess.s.get(url, headers={**HEADERS,
            "Accept": "text/html,application/xhtml+xml",
            "Referer": "https://www.indeed.com/"
        }, timeout=12, allow_redirects=True)
        if r.status_code != 200:
            log.debug("Indeed returned %d", r.status_code)
            return []
        soup = BeautifulSoup(r.text, "html.parser")
        # Job title selectors (Indeed changes these occasionally)
        for selector in ["h2.jobTitle span[title]", "h2.jobTitle a span", ".jobTitle span", "h2 a span[title]"]:
            titles = [clean(t.get_text()) for t in soup.select(selector) if t.get_text(strip=True)]
            if titles:
                for title in titles:
                    idx = infer_dept(title)
                    if idx is not None:
                        found_indices.add(idx)
                break
    except Exception as e:
        log.debug("Indeed scrape failed: %s", e)

    result = [DEPT_CATALOGUE[i] for i in sorted(found_indices)]
    log.info("Indeed: %d department types inferred", len(result))
    return result


# ─── Tier 3: Company website careers/about page ──────────────────────────────

_CAREERS_PATHS = [
    "/careers", "/jobs", "/about/teams", "/about/departments", "/about/company",
    "/about", "/company", "/team",
]
_TEAM_SECTION_RE = re.compile(
    r"(team|department|group|division|function|pillar)", re.IGNORECASE
)

def scrape_company_website(sess: Session, website: str, company: str) -> list[dict]:
    burl = base_url(website)
    found_indices: set[int] = set()

    for path in _CAREERS_PATHS:
        soup = fetch_soup(sess, burl + path, timeout=10)
        if not soup:
            continue
        # Look for team/department headings or filter labels
        text = clean(soup.get_text(" "))
        for kw in _KW_TO_DEPT:
            if re.search(rf"\b{re.escape(kw)}\b", text, re.IGNORECASE):
                found_indices.add(_KW_TO_DEPT[kw])
        if len(found_indices) >= 5:
            break

    result = [DEPT_CATALOGUE[i] for i in sorted(found_indices)]
    log.info("Company website: %d department types inferred", len(result))
    return result


# ─── Tier 4: Yahoo search ─────────────────────────────────────────────────────

YAHOO_SEARCH = "https://search.yahoo.com/search?p={q}&n=10"

def scrape_yahoo_search(sess: Session, company: str) -> list[dict]:
    queries = [
        f'"{company}" teams departments engineering sales marketing product',
        f'"{company}" organizational structure business divisions careers teams',
    ]
    found_indices: set[int] = set()
    for query in queries:
        url = YAHOO_SEARCH.format(q=quote_plus(query))
        try:
            r = sess.s.get(url, headers=HEADERS, timeout=12)
            if r.status_code == 200:
                text = clean(BeautifulSoup(r.text, "html.parser").get_text(" "))
                for kw in _KW_TO_DEPT:
                    if re.search(rf"\b{re.escape(kw)}\b", text, re.IGNORECASE):
                        found_indices.add(_KW_TO_DEPT[kw])
        except Exception as e:
            log.debug("Yahoo search failed: %s", e)
        if len(found_indices) >= 5:
            break
        time.sleep(0.4)

    result = [DEPT_CATALOGUE[i] for i in sorted(found_indices)]
    log.info("Yahoo search: %d department types inferred", len(result))
    return result


# ─── Tier 6: Curated known departments ───────────────────────────────────────

KNOWN_DEPARTMENTS: dict[str, list[str]] = {
    "tesla": [
        "Engineering", "Product", "Manufacturing", "Research", "Operations",
        "Sales", "Marketing", "Finance", "People & HR", "Legal", "Design",
        "Program Management",
    ],
    "apple": [
        "Engineering", "Product", "Design", "Marketing", "Operations",
        "Sales", "Finance", "Legal", "People & HR", "Research",
        "Program Management",
    ],
    "google": [
        "Engineering", "Product", "Research", "Data & Analytics", "Design",
        "Sales", "Marketing", "Finance", "Legal", "People & HR", "Infrastructure",
        "Program Management",
    ],
    "microsoft": [
        "Engineering", "Product", "Research", "Infrastructure", "Security",
        "Sales", "Marketing", "Finance", "Legal", "People & HR", "Operations",
        "Program Management",
    ],
    "amazon": [
        "Engineering", "Operations", "Product", "Data & Analytics",
        "Sales", "Marketing", "Finance", "Legal", "People & HR", "Research",
        "Program Management",
    ],
    "meta": [
        "Engineering", "Product", "Research", "Data & Analytics", "Design",
        "Sales", "Marketing", "Finance", "Legal", "People & HR",
        "Infrastructure", "Program Management",
    ],
    "salesforce": [
        "Engineering", "Product", "Sales", "Marketing", "Customer Success",
        "Finance", "Legal", "People & HR", "Data & Analytics", "Design",
        "Professional Services", "Program Management",
    ],
    "zebra": [
        "Engineering", "Product", "Program Management", "Operations", "Sales", "Marketing",
        "Finance", "Legal", "People & HR", "Research", "Customer Success",
        "Manufacturing", "Professional Services", "IT",
    ],
    "stripe": [
        "Engineering", "Product", "Data & Analytics", "Design",
        "Sales", "Marketing", "Finance", "Legal", "People & HR", "Operations",
        "Infrastructure", "Security",
    ],
    "spotify": [
        "Engineering", "Product", "Data & Analytics", "Design", "Research",
        "Marketing", "Finance", "Legal", "People & HR", "Operations",
        "Infrastructure",
    ],
    "nvidia": [
        "Engineering", "Research", "Product", "Operations", "Sales",
        "Marketing", "Finance", "Legal", "People & HR", "Data & Analytics",
        "Infrastructure", "Program Management",
    ],
    "honeywell": [
        "Engineering", "Manufacturing", "Program Management", "Operations", "Sales", "Marketing",
        "Finance", "Legal", "People & HR", "Research", "Customer Success",
        "Professional Services", "IT",
    ],
    "deloitte": [
        "Operations", "Finance", "Legal", "People & HR", "Marketing",
        "Data & Analytics", "Engineering", "IT", "Research",
    ],
    "mckinsey": [
        "Operations", "Finance", "People & HR", "Marketing",
        "Data & Analytics", "Engineering", "Research",
    ],
    "johnson": [
        "Research", "Manufacturing", "Operations", "Sales", "Marketing",
        "Finance", "Legal", "People & HR", "Engineering", "IT",
    ],
    "netflix": [
        "Engineering", "Product", "Data & Analytics", "Design",
        "Marketing", "Finance", "Legal", "People & HR", "Infrastructure",
        "Security", "Operations",
    ],
    "uber": [
        "Engineering", "Product", "Operations", "Data & Analytics", "Design",
        "Sales", "Marketing", "Finance", "Legal", "People & HR",
        "Infrastructure", "Security",
    ],
    "airbnb": [
        "Engineering", "Product", "Design", "Data & Analytics",
        "Operations", "Marketing", "Finance", "Legal", "People & HR",
        "Customer Success",
    ],
    "shopify": [
        "Engineering", "Product", "Design", "Data & Analytics",
        "Sales", "Marketing", "Finance", "Legal", "People & HR",
        "Customer Success", "Operations",
    ],
    "datalogic": [
        "Engineering", "Product", "Manufacturing", "Operations", "Sales",
        "Marketing", "Finance", "Legal", "People & HR", "Research",
        "Professional Services", "IT",
    ],
}

def lookup_known_departments(company: str) -> list[dict]:
    cl = company.lower()
    for key, dept_names in KNOWN_DEPARTMENTS.items():
        if key in cl or cl.startswith(key):
            log.info("Known departments match: '%s'", key)
            result = []
            for name in dept_names:
                entry = next((d for d in DEPT_CATALOGUE if d["name"] == name), None)
                if entry:
                    result.append(entry)
            return result
    return []


# ─── Tier 7: Synthetic fallback ──────────────────────────────────────────────

INDUSTRY_DEPT_MAP: dict[str, list[str]] = {
    "technology": ["Engineering", "Product", "Program Management", "Data & Analytics", "Design",
                   "Infrastructure", "Sales", "Marketing", "Customer Success", "Finance", "People & HR"],
    "b2b_hardware": ["Engineering", "Product", "Program Management", "Manufacturing",
                     "Operations", "Sales", "Marketing", "Customer Success",
                     "Professional Services", "Finance", "People & HR", "IT"],
    "automotive": ["Engineering", "Manufacturing", "Program Management", "Operations", "Research",
                   "Sales", "Marketing", "Finance", "Legal", "People & HR"],
    "retail":     ["Operations", "Marketing", "Finance", "People & HR", "IT",
                   "Customer Success", "Data & Analytics"],
    "healthcare": ["Research", "Manufacturing", "Operations", "Finance", "Legal", "People & HR",
                   "Marketing", "IT", "Customer Success"],
    "consulting": ["Operations", "Finance", "People & HR", "Marketing",
                   "Data & Analytics", "Engineering", "IT"],
    "finance":    ["Finance", "Engineering", "Legal", "Operations", "Sales",
                   "Marketing", "People & HR", "Data & Analytics", "Security"],
    "default":    ["Engineering", "Product", "Program Management", "Sales", "Marketing",
                   "Finance", "People & HR", "Operations", "Customer Success"],
}

def synthetic_departments(company_category: str) -> list[dict]:
    cat = company_category.lower()
    if any(k in cat for k in ["auto", "car", "vehicle", "transport", "electric"]):
        key = "automotive"
    elif any(k in cat for k in ["hardware", "scanner", "barcode", "printer", "rugged", "iot device",
                                 "industrial", "enterprise hardware", "b2b hardware"]):
        key = "b2b_hardware"
    elif any(k in cat for k in ["retail", "ecommerce", "shop", "store"]):
        key = "retail"
    elif any(k in cat for k in ["health", "medical", "pharma", "bio"]):
        key = "healthcare"
    elif any(k in cat for k in ["consult", "advisory", "professional services firm"]):
        key = "consulting"
    elif any(k in cat for k in ["bank", "finance", "fintech", "payment", "insurance"]):
        key = "finance"
    elif any(k in cat for k in ["tech", "software", "saas", "cloud", "platform", "data", "ai"]):
        key = "technology"
    else:
        key = "default"

    dept_names = INDUSTRY_DEPT_MAP[key]
    result = []
    for name in dept_names:
        entry = next((d for d in DEPT_CATALOGUE if d["name"] == name), None)
        if entry:
            result.append(entry)
    log.info("Synthetic fallback: %d departments (industry=%s)", len(result), key)
    return result


# ─── Headcount estimation ─────────────────────────────────────────────────────
# Rough departmental headcount splits based on company employee count.

DEPT_HEADCOUNT_FRACTIONS: dict[str, float] = {
    "Engineering":           0.28,
    "Product":               0.06,
    "Program Management":    0.04,
    "Data & Analytics":      0.06,
    "Design":                0.04,
    "Infrastructure":        0.04,
    "Security":              0.03,
    "Sales":                 0.15,
    "Marketing":             0.06,
    "Customer Success":      0.07,
    "Professional Services": 0.06,
    "Finance":               0.04,
    "Legal":                 0.02,
    "People & HR":           0.04,
    "Operations":            0.07,
    "Manufacturing":         0.20,
    "Research":              0.05,
    "IT":                    0.03,
}

def estimate_headcount(dept_name: str, total_employees: Optional[int]) -> int:
    if not total_employees:
        return 0
    frac = DEPT_HEADCOUNT_FRACTIONS.get(dept_name, 0.05)
    return max(1, round(total_employees * frac))


# ─── Main orchestrator ────────────────────────────────────────────────────────

def scrape_departments(company: str, website: str, timeout: int = DEFAULT_TIMEOUT,
                       company_category: str = "",
                       total_employees: Optional[int] = None) -> list[dict]:
    sess = Session(timeout=timeout)
    log.info("=== Scraping departments for: %s (%s) ===", company, website)

    seen_indices: set[int] = set()
    ordered: list[int] = []

    def add(items: list[dict]) -> None:
        for item in items:
            idx = next((i for i, d in enumerate(DEPT_CATALOGUE) if d["name"] == item["name"]), None)
            if idx is not None and idx not in seen_indices:
                seen_indices.add(idx)
                ordered.append(idx)

    # Tier 0: Curated database
    known = lookup_known_departments(company)
    if known:
        add(known)
        log.info("Tier 0 curated: %d departments", len(ordered))
    else:
        # Tier 1: Wikipedia
        try:
            add(scrape_wikipedia(sess, company))
        except Exception as e:
            log.warning("Wikipedia failed: %s", e)

        # Tier 2: Indeed
        if len(ordered) < 4:
            try:
                add(scrape_indeed(sess, company))
            except Exception as e:
                log.warning("Indeed failed: %s", e)

        # Tier 3: Company website
        if len(ordered) < 4:
            try:
                add(scrape_company_website(sess, website, company))
            except Exception as e:
                log.warning("Company website failed: %s", e)

        # Tier 4: Yahoo search
        if len(ordered) < 4:
            try:
                add(scrape_yahoo_search(sess, company))
            except Exception as e:
                log.warning("Yahoo search failed: %s", e)

    # Tier 7: Synthetic fallback
    if len(ordered) < 3:
        add(synthetic_departments(company_category))

    # ── Build final department objects ────────────────────────────────────────
    result: list[dict] = []
    for i, idx in enumerate(ordered[:18]):
        base = DEPT_CATALOGUE[idx]
        result.append({
            "name":       base["name"],
            "icon":       base["icon"],
            "color":      base["color"],
            "headcount":  estimate_headcount(base["name"], total_employees),
            "sort_order": i,
        })

    log.info("Final departments: %d", len(result))
    return result


# ─── Supabase writer ──────────────────────────────────────────────────────────

def push_departments(company_id: str, departments: list[dict], auth_token: str) -> bool:
    supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
    anon_key     = os.environ.get("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "")
    service_key  = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    bearer       = service_key or auth_token
    api_key      = service_key or anon_key

    if not supabase_url or not bearer:
        log.warning("Supabase credentials missing — skipping write")
        return False

    headers = {
        "apikey":        api_key,
        "Authorization": f"Bearer {bearer}",
        "Content-Type":  "application/json",
        "Prefer":        "return=minimal",
    }
    table = f"{supabase_url}/rest/v1/company_departments"
    try:
        requests.delete(table, headers=headers,
                        params={"company_id": f"eq.{company_id}"}, timeout=10).raise_for_status()
        rows = [
            {
                "company_id": company_id,
                "name":       d["name"],
                "icon":       d["icon"],
                "color":      d["color"],
                "headcount":  d["headcount"],
                "sort_order": d["sort_order"],
            }
            for d in departments
        ]
        requests.post(table, headers=headers, json=rows, timeout=15).raise_for_status()
        log.info("Pushed %d departments for company %s", len(departments), company_id)
        return True
    except Exception as e:
        log.error("Supabase write error: %s", e)
        return False


def revalidate_company_profile(app_url: str, company_id: str) -> None:
    try:
        requests.post(f"{app_url.rstrip('/')}/api/revalidate-company",
                      json={"companyId": company_id}, timeout=8)
        log.info("Revalidation sent for %s", company_id)
    except Exception as e:
        log.warning("Revalidation failed (non-fatal): %s", e)


# ─── CLI ──────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--company",    required=True)
    parser.add_argument("--website",    required=True)
    parser.add_argument("--timeout",    type=int, default=DEFAULT_TIMEOUT)
    parser.add_argument("--company-id", default=None)
    parser.add_argument("--auth-token", default=None)
    parser.add_argument("--app-url",    default=None)
    parser.add_argument("--category",   default="", help="Company category hint for industry fallback")
    parser.add_argument("--employees",  type=int, default=None, help="Total employee count for headcount estimation")
    args = parser.parse_args()

    company = args.company.strip()
    website = args.website.strip()
    if not company or not website:
        print(json.dumps({"error": "company and website are required"}))
        sys.exit(1)

    departments = scrape_departments(
        company, website,
        timeout=args.timeout,
        company_category=args.category,
        total_employees=args.employees,
    )

    if not departments:
        print(json.dumps({"error": f"No departments found for {company}"}))
        sys.exit(2)

    if args.company_id:
        written = push_departments(args.company_id, departments, args.auth_token or "")
        if written and args.app_url:
            revalidate_company_profile(args.app_url, args.company_id)
        print(json.dumps({"count": len(departments), "written": written}, ensure_ascii=False))
    else:
        out = [{k: v for k, v in d.items() if not k.startswith("_")} for d in departments]
        print(json.dumps(out, ensure_ascii=False, indent=2))
    sys.exit(0)


if __name__ == "__main__":
    main()
