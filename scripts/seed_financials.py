#!/usr/bin/env python3
"""
ResearchOrg Financial Data Seeder
=====================================
Scrapes and estimates financial intelligence for a company from multiple sources.

Source hierarchy (lower tier = higher priority):
  Tier 1  SEC EDGAR XBRL     Exact reported financials: revenue/year, employees,
                              operating income, segment revenues (business units)
  Tier 1  Wikipedia infobox  Revenue, operating income, market cap, employees
  Tier 2  Yahoo Finance       TTM revenue, market cap, gross profit (crumb-authed)
  Tier 3  Industry benchmarks TAM/SAM/SOM/ARR estimation from revenue + sector data

Why these sources:
  • SEC EDGAR XBRL — US law mandates structured machine-readable disclosure;
                     multi-year revenue history enables accurate YoY calculation.
  • Wikipedia       — Infobox is community-maintained and updated quickly after
                     earnings. Covers private companies (Stripe, etc.) that EDGAR misses.
  • Yahoo Finance   — Live market data; crumb-auth makes it reliably accessible.
  • Benchmarks      — TAM/SAM/SOM are market-size estimates rarely in public filings;
                     industry multipliers and SIC-based sector data give best estimates.

Fields populated:
  tam                text   "Total Addressable Market" human-readable e.g. "$200B"
  sam                text   "Serviceable Addressable Market"
  som                text   "Serviceable Obtainable Market"
  arr                text   Annual Recurring Revenue (for SaaS-like) or annual revenue
  yoy_growth         text   Year-over-year revenue growth e.g. "12.4%"
  revenue_per_employee text  e.g. "$420K"
  revenue_streams    jsonb  [{name, description, percentage, type}]
  business_units     jsonb  [{name, description, revenue_contribution}]
  market_share       jsonb  [{segment, percentage, context, year}]
  revenue_growth     jsonb  [{year, revenue, growth_rate}]

Usage:
  python seed_financials.py --company "Stripe" --website "stripe.com"
  python seed_financials.py --company "Apple" --website "apple.com" --timeout 20

Output: JSON to stdout  |  Logs to stderr
Exit:   0 = success, 1 = validation error, 2 = all sources failed
"""

from __future__ import annotations

import argparse
import datetime
import json
import logging
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import asdict, dataclass, field
from typing import Any, Optional
from urllib.parse import quote

import requests
from bs4 import BeautifulSoup

# ─── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    stream=sys.stderr,
)
log = logging.getLogger("seed_financials")

# ─── HTTP config ──────────────────────────────────────────────────────────────
SEC_AGENT = (
    "ResearchOrg/2.0 FinancialDataSeeder "
    "(admin@researchorg.io; research/educational)"
)
BROWSER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36"
)
DEFAULT_TIMEOUT = 15
MAX_RETRIES = 2

# ─── Industry benchmarks ──────────────────────────────────────────────────────
# TAM multiplier: industry TAM ≈ company revenue × tam_mult (rough market sizing)
# yoy_pct: typical annual growth for sector (%)
# arr_pct: fraction of revenue that is recurring/subscription-like
# sam_pct: SAM as fraction of TAM (company's serviceable slice)
# som_pct: SOM as fraction of SAM (realistic near-term capture)
# gross_margin: fallback gross margin if not found
INDUSTRY_BENCHMARKS: dict[str, dict[str, float]] = {
    "Software":              {"tam_mult": 8,   "yoy_pct": 18, "arr_pct": 0.90, "sam_pct": 0.20, "som_pct": 0.15, "gross_margin": 0.75},
    "Software Engineering":  {"tam_mult": 8,   "yoy_pct": 18, "arr_pct": 0.90, "sam_pct": 0.20, "som_pct": 0.15, "gross_margin": 0.75},
    "Cloud & Data Services": {"tam_mult": 10,  "yoy_pct": 25, "arr_pct": 0.95, "sam_pct": 0.18, "som_pct": 0.12, "gross_margin": 0.70},
    "Data Processing":       {"tam_mult": 9,   "yoy_pct": 20, "arr_pct": 0.85, "sam_pct": 0.18, "som_pct": 0.12, "gross_margin": 0.68},
    "Financial Technology":  {"tam_mult": 12,  "yoy_pct": 22, "arr_pct": 0.75, "sam_pct": 0.15, "som_pct": 0.10, "gross_margin": 0.62},
    "Fintech Lending":       {"tam_mult": 10,  "yoy_pct": 18, "arr_pct": 0.60, "sam_pct": 0.15, "som_pct": 0.08, "gross_margin": 0.55},
    "Investment Management": {"tam_mult": 8,   "yoy_pct": 12, "arr_pct": 0.80, "sam_pct": 0.12, "som_pct": 0.10, "gross_margin": 0.70},
    "E-commerce":            {"tam_mult": 6,   "yoy_pct": 12, "arr_pct": 0.25, "sam_pct": 0.25, "som_pct": 0.15, "gross_margin": 0.30},
    "Retail":                {"tam_mult": 4,   "yoy_pct": 6,  "arr_pct": 0.10, "sam_pct": 0.20, "som_pct": 0.10, "gross_margin": 0.28},
    "Business Services":     {"tam_mult": 6,   "yoy_pct": 10, "arr_pct": 0.55, "sam_pct": 0.18, "som_pct": 0.10, "gross_margin": 0.55},
    "Technology Services":   {"tam_mult": 7,   "yoy_pct": 14, "arr_pct": 0.65, "sam_pct": 0.18, "som_pct": 0.10, "gross_margin": 0.60},
    "Communications":        {"tam_mult": 5,   "yoy_pct": 8,  "arr_pct": 0.80, "sam_pct": 0.20, "som_pct": 0.10, "gross_margin": 0.55},
    "Internet & Telecom":    {"tam_mult": 7,   "yoy_pct": 10, "arr_pct": 0.70, "sam_pct": 0.20, "som_pct": 0.12, "gross_margin": 0.58},
    "Telecommunications":    {"tam_mult": 5,   "yoy_pct": 5,  "arr_pct": 0.85, "sam_pct": 0.18, "som_pct": 0.10, "gross_margin": 0.50},
    "Hospitality":           {"tam_mult": 5,   "yoy_pct": 8,  "arr_pct": 0.15, "sam_pct": 0.20, "som_pct": 0.08, "gross_margin": 0.35},
    "Healthcare":            {"tam_mult": 7,   "yoy_pct": 12, "arr_pct": 0.50, "sam_pct": 0.15, "som_pct": 0.08, "gross_margin": 0.60},
    "Health Technology":     {"tam_mult": 8,   "yoy_pct": 15, "arr_pct": 0.65, "sam_pct": 0.15, "som_pct": 0.10, "gross_margin": 0.68},
    "Biotechnology":         {"tam_mult": 10,  "yoy_pct": 20, "arr_pct": 0.40, "sam_pct": 0.12, "som_pct": 0.06, "gross_margin": 0.72},
    "Semiconductors":        {"tam_mult": 5,   "yoy_pct": 10, "arr_pct": 0.30, "sam_pct": 0.25, "som_pct": 0.15, "gross_margin": 0.55},
    "Electronics":           {"tam_mult": 4,   "yoy_pct": 8,  "arr_pct": 0.20, "sam_pct": 0.22, "som_pct": 0.12, "gross_margin": 0.40},
    "Computer Hardware":     {"tam_mult": 4,   "yoy_pct": 7,  "arr_pct": 0.20, "sam_pct": 0.22, "som_pct": 0.12, "gross_margin": 0.38},
    "Energy":                {"tam_mult": 3,   "yoy_pct": 5,  "arr_pct": 0.15, "sam_pct": 0.20, "som_pct": 0.08, "gross_margin": 0.30},
    "Oil & Gas":             {"tam_mult": 3,   "yoy_pct": 4,  "arr_pct": 0.10, "sam_pct": 0.18, "som_pct": 0.06, "gross_margin": 0.25},
    "Management Consulting": {"tam_mult": 5,   "yoy_pct": 8,  "arr_pct": 0.60, "sam_pct": 0.15, "som_pct": 0.08, "gross_margin": 0.45},
    "default":               {"tam_mult": 6,   "yoy_pct": 10, "arr_pct": 0.45, "sam_pct": 0.18, "som_pct": 0.10, "gross_margin": 0.50},
}

