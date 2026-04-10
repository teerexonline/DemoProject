#!/usr/bin/env python3
"""
ResearchOrg Company Data Seeder v2.0
=====================================
Principal-engineer-grade company intelligence aggregator.

Source hierarchy (lower tier = higher priority):
  Tier 1  SEC EDGAR         Public financials: revenue, employees, public float
  Tier 1  Wikipedia infobox Authoritative structured facts for ~any major company
  Tier 2  Yahoo Finance     Market cap, TTM revenue, sector (public cos, crumb-authed)
  Tier 3  Company website   Schema.org, meta description, hiring signal, tags

Why these sources:
  • SEC EDGAR     — US law requires exact disclosures; cannot be wrong for public cos.
  • Wikipedia     — Community-maintained infobox is updated within days of earnings
                    releases; covers public AND major private companies (Stripe, etc.).
  • Yahoo Finance — Live market cap for public companies; crumb auth makes it reliable.
  • Website       — Official source for description, careers, and structured data.

Description policy:
  Always one sentence (first sentence of Wikipedia lead paragraph, cleaned of
  citations).  Max 200 chars. Sentence is complete — never truncated mid-word.

Usage:
  python seed_company.py --name "Stripe" --website "stripe.com"
  python seed_company.py --name "Apple Inc" --website "apple.com" --timeout 20

Output: JSON to stdout  |  Logs to stderr
Exit:   0 = success, 1 = validation error, 2 = all sources failed
"""

from __future__ import annotations

import argparse
import json
import logging
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import asdict, dataclass, field
from typing import Any, Optional
from urllib.parse import quote, quote_plus, urlparse

import requests
from bs4 import BeautifulSoup

# ─── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    stream=sys.stderr,
)
log = logging.getLogger("seed_company")

# ─── HTTP config ──────────────────────────────────────────────────────────────
# SEC EDGAR mandates an informative User-Agent. Violating this causes 403s.
# https://www.sec.gov/os/accessing-edgar-data
SEC_AGENT = (
    "ResearchOrg/2.0 CompanyDataSeeder "
    "(admin@researchorg.io; research/educational)"
)
BROWSER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36"
)
DEFAULT_TIMEOUT = 15
MAX_RETRIES     = 2

# SIC code → category (SEC EDGAR SIC divisions)
SIC_CATEGORIES: dict[str, str] = {
    "7372": "Software", "7371": "Software Engineering", "7374": "Cloud & Data Services",
    "7379": "Technology Services", "7389": "Business Services", "7375": "Data Processing",
    "6770": "Financial Technology", "6159": "Fintech Lending", "6282": "Investment Management",
    "5961": "E-commerce", "5912": "Retail", "4899": "Communications",
    "7011": "Hospitality", "4812": "Telecommunications", "4813": "Internet & Telecom",
    "2836": "Biotechnology", "2835": "Healthcare", "8099": "Health Technology",
    "3674": "Semiconductors", "3672": "Electronics", "3571": "Computer Hardware",
    "4911": "Energy", "1311": "Oil & Gas", "8742": "Management Consulting",
}


# ─── Result container ─────────────────────────────────────────────────────────

@dataclass
class CompanyResult:
    name:        str           = ""
    slug:        str           = ""
    category:    str           = ""
    description: str           = ""
    logo_color:  str           = "#7C3AED"
    logo_url:    str           = ""
    employees:   Optional[int] = None
    founded:     Optional[int] = None
    hq:          str           = ""
    valuation:   str           = ""
    revenue:     str           = ""
    website:     str           = ""
    is_hiring:   bool          = True
    tags:        list[str]     = field(default_factory=list)

    _priority: dict[str, int] = field(default_factory=dict, repr=False)
    _sources:  dict[str, str] = field(default_factory=dict, repr=False)

    def merge(self, updates: dict[str, Any], source: str, priority: int) -> None:
        """Apply updates; lower priority number wins (Tier 1 beats Tier 3)."""
        for key, value in updates.items():
            if not hasattr(self, key) or key.startswith("_"):
                continue
            if value is None or value == "" or value == []:
                continue
            if isinstance(value, int) and value == 0:
                continue
            current_priority = self._priority.get(key, 999)
            if priority < current_priority:
                setattr(self, key, value)
                self._priority[key] = priority
                self._sources[key]  = source
                log.debug("  [%s p%d] %s = %r", source, priority, key, value)

    def to_dict(self) -> dict[str, Any]:
        d = asdict(self)
        d.pop("_priority", None)
        d.pop("_sources",  None)
        d["_sources"] = self._sources
        return d


# ─── HTTP session ─────────────────────────────────────────────────────────────

class Session(requests.Session):
    def __init__(self, timeout: int = DEFAULT_TIMEOUT) -> None:
        super().__init__()
        self._timeout = timeout

    def fetch(
        self,
        url: str,
        agent: str = SEC_AGENT,
        accept: str = "application/json",
        **kwargs,
    ) -> Optional[requests.Response]:
        kwargs.setdefault("timeout", self._timeout)
        self.headers.update({"User-Agent": agent, "Accept": accept})
        for attempt in range(MAX_RETRIES + 1):
            try:
                resp = self.get(url, **kwargs)
                if resp.status_code == 429:
                    wait = int(resp.headers.get("Retry-After", 5))
                    log.warning("Rate-limited by %s — sleeping %ds", url, wait)
                    time.sleep(wait)
                    continue
                if resp.status_code in (403, 401):
                    log.warning("Access denied (HTTP %d): %s", resp.status_code, url)
                    return None
                resp.raise_for_status()
                return resp
            except requests.exceptions.Timeout:
                log.warning("Timeout on %s (attempt %d/%d)", url, attempt + 1, MAX_RETRIES + 1)
                if attempt < MAX_RETRIES:
                    time.sleep(1.0 * (attempt + 1))
            except requests.exceptions.HTTPError:
                return None
            except requests.exceptions.RequestException as e:
                log.warning("Request error %s: %s", url, e)
                if attempt < MAX_RETRIES:
                    time.sleep(1.0 * (attempt + 1))
        return None


# ─── Utilities ────────────────────────────────────────────────────────────────

def slugify(name: str) -> str:
    return re.sub(r"-{2,}", "-", re.sub(r"[^a-z0-9]+", "-", name.lower())).strip("-")

def normalise_url(url: str) -> str:
    url = url.strip().rstrip("/")
    return url if url.startswith(("http://", "https://")) else "https://" + url

def fmt_money(n: int | float) -> str:
    """1_200_000_000 → '$1.2B'"""
    if n >= 1e12:  return f"${n/1e12:.1f}T"
    if n >= 1e9:   return f"${n/1e9:.1f}B"
    if n >= 1e6:   return f"${n/1e6:.0f}M"
    if n >= 1e3:   return f"${n/1e3:.0f}K"
    return f"${n:.0f}"

def parse_money(text: str) -> Optional[int]:
    """
    Parse human-readable money strings from infoboxes and financial pages.
    Handles: 'US$391.035 billion', '$3.5 trillion', '€45.2 billion', '391,000,000'
    """
    if not text:
        return None
    # Normalize currency symbols and 'US' prefix
    s = re.sub(r"(?:US|CA|AU|NZ)?\s*[€£¥₹]?\$?", "", text)
    s = re.sub(r",", "", s)
    s = re.sub(r"\([^)]*\)", "", s)   # remove "(2024)" style qualifiers
    s = re.sub(r"\[[^\]]*\]", "", s)  # remove "[1]" citations
    s = s.strip()
    mult_map = [
        (r"([\d.]+)\s*tril",         1e12),
        (r"([\d.]+)\s*bil",          1e9),
        (r"([\d.]+)\s*T\b",          1e12),  # fmt_money output: $3.3T
        (r"([\d.]+)\s*B\b",          1e9),   # fmt_money output: $5.1B
        (r"([\d.]+)\s*mil",          1e6),
        (r"([\d.]+)\s*M\b",          1e6),   # fmt_money output: $500M
        (r"([\d.]+)\s*[Kk]\b",       1e3),
    ]
    for pattern, mult in mult_map:
        m = re.search(pattern, s, re.IGNORECASE)
        if m:
            try:
                return int(float(m.group(1)) * mult)
            except ValueError:
                pass
    # Plain integer (possibly with commas already removed)
    m = re.search(r"([\d]{4,})", s)
    if m:
        try:
            return int(m.group(1))
        except ValueError:
            pass
    return None

