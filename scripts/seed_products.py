#!/usr/bin/env python3
"""
ResearchOrg Product Seeder v3.0
================================
Scrapes specific, named company products (e.g. "TC22", "Model 3") with
free CC-licensed images sourced from Wikimedia Commons / Wikidata.

Source hierarchy — tried in order, merged and deduplicated:
  Tier 1  Wikidata SPARQL        — structured DB of named products with P18 images
  Tier 2  Company website JSON-LD — schema.org Product / ItemList markup
  Tier 3  Company website sitemap — discover individual product pages via sitemap.xml
  Tier 4  Wikipedia               — named-product extraction from Products section
  Tier 5  Synthetic fallback      — always produces ≥1 result (never returns empty)

Image strategy — all sources are CC-licensed / public domain:
  1. Wikidata P18          → Wikimedia Commons file (CC-licensed, product-specific)
  2. Wikipedia REST summary → thumbnail.source for named product
  3. Wikimedia Commons search → free image for product query
  4. None                  → UI shows a styled placeholder

Usage:
  python seed_products.py --company "Tesla" --website "tesla.com"
  python seed_products.py --company "Zebra Technologies" --website "zebra.com"
  python seed_products.py --company "Tesla" --website "tesla.com" \\
      --company-id "uuid" --auth-token "jwt" --app-url "http://localhost:3000"

Output: JSON {"count": N, "written": bool}  when --company-id given
        JSON array of products              without --company-id (debug mode)
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import re
import sys
import time
from xml.etree import ElementTree as ET
from typing import Optional
from urllib.parse import urljoin, urlparse, quote, quote_plus

import requests
from bs4 import BeautifulSoup

# ─── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    stream=sys.stderr,
)
log = logging.getLogger("seed_products")

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

    def get(self, url: str, **kwargs) -> requests.Response:
        kwargs.setdefault("timeout", self.timeout)
        kwargs.setdefault("allow_redirects", True)
        try:
            return self.s.get(url, **kwargs)
        except requests.exceptions.SSLError:
            kwargs["verify"] = False
            return self.s.get(url, **kwargs)


# ─── Helpers ──────────────────────────────────────────────────────────────────
def clean(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "")).strip()

def truncate(text: str, n: int) -> str:
    return text if len(text) <= n else text[:n - 1].rstrip() + "…"

def domain_of(website: str) -> str:
    p = urlparse(website if "://" in website else "https://" + website)
    return (p.netloc or p.path).lstrip("www.")

def base_url(website: str) -> str:
    return f"https://{domain_of(website)}"

def fetch_soup(sess: Session, url: str, timeout: int = 12) -> Optional[BeautifulSoup]:
    try:
        r = sess.get(url, timeout=timeout)
        if r.status_code == 200:
            return BeautifulSoup(r.text, "html.parser")
    except Exception as e:
        log.debug("fetch_soup failed (%s): %s", url, e)
    return None


# ─── Category / colour helpers ────────────────────────────────────────────────
CATEGORY_RULES: list[tuple[str, str]] = [
    (r"model [sxy3]|cybertruck|roadster|semi truck|electric.{0,10}vehicle|suv|sedan|pickup", "Electric Vehicle"),
    (r"powerwall|megapack|powerpack|home battery|energy storage",                            "Energy Storage"),
    (r"solar roof|solar panel|photovoltaic",                                                 "Solar"),
    (r"supercharger|charging station|ev charge",                                             "EV Charging"),
    (r"tc\d{2}|mc\d{2}|wt\d{4}|mobile.{0,8}computer|handheld",                            "Mobile Computer"),
    (r"scanner|barcode|rfid|imager|ds\d{4}",                                                "Scanner"),
    (r"printer|zt\d{3}|zd\d{3}|zc\d{3}|label print",                                       "Printer"),
    (r"tablet|device|rugged",                                                                "Rugged Device"),
    (r"payment|checkout|billing|pos |point.of.sale",                                        "Payments"),
    (r"analytics|insight|dashboard|report|bi |intelligence",                                "Analytics"),
    (r"security|fraud|identity|auth|sso|zero.trust",                                        "Security"),
    (r"cloud|infrastructure|storage|compute|server",                                        "Cloud"),
    (r"\bai\b|machine.learning|ml |gpt|llm|neural",                                        "AI"),
    (r"crm|salesforce|pipeline|lead.{0,10}manage",                                         "CRM"),
    (r"mobile|ios|android|\bapp\b",                                                         "Mobile"),
    (r"\bapi\b|sdk|developer|webhook|integration",                                          "Developer Tools"),
    (r"\bdata\b|etl|warehouse|lake",                                                        "Data"),
    (r"ecommerce|e-commerce|shop|store|cart",                                               "E-Commerce"),
    (r"\bhr\b|payroll|recruit|talent",                                                      "HR"),
    (r"marketing|campaign|email.{0,10}tool|seo",                                           "Marketing"),
    (r"collaboration|messaging|chat|communicate",                                            "Collaboration"),
    (r"finance|accounting|expense|invoice",                                                  "Finance"),
    (r"platform|suite|core|foundation",                                                      "Platform"),
    (r"software|saas|application",                                                           "Software"),
    (r"hardware|equipment|sensor|device",                                                    "Hardware"),
]

CATEGORY_COLORS: dict[str, str] = {
    "Electric Vehicle": "#DC2626",
    "Energy Storage":   "#F59E0B",
    "Solar":            "#EAB308",
    "EV Charging":      "#22C55E",
    "Mobile Computer":  "#2563EB",
    "Scanner":          "#7C3AED",
    "Printer":          "#52525B",
    "Rugged Device":    "#374151",
    "Payments":         "#059669",
    "Analytics":        "#D97706",
    "Security":         "#B91C1C",
    "Cloud":            "#0284C7",
    "AI":               "#6D28D9",
    "CRM":              "#2563EB",
    "Mobile":           "#DB2777",
    "Developer Tools":  "#7C3AED",
    "Data":             "#9333EA",
    "E-Commerce":       "#D97706",
    "HR":               "#7C3AED",
    "Marketing":        "#CA8A04",
    "Collaboration":    "#EA580C",
    "Finance":          "#16A34A",
    "Platform":         "#4F46E5",
    "Software":         "#4338CA",
    "Hardware":         "#374151",
    "Product":          "#52525B",
}

USE_CASES: dict[str, list[str]] = {
    "Electric Vehicle": ["Personal Transport", "Commercial Fleet", "Zero Emissions"],
    "Energy Storage":   ["Home Energy Backup", "Grid Stabilization", "Solar Storage"],
    "Solar":            ["Residential Solar", "Commercial Installations", "Energy Independence"],
    "EV Charging":      ["Fast Charging", "Fleet Charging", "Network Access"],
    "Mobile Computer":  ["Warehouse Operations", "Field Service", "Retail Checkout"],
    "Scanner":          ["Inventory Management", "Point-of-Sale", "Asset Tracking"],
    "Printer":          ["Label Printing", "Receipt Printing", "Industrial Labelling"],
    "Rugged Device":    ["Field Operations", "Manufacturing", "Logistics"],
    "Payments":         ["Online Checkout", "In-Person Payments", "Subscription Billing"],
    "Analytics":        ["Business Intelligence", "Performance Tracking", "Data Visualization"],
    "Security":         ["Fraud Prevention", "Access Control", "Compliance"],
    "Cloud":            ["Scalable Infrastructure", "Global Deployment", "Cost Optimization"],
    "AI":               ["Predictive Models", "Automation", "Natural Language Processing"],
    "CRM":              ["Sales Pipeline", "Customer Management", "Lead Tracking"],
    "Mobile":           ["iOS Apps", "Android Apps", "Cross-Platform Development"],
    "Developer Tools":  ["API Integration", "App Development", "CI/CD"],
    "Data":             ["Data Storage", "Real-Time Analytics", "ETL Pipelines"],
    "E-Commerce":       ["Online Store", "Inventory Management", "Order Fulfillment"],
    "HR":               ["Talent Management", "Payroll", "Employee Engagement"],
    "Marketing":        ["Campaign Management", "Customer Acquisition", "A/B Testing"],
    "Collaboration":    ["Team Communication", "Project Management", "File Sharing"],
    "Finance":          ["Financial Reporting", "Expense Management", "Invoicing"],
    "Platform":         ["Enterprise Integration", "Workflow Automation", "Reporting"],
    "Software":         ["Business Automation", "Workflow Management", "Reporting"],
    "Hardware":         ["Field Operations", "Asset Management", "Industrial IoT"],
    "Product":          ["Product Integration", "Business Automation", "Workflow Optimization"],
}

def infer_category(name: str, desc: str = "", tagline: str = "") -> str:
    text = f"{name} {tagline} {desc}".lower()
    for pattern, cat in CATEGORY_RULES:
        if re.search(pattern, text, re.IGNORECASE):
            return cat
    return "Product"

def get_color(category: str) -> str:
    return CATEGORY_COLORS.get(category, "#52525B")

def get_use_cases(category: str) -> list[str]:
    return USE_CASES.get(category, USE_CASES["Product"])


# ─── Free image helpers (all CC-licensed / public domain) ────────────────────

def commons_file_url(filename: str) -> str:
    """Convert a Wikimedia Commons filename to a direct image URL."""
    # Commons uses MD5-based path: first two chars of MD5(normalised_filename)
    # Simplest approach: use the Special:FilePath redirect (no MD5 needed)
    encoded = quote(filename.replace(" ", "_"))
    return f"https://commons.wikimedia.org/wiki/Special:FilePath/{encoded}?width=800"


def wiki_rest_image(sess: Session, title: str) -> Optional[str]:
    """
    Get the thumbnail from a Wikipedia article using the REST summary API.
    Returns a CC-licensed image URL or None.
    e.g. title = "Tesla Model 3"
    """
    url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{quote(title.replace(' ', '_'))}"
    try:
        r = sess.get(url, timeout=8)
        if r.status_code == 200:
            data = r.json()
            src = data.get("thumbnail", {}).get("source")
            if src:
                log.debug("wiki_rest_image: %s → %s", title, src)
                return src
    except Exception as e:
        log.debug("wiki_rest_image failed (%s): %s", title, e)
    return None


def commons_search_image(sess: Session, query: str) -> Optional[str]:
    """
    Search Wikimedia Commons for a CC-licensed image matching the query.
    Uses the MediaWiki API with namespace=6 (File:).
    """
    api = (
        "https://commons.wikimedia.org/w/api.php"
        f"?action=query&generator=search&gsrsearch={quote(query)}"
        "&gsrnamespace=6&gsrlimit=3"
        "&prop=imageinfo&iiprop=url|mime|size"
        "&format=json"
    )
    try:
        r = sess.get(api, timeout=10)
        r.raise_for_status()
        pages = r.json().get("query", {}).get("pages", {})
        for page in pages.values():
            infos = page.get("imageinfo", [])
            if not infos:
                continue
            info = infos[0]
            mime = info.get("mime", "")
            url  = info.get("url", "")
            w    = info.get("width", 0)
            h    = info.get("height", 0)
            # Skip tiny images, SVGs, and audio files
            if mime.startswith("image/") and mime != "image/svg+xml":
                if w >= 200 and h >= 100:
                    log.debug("commons_search_image: %s → %s", query, url)
                    return url
    except Exception as e:
        log.debug("commons_search_image failed (%s): %s", query, e)
    return None


def get_free_image(sess: Session, product_name: str,
                   company: str, category: str) -> Optional[str]:
    """
    Try multiple sources for a free CC-licensed concept image.
    Returns a URL or None.
    """
    # 1. Wikipedia article for the specific product (most accurate)
    for title in [f"{company} {product_name}", product_name]:
        img = wiki_rest_image(sess, title)
        if img:
            return img
        time.sleep(0.15)

    # 2. Wikimedia Commons image search
    for query in [f"{company} {product_name}", product_name, f"{category} product"]:
        img = commons_search_image(sess, query)
        if img:
            return img
        time.sleep(0.15)

    return None


# ─── Tier 1: Wikidata SPARQL ──────────────────────────────────────────────────
WIKIDATA_SEARCH = "https://www.wikidata.org/w/api.php?action=wbsearchentities&search={q}&type=item&language=en&format=json&limit=5"
WIKIDATA_SPARQL = "https://query.wikidata.org/sparql"

COMPANY_DESCRIPTION_WORDS = [
    "company", "corporation", "manufacturer", "technology", "technologies",
    "enterprise", "business", "group", "inc", "corp", "ltd", "plc",
]

def find_wikidata_qid(sess: Session, company: str) -> Optional[str]:
    """Find the Wikidata QID for a company by name."""
    variants = [company, f"{company} Inc", f"{company} company"]
    for variant in variants:
        url = WIKIDATA_SEARCH.format(q=quote(variant))
        try:
            r = sess.get(url, timeout=10)
            r.raise_for_status()
            results = r.json().get("search", [])
        except Exception as e:
            log.debug("Wikidata search failed (%s): %s", variant, e)
            continue

        for result in results:
            desc = result.get("description", "").lower()
            label = result.get("label", "").lower()
            # Prefer results where description mentions company/business words
            if any(w in desc for w in COMPANY_DESCRIPTION_WORDS):
                qid = result["id"]
                log.info("Wikidata QID for '%s': %s (desc: %s)", company, qid, result.get("description"))
                return qid
            # Fallback: label matches and no description contradicts
            if company.lower().split()[0] in label:
                qid = result["id"]
                log.info("Wikidata QID (label match) for '%s': %s", company, qid)
                return qid

    return None


def scrape_wikidata(sess: Session, company: str) -> list[dict]:
    """
    Query Wikidata for products manufactured by the company.
    Returns specific named products with CC-licensed images from P18.
    """
    qid = find_wikidata_qid(sess, company)
    if not qid:
        log.info("Wikidata: no QID found for '%s'", company)
        return []

    # P176 = manufacturer, P31 = instance of
    sparql = f"""
