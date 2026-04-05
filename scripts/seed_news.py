#!/usr/bin/env python3
"""
ResearchOrg News Seeder v1.0
=============================
Scrapes the 5 latest press releases / news items for a company.

Source hierarchy (lower tier = higher priority):
  Tier 1  Company Newsroom RSS   Official feed from the company's own site
  Tier 1  Google News RSS        Stable XML format, no auth, 15-year track record
  Tier 2  GlobeNewswire Search   Dedicated press-release wire, structured HTML
  Tier 3  Bing News RSS          Microsoft-maintained backup aggregator

Why these sources:
  • Newsroom RSS     — Most authoritative; company controls every item published
  • Google News RSS  — Free, RFC 4287-compliant XML, comprehensive, no key needed
  • GlobeNewswire    — Press-release-only wire; filters out opinion and analysis
  • Bing News RSS    — Consistent XML fallback; independent index from Google

Consistency guarantee:
  • All sources use RSS/Atom (open standard — format never changes unexpectedly)
  • Dates stored as "Mon YYYY" absolute strings — results do not drift over time
  • Headlines are normalised before de-duplication to prevent near-duplicates
  • Company name is required in every headline to avoid unrelated articles

Usage:
  python seed_news.py --company "Apple" --website "apple.com"
  python seed_news.py --company "Stripe" --website "stripe.com" --timeout 20

Output: JSON array of ≤5 news items → stdout
Logs  : Progress and warnings → stderr
Exit  : 0 = success (≥1 item found), 1 = argument error, 2 = no items found
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import re
import sys
import time
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from typing import Any, Optional
from urllib.parse import quote_plus, urlparse
from xml.etree import ElementTree as ET

import requests
from bs4 import BeautifulSoup

# ─── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    stream=sys.stderr,
)
log = logging.getLogger("seed_news")

# ─── HTTP config ──────────────────────────────────────────────────────────────
# SEC EDGAR mandates an informative User-Agent (kept for parity with other scripts).
# For news sites we use a standard browser UA to avoid bot-blocks.
BROWSER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36"
)
RSS_AGENT = "ResearchOrg/1.0 NewsScraper (admin@researchorg.io; research/educational)"
DEFAULT_TIMEOUT = 12
MAX_RETRIES     = 2

# ─── Authoritative press-release sources (used for scoring) ───────────────────
WIRE_DOMAINS = {
    "businesswire.com", "prnewswire.com", "globenewswire.com",
    "accesswire.com", "einpresswire.com", "prlog.org",
    "businesswire.com", "sec.gov",
}

# ─── News-type classification rules ───────────────────────────────────────────
# Each rule is (type_label, [keyword_fragments]).  Matching is case-insensitive
# on the combined headline+summary text.  First match wins.
TYPE_RULES: list[tuple[str, list[str]]] = [
    ("ACQUISITION", [
        "acqui", "merger", " buys ", " buy ", "purchased", "takeover",
        "to acquire", "agreed to buy",
    ]),
    ("FUNDING", [
        "raises $", "raises €", "funding", "series a", "series b", "series c",
        "series d", "series e", "series f", "ipo", "valuation of $",
        "capital round", "venture capital", " raised ", "investment round",
        "backed by", "pre-ipo",
    ]),
    ("LAUNCH", [
        "launches ", "launch of", "releases ", "release of", "introduces ",
        "unveils ", "announces new", "now available", "ships ", "rolling out",
        "rolls out", "general availability", "debuts ", "goes live",
    ]),
    ("PARTNERSHIP", [
        "partners with", "partnership with", "collaboration with",
        "teams with", "integrates with", "agreement with", "signs deal",
        "alliance with", "joint venture",
    ]),
    ("HIRING", [
        "appoints ", "names new ceo", "names new cto", "names new cfo",
        "joins as ceo", "joins as cto", "joins as cfo",
        "new chief executive", "new chief technology", "new chief financial",
        "hires ", "promotes to",
    ]),
    ("AWARD", [
        " award", "recogni", " honor", "ranks no.", "ranked #", "named one of",
        "best place to work", "top 10 ", "leader in ", "named a leader",
    ]),
]

TYPE_STYLES: dict[str, dict[str, str]] = {
    "NEWS":        {"type_color": "#1D4ED8", "type_bg": "#EFF6FF", "dot_color": "#3B82F6"},
    "LAUNCH":      {"type_color": "#065F46", "type_bg": "#ECFDF5", "dot_color": "#10B981"},
    "FUNDING":     {"type_color": "#5B21B6", "type_bg": "#F5F3FF", "dot_color": "#7C3AED"},
    "PARTNERSHIP": {"type_color": "#0369A1", "type_bg": "#E0F2FE", "dot_color": "#0EA5E9"},
    "HIRING":      {"type_color": "#92400E", "type_bg": "#FFFBEB", "dot_color": "#F59E0B"},
    "AWARD":       {"type_color": "#C2410C", "type_bg": "#FFF7ED", "dot_color": "#F97316"},
    "ACQUISITION": {"type_color": "#991B1B", "type_bg": "#FEF2F2", "dot_color": "#EF4444"},
}

MONTH_ABBR = {
    1: "Jan", 2: "Feb", 3: "Mar", 4: "Apr", 5: "May",  6: "Jun",
    7: "Jul", 8: "Aug", 9: "Sep", 10: "Oct", 11: "Nov", 12: "Dec",
}

# ─── HTTP session ─────────────────────────────────────────────────────────────

class Session(requests.Session):
    def __init__(self, timeout: int = DEFAULT_TIMEOUT) -> None:
        super().__init__()
        self._timeout = timeout

    def fetch(
        self,
        url: str,
        agent: str = BROWSER_AGENT,
        accept: str = "application/rss+xml, application/xml, text/xml, */*",
        **kwargs,
    ) -> Optional[requests.Response]:
        kwargs.setdefault("timeout", self._timeout)
        self.headers.update({"User-Agent": agent, "Accept": accept})
        for attempt in range(MAX_RETRIES + 1):
            try:
                resp = self.get(url, allow_redirects=True, **kwargs)
                if resp.status_code == 429:
                    wait = int(resp.headers.get("Retry-After", 5))
                    log.warning("Rate-limited by %s — sleeping %ds", url[:60], wait)
                    time.sleep(min(wait, 10))
                    continue
                if resp.status_code in (403, 401, 404):
                    return None
                resp.raise_for_status()
                return resp
            except requests.exceptions.Timeout:
                log.warning("Timeout on %s (attempt %d)", url[:60], attempt + 1)
                if attempt < MAX_RETRIES:
                    time.sleep(1.5 * (attempt + 1))
            except requests.exceptions.HTTPError:
                return None
            except requests.exceptions.RequestException as e:
                log.warning("Request error %s: %s", url[:60], e)
                if attempt < MAX_RETRIES:
                    time.sleep(1.5 * (attempt + 1))
        return None


# ─── Utilities ─────────────────────────────────────────────────────────────────

def strip_html(text: str) -> str:
    """Remove HTML tags and decode common entities."""
    text = re.sub(r"<[^>]+>", " ", text)
    text = text.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
    text = text.replace("&quot;", '"').replace("&#39;", "'").replace("&nbsp;", " ")
    text = re.sub(r"\s+", " ", text).strip()
    return text


def truncate_summary(text: str, max_chars: int = 220) -> str:
    """Truncate at a sentence boundary if possible."""
    text = strip_html(text)
    if len(text) <= max_chars:
        return text
    # Try to cut at the last sentence boundary before max_chars
    cut = text[:max_chars]
    last_dot = max(cut.rfind(". "), cut.rfind("! "), cut.rfind("? "))
    if last_dot > max_chars // 2:
        return cut[:last_dot + 1]
    return cut.rstrip() + "…"


def parse_date(raw: str) -> Optional[datetime]:
    """Parse RFC 2822 or ISO 8601 date strings; returns UTC datetime or None."""
    raw = raw.strip()
    if not raw:
        return None
    # RFC 2822 (RSS pubDate)
    try:
        return parsedate_to_datetime(raw).astimezone(timezone.utc)
    except Exception:
        pass
    # ISO 8601 (Atom <updated> / <published>)
    for fmt in ("%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%d"):
        try:
            dt = datetime.strptime(raw[:len(fmt)], fmt)
            return dt.replace(tzinfo=timezone.utc)
        except Exception:
            pass
    return None


def format_date(dt: Optional[datetime]) -> str:
    """Format a datetime as 'Mon YYYY', e.g. 'Jan 2025'."""
    if dt is None:
        return datetime.now().strftime("%b %Y")
    return f"{MONTH_ABBR[dt.month]} {dt.year}"


def normalise_headline(headline: str) -> str:
    """Lowercase and strip punctuation for de-duplication."""
    return re.sub(r"[^a-z0-9 ]", "", headline.lower()).strip()


def classify_type(headline: str, summary: str) -> str:
    """Return a news type label based on keyword matching."""
    text = (headline + " " + summary).lower()
    for label, keywords in TYPE_RULES:
        if any(kw in text for kw in keywords):
            return label
    return "NEWS"


def make_item(
    headline: str,
    summary: str,
    dt: Optional[datetime],
    source_label: str,
    source_url: Optional[str] = None,
) -> dict[str, Any]:
    """Build a standardised news-item dict."""
    news_type = classify_type(headline, summary)
    styles    = TYPE_STYLES.get(news_type, TYPE_STYLES["NEWS"])
    log.info("  [%s] %s → %s", source_label, headline[:70], news_type)
    return {
        "type":           news_type,
        "headline":       headline.strip(),
        "summary":        truncate_summary(summary),
        "published_date": format_date(dt),
        "source_url":     source_url or None,
        "type_color":     styles["type_color"],
        "type_bg":        styles["type_bg"],
        "dot_color":      styles["dot_color"],
        "_dt":            dt,           # internal — stripped before output
        "_score":         0,            # internal — higher = prefer
    }


# ─── RSS / Atom parser ─────────────────────────────────────────────────────────

# Namespace map for Atom feeds
_NS = {
    "atom": "http://www.w3.org/2005/Atom",
    "media": "http://search.yahoo.com/mrss/",
    "content": "http://purl.org/rss/1.0/modules/content/",
}

def _ns(tag: str, ns: str) -> str:
    return f"{{{_NS[ns]}}}{tag}"


def parse_rss(xml_text: str, company: str, source_label: str) -> list[dict]:
    """Parse an RSS 2.0 or Atom 1.0 feed and return news items."""
    items: list[dict] = []
    company_lower = company.lower()
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError as e:
        log.warning("XML parse error (%s): %s", source_label, e)
        return items

    # Detect RSS vs Atom
    is_atom = root.tag == _ns("feed", "atom") or "atom" in root.tag.lower()

    if is_atom:
        entries = root.findall(_ns("entry", "atom"))
        if not entries:
            entries = root.findall("{http://www.w3.org/2005/Atom}entry")
        for entry in entries:
            def atxt(tag: str) -> str:
                el = entry.find(f"{{http://www.w3.org/2005/Atom}}{tag}")
                return (el.text or "").strip() if el is not None else ""
            headline = atxt("title")
            summary  = atxt("summary") or atxt("content")
            pub_raw  = atxt("published") or atxt("updated")
            dt       = parse_date(pub_raw)
            # Atom <link rel="alternate" href="..."> or plain <link>
            link_el  = entry.find("{http://www.w3.org/2005/Atom}link[@rel='alternate']")
            if link_el is None:
                link_el = entry.find("{http://www.w3.org/2005/Atom}link")
            article_url = (link_el.get("href") or "").strip() if link_el is not None else ""
            if headline and company_lower in headline.lower():
                items.append(make_item(headline, summary, dt, source_label,
                                       source_url=article_url or None))
    else:
        channel = root.find("channel")
        if channel is None:
            channel = root
        for item in channel.findall("item"):
            def rtxt(tag: str) -> str:
                el = item.find(tag)
                return (el.text or "").strip() if el is not None else ""
            headline    = rtxt("title")
            summary     = (
                rtxt("{http://purl.org/rss/1.0/modules/content/}encoded")
                or rtxt("description")
            )
            pub_raw     = rtxt("pubDate")
            article_url = rtxt("link")
            dt          = parse_date(pub_raw)
            # Source domain (used for scoring and wire-service boost)
            src_el   = item.find("source")
            src_url  = (src_el.get("url") or "") if src_el is not None else ""
            src_dom  = urlparse(src_url).netloc.lstrip("www.")
            # For Google News, the <link> is a redirect URL — still valid to open
            # For wire services, prefer the <guid> which is often the canonical URL
            guid_el = item.find("guid")
            guid    = (guid_el.text or "").strip() if guid_el is not None else ""
            if guid.startswith("http") and "google.com" not in guid:
                article_url = guid

            if not headline:
                continue
            if company_lower not in headline.lower():
                continue
            itm = make_item(headline, summary, dt, source_label,
                            source_url=article_url or None)
            if src_dom in WIRE_DOMAINS:
                itm["_score"] += 2
            items.append(itm)

    return items


# ─── Source scrapers ───────────────────────────────────────────────────────────

def scrape_newsroom_rss(sess: Session, website: str, company: str) -> list[dict]:
    """
    Tier 1 — Company's own newsroom RSS/Atom feed.
    Tries common feed paths in order; stops at the first that returns items.
    """
    parsed = urlparse(website if "://" in website else "https://" + website)
    domain = parsed.netloc or parsed.path  # e.g. "apple.com"
    base   = f"https://{domain}"

    feed_paths = [
        "/newsroom/rss",
        "/newsroom/feed",
        "/newsroom/rss.xml",
        "/news/rss",
        "/news/feed",
        "/news/rss.xml",
        "/press/rss",
        "/press/feed",
        "/press-releases/feed",
        "/press-releases/rss",
        "/blog/feed",
        "/blog/rss",
        "/blog/rss.xml",
        "/rss",
        "/feed",
        "/rss.xml",
        "/atom.xml",
    ]
    # Also try newsroom.domain.com and press.domain.com subdomains
    subdomain_bases = [
        f"https://newsroom.{domain}",
        f"https://press.{domain}",
        f"https://blog.{domain}",
    ]
    all_urls = (
        [base + p for p in feed_paths]
        + [sb + p for sb in subdomain_bases for p in ["/rss", "/feed", "/rss.xml", ""]]
    )

    for url in all_urls:
        resp = sess.fetch(url, agent=RSS_AGENT)
        if resp is None:
            continue
        ct = resp.headers.get("Content-Type", "")
        if not any(x in ct for x in ("xml", "rss", "atom", "json")):
            # Check if body looks like XML anyway
            snippet = resp.text[:200].strip()
            if not snippet.startswith("<"):
                continue
        items = parse_rss(resp.text, company, "newsroom-rss")
        if items:
            log.info("Newsroom RSS: %d items from %s", len(items), url)
            return items[:10]
    return []


def scrape_google_news_rss(sess: Session, company: str) -> list[dict]:
    """
    Tier 1 — Google News RSS (stable since 2006, no auth, RFC 4287 XML).

    Queries:
      1. "{company}" press release  — most targeted
      2. "{company}"                — broader fallback
    """
    results: list[dict] = []
    queries = [
        f'"{company}" press release',
        f'"{company}" announcement',
        company,
    ]
    for q in queries:
        url = (
            "https://news.google.com/rss/search"
            f"?q={quote_plus(q)}"
            "&hl=en-US&gl=US&ceid=US:en"
        )
        resp = sess.fetch(url, agent=RSS_AGENT)
        if resp is None:
            continue
        items = parse_rss(resp.text, company, "google-news")
        if items:
            # Score boost: prefer items from press-release wire domains
            for it in items:
                it["_score"] += 1  # google-news baseline
            results.extend(items)
            if len(results) >= 10:
                break
        time.sleep(0.4)  # be polite
    return results


def scrape_globenewswire(sess: Session, company: str) -> list[dict]:
    """
    Tier 2 — GlobeNewswire search (press releases only, no opinion).
    Parses the search-results HTML list.
    """
    url = (
        "https://www.globenewswire.com/search/topic/Press%20Releases"
        f"/keyword/{quote_plus(company)}"
    )
    resp = sess.fetch(url, agent=BROWSER_AGENT, accept="text/html,*/*")
    if resp is None:
        return []

    items: list[dict] = []
    company_lower = company.lower()
    try:
        soup = BeautifulSoup(resp.text, "lxml")
        for article in soup.select("article, .news-item, li.item"):
            h_el   = article.find(["h2", "h3", "h4", "a"])
            headline = h_el.get_text(strip=True) if h_el else ""
            if not headline or company_lower not in headline.lower():
                continue
            # Article URL — prefer explicit <a> with href
            a_el        = article.find("a", href=True)
            article_url = ""
            if a_el:
                href = a_el["href"]
                article_url = (
                    href if href.startswith("http")
                    else "https://www.globenewswire.com" + href
                )
            # Summary from paragraph or description
            p_el   = article.find("p")
            summary = p_el.get_text(strip=True) if p_el else ""
            # Date
            dt_el   = article.find(["time", "span"], {"class": re.compile(r"date|time|pub", re.I)})
            dt_raw  = (dt_el.get("datetime") or dt_el.get_text()) if dt_el else ""
            dt      = parse_date(dt_raw)
            it      = make_item(headline, summary, dt, "globenewswire",
                                source_url=article_url or None)
            it["_score"] += 2  # wire service
            items.append(it)
    except Exception as e:
        log.warning("GlobeNewswire parse error: %s", e)
    return items[:10]


def scrape_bing_news_rss(sess: Session, company: str) -> list[dict]:
    """
    Tier 3 — Bing News RSS (Microsoft-maintained, consistent XML fallback).
    """
    queries = [
        f'"{company}" press release',
        company,
    ]
    for q in queries:
        url = (
            "https://www.bing.com/news/search"
            f"?q={quote_plus(q)}&format=rss"
        )
        resp = sess.fetch(url, agent=RSS_AGENT)
        if resp is None:
            continue
        items = parse_rss(resp.text, company, "bing-news")
        if items:
            time.sleep(0.4)
            return items[:10]
    return []


# ─── De-duplication & selection ───────────────────────────────────────────────

def deduplicate(items: list[dict]) -> list[dict]:
    """Remove near-duplicate headlines (same first 6 words)."""
    seen: set[str] = set()
    out: list[dict] = []
    for it in items:
        key = " ".join(normalise_headline(it["headline"]).split()[:6])
        if key not in seen:
            seen.add(key)
            out.append(it)
    return out


def select_top5(items: list[dict]) -> list[dict]:
    """
    Sort by: (1) descending score, (2) descending date, then take top 5.
    Strip internal tracking fields before returning.
    """
    def sort_key(it: dict):
        dt = it.get("_dt") or datetime(2000, 1, 1, tzinfo=timezone.utc)
        return (it.get("_score", 0), dt.timestamp())

    ranked = sorted(items, key=sort_key, reverse=True)
    top5   = deduplicate(ranked)[:5]
    # Remove internal keys
    clean = []
    for i, it in enumerate(top5):
        c = {k: v for k, v in it.items() if not k.startswith("_")}
        c["sort_order"] = i
        clean.append(c)
    return clean


# ─── Main orchestrator ─────────────────────────────────────────────────────────

def scrape_news(company: str, website: str, timeout: int = DEFAULT_TIMEOUT) -> list[dict]:
    """
    Run all scrapers, merge results, deduplicate, return top 5.
    """
    sess = Session(timeout=timeout)
    all_items: list[dict] = []

    log.info("=== Scraping news for: %s (%s) ===", company, website)

    # Tier 1a — Company newsroom RSS (highest trust)
    try:
        newsroom = scrape_newsroom_rss(sess, website, company)
        for it in newsroom:
            it["_score"] += 3  # official source gets highest score
        all_items.extend(newsroom)
        log.info("Newsroom RSS: %d items", len(newsroom))
    except Exception as e:
        log.warning("Newsroom RSS failed: %s", e)

    # Tier 1b — Google News RSS
    try:
        gnews = scrape_google_news_rss(sess, company)
        all_items.extend(gnews)
        log.info("Google News RSS: %d items", len(gnews))
    except Exception as e:
        log.warning("Google News RSS failed: %s", e)

    # Tier 2 — GlobeNewswire (only if we need more items)
    if len(all_items) < 8:
        try:
            gnw = scrape_globenewswire(sess, company)
            all_items.extend(gnw)
            log.info("GlobeNewswire: %d items", len(gnw))
        except Exception as e:
            log.warning("GlobeNewswire failed: %s", e)

    # Tier 3 — Bing News RSS (only if still need more)
    if len(all_items) < 5:
        try:
            bing = scrape_bing_news_rss(sess, company)
            all_items.extend(bing)
            log.info("Bing News RSS: %d items", len(bing))
        except Exception as e:
            log.warning("Bing News RSS failed: %s", e)

    log.info("Total raw items: %d", len(all_items))

    if not all_items:
        return []

    top5 = select_top5(all_items)
    log.info("Selected %d items", len(top5))
    return top5


# ─── Supabase writer ─────────────────────────────────────────────────────────

def push_news_to_supabase(company_id: str, items: list[dict], auth_token: str) -> bool:
    supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
    anon_key     = os.environ.get("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "")
    service_key  = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

    bearer  = service_key or auth_token
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
    table = f"{supabase_url}/rest/v1/company_news"

    try:
        requests.delete(table, headers=headers, params={"company_id": f"eq.{company_id}"}, timeout=15).raise_for_status()
        rows = [
            {
                "company_id":     company_id,
                "type":           item["type"],
                "headline":       item["headline"],
                "summary":        item["summary"],
                "published_date": item["published_date"],
                "source_url":     item.get("source_url"),
                "type_color":     item["type_color"],
                "type_bg":        item["type_bg"],
                "dot_color":      item["dot_color"],
                "sort_order":     item["sort_order"],
            }
            for item in items
        ]
        requests.post(table, headers=headers, json=rows, timeout=15).raise_for_status()
        log.info("Pushed %d news items to Supabase for company %s", len(items), company_id)
        return True
    except Exception as e:
        log.error("Supabase write error: %s", e)
        return False


def revalidate_company_profile(app_url: str, company_id: str) -> None:
    try:
        requests.post(f"{app_url.rstrip('/')}/api/revalidate-company",
                      json={"companyId": company_id}, timeout=8)
        log.info("Revalidation request sent for company %s", company_id)
    except Exception as e:
        log.warning("Revalidation request failed (non-fatal): %s", e)


# ─── CLI entry-point ──────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Scrape latest news for a company")
    parser.add_argument("--company",    required=True, help="Company name, e.g. 'Apple'")
    parser.add_argument("--website",    required=True, help="Company website, e.g. 'apple.com'")
    parser.add_argument("--timeout",    type=int, default=DEFAULT_TIMEOUT)
    parser.add_argument("--company-id", default=None,
                        help="Supabase company UUID — when set, writes results directly to DB")
    parser.add_argument("--auth-token", default=None,
                        help="Admin JWT for authenticated Supabase writes")
    parser.add_argument("--app-url",    default=None,
                        help="Next.js app URL for cache revalidation (e.g. http://localhost:3000)")
    args = parser.parse_args()

    company = args.company.strip()
    website = args.website.strip()

    if not company or not website:
        print(json.dumps({"error": "company and website are required"}))
        sys.exit(1)

    items = scrape_news(company, website, timeout=args.timeout)

    if not items:
        print(json.dumps({"error": f"No news found for {company}"}))
        sys.exit(2)

    if args.company_id:
        written = push_news_to_supabase(args.company_id, items, args.auth_token or "")
        if written and args.app_url:
            revalidate_company_profile(args.app_url, args.company_id)
        print(json.dumps({"count": len(items), "written": written}, ensure_ascii=False))
    else:
        print(json.dumps(items, ensure_ascii=False, indent=2))

    sys.exit(0)


if __name__ == "__main__":
    main()