def parse_int(text: str) -> Optional[int]:
    """Extract first integer ≥1000 from text (for employee counts)."""
    cleaned = re.sub(r"[,\s]", "", re.sub(r"\[[^\]]*\]|\([^)]*\)", "", text))
    # Find numbers, take the largest that looks like headcount
    hits = [int(m) for m in re.findall(r"\d+", cleaned) if int(m) >= 100]
    return max(hits) if hits else None

def extract_year(text: str) -> Optional[int]:
    """Pull a 4-digit year in range 1800–current year."""
    cur = __import__("datetime").date.today().year
    for m in re.findall(r"\b(1[89]\d{2}|20[012]\d)\b", text):
        y = int(m)
        if 1800 <= y <= cur:
            return y
    return None

def first_sentence(text: str, max_len: int = 200) -> str:
    """
    Extract the FIRST complete sentence from a paragraph.
    Strips Wikipedia citation markers [1], parenthetical pronunciations,
    and ensures the result is a complete sentence ending in punctuation.
    """
    # Remove citation markers [1], [ 3 ], [note 1], [a], etc.
    text = re.sub(r"\[\s*\d+\s*\]|\[\s*note\s*\d+\s*\]|\[\s*[a-c]\s*\]", "", text)
    # Remove pronunciation guides (e.g. "(listen)" "/ˈæp.əl/")
    text = re.sub(r"\((?:listen|/[^)]+/)\)", "", text)
    # Fix Wikipedia spacing artifacts: "word ," → "word,"  and  "word ." → "word."
    text = re.sub(r"\s+([,\.;:])", r"\1", text)
    # Collapse whitespace
    text = re.sub(r"\s{2,}", " ", text).strip()

    # Split on period/!/? followed by whitespace + capital letter
    parts = re.split(r"(?<=[.!?])\s+(?=[A-Z\"])", text)
    if not parts:
        return text[:max_len]

    sentence = parts[0].strip()

    # If the first "sentence" is very short (e.g. just "Name is a"), grab two
    if len(sentence) < 50 and len(parts) > 1:
        sentence = parts[0].rstrip() + " " + parts[1].strip()

    # Ensure it ends with punctuation
    if sentence and sentence[-1] not in ".!?":
        sentence += "."

    # Hard cap — truncate at last word boundary, keep < max_len
    if len(sentence) > max_len:
        truncated = sentence[:max_len]
        last_space = truncated.rfind(" ")
        sentence = truncated[:last_space].rstrip(" ,;:") + "."

    return sentence

def clean_hq(raw: str) -> str:
    """
    Normalise HQ strings: keep the primary (first) location only.
    • Strips trailing 'U.S.' / 'United States'
    • Handles dual-HQ strings like 'South SF, CA, U.S. and Dublin, Ireland'
      → keeps only 'South San Francisco, California'
    • Deduplicates comma-separated segments
    """
    # For dual-HQ strings ('... and ...'), keep only the first location
    raw = re.split(r"\s+and\s+", raw, maxsplit=1)[0]
    # Remove trailing country markers
    raw = re.sub(r",?\s*U\.?S\.?A?\.?\s*$", "", raw, flags=re.IGNORECASE)
    raw = re.sub(r",?\s*United States\s*$", "", raw, flags=re.IGNORECASE)
    # Keep only city + state (first 2 distinct parts)
    parts = [p.strip() for p in raw.split(",")]
    seen: list[str] = []
    for p in parts[:3]:
        if p and p not in seen:
            seen.append(p)
    return ", ".join(seen).strip(", ")


# ─── Wikipedia HTML infobox scraper ──────────────────────────────────────────