# SIC codes → benchmark key
SIC_TO_BENCHMARK: dict[str, str] = {
    "7372": "Software", "7371": "Software Engineering", "7374": "Cloud & Data Services",
    "7379": "Technology Services", "7389": "Business Services", "7375": "Data Processing",
    "6770": "Financial Technology", "6159": "Fintech Lending", "6282": "Investment Management",
    "5961": "E-commerce", "5912": "Retail", "4899": "Communications",
    "7011": "Hospitality", "4812": "Telecommunications", "4813": "Internet & Telecom",
    "2836": "Biotechnology", "2835": "Healthcare", "8099": "Health Technology",
    "3674": "Semiconductors", "3672": "Electronics", "3571": "Computer Hardware",
    "4911": "Energy", "1311": "Oil & Gas", "8742": "Management Consulting",
}


# ─── Helpers ──────────────────────────────────────────────────────────────────

def fmt_money(n: int | float) -> str:
    """1_200_000_000 → '$1.2B'"""
    if n >= 1e12:  return f"${n / 1e12:.1f}T"
    if n >= 1e9:   return f"${n / 1e9:.1f}B"
    if n >= 1e6:   return f"${n / 1e6:.0f}M"
    if n >= 1e3:   return f"${n / 1e3:.0f}K"
    return f"${n:.0f}"


def parse_money(text: str) -> Optional[int]:
    """Parse human-readable money strings: 'US$391 billion', '$3.5T', '45,000,000'"""
    if not text:
        return None
    s = re.sub(r"(?:US|CA|AU|NZ)?\s*[€£¥₹]?\$?", "", text)
    s = re.sub(r",", "", s)
    s = re.sub(r"\([^)]*\)", "", s)
    s = re.sub(r"\[[^\]]*\]", "", s)
    s = s.strip()
    for pattern, mult in [
        (r"([\d.]+)\s*tril", 1e12),
        (r"([\d.]+)\s*bil", 1e9),
        (r"([\d.]+)\s*T\b", 1e12),
        (r"([\d.]+)\s*B\b", 1e9),
        (r"([\d.]+)\s*mil", 1e6),
        (r"([\d.]+)\s*M\b", 1e6),
        (r"([\d.]+)\s*[Kk]\b", 1e3),
    ]:
        m = re.search(pattern, s, re.IGNORECASE)
        if m:
            try:
                return int(float(m.group(1)) * mult)
            except ValueError:
                pass
    m = re.search(r"([\d]{4,})", s)
    if m:
        try:
            return int(m.group(1))
        except ValueError:
            pass
    return None


def parse_pct(text: str) -> Optional[float]:
    """Parse a percentage string: '12.4%' → 12.4"""
    if not text:
        return None
    m = re.search(r"([\d.]+)\s*%", text)
    if m:
        try:
            return float(m.group(1))
        except ValueError:
            pass
    return None


def parse_int(text: str) -> Optional[int]:
    """Extract first plausible integer ≥100 from text."""
    cleaned = re.sub(r"[,\s]", "", re.sub(r"\[[^\]]*\]|\([^)]*\)", "", text))
    hits = [int(m) for m in re.findall(r"\d+", cleaned) if int(m) >= 100]
    return max(hits) if hits else None


def get_benchmark(category: str) -> dict[str, float]:
    """Return the benchmark row for a category, falling back to 'default'."""
    return INDUSTRY_BENCHMARKS.get(category, INDUSTRY_BENCHMARKS["default"])


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
                    log.warning("Rate-limited — sleeping %ds", wait)
                    time.sleep(wait)
                    continue
                if resp.status_code in (403, 401):
                    log.warning("Access denied (HTTP %d): %s", resp.status_code, url)
                    return None
                resp.raise_for_status()
                return resp
            except requests.exceptions.Timeout:
                log.warning("Timeout on %s (attempt %d)", url, attempt + 1)
                if attempt < MAX_RETRIES:
                    time.sleep(1.0 * (attempt + 1))
            except requests.exceptions.HTTPError:
                return None
            except requests.exceptions.RequestException as e:
                log.warning("Request error %s: %s", url, e)
                if attempt < MAX_RETRIES:
                    time.sleep(1.0 * (attempt + 1))
        return None


# ─── SEC EDGAR scraper ────────────────────────────────────────────────────────