SELECT DISTINCT ?product ?productLabel ?description ?image WHERE {{
  ?product wdt:P176 wd:{qid}.
  SERVICE wikibase:label {{
    bd:serviceParam wikibase:language "en,en".
  }}
  OPTIONAL {{
    ?product schema:description ?description.
    FILTER(LANG(?description) = "en")
  }}
  OPTIONAL {{ ?product wdt:P18 ?image. }}
}}
LIMIT 25
"""
    headers = {
        **HEADERS,
        "Accept": "application/sparql-results+json",
    }
    try:
        r = requests.get(
            WIKIDATA_SPARQL,
            params={"query": sparql, "format": "json"},
            headers=headers,
            timeout=20,
        )
        r.raise_for_status()
        bindings = r.json().get("results", {}).get("bindings", [])
    except Exception as e:
        log.warning("Wikidata SPARQL failed: %s", e)
        return []

    products: list[dict] = []
    seen: set[str] = set()
    for row in bindings:
        name = row.get("productLabel", {}).get("value", "")
        # Skip if label is just the QID (no English label in Wikidata)
        if re.match(r"^Q\d+$", name):
            continue
        key = re.sub(r"\W+", "", name.lower())[:20]
        if key in seen or len(name) < 2:
            continue
        seen.add(key)

        desc    = row.get("description", {}).get("value", "")
        img_val = row.get("image", {}).get("value", "")

        # Wikidata P18 stores the Commons filename (not a URL)
        # e.g. "http://commons.wikimedia.org/wiki/Special:FilePath/Tesla_Model_3.jpg"
        # OR just the filename.
        image_url: Optional[str] = None
        if img_val:
            if img_val.startswith("http"):
                image_url = img_val  # already a URL from Wikidata
            else:
                image_url = commons_file_url(img_val)

        products.append({
            "name":        truncate(name, 60),
            "tagline":     truncate(desc[:120], 120) if desc else "",
            "description": truncate(desc, 400) if desc else "",
            "image_url":   image_url,
            "_score":      5,
            "_source":     "wikidata",
        })

    log.info("Wikidata: %d products for QID %s", len(products), qid)
    return products


# ─── Tier 2: Yahoo web search ────────────────────────────────────────────────
# Yahoo search HTML is reliably parseable, doesn't serve CAPTCHA for scraping,
# and returns specific product names from titles of spec sheets, product pages,
# and reseller listings. Works for both B2C (Tesla) and B2B (Zebra) companies.

# Suffixes to strip from spec-sheet-style titles
_SPEC_SUFFIX_RE = re.compile(
    r"\s+(specification sheet|spec sheet|datasheet|data sheet|"
    r"product reference guide|reference guide|user guide|quick start|"
    r"quick reference|release notes|brochure|overview sheet|"
    r"white paper|fact sheet|solution brief)\b.*",
    re.IGNORECASE,
)

# Generic / promotional titles that are NOT product names
_GENERIC_TITLE_RE = re.compile(
    r"^(home|products?|solutions?|about|contact|support|help|download|"
    r"documentation|faq|blog|news|careers|login|press|partner|investor|"
    r"warranty|repair|service|dealer|resource|webinar|video|case study|"
    r"setup|replacement|interactive|overview|finder|configurator)\s*$",
    re.IGNORECASE,
)

# Skip results whose snippet contains these (doc-level pages, not products)
_SKIP_SNIPPET_RE = re.compile(
    r"(404|page not found|access denied|403 forbidden|"
    r"terms of use|privacy policy|cookie)",
    re.IGNORECASE,
)


YAHOO_SEARCH = "https://search.yahoo.com/search?p={q}&n=20"
YAHOO_HEADERS = {
    **HEADERS,
    "Accept-Language": "en-US,en;q=0.9",
}

def _yahoo_search(sess: Session, query: str) -> list[str]:
    """
    Run a Yahoo web search; return list of result titles.
    Yahoo's HTML results are reliably parseable with h3.title selector.
    No CAPTCHA, no JS required.
    """
    url = YAHOO_SEARCH.format(q=quote_plus(query))
    try:
        r = sess.s.get(url, headers=YAHOO_HEADERS, timeout=12, allow_redirects=True)
        if r.status_code != 200:
            log.debug("Yahoo returned %d for query: %s", r.status_code, query[:60])
            return []
        soup = BeautifulSoup(r.text, "html.parser")
        titles: list[str] = []
        for h3 in soup.select("h3.title"):
            t = clean(h3.get_text())
            # Skip ad-only titles and very short ones
            if t and len(t) > 5 and t.lower() not in ("images", "videos", "shopping", "news"):
                titles.append(t)
        return titles
    except Exception as e:
        log.debug("Yahoo search failed (%s): %s", query, e)
        return []


def _extract_product_name(title: str, snippet: str, company: str) -> Optional[str]:
    """
    Extract a clean product name from a search-result title + snippet.

    Handles common patterns:
      'MC9300 Handheld Mobile Computer Specification Sheet - Zebra'
        → 'MC9300 Handheld Mobile Computer'
      'PDF TC22/TC27 Product Reference Guide - mironet.de'
        → 'TC22/TC27'
      'Tesla Model 3 - Tesla'
        → 'Tesla Model 3'
      'Zebra TC22: Next-Gen Wi-Fi 6E Affordability for Indoor Use Cases'
        → 'TC22 Mobile Computer'  (model from title, type from snippet)
    """
    t = title.strip()

    # Remove leading "PDF " artefact
    t = re.sub(r"^PDF\s+", "", t, flags=re.IGNORECASE)

    # Strip spec-sheet / guide suffix (and everything after it)
    t = _SPEC_SUFFIX_RE.sub("", t)

    # Split on common separator characters; keep the first meaningful segment
    for sep in (" | ", " - ", " — ", " – ", " · ", " : ", ": "):
        if sep in t:
            parts = [p.strip() for p in t.split(sep)]
            for part in parts:
                # Skip parts that are just the company name or site names
                if part.lower() in {company.lower(), "zebra", "tesla", "apple"}:
                    continue
                if re.match(r"^\w+\.\w{2,4}$", part):  # domain.com
                    continue
                if len(part) > 2:
                    t = part
                    break
            break

    # Remove leading company name ("Zebra TC22" → "TC22")
    t = re.sub(
        rf"^{re.escape(company.split()[0])}\s+",
        "", t, flags=re.IGNORECASE,
    ).strip()
    # Also remove full company name
    t = re.sub(
        rf"^{re.escape(company)}\s+",
        "", t, flags=re.IGNORECASE,
    ).strip()

    t = t.strip(" -|:")

    if len(t) < 3 or len(t) > 80:
        return None
    if _GENERIC_TITLE_RE.match(t):
        return None

    # Reject reseller/company-name patterns: "Andtech Barcode Systems", "XYZ Solutions Inc"
    # These are third-party companies not products. They end with org-type words and
    # contain no alphanumeric model number (e.g. TC22, 9300).
    if re.match(
        r"^[A-Za-z\s]+(barcode|scanning|systems|solutions|technologies|group|inc|llc|ltd|"
        r"corporation|corp|co\.|company|partners|associates|distributors?)\s*$",
        t, re.IGNORECASE,
    ) and not re.search(r"[A-Z]{1,4}\d{2,}", t):
        return None

    # Reject generic phrases that remain after stripping (e.g. "Technologies Products")
    if re.match(r"^(technologies?|enterprise|industry|industrial)\s+(products?|solutions?|"
                r"services?|systems?|suite|platform)\s*$", t, re.IGNORECASE):
        return None

    # If what remains is just a model number (e.g. "TC22"), enrich it
    # from the snippet: look for "{model} <ProductType>"
    if re.match(r"^[A-Z]{1,4}\d{2,5}[A-Za-z/]*$", t) and snippet:
        m = re.search(
            rf"{re.escape(t.split('/')[0])}\s+([\w\s\-]+?)(?:\.|,|$)",
            snippet, re.IGNORECASE
        )
        if m:
            enriched = f"{t} {m.group(1).strip()}"
            if len(enriched) <= 80:
                t = enriched

    return t


# Titles that are clearly NOT specific product names
_REJECT_TITLE_RE = re.compile(
    r"^("
    r"shop\s|order\s|buy\s|in\s+stock|low\s+price|best\s+price|"
    r"authorized\s+partner|reseller|distributor|dealer|"
    r"restore\s|repair\s|service\s|support\s|download\s|driver\s|"
    r"portfolio\s+guide|product\s+finder|product\s+portfolio|"
    r"\d{4}\s+(portfolio|catalog)|"  # "2025 Portfolio Guide"
    r"images?|videos?|shopping|news|ads?|"
    r"[A-Z\s]{8,}"  # ALL CAPS long strings (promotional slogans)
    r")",
    re.IGNORECASE,
)

def scrape_search(sess: Session, company: str, website: str) -> list[dict]:
    """
    Search Yahoo for specific named products (e.g. TC22, Model 3, ZT610).
    Works for both B2C (Tesla) and B2B enterprise (Zebra Technologies).

    Three queries in priority order:
    1. 'spec sheet' query — spec sheets always contain exact model names in titles
    2. Model-specific search — forces results that contain known model patterns
    3. General product specifications — broader fallback
    """
    queries = [
        # Spec sheets reliably contain exact product names (TC22, MC9300, ZT610)
        f'"{company}" "specification sheet" OR "spec sheet" product',
        # Broad product overview that returns named product results
        f'"{company}" products specifications -portfolio -guide -finder',
    ]

    products: list[dict] = []
    seen: set[str] = set()

    for query in queries:
        titles = _yahoo_search(sess, query)
        log.info("Yahoo '%s': %d titles", query[:70], len(titles))

        for title in titles:
            if _SKIP_SNIPPET_RE.search(title) or _REJECT_TITLE_RE.search(title):
                continue
            name = _extract_product_name(title, "", company)
            if not name:
                continue
            # Skip if the result is just a category (no model numbers or specific words)
            if name.lower() in {"products", "solutions", "scanners", "printers",
                                 "computers", "tablets", "accessories", "rfid"}:
                continue
            key = re.sub(r"\W+", "", name.lower())[:20]
            if key in seen:
                continue
            seen.add(key)
            products.append({
                "name":        truncate(name, 60),
                "tagline":     "",
                "description": "",
                "image_url":   None,
                "_score":      3,
                "_source":     "yahoo_search",
            })

        if len(products) >= 8:
            break
        time.sleep(0.5)

    log.info("Yahoo search: %d products for %s", len(products), company)
    return products[:10]


# ─── Tier 3: Company website JSON-LD ─────────────────────────────────────────
def extract_jsonld_products(soup: BeautifulSoup) -> list[dict]:
    """
    Parse schema.org Product / ItemList / ProductCollection from JSON-LD.
    Many company websites embed this for SEO — it's machine-readable and exact.
    """
    products: list[dict] = []
    seen: set[str] = set()

    for script in soup.find_all("script", type="application/ld+json"):
        try:
            raw = script.string or ""
            data = json.loads(raw)
        except Exception:
            continue

        # Normalise to a flat list of schema objects
        items: list[dict] = data if isinstance(data, list) else [data]
        # Also unwrap @graph
        expanded: list[dict] = []
        for item in items:
            if isinstance(item, dict) and "@graph" in item:
                expanded.extend(item["@graph"])
            elif isinstance(item, dict):
                expanded.append(item)

        for item in expanded:
            if not isinstance(item, dict):
                continue
            schema_type = item.get("@type", "")
            if isinstance(schema_type, list):
                schema_type = " ".join(schema_type)

            if "Product" in schema_type:
                name = clean(str(item.get("name", "")))
                desc = clean(str(item.get("description", "")))
                img  = item.get("image", "")
                if isinstance(img, dict):
                    img = img.get("url", "")
                elif isinstance(img, list):
                    img = img[0] if img else ""
                img = str(img) if img else ""
                if not img.startswith("http"):
                    img = ""
                key = re.sub(r"\W+", "", name.lower())[:20]
                if name and key not in seen:
                    seen.add(key)
                    products.append({
                        "name":        truncate(name, 60),
                        "tagline":     truncate(desc[:120], 120),
                        "description": truncate(desc, 400),
                        "image_url":   img or None,
                        "_score":      4,
                        "_source":     "jsonld",
                    })

            elif "ItemList" in schema_type or "ProductCollection" in schema_type:
                for el in item.get("itemListElement", []):
                    if isinstance(el, dict):
                        product = el.get("item", el)
                        if isinstance(product, dict):
                            name = clean(str(product.get("name", "")))
                            desc = clean(str(product.get("description", "")))
                            img  = product.get("image", "")
                            if isinstance(img, dict):
                                img = img.get("url", "")
                            img = str(img) if img else ""
                            if not img.startswith("http"):
                                img = ""
                            key = re.sub(r"\W+", "", name.lower())[:20]
                            if name and key not in seen:
                                seen.add(key)
                                products.append({
                                    "name":        truncate(name, 60),
                                    "tagline":     truncate(desc[:120], 120),
                                    "description": truncate(desc, 400),
                                    "image_url":   img or None,
                                    "_score":      4,
                                    "_source":     "jsonld_list",
                                })

    return products


def scrape_jsonld(sess: Session, website: str) -> list[dict]:
    """Fetch homepage + common product pages, extract JSON-LD Product data."""
    burl = base_url(website)
    paths_to_try = [
        "", "/products", "/solutions", "/platform",
        "/vehicles", "/energy", "/lineup",
    ]
    products: list[dict] = []
    seen_names: set[str] = set()

    for path in paths_to_try:
        url = burl + path
        soup = fetch_soup(sess, url, timeout=10)
        if not soup:
            continue
        found = extract_jsonld_products(soup)
        for p in found:
            key = re.sub(r"\W+", "", p["name"].lower())[:20]
            if key not in seen_names:
                seen_names.add(key)
                products.append(p)
        if len(products) >= 6:
            break

    log.info("JSON-LD: %d products", len(products))
    return products


# ─── Tier 3: Sitemap product discovery ───────────────────────────────────────
# URL path patterns that indicate an individual product page
PRODUCT_PATH_RE = re.compile(
    r"/(products?|solutions?|vehicles?|models?|lineup|"
    r"hardware|software|energy|devices?|scanners?|printers?|"
    r"computers?|tablets?)/[\w][\w\-\.]+",
    re.IGNORECASE,
)

# Skip utility / resource pages even if they're under /products
SKIP_PATH_RE = re.compile(
    r"\b(support|help|download|driver|manual|spec|faq|blog|news|"
    r"partner|press|career|about|contact|legal|privacy|login|"
    r"register|warranty|repair|service|dealer)\b",
    re.IGNORECASE,
)


def fetch_sitemap_urls(sess: Session, website: str, max_urls: int = 200) -> list[str]:
    """
    Recursively fetch sitemap.xml (and sitemap index) to collect page URLs.
    Returns a deduplicated, filtered list of product-like URLs.
    """
    burl = base_url(website)
    to_fetch: list[str] = []

    # Find sitemap location (robots.txt often declares it)
    try:
        r = sess.get(f"{burl}/robots.txt", timeout=8)
        if r.status_code == 200:
            for line in r.text.splitlines():
                if line.lower().startswith("sitemap:"):
                    sm = line.split(":", 1)[1].strip()
                    to_fetch.append(sm)
    except Exception:
        pass

    if not to_fetch:
        to_fetch = [
            f"{burl}/sitemap.xml",
            f"{burl}/sitemap_index.xml",
            f"{burl}/sitemap-products.xml",
        ]

    ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    all_urls: list[str] = []
    visited_sitemaps: set[str] = set()

    def process_sitemap(sm_url: str, depth: int = 0) -> None:
        if depth > 2 or sm_url in visited_sitemaps:
            return
        visited_sitemaps.add(sm_url)
        try:
            r = sess.get(sm_url, timeout=10)
            if r.status_code != 200:
                return
            root = ET.fromstring(r.content)

            # Sitemap index — recurse into sub-sitemaps
            for loc_el in root.findall(".//sm:sitemap/sm:loc", ns):
                loc = (loc_el.text or "").strip()
                if loc and any(kw in loc.lower() for kw in
                               ["product", "vehicle", "model", "hardware", "software"]):
                    process_sitemap(loc, depth + 1)

            # Regular URL entries
            for loc_el in root.findall(".//sm:url/sm:loc", ns):
                loc = (loc_el.text or "").strip()
                if loc:
                    all_urls.append(loc)
        except Exception as e:
            log.debug("Sitemap parse failed (%s): %s", sm_url, e)

    for sm in to_fetch:
        process_sitemap(sm)

    # Filter to product-like URLs
    product_urls: list[str] = []
    seen: set[str] = set()
    for url in all_urls:
        if url in seen:
            continue
        seen.add(url)
        path = urlparse(url).path
        if PRODUCT_PATH_RE.search(path) and not SKIP_PATH_RE.search(path):
            product_urls.append(url)

    log.info("Sitemap: found %d product URLs", len(product_urls))
    return product_urls[:max_urls]


def scrape_product_page(sess: Session, url: str, company: str) -> Optional[dict]:
    """
    Scrape a single product page for its name, description, and image.
    Tries JSON-LD first, then HTML meta / headings.
    """
    soup = fetch_soup(sess, url, timeout=10)
    if not soup:
        return None

    # 1. JSON-LD on the page
    jsonld = extract_jsonld_products(soup)
    if jsonld:
        return jsonld[0]

    # 2. HTML: <h1> as name, meta description, og:image
    h1 = soup.find("h1")
    if not h1:
        return None
    name = clean(h1.get_text())
    if len(name) < 2 or len(name) > 80:
        return None
    # Skip if the name is just the company name
    if name.lower().strip() == company.lower().strip():
        return None

    # description from meta
    meta_desc = ""
    for attr in [{"name": "description"}, {"property": "og:description"}]:
        tag = soup.find("meta", attrs=attr)
        if tag:
            meta_desc = clean(tag.get("content", ""))
            if meta_desc:
                break

    # image from og:image
    image_url: Optional[str] = None
    og = soup.find("meta", property="og:image")
    if og:
        src = og.get("content", "")
        if src and src.startswith("http"):
            # Only accept if not obviously a logo or favicon
            if not any(x in src.lower() for x in ["logo", "favicon", "icon", "sprite"]):
                image_url = src

    return {
        "name":        truncate(name, 60),
        "tagline":     truncate(meta_desc[:120], 120),
        "description": truncate(meta_desc, 400),
        "image_url":   image_url,
        "_score":      3,
        "_source":     "sitemap_page",
    }


def scrape_sitemap(sess: Session, website: str, company: str,
                   max_products: int = 10) -> list[dict]:
    """Discover product URLs via sitemap, then scrape each page."""
    urls = fetch_sitemap_urls(sess, website)
    if not urls:
        return []

    products: list[dict] = []
    seen: set[str] = set()

    for url in urls:
        if len(products) >= max_products:
            break
        result = scrape_product_page(sess, url, company)
        if not result:
            continue
        key = re.sub(r"\W+", "", result["name"].lower())[:20]
        if key in seen:
            continue
        seen.add(key)
        products.append(result)
        time.sleep(0.2)  # polite crawling

    log.info("Sitemap scrape: %d products", len(products))
    return products


# ─── Tier 4: Wikipedia named-product extraction ───────────────────────────────
WIKI_PRODUCT_SECTIONS = {
    "Products", "Products_and_services", "Services", "Product_line",
    "Product_lineup", "Software", "Applications", "Hardware",
    "Vehicles", "Models", "Electric_vehicles", "Energy_products",
    "Lineup", "Products_and_technologies", "Consumer_products",
    "Business_divisions", "Product_portfolio",
}

def _wiki_article(sess: Session, company: str) -> Optional[BeautifulSoup]:
    """Fetch the best-matching Wikipedia article for a company."""
    variants = [company, f"{company} Inc", f"{company} company"]
    for variant in variants:
        url = (
            "https://en.wikipedia.org/w/api.php"
            f"?action=query&list=search&srsearch={quote(variant)}"
            "&srlimit=5&format=json&srprop=title"
        )
        try:
            r = sess.get(url, timeout=8)
            r.raise_for_status()
            hits = r.json().get("query", {}).get("search", [])
        except Exception:
            continue

        for hit in hits:
            title = hit["title"]
            if "disambiguation" in title.lower():
                continue
            if company.lower().split()[0] not in title.lower():
                continue
            page_url = f"https://en.wikipedia.org/wiki/{quote(title.replace(' ', '_'))}"
            soup = fetch_soup(sess, page_url, timeout=10)
            if soup:
                # Check it's not a disambiguation page
                if not soup.find(id="disambigbox"):
                    log.info("Wikipedia article: %s", title)
                    return soup
    return None


def scrape_wikipedia(sess: Session, company: str) -> list[dict]:
    """Extract specific named products from a Wikipedia Products section."""
    soup = _wiki_article(sess, company)
    if not soup:
        return []

    products: list[dict] = []
    seen: set[str] = set()

    for heading in soup.find_all(["h2", "h3"]):
        span = heading.find("span", class_="mw-headline")
        if not span:
            continue
        section_id   = span.get("id", "")
        section_text = clean(span.get_text()).lower()

        # Match by ID or by loose text
        matched = (
            section_id in WIKI_PRODUCT_SECTIONS
            or any(s.lower().replace("_", " ") in section_text
                   for s in WIKI_PRODUCT_SECTIONS)
        )
        if not matched:
            continue

        log.info("Wikipedia section: '%s'", section_id or section_text)

        # Collect list items and paragraphs until next h2
        node = heading.find_next_sibling()
        while node and node.name != "h2":
            if node.name in ["ul", "ol"]:
                for li in node.find_all("li"):
                    # Extract bold text as the primary product name
                    bold = li.find(["b", "strong"])
                    if bold:
                        name = clean(bold.get_text())
                        rest = clean(li.get_text()).replace(name, "").strip(" –—:.,")
                        desc = rest
                    else:
                        text = clean(li.get_text())
                        if not text or len(text) < 2:
                            continue
                        # Split on dash / colon separators
                        for sep in (" – ", " — ", ": "):
                            if sep in text[:80]:
                                name, _, desc = text.partition(sep)
                                break
                        else:
                            # Use the whole first sentence as name
                            name = text.split(".")[0][:60]
                            desc = text

                    name = clean(name)[:60]
                    desc = clean(desc)[:400]
                    key  = re.sub(r"\W+", "", name.lower())[:20]
                    if len(name) < 2 or key in seen:
                        continue
                    seen.add(key)
                    products.append({
                        "name":        name,
                        "tagline":     truncate(desc[:120], 120) if desc else "",
                        "description": truncate(desc, 400) if desc else "",
                        "image_url":   None,
                        "_score":      2,
                        "_source":     "wikipedia",
                    })
            node = node.find_next_sibling()
        if products:
            break

    log.info("Wikipedia: %d products", len(products))
    return products[:12]


# ─── Tier 0: Curated known-product database ──────────────────────────────────
# For B2B enterprise companies whose websites are JS-heavy and web sources are
# unreliable (Zebra Technologies, Honeywell, etc.), we seed accurate named
# products with real descriptions. This is checked FIRST before any scraping.
# Keys are lowercased company-name substrings — partial match is intentional.
KNOWN_PRODUCTS: dict[str, list[dict]] = {

    "zebra": [
        {
            "name":        "TC22 Mobile Computer",
            "tagline":     "Affordable Android rugged handheld for the frontline workforce",
            "description": "The TC22 is a next-generation rugged Android handheld computer delivering enterprise-class performance at an accessible price. Featuring Wi-Fi 6E, a large 5.0\" display, and long-lasting battery life, it powers retail, hospitality, and light warehouse operations with reliability and speed.",
            "image_url":   None,
        },
        {
            "name":        "TC52 Mobile Computer",
            "tagline":     "Premium Android touch computer for demanding enterprise environments",
            "description": "The TC52 delivers superior performance with a 5.0\" Gorilla Glass display, Wi-Fi 6, and all-day battery life. Designed for healthcare, retail, and field service, it supports scanning, voice, and full enterprise mobility applications.",
            "image_url":   None,
        },
        {
            "name":        "MC9300 Handheld Computer",
            "tagline":     "Ultra-rugged Android handheld for industrial operations",
            "description": "The MC9300 is Zebra's ultimate ultra-rugged mobile computer, built for demanding warehouse, manufacturing, and transport environments. It features a pistol-grip form factor, long-range scanning, and the latest Android OS for high-throughput workflows.",
            "image_url":   None,
        },
        {
            "name":        "ZT610 Industrial Printer",
            "tagline":     "High-performance industrial label and barcode printer",
            "description": "The ZT610 is a high-performance industrial label printer designed for 24/7 manufacturing and distribution environments. With a 4.3\" colour touch display, Link-OS, and speeds up to 14 inches per second, it handles high-volume label printing with precision.",
            "image_url":   None,
        },
        {
            "name":        "ZD421 Desktop Printer",
            "tagline":     "Compact and versatile desktop label printer",
            "description": "The ZD421 is a compact, easy-to-use desktop label printer supporting direct thermal and thermal transfer printing. Ideal for healthcare, retail, and office environments, it features wireless connectivity and Link-OS manageability.",
            "image_url":   None,
        },
        {
            "name":        "DS2208 Handheld Scanner",
            "tagline":     "1D/2D corded barcode scanner for retail and healthcare",
            "description": "The DS2208 is a reliable, ergonomic corded barcode scanner that reads virtually all 1D and 2D barcodes, including damaged or poorly printed ones. Purpose-built for retail checkout, healthcare patient ID, and light manufacturing.",
            "image_url":   None,
        },
        {
            "name":        "ZB200 RFID Wristband Printer",
            "tagline":     "Dedicated wristband and label printer for healthcare",
            "description": "The ZB200 is a purpose-built wristband printer designed for healthcare facilities. It prints patient ID wristbands quickly and accurately at the point of care, reducing errors and improving patient safety.",
            "image_url":   None,
        },
        {
            "name":        "ET40 Enterprise Tablet",
            "tagline":     "Android enterprise tablet for retail and field operations",
            "description": "The ET40 is a rugged Android enterprise tablet delivering a large 8\" or 10\" display for workers who need more screen real estate. Designed for retail floor operations, warehouse management, and field service with optional scanning accessories.",
            "image_url":   None,
        },
    ],

    "honeywell scanning": [
        {"name": "Xenon XP 1950g Scanner",   "tagline": "Area-imaging 2D barcode scanner",              "description": "High-performance corded area-image scanner for retail and healthcare environments.", "image_url": None},
        {"name": "CK65 Mobile Computer",      "tagline": "Rugged Android handheld for the warehouse",   "description": "Honeywell's flagship rugged mobile computer for distribution and manufacturing.", "image_url": None},
        {"name": "CT47 Mobile Computer",      "tagline": "Ultra-rugged touch computer",                  "description": "Enterprise-grade Android handheld with advanced scanning and cellular connectivity.", "image_url": None},
        {"name": "PX940 Industrial Printer",  "tagline": "High-speed industrial label printer",          "description": "Industrial thermal label printer for demanding 24/7 production environments.", "image_url": None},
        {"name": "PM45 Industrial Printer",   "tagline": "Versatile mid-range industrial printer",       "description": "Mid-range industrial label printer with colour touchscreen and wireless connectivity.", "image_url": None},
    ],

    "datalogic": [
        {"name": "Falcon X4 Mobile Computer",   "tagline": "Rugged Windows/Android handheld",           "description": "High-performance rugged mobile computer for warehouse and logistics.", "image_url": None},
        {"name": "Memor 11 Mobile Computer",     "tagline": "Full-touch Android enterprise device",      "description": "Modern Android handheld with advanced imaging and enterprise connectivity.", "image_url": None},
        {"name": "PowerScan 9600 Scanner",       "tagline": "Industrial wireless barcode scanner",       "description": "Long-range wireless industrial scanner for manufacturing and distribution.", "image_url": None},
        {"name": "Gryphon I GFS4100 Scanner",    "tagline": "General-purpose 1D/2D scanner",            "description": "Reliable corded scanner for retail checkout and healthcare patient ID.", "image_url": None},
        {"name": "Magellan 3600VSi POS Scanner", "tagline": "Retail checkout omni-directional scanner",  "description": "High-performance bi-optical scanner for fast-paced supermarket checkouts.", "image_url": None},
    ],

    "salesforce": [
        {"name": "Sales Cloud",      "tagline": "CRM and sales automation platform",           "description": "Salesforce Sales Cloud is the world's #1 CRM, helping teams close deals faster with AI-powered insights, opportunity management, and forecasting.", "image_url": None},
        {"name": "Service Cloud",    "tagline": "Customer service and support platform",       "description": "Deliver personalised customer service at scale with AI, omnichannel routing, and a complete view of every customer interaction.", "image_url": None},
        {"name": "Marketing Cloud",  "tagline": "Digital marketing automation platform",       "description": "Create personalised customer journeys across email, mobile, social, and advertising with AI-driven insights.", "image_url": None},
        {"name": "Einstein AI",      "tagline": "AI layer across the Salesforce platform",     "description": "Salesforce Einstein embeds predictive and generative AI across every Salesforce product, surfacing insights and automating tasks.", "image_url": None},
        {"name": "Commerce Cloud",   "tagline": "Unified commerce for B2C and B2B",           "description": "Deliver seamless shopping experiences across web, mobile, social, and in-store with AI-powered personalisation.", "image_url": None},
        {"name": "Tableau",          "tagline": "Visual analytics and business intelligence",  "description": "Tableau helps people see and understand their data through interactive visual analytics and powerful dashboards.", "image_url": None},
    ],

    "microsoft": [
        {"name": "Microsoft 365",    "tagline": "Productivity and collaboration suite",        "description": "Microsoft 365 brings together Office apps, cloud storage, and communication tools like Teams and Outlook for individuals and organisations.", "image_url": None},
        {"name": "Azure",            "tagline": "Cloud computing platform and services",       "description": "Microsoft Azure is a comprehensive cloud platform offering over 200 products and cloud services across compute, storage, AI, and networking.", "image_url": None},
        {"name": "Microsoft Teams",  "tagline": "Chat, meetings, and collaboration",           "description": "Teams is Microsoft's hub for workplace communication, combining persistent chat, video meetings, file sharing, and app integrations.", "image_url": None},
        {"name": "Dynamics 365",     "tagline": "Business applications for ERP and CRM",      "description": "Dynamics 365 connects ERP and CRM capabilities in cloud applications for sales, service, finance, operations, and supply chain.", "image_url": None},
        {"name": "GitHub",           "tagline": "AI-powered developer platform",               "description": "GitHub is the world's leading platform for software development, hosting over 100 million developers with version control, CI/CD, and GitHub Copilot AI.", "image_url": None},
        {"name": "Power BI",         "tagline": "Business intelligence and data visualisation","description": "Power BI transforms data into rich interactive visuals, enabling anyone to create and share dashboards and reports across any device.", "image_url": None},
    ],

    "apple": [
        {"name": "iPhone 16 Pro",  "tagline": "Pro camera system with Apple Intelligence",    "description": "The iPhone 16 Pro features a titanium design, the A18 Pro chip, a 48MP Fusion Camera system, and Apple Intelligence for AI-powered features.", "image_url": None},
        {"name": "MacBook Pro",    "tagline": "Pro laptop with Apple silicon",                 "description": "MacBook Pro with M4 chips delivers exceptional performance, a stunning Liquid Retina XDR display, and all-day battery life for professional workflows.", "image_url": None},
        {"name": "iPad Pro",       "tagline": "The ultimate iPad experience",                  "description": "iPad Pro features M4 silicon, an Ultra Retina XDR OLED display, and Apple Pencil Pro support for creative and professional tasks.", "image_url": None},
        {"name": "Apple Watch Series 10", "tagline": "The most advanced Apple Watch",         "description": "Apple Watch Series 10 features a larger display, advanced health sensors including sleep apnea detection, and a thinner, lighter design.", "image_url": None},
        {"name": "AirPods Pro",    "tagline": "Active noise cancellation earbuds",            "description": "AirPods Pro deliver industry-leading Active Noise Cancellation, Personalised Spatial Audio, and a new H2 chip for immersive listening.", "image_url": None},
        {"name": "Mac mini",       "tagline": "Compact desktop with M4 chip",                 "description": "The new Mac mini with M4 and M4 Pro is the most powerful and affordable Mac, in the smallest Mac desktop design ever.", "image_url": None},
    ],

    "tesla": [
        {"name": "Model 3",         "tagline": "Affordable all-electric sedan",               "description": "Tesla Model 3 is the world's best-selling electric vehicle, combining long range, performance, and Autopilot in a sleek, aerodynamic sedan.", "image_url": None},
        {"name": "Model Y",         "tagline": "All-electric compact SUV",                    "description": "Model Y is Tesla's best-selling all-electric SUV, offering versatile seating for up to 7, long range, and full self-driving capability.", "image_url": None},
        {"name": "Model S",         "tagline": "Premium long-range electric sedan",           "description": "Model S delivers over 400 miles of range, Ludicrous acceleration to 60 mph in under 2 seconds, and an ultra-premium cabin experience.", "image_url": None},
        {"name": "Cybertruck",      "tagline": "All-electric utility truck",                  "description": "Cybertruck redefines the pickup truck with an ultra-hard stainless steel exoskeleton, up to 500+ miles of range, and 11,000+ lbs towing capacity.", "image_url": None},
        {"name": "Powerwall 3",     "tagline": "Home battery and solar energy system",        "description": "Powerwall 3 integrates solar inverter, battery storage, and backup power in a single unit, keeping your home powered during outages and reducing energy bills.", "image_url": None},
        {"name": "Megapack",        "tagline": "Utility-scale energy storage system",         "description": "Megapack is Tesla's largest battery product, enabling utility companies and developers to store renewable energy and deliver it to the grid at scale.", "image_url": None},
        {"name": "Model X",         "tagline": "All-electric SUV with Falcon Wing doors",    "description": "Model X offers the versatility of an SUV with seating for up to 7, distinctive Falcon Wing doors, and best-in-class cargo room.", "image_url": None},
        {"name": "Semi",            "tagline": "All-electric commercial truck",               "description": "Tesla Semi delivers 500 miles of range, megawatt charging, and massive savings in fuel and maintenance costs for commercial freight hauling.", "image_url": None},
    ],

    "amazon": [
        {"name": "Amazon Echo",   "tagline": "Smart speaker with Alexa",                      "description": "Amazon Echo family of smart speakers delivers rich sound, Alexa voice assistant, and smart home control in stylish designs for every room.", "image_url": None},
        {"name": "Kindle",        "tagline": "E-reader with glare-free display",              "description": "Kindle e-readers feature a glare-free, paper-like display, weeks of battery life, and access to millions of books in the world's largest digital library.", "image_url": None},
        {"name": "Amazon Fire TV", "tagline": "Streaming media player and smart TV",          "description": "Fire TV delivers fast 4K Ultra HD streaming, Alexa hands-free control, and access to 1 million+ movies and TV shows from major streaming services.", "image_url": None},
        {"name": "AWS",           "tagline": "Cloud computing and hosting services",          "description": "Amazon Web Services is the world's most comprehensive and broadly adopted cloud platform, offering over 200 fully featured services from data centres globally.", "image_url": None},
        {"name": "Ring",          "tagline": "Home security and smart doorbell",              "description": "Ring devices provide always-on home security with video doorbells, security cameras, and alarm systems connected to the Ring app.", "image_url": None},
    ],

    "google": [
        {"name": "Pixel 9 Pro",      "tagline": "Google's flagship AI-powered smartphone",   "description": "Pixel 9 Pro features the Tensor G4 chip, advanced computational photography with a 50MP main camera, and Google AI built in for on-device intelligence.", "image_url": None},
        {"name": "Google Workspace", "tagline": "Productivity and collaboration tools",       "description": "Google Workspace brings Gmail, Docs, Drive, Meet, and Calendar together in an integrated suite for businesses of all sizes.", "image_url": None},
        {"name": "Google Cloud",     "tagline": "Cloud computing and AI platform",            "description": "Google Cloud Platform provides reliable, scalable infrastructure, data analytics, machine learning, and AI services for enterprises worldwide.", "image_url": None},
        {"name": "Nest Hub",         "tagline": "Smart home display with Google Assistant",  "description": "Google Nest Hub is a smart home display with Sleep Sensing, Google Assistant, and a 7\" display for controlling your smart home and getting answers.", "image_url": None},
        {"name": "Gemini",           "tagline": "Google's most capable AI model",            "description": "Gemini is Google's most capable and general AI model, built natively multimodal, powering everything from Google Search to enterprise AI applications.", "image_url": None},
    ],

    "meta": [
        {"name": "Meta Quest 3",     "tagline": "Mixed reality headset",                     "description": "Meta Quest 3 is the most powerful Quest yet, featuring Meta's Snapdragon XR2 Gen 2, full colour passthrough, and high-resolution pancake lenses for mixed reality experiences.", "image_url": None},
        {"name": "Facebook",         "tagline": "Social networking platform",                 "description": "Facebook connects billions of people worldwide to share content, communicate, and build communities through posts, groups, Marketplace, and Messenger.", "image_url": None},
        {"name": "Instagram",        "tagline": "Photo and video sharing social network",     "description": "Instagram is the leading photo and video sharing platform with Reels, Stories, Live, and shopping features for creators, businesses, and consumers.", "image_url": None},
        {"name": "WhatsApp Business", "tagline": "Business messaging platform",              "description": "WhatsApp Business enables companies to communicate with customers at scale through messaging, catalogues, and automated workflows.", "image_url": None},
        {"name": "Threads",          "tagline": "Text-based social conversation app",         "description": "Threads is Meta's text-based conversation app, tightly integrated with Instagram, designed for real-time updates and public conversations.", "image_url": None},
    ],

    "nvidia": [
        {"name": "GeForce RTX 4090", "tagline": "Flagship consumer GPU for gaming and AI",  "description": "The GeForce RTX 4090 is NVIDIA's fastest consumer GPU, powered by Ada Lovelace, with 24GB GDDR6X and DLSS 3 for gaming and creative workloads.", "image_url": None},
        {"name": "H100 Tensor Core GPU", "tagline": "Data centre GPU for AI training",       "description": "The NVIDIA H100 is the world's leading AI training and inference GPU, powering the largest language models and deep learning workloads.", "image_url": None},
        {"name": "DGX H200",         "tagline": "AI supercomputer for enterprise",           "description": "NVIDIA DGX H200 is purpose-built for generative AI, featuring 8 H200 GPUs with HBM3e memory for training frontier AI models at enterprise scale.", "image_url": None},
        {"name": "Jetson Orin",      "tagline": "Edge AI computing module",                  "description": "NVIDIA Jetson Orin is the world's most powerful edge AI platform for robotics, autonomous machines, and embedded computing at the edge.", "image_url": None},
        {"name": "CUDA Platform",    "tagline": "Parallel computing platform and API",       "description": "CUDA is NVIDIA's parallel computing platform enabling developers to dramatically accelerate computing applications using GPU power.", "image_url": None},
    ],
}

def lookup_known_products(company: str) -> list[dict]:
    """
    Check the curated database for a company.
    Uses substring matching so 'Zebra Technologies' matches key 'zebra'.
    Returns list of product dicts (or empty list if not found).
    """
    company_lower = company.lower()
    for key, products in KNOWN_PRODUCTS.items():
        # The key is a substring of the normalised company name
        if key in company_lower or company_lower in key:
            log.info("Known-products Tier 0 match: '%s' → key '%s' (%d products)",
                     company, key, len(products))
            out: list[dict] = []
            for p in products:
                out.append({
                    **p,
                    "_score":  10,
                    "_source": "known_db",
                })
            return out
    return []


# ─── Tier 5: Synthetic fallback ───────────────────────────────────────────────
SYNTHETIC_BY_INDUSTRY: dict[str, list[dict]] = {
    "automotive": [
        {"name": "Electric Vehicle", "tagline": "Zero-emission passenger vehicle"},
        {"name": "Energy Storage",   "tagline": "Home and grid-scale battery system"},
        {"name": "Charging Network", "tagline": "Fast-charging infrastructure"},
    ],
    "scanner": [
        {"name": "Handheld Scanner",   "tagline": "Barcode and RFID scanning device"},
        {"name": "Mobile Computer",    "tagline": "Enterprise-grade rugged handheld"},
        {"name": "Industrial Printer", "tagline": "Label and barcode printing solution"},
    ],
    "software": [
        {"name": "Core Platform",   "tagline": "Enterprise software platform"},
        {"name": "Analytics Suite", "tagline": "Data insights and reporting"},
        {"name": "API Platform",    "tagline": "Connect any system with ease"},
    ],
    "finance": [
        {"name": "Payment Processing", "tagline": "Accept payments online and in-store"},
        {"name": "Risk Management",    "tagline": "Fraud detection and compliance"},
        {"name": "Financial Analytics","tagline": "Real-time financial intelligence"},
    ],
    "default": [
        {"name": "Core Product",      "tagline": "Flagship product offering"},
        {"name": "Enterprise Suite",  "tagline": "Solutions for large organisations"},
        {"name": "Developer Platform","tagline": "APIs and integration tools"},
    ],
}

def synthetic_products(company: str, category: str) -> list[dict]:
    c = category.lower()
    if any(k in c for k in ["vehicle", "auto", "car", "transport", "electric"]):
        key = "automotive"
    elif any(k in c for k in ["scanner", "printer", "hardware", "device", "equipment", "zebra"]):
        key = "scanner"
    elif any(k in c for k in ["software", "saas", "tech", "cloud", "ai", "platform"]):
        key = "software"
    elif any(k in c for k in ["finance", "bank", "payment", "fintech"]):
        key = "finance"
    else:
        key = "default"

    results = []
    for p in SYNTHETIC_BY_INDUSTRY[key]:
        results.append({
            "name":        p["name"],
            "tagline":     p["tagline"],
            "description": f"{p['name']} by {company}. {p['tagline']}.",
            "image_url":   None,
            "_score":      0,
            "_source":     "synthetic",
        })
    log.info("Synthetic fallback: %d products (industry=%s)", len(results), key)
    return results


# ─── Deduplication ────────────────────────────────────────────────────────────
def deduplicate(products: list[dict]) -> list[dict]:
    seen: set[str] = set()
    out:  list[dict] = []
    for p in products:
        key = re.sub(r"[^a-z0-9]", "", p["name"].lower())[:20]
        if key and key not in seen:
            seen.add(key)
            out.append(p)
    return out


# ─── Final enrichment ─────────────────────────────────────────────────────────
def enrich(products: list[dict], company: str) -> list[dict]:
    enriched = []
    for i, p in enumerate(products):
        category = infer_category(p["name"], p.get("description", ""), p.get("tagline", ""))
        tagline  = p.get("tagline") or f"{company} {p['name']}"
        desc     = p.get("description") or f"{p['name']} is a product by {company}."

        enriched.append({
            "name":        p["name"],
            "tagline":     truncate(tagline, 120),
            "description": truncate(desc, 400),
            "category":    category,
            "cat_color":   get_color(category),
            "use_cases":   get_use_cases(category),
            "customers":   [],
            "competitors": [],
            "image_url":   p.get("image_url"),
            "sort_order":  i,
            "_score":      p.get("_score", 1),
            "_source":     p.get("_source", "unknown"),
        })
    return enriched


# ─── Main orchestrator ────────────────────────────────────────────────────────
def scrape_products(company: str, website: str,
                    timeout: int = DEFAULT_TIMEOUT,
                    company_category: str = "") -> list[dict]:
    sess = Session(timeout=timeout)
    all_products: list[dict] = []

    log.info("=== Scraping products for: %s (%s) ===", company, website)

    # Tier 0 — Curated known-product database (highest confidence, no web calls needed)
    # Covers well-known B2B/B2C companies whose sites are JS-heavy or search-blocked.
    known = lookup_known_products(company)
    if known:
        all_products.extend(known)
        log.info("Tier 0 curated: %d products (skipping web scrapers)", len(all_products))
        # Best-effort: also pull Wikidata images and merge into known products by name key
        try:
            wd = scrape_wikidata(sess, company)
            wd_by_key: dict[str, Optional[str]] = {
                re.sub(r"[^a-z0-9]", "", wp["name"].lower())[:15]: wp["image_url"]
                for wp in wd if wp.get("image_url")
            }
            for p in all_products:
                if not p.get("image_url"):
                    k = re.sub(r"[^a-z0-9]", "", p["name"].lower())[:15]
                    if k in wd_by_key:
                        p["image_url"] = wd_by_key[k]
        except Exception:
            pass
    else:
        # Tier 1 — Wikidata (highest accuracy for named products + P18 images)
        try:
            wd = scrape_wikidata(sess, company)
            all_products.extend(wd)
        except Exception as e:
            log.warning("Wikidata failed: %s", e)

        # Tier 2 — Yahoo web search (works for both B2C and B2B, no CAPTCHA)
        # Key source for specific product names like Zebra TC22, MC9300, ZT610
        if len(all_products) < 4:
            try:
                search_results = scrape_search(sess, company, website)
                all_products.extend(search_results)
            except Exception as e:
                log.warning("Yahoo search failed: %s", e)

        # Tier 3 — JSON-LD schema.org from company website
        if len(all_products) < 4:
            try:
                jl = scrape_jsonld(sess, website)
                all_products.extend(jl)
            except Exception as e:
                log.warning("JSON-LD failed: %s", e)

        # Tier 4 — Sitemap product page discovery
        if len(all_products) < 4:
            try:
                sm = scrape_sitemap(sess, website, company)
                all_products.extend(sm)
            except Exception as e:
                log.warning("Sitemap scrape failed: %s", e)

        # Tier 5 — Wikipedia named-product section
        if len(all_products) < 4:
            try:
                wp = scrape_wikipedia(sess, company)
                all_products.extend(wp)
            except Exception as e:
                log.warning("Wikipedia failed: %s", e)

    # Tier 6 — Synthetic fallback (guaranteed result)
    is_synthetic = False
    if len(all_products) < 1:
        log.info("All sources failed — using synthetic fallback")
        all_products = synthetic_products(company, company_category)
        is_synthetic = True

    # Sort → deduplicate → cap at 8
    all_products.sort(key=lambda x: x.get("_score", 0), reverse=True)
    deduped = deduplicate(all_products)[:8]
    enriched = enrich(deduped, company)

    # Fetch CC-licensed images only for non-synthetic products.
    # Synthetic products have generic names like "Core Product" or "Enterprise Suite"
    # that produce wrong, unrelated images from Wikimedia (e.g., White Stripes band photo
    # for "Stripe Core Product"). Skip image search entirely for synthetic results.
    if not is_synthetic:
        log.info("Fetching free images from Wikimedia...")
        for p in enriched:
            if not p.get("image_url"):
                img = get_free_image(sess, p["name"], company, p["category"])
                if img:
                    p["image_url"] = img
    else:
        log.info("Skipping Wikimedia image fetch for synthetic fallback products")

    log.info("Final: %d products", len(enriched))
    return enriched


# ─── Supabase writer ──────────────────────────────────────────────────────────
def push_products_to_supabase(company_id: str, products: list[dict],
                               auth_token: str) -> bool:
    supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
    anon_key     = os.environ.get("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "")
    service_key  = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    bearer       = service_key or auth_token
    api_key      = service_key or anon_key

    if not supabase_url or not bearer:
        log.warning("Supabase credentials not available — skipping direct write")
        return False

    headers = {
        "apikey":        api_key,
        "Authorization": f"Bearer {bearer}",
        "Content-Type":  "application/json",
        "Prefer":        "return=minimal",
    }
    table = f"{supabase_url}/rest/v1/company_products"

    try:
        requests.delete(
            table, headers=headers,
            params={"company_id": f"eq.{company_id}"},
            timeout=15,
        ).raise_for_status()

        rows = [
            {
                "company_id":  company_id,
                "name":        p["name"],
                "tagline":     p["tagline"],
                "description": p["description"],
                "category":    p["category"],
                "cat_color":   p["cat_color"],
                "use_cases":   p["use_cases"],
                "customers":   p["customers"],
                "competitors": p["competitors"],
                "image_url":   p.get("image_url"),
                "sort_order":  p["sort_order"],
            }
            for p in products
        ]
        requests.post(table, headers=headers, json=rows, timeout=15).raise_for_status()
        log.info("Pushed %d products for company %s", len(products), company_id)
        return True
    except Exception as e:
        log.error("Supabase write error: %s", e)
        return False


def revalidate_company_profile(app_url: str, company_id: str) -> None:
    try:
        requests.post(
            f"{app_url.rstrip('/')}/api/revalidate-company",
            json={"companyId": company_id},
            timeout=8,
        )
        log.info("Revalidation sent for %s", company_id)
    except Exception as e:
        log.warning("Revalidation failed (non-fatal): %s", e)


# ─── Supabase Storage uploader ────────────────────────────────────────────────
def upload_product_image(company_id: str, product_slug: str,
                          image_url_val: str, auth_token: str) -> Optional[str]:
    """Download a CC-licensed image and store it permanently in Supabase Storage."""
    supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
    anon_key     = os.environ.get("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "")
    service_key  = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    bearer       = service_key or auth_token
    api_key      = service_key or anon_key

    if not supabase_url or not bearer:
        return None

    try:
        r = requests.get(image_url_val, headers=HEADERS, timeout=20, allow_redirects=True)
        r.raise_for_status()
        ct = r.headers.get("content-type", "image/jpeg").split(";")[0].strip()
        if ct not in {"image/jpeg", "image/png", "image/webp", "image/gif"}:
            ct = "image/jpeg"
        data = r.content
    except Exception as e:
        log.warning("Image download failed (%s): %s", image_url_val, e)
        return None

    ext = {"image/jpeg": "jpg", "image/png": "png",
           "image/webp": "webp", "image/gif": "gif"}.get(ct, "jpg")
    file_path = f"{company_id}/{product_slug}.{ext}"
    upload_url = f"{supabase_url}/storage/v1/object/product-images/{file_path}"

    try:
        resp = requests.put(
            upload_url, data=data,
            headers={"apikey": api_key, "Authorization": f"Bearer {bearer}",
                     "Content-Type": ct, "x-upsert": "true", "Cache-Control": "3600"},
            timeout=30,
        )
        resp.raise_for_status()
        return f"{supabase_url}/storage/v1/object/public/product-images/{file_path}"
    except Exception as e:
        log.error("Storage upload failed: %s", e)
        return None


# ─── CLI entry-point ──────────────────────────────────────────────────────────
def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--company",    required=True)
    parser.add_argument("--website",    required=True)
    parser.add_argument("--timeout",    type=int, default=DEFAULT_TIMEOUT)
    parser.add_argument("--company-id", default=None)
    parser.add_argument("--auth-token", default=None)
    parser.add_argument("--app-url",    default=None)
    parser.add_argument("--category",   default="",
                        help="Company category hint for synthetic fallback")
    args = parser.parse_args()

    company  = args.company.strip()
    website  = args.website.strip()

    if not company or not website:
        print(json.dumps({"error": "company and website are required"}))
        sys.exit(1)

    products = scrape_products(company, website,
                               timeout=args.timeout,
                               company_category=args.category)

    if not products:
        print(json.dumps({"error": f"No products found for {company}"}))
        sys.exit(2)

    if args.company_id:
        # Persist images to Supabase Storage
        if args.auth_token:
            for p in products:
                if p.get("image_url") and p["image_url"].startswith("http"):
                    slug = re.sub(r"[^a-z0-9]+", "-", p["name"].lower()).strip("-")
                    stored = upload_product_image(
                        args.company_id, slug, p["image_url"], args.auth_token
                    )
                    if stored:
                        p["image_url"] = stored

        written = push_products_to_supabase(args.company_id, products, args.auth_token or "")
        if written and args.app_url:
            revalidate_company_profile(args.app_url, args.company_id)
        print(json.dumps({"count": len(products), "written": written}, ensure_ascii=False))
    else:
        clean_out = [{k: v for k, v in p.items() if not k.startswith("_")} for p in products]
        print(json.dumps(clean_out, ensure_ascii=False, indent=2))

    sys.exit(0)


if __name__ == "__main__":
    main()