class WikipediaScraper:
    """
    Parses the Wikipedia article for a company, extracting:
      • Infobox structured data (employees, revenue, market cap, founded, HQ,
        industry, valuation)
      • First sentence of the lead paragraph as the one-line description

    Why Wikipedia over Wikidata SPARQL:
      • Infobox values are updated by editors immediately after earnings releases
      • Market cap and private-company valuations appear in the infobox but are
        often absent or stale in Wikidata's P2139
      • No SPARQL rate limits; standard HTTP request
    """

    SEARCH_API = "https://en.wikipedia.org/w/api.php"
    PAGE_BASE  = "https://en.wikipedia.org/wiki/{}"

    def __init__(self, session: Session) -> None:
        self.s = session

    # ── Find best Wikipedia article title ─────────────────────────────────
    def _find_title(self, company_name: str) -> Optional[str]:
        """
        Use Wikipedia's opensearch to find the most relevant company article.
        Strategy:
          1. Search with company name alone — prefer results with corporate
             suffixes (Inc., Corp., Ltd., LLC, etc.)
          2. If no corporate match, retry search with "company" appended.
          3. Verify the chosen article is not a disambiguation page.
        """
        CORP_SUFFIXES = re.compile(
            r"\b(inc|corp|ltd|llc|plc|gmbh|co|company|incorporated|limited)\b",
            re.IGNORECASE,
        )
        name_l = company_name.lower()
        name_words = name_l.split()

        def _search(query: str) -> list[str]:
            params = {
                "action": "opensearch",
                "search": query,
                "limit": 8,
                "namespace": 0,
                "format": "json",
            }
            resp = self.s.fetch(self.SEARCH_API, agent=BROWSER_AGENT, params=params)
            if not resp:
                return []
            try:
                return resp.json()[1]
            except (ValueError, IndexError):
                return []

        def _is_disambig(title: str) -> bool:
            """Quick check: fetch the first paragraph; skip if it looks like a disambig."""
            url = self.PAGE_BASE.format(quote(title.replace(" ", "_")))
            resp = self.s.fetch(url, agent=BROWSER_AGENT, accept="text/html,*/*")
            if not resp:
                return False
            soup = BeautifulSoup(resp.text, "lxml")
            # Store parsed soup so we don't need to re-fetch later
            self._last_soup  = soup
            self._last_title = title
            # Disambiguation page signals
            first_p = ""
            content = soup.find(id="mw-content-text")
            if content:
                p = content.find("p")
                if p:
                    first_p = p.get_text(" ", strip=True).lower()
            return "may refer to" in first_p or "disambiguation" in first_p

        def _rank(titles: list[str]) -> Optional[str]:
            """Pick the best company match from a list of titles."""
            # Priority 1: title that starts with our name words AND has a corp suffix
            for t in titles:
                tl = t.lower()
                starts_with_name = any(tl.startswith(w) for w in name_words[:2])
                if starts_with_name and CORP_SUFFIXES.search(tl):
                    return t
            # Priority 2: title contains all major name words
            for t in titles:
                tl = t.lower()
                if sum(1 for w in name_words if w in tl) >= max(1, len(name_words) - 1):
                    return t
            # Priority 3: first title that starts with the primary name word
            for t in titles:
                tl = t.lower()
                if name_words and tl.startswith(name_words[0]):
                    return t
            return titles[0] if titles else None

        self._last_soup  = None
        self._last_title = None

        # First pass: search by original name
        titles = _search(company_name)
        candidate = _rank(titles)

        # If no match yet or candidate looks like a disambiguation, try with "company"
        if not candidate or candidate.lower() == name_l:
            titles2 = _search(company_name + " company")
            all_titles = titles + [t for t in titles2 if t not in titles]
            candidate2 = _rank(all_titles)
            if candidate2 and CORP_SUFFIXES.search(candidate2.lower()):
                candidate = candidate2
            elif candidate2 and candidate2.lower() != name_l:
                candidate = candidate2

        if not candidate:
            return None

        # Validate: if disambiguation, remove from list and try next
        if _is_disambig(candidate):
            log.info("[Wikipedia] '%s' is disambiguation — trying next", candidate)
            all_remaining = [t for t in titles if t != candidate]
            for t in all_remaining:
                if not _is_disambig(t):
                    return t
            return None  # all disambiguation

        return candidate

    # ── Parse infobox table ────────────────────────────────────────────────
    def _parse_infobox(self, soup: BeautifulSoup) -> dict[str, Any]:
        result: dict[str, Any] = {}

        infobox = None
        for tbl in soup.find_all("table"):
            classes = " ".join(tbl.get("class", []))
            if "infobox" in classes:
                infobox = tbl
                break
        if not infobox:
            return result

        for row in infobox.find_all("tr"):
            th = row.find("th")
            td = row.find("td")
            if not th or not td:
                continue

            key = re.sub(r"\s+", " ", th.get_text(" ", strip=True)).lower()
            # Raw text — citations + parenthetical dates removed by parse helpers
            raw = td.get_text(" ", strip=True)

            # ── Employees ─────────────────────────────────────────────────
            if re.search(r"employee|headcount|workforce", key):
                emp = parse_int(raw)
                if emp and 10 <= emp <= 5_000_000:
                    result["employees"] = emp

            # ── Revenue ───────────────────────────────────────────────────
            elif key.startswith("revenue") or key == "net revenue":
                money = parse_money(raw)
                if money and money >= 1_000_000:
                    result["revenue"] = fmt_money(money)

            # ── Market cap / Valuation ─────────────────────────────────────
            elif re.search(r"market cap|market value", key):
                money = parse_money(raw)
                if money and money >= 1_000_000:
                    result["valuation"] = fmt_money(money)

            # ── Explicit valuation (private cos) ──────────────────────────
            elif "valuation" in key:
                money = parse_money(raw)
                if money and money >= 1_000_000:
                    result["valuation"] = fmt_money(money)

            # ── Founded ───────────────────────────────────────────────────
            elif re.search(r"^founded|^formation|^established", key):
                year = extract_year(raw)
                if year:
                    result["founded"] = year

            # ── Headquarters / Location ────────────────────────────────────
            # Only match "headquarters" / "head office" rows — NOT "number of
            # locations" which also contains "location" and would overwrite HQ.
            elif re.search(r"^headquarter|^head office", key):
                lines = [l.strip() for l in raw.splitlines() if l.strip()]
                hq_raw = lines[0] if lines else raw
                hq = clean_hq(hq_raw)
                if hq:
                    result["hq"] = hq[:120]

            # ── Industry / Type ────────────────────────────────────────────
            elif re.search(r"^industry|^sector|^type$", key):
                # Take first industry listed
                first_industry = re.split(r"[,\n·•;/]", raw)[0].strip()
                if first_industry and len(first_industry) < 80:
                    result["category"] = first_industry

        return result

    # ── First sentence from lead paragraph ────────────────────────────────
    def _parse_description(self, soup: BeautifulSoup) -> Optional[str]:
        content_div = soup.find(id="mw-content-text")
        if not content_div:
            return None
        for tag in content_div.find_all("p", recursive=True):
            text = tag.get_text(" ", strip=True)
            # Skip empty, very short, or coordinate-only paragraphs
            if len(text) < 60 or re.match(r"^\d+°", text):
                continue
            sentence = first_sentence(text)
            if len(sentence) >= 40:
                return sentence
        return None

    # ── Public fetch entry point ───────────────────────────────────────────
    def fetch(self, company_name: str) -> dict[str, Any]:
        result: dict[str, Any] = {}
        log.info("[Wikipedia] searching: '%s'", company_name)

        title = self._find_title(company_name)
        if not title:
            log.info("[Wikipedia] no article found")
            return result
        log.info("[Wikipedia] article: '%s'", title)

        # _find_title already fetched the page to check for disambiguation;
        # reuse the cached soup to avoid a redundant HTTP request.
        if getattr(self, "_last_title", None) == title and getattr(self, "_last_soup", None):
            soup = self._last_soup
        else:
            url  = self.PAGE_BASE.format(quote(title.replace(" ", "_")))
            resp = self.s.fetch(
                url,
                agent=BROWSER_AGENT,
                accept="text/html,application/xhtml+xml,*/*",
            )
            if resp is None:
                return result
            soup = BeautifulSoup(resp.text, "lxml")

        # Infobox structured data
        infobox_data = self._parse_infobox(soup)
        result.update(infobox_data)
        log.info(
            "[Wikipedia] infobox → employees=%s, revenue=%s, valuation=%s, "
            "founded=%s, hq=%s, category=%s",
            result.get("employees"), result.get("revenue"), result.get("valuation"),
            result.get("founded"), result.get("hq"), result.get("category"),
        )

        # One-sentence description
        desc = self._parse_description(soup)
        if desc:
            result["description"] = desc
            log.info("[Wikipedia] description: %s", desc[:100])

        return result


# ─── SEC EDGAR scraper ────────────────────────────────────────────────────────