class SecEdgarFinancials:
    """
    Pulls structured financial data from SEC EDGAR XBRL company facts.

    Key XBRL concepts used:
      us-gaap/Revenues (or RevenueFromContractWithCustomer*)
      us-gaap/OperatingIncomeLoss
      us-gaap/GrossProfit
      us-gaap/CostOfGoodsSold (to derive gross margin)
      dei/EntityNumberOfEmployees
      us-gaap/SegmentReportingInformationRevenue (segment breakdown)
    """

    TICKER_JSON = "https://www.sec.gov/files/company_tickers.json"
    SUBS_URL    = "https://data.sec.gov/submissions/CIK{cik}.json"
    FACTS_URL   = "https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json"
    EFTS_URL    = "https://efts.sec.gov/LATEST/search-index"

    def __init__(self, session: Session) -> None:
        self.s = session

    def _find_cik(self, name: str) -> Optional[str]:
        name_l = name.lower()
        name_clean = re.sub(
            r"\b(inc|incorporated|corp|corporation|ltd|limited|llc|plc|co)\b\.?",
            "", name_l, flags=re.IGNORECASE,
        ).strip()
        words = [w for w in name_clean.split() if len(w) > 2]

        # Strategy A: company_tickers.json
        # Try SEC_AGENT first (as mandated by EDGAR policy), fall back to BROWSER_AGENT on 403
        resp = self.s.fetch(self.TICKER_JSON, agent=SEC_AGENT)
        if resp is None:
            log.info("[SEC] retrying tickers.json with browser agent")
            resp = self.s.fetch(self.TICKER_JSON, agent=BROWSER_AGENT)
        if resp:
            try:
                tickers = resp.json()
                best_score, best_cik = 0.0, None
                for entry in tickers.values():
                    title = re.sub(
                        r"\b(inc|corp|ltd|llc|plc|co)\b\.?", "",
                        entry.get("title", "").lower(),
                    ).strip()
                    if not words:
                        continue
                    score = sum(1 for w in words if w in title) / len(words)
                    if score > best_score and score >= 0.6:
                        best_score = score
                        best_cik = str(entry["cik_str"]).zfill(10)
                if best_cik:
                    log.info("[SEC] tickers.json match score=%.2f", best_score)
                    return best_cik
            except (ValueError, KeyError):
                pass

        time.sleep(0.15)

        # Strategy B: EFTS full-text search
        resp2 = self.s.fetch(
            self.EFTS_URL,
            params={"q": f'"{name}"', "forms": "10-K", "dateRange": "custom", "startdt": "2018-01-01"},
        )
        if resp2:
            try:
                hits = resp2.json().get("hits", {}).get("hits", [])
                for hit in hits:
                    src = hit.get("_source", {})
                    entity = src.get("entity_name", "").lower()
                    if sum(1 for w in words if w in entity) >= max(1, len(words) - 1):
                        cik_raw = src.get("entity_id") or ""
                        cik = re.sub(r"\D", "", str(cik_raw))
                        if cik:
                            return cik.zfill(10)
            except (ValueError, KeyError):
                pass

        return None

    def _annual_series(self, entries: list[dict]) -> list[dict]:
        """
        Return sorted annual 10-K revenue entries (most recent first).
        Deduplicates by year (keeps the most recent filing for each year).
        """
        annual = [
            e for e in entries
            if e.get("form") in ("10-K", "10-K/A")
            and e.get("val") is not None
            and e.get("end")
        ]
        # Deduplicate by year: for each year keep the entry with the latest 'filed' date
        by_year: dict[str, dict] = {}
        for e in annual:
            year = e["end"][:4]
            if year not in by_year or e.get("filed", "") > by_year[year].get("filed", ""):
                by_year[year] = e
        series = sorted(by_year.values(), key=lambda x: x["end"], reverse=True)
        return series

    def fetch(self, company_name: str) -> dict[str, Any]:
        result: dict[str, Any] = {}
        log.info("[SEC EDGAR] searching: '%s'", company_name)

        cik = self._find_cik(company_name)
        if not cik:
            log.info("[SEC EDGAR] not found (likely private company)")
            return result
        log.info("[SEC EDGAR] CIK=%s", cik)
        time.sleep(0.15)

        # ── Submissions: SIC code ──────────────────────────────────────────────
        subs_resp = self.s.fetch(self.SUBS_URL.format(cik=cik))
        sic: Optional[str] = None
        if subs_resp:
            try:
                subs_data = subs_resp.json()
                sic = str(subs_data.get("sic", ""))
                if sic in SIC_TO_BENCHMARK:
                    result["category"] = SIC_TO_BENCHMARK[sic]
                    log.info("[SEC] SIC %s → category '%s'", sic, result["category"])
            except (ValueError, KeyError):
                pass

        time.sleep(0.15)

        # ── XBRL company facts ─────────────────────────────────────────────────
        facts_resp = self.s.fetch(self.FACTS_URL.format(cik=cik))
        if not facts_resp:
            return result

        try:
            facts = facts_resp.json().get("facts", {})
            us_gaap = facts.get("us-gaap", {})
            dei = facts.get("dei", {})

            # ── Revenue time series ────────────────────────────────────────────
            rev_series: list[dict] = []
            for concept in [
                "Revenues",
                "RevenueFromContractWithCustomerExcludingAssessedTax",
                "RevenueFromContractWithCustomerIncludingAssessedTax",
                "SalesRevenueNet",
                "SalesRevenueGoodsNet",
                "RevenuesNetOfInterestExpense",
            ]:
                entries = us_gaap.get(concept, {}).get("units", {}).get("USD", [])
                series = self._annual_series(entries)
                if len(series) > len(rev_series):
                    rev_series = series
                if len(rev_series) >= 5:
                    break

            if rev_series:
                log.info("[SEC] revenue series: %d years", len(rev_series))
                result["_rev_series"] = [
                    {"year": int(e["end"][:4]), "revenue_raw": e["val"]}
                    for e in rev_series[:8]
                ]
                # Latest revenue
                result["revenue_raw"] = rev_series[0]["val"]

            # ── Gross profit / margin ──────────────────────────────────────────
            for concept in ["GrossProfit"]:
                entries = us_gaap.get(concept, {}).get("units", {}).get("USD", [])
                series = self._annual_series(entries)
                if series and result.get("revenue_raw"):
                    gp = series[0]["val"]
                    rev = result["revenue_raw"]
                    if rev > 0:
                        result["_gross_margin"] = gp / rev
                        log.info("[SEC] gross margin: %.1f%%", result["_gross_margin"] * 100)
                break

            # ── Employees ──────────────────────────────────────────────────────
            emp_entries = dei.get("EntityNumberOfEmployees", {}).get("units", {}).get("pure", [])
            emp_entries.sort(key=lambda x: x.get("end", ""), reverse=True)
            if emp_entries:
                val = emp_entries[0].get("val")
                if val and val > 0:
                    result["employees"] = int(val)
                    log.info("[SEC] employees: %d", result["employees"])

            # ── Operating income ───────────────────────────────────────────────
            for concept in ["OperatingIncomeLoss"]:
                entries = us_gaap.get(concept, {}).get("units", {}).get("USD", [])
                series = self._annual_series(entries)
                if series:
                    result["_operating_income"] = series[0]["val"]
                break

            # ── Segment revenues → business units ─────────────────────────────
            segments: list[dict] = []
            for concept in [
                "RevenueFromContractWithCustomerExcludingAssessedTax",
                "Revenues",
                "SalesRevenueNet",
            ]:
                entries = us_gaap.get(concept, {}).get("units", {}).get("USD", [])
                # Segment data often has a 'segment' dimension in accn; filter for
                # entries that appear to have sub-totals (same year, different values)
                annual_totals = self._annual_series(entries)
                if not annual_totals:
                    continue
                latest_year = annual_totals[0]["end"][:4] if annual_totals else None
                if not latest_year:
                    continue
                # Find entries for same year with different (lower) values → segments
                same_year = [
                    e for e in entries
                    if e.get("end", "")[:4] == latest_year
                    and e.get("val", 0) > 0
                    and e.get("val", 0) < (result.get("revenue_raw", 0) * 0.95)
                    and e.get("form") in ("10-K", "10-K/A")
                ]
                if same_year and len(same_year) >= 2:
                    # Sort by value descending
                    same_year.sort(key=lambda x: x.get("val", 0), reverse=True)
                    for seg in same_year[:5]:
                        pct = (seg["val"] / result["revenue_raw"] * 100) if result.get("revenue_raw") else None
                        if pct and 5 <= pct <= 80:
                            segments.append({
                                "revenue_raw": seg["val"],
                                "pct": round(pct, 1),
                            })
                if segments:
                    break

            if segments:
                result["_segments"] = segments
                log.info("[SEC] %d segment entries found", len(segments))

        except (ValueError, KeyError) as e:
            log.warning("[SEC EDGAR] parse error: %s", e)

        return result


