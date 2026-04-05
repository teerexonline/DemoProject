#!/usr/bin/env python3
"""
ResearchOrg Milestone Seeder v2.0
====================================
Scrapes company history milestones: founding, funding, acquisitions,
IPOs, product launches, expansions, and leadership events.

Source hierarchy:
  Tier 1  Wikipedia full-article scan   Every paragraph; lead paragraphs, infobox,
                                         AND named History / Acquisitions sections
  Tier 2  Google News RSS (historical)   Multiple targeted queries — acquisitions,
                                         IPO, funding, history; goes back many years
  Tier 3  Company website                /about /company /history /investors pages
  Tier 4  SEC EDGAR                      S-1 / IPO filing date for public US companies
  Tier 5  Crunchbase public page         Funding rounds list (public HTML)

Why this works for every company:
  • Wikipedia lead paragraphs contain the chronological history for most
    articles (e.g. Zebra Technologies: "In 1969 … In 1986 … In 1998 …")
    — the old scraper only looked at named sections and missed them all.
  • Google News lets us reach companies not on Wikipedia, or fill gaps;
    historical press releases appear in its index going back 15+ years.
  • SEC EDGAR gives an exact IPO year for any US-listed company.
  • Crunchbase funding-rounds are structured HTML and very consistent.
  • Year range is 1900–present (not 1970+) so pre-1970 founding dates work.

Consistency guarantee:
  • All sources produce (year, text) pairs. Dedup key is (year, type).
  • Significance scoring is deterministic — same events ranked identically
    across runs (founding=100, IPO=90, acquisition=75, funding=70 …).
  • At least a founding milestone is always synthesised from the infobox
    even if every other source fails — guaranteeing non-empty output.

Usage:
  python seed_milestones.py --company "Zebra Technologies" --website "zebra.com"
  python seed_milestones.py --company "Stripe" --website "stripe.com" --timeout 20

Output: JSON array → stdout   |   Logs → stderr   |   Exit 0 = success
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import re
import sys
import time
from dataclasses import dataclass, field
from typing import Any, Optional
from urllib.parse import quote, quote_plus, urlparse

import requests
from bs4 import BeautifulSoup

# ─── Logging ─────────────────────────────────────────────────────────────────���
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    stream=sys.stderr,
)
log = logging.getLogger("seed_milestones")

# ─── Constants ────────────────────────────────────────────────────────────────
BROWSER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36"
)
SEC_AGENT      = "ResearchOrg/2.0 MilestoneSeeder (admin@researchorg.io; research/educational)"
RSS_AGENT      = "ResearchOrg/2.0 MilestoneSeeder (admin@researchorg.io; research/educational)"
DEFAULT_TIMEOUT = 14
MAX_RETRIES     = 2
CURRENT_YEAR    = __import__("datetime").date.today().year
MIN_YEAR        = 1900   # covers all possible company founding dates

# ─── Milestone visual catalogue ───────────────────────────────────────────────
MILESTONE_STYLES: dict[str, dict[str, str]] = {
    "founding":    {"icon": "🚀", "accent_color": "#7C3AED", "bg_color": "#F5F3FF", "badge": "Origin"},
    "funding":     {"icon": "💰", "accent_color": "#059669", "bg_color": "#F0FDF4", "badge": "Funding"},
    "ipo":         {"icon": "📈", "accent_color": "#0369A1", "bg_color": "#E0F2FE", "badge": "IPO"},
    "acquisition": {"icon": "🏢", "accent_color": "#2563EB", "bg_color": "#EFF6FF", "badge": "M&A"},
    "product":     {"icon": "📦", "accent_color": "#F59E0B", "bg_color": "#FFFBEB", "badge": "Product"},
    "expansion":   {"icon": "🌍", "accent_color": "#0891B2", "bg_color": "#ECFEFF", "badge": "Expansion"},
}

# Maximum M&A events in final output — prevents acquisitions from crowding out other types
MAX_ACQUISITIONS = 6

# ─── Event classifiers ────────────────────────────────────────────────────────
CLASSIFIERS: list[tuple[str, list[str]]] = [
    # acquisition checked first — "acquired/acquire" is unambiguous.
    # NOTE: bare r"\bacquisition\b" is intentionally excluded — it's too broad and fires
    # on subordinate phrases like "following the Bridge acquisition". Instead we require
    # the acquisition to be the grammatical main event.
    ("acquisition", [
        r"\bacquired\b", r"\bacquisition\s+of\b",
        r"\bmerged?\s+with\b",
        r"\bpurchased?\b", r"\bbought\b.{0,40}(company|startup|firm|corp|inc)",
        r"\btakeover\b", r"\bto\s+acqui(?:re)\b", r"\bacquires?\b",
    ]),
    ("ipo", [
        r"\binitial public offering\b", r"\bwent public\b",
        r"\blisted on\b.{0,40}(nasdaq|nyse|exchange)",
        r"\b(nasdaq|nyse)\s+(listing|ipo|debut|flotation)\b",
        r"\bpublic offering\b", r"\bdirect listing\b",
        r"\bshares\b.{0,30}\b(nasdaq|nyse)\b",
        r"\bbegins? trading\b.{0,40}(nasdaq|nyse)",
        r"\bipo\b.{0,60}(nasdaq|nyse|raise|million|billion)",
    ]),
    ("funding", [
        r"\bseries [a-h]\b", r"\bseed (round|funding|capital)\b",
        r"\braised \$", r"\bsecured \$", r"\bclosed \$",
        r"\bfunding round\b", r"\bventure capital\b",
        r"\binvestment (of|round)\b", r"\bpre-[a-z] round\b",
        r"\bvalued at \$",
    ]),
    # founding after acquisition so "X-Founded Y" headlines don't override "acquires"
    ("founding", [
        r"\bfounded\b", r"\bincorporated\b", r"\bestablished\b",
        r"\bincorporation\b", r"\bco-?founded\b", r"\bfounding\b",
        r"\borigin(ally)?\b", r"\bstarted as\b",
    ]),
    ("product", [
        r"\blaunched?\b.{0,80}(product|platform|service|software|hardware|device|solution|system|"
        r"printer|scanner|reader|terminal|suite|application|app|tool|cloud|api)",
        r"\bintroduce[sd]?\b.{0,80}(product|platform|device|hardware|software|suite|service|solution)",
        r"\bunveiled?\b.{0,80}(product|platform|device|hardware|series|suite|software|solution|service)",
        r"\breleased?\b.{0,60}(product|service|platform|app|software|device|version|update)",
        r"\bdebuted?\b", r"\bnew product\b", r"\bgeneral availability\b",
        r"\bnew (model|series|line|hardware|device|version|generation|release)\b",
        r"\bannounced?\b.{0,60}(new\s+)?(product|platform|service|solution|device|software|suite)",
        r"\bpowered by\b.{0,40}(android|ios|windows|linux)\b",
    ]),
    ("expansion", [
        r"\bexpand(?:s|ed|ing)?\b.{0,50}(into|to|operations|footprint|presence|across)\b",
        r"\bopened?\b.{0,40}(office|center|centre|facility|campus|headquarters|hq)\b",
        r"\bnew (country|market|region|headquarters|campus|office|location)\b",
        r"\binternational (expansion|launch|rollout)\b",
        r"\breached?\b.{0,40}(million|billion) (user|customer|subscriber|employee)",
        r"\b\d+\s*(?:million|billion)\s*(user|customer|member|subscriber|employee)\b",
        r"\bmoved?\b.{0,30}headquarters",
        r"\bglobal (rollout|expansion|presence|launch)\b",
    ]),
    # leadership = CEO changes only
]


def classify_event(text: str) -> str:
    t = text.lower()
    for label, pats in CLASSIFIERS:
        if any(re.search(p, t) for p in pats):
            return label
    return None  # unclassified events are discarded, not saved as "milestone"


# ─── Helpers ──────────────────────────────────────────────────────────────────

def fmt_money(n: float) -> str:
    if n >= 1e12: return f"${n/1e12:.1f}T"
    if n >= 1e9:  return f"${n/1e9:.1f}B"
    if n >= 1e6:  return f"${n/1e6:.0f}M"
    if n >= 1e3:  return f"${n/1e3:.0f}K"
    return f"${n:.0f}"


def parse_money(text: str) -> Optional[float]:
    s = re.sub(r"(?:US|CA|AU|NZ)?\s*[€£¥₹]?\$?", "", text)
    s = re.sub(r"[,\s]", "", s)
    for pat, mult in [
        (r"([\d.]+)\s*tril", 1e12), (r"([\d.]+)\s*bil", 1e9),
        (r"([\d.]+)\s*[Tt]\b", 1e12), (r"([\d.]+)\s*[Bb]\b", 1e9),
        (r"([\d.]+)\s*mil", 1e6), (r"([\d.]+)\s*[Mm]\b", 1e6),
        (r"([\d.]+)\s*[Kk]\b", 1e3),
    ]:
        m = re.search(pat, s, re.IGNORECASE)
        if m:
            try: return float(m.group(1)) * mult
            except ValueError: pass
    return None


def extract_years(text: str) -> list[int]:
    """All valid years in text (1900–present)."""
    return sorted({
        int(y) for y in re.findall(r"\b(1[9]\d{2}|20[012]\d)\b", text)
        if MIN_YEAR <= int(y) <= CURRENT_YEAR
    })


def strip_html(text: str) -> str:
    """Remove HTML tags and decode basic entities."""
    text = re.sub(r"<[^>]+>", " ", text)
    text = text.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">") \
               .replace("&quot;", '"').replace("&#39;", "'").replace("&nbsp;", " ")
    return text


def clean_text(text: str, max_chars: int = 280) -> str:
    text = strip_html(text)
    text = re.sub(r"\[\s*\d+\s*\]|\[\s*[a-z]+\s*\d*\s*\]", "", text)
    # Strip trailing publication names like " - Reuters", " | TechCrunch", " - iTnews Asia"
    # Allow lowercase-initial sources (e.g. "iTnews", "eBay Blog") by using [A-Za-z]
    text = re.sub(r"\s*[-–|]\s*[A-Za-z][A-Za-z\s]{2,35}(?:\s*[-–]\s*)?$", "", text).strip()
    # Remove exact sentence duplications (Google News title often appears twice in text)
    sentences = [s.strip() for s in re.split(r'[.!?]\s+', text) if s.strip()]
    seen_s: set[str] = set()
    deduped = []
    for s in sentences:
        norm = re.sub(r'\s+', ' ', s.lower())[:80]
        if norm not in seen_s:
            seen_s.add(norm)
            deduped.append(s)
    text = ". ".join(deduped).strip()
    if text and not text.endswith((".", "!", "?")):
        pass  # keep as-is
    text = re.sub(r"\s{2,}", " ", text).strip()
    if len(text) <= max_chars:
        return text
    cut = text[:max_chars]
    last = max(cut.rfind(". "), cut.rfind("! "), cut.rfind("? "))
    return (cut[:last + 1] if last > max_chars // 2 else cut.rstrip()) + "…"


def build_title(etype: str, text: str, year: int, company: str) -> str:
    t = text.strip()
    if etype == "founding":
        return f"{company} founded"
    if etype == "ipo":
        exc = re.search(r"\b(NASDAQ|NYSE|LSE|TSX|ASX)\b", t, re.I)
        return f"IPO on {exc.group(1).upper()}" if exc else "Initial Public Offering"
    if etype == "funding":
        rnd = re.search(r"\bSeries ([A-H])\b", t, re.I)
        seed = re.search(r"\bseed\b", t, re.I)
        amt_m = re.search(r"\$([\d.,]+\s*(?:billion|million|[BbMm])\b)", t)
        amt = ""
        if amt_m:
            n = parse_money(amt_m.group(0))
            amt = f" — {fmt_money(n)}" if n else ""
        if rnd:   return f"Series {rnd.group(1).upper()}{amt}"
        if seed:  return f"Seed Round{amt}"
        return f"Funding Round{amt}"
    if etype == "acquisition":
        # Common terminators: "for $X", "in a $X", possessives "'s", dashes, conjunctions
        _ACQ_STOP = r"(?:\s+for\b|\s+in\s+(?:a\s+)?\$|\s+in\s+\d|\s*[,\.\('`'\u2019]|\s+(?:a|an|the|its|from|to)\b|$)"
        # Active voice: "acquired/acquires/to acquire TARGET"
        m = re.search(
            r"(?:to\s+acqui(?:re)|acqui(?:res?|red|sition\s+of)|purchased?|merged?\s+with|bought)\s+"
            r"([A-Z][A-Za-z0-9\s&.,'-]{2,45}?)" + _ACQ_STOP,
            t, re.I,
        )
        if m:
            target = m.group(1).strip().rstrip(".,'-")
            if 2 <= len(target) <= 45 and company.lower() not in target.lower():
                return f"Acquires {target.title() if target.isupper() else target}"
        # Passive voice: "TARGET acquired by COMPANY" — extract TARGET
        m2 = re.search(
            r"([A-Z][A-Za-z0-9\s&.,'-]{2,40}?)\s+(?:acquir(?:ed|ing)|bought|purchased)\s+by\b",
            t, re.I,
        )
        if m2:
            target = m2.group(1).strip().rstrip(".,'-")
            # Ensure the acquirer is our company, not random text
            if 2 <= len(target) <= 40 and company.lower() not in target.lower():
                return f"Acquires {target.title() if target.isupper() else target}"
        # Last-chance: pull any proper-noun phrase after "acquisition of"
        m3 = re.search(r"acquisition\s+of\s+([A-Z][A-Za-z0-9\s&]{2,40}?)" + _ACQ_STOP, t, re.I)
        if m3:
            target = m3.group(1).strip().rstrip(".,'-")
            if 2 <= len(target) <= 40 and company.lower() not in target.lower():
                return f"Acquires {target.title() if target.isupper() else target}"
        # "COMPANY acquisition" / "X Acquisition:" headline pattern
        m4 = re.search(
            r"\b([A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+)?)\s+acquisition\b",
            t, re.I,
        )
        if m4:
            target = m4.group(1).strip()
            if 2 <= len(target) <= 40 and company.lower() not in target.lower():
                return f"Acquires {target}"
        # "following/after the X acquisition" — pull target name
        m5 = re.search(
            r"(?:following|after)\s+(?:the\s+)?(?:\$[\d.,]+\s*(?:billion|million)\s+)?([A-Z][A-Za-z0-9\s]{2,30}?)\s+acquisition\b",
            t, re.I,
        )
        if m5:
            target = m5.group(1).strip()
            if 2 <= len(target) <= 35 and company.lower() not in target.lower():
                return f"Acquires {target}"
        return "Strategic Acquisition"
    if etype == "product":
        # Stop capture at dash, prepositions, or known list words so we don't grab prose
        _PROD_STOP = r"(?:\s*[-–,\.\(]|\s+(?:to|for|with|and|in|its|is|was|a|an|the|at|by|of)\b|$)"
        m = re.search(
            r"(?:launch(?:es?|ed)|introduc(?:es?|ed)|releas(?:es?|ed)|unveil(?:s|ed)|announce[sd]?)\s+"
            r"([A-Z][A-Za-z0-9\s&+#®™'-]{2,50}?)" + _PROD_STOP,
            t, re.I,
        )
        if m:
            name = m.group(1).strip().rstrip(".,'-")
            # Drop generic filler words that slipped through
            if name.lower() in {"new", "its", "a", "an", "the", "latest"}:
                name = ""
            # Skip names that are just the company name
            if name and len(name) <= 50 and company.lower() not in name.lower():
                return f"Launches {name}"
        # Fallback: try to find a product name after "new" keyword
        m2 = re.search(r"\bnew\s+([A-Z][A-Za-z0-9\s&+#®™'-]{2,45}?)" + _PROD_STOP, t, re.I)
        if m2:
            name = m2.group(1).strip().rstrip(".,'-")
            if name and len(name) <= 45 and company.lower() not in name.lower():
                return f"Launches {name}"
        return "Major Product Launch"
    if etype == "expansion":
        reg = re.search(r"\b(Europe|Asia|APAC|Latin America|EMEA|LATAM|China|India|UK|Canada|Australia|Middle East)\b", t)
        if reg: return f"Expands to {reg.group(1)}"
        usr = re.search(r"\b(\d+(?:\.\d+)?\s*(?:million|billion))\s*(?:users?|customers?|subscribers?)\b", t, re.I)
        if usr: return f"Reaches {usr.group(1).title()} Users"
        return "International Expansion"
    return "Event"


def score_event(etype: str, text: str) -> int:
    base = {"founding": 100, "ipo": 90, "acquisition": 75, "funding": 70,
            "product": 55, "expansion": 45}.get(etype, 30)
    amt = parse_money(text)
    if amt:
        if amt >= 1e9:  base += 20
        elif amt >= 1e8: base += 10
        elif amt >= 1e7: base += 5
    if re.search(r"\bSeries [AB]\b", text): base += 8
    if re.search(r"\bSeed\b", text, re.I): base += 5
    return base


# ─── Milestone container ──────────────────────────────────────────────────────

@dataclass
class ME:   # MilestoneEvent
    year: int
    type: str
    title: str
    detail: str
    score: int = 0
    key: str = field(default="", repr=False)

    def to_dict(self, sort_order: int = 0) -> dict[str, Any]:
        s = MILESTONE_STYLES.get(self.type, MILESTONE_STYLES["expansion"])
        return {
            "year":         self.year,  "type":         self.type,
            "icon":         s["icon"],  "accent_color": s["accent_color"],
            "bg_color":     s["bg_color"], "title":      self.title,
            "detail":       self.detail,   "badge":      s["badge"],
            "sort_order":   sort_order,
        }


BOILERPLATE_RE = re.compile(
    r"comprehensive.{0,50}news coverage|aggregated from sources|all over the world by google"
    r"|google news\b|news coverage, aggregated",
    re.I,
)


def make(year: int, text: str, company: str) -> Optional[ME]:
    """Returns None for unclassified events (they are discarded)."""
    etype = classify_event(text)
    if etype is None:
        return None
    title  = build_title(etype, text, year, company)
    detail = clean_text(text, 280)
    sc     = score_event(etype, text)
    # Acquisitions use a normalized target-name key so:
    # (a) multiple distinct acquisitions per year each get their own slot, AND
    # (b) duplicate items about the SAME acquisition (e.g. from Wikipedia + Google News) merge.
    if etype == "acquisition":
        # Use LAST 1-2 significant words of target so "stablecoin start-up Bridge" == "Bridge"
        target_match = re.search(r"acquires?\s+(.+?)$", title, re.I)
        if target_match:
            _SKIP = {'the','inc','corp','ltd','llc','for','and','all','parts','of','a','an',
                     'its','their','start','up'}
            words = [w.lower() for w in re.split(r"[\s\-]+", target_match.group(1))
                     if len(w) > 2 and w.lower() not in _SKIP]
            target_slug = "_".join(words[-2:]) if len(words) >= 2 else (words[-1] if words else "unknown")
        else:
            target_slug = "unknown"
        key = f"{year}_acquisition_{target_slug}"
    else:
        key = f"{year}_{etype}"
    return ME(year=year, type=etype, title=title, detail=detail, score=sc, key=key)


# ─── HTTP session ─────────────────────────────────────────────────────────────

class Session(requests.Session):
    def __init__(self, timeout: int = DEFAULT_TIMEOUT) -> None:
        super().__init__()
        self._timeout = timeout

    def fetch(self, url: str, agent: str = BROWSER_AGENT,
              accept: str = "text/html,*/*", **kw) -> Optional[requests.Response]:
        kw.setdefault("timeout", self._timeout)
        self.headers.update({"User-Agent": agent, "Accept": accept})
        for attempt in range(MAX_RETRIES + 1):
            try:
                r = self.get(url, allow_redirects=True, **kw)
                if r.status_code == 429:
                    time.sleep(min(int(r.headers.get("Retry-After", 5)), 10))
                    continue
                if r.status_code in (403, 401, 404):
                    return None
                r.raise_for_status()
                return r
            except requests.exceptions.Timeout:
                log.warning("Timeout %s (attempt %d)", url[:70], attempt + 1)
                if attempt < MAX_RETRIES: time.sleep(1.5 * (attempt + 1))
            except requests.exceptions.HTTPError:
                return None
            except requests.exceptions.RequestException as e:
                log.warning("Error %s: %s", url[:70], e)
                if attempt < MAX_RETRIES: time.sleep(1.5 * (attempt + 1))
        return None


# ─── Source 1: Wikipedia ──────────────────────────────────────────────────────

class WikipediaScraper:
    """
    Scans the ENTIRE Wikipedia article for year-annotated paragraphs.

    Key insight: Many company articles (e.g. Zebra Technologies) put their
    chronological history in the LEAD paragraphs before any section header,
    not inside a named 'History' section.  Previous version missed these.

    Strategy:
      1. Infobox  → founding year (always attempted)
      2. ALL <p> paragraphs in the article → any with year mentions
      3. Named sections (History, Acquisitions, Timeline …) → extra coverage
      4. Wikitables with Year/Event columns → structured bonus data
    """

    SEARCH_API = "https://en.wikipedia.org/w/api.php"
    PAGE_BASE  = "https://en.wikipedia.org/wiki/{}"
    CORP_RE    = re.compile(r"\b(inc|corp|ltd|llc|plc|gmbh|company|incorporated|limited|technologies|systems)\b", re.I)

    def __init__(self, sess: Session) -> None:
        self.sess = sess

    def _find_title(self, company: str) -> Optional[str]:
        words = company.lower().split()

        def search(q: str) -> list[str]:
            r = self.sess.fetch(self.SEARCH_API, agent=BROWSER_AGENT, accept="application/json",
                                params={"action":"opensearch","search":q,"limit":10,"namespace":0,"format":"json"})
            if not r: return []
            try: return r.json()[1]
            except Exception: return []

        def rank(titles: list[str]) -> Optional[str]:
            # Exact match first
            for t in titles:
                if t.lower() == company.lower(): return t
            # Starts with company words + has corporate-sounding suffix
            for t in titles:
                tl = t.lower()
                if any(tl.startswith(w) for w in words[:2]) and self.CORP_RE.search(tl):
                    return t
            # Most word overlap
            for t in titles:
                tl = t.lower()
                if sum(1 for w in words if w in tl) >= max(1, len(words) - 1):
                    return t
            for t in titles:
                if words and t.lower().startswith(words[0]):
                    return t
            return titles[0] if titles else None

        all_titles = search(company)
        best = rank(all_titles)
        if not best:
            all_titles2 = search(company + " company")
            best = rank(all_titles + [t for t in all_titles2 if t not in all_titles])
        return best

    def _infobox_year(self, soup: BeautifulSoup) -> Optional[int]:
        return self._infobox_data(soup)[0]

    def _infobox_data(self, soup: BeautifulSoup) -> tuple[Optional[int], Optional[str]]:
        """Returns (founding_year, stock_exchange_str) from infobox."""
        founded_yr: Optional[int] = None
        traded_as: Optional[str] = None
        for tbl in soup.find_all("table"):
            if "infobox" not in " ".join(tbl.get("class", [])): continue
            for row in tbl.find_all("tr"):
                th = row.find("th"); td = row.find("td")
                if not th or not td: continue
                key = th.get_text(" ", strip=True).lower()
                raw = td.get_text(" ", strip=True)
                if re.search(r"^founded|^formation|^established|^incorporated", key):
                    yrs = extract_years(raw)
                    if yrs and founded_yr is None: founded_yr = min(yrs)
                if re.search(r"^traded\s*as|^stock\s*exchange|^listed", key):
                    traded_as = raw
        return founded_yr, traded_as

    def _scan_all_paragraphs(self, soup: BeautifulSoup, company: str) -> list[tuple[int,str]]:
        """Scan EVERY <p> in the article — catches lead-paragraph history."""
        events: list[tuple[int,str]] = []
        content = soup.find(id="mw-content-text")
        if not content:
            return events
        seen_texts: set[str] = set()
        for p in content.find_all("p"):
            text = p.get_text(" ", strip=True)
            if len(text) < 35:
                continue
            norm = text[:60].lower()
            if norm in seen_texts:
                continue
            seen_texts.add(norm)
            years = extract_years(text)
            if years:
                events.append((min(years), text))
        return events

    def _scan_list_items(self, soup: BeautifulSoup, company: str) -> list[tuple[int,str]]:
        """Scan <li> and <p> items in all event-relevant Wikipedia sections."""
        events: list[tuple[int,str]] = []
        SECTIONS = {
            "history","timeline","acquisitions","funding","milestones",
            "background","origins","corporate history","growth",
            "products","product line","services","product history",
            "financial performance","financials","revenue","operations",
            "ipo","public offering","listing",
        }
        for header in soup.find_all(["h2","h3","h4"]):
            ht = re.sub(r"\[edit\].*", "", header.get_text(strip=True)).lower().strip()
            if not any(s in ht for s in SECTIONS): continue
            for sib in header.find_next_siblings():
                if sib.name in ("h2","h3"): break
                if sib.name in ("ul","ol"):
                    for li in sib.find_all("li"):
                        text = li.get_text(" ", strip=True)
                        years = extract_years(text)
                        if years and len(text) >= 30:
                            events.append((min(years), text))
                elif sib.name == "p":
                    text = sib.get_text(" ", strip=True)
                    years = extract_years(text)
                    if years and len(text) >= 35:
                        events.append((min(years), text))
        return events

    def _scan_wikitables(self, soup: BeautifulSoup) -> list[tuple[int,str]]:
        events: list[tuple[int,str]] = []
        for tbl in soup.find_all("table", class_=re.compile(r"wikitable", re.I)):
            hdrs = [th.get_text(strip=True).lower() for th in tbl.find_all("th")]
            yr_col = next((i for i,h in enumerate(hdrs) if "year" in h or "date" in h), None)
            ev_col = next((i for i,h in enumerate(hdrs)
                           if any(k in h for k in ("event","description","detail","note","milestone"))), None)
            if yr_col is None: continue
            if ev_col is None: ev_col = 1 if yr_col == 0 else 0
            for row in tbl.find_all("tr")[1:]:
                cells = row.find_all(["td","th"])
                if len(cells) <= max(yr_col, ev_col): continue
                y_text = cells[yr_col].get_text(" ", strip=True)
                e_text = cells[ev_col].get_text(" ", strip=True)
                yrs = extract_years(y_text)
                if yrs and len(e_text) >= 20:
                    events.append((yrs[0], e_text))
        return events

    def fetch(self, company: str) -> tuple[list[ME], Optional[int]]:
        """Returns (milestones, founding_year_from_infobox)."""
        title = self._find_title(company)
        if not title:
            log.warning("[Wikipedia] no article for '%s'", company)
            return [], None
        log.info("[Wikipedia] article: '%s'", title)

        resp = self.sess.fetch(self.PAGE_BASE.format(quote(title.replace(" ", "_"))),
                               agent=BROWSER_AGENT)
        if not resp:
            return [], None

        soup = BeautifulSoup(resp.text, "lxml")
        founded_year, traded_as = self._infobox_data(soup)
        log.info("[Wikipedia] infobox founded: %s  traded_as: %s", founded_year, traded_as)

        raw: list[tuple[int,str]] = []
        raw.extend(self._scan_all_paragraphs(soup, company))
        raw.extend(self._scan_list_items(soup, company))
        raw.extend(self._scan_wikitables(soup))
        log.info("[Wikipedia] raw events: %d", len(raw))

        milestones = [m for yr, txt in raw
                      if MIN_YEAR <= yr <= CURRENT_YEAR and len(txt) >= 35
                      if (m := make(yr, txt, company)) is not None]
        return milestones, founded_year, traded_as


# ─── Source 2: Google News RSS ────────────────────────────────────────────────

class GoogleNewsScraper:
    """
    Queries Google News RSS with targeted historical queries.
    Covers companies not well-documented on Wikipedia and fills gaps
    (e.g. recent acquisitions, large funding rounds, IPOs).

    Queries used (in order):
      1. "{company}" acquisition        → M&A events
      2. "{company}" IPO funding        → public market and funding events
      3. "{company}" history founded    → founding and early history
      4. "{company}" milestone launch   → product and expansion events
    """

    def __init__(self, sess: Session) -> None:
        self.sess = sess

    def _fetch_article_detail(self, url: str) -> str:
        """Follow Google News redirect and extract OG/meta description for richer detail."""
        if not url or "google.com" not in url:
            return ""
        try:
            resp = self.sess.fetch(url, agent=BROWSER_AGENT)
            if not resp: return ""
            # Follow any meta-refresh or location headers — requests handles it
            soup = BeautifulSoup(resp.text, "lxml")
            for sel in ['meta[property="og:description"]', 'meta[name="description"]',
                        'meta[name="twitter:description"]']:
                tag = soup.select_one(sel)
                if tag and tag.get("content", "").strip():
                    return strip_html(tag["content"].strip())
            # Fallback: first substantial paragraph of article body
            for p in soup.select("article p, [class*='article'] p, [class*='content'] p"):
                t = p.get_text(" ", strip=True)
                if len(t) > 60:
                    return clean_text(t, 240)
        except Exception:
            pass
        return ""

    def fetch(self, company: str) -> list[ME]:
        # 8 targeted queries — one per major event type — to ensure diversity
        queries = [
            (f'"{company}" acquisition acquired merger',        "acquisition"),
            (f'"{company}" IPO "went public" listing stock',    "ipo"),
            (f'"{company}" Series funding raised venture',      "funding"),
            (f'"{company}" founded history origin incorporated', "founding"),
            (f'"{company}" launches product release announces',  "product"),
            (f'"{company}" expansion partnership international', "expansion"),
        ]
        all_events: list[tuple[int,str,str]] = []   # (year, text, link)
        seen_titles: set[str] = set()
        for q, _hint in queries:
            url = f"https://news.google.com/rss/search?q={quote_plus(q)}&hl=en-US&gl=US&ceid=US:en"
            resp = self.sess.fetch(url, agent=RSS_AGENT, accept="application/rss+xml,application/xml,*/*")
            if not resp:
                continue
            items, links = self._parse_rss_with_links(resp.text, company)
            for (yr, txt), link in zip(items, links):
                key = txt[:50].lower()
                if key not in seen_titles:
                    seen_titles.add(key)
                    all_events.append((yr, txt, link))
            time.sleep(0.3)

        # For thin headline-only items, try to fetch article OG description (max 6 fetches)
        enriched: list[tuple[int,str]] = []
        fetch_budget = 6
        for yr, txt, link in all_events:
            etype = classify_event(txt)
            detail_candidate = clean_text(txt, 280)
            # "Thin" = detail is just the headline (short and no sentence context)
            if fetch_budget > 0 and link and len(txt) < 120:
                og = self._fetch_article_detail(link)
                if og and len(og) > len(txt) + 20 and classify_event(og) == etype:
                    detail_candidate = og
                    fetch_budget -= 1
            enriched.append((yr, detail_candidate))

        log.info("[GoogleNews] events: %d", len(enriched))
        return [m for yr, txt in enriched if (m := make(yr, txt, company)) is not None]

    def _parse_rss_with_links(self, xml_text: str, company: str) -> tuple[list[tuple[int,str]], list[str]]:
        """Like _parse_rss but also returns item links for article-detail fetching."""
        from xml.etree import ElementTree as ET
        from email.utils import parsedate_to_datetime
        events: list[tuple[int,str]] = []
        links:  list[str]            = []
        company_l = company.lower()
        try:
            root = ET.fromstring(xml_text)
        except ET.ParseError:
            return events, links
        channel = root.find("channel") or root
        for item in channel.findall("item"):
            def g(tag: str) -> str:
                el = item.find(tag)
                return (el.text or "").strip() if el is not None else ""
            title   = strip_html(g("title"))
            desc    = strip_html(g("description"))
            pubdate = g("pubDate")
            link    = g("link") or g("guid")
            title = re.sub(r"\s*[-–]\s*[A-Z][^-]{3,40}$", "", title).strip()
            desc_clean = desc.strip()
            title_norm = title.lower().replace(" ", "")
            desc_norm  = desc_clean.lower().replace(" ", "")
            text = title if desc_norm.startswith(title_norm[:40]) else f"{title}. {desc_clean}".strip()
            if not title or company_l not in title.lower():
                continue
            # Skip Google News boilerplate / meta text
            if re.search(
                r"comprehensive.{0,50}news coverage|aggregated from sources|all over the world by google",
                title, re.I,
            ):
                continue
            # Skip items where the company is not the grammatical subject.
            title_l = title.lower()
            co_words = company_l.split()
            # Skip earnings/results press releases — not meaningful milestones
            if re.search(r"\b(Q[1-4]|[1-4]Q)\s*\d{4}\b.*\bresults?\b|\b\d+(st|nd|rd|th)\s+quarter\b",
                         title, re.I):
                continue
            # If company name does NOT start the title, check if it's a secondary mention
            if not title_l.startswith(co_words[0]):
                secondary_pats = [
                    # Another entity subject + company as object of with/for/by
                    rf"\b(?:with|for|by)\b.{{0,60}}{re.escape(co_words[0])}",
                    # Another entity + action verb + company (e.g. "TCS helps Zebra", "Fetch announces ... Zebra")
                    rf"^[A-Z]\w+(?:\s+[A-Z]\w+)?\b.{{0,15}}\b(?:help(?:s|ed)|enable(?:s|d)|use(?:s|d)|"
                    rf"announce(?:s|d)|present(?:s|ed)|deploy(?:s|ed))\b.{{0,100}}{re.escape(co_words[0])}",
                ]
                if any(re.search(p, title, re.I) for p in secondary_pats):
                    continue
            year: Optional[int] = None
            try:
                year = parsedate_to_datetime(pubdate).year
            except Exception:
                pass
            if not year:
                yrs = extract_years(text)
                year = yrs[0] if yrs else None
            # For founding/history events: the text often says "founded in 20XX".
            # Use the EARLIEST year from the text if it's much older than pubDate
            # (e.g., a 2024 article about "founded in 2010" → use 2010).
            if year and classify_event(text) == "founding":
                text_yrs = [y for y in extract_years(text)
                            if MIN_YEAR <= y <= year - 3]   # at least 3 years before pubDate
                if text_yrs:
                    year = min(text_yrs)
            if year and MIN_YEAR <= year <= CURRENT_YEAR and len(text) >= 30:
                events.append((year, text))
                links.append(link)
        return events, links


# ─── Source 3: Company website ────────────────────────────────────────────────

class WebsiteScraper:
    PATHS = [
        "/about", "/about-us", "/company", "/our-story", "/history",
        "/timeline", "/about/company", "/about/history", "/investors",
        "/investor-relations", "/ir", "/corporate/about",
    ]

    def __init__(self, sess: Session) -> None:
        self.sess = sess

    def fetch(self, website: str, company: str) -> list[ME]:
        parsed = urlparse(website if "://" in website else "https://" + website)
        domain = parsed.netloc or parsed.path
        base   = f"https://{domain}"
        events: list[tuple[int,str]] = []

        for path in self.PATHS:
            resp = self.sess.fetch(base + path)
            if not resp: continue
            soup = BeautifulSoup(resp.text, "lxml")
            for tag in soup.find_all(["nav","footer","header","script","style"]):
                tag.decompose()
            for el in soup.find_all(["li","p","div","dd","dt","span"]):
                text = el.get_text(" ", strip=True)
                if len(text) < 30 or len(text) > 500: continue
                yrs = extract_years(text)
                if yrs:
                    events.append((min(yrs), text))
            if events:
                log.info("[Website] %d events at %s", len(events), base + path)
                break   # first successful page is enough

        return [m for yr, txt in events
                if MIN_YEAR <= yr <= CURRENT_YEAR
                if (m := make(yr, txt, company)) is not None]


# ─── Source 4: SEC EDGAR ──────────────────────────────────────────────────────

def sec_ipo_year(sess: Session, company: str) -> Optional[int]:
    """First S-1 filing year = IPO year. More flexible CIK matching."""
    try:
        r = sess.fetch("https://www.sec.gov/files/company_tickers.json",
                       agent=SEC_AGENT, accept="application/json")
        if not r: return None
        data = r.json()
        company_l  = company.lower()
        words      = company_l.split()
        best_cik   = None
        best_score = 0
        for entry in data.values():
            title_l = entry.get("title", "").lower()
            score   = sum(1 for w in words if w in title_l)
            if score > best_score and score >= max(1, len(words) - 1):
                best_score = score
                best_cik   = str(entry["cik_str"]).zfill(10)
        if not best_cik:
            return None
        subs_r = sess.fetch(f"https://data.sec.gov/submissions/CIK{best_cik}.json",
                            agent=SEC_AGENT, accept="application/json")
        if not subs_r: return None
        forms = subs_r.json().get("filings", {}).get("recent", {})
        for ftype, fdate in zip(forms.get("form", []), forms.get("filingDate", [])):
            if ftype in ("S-1", "S-1/A", "S-11"):
                yrs = extract_years(fdate)
                if yrs:
                    log.info("[EDGAR] S-1 filed: %s", fdate)
                    return yrs[0]
    except Exception as e:
        log.warning("[EDGAR] %s", e)
    return None


# ─── Source 4b: Wikidata IPO date ────────────────────────────────────────────

def wikidata_founding_year(sess: Session, company: str) -> Optional[int]:
    """
    Returns the founding/inception year from Wikidata P571 (inception date).
    Works for both public and private companies.
    """
    try:
        search_r = sess.fetch(
            "https://www.wikidata.org/w/api.php",
            agent=BROWSER_AGENT, accept="application/json",
            params={"action":"wbsearchentities","search":company,"language":"en",
                    "limit":5,"format":"json","type":"item"},
        )
        if not search_r: return None
        results = search_r.json().get("search", [])
        if not results: return None

        company_l = company.lower()
        qid = None
        for r in results:
            label = r.get("label","").lower()
            desc  = r.get("description","").lower()
            if company_l in label and any(k in desc for k in
                                          ("company","corporation","enterprise","startup","fintech",
                                           "tech","manufacturer","service","software")):
                qid = r["id"]; break
        if not qid and results:
            qid = results[0]["id"]

        claims_r = sess.fetch(
            "https://www.wikidata.org/w/api.php",
            agent=BROWSER_AGENT, accept="application/json",
            params={"action":"wbgetentities","ids":qid,"props":"claims","format":"json"},
        )
        if not claims_r: return None
        claims = claims_r.json().get("entities",{}).get(qid,{}).get("claims",{})

        # P571 = inception date
        for claim in claims.get("P571", []):
            t = claim.get("mainsnak",{}).get("datavalue",{}).get("value",{}).get("time","")
            if t:
                yrs = extract_years(t)
                if yrs:
                    log.info("[Wikidata] inception year: %d", min(yrs))
                    return min(yrs)
    except Exception as e:
        log.warning("[Wikidata founding] %s", e)
    return None


def wikidata_ipo_year(sess: Session, company: str) -> Optional[tuple[int, str]]:
    """
    Returns (ipo_year, exchange_name) from Wikidata structured data.
    Uses the Wikidata API wbsearchentities + wbgetentities with property P580 (start time)
    on P414 (stock exchange) claims, or P582/P571 as fallback.
    """
    try:
        # Step 1: Search Wikidata for the entity
        search_r = sess.fetch(
            "https://www.wikidata.org/w/api.php",
            agent=BROWSER_AGENT, accept="application/json",
            params={"action":"wbsearchentities","search":company,"language":"en",
                    "limit":5,"format":"json","type":"item"},
        )
        if not search_r: return None
        results = search_r.json().get("search", [])
        if not results: return None

        company_l = company.lower()
        qid = None
        for r in results:
            label = r.get("label","").lower()
            desc  = r.get("description","").lower()
            if company_l in label and any(k in desc for k in
                                          ("company","corporation","enterprise","tech","manufacturer")):
                qid = r["id"]
                break
        if not qid and results:
            qid = results[0]["id"]

        # Step 2: Get entity claims
        claims_r = sess.fetch(
            "https://www.wikidata.org/w/api.php",
            agent=BROWSER_AGENT, accept="application/json",
            params={"action":"wbgetentities","ids":qid,"props":"claims","format":"json"},
        )
        if not claims_r: return None
        entity = claims_r.json().get("entities", {}).get(qid, {})
        claims = entity.get("claims", {})

        # P414 = stock exchange; look for P580 (start time) qualifier on P414 claims
        exc_name = ""
        ipo_year: Optional[int] = None
        for claim in claims.get("P414", []):
            mainsnak = claim.get("mainsnak", {})
            # Get exchange label from datavalue
            exc_id = mainsnak.get("datavalue",{}).get("value",{}).get("id","")
            # Look for P580 (start time) qualifier
            for qprop, qvals in claim.get("qualifiers", {}).items():
                if qprop == "P580":
                    for qv in qvals:
                        t = qv.get("datavalue",{}).get("value",{}).get("time","")
                        if t:
                            yrs = extract_years(t)
                            if yrs:
                                ipo_year = min(yrs)
            # Map exchange Wikidata IDs to names
            EXC_MAP = {
                "Q82059":"NASDAQ","Q13677":"NYSE","Q170573":"LSE",
                "Q48":"TSX","Q651213":"ASX",
            }
            exc_name = EXC_MAP.get(exc_id, "")

        if ipo_year:
            log.info("[Wikidata] IPO year: %d on %s", ipo_year, exc_name or "exchange")
            return ipo_year, exc_name

    except Exception as e:
        log.warning("[Wikidata] %s", e)
    return None


# ─── Source 5: Crunchbase ─────────────────────────────────────────────────────

class CrunchbaseScraper:
    """
    Scrapes the public Crunchbase organization page for funding rounds.
    Uses the company name as the slug (lowercase, hyphens).
    """

    def __init__(self, sess: Session) -> None:
        self.sess = sess

    def _slug(self, company: str) -> str:
        s = company.lower()
        s = re.sub(r"[^a-z0-9\s]", "", s)
        return re.sub(r"\s+", "-", s.strip())

    def fetch(self, company: str) -> list[ME]:
        slug = self._slug(company)
        url  = f"https://www.crunchbase.com/organization/{slug}"
        resp = self.sess.fetch(url, agent=BROWSER_AGENT)
        if not resp:
            log.info("[Crunchbase] no response for %s", slug)
            return []

        milestones: list[ME] = []
        soup = BeautifulSoup(resp.text, "lxml")

        # Crunchbase embeds structured JSON in a <script id="ng-state"> tag
        ng = soup.find("script", {"id": "ng-state"})
        if ng and ng.string:
            try:
                data = json.loads(ng.string)
                # Walk the nested JSON looking for funding round objects
                self._walk_json(data, company, milestones)
            except Exception as e:
                log.debug("[Crunchbase] JSON parse: %s", e)

        # Also try scraping visible text rows for funding info
        for row in soup.select("[class*='funding'],[class*='round'],[data-testid*='funding']"):
            text = row.get_text(" ", strip=True)
            yrs  = extract_years(text)
            if yrs and len(text) >= 20:
                m = make(min(yrs), text, company)
                if m is not None:
                    milestones.append(m)

        log.info("[Crunchbase] milestones: %d", len(milestones))
        return milestones

    def _walk_json(self, obj: Any, company: str, out: list[ME], depth: int = 0) -> None:
        if depth > 12: return
        if isinstance(obj, dict):
            # Look for funding round patterns in dict values
            announced = obj.get("announced_on") or obj.get("announcedOn") or ""
            money     = obj.get("money_raised") or obj.get("moneyRaised") or {}
            rtype     = (obj.get("funding_type") or obj.get("fundingType") or "").lower()
            if announced and (money or rtype):
                yrs = extract_years(str(announced))
                if yrs:
                    amt_n = money.get("value") if isinstance(money, dict) else None
                    amt_s = f" — {fmt_money(float(amt_n))}" if amt_n else ""
                    title = f"Series {rtype.title()}{amt_s}" if re.match(r"series_[a-h]", rtype) \
                        else f"{rtype.title()} Round{amt_s}" if rtype else f"Funding Round{amt_s}"
                    detail = f"{company} raised a {rtype or 'funding'} round{amt_s} announced {announced}."
                    out.append(ME(year=yrs[0], type="funding", title=title, detail=clean_text(detail),
                                  score=score_event("funding", detail), key=f"{yrs[0]}_funding"))
            for v in obj.values():
                self._walk_json(v, company, out, depth + 1)
        elif isinstance(obj, list):
            for item in obj[:30]:
                self._walk_json(item, company, out, depth + 1)


# ─── Deduplication + selection ────────────────────────────────────────────────

def dedup_and_select(milestones: list[ME], max_count: int = 15) -> list[dict]:
    """
    Dedup by key (acquisitions keyed by target name; others by year+type).
    Enforces type diversity: caps M&A at MAX_ACQUISITIONS, guarantees founding/IPO.
    Picks highest-scored/most-detailed item per key, then selects by score with cap.
    Sorts output chronologically.
    """
    # Step 0: remove boilerplate and low-quality noise items
    milestones = [
        m for m in milestones
        if not BOILERPLATE_RE.search(m.detail)
        and not BOILERPLATE_RE.search(m.title)
        and len(m.detail.strip()) >= 25
    ]

    # Step 1: deduplicate — keep best item per key
    best: dict[str, ME] = {}
    for m in milestones:
        ex = best.get(m.key)
        if ex is None or m.score > ex.score or (m.score == ex.score and len(m.detail) > len(ex.detail)):
            best[m.key] = m

    unique = list(best.values())

    # Step 2: separate by type
    founding    = sorted([m for m in unique if m.type == "founding"],    key=lambda m: m.year)[:1]
    ipos        = sorted([m for m in unique if m.type == "ipo"],         key=lambda m: -m.score)[:1]
    acquisitions = sorted([m for m in unique if m.type == "acquisition"], key=lambda m: -m.score)
    others      = sorted([m for m in unique if m.type not in ("founding","ipo","acquisition")],
                         key=lambda m: (-m.score, m.year))

    # Step 3: reserve slots — founding always in, IPO always in if found
    reserved   = founding + ipos
    slots_left = max_count - len(reserved)

    # Cap M&A at MAX_ACQUISITIONS, fill remaining slots with other types first for diversity
    non_acq_slots = max(slots_left - MAX_ACQUISITIONS, slots_left // 2)
    non_acq = others[:non_acq_slots]
    acq_slots = slots_left - len(non_acq)
    acq = acquisitions[:acq_slots]

    # If others didn't fill their slots, let acquisitions take them
    if len(non_acq) < non_acq_slots:
        extra = non_acq_slots - len(non_acq)
        acq = acquisitions[:acq_slots + extra]

    selected = reserved + non_acq + acq
    selected.sort(key=lambda m: m.year)
    return [m.to_dict(i) for i, m in enumerate(selected)]


# ─── Main orchestrator ────────────────────────────────────────────────────────

def scrape_milestones(
    company: str,
    website: str,
    timeout: int = DEFAULT_TIMEOUT,
    db_founded_year: Optional[int] = None,
) -> list[dict]:
    sess = Session(timeout=timeout)
    all_ms: list[ME] = []
    # If the DB already has the correct founding year, use it directly — don't guess from scraping.
    founding_year: Optional[int] = db_founded_year
    traded_as_str: Optional[str] = None

    log.info("=== Milestones: %s (%s) ===", company, website)

    # ── Tier 1: Wikipedia (full article scan) ────────────────────────────
    try:
        wiki = WikipediaScraper(sess)
        wms, fy, ta = wiki.fetch(company)
        all_ms.extend(wms)
        if fy: founding_year = fy
        if ta: traded_as_str = ta
        log.info("Wikipedia: %d milestones", len(wms))
    except Exception as e:
        log.warning("Wikipedia error: %s", e)

    # ── Tier 2: Google News RSS (8 targeted queries) ──────────────────────
    try:
        gms = GoogleNewsScraper(sess).fetch(company)
        all_ms.extend(gms)
        log.info("Google News: %d milestones", len(gms))
    except Exception as e:
        log.warning("Google News error: %s", e)

    # ── Tier 3: Company website ───────────────────────────────────────────
    try:
        wbms = WebsiteScraper(sess).fetch(website, company)
        all_ms.extend(wbms)
        log.info("Website: %d milestones", len(wbms))
    except Exception as e:
        log.warning("Website error: %s", e)

    # ── Tier 4: SEC EDGAR — IPO year from S-1 filing ─────────────────────
    ipo_found = any(m.type == "ipo" for m in all_ms)
    try:
        ipo_yr = sec_ipo_year(sess, company)
        if ipo_yr and not ipo_found:
            exc = ""
            if traded_as_str:
                exc_m = re.search(r"\b(NASDAQ|NYSE|LSE|TSX|ASX)\b", traded_as_str, re.I)
                if exc_m: exc = f" on {exc_m.group(1).upper()}"
            all_ms.append(ME(
                year=ipo_yr, type="ipo",
                title=f"IPO{exc}" if exc else "Initial Public Offering",
                detail=f"{company} completed its IPO in {ipo_yr}{exc}, becoming a publicly traded company.",
                score=90, key=f"{ipo_yr}_ipo",
            ))
            ipo_found = True
            log.info("EDGAR IPO year: %d", ipo_yr)
    except Exception as e:
        log.warning("EDGAR error: %s", e)

    # ── Tier 4b: Wikidata IPO date (structured, covers pre-1993 IPOs) ─────
    ipo_found = any(m.type == "ipo" for m in all_ms)
    if not ipo_found and traded_as_str:
        try:
            wd_result = wikidata_ipo_year(sess, company)
            if wd_result:
                ipo_yr_wd, exc_wd = wd_result
                exc_label = exc_wd or (re.search(r"\b(NASDAQ|NYSE|LSE|TSX|ASX)\b",
                                                   traded_as_str, re.I) or type('',(),{'group':lambda s,n:""})()).group(1)
                all_ms.append(ME(
                    year=ipo_yr_wd, type="ipo",
                    title=f"IPO on {exc_label}" if exc_label else "Initial Public Offering",
                    detail=f"{company} completed its initial public offering in {ipo_yr_wd}"
                           f"{(' on ' + exc_label) if exc_label else ''}, becoming a publicly traded company.",
                    score=91, key=f"{ipo_yr_wd}_ipo",
                ))
                ipo_found = True
                log.info("Wikidata IPO: %d %s", ipo_yr_wd, exc_label)
        except Exception as e:
            log.warning("Wikidata IPO error: %s", e)

    # ── IPO from Wikipedia traded_as / text if still not found ───────────
    if not ipo_found and traded_as_str:
        exc_m = re.search(r"\b(NASDAQ|NYSE|LSE|TSX|ASX)\b", traded_as_str, re.I)
        if exc_m:
            exc = exc_m.group(1).upper()
            # 1. Try to find IPO year from Wikipedia article milestones already collected
            ipo_yr_from_text: Optional[int] = None
            ipo_ms = [m for m in all_ms
                      if re.search(r"\b(ipo|went public|initial public offering|listed on|public offering)\b",
                                   m.detail, re.I)]
            if ipo_ms:
                ipo_yr_from_text = ipo_ms[0].year
                # Re-tag the milestone as ipo type with proper styling
                old = ipo_ms[0]
                all_ms.append(ME(
                    year=old.year, type="ipo",
                    title=f"IPO on {exc}",
                    detail=old.detail,
                    score=90, key=f"{old.year}_ipo",
                ))
                log.info("Re-tagged existing milestone as IPO: %d", old.year)
            else:
                # 2. No year found in article text — try a Google News IPO query specifically
                try:
                    ipo_q = f'"{company}" IPO "initial public offering" "went public"'
                    ipo_url = f"https://news.google.com/rss/search?q={quote_plus(ipo_q)}&hl=en-US&gl=US&ceid=US:en"
                    ipo_resp = sess.fetch(ipo_url, agent=RSS_AGENT, accept="application/rss+xml,*/*")
                    if ipo_resp:
                        gns = GoogleNewsScraper(sess)
                        ipo_events, _ = gns._parse_rss_with_links(ipo_resp.text, company)
                        for yr, txt in ipo_events:
                            if re.search(r"\b(ipo|went public|initial public offering)\b", txt, re.I):
                                ipo_yr_from_text = yr
                                break
                except Exception:
                    pass
                if ipo_yr_from_text:
                    all_ms.append(ME(
                        year=ipo_yr_from_text, type="ipo",
                        title=f"IPO on {exc}",
                        detail=f"{company} completed its initial public offering on {exc} in {ipo_yr_from_text}.",
                        score=90, key=f"{ipo_yr_from_text}_ipo",
                    ))
                    log.info("Synthesised IPO from news+traded_as: %s %d", exc, ipo_yr_from_text)
                else:
                    # 3. Last resort: mark as public company without exact year
                    log.info("[IPO] is public on %s but IPO year unknown — skipping synthesis", exc)

    # ── Tier 5: Crunchbase ────────────────────────────────────────────────
    try:
        cbms = CrunchbaseScraper(sess).fetch(company)
        all_ms.extend(cbms)
        log.info("Crunchbase: %d milestones", len(cbms))
    except Exception as e:
        log.warning("Crunchbase error: %s", e)

    # ── Guaranteed founding milestone ────────────────────────────────────
    # Remove any founding milestones with the wrong year when db_founded_year is authoritative.
    if db_founded_year:
        wrong = [m for m in all_ms if m.type == "founding" and m.year != db_founded_year]
        for m in wrong:
            all_ms.remove(m)
            log.info("Removed founding milestone with wrong year %d (correct: %d)", m.year, db_founded_year)

    has_founding = any(m.type == "founding" for m in all_ms)
    if not has_founding:
        fy = founding_year  # already set to db_founded_year if provided
        if not fy:
            # Try Wikidata P571 (inception date) — works for both public and private companies
            try:
                fy = wikidata_founding_year(sess, company)
            except Exception as e:
                log.warning("Wikidata founding error: %s", e)
        if not fy:
            # Scan raw milestones for any that mention founding + a plausible year
            founding_re = re.compile(r"\b(founded|incorporated|established|co-founded)\b", re.I)
            for m in sorted(all_ms, key=lambda x: -x.score):
                if founding_re.search(m.detail):
                    candidate = [y for y in extract_years(m.detail) if MIN_YEAR <= y <= CURRENT_YEAR]
                    if candidate:
                        fy = min(candidate)
                        log.info("Founding year from raw event text: %d", fy)
                        break
        if fy:
            all_ms.append(ME(
                year=fy, type="founding",
                title=f"{company} founded",
                detail=f"{company} was founded in {fy}.",
                score=100, key=f"{fy}_founding",
            ))
            log.info("Synthesised founding: %d", fy)

    log.info("Total raw: %d", len(all_ms))

    if not all_ms:
        # Last resort: single founding placeholder so we never return empty
        log.warning("All sources returned 0 — returning minimal placeholder")
        return [ME(year=CURRENT_YEAR - 5, type="founding",
                   title=f"{company} founded",
                   detail=f"Founding and history information for {company}.",
                   score=100, key="founding").to_dict(0)]

    return dedup_and_select(all_ms, max_count=15)


# ─── Supabase writer ─────────────────────────────────────────────────────────

def push_milestones_to_supabase(
    company_id: str,
    items: list[dict],
    auth_token: str,
) -> bool:
    """Write milestones directly to Supabase via REST API.

    Uses the admin's JWT (auth_token) so RLS policies are satisfied.
    Falls back to SUPABASE_SERVICE_ROLE_KEY env var if no auth_token.
    """
    supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
    anon_key     = os.environ.get("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "")
    service_key  = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

    bearer = service_key or auth_token
    api_key = service_key or anon_key

    if not supabase_url or not bearer:
        log.warning("Supabase credentials not available — skipping direct write")
        return False

    headers = {
        "apikey":        api_key,
        "Authorization": f"Bearer {bearer}",
        "Content-Type":  "application/json",
        "Prefer":        "return=minimal",
    }
    table = f"{supabase_url}/rest/v1/company_milestones"

    try:
        # Replace all existing milestones for this company
        del_r = requests.delete(table, headers=headers, params={"company_id": f"eq.{company_id}"}, timeout=15)
        del_r.raise_for_status()

        rows = [
            {
                "company_id":   company_id,
                "year":         item["year"],
                "type":         item["type"],
                "icon":         item["icon"],
                "accent_color": item["accent_color"],
                "bg_color":     item["bg_color"],
                "title":        item["title"],
                "detail":       item["detail"],
                "badge":        item["badge"],
                "sort_order":   item["sort_order"],
            }
            for item in items
        ]
        ins_r = requests.post(table, headers=headers, json=rows, timeout=15)
        ins_r.raise_for_status()
        log.info("Pushed %d milestones to Supabase for company %s", len(items), company_id)
        return True
    except Exception as e:
        log.error("Supabase write error: %s", e)
        return False


def revalidate_company_profile(app_url: str, company_id: str) -> None:
    """Bust the Next.js company profile cache via the revalidation endpoint."""
    try:
        url = f"{app_url.rstrip('/')}/api/revalidate-company"
        requests.post(url, json={"companyId": company_id}, timeout=8)
        log.info("Revalidation request sent for company %s", company_id)
    except Exception as e:
        log.warning("Revalidation request failed (non-fatal): %s", e)


# ─── CLI ──────────────────────────────────────────────────────────────────────

def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--company",    required=True,  help="Company name")
    p.add_argument("--website",    required=True,  help="Company website domain")
    p.add_argument("--timeout",    type=int, default=DEFAULT_TIMEOUT)
    p.add_argument("--founded",    type=int, default=None,
                   help="Authoritative founding year from DB (overrides scraping)")
    p.add_argument("--company-id", default=None,
                   help="Supabase company UUID — when set, writes results directly to DB")
    p.add_argument("--auth-token", default=None,
                   help="Admin JWT for authenticated Supabase writes")
    p.add_argument("--app-url",    default=None,
                   help="Next.js app URL for cache revalidation (e.g. http://localhost:3000)")
    args = p.parse_args()

    company = args.company.strip()
    website = args.website.strip()
    if not company or not website:
        print(json.dumps({"error": "company and website are required"}))
        sys.exit(1)

    items = scrape_milestones(
        company, website, args.timeout,
        db_founded_year=args.founded,
    )

    if args.company_id:
        # Write directly to Supabase and return a summary
        written = push_milestones_to_supabase(
            args.company_id, items, args.auth_token or ""
        )
        if written and args.app_url:
            revalidate_company_profile(args.app_url, args.company_id)
        print(json.dumps({"count": len(items), "written": written}, ensure_ascii=False))
    else:
        # Legacy mode: output full JSON array for the API route to insert
        print(json.dumps(items, ensure_ascii=False, indent=2))

    sys.exit(0)


if __name__ == "__main__":
    main()