class SecEdgarScraper:
    """
    Authoritative financials for US public companies.
    Uses EDGAR's official JSON APIs (no scraping, no keys required).
    Rate limit: 10 req/s — we stay well under.
    """

    TICKER_JSON = "https://www.sec.gov/files/company_tickers.json"
    SUBS_URL    = "https://data.sec.gov/submissions/CIK{cik}.json"
    FACTS_URL   = "https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json"
    EFTS_URL    = "https://efts.sec.gov/LATEST/search-index"

    def __init__(self, session: Session) -> None:
        self.s = session

    def _find_cik(self, name: str) -> Optional[str]:
        """
        Locate the SEC EDGAR CIK for a company.

        Strategy A (most reliable): company_tickers.json fuzzy match.
          SEC provides a JSON index of all registered tickers → company names.
          We score each entry by word overlap and pick the best match ≥ 0.6.
          This avoids EFTS full-text search which can return subsidiary filings
          with a different (wrong) CIK.

        Strategy B (fallback): EDGAR EFTS full-text search on 10-K filings.
        """
        name_l = name.lower()
        # Remove legal suffixes for cleaner matching
        name_clean = re.sub(
            r"\b(inc|incorporated|corp|corporation|ltd|limited|llc|plc|co)\b\.?",
            "", name_l, flags=re.IGNORECASE
        ).strip()
        words = [w for w in name_clean.split() if len(w) > 2]

        # Strategy A: company_tickers.json (authoritative SEC ticker list)
        # SEC requires an informative User-Agent; browser agent also works here.
        resp = self.s.fetch(self.TICKER_JSON, agent=SEC_AGENT)
        if resp:
            try:
                tickers = resp.json()
                best_score, best_cik = 0.0, None
                for entry in tickers.values():
                    title = entry.get("title", "").lower()
                    title_clean = re.sub(
                        r"\b(inc|incorporated|corp|corporation|ltd|limited|llc|plc|co)\b\.?",
                        "", title
                    ).strip()
                    if not words:
                        continue
                    hits = sum(1 for w in words if w in title_clean)
                    score = hits / len(words)
                    if score > best_score and score >= 0.6:
                        best_score = score
                        best_cik   = str(entry["cik_str"]).zfill(10)
                if best_cik:
                    log.info("[SEC EDGAR] tickers.json match score=%.2f", best_score)
                    return best_cik
            except (ValueError, KeyError):
                pass

        time.sleep(0.15)  # EDGAR rate limit

        # Strategy B: EFTS full-text search (fallback for non-ticker companies)
        resp2 = self.s.fetch(
            self.EFTS_URL,
            params={"q": f'"{name}"', "forms": "10-K", "dateRange": "custom",
                    "startdt": "2018-01-01"},
        )
        if resp2:
            try:
                hits = resp2.json().get("hits", {}).get("hits", [])
                for hit in hits:
                    src = hit.get("_source", {})
                    # Verify the entity name closely matches what we're looking for
                    entity = src.get("entity_name", "").lower()
                    if sum(1 for w in words if w in entity) >= max(1, len(words) - 1):
                        cik_raw = src.get("entity_id") or src.get("file_num", "")
                        cik = re.sub(r"\D", "", str(cik_raw))
                        if cik:
                            return cik.zfill(10)
            except (ValueError, KeyError):
                pass

        return None

    def _latest_annual(self, entries: list[dict]) -> Optional[dict]:
        """Return the most recent 10-K entry from an XBRL facts array."""
        annual = [
            e for e in entries
            if e.get("form") in ("10-K", "10-K/A") and e.get("val") is not None
        ]
        annual.sort(key=lambda x: x.get("end", ""), reverse=True)
        return annual[0] if annual else None

    def fetch(self, company_name: str) -> dict[str, Any]:
        result: dict[str, Any] = {}
        log.info("[SEC EDGAR] searching: '%s'", company_name)

        cik = self._find_cik(company_name)
        if not cik:
            log.info("[SEC EDGAR] not found (likely private company)")
            return result
        log.info("[SEC EDGAR] CIK=%s", cik)
        time.sleep(0.15)

        # ── Submissions: address, SIC ──────────────────────────────────────
        subs = self.s.fetch(self.SUBS_URL.format(cik=cik))
        if subs:
            try:
                data = subs.json()
                biz = data.get("addresses", {}).get("business", {})
                if biz.get("city") and biz.get("stateOrCountry"):
                    result["hq"] = f"{biz['city']}, {biz['stateOrCountry']}"
                sic = str(data.get("sic", ""))
                if sic in SIC_CATEGORIES:
                    result["category"] = SIC_CATEGORIES[sic]
            except (ValueError, KeyError):
                pass

        time.sleep(0.15)

        # ── Company facts: revenue, employees, public float ────────────────
        facts_resp = self.s.fetch(self.FACTS_URL.format(cik=cik))
        if not facts_resp:
            return result
        try:
            facts   = facts_resp.json().get("facts", {})
            us_gaap = facts.get("us-gaap", {})
            dei     = facts.get("dei", {})

            # Revenue — try concepts in priority order
            for concept in [
                "Revenues",
                "RevenueFromContractWithCustomerExcludingAssessedTax",
                "RevenueFromContractWithCustomerIncludingAssessedTax",
                "SalesRevenueNet",
            ]:
                entries = us_gaap.get(concept, {}).get("units", {}).get("USD", [])
                row = self._latest_annual(entries)
                if row and row.get("val", 0) > 0:
                    result["revenue"] = fmt_money(row["val"])
                    log.info("[SEC] revenue from %s: %s", concept, result["revenue"])
                    break

            # Employees
            for concept in ["EntityNumberOfEmployees"]:
                entries = dei.get(concept, {}).get("units", {}).get("pure", [])
                entries.sort(key=lambda x: x.get("end", ""), reverse=True)
                if entries:
                    val = entries[0].get("val")
                    if val and val > 0:
                        result["employees"] = int(val)
                        log.info("[SEC] employees: %d", result["employees"])
                        break

            # Public float → valuation proxy for public companies
            float_entries = (
                dei.get("EntityPublicFloat", {}).get("units", {}).get("USD", [])
            )
            float_entries.sort(key=lambda x: x.get("end", ""), reverse=True)
            if float_entries:
                val = float_entries[0].get("val")
                if val and val > 0:
                    result["valuation"] = fmt_money(val)
                    log.info("[SEC] public float: %s", result["valuation"])

        except (ValueError, KeyError) as e:
            log.warning("[SEC EDGAR] parse error: %s", e)

        return result


# ─── Yahoo Finance scraper ────────────────────────────────────────────────────

class YahooFinanceScraper:
    """
    Live market cap and TTM revenue for public companies.
    Yahoo Finance requires a 'crumb' cookie since 2023.
    Flow: (1) init session on finance.yahoo.com, (2) fetch crumb,
          (3) call quoteSummary with crumb.
    """

    def __init__(self, session: Session) -> None:
        self.s       = session
        self._crumb: Optional[str] = None

    def _init_crumb(self) -> Optional[str]:
        if self._crumb:
            return self._crumb
        # Step 1: prime the cookie jar on the main finance page (no retry on 429)
        self.s.get(
            "https://finance.yahoo.com",
            headers={"User-Agent": BROWSER_AGENT, "Accept": "text/html,*/*"},
            timeout=self.s._timeout,
            allow_redirects=True,
        )
        # Step 2: fetch crumb — single attempt per host, no 429-retry loop
        for host in ("query1", "query2"):
            try:
                resp = self.s.get(
                    f"https://{host}.finance.yahoo.com/v1/test/getcrumb",
                    headers={
                        "User-Agent": BROWSER_AGENT,
                        "Accept": "text/plain, */*",
                        "Referer": "https://finance.yahoo.com/",
                    },
                    timeout=self.s._timeout,
                    allow_redirects=True,
                )
                if resp.status_code == 200 and resp.text.strip() not in ("", "null"):
                    self._crumb = resp.text.strip()
                    log.info("[Yahoo Finance] crumb acquired from %s", host)
                    return self._crumb
            except Exception as e:
                log.debug("[Yahoo Finance] crumb attempt failed (%s): %s", host, e)
        log.warning("[Yahoo Finance] could not acquire crumb")
        return None

    def _ticker(self, name: str, domain: str) -> Optional[str]:
        resp = self.s.fetch(
            "https://query1.finance.yahoo.com/v1/finance/search",
            agent=BROWSER_AGENT,
            params={"q": name, "quotesCount": 6, "newsCount": 0},
            headers={"Referer": "https://finance.yahoo.com/"},
        )
        if not resp:
            return None
        try:
            quotes = resp.json().get("quotes", [])
            name_l = name.lower()
            for q in quotes:
                if q.get("quoteType") not in ("EQUITY",):
                    continue
                long = (q.get("longname") or q.get("shortname") or "").lower()
                words = name_l.split()
                # Strong match: majority of name words present
                if sum(1 for w in words if w in long) >= max(1, len(words) - 1):
                    return q["symbol"]
            return None
        except (ValueError, KeyError):
            return None

    def fetch(self, name: str, website: str) -> dict[str, Any]:
        result: dict[str, Any] = {}
        log.info("[Yahoo Finance] searching: '%s'", name)

        crumb = self._init_crumb()
        if not crumb:
            log.warning("[Yahoo Finance] could not acquire crumb; skipping")
            return result

        domain = urlparse(normalise_url(website)).netloc
        ticker = self._ticker(name, domain)
        if not ticker:
            log.info("[Yahoo Finance] no ticker found")
            return result
        log.info("[Yahoo Finance] ticker: %s", ticker)

        resp = self.s.fetch(
            f"https://query1.finance.yahoo.com/v10/finance/quoteSummary/{ticker}",
            agent=BROWSER_AGENT,
            params={
                "modules": "assetProfile,defaultKeyStatistics,financialData,summaryDetail",
                "crumb": crumb,
            },
            headers={"Referer": f"https://finance.yahoo.com/quote/{ticker}/"},
        )
        if not resp:
            return result

        try:
            qs      = resp.json().get("quoteSummary", {}).get("result", [{}])[0]
            profile = qs.get("assetProfile", {})
            key_st  = qs.get("defaultKeyStatistics", {})
            fin     = qs.get("financialData", {})
            summary = qs.get("summaryDetail", {})

            # Description
            desc = profile.get("longBusinessSummary", "")
            if desc:
                result["description"] = first_sentence(desc)

            # Industry / category
            industry = profile.get("industry", "")
            if industry:
                result["category"] = industry

            # HQ
            city, state, country = (
                profile.get("city", ""),
                profile.get("state", ""),
                profile.get("country", ""),
            )
            hq_parts = [p for p in [city, state, country if country != "United States" else ""] if p]
            if hq_parts:
                result["hq"] = ", ".join(hq_parts)

            # Employees
            emp = profile.get("fullTimeEmployees")
            if emp:
                result["employees"] = int(emp)

            # TTM Revenue
            rev = fin.get("totalRevenue", {}).get("raw")
            if rev:
                result["revenue"] = fmt_money(rev)

            # Market cap (prefer enterprise value as valuation proxy)
            ev  = key_st.get("enterpriseValue", {}).get("raw")
            mc  = summary.get("marketCap", {}).get("raw")
            val = ev or mc
            if val and val > 0:
                result["valuation"] = fmt_money(val)

            # Tags
            sector = profile.get("sector", "")
            tags: list[str] = []
            if sector and sector != industry:
                tags.append(sector)
            if industry:
                tags.append(industry)
            if tags:
                result["tags"] = tags

            log.info(
                "[Yahoo Finance] revenue=%s valuation=%s employees=%s",
                result.get("revenue"), result.get("valuation"), result.get("employees"),
            )
        except (ValueError, KeyError, IndexError) as e:
            log.warning("[Yahoo Finance] parse error: %s", e)

        return result