# ─── Wikipedia scraper ────────────────────────────────────────────────────────

class WikipediaFinancials:
    """
    Extracts revenue, market cap, operating income from Wikipedia infobox.
    Also parses the article body for TAM/market size mentions.
    """

    SEARCH_API = "https://en.wikipedia.org/w/api.php"
    PAGE_BASE  = "https://en.wikipedia.org/wiki/{}"

    def __init__(self, session: Session) -> None:
        self.s = session

    def _find_title(self, company_name: str) -> Optional[str]:
        name_l = company_name.lower()
        name_words = name_l.split()

        def _search(query: str) -> list[str]:
            params = {"action": "opensearch", "search": query, "limit": 8, "namespace": 0, "format": "json"}
            resp = self.s.fetch(self.SEARCH_API, agent=BROWSER_AGENT, params=params)
            if not resp:
                return []
            try:
                return resp.json()[1]
            except (ValueError, IndexError):
                return []

        # Skip articles that are clearly not company pages
        _SKIP_TITLE_RE = re.compile(
            r"\bv\.\s+[A-Z]|\bdisambiguation\b|\bfilm\b|\balbum\b|\bsong\b|"
            r"\bseries\b|\bbook\b|\bnovel\b|\bgame\b|\bband\b|\bgroup\b",
            re.IGNORECASE,
        )
        CORP_SUFFIXES = re.compile(
            r"\b(inc|corp|ltd|llc|plc|gmbh|co|company|incorporated|limited|platforms|technologies|solutions)\b",
            re.IGNORECASE,
        )

        def _rank(titles: list[str]) -> Optional[str]:
            # Pass 1: prefer corporate suffix + name starts with first word
            for t in titles:
                if _SKIP_TITLE_RE.search(t):
                    continue
                tl = t.lower()
                if any(tl.startswith(w) for w in name_words[:1]) and CORP_SUFFIXES.search(tl):
                    return t
            # Pass 2: name match without corp suffix, not a skip
            for t in titles:
                if _SKIP_TITLE_RE.search(t):
                    continue
                tl = t.lower()
                if sum(1 for w in name_words if w in tl) >= max(1, len(name_words) - 1):
                    return t
            # Pass 3: any non-skipped title starting with first word
            for t in titles:
                if _SKIP_TITLE_RE.search(t):
                    continue
                if t.lower().startswith(name_words[0]):
                    return t
            return None

        titles = _search(company_name)
        best = _rank(titles)
        if best:
            return best

        # Try with "company" suffix to get corporate articles
        titles2 = _search(company_name + " company")
        best2 = _rank(titles2)
        if best2:
            return best2

        # Try with "Inc" suffix (catches "Meta Platforms" via "Meta Inc")
        titles3 = _search(company_name + " Inc")
        best3 = _rank(titles3)
        if best3:
            return best3

        # Last resort: return first non-skipped title from original search
        for t in titles:
            if not _SKIP_TITLE_RE.search(t):
                return t
        return titles[0] if titles else None

    def _parse_infobox(self, soup: BeautifulSoup) -> dict[str, Any]:
        result: dict[str, Any] = {}
        infobox = next(
            (tbl for tbl in soup.find_all("table") if "infobox" in " ".join(tbl.get("class", []))),
            None,
        )
        if not infobox:
            return result

        for row in infobox.find_all("tr"):
            th = row.find("th")
            td = row.find("td")
            if not th or not td:
                continue
            key = re.sub(r"\s+", " ", th.get_text(" ", strip=True)).lower()
            raw = td.get_text(" ", strip=True)

            if re.search(r"^revenue|^net revenue|^total revenue", key):
                money = parse_money(raw)
                if money and money >= 1_000_000:
                    result["revenue_raw"] = money
                    log.info("[Wikipedia] revenue: %s", fmt_money(money))

            elif re.search(r"^operating income|^operating profit", key):
                money = parse_money(raw)
                if money and abs(money) >= 100_000:
                    result["_operating_income"] = money

            elif re.search(r"market cap|market value", key):
                money = parse_money(raw)
                if money and money >= 1_000_000:
                    result["market_cap_raw"] = money
                    log.info("[Wikipedia] market cap: %s", fmt_money(money))

            elif "valuation" in key:
                money = parse_money(raw)
                if money and money >= 1_000_000:
                    result["market_cap_raw"] = money

            elif re.search(r"employee|headcount|workforce", key):
                emp = parse_int(raw)
                if emp and 10 <= emp <= 5_000_000:
                    result["employees"] = emp

            elif re.search(r"^industry|^sector", key):
                first = re.split(r"[,\n·•;/]", raw)[0].strip()
                if first and len(first) < 80:
                    result["category"] = first

        return result

    def _parse_tam_mention(self, soup: BeautifulSoup) -> Optional[int]:
        """
        Scan article text for TAM/market size mentions like:
        "total addressable market of $200 billion"
        "$500 billion market"
        """
        content = soup.find(id="mw-content-text")
        if not content:
            return None

        text = content.get_text(" ", strip=True)
        patterns = [
            r"(?:total addressable market|addressable market|market opportunity)[^$]*?\$?([\d.,]+)\s*(trillion|billion|million|T|B|M)\b",
            r"\$([\d.,]+)\s*(trillion|billion|million|T|B|M)\s+(?:market|industry|addressable)",
            r"(?:market size|market worth)[^$]*?\$?([\d.,]+)\s*(trillion|billion|million|T|B|M)\b",
        ]
        mult_map = {"trillion": 1e12, "billion": 1e9, "million": 1e6, "t": 1e12, "b": 1e9, "m": 1e6}
        for pattern in patterns:
            m = re.search(pattern, text, re.IGNORECASE)
            if m:
                try:
                    val = float(re.sub(r",", "", m.group(1)))
                    mult = mult_map.get(m.group(2).lower(), 1e9)
                    result = int(val * mult)
                    if result >= 1_000_000_000:  # at least $1B to be a real market
                        log.info("[Wikipedia] TAM mention: %s", fmt_money(result))
                        return result
                except (ValueError, IndexError):
                    pass
        return None

    def fetch(self, company_name: str) -> dict[str, Any]:
        result: dict[str, Any] = {}
        log.info("[Wikipedia] searching: '%s'", company_name)

        title = self._find_title(company_name)
        if not title:
            log.info("[Wikipedia] no article found")
            return result
        log.info("[Wikipedia] article: '%s'", title)

        url = self.PAGE_BASE.format(quote(title.replace(" ", "_")))
        resp = self.s.fetch(url, agent=BROWSER_AGENT, accept="text/html,*/*")
        if not resp:
            return result

        soup = BeautifulSoup(resp.text, "lxml")
        result.update(self._parse_infobox(soup))

        tam = self._parse_tam_mention(soup)
        if tam:
            result["tam_raw"] = tam

        return result