# ─── Company website scraper ─────────────────────────────────────────────────

class WebsiteScraper:
    """
    Scrapes the company's own website for:
      • schema.org/Organization structured data
      • OpenGraph / meta description (→ one sentence)
      • Hiring signal (careers page present + job listings mentioned)
      • Industry/product tags inferred from page copy
    """

    TAG_SIGNALS = {
        "SaaS":         ["saas", "software as a service", "subscription software"],
        "B2B":          ["enterprise", "business customers", "b2b", "for teams", "for businesses"],
        "B2C":          ["consumers", "personal use", "for individuals", "b2c"],
        "API-first":    ["api", "sdk", "developer platform", "integrate with", "rest api"],
        "AI / ML":      ["artificial intelligence", "machine learning", " ai ", "llm", "neural network"],
        "Cloud":        ["cloud", "cloud-native", "infrastructure", "aws", "google cloud", "azure"],
        "Open Source":  ["open source", "open-source", "github.com"],
        "Mobile":       ["mobile app", "ios", "android", "app store"],
        "Marketplace":  ["marketplace", "two-sided", "buyers and sellers"],
        "Fintech":      ["payments", "fintech", "financial services", "banking", "payment processing"],
        "Healthcare":   ["health", "medical", "patient", "clinical", "healthcare"],
        "DevTools":     ["developer tools", "devtools", "ci/cd", "devops", "pipeline"],
        "Security":     ["cybersecurity", "zero trust", "threat detection", "soc"],
        "Analytics":    ["analytics", "data warehouse", "business intelligence", "dashboards"],
    }

    def __init__(self, session: Session) -> None:
        self.s = session

    def _soup(self, url: str) -> Optional[BeautifulSoup]:
        resp = self.s.fetch(
            url,
            agent=BROWSER_AGENT,
            accept="text/html,application/xhtml+xml,*/*",
            allow_redirects=True,
        )
        return BeautifulSoup(resp.text, "lxml") if resp else None

    def _schema_org(self, soup: BeautifulSoup) -> dict[str, Any]:
        out: dict[str, Any] = {}
        for tag in soup.find_all("script", attrs={"type": "application/ld+json"}):
            try:
                data = json.loads(tag.string or "")
            except (json.JSONDecodeError, TypeError):
                continue
            items = data if isinstance(data, list) else data.get("@graph", [data])
            for obj in items:
                t = obj.get("@type", "")
                types = [t] if isinstance(t, str) else t
                if any(x in ("Organization", "Corporation", "Company", "LocalBusiness") for x in types):
                    if desc := obj.get("description", ""):
                        out["description"] = first_sentence(str(desc))
                    if name := obj.get("name"):
                        out["name"] = str(name)
                    if founded := obj.get("foundingDate"):
                        yr = extract_year(str(founded))
                        if yr:
                            out["founded"] = yr
                    if addr := obj.get("address"):
                        if isinstance(addr, dict):
                            parts = [
                                addr.get("addressLocality", ""),
                                addr.get("addressRegion", ""),
                            ]
                            hq = clean_hq(", ".join(p for p in parts if p))
                            if hq:
                                out["hq"] = hq
                    if emp := obj.get("numberOfEmployees"):
                        if isinstance(emp, (int, float)):
                            out["employees"] = int(emp)
                        elif isinstance(emp, dict):
                            v = emp.get("value") or emp.get("minValue")
                            if v:
                                try:
                                    out["employees"] = int(v)
                                except (TypeError, ValueError):
                                    pass
        return out

    def _meta_description(self, soup: BeautifulSoup) -> Optional[str]:
        metas = {
            m.get("property") or m.get("name"): m.get("content")
            for m in soup.find_all("meta")
            if m.get("content")
        }
        raw = (
            metas.get("og:description")
            or metas.get("description")
            or metas.get("twitter:description")
        )
        if raw and len(str(raw)) > 40:
            return first_sentence(str(raw))
        return None

    def _hiring(self, base: str) -> bool:
        for path in ["/careers", "/jobs", "/work-here", "/join-us"][:3]:
            resp = self.s.fetch(
                base + path,
                agent=BROWSER_AGENT,
                accept="text/html",
            )
            if resp and resp.status_code == 200 and len(resp.text) > 1500:
                text = resp.text.lower()
                if any(s in text for s in [
                    "open position", "job opening", "we're hiring",
                    "apply now", "current opening", "view roles",
                ]):
                    return True
        return True  # default: assume hiring

    def _tags(self, page_text: str, existing_category: str) -> list[str]:
        text_l = page_text.lower()
        tags: list[str] = []
        if existing_category:
            tags.append(existing_category)
        for tag, signals in self.TAG_SIGNALS.items():
            if any(s in text_l for s in signals) and tag not in tags:
                tags.append(tag)
        return tags[:6]

    def fetch(self, website: str, company_name: str, category: str = "") -> dict[str, Any]:
        result: dict[str, Any] = {}
        base = normalise_url(website).rstrip("/")
        log.info("[Website] scraping %s", base)

        soup = self._soup(base)
        if soup is None:
            log.warning("[Website] homepage not reachable")
            return result

        # Structured data (highest confidence from this source)
        schema = self._schema_org(soup)
        result.update(schema)

        # Meta description fallback
        if not result.get("description"):
            meta = self._meta_description(soup)
            if meta:
                result["description"] = meta

        # Fallback: first substantial paragraph
        if not result.get("description"):
            for tag in soup.find_all(["p", "h2"], limit=25):
                text = tag.get_text(" ", strip=True)
                if 80 <= len(text) <= 400 and not text.lower().startswith(
                    ("cookie", "privacy", "©", "we use")
                ):
                    result["description"] = first_sentence(text)
                    break

        page_text = soup.get_text(" ", strip=True)
        result["tags"]       = self._tags(page_text, category)
        result["is_hiring"]  = self._hiring(base)

        log.info(
            "[Website] desc=%d chars, tags=%s, hiring=%s",
            len(result.get("description", "")),
            result.get("tags", []),
            result.get("is_hiring"),
        )
        return result


# ─── Logo scraper ─────────────────────────────────────────────────────────────

class LogoScraper:
    """
    Fetches the best available company logo URL.

    Source priority (highest quality / reliability first):
      1. Clearbit Logo API  — logo.clearbit.com/{domain}
         Transparent PNG, ~128 px, covers 1M+ companies. Returns 404 when unknown.
      2. Apple-touch-icon   — <link rel="apple-touch-icon"> from homepage
         Usually 180 × 180 px PNG, designed for mobile — very high quality.
      3. High-res favicon   — <link rel="icon" type="image/png" sizes="96x96|128x128|…">
         PNG favicon ≥ 32 px from the company's own website.
      4. Wikipedia infobox  — first <img> inside the infobox (often the official logo).
      5. Google Favicon S2  — www.google.com/s2/favicons?domain={domain}&sz=256
         Always returns something; quality varies. Guaranteed last-resort.

    Why PNG over SVG: most sources only expose raster logos. SVG is preferred when
    explicitly available (detected by <img> src ending in .svg), but PNG 128 px+ is
    universally usable and easy to store in Supabase.

    Returns: a direct HTTPS URL to the best logo image, or "" if nothing found.
    """

    def __init__(self, session: Session) -> None:
        self.s = session

    # ── Source 1: icon.horse (Clearbit is dead — DNS no longer resolves) ──────
    def _icon_horse(self, domain: str) -> Optional[str]:
        url = f"https://icon.horse/icon/{domain}"
        try:
            resp = self.s.get(
                url,
                headers={"User-Agent": BROWSER_AGENT},
                timeout=self.s._timeout,
                allow_redirects=True,
            )
            ct = resp.headers.get("Content-Type", "")
            if resp.status_code == 200 and "image" in ct and len(resp.content) > 500:
                log.info("[Logo] icon.horse: %s", url)
                return url
        except Exception as e:
            log.debug("[Logo] icon.horse failed: %s", e)
        return None

    # ── Source 2 & 3: website icons ───────────────────────────────────────────
    def _website_icons(self, base_url: str) -> Optional[str]:
        """
        Parse the homepage for high-quality icon links.
        Prefers apple-touch-icon (180px) > large PNG favicon > any PNG favicon.
        """
        try:
            resp = self.s.get(
                base_url,
                headers={"User-Agent": BROWSER_AGENT, "Accept": "text/html,*/*"},
                timeout=self.s._timeout,
                allow_redirects=True,
            )
            if not resp or resp.status_code != 200:
                return None
            soup = BeautifulSoup(resp.text, "lxml")

            candidates: list[tuple[int, str]] = []  # (priority, url)

            for link in soup.find_all("link"):
                rel   = " ".join(link.get("rel", [])).lower()
                href  = link.get("href", "")
                sizes = link.get("sizes", "")
                if not href:
                    continue

                # Resolve relative URLs
                if href.startswith("//"):
                    href = "https:" + href
                elif href.startswith("/"):
                    parsed = urlparse(base_url)
                    href = f"{parsed.scheme}://{parsed.netloc}{href}"
                elif not href.startswith("http"):
                    href = base_url.rstrip("/") + "/" + href

                # SVG icons — highest quality
                if href.endswith(".svg") or "svg" in link.get("type", ""):
                    candidates.append((0, href))

                # Apple touch icon — 180px PNG
                elif "apple-touch-icon" in rel:
                    candidates.append((1, href))

                # Large PNG favicon (≥ 96 px)
                elif "icon" in rel and "png" in link.get("type", "image/png"):
                    size = 0
                    if sizes and "x" in sizes:
                        try:
                            size = int(sizes.lower().split("x")[0])
                        except ValueError:
                            pass
                    if size >= 96:
                        candidates.append((2, href))
                    elif size >= 32:
                        candidates.append((4, href))
                    else:
                        candidates.append((5, href))

                # Any favicon
                elif "icon" in rel:
                    candidates.append((6, href))

            if candidates:
                candidates.sort(key=lambda x: x[0])
                best = candidates[0][1]
                log.info("[Logo] website icon: %s", best)
                return best

        except Exception as e:
            log.debug("[Logo] website icon failed: %s", e)
        return None

    # ── Source 4: Wikipedia infobox image ─────────────────────────────────────
    def _wikipedia(self, company_name: str) -> Optional[str]:
        """
        Fetch the company logo from the Wikipedia infobox.
        Uses the Wikipedia opensearch API to find the correct company article
        (e.g., "Apple Inc." not "Apple" which would return an apple-fruit image),
        then fetches the thumbnail for that specific article.

        Key fix: always search for the company article via opensearch first and
        match the title that looks like a corporate entity (contains "Inc", "Corp",
        etc.) before falling back to the raw company name. This prevents ambiguous
        single-word names like "Apple" or "Stripe" from resolving to the wrong page.
        """
        CORP_SUFFIX_RE = re.compile(
            r"\b(inc|corp|ltd|llc|plc|gmbh|company|incorporated|limited|technologies|"
            r"systems|group|holdings|international|services)\b",
            re.IGNORECASE,
        )
        name_words = company_name.lower().split()

        def _opensearch(query: str) -> list[str]:
            r = self.s.fetch(
                "https://en.wikipedia.org/w/api.php",
                agent=BROWSER_AGENT,
                params={"action": "opensearch", "search": query, "limit": 8,
                        "namespace": 0, "format": "json"},
            )
            if not r:
                return []
            try:
                return r.json()[1]
            except (ValueError, IndexError):
                return []

        def _best_title(titles: list[str]) -> Optional[str]:
            # Priority 1: title starts with company name AND has corporate suffix
            for t in titles:
                tl = t.lower()
                if any(tl.startswith(w) for w in name_words[:2]) and CORP_SUFFIX_RE.search(tl):
                    return t
            # Priority 2: title contains majority of name words
            for t in titles:
                tl = t.lower()
                if sum(1 for w in name_words if w in tl) >= max(1, len(name_words) - 1):
                    return t
            return None

        try:
            # First try "Company Name company" to bias toward the corporate entity
            titles = _opensearch(f"{company_name} company")
            best = _best_title(titles)
            if not best:
                titles = _opensearch(company_name)
                best = _best_title(titles)
            if not best:
                return None

            resp = self.s.fetch(
                "https://en.wikipedia.org/w/api.php",
                agent=BROWSER_AGENT,
                params={
                    "action": "query",
                    "titles": best,
                    "prop": "pageimages",
                    "pithumbsize": 200,
                    "format": "json",
                    "redirects": 1,
                },
            )
            if not resp:
                return None
            pages = resp.json().get("query", {}).get("pages", {})
            for page in pages.values():
                thumb = page.get("thumbnail", {}).get("source")
                if thumb:
                    # Sanity-check: reject obvious non-logo images
                    # (plant/food/band/building photos that sneak in for ambiguous names)
                    thumb_l = thumb.lower()
                    reject_patterns = [
                        "pink_lady", "apple_fruit", "fruit", "plant",
                        "food", "band_", "musician", "singer", "album",
                        # Reject store/building/street exterior photos
                        "building", "store", "exterior", "street", "headquarters",
                        "campus", "office", "facade", "retail", "supermarket",
                        "warehouse", "factory", "aerial",
                    ]
                    if any(p in thumb_l for p in reject_patterns):
                        log.info(
                            "[Logo] Wikipedia thumbnail looks like wrong subject, skipping: %s", thumb
                        )
                        return None
                    log.info("[Logo] Wikipedia thumbnail: %s", thumb)
                    return thumb
        except Exception as e:
            log.debug("[Logo] Wikipedia failed: %s", e)
        return None

    # ── Source 5: Google Favicon S2 (always works) ────────────────────────────
    def _google_favicon(self, domain: str) -> str:
        url = f"https://www.google.com/s2/favicons?domain={domain}&sz=256"
        log.info("[Logo] Google favicon fallback: %s", url)
        return url

    # ── Verify a URL actually serves an image of acceptable size ──────────────
    def _verify(self, url: str) -> bool:
        try:
            r = self.s.get(
                url,
                headers={"User-Agent": BROWSER_AGENT},
                timeout=self.s._timeout,
                allow_redirects=True,
                stream=True,
            )
            if r.status_code != 200:
                return False
            content_type = r.headers.get("Content-Type", "")
            if not any(t in content_type for t in ("image", "svg", "octet-stream")):
                return False
            # Read just enough to check it's not a 1x1 pixel placeholder
            data = next(r.iter_content(512), b"")
            return len(data) > 200
        except Exception:
            return False

    # ── Public entry point ────────────────────────────────────────────────────
    def fetch(self, company_name: str, website: str) -> str:
        """Return the best logo URL found, or '' if nothing suitable."""
        domain = urlparse(normalise_url(website)).netloc.lstrip("www.")
        base   = normalise_url(website).rstrip("/")

        sources = [
            ("icon_horse",  lambda: self._icon_horse(domain)),
            ("website",     lambda: self._website_icons(base)),
            ("wikipedia",   lambda: self._wikipedia(company_name)),
            ("google",      lambda: self._google_favicon(domain)),
        ]

        for name, fn in sources:
            try:
                url = fn()
                if url and (name == "google" or self._verify(url)):
                    log.info("[Logo] selected source=%s url=%s", name, url)
                    return url
            except Exception as e:
                log.debug("[Logo] source %s error: %s", name, e)

        log.warning("[Logo] no logo found for %s", company_name)
        return ""