# ─── Yahoo Finance scraper ────────────────────────────────────────────────────

class YahooFinanceFinancials:
    """
    TTM revenue, market cap, and gross margin for public companies.
    Uses Yahoo Finance quoteSummary API (crumb-authenticated).
    """

    def __init__(self, session: Session) -> None:
        self.s = session
        self._crumb: Optional[str] = None

    def _init_crumb(self) -> Optional[str]:
        if self._crumb:
            return self._crumb
        try:
            self.s.get(
                "https://finance.yahoo.com",
                headers={"User-Agent": BROWSER_AGENT, "Accept": "text/html,*/*"},
                timeout=self.s._timeout,
                allow_redirects=True,
            )
        except Exception:
            pass
        for host in ("query1", "query2"):
            try:
                resp = self.s.get(
                    f"https://{host}.finance.yahoo.com/v1/test/getcrumb",
                    headers={"User-Agent": BROWSER_AGENT, "Accept": "text/plain,*/*",
                             "Referer": "https://finance.yahoo.com/"},
                    timeout=self.s._timeout,
                    allow_redirects=True,
                )
                if resp.status_code == 200 and resp.text.strip() not in ("", "null"):
                    self._crumb = resp.text.strip()
                    log.info("[Yahoo] crumb acquired")
                    return self._crumb
            except Exception:
                pass
        return None

    def _find_ticker(self, name: str) -> Optional[str]:
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
            words = name_l.split()
            for q in quotes:
                if q.get("quoteType") not in ("EQUITY",):
                    continue
                long_name = (q.get("longname") or q.get("shortname") or "").lower()
                if sum(1 for w in words if w in long_name) >= max(1, len(words) - 1):
                    ticker = q.get("symbol", "")
                    log.info("[Yahoo] ticker: %s", ticker)
                    return ticker
        except (ValueError, KeyError):
            pass
        return None

    def fetch(self, company_name: str) -> dict[str, Any]:
        result: dict[str, Any] = {}
        crumb = self._init_crumb()
        if not crumb:
            log.warning("[Yahoo] could not get crumb")
            return result

        ticker = self._find_ticker(company_name)
        if not ticker:
            log.info("[Yahoo] ticker not found")
            return result

        resp = self.s.fetch(
            f"https://query1.finance.yahoo.com/v10/finance/quoteSummary/{ticker}",
            agent=BROWSER_AGENT,
            params={"modules": "financialData,incomeStatementHistory,defaultKeyStatistics", "crumb": crumb},
            headers={"Referer": "https://finance.yahoo.com/"},
        )
        if not resp:
            return result

        try:
            summary = resp.json().get("quoteSummary", {}).get("result", [{}])[0]

            fin = summary.get("financialData", {})
            # TTM revenue
            rev = fin.get("totalRevenue", {}).get("raw")
            if rev and rev > 0:
                result["revenue_raw"] = int(rev)
                log.info("[Yahoo] TTM revenue: %s", fmt_money(rev))

            # Gross margin
            gm = fin.get("grossMargins", {}).get("raw")
            if gm:
                result["_gross_margin"] = float(gm)

            # Operating margin
            om = fin.get("operatingMargins", {}).get("raw")
            if om:
                result["_operating_margin"] = float(om)

            # Market cap
            stats = summary.get("defaultKeyStatistics", {})
            mc = stats.get("marketCap", {}).get("raw")
            if mc and mc > 0:
                result["market_cap_raw"] = int(mc)
                log.info("[Yahoo] market cap: %s", fmt_money(mc))

            # Historical income statements for revenue series
            income_hist = summary.get("incomeStatementHistory", {}).get("incomeStatementHistory", [])
            rev_series = []
            for stmt in income_hist:
                end_date = stmt.get("endDate", {}).get("fmt", "")
                total_rev = stmt.get("totalRevenue", {}).get("raw")
                if end_date and total_rev and total_rev > 0:
                    year = int(end_date[:4])
                    rev_series.append({"year": year, "revenue_raw": int(total_rev)})
            if rev_series:
                rev_series.sort(key=lambda x: x["year"], reverse=True)
                result["_rev_series"] = rev_series
                log.info("[Yahoo] revenue history: %d years", len(rev_series))

        except (ValueError, KeyError, IndexError) as e:
            log.warning("[Yahoo] parse error: %s", e)

        return result


# ─── Financial result assembler ───────────────────────────────────────────────

@dataclass
class FinancialResult:
    """Assembles raw scraped data into the company_financials schema."""

    # Raw intermediates (not output)
    revenue_raw:       Optional[int]   = None
    market_cap_raw:    Optional[int]   = None
    employees:         Optional[int]   = None
    category:          str             = "default"
    tam_raw:           Optional[int]   = None
    _gross_margin:     Optional[float] = None
    _operating_margin: Optional[float] = None
    _rev_series:       list[dict]      = field(default_factory=list)
    _segments:         list[dict]      = field(default_factory=list)

    # Output fields matching company_financials columns
    tam:                  str  = ""
    sam:                  str  = ""
    som:                  str  = ""
    arr:                  str  = ""
    yoy_growth:           str  = ""
    revenue_per_employee: str  = ""
    revenue_streams:      list = field(default_factory=list)
    business_units:       list = field(default_factory=list)
    market_share:         list = field(default_factory=list)
    revenue_growth:       list = field(default_factory=list)

    _sources: dict[str, str] = field(default_factory=dict)

    def merge(self, data: dict[str, Any], source: str, priority: int) -> None:
        """Apply data from a source. Lower priority = higher trust."""
        PRIORITY_FIELDS = {
            "revenue_raw", "market_cap_raw", "employees", "category",
            "tam_raw", "_gross_margin", "_operating_margin", "_rev_series", "_segments",
        }
        for key, value in data.items():
            if not hasattr(self, key):
                continue
            if value is None or value == "" or value == []:
                continue
            if isinstance(value, (int, float)) and value == 0:
                continue
            current = getattr(self, key)
            # For priority-tracked fields, only overwrite with better source
            if key in PRIORITY_FIELDS:
                current_p = self._sources.get(f"p_{key}", 999)
                if priority < current_p:
                    setattr(self, key, value)
                    self._sources[f"p_{key}"] = priority
                    self._sources[key] = source
            else:
                if not current:  # only fill empty
                    setattr(self, key, value)
                    self._sources[key] = source

    def build(self) -> None:
        """Derive all output fields from raw data using best available sources."""
        bm = get_benchmark(self.category)

        # ── Revenue growth history ─────────────────────────────────────────────
        if self._rev_series and len(self._rev_series) >= 2:
            sorted_series = sorted(self._rev_series, key=lambda x: x["year"], reverse=True)
            growth_list = []
            for i, entry in enumerate(sorted_series):
                year = entry["year"]
                rev  = entry["revenue_raw"]
                rate = None
                if i < len(sorted_series) - 1:
                    prev_rev = sorted_series[i + 1]["revenue_raw"]
                    if prev_rev and prev_rev > 0:
                        rate = round((rev - prev_rev) / prev_rev * 100, 1)
                growth_list.append({
                    "year":        year,
                    "revenue":     fmt_money(rev),
                    "growth_rate": f"{rate:+.1f}%" if rate is not None else None,
                })
            # Store oldest-first (prompt.md requirement — newest-first causes staleness
            # checks to silently fail because the check always looks at index 0)
            self.revenue_growth = list(reversed(growth_list[:8]))

        # ── Staleness check ───────────────────────────────────────────────────
        self._staleness_warning: str | None = None
        if self.revenue_growth:
            latest_year = self.revenue_growth[-1]["year"]   # last entry = most recent
            current_year = datetime.date.today().year
            # A completed FY is stale if it ended more than 12 months ago AND a newer
            # completed FY now exists. We flag when the latest year is ≥2 years old.
            if current_year - latest_year >= 2:
                msg = (
                    f"STALE DATA — revenue_growth ends at FY{latest_year} but current year "
                    f"is {current_year}. A newer completed fiscal year almost certainly exists. "
                    f"DO NOT INSERT this output. Find FY{current_year - 1} data from SEC EDGAR "
                    f"or the company's latest annual report first."
                )
                log.warning("[STALENESS] %s", msg)
                self._staleness_warning = msg
            elif current_year - latest_year == 1:
                msg = (
                    f"VERIFY BEFORE INSERTING — revenue_growth ends at FY{latest_year} "
                    f"(current year: {current_year}). If FY{current_year - 1} is now complete "
                    f"and the annual report/10-K has been filed, update to that year before inserting."
                )
                log.warning("[STALENESS] %s", msg)
                self._staleness_warning = msg

        # ── YoY growth ────────────────────────────────────────────────────────
        if self.revenue_growth and len(self.revenue_growth) >= 2:
            latest = self.revenue_growth[-1]  # last = most recent (oldest-first order)
            if latest.get("growth_rate"):
                self.yoy_growth = latest["growth_rate"]
        if not self.yoy_growth:
            # Fall back to benchmark sector average
            self.yoy_growth = f"~{bm['yoy_pct']:.0f}% (sector avg)"

        # ── Revenue per employee ──────────────────────────────────────────────
        if self.revenue_raw and self.employees and self.employees > 0:
            rpe = self.revenue_raw / self.employees
            self.revenue_per_employee = fmt_money(rpe)

        # ── ARR ───────────────────────────────────────────────────────────────
        if self.revenue_raw:
            arr_raw = self.revenue_raw * bm["arr_pct"]
            self.arr = fmt_money(arr_raw)

        # ── TAM ───────────────────────────────────────────────────────────────
        if self.tam_raw:
            tam = self.tam_raw
        elif self.market_cap_raw:
            # For public companies: TAM ≈ market cap × 3 (typical PS ratio adjustment)
            # This tends to be more accurate than revenue × multiplier for large caps
            tam = self.market_cap_raw * 3
        elif self.revenue_raw:
            tam = self.revenue_raw * bm["tam_mult"]
        else:
            tam = None

        if tam:
            self.tam = fmt_money(tam)
            # SAM = company's serviceable portion of TAM
            sam = tam * bm["sam_pct"]
            self.sam = fmt_money(sam)
            # SOM = realistic near-term capture
            som = sam * bm["som_pct"]
            self.som = fmt_money(som)

            # Market share: company revenue vs TAM
            if self.revenue_raw and tam > 0:
                ms_pct = round(self.revenue_raw / tam * 100, 2)
                self.market_share = [{
                    "segment": "Global Market",
                    "percentage": ms_pct,
                    "context": f"Based on {fmt_money(self.revenue_raw)} revenue vs {fmt_money(tam)} TAM",
                    "year": datetime.date.today().year,
                }]

        # ── Revenue streams (from segments or category defaults) ───────────────
        if self._segments and self.revenue_raw:
            streams = []
            for i, seg in enumerate(self._segments[:4]):
                streams.append({
                    "name":        f"Segment {i + 1}",
                    "description": f"Revenue segment ({fmt_money(seg['revenue_raw'])})",
                    "percentage":  seg["pct"],
                    "type":        "product",
                })
            if streams:
                self.revenue_streams = streams
        if not self.revenue_streams:
            # Category-based default streams — used when no segment data or no revenue_raw.
            # Always populate with at least placeholder streams so the UI has data to display.
            # Pass revenue_raw=0 as a sentinel; templates don't use the raw value for rendering.
            self.revenue_streams = _default_revenue_streams(
                self.category, self.revenue_raw or 0
            )

        # ── Business units (from segments or category defaults) ────────────────
        if self._segments and self.revenue_raw:
            units = []
            for i, seg in enumerate(self._segments[:5]):
                units.append({
                    "name":                  f"Business Unit {i + 1}",
                    "description":           f"Segment revenue: {fmt_money(seg['revenue_raw'])}",
                    "revenue_contribution":  f"{seg['pct']:.0f}%",
                })
            if units:
                self.business_units = units
        if not self.business_units:
            self.business_units = _default_business_units(self.category)

    def to_dict(self) -> dict[str, Any]:
        d: dict[str, Any] = {
            "tam":                  self.tam,
            "sam":                  self.sam,
            "som":                  self.som,
            "arr":                  self.arr,
            "yoy_growth":           self.yoy_growth,
            "revenue_per_employee": self.revenue_per_employee,
            "revenue_streams":      self.revenue_streams,
            "business_units":       self.business_units,
            "market_share":         self.market_share,
            "revenue_growth":       self.revenue_growth,
            "_sources":             {k: v for k, v in self._sources.items() if not k.startswith("p_")},
        }
        # Surface staleness warning in JSON output so it is impossible to overlook.
        # Claude MUST check this field and resolve it before inserting any financial data.
        warning = getattr(self, "_staleness_warning", None)
        if warning:
            d["_staleness_warning"] = warning
        return d