# ─── Fallback estimator ───────────────────────────────────────────────────────

# Industry benchmarks derived from public company filings and analyst reports.
# Each entry: (revenue_per_employee, ev_revenue_multiple, valuation_per_employee)
#   revenue_per_employee  — median annual revenue per FTE, USD
#   ev_revenue_multiple   — median EV / TTM revenue for the sector
#   valuation_per_employee — median enterprise value per FTE, USD (used when
#                            revenue is also missing)
_INDUSTRY_BENCHMARKS: dict[str, tuple[float, float, float]] = {
    # category keyword → (rev/emp, ev/rev, val/emp)
    "software":          (350_000,  8.0,  2_800_000),
    "saas":              (350_000,  8.0,  2_800_000),
    "cloud":             (400_000,  9.0,  3_600_000),
    "api":               (350_000,  8.0,  2_800_000),
    "semiconductor":     (700_000,  5.0,  3_500_000),
    "electronics":       (600_000,  3.5,  2_100_000),
    "hardware":          (500_000,  3.0,  1_500_000),
    "consumer":          (500_000,  3.5,  1_750_000),
    "fintech":           (300_000,  7.0,  2_100_000),
    "financial":         (400_000,  4.0,  1_600_000),
    "payments":          (300_000,  7.0,  2_100_000),
    "ecommerce":         (250_000,  2.5,    625_000),
    "e-commerce":        (250_000,  2.5,    625_000),
    "retail":            (200_000,  1.5,    300_000),
    "healthcare":        (350_000,  4.0,  1_400_000),
    "biotech":           (500_000,  6.0,  3_000_000),
    "pharma":            (600_000,  4.5,  2_700_000),
    "telecom":           (400_000,  3.0,  1_200_000),
    "media":             (300_000,  3.0,    900_000),
    "advertising":       (300_000,  4.0,  1_200_000),
    "consulting":        (200_000,  2.0,    400_000),
    "logistics":         (180_000,  1.5,    270_000),
    "energy":            (900_000,  2.5,  2_250_000),
    "manufacturing":     (300_000,  1.8,    540_000),
    "hospitality":       (100_000,  2.0,    200_000),
    "education":         (150_000,  3.0,    450_000),
    "real estate":       (500_000,  2.0,  1_000_000),
    "gaming":            (400_000,  5.0,  2_000_000),
    "cybersecurity":     (350_000,  9.0,  3_150_000),
    "ai":                (500_000, 12.0,  6_000_000),
    "data":              (400_000,  8.0,  3_200_000),
    "default":           (250_000,  3.0,    750_000),
}


def _benchmark(category: str) -> tuple[float, float, float]:
    """Return (rev_per_emp, ev_rev_mult, val_per_emp) for the given category."""
    cat_l = (category or "").lower()
    for key, vals in _INDUSTRY_BENCHMARKS.items():
        if key in cat_l:
            return vals
    return _INDUSTRY_BENCHMARKS["default"]


class FallbackEstimator:
    """
    Absolute-last-resort estimation for fields that all scrapers left empty.

    Estimation equations (applied only when the target field is still missing):

      Revenue  ← employees × revenue_per_employee(industry)
      Employees← revenue   / revenue_per_employee(industry)
      Valuation← revenue   × ev_revenue_multiple(industry)   [primary]
               ← employees × valuation_per_employee(industry) [if revenue also missing]

    All estimates are flagged with source="estimate" in _sources so the UI can
    display them with a disclaimer.  They are applied at priority 99 so any real
    data — even from the lowest-priority scraper — will override them.
    """

    SOURCE = "estimate"
    PRIORITY = 99

    def estimate(self, result: "CompanyResult") -> dict[str, Any]:
        rev_per_emp, ev_rev_mult, val_per_emp = _benchmark(result.category)
        out: dict[str, Any] = {}

        # ── Revenue ───────────────────────────────────────────────────────────
        rev_raw: Optional[int] = None
        if result.revenue:
            rev_raw = parse_money(result.revenue)
        elif result.employees:
            rev_raw = int(result.employees * rev_per_emp)
            out["revenue"] = fmt_money(rev_raw)
            log.info(
                "[Estimate] revenue = %d emp × $%.0f/emp = %s",
                result.employees, rev_per_emp, out["revenue"],
            )

        # ── Employees ─────────────────────────────────────────────────────────
        if not result.employees and rev_raw:
            est_emp = max(1, int(rev_raw / rev_per_emp))
            # Round to nearest 100 for credibility
            est_emp = round(est_emp / 100) * 100
            out["employees"] = est_emp
            log.info(
                "[Estimate] employees = $%.1fB / $%.0f/emp ≈ %d",
                rev_raw / 1e9, rev_per_emp, est_emp,
            )

        # ── Valuation ─────────────────────────────────────────────────────────
        if not result.valuation:
            if rev_raw:
                est_val = int(rev_raw * ev_rev_mult)
                out["valuation"] = fmt_money(est_val)
                log.info(
                    "[Estimate] valuation = %s × %.1fx EV/Rev = %s",
                    fmt_money(rev_raw), ev_rev_mult, out["valuation"],
                )
            elif result.employees:
                est_val = int(result.employees * val_per_emp)
                out["valuation"] = fmt_money(est_val)
                log.info(
                    "[Estimate] valuation = %d emp × $%.0f/emp = %s",
                    result.employees, val_per_emp, out["valuation"],
                )

        return out


# ─── Orchestrator ─────────────────────────────────────────────────────────────