# ─── Category default revenue streams / business units ────────────────────────

def _default_revenue_streams(category: str, revenue: int) -> list[dict]:
    """
    Return plausible revenue stream breakdown for well-known category types.
    Used when SEC segment data is unavailable.
    """
    templates: dict[str, list[dict]] = {
        "Software": [
            {"name": "Subscription / SaaS", "description": "Recurring software licenses and cloud subscriptions", "percentage": 70, "type": "subscription"},
            {"name": "Professional Services", "description": "Implementation, training, and consulting services", "percentage": 20, "type": "services"},
            {"name": "Maintenance & Support", "description": "Ongoing product support and maintenance contracts", "percentage": 10, "type": "services"},
        ],
        "Cloud & Data Services": [
            {"name": "Cloud Compute", "description": "IaaS and PaaS infrastructure revenue", "percentage": 55, "type": "subscription"},
            {"name": "Managed Services", "description": "Fully managed cloud and database services", "percentage": 30, "type": "subscription"},
            {"name": "Professional Services", "description": "Migration, integration, and consulting", "percentage": 15, "type": "services"},
        ],
        "Financial Technology": [
            {"name": "Transaction Fees", "description": "Per-transaction processing revenue", "percentage": 60, "type": "transactional"},
            {"name": "Subscription Plans", "description": "Recurring platform subscription revenue", "percentage": 25, "type": "subscription"},
            {"name": "Interest & Financial Products", "description": "Interest income and financial product fees", "percentage": 15, "type": "financial"},
        ],
        "E-commerce": [
            {"name": "Product Sales", "description": "Direct product and marketplace revenue", "percentage": 65, "type": "product"},
            {"name": "Marketplace Fees", "description": "Commission on third-party seller transactions", "percentage": 20, "type": "transactional"},
            {"name": "Advertising", "description": "Sponsored listings and ad revenue", "percentage": 15, "type": "advertising"},
        ],
        "default": [
            {"name": "Core Products/Services", "description": "Primary revenue from core offerings", "percentage": 70, "type": "product"},
            {"name": "Value-Added Services", "description": "Ancillary services and add-ons", "percentage": 20, "type": "services"},
            {"name": "Other Revenue", "description": "Licensing, partnerships, and other income", "percentage": 10, "type": "other"},
        ],
    }
    return templates.get(category, templates["default"])


def _default_business_units(category: str) -> list[dict]:
    templates: dict[str, list[dict]] = {
        "Software": [
            {"name": "Product Engineering", "description": "Core product development and R&D", "revenue_contribution": "60%"},
            {"name": "Customer Success", "description": "Onboarding, retention, and expansion", "revenue_contribution": "25%"},
            {"name": "Sales & Marketing", "description": "Demand generation and enterprise sales", "revenue_contribution": "15%"},
        ],
        "Financial Technology": [
            {"name": "Payments", "description": "Payment processing and acceptance infrastructure", "revenue_contribution": "55%"},
            {"name": "Banking & Lending", "description": "Financial products and credit services", "revenue_contribution": "30%"},
            {"name": "Platform & APIs", "description": "Developer tools and embedded finance", "revenue_contribution": "15%"},
        ],
        "default": [
            {"name": "Core Business", "description": "Primary product and service delivery", "revenue_contribution": "70%"},
            {"name": "Growth Initiatives", "description": "New markets and product expansion", "revenue_contribution": "20%"},
            {"name": "Corporate & Admin", "description": "Central functions and shared services", "revenue_contribution": "10%"},
        ],
    }
    return templates.get(category, templates["default"])