def seed_company(name: str, website: str, timeout: int = DEFAULT_TIMEOUT) -> dict[str, Any]:
    session = Session(timeout=timeout)
    result  = CompanyResult(
        name    = name.strip(),
        slug    = slugify(name.strip()),
        website = normalise_url(website),
    )

    wiki    = WikipediaScraper(session)
    edgar   = SecEdgarScraper(session)
    yahoo   = YahooFinanceScraper(session)
    web     = WebsiteScraper(session)
    logos   = LogoScraper(session)

    log.info("=" * 60)
    log.info("Seeding: %s | %s", name, website)
    log.info("=" * 60)

    def run_wikipedia():
        try:
            # Wikipedia runs at priority 1 — community-maintained infobox is the most
            # reliable single source for revenue, employees, and founded year because:
            # • It is updated within days of earnings releases by multiple editors
            # • SEC EDGAR XBRL "Revenues" sometimes returns a sub-segment or TTM figure
            #   rather than the true annual total (e.g., Microsoft $62.5B segment vs
            #   $245B actual), causing systematically wrong revenue when SEC wins.
            return "wikipedia", 1, wiki.fetch(name)
        except Exception as e:
            log.warning("[Wikipedia] fatal: %s", e, exc_info=True)
            return "wikipedia", 1, {}

    def run_edgar():
        try:
            # SEC EDGAR runs at priority 2 for revenue/employees (Wikipedia is more reliable
            # for those). SEC is still primary for HQ, SIC category, and valuation (public float).
            return "sec_edgar", 2, edgar.fetch(name)
        except Exception as e:
            log.warning("[SEC EDGAR] fatal: %s", e, exc_info=True)
            return "sec_edgar", 2, {}

    def run_yahoo():
        try:
            return "yahoo_finance", 2, yahoo.fetch(name, website)
        except Exception as e:
            log.warning("[Yahoo Finance] fatal: %s", e, exc_info=True)
            return "yahoo_finance", 2, {}

    def run_website():
        try:
            return "website", 3, web.fetch(website, name, result.category)
        except Exception as e:
            log.warning("[Website] fatal: %s", e, exc_info=True)
            return "website", 3, {}

    # Run Wikipedia + SEC + Yahoo in parallel; website last (uses category from others)
    import concurrent.futures as _cf
    with ThreadPoolExecutor(max_workers=3) as pool:
        tier1_futures = [pool.submit(run_wikipedia), pool.submit(run_edgar), pool.submit(run_yahoo)]
        try:
            for future in as_completed(tier1_futures, timeout=timeout + 5):
                try:
                    src, prio, data = future.result()
                    result.merge(data, src, prio)
                except Exception as e:
                    log.warning("Scraper future error: %s", e)
        except _cf.TimeoutError:
            # Collect any already-completed futures before giving up
            log.warning("Tier-1 scraper timeout — collecting completed results")
            for f in tier1_futures:
                if f.done():
                    try:
                        src, prio, data = f.result()
                        result.merge(data, src, prio)
                    except Exception as e:
                        log.warning("Scraper future error: %s", e)
            # Cancel unfinished futures
            for f in tier1_futures:
                f.cancel()

    # Website scrape runs after we have category context
    try:
        src, prio, data = run_website()
        result.merge(data, src, prio)
    except Exception as e:
        log.warning("Website scraper error: %s", e)

    # Logo scrape — sequential, uses website + wikipedia already in memory
    try:
        logo_url = logos.fetch(name, website)
        if logo_url:
            result.merge({"logo_url": logo_url}, "logo_scraper", 1)
    except Exception as e:
        log.warning("Logo scraper error: %s", e)

    # ── Post-processing ───────────────────────────────────────────────────
    if not result.slug:
        result.slug = slugify(result.name)

    # Deduplicate HQ segments
    if result.hq:
        parts = [p.strip() for p in result.hq.split(",")]
        seen: list[str] = []
        for p in parts:
            if p and p not in seen:
                seen.append(p)
        result.hq = ", ".join(seen)

    # Deduplicate tags, cap at 6
    result.tags = list(dict.fromkeys(result.tags))[:6]

    # Ensure description is a single clean sentence
    if result.description:
        result.description = first_sentence(result.description, max_len=200)

    # ── Fallback estimates (absolute last resort) ─────────────────────────
    # Only fills fields still empty after all scrapers; never overwrites real data.
    estimator = FallbackEstimator()
    estimates = estimator.estimate(result)
    if estimates:
        result.merge(estimates, FallbackEstimator.SOURCE, FallbackEstimator.PRIORITY)
        log.info("[Estimate] applied fallbacks for: %s", list(estimates.keys()))

    output = result.to_dict()

    # ── Staleness check ───────────────────────────────────────────────────────
    # Revenue should be from the most recent COMPLETED full fiscal year.
    # Warn if the sourced revenue looks like it could be from an older year.
    # We can't know the exact FY year from just a formatted revenue string, but
    # we can warn when the revenue source is Wikipedia (which lags SEC filings).
    revenue_source = output.get("_sources", {}).get("revenue", "")
    if revenue_source in ("Wikipedia", "estimate"):
        log.warning(
            "[STALENESS] Revenue sourced from '%s' — this may lag the most recent completed FY. "
            "Cross-check against SEC EDGAR or the company's latest annual report. "
            "Required: most recent COMPLETED full fiscal year only (no TTM, no partials).",
            revenue_source,
        )
    elif revenue_source == "SEC EDGAR":
        # SEC EDGAR gives us the actual FY year via the filing end date.
        # _latest_annual picks the most recent 10-K; verify it's not stale.
        import datetime as _dt
        current_year = _dt.date.today().year
        # We don't store the raw FY year here, but we can warn if the company
        # is known to have a fiscal year that ended more than 12 months ago.
        # The full staleness check lives in seed_financials.py which has the year.
        log.info("[STALENESS] Revenue from SEC EDGAR (most recent 10-K). "
                 "Confirm the filing year is FY%d or FY%d before inserting.",
                 current_year - 1, current_year)

    log.info("=" * 60)
    log.info("Final result:")
    for k, v in output.items():
        if not k.startswith("_") and k != "description":
            log.info("  %-18s = %s", k, v)
    if output.get("description"):
        log.info("  %-18s = %s", "description", output["description"])
    log.info("  %-18s = %s", "_sources", output.get("_sources", {}))
    log.info("=" * 60)
    return output


# ─── CLI ──────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Scrape company data from Wikipedia, SEC EDGAR, Yahoo Finance, and the company website.",
    )
    # Accept both --name and --company for backwards-compat (API routes call with --company,
    # legacy callers used --name). We resolve the actual value after parsing.
    name_group = parser.add_mutually_exclusive_group(required=True)
    name_group.add_argument("--name",    default=None, help="Company name (legacy)")
    name_group.add_argument("--company", default=None, help="Company name")
    parser.add_argument("--website",    required=True)
    parser.add_argument("--timeout",    type=int, default=DEFAULT_TIMEOUT)
    # Accept Supabase args for CLI compatibility (unused — this script outputs JSON to stdout
    # and the API route handles DB writes, but accepting them prevents argparse exit code 2
    # when called from seed-all which passes these flags to all sub-scrapers).
    parser.add_argument("--company-id", default="", help="Unused; accepted for compatibility")
    parser.add_argument("--auth-token", default="", help="Unused; accepted for compatibility")
    parser.add_argument("--app-url",    default="", help="Unused; accepted for compatibility")
    args = parser.parse_args()

    # Resolve company name from whichever flag was provided
    company_name = (args.name or args.company or "").strip()
    if not company_name:
        print(json.dumps({"error": "Company name is required (use --name or --company)"}))
        sys.exit(1)
    if not args.website.strip():
        print(json.dumps({"error": "Company website is required"}))
        sys.exit(1)

    try:
        data = seed_company(company_name, args.website.strip(), args.timeout)
        print(json.dumps(data, ensure_ascii=False, default=str))
    except Exception as e:
        log.error("Fatal: %s", e, exc_info=True)
        print(json.dumps({"error": str(e)}))
        sys.exit(2)


if __name__ == "__main__":
    main()