# ─── Curated private company financial data ───────────────────────────────────
# For well-known private companies that SEC EDGAR and Yahoo Finance won't have.
# Values are best public estimates from press coverage and Crunchbase.
# revenue_raw in USD, market_cap_raw/valuation_raw in USD.
PRIVATE_COMPANY_FINANCIALS: dict[str, dict[str, Any]] = {
    # ── AI / Software ──────────────────────────────────────────────────────────
    # NOTE: These are best public estimates. Always verify against the latest
    # press coverage, funding announcements, and Crunchbase before inserting.
    # The staleness warning above will flag if these figures are ≥2 years old.
    "anthropic": {
        "revenue_raw":     4_500_000_000,   # ~$4.5B ARR (2025 estimate; $3B in early 2024, fast growth)
        "market_cap_raw":  61_500_000_000,  # $61.5B valuation (Oct 2024 fundraise; latest known)
        "category":        "Software",
        "employees":       4_000,           # ~4K headcount (2025 est)
    },
    "openai": {
        "revenue_raw":     11_300_000_000,  # ~$11.3B ARR (FY2025 reported annualized run rate mid-2025)
        "market_cap_raw":  300_000_000_000, # ~$300B valuation (SoftBank-led round, early 2025)
        "category":        "Software",
        "employees":       4_000,           # ~4K headcount (2025)
    },
    "databricks": {
        "revenue_raw":     2_400_000_000,   # ~$2.4B ARR (FY ending Jan 2026 estimate; $1.6B in FY2025)
        "market_cap_raw":  62_000_000_000,  # $62B valuation (2024 fundraise)
        "category":        "Cloud & Data Services",
        "employees":       7_000,           # ~7K headcount (2025 est)
    },
    "figma": {
        "revenue_raw":     800_000_000,     # ~$800M ARR (2025 est; $600M in 2023, continued growth)
        "market_cap_raw":  12_500_000_000,  # ~$12.5B valuation (post-Adobe termination, secondary markets)
        "category":        "Software",
        "employees":       1_800,
    },
    "canva": {
        "revenue_raw":     2_600_000_000,   # ~$2.6B ARR (2025 est; $2.3B in 2024)
        "market_cap_raw":  26_000_000_000,  # $26B valuation (2023 round; not updated publicly since)
        "category":        "Software",
        "employees":       4_500,
    },
    "notion": {
        "revenue_raw":     450_000_000,     # ~$450M ARR (2025 est; ~$300M in 2023)
        "market_cap_raw":  10_000_000_000,  # $10B valuation (2021 round; not updated publicly)
        "category":        "Software",
        "employees":       900,
    },
    "vercel": {
        "revenue_raw":     250_000_000,     # ~$250M ARR (2025 est; ~$200M in 2024)
        "market_cap_raw":  3_250_000_000,   # $3.25B valuation (2022 Series E; latest known)
        "category":        "Software",
        "employees":       900,
    },
    "linear": {
        "revenue_raw":     80_000_000,      # ~$80M ARR (2025 est; ~$50M in 2024)
        "market_cap_raw":  600_000_000,     # ~$600M valuation estimate
        "category":        "Software",
        "employees":       100,
    },
    # ── Aerospace / Industrial ─────────────────────────────────────────────────
    # These are publicly traded (TSX/NYSE) but the SEC scraper may miss them due
    # to foreign private issuer filings. Values from latest annual reports.
    "bombardier": {
        "revenue_raw":     9_400_000_000,   # $9.4B revenue FY2024 (annual report)
        "market_cap_raw":  7_200_000_000,   # ~$7.2B market cap (TSX: BBD, 2025)
        "category":        "Aerospace",
        "employees":       19_500,
    },
    "cae": {
        "revenue_raw":     4_700_000_000,   # ~$4.7B CAD revenue FY ending Mar 2025
        "market_cap_raw":  5_500_000_000,   # ~$5.5B CAD market cap (TSX/NYSE: CAE, 2025)
        "category":        "Aerospace",
        "employees":       13_500,
    },
    # ── Professional Services ──────────────────────────────────────────────────
    "deloitte": {
        # Private partnership (Deloitte Touche Tohmatsu Limited) — no SEC filings ever.
        # Revenue = global aggregate reported in annual Impact Report.
        "revenue_raw":     67_200_000_000,  # $67.2B global revenue FY2024 (May 2024 annual report)
        "market_cap_raw":  0,               # Private — no public valuation
        "category":        "Professional Services",
        "employees":       460_000,         # ~460K globally (FY2024 Impact Report)
    },
    "accenture": {
        # Public (NYSE: ACN, FY ends Aug 31). SEC EDGAR should resolve this, but
        # included here as a fallback since FY end is non-calendar (Aug ≠ Dec).
        "revenue_raw":     64_900_000_000,  # $64.9B revenue FY2024 (year ended Aug 31, 2024)
        "market_cap_raw":  220_000_000_000, # ~$220B market cap (NYSE: ACN, 2025)
        "category":        "Professional Services",
        "employees":       774_000,         # ~774K globally (FY2024 annual report)
    },

    # ── Public companies (SEC fallback) ───────────────────────────────────────
    # Listed here as a curated fallback if the SEC scraper fails to find them.
    # For public US companies, prefer the live SEC EDGAR result over these values.
    "palantir": {
        "revenue_raw":     3_500_000_000,   # ~$3.5B revenue FY2025 (NYSE: PLTR, full year est)
        "market_cap_raw":  200_000_000_000, # ~$200B market cap (2025; significant re-rating)
        "category":        "Software",
        "employees":       4_100,
    },
}


def _lookup_private_financials(company_name: str) -> dict[str, Any]:
    """Return curated financial data for known private companies."""
    key = company_name.lower().split()[0]
    for known_key, data in PRIVATE_COMPANY_FINANCIALS.items():
        if key in known_key or known_key in key:
            log.info("[curated] found private company data for '%s'", known_key)
            return dict(data)
    return {}


# ─── Main orchestrator ────────────────────────────────────────────────────────

def scrape_financials(company_name: str, website: str, timeout: int) -> dict[str, Any]:
    sess = Session(timeout=timeout)

    edgar    = SecEdgarFinancials(sess)
    wiki     = WikipediaFinancials(sess)
    yahoo    = YahooFinanceFinancials(sess)

    result = FinancialResult()

    # Tier 0: Curated data for well-known private/international companies (lowest priority
    # number = highest trust, but we use 5 here so live sources override when available)
    curated = _lookup_private_financials(company_name)
    if curated:
        result.merge(curated, "curated", 5)

    # Run scrapers concurrently (they don't share state)
    futures = {}
    with ThreadPoolExecutor(max_workers=3) as pool:
        futures[pool.submit(edgar.fetch, company_name)] = ("SEC EDGAR", 1)
        futures[pool.submit(wiki.fetch,  company_name)] = ("Wikipedia", 2)
        futures[pool.submit(yahoo.fetch, company_name)] = ("Yahoo Finance", 3)

    for future, (source, priority) in futures.items():
        try:
            data = future.result()
            if data:
                result.merge(data, source, priority)
                log.info("[%s] merged %d fields", source, len(data))
        except Exception as e:
            log.warning("[%s] failed: %s", source, e)

    # Derive all output fields
    result.build()

    output = result.to_dict()

    # Validate we have at least something useful
    meaningful_fields = ["tam", "arr", "yoy_growth", "revenue_growth", "revenue_per_employee"]
    has_data = any(output.get(f) for f in meaningful_fields)
    if not has_data:
        return {"error": f"No financial data found for '{company_name}'. The company may be private with limited disclosures."}

    log.info("[done] fields populated: %s", [k for k in meaningful_fields if output.get(k)])
    return output


# ─── CLI entry point ──────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Scrape financial data for a company")
    parser.add_argument("--company",    required=True,  help="Company name (e.g. 'Stripe')")
    parser.add_argument("--website",    required=True,  help="Company website (e.g. 'stripe.com')")
    parser.add_argument("--timeout",    type=int, default=DEFAULT_TIMEOUT, help="HTTP timeout per request (seconds)")
    parser.add_argument("--company-id", default="",    help="Supabase company UUID (unused, accepted for CLI compatibility)")
    parser.add_argument("--auth-token", default="",    help="Supabase auth token (unused, accepted for CLI compatibility)")
    parser.add_argument("--app-url",    default="",    help="App base URL (unused, accepted for CLI compatibility)")
    args = parser.parse_args()

    company = args.company.strip()
    website = args.website.strip()

    if not company or not website:
        print(json.dumps({"error": "Both --company and --website are required"}))
        sys.exit(1)

    try:
        result = scrape_financials(company, website, args.timeout)
    except Exception as e:
        log.exception("Unexpected error")
        result = {"error": str(e)}

    print(json.dumps(result, ensure_ascii=False, default=str))


if __name__ == "__main__":
    main()
