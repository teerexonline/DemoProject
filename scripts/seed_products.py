#!/usr/bin/env python3
"""
ResearchOrg Product Seeder v4.1
================================
Scrapes products exclusively from the official company website navbar.

Discovery flow (mirrors what a human does):
  Step 1  Fetch the company homepage
  Step 2  Scan nav/header for any element (a, button, span, li…) whose text
          matches product section keywords: "Products", "Hardware", "Software",
          "Solutions", "Platform", "Tools", "Product", "Apps", …
  Step 3  Walk up the DOM from that element to find its dropdown container,
          then collect all product links inside that container
  Step 4  Also follow any <a href> entry-points (products overview pages) and
          collect product links from those pages too
  Step 5  Fetch each product page → extract name, tagline, description, og:image
  Step 6  Synthetic fallback — only if zero products were found from the website

No third-party sources: no Wikidata, no Wikipedia, no sitemaps, no search engines.

Usage:
  python seed_products.py --company "Canva" --website "canva.com"
  python seed_products.py --company "Notion" --website "notion.so"
  python seed_products.py --company "OpenAI" --website "openai.com"
  python seed_products.py --company "Canva" --website "canva.com" \\
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
from typing import Optional
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

# Playwright is optional — used automatically when a page appears JS-rendered.
# Install: pip install playwright && python -m playwright install chromium
try:
    from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout
    _PLAYWRIGHT_AVAILABLE = True
except ImportError:
    _PLAYWRIGHT_AVAILABLE = False

# Threshold: if requests returns fewer links than this, assume JS-rendered
_JS_RENDER_THRESHOLD = 10

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
    d = (p.netloc or p.path).lstrip("www.")
    return d.split(":")[0]  # strip port

def base_url(website: str) -> str:
    return f"https://{domain_of(website)}"

_NAV_TRIGGER_RE = re.compile(
    r"^(products?(\s*[&+]\s*services?)?|solutions?|hardware|software|platform|"
    r"tools?|services?|apps?|systems?|simulation|training|devices?|technologies?)$",
    re.IGNORECASE,
)

_BROWSER_ARGS = [
    "--disable-blink-features=AutomationControlled",
    "--no-sandbox",
    "--disable-dev-shm-usage",
]
_BROWSER_INIT_SCRIPT = """
    Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
    Object.defineProperty(navigator, 'plugins', {get: () => [1, 2, 3, 4, 5]});
    Object.defineProperty(navigator, 'languages', {get: () => ['en-US', 'en']});
    window.chrome = {runtime: {}};
"""

# Phrases that indicate a bot-challenge interstitial is showing
_CHALLENGE_PHRASES = ("just a moment", "access denied", "checking your",
                      "enable cookies", "ddos-guard", "please wait",
                      "your connection", "before we continue")


def _page_is_challenge(page) -> bool:
    """True if the rendered page looks like a bot-challenge interstitial."""
    try:
        title  = page.title().lower()
        body   = page.inner_text("body")[:300].lower() if page.query_selector("body") else ""
        nlinks = len(page.query_selector_all("a"))
        return nlinks < 6 or any(p in title or p in body for p in _CHALLENGE_PHRASES)
    except Exception:
        return False


class BrowserSession:
    """
    A reusable Playwright browser session.

    Opens Chromium ONCE and reuses it for every page fetch in the same scrape,
    avoiding the ~15-30 s startup penalty per page.

    Key anti-bot measures applied to every page:
    • --disable-blink-features=AutomationControlled (bypasses Cloudflare JS challenge)
    • navigator.webdriver = undefined  (masks headless detection)
    • navigator.plugins / languages / window.chrome patched

    Usage:
        with BrowserSession() as bs:
            html = bs.render(url, hover_nav=True)
    """

    def __init__(self) -> None:
        self._pw      = None
        self._browser = None
        self._ctx     = None
        self._active  = False

    def __enter__(self) -> "BrowserSession":
        if not _PLAYWRIGHT_AVAILABLE:
            return self
        try:
            self._pw      = sync_playwright().__enter__()
            self._browser = self._pw.chromium.launch(
                headless=True, args=_BROWSER_ARGS
            )
            self._ctx = self._browser.new_context(
                user_agent=UA,
                viewport={"width": 1440, "height": 900},
                locale="en-US",
                timezone_id="America/New_York",
                extra_http_headers={"Accept-Language": "en-US,en;q=0.9"},
            )
            self._active = True
            log.info("Playwright browser started")
        except Exception as e:
            log.warning("Could not start Playwright browser: %s", e)
        return self

    def __exit__(self, *_) -> None:
        try:
            if self._browser:
                self._browser.close()
            if self._pw:
                self._pw.__exit__(None, None, None)
        except Exception:
            pass
        self._active = False

    def render(
        self,
        url: str,
        timeout_s: int = 20,
        hover_nav: bool = False,
    ) -> Optional[str]:
        """
        Render *url* in a new tab and return the final HTML.

        • Waits up to 8 extra seconds for Cloudflare / bot-challenge pages to
          self-resolve (the JS challenge auto-completes after 1-3 s).
        • If hover_nav=True, hovers over product-keyword nav triggers so that
          React/Vue dropdown menus are injected into the DOM before we capture
          the HTML.
        """
        if not self._active or not self._ctx:
            return None
        page = self._ctx.new_page()
        try:
            page.add_init_script(_BROWSER_INIT_SCRIPT)
            try:
                page.goto(url, wait_until="domcontentloaded",
                          timeout=timeout_s * 1000)
            except PWTimeout:
                pass

            # Initial settle
            page.wait_for_timeout(1500)

            # Wait for any bot-challenge interstitial to self-resolve
            if _page_is_challenge(page):
                log.info("Challenge page detected, waiting up to 8 s…")
                for _ in range(8):
                    page.wait_for_timeout(1000)
                    if not _page_is_challenge(page):
                        log.info("Challenge resolved")
                        break

            # Hover-collected nav links (captured while each dropdown is open)
            hover_anchors: list[str] = []  # raw "<a href='...' data-text='...'/>" snippets

            if hover_nav:
                for sel in ["nav button", "nav a", "header button", "header a",
                            "nav li", "header li"]:
                    for el in page.query_selector_all(sel)[:40]:
                        try:
                            txt = (el.inner_text() or "").strip()
                            if _NAV_TRIGGER_RE.search(txt) and len(txt) < 30:
                                el.hover()
                                page.wait_for_timeout(600)
                                log.debug("Playwright hover: '%s'", txt)
                                # Capture all currently-visible links (dropdown open)
                                try:
                                    visible = page.evaluate(
                                        """() => Array.from(document.querySelectorAll('a[href]'))
                                            .filter(a => a.offsetParent !== null)
                                            .map(a => ({
                                                href: a.getAttribute('href'),
                                                text: (a.innerText || a.textContent || '').trim().split('\n')[0].trim().slice(0, 80)
                                            }))
                                            .filter(l => l.href && !l.href.startsWith('#'))
                                        """
                                    )
                                    for item in visible:
                                        href = item.get("href", "") or ""
                                        text = item.get("text", "") or ""
                                        if href:
                                            hover_anchors.append(
                                                f'<a href="{href}">{text}</a>'
                                            )
                                except Exception:
                                    pass
                        except Exception:
                            pass

            # Build final HTML — inject hover-collected links into a hidden div
            html = page.content()
            if hover_anchors:
                injection = (
                    '\n<div id="_hover_nav_links" style="display:none">'
                    + "".join(set(hover_anchors))
                    + "</div>"
                )
                html = html.replace("</body>", injection + "\n</body>", 1)
            return html
        except Exception as e:
            log.debug("BrowserSession.render failed (%s): %s", url, e)
            return None
        finally:
            try:
                page.close()
            except Exception:
                pass


def fetch_soup_static(sess: Session, url: str, timeout: int = 14) -> Optional[BeautifulSoup]:
    """
    Fetch via requests only — returns None instead of falling through to
    Playwright.  Used inside the nav scraper where a BrowserSession handles
    JS rendering explicitly.
    """
    try:
        r = sess.get(url, timeout=timeout)
        if r.status_code == 200:
            return BeautifulSoup(r.text, "html.parser")
    except Exception as e:
        log.debug("fetch_soup_static failed (%s): %s", url, e)
    return None


def fetch_soup(
    sess: Session,
    url: str,
    timeout: int = 14,
    browser: Optional["BrowserSession"] = None,
) -> Optional[BeautifulSoup]:
    """
    Fetch and parse a page.

    • First tries requests (fast, no overhead).
    • If the response looks like a JS shell (< _JS_RENDER_THRESHOLD links)
      AND a BrowserSession is provided, re-fetches with the shared browser.
    """
    html: Optional[str] = None
    try:
        r = sess.get(url, timeout=timeout)
        if r.status_code == 200:
            html = r.text
    except Exception as e:
        log.debug("requests failed (%s): %s", url, e)

    if html:
        quick_soup = BeautifulSoup(html, "html.parser")
        if len(quick_soup.find_all("a")) >= _JS_RENDER_THRESHOLD:
            return quick_soup          # static HTML is rich enough

    # Page appears JS-rendered
    if browser and browser._active:
        log.info("JS page — rendering with browser: %s", url)
        rendered = browser.render(url, timeout_s=max(timeout, 20))
        if rendered:
            soup = BeautifulSoup(rendered, "html.parser")
            log.info("Browser rendered %d links on %s", len(soup.find_all("a")), url)
            return soup

    return BeautifulSoup(html, "html.parser") if html else None


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
    (r"design|creative|canvas|template|visual",                                             "Design"),
    (r"video|animation|film|clip|reel",                                                     "Video"),
    (r"presentation|slide|deck|pitch",                                                       "Presentations"),
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
    "Design":           "#F97316",
    "Video":            "#EF4444",
    "Presentations":    "#8B5CF6",
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
    "Design":           ["Graphic Design", "Brand Assets", "Social Media Visuals"],
    "Video":            ["Video Editing", "Animations", "Short-Form Content"],
    "Presentations":    ["Pitch Decks", "Team Meetings", "Sales Presentations"],
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


# ─── URL / nav helpers ────────────────────────────────────────────────────────

# Elements whose DIRECT text matches these keywords are product-section triggers.
NAV_PRODUCT_RE = re.compile(
    r"^(products?(\s*[&+]\s*services?)?|solutions?|hardware|software|platform|"
    r"tools?|services?|apps?|capabilities|offerings?|suite|systems?|"
    r"simulation|training|devices?|what we (offer|make|build|do)|"
    r"our products?|all products?|product (portfolio|catalog|line)|"
    r"technology|technologies)$",
    re.IGNORECASE,
)

# Texts / path segments that are clearly NOT product pages
NAV_SKIP_RE = re.compile(
    r"\b(pricing|plans?|about|blog|docs?|documentation|support|help|careers?|jobs?|"
    r"company|login|sign\s?in|sign\s?up|get\s?started|contact|press|legal|privacy|"
    r"terms|security|partners?|news|resources?|customers?|case\s?studies?|events?|"
    r"downloads?|community|forum|changelog|releases?|status|affiliate|referral|"
    r"investors?|media|brand|guidelines|api\s+reference|sdk\s+docs?|"
    r"research|safety|trust|governance|charter|policies?|stories?|"
    r"responsibility|sustainability|diversity|inclusion|ethics|compliance|"
    r"newsroom|leadership|overview|residency|fellowship|grant|"
    r"developers?|livestreams?|for\s+science|for\s+education|for\s+startups?|"
    r"integrations?|templates?|champions|marketplace)\b",
    re.IGNORECASE,
)

SKIP_PATH_RE = re.compile(
    r"/(pricing|plans?|about|blog|news|press|support|help|careers?|jobs?|contact|"
    r"legal|privacy|terms|security|login|logout|sign-?in|sign-?up|signup|register|"
    r"partners?|docs?|documentation|community|forum|changelog|releases?|status|"
    r"customers?|case-studies?|events?|webinar|podcast|newsletter|affiliate|"
    r"referral|investors?|media|brand|guidelines|downloads?|resources?|"
    r"industry|industries|shop|goto|use-?cases?|verticals?|sectors?|"
    r"whitepapers?|analyst-reports?|datasheets?|brochures?|"
    r"my-[a-z]+|account|profile|preferences|settings|auth|ext|"
    r"content/dam|knowledge-?base|vision-?academy|recall|warranty|"
    r"safeguard|supply-chain|spec-?sheets?|spec-guides?|accessories/"
    r"|supplies/|supply/|mac-does-that|compare|comparison|switch-from|"
    r"why-apple|apple-trade-in|financing|gift-cards?|store-pickup|"
    r"retail|stores?(?:/[a-z])|"
    r"os/macos|os/ios|os/ipados|os/watchos|os/tvos|os/visionos|"
    r"macos/|ios/|ipados/|watchos/|tvos/|visionos/|"
    r"feature-availability|icloud|apple-pay|health|fitness|"
    r"apple-intelligence|apple-vision|accessibility|"
    r"apple-card|apple-pay|apple-cash|apple-account|"
    r"apple-tv-plus|apple-fitness|apple-arcade|apple-music|"
    r"icloud|find-my|airtag|cellular|privacy|batteries?|battery\.html|appleid|"
    r"choose-country|theftandloss|environment|"
    r"today|switch|camp|r/store|sitemap|"
    r"research|safety|trust|governance|charter|policies?|stories?|"
    r"responsibility|sustainability|diversity|inclusion|ethics|compliance|"
    r"newsroom|livestream|residency|fellowship|grant|scholarship|"
    r"leadership|board|executive|team|investor|stakeholder|"
    r"developers?|developer-forum|for-science|for-education|for-startups|"
    r"guides?|library|reports?|articles?|perspectives?|"
    r"lp|annual-updates?|press-releases?|webinars?|demos?|"
    r"integrations?|templates?|champions|marketplace|"
    r"students?|email-protection|notion-champions|"
    r"tools?|affiliates?|theme-?store|themes?|free-trial|trial|migrate|editions?|"
    r"channels?|sell|selling)\b",
    re.IGNORECASE,
)

# URL patterns that strongly suggest a product catalogue page
PRODUCT_PATH_RE = re.compile(
    r"/(products?|solutions?|hardware|software|devices?|scanners?|printers?|"
    r"computers?|tablets?|rfid|mobile|enterprise|platform|vehicles?|energy|"
    r"features?|capabilities)(/|\.html|$)",
    re.IGNORECASE,
)

# Generic navigation chrome — not product names
GENERIC_LINK_TEXT_RE = re.compile(
    r"^(learn more|get started|try (it )?free|sign up|log in|view all|see all|visit theme|view details?|"
    r"all (versions?|reviews?|plans?|features?|options?|templates?)|"
    r"explore|read more|find out|discover|start (for )?free|get (a )?demo|"
    r"watch (a )?demo|contact (us|sales)|request (a )?demo|book (a )?demo|"
    r"overview|home|back|next|more|all products|all solutions|all magic studio|"
    r"shop( now| all)?|buy( now)?|order( now)?|register( now)?|register here|"
    r"click here|download|subscribe|newsletter|follow us|share|print|email|"
    r"spec(ification)? sheet|data ?sheet|brochure|white ?paper|"
    r"(learn|find out|see|discover|explore) (how|more|what|why)|"
    r"here.s how|view (all|table|services?|our|the)|check (product|if)|add to|"
    r"go to|go back|bookmark|search the|"
    r"read (the|a|our|this|more) .{0,40}|get (the|a|our|this|free) .{0,40}|"
    r"see (the|a|our|this|all) .{0,40}|try (it|for|free|now)|"
    r"watch( the| a)? .{0,30}|listen to|attend( the)?|"
    r"start (your|a|the|now)|join (the|now|us|our)|talk to( us| sales| an?)?|"
    r"access (the|your|our|free))$",
    re.IGNORECASE,
)


# Subdomains that host non-product services — skip these entirely
_SKIP_SUBDOMAIN_RE = re.compile(
    r"^(auth|login|sso|id|accounts?|portal|pi|app|apps|support|mysupport|"
    r"supportcommunity|community|help|status|online|cdn|static|"
    r"media|assets?|content|images?|files?|mktg|marketing|"
    r"email|mail|news|blog|jobs|careers?|press|ir|"
    r"fitness|health|wallet|pay|maps|music|tv|arcade|"
    r"books|podcasts|subscriptions?|developer|discussions?|docs?|"
    r"privacy|legal|compliance|security|trust|terms|themes?)$",
    re.IGNORECASE,
)


def _same_domain(url: str, website: str) -> bool:
    d1 = domain_of(url)
    d2 = domain_of(website)
    if d1 == d2:
        return True
    # Allow product subdomains but reject non-product subdomains
    if d1.endswith("." + d2):
        subdomain = d1[: -(len(d2) + 1)]
        return not _SKIP_SUBDOMAIN_RE.match(subdomain)
    return d2.endswith("." + d1)


# Locale-like path prefix: /us/en/, /gb/en/, /de/de/, etc.
# Also matches /cn/zh.html (locale IS the path)
_LOCALE_PATH_RE = re.compile(r"^/([a-z]{2})/([a-z]{2})(?:/|\.html|$)", re.IGNORECASE)


def _locale_prefix(url: str) -> str:
    """Return the locale prefix (e.g. '/us/en') if present, else ''."""
    m = _LOCALE_PATH_RE.match(urlparse(url).path)
    return f"/{m.group(1)}/{m.group(2)}" if m else ""


_SKIP_EXTENSIONS = re.compile(
    r"\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|tar|gz|mp4|mp3|"
    r"jpg|jpeg|png|gif|svg|webp|ico|woff|woff2|ttf|eot)$",
    re.IGNORECASE,
)


def _valid_product_url(url: str, website: str, required_locale: str = "") -> bool:
    if not url or not url.startswith("http"):
        return False
    if not _same_domain(url, website):
        return False
    path = urlparse(url).path
    if not path or path == "/":
        return False
    if SKIP_PATH_RE.search(path):
        return False
    if _SKIP_EXTENSIONS.search(path):
        return False
    # Skip B2B/enterprise top-level sections and Apple store/redirect paths
    if re.match(r"^/(business|enterprise|education|government|r/store)/", path, re.IGNORECASE):
        return False
    # Skip Apple education/regional store paths
    if re.match(r"^/[a-z]{2}-[a-z]{2,3}/store", path, re.IGNORECASE):
        return False
    # Block locale/country-code path prefixes.
    # Any 2-char (or 2+2-char hyphenated) path prefix is treated as a locale indicator
    # (e.g. /de/, /fr/, /jp/, /kr/, /be-fr/).
    # Allow /us/ (Zebra uses /us/en/) and /en/ or /en-*/ (Stripe uses /en-ca/).
    if re.match(r"^/(?!us(?:/|$)|en(?:/|$|-))[a-z]{2}(?:-[a-z]{2})?(?:/|$|\?)", path, re.IGNORECASE):
        return False
    # Also block non-English locale pages signalled by ?lang= or ?locale= query params
    qs = urlparse(url).query
    if re.search(r"[?&]lang=(?!en(?:$|[^a-z]))([a-z]{2,5})", qs, re.IGNORECASE):
        return False
    if re.search(r"[?&]locale=(?!en[-_]?(?:us|gb|au|ca|$))([a-z]{2})", qs, re.IGNORECASE):
        return False
    # If a locale prefix is required (e.g. '/us/en'), reject paths in other locales
    if required_locale:
        lp = _locale_prefix(url)
        if lp and lp != required_locale:
            return False
    return True


def _el_direct_text(el) -> str:
    return clean(" ".join(t for t in el.strings if t.strip())[:120])


def _nav_containers(soup: BeautifulSoup):
    """
    Return navigation-like containers from the page.
    Checks <nav>, <header>, role=navigation, and common nav class patterns.
    Falls back to the full document.
    """
    found = (
        soup.find_all("nav") +
        soup.find_all("header") +
        soup.find_all(attrs={"role": "navigation"}) +
        soup.find_all(True, class_=re.compile(r"\bnav\b|\bnavbar\b|\bnavigation\b", re.I))
    )
    return found if found else [soup]


def _clean_nav_link_text(text: str, url: str) -> str:
    """
    Repair nav link text that may have a concatenated tagline appended.

    Some JS-rendered navs (e.g. Notion) render inline spans without whitespace:
        <a><span>Notion AI</span><span>AI tools for work</span></a>
    → innerText = "Notion AIAI tools for work"  (no newline, no space)

    Heuristic: if the text contains a lowercase→uppercase transition buried
    inside a "word" (e.g. "NotionYour", "AgentsAutomate"), split there and
    take only the first part.  If that still looks bad, fall back to
    deriving a name from the URL path segment.
    """
    # Detect "wordWord" concatenation: lowercase letter immediately followed by uppercase
    # e.g. "NotionYour AI workspace" → "Notion", "AgentsAutomate busywork" → "Agents"
    # NOT: "OpenAI" (remainder "AI" is an acronym suffix, not a new phrase)
    # Only split when the remainder looks like a full English phrase (has spaces, or
    # starts with a pronoun/article that begins a new clause).
    _PHRASE_START_RE = re.compile(
        r"^(your|the|a |an |it |is |are |for |to |with |in |on |at |by |now |"
        r"build|create|manage|run|use|make|try|find|see|get|all )",
        re.IGNORECASE,
    )
    m = re.search(r"([a-z])([A-Z])", text)
    if m:
        remainder = text[m.start() + 1:].strip()
        if " " in remainder or _PHRASE_START_RE.match(remainder):
            candidate = text[: m.start() + 1].strip()
            if 2 <= len(candidate) <= 60:
                return candidate

    # Detect repeated uppercase abbreviation: e.g. "AIAI" → group(1)="AI" repeating
    m2 = re.search(r"([A-Z]{2,})\1", text)
    if m2:
        candidate = text[: m2.start() + len(m2.group(1))].strip()
        if 2 <= len(candidate) <= 60:
            return candidate

    # If text is unusually long and has mid-text capitalization, fall back to path
    if len(text) > 30:
        path_seg = urlparse(url).path.rstrip("/").split("/")[-1]
        if path_seg and len(path_seg) >= 2:
            return path_seg.replace("-", " ").replace("_", " ").title()

    return text


# ─── Nav discovery ────────────────────────────────────────────────────────────

def find_nav_product_links(
    soup: BeautifulSoup,
    homepage_url: str,
    website: str,
    required_locale: str = "",
) -> tuple[list[tuple[str, str]], list[str]]:
    """
    Two-pass nav discovery:

    Pass A — trigger-based (Canva, Notion, Zebra pattern)
      Find any element in nav whose DIRECT text matches product section keywords
      ("Products", "Hardware", "Software", …), then collect all links from the
      parent dropdown container.

    Pass B — fallback for direct-product navs (Apple pattern)
      If Pass A yields nothing, collect every non-skip nav-level <a href> as a
      product candidate (handles navs where "Mac", "iPad", "iPhone" are the tabs).

    Pass C — product-path fallback (Zebra static HTML, Tesla alternative)
      If the nav contains almost no links (blocked homepage), scan the whole page
      for URLs with product-catalogue path patterns (/products/, /hardware/, etc.).

    Returns:
      direct_links  — (text, url) pairs from the nav (highest confidence)
      follow_urls   — entry-point hrefs to visit for more product links
    """
    from collections import deque as _deque   # local import to avoid top-level dep

    direct_links: list[tuple[str, str]] = []
    follow_urls:  list[str]             = []
    seen_links:   set[str]              = set()
    seen_follow:  set[str]              = set()

    nav_areas = _nav_containers(soup)

    # ── Pass A: trigger-based ────────────────────────────────────────────────
    for area in nav_areas:
        for el in area.find_all(["a", "button", "span", "li", "div", "p"]):
            text = _el_direct_text(el)
            if not text or not NAV_PRODUCT_RE.search(text):
                continue

            log.info("Nav trigger: <%s> '%s'", el.name, text)

            if el.name == "a":
                href = (el.get("href") or "").strip()
                if href and not href.startswith("#") and "javascript" not in href.lower():
                    abs_url = urljoin(homepage_url, href)
                    if _same_domain(abs_url, website) and abs_url not in seen_follow:
                        follow_urls.append(abs_url)
                        seen_follow.add(abs_url)
                        log.info("  follow: %s", abs_url)

            # Walk up to the best dropdown container
            parent, best, best_cnt = el.parent, el.parent, 0
            for _ in range(8):
                if not parent or parent.name in ("body", "html"):
                    break
                cnt = sum(
                    1 for a in parent.find_all("a", href=True)
                    if _valid_product_url(urljoin(homepage_url, a.get("href", "")),
                                         website, required_locale)
                )
                if cnt > best_cnt:
                    best, best_cnt = parent, cnt
                if cnt >= 6:
                    break
                parent = parent.parent

            if best_cnt < 2:
                continue

            for a in best.find_all("a", href=True):
                href = (a.get("href") or "").strip()
                if not href or href.startswith("#") or "javascript" in href.lower():
                    continue
                abs_url = urljoin(homepage_url, href)
                if not _valid_product_url(abs_url, website, required_locale):
                    continue
                link_text = clean(a.get_text())
                if not link_text or GENERIC_LINK_TEXT_RE.match(link_text):
                    continue
                if len(link_text) > 80:
                    continue
                link_text = _clean_nav_link_text(link_text, abs_url)
                if not link_text or GENERIC_LINK_TEXT_RE.match(link_text):
                    continue
                if NAV_SKIP_RE.search(link_text):
                    continue
                if abs_url in seen_links:
                    continue
                seen_links.add(abs_url)
                direct_links.append((link_text, abs_url))
                log.debug("  nav link: [%s]", link_text)

    # ── Pass B: direct-product nav fallback (Apple) ─────────────────────────
    if not direct_links and not follow_urls:
        log.info("No triggers found — trying direct nav-link fallback (Apple-style)")
        for area in nav_areas:
            for a in area.find_all("a", href=True):
                href = (a.get("href") or "").strip()
                if not href or href.startswith("#") or "javascript" in href.lower():
                    continue
                abs_url = urljoin(homepage_url, href)
                if not _valid_product_url(abs_url, website, required_locale):
                    continue
                link_text = clean(a.get_text())
                if not link_text or GENERIC_LINK_TEXT_RE.match(link_text):
                    continue
                if NAV_SKIP_RE.search(link_text) or len(link_text) > 80:
                    continue
                if abs_url in seen_links:
                    continue
                seen_links.add(abs_url)
                direct_links.append((link_text, abs_url))
        log.info("Direct nav fallback: %d links", len(direct_links))

    # ── Pass C: product-path scan (Zebra static HTML / blocked homepage) ─────
    if not direct_links and not follow_urls:
        log.info("No nav links — scanning full page for /products/ path links")
        for a in soup.find_all("a", href=True):
            href = (a.get("href") or "").strip()
            abs_url = urljoin(homepage_url, href)
            if not _valid_product_url(abs_url, website, required_locale):
                continue
            if not PRODUCT_PATH_RE.search(urlparse(abs_url).path):
                continue
            link_text = clean(a.get_text())
            if not link_text or len(link_text) > 80:
                link_text = urlparse(abs_url).path.rstrip("/").split("/")[-1].replace("-", " ").title()
            if abs_url in seen_links:
                continue
            seen_links.add(abs_url)
            direct_links.append((link_text, abs_url))
        log.info("Product-path scan: %d links", len(direct_links))

    log.info("Nav discovery: %d links, %d follow URLs", len(direct_links), len(follow_urls))
    return direct_links, follow_urls


# ─── Collect product links from a products overview / landing page ─────────────

def collect_product_links_from_page(
    soup: BeautifulSoup,
    page_url: str,
    website: str,
    required_locale: str = "",
) -> list[tuple[str, str]]:
    """
    From a products overview page (e.g. /products, /solutions), collect all
    individual product page links.

    Excludes links inside <nav> and <header> elements to avoid counting
    site-wide navigation (e.g. Apple's top nav on every page) as product
    sub-links of the current page.
    """
    links: list[tuple[str, str]] = []
    seen:  set[str]              = set()

    # Build a set of anchor elements that live inside nav/header — we'll skip these.
    _nav_anchors: set = set()
    for container in soup.find_all(["nav", "header"]):
        for a in container.find_all("a", href=True):
            _nav_anchors.add(id(a))

    for a in soup.find_all("a", href=True):
        if id(a) in _nav_anchors:
            continue  # skip global navigation links
        href = (a.get("href") or "").strip()
        if not href or href.startswith("#") or "javascript" in href.lower():
            continue
        abs_url = urljoin(page_url, href)
        if not _valid_product_url(abs_url, website, required_locale):
            continue
        if abs_url.rstrip("/") == page_url.rstrip("/"):
            continue
        if abs_url in seen:
            continue
        text = clean(a.get_text())
        if not text or GENERIC_LINK_TEXT_RE.match(text) or len(text) > 80:
            continue
        if NAV_SKIP_RE.search(text):
            continue
        seen.add(abs_url)
        links.append((text, abs_url))

    log.info("  Links collected from overview page: %d", len(links))
    return links


# Reject bot-challenge / marketing-copy product names (module-level for reuse)
_BAD_NAME_RE = re.compile(
    r"(enable javascript|checking your|access denied|just a moment|"
    r"please wait|ddos.guard|before we continue|peace of mind|"
    r"view device|group reservation|switch from android|today at apple|"
    r"government purchase|education pricing|purchase program|"
    r"page not found|404|403 forbidden|500 internal|400 bad request|bad request|"
    r"log in|log out|sign in|sign out|log into|made easy)",
    re.IGNORECASE,
)


# ─── Extract product data from an individual product page ─────────────────────

def extract_product_from_page(
    soup: BeautifulSoup,
    link_text: str,
    company: str,
) -> Optional[dict]:
    """
    Extract product data from an already-fetched BeautifulSoup page.
      - name        (og:title > h1 > link_text)
      - tagline     (h2/subtitle > first sentence of description)
      - description (meta description > og:description > first paragraph)
      - image_url   (og:image)
    """
    # ── Name ──────────────────────────────────────────────────────────────────
    name = ""

    # og:title is often the cleanest product name
    og_title = soup.find("meta", property="og:title")
    if og_title:
        name = clean(og_title.get("content", ""))

    if not name:
        h1 = soup.find("h1")
        if h1:
            name = clean(h1.get_text())

    if not name:
        name = link_text

    # Strip " | Company Name" suffix and leading "Company Name -" prefix
    for sep in [" | ", " - ", " — ", " – ", " · ", ": "]:
        if sep in name:
            parts = name.split(sep)
            # Keep the part that is NOT the company name
            for part in parts:
                stripped = part.strip()
                if (stripped.lower() not in {company.lower(),
                                              company.lower() + " inc",
                                              company.lower() + " llc"}
                        and len(stripped) > 2):
                    name = stripped
                    break

    name = name.strip()
    if len(name) < 2 or len(name) > 80:
        name = link_text  # fall back to the nav link label

    # ── Description ───────────────────────────────────────────────────────────
    desc = ""

    meta_desc = soup.find("meta", attrs={"name": "description"})
    if meta_desc:
        desc = clean(meta_desc.get("content", ""))

    if not desc:
        og_desc = soup.find("meta", property="og:description")
        if og_desc:
            desc = clean(og_desc.get("content", ""))

    if not desc:
        # Walk the page looking for the first substantial paragraph
        for p in soup.find_all("p"):
            t = clean(p.get_text())
            if len(t) > 60:
                desc = t
                break

    # ── Tagline ───────────────────────────────────────────────────────────────
    tagline = ""

    # Try h2 / subtitle heading first
    for tag in ["h2", "h3"]:
        el = soup.find(tag)
        if el:
            t = clean(el.get_text())
            if 5 < len(t) <= 120 and t.lower() not in {"overview", "features", "pricing"}:
                tagline = t
                break

    if not tagline and desc:
        # Use first sentence of description as tagline
        first_sentence = desc.split(".")[0].strip()
        if 10 < len(first_sentence) <= 120:
            tagline = first_sentence

    # ── Image ─────────────────────────────────────────────────────────────────
    image_url = None
    og_img = soup.find("meta", property="og:image")
    if og_img:
        raw = og_img.get("content", "").strip()
        if raw.startswith("http"):
            image_url = raw

    if not name or len(name) < 2:
        return None

    # Pure numbers (e.g. HTTP error codes "404") are not product names
    if re.match(r"^\d+$", name.strip()):
        return None

    # Names with pricing/rating info (e.g. "Theme Name $400 93%") — marketplace items
    if re.search(r"\$\d+|\d+%", name):
        return None

    def _name_is_bad(n: str) -> bool:
        """True when n looks like marketing copy rather than a product name."""
        if _BAD_NAME_RE.search(n):
            return True
        if n.endswith(".") and " " in n:
            return True
        if re.match(r"^accept\s+\w", n, re.IGNORECASE):
            return True
        if re.match(r"^your\s", n, re.IGNORECASE):
            return True
        if re.match(
            r"^(send|create|build|get|use|make|try|see|learn|find|start|manage|run|"
            r"collect|process|generate|automate|streamline|discover|transform|meet|"
            r"free up|join|connect|launch|deploy|scale|grow|save|boost|track|"
            r"sell|how to|work with|partner with|explore|read|watch|listen|"
            r"introducing|announcing|welcome to|download|get free|buy|order|"
            r"log in|log out|sign out|contact|request|pay|across|beyond|"
            r"reach|boost your|grow your|scale your|open your|install|"
            r"ship|visit|enable|configure|upgrade|activate|get your|"
            r"integrate|sync|migrate|import|export|embed)\s",
            n, re.IGNORECASE
        ):
            return True
        # Names ending in " Features", " Management", " Automation" are sub-category pages
        if re.search(r"\s+(features?|management|automation|tools?)\s*$", n, re.IGNORECASE):
            return True
        # Social media platforms and language names used as "product names"
        _NOT_PRODUCTS = {
            "youtube", "tiktok", "facebook", "instagram", "twitter", "x", "linkedin",
            "pinterest", "snapchat", "whatsapp", "english", "deutsch", "français",
            "español", "italiano", "português", "online", "global", "analytics",
            "discounts", "integrations", "extensions", "settings",
        }
        if n.lower().strip() in _NOT_PRODUCTS:
            return True
        if re.search(r"\bintegrations?\s*$", n, re.IGNORECASE):
            return True
        if re.search(r"\btemplates?\s*$", n, re.IGNORECASE) and " " in n.strip():
            return True
        if re.search(
            r"\bfor\s+(engineering|enterprise|education|students?|teams?|startups?|"
            r"business|government|sales|marketing|design|hr|legal|finance|product|"
            r"developers?|individuals?|personal)\b",
            n, re.IGNORECASE
        ):
            return True
        if re.search(r"\b(enterprise|professional)\s+\w+\s+software\b", n, re.IGNORECASE):
            return True
        # Single-word audience/department/generic labels are not product names
        _AUDIENCE_WORDS = {
            "enterprise", "education", "design", "marketing", "engineering",
            "finance", "legal", "sales", "operations", "government",
            "healthcare", "personal", "application", "solutions", "services",
            "features", "capabilities", "overview", "platform", "open",
            "workspace", "console", "dashboard", "portal", "tools",
        }
        if len(n.split()) == 1 and n.lower() in _AUDIENCE_WORDS:
            return True
        # Audience segment phrases: "Small businesses", "Eng & Product", "Apply to access →"
        if re.search(r"small\s+businesses?|apply\s+to\s+access|eng\s+[&+]", n, re.IGNORECASE):
            return True
        # Marketing copy patterns: "your way", "any business"
        if re.search(r"\byour\s+way\b|\bany\s+business\b", n, re.IGNORECASE):
            return True
        # Comparison pages: "X vs Y"
        if re.search(r"\bvs\.?\s+\w|\bversus\b", n, re.IGNORECASE):
            return True
        # Article-started descriptions (≥5 words): "A financial account optimized for..."
        if re.match(r"^(a|an|the)\s+\w+\s+\w+\s+\w+\s+\w+", n, re.IGNORECASE):
            return True
        if re.search(r"\b(flexible|scalable|powerful|robust|comprehensive|advanced),?\s+"
                     r".{0,40}\b(tool|platform|suite|solution)\b", n, re.IGNORECASE):
            return True
        if " and " in n and len(n.split()) >= 5:
            parts = n.split(" and ", 1)
            lw = parts[0].strip().split()[0].lower() if parts[0].strip() else ""
            rw = parts[1].strip().split()[0].lower() if len(parts) > 1 and parts[1].strip() else ""
            if lw != rw:
                return True
        return False

    # "Accept X" payment method guide pages — hard reject, no link_text fallback
    if re.match(r"^accept\s+", name, re.IGNORECASE):
        return None

    # For other marketing-copy titles, try the nav link text as fallback
    # (e.g. Notion AI page has "Meet your AI team" as title → fall back to "AI")
    if _name_is_bad(name):
        link_clean = clean(link_text) if link_text else ""
        # Link text must start with a capital (proper noun) and pass all name checks
        if (link_clean and 2 <= len(link_clean) <= 60
                and link_clean[0].isupper()
                and not _name_is_bad(link_clean)):
            name = link_clean
        else:
            return None

    # Reject if the name is just the company name (no product info added)
    if name.lower().strip() == company.lower().strip():
        return None

    return {
        "name":        truncate(name, 60),
        "tagline":     truncate(tagline, 120) if tagline else "",
        "description": truncate(desc, 400) if desc else "",
        "image_url":   image_url,
        "_score":      5,
        "_source":     "website_navbar",
    }


# ─── Listing-page detector ────────────────────────────────────────────────────

def _is_listing_page(
    soup: BeautifulSoup,
    page_url: str,
    website: str,
    threshold: int = 4,
    required_locale: str = "",
) -> bool:
    """
    Heuristic: does this page list/showcase multiple products (category page)
    rather than describe a single product?

    Returns True when the page has ≥ threshold outgoing same-domain,
    non-skip links that are deeper in the path hierarchy — suggesting it
    is a product grid / catalogue.

    Example True  : /mac/  (lists MacBook Air, MacBook Pro, iMac, …)
    Example True  : /vehicles/ (lists Model 3, Model Y, Cybertruck, …)
    Example False : /macbook-air/ (single product page — few sub-links)
    Example False : /visual-suite/ (Canva product feature page)
    """
    page_depth = len([p for p in urlparse(page_url).path.split("/") if p])
    links = collect_product_links_from_page(soup, page_url, website, required_locale)

    # Only count sub-links that go deeper than this page (avoid counting sibling nav)
    deeper_links = [
        url for _, url in links
        if len([p for p in urlparse(url).path.split("/") if p]) > page_depth
    ]
    # For shallow pages (depth ≤ 1, e.g. apple.com/mac/), same-depth sibling pages
    # (e.g. /macbook-pro/) are valid product sub-pages — use all links.
    # For deeper pages, only count links that go deeper (avoids nav-bar noise).
    if page_depth <= 1:
        check_links = links  # include sibling links for root-level category pages
    else:
        check_links = deeper_links if page_depth > 0 else links
    return len(check_links) >= threshold


# ─── Main navbar scraper ──────────────────────────────────────────────────────

# Common product-page paths to probe when the homepage is blocked
_PROBE_PATHS = [
    "/products", "/products/", "/solutions", "/solutions/",
    "/hardware", "/hardware/", "/software", "/software/",
    "/vehicles", "/vehicles/", "/energy", "/energy/",
    "/features", "/features/", "/platform", "/platform/",
    "/product-catalog", "/product-catalog/",
    # Tesla individual model pages (direct access since homepage blocks)
    "/model3", "/modely", "/modelx", "/models", "/cybertruck", "/semi", "/roadster",
    # Generic vehicle/product paths
    "/cars", "/lineup", "/collection",
]

# Per-company extra probe paths used when the generic probes fail
_COMPANY_PROBE_PATHS: dict[str, list[str]] = {
    "tesla": ["/model3", "/modely", "/modelx", "/models", "/cybertruck",
              "/semi", "/roadster", "/powerwall", "/megapack", "/solarpanels"],
    "apple": ["/mac/", "/iphone/", "/ipad/", "/watch/", "/airpods/"],
    "cae":   ["/en/", "/civil-aviation/", "/defence/", "/healthcare/",
              "/simulation-training/"],
}


def scrape_nav_products(
    sess: Session,
    company: str,
    website: str,
    max_products: int = 40,
    max_time_s: int = 200,
) -> list[dict]:
    """
    Full navbar-first product scraper with BFS drilling.

    Phase 1 — Homepage discovery
      • Static sites  → requests (fast)
      • JS sites      → single Playwright browser, homepage rendered with nav hover
      • Blocked home  → probe common product paths as entry-points

    Phase 2 — Collect candidates
      • nav trigger + dropdown links  (Canva, Notion, OpenAI)
      • direct nav-level links         (Apple: Mac, iPad, iPhone, …)
      • /products/ path scan           (Zebra static HTML)
      • follow any entry-point hrefs   (additional overview pages)

    Phase 3 — BFS drilling (max depth 2)
      • Visit each candidate URL
      • If the page is a listing/category (≥ 4 product sub-links), drill in
      • Otherwise extract as individual product (h1, og:title, meta desc, og:image)

    One BrowserSession is shared across ALL page fetches — only launched once.
    """
    import time as _time
    from collections import deque

    _scrape_start = _time.monotonic()

    def _time_left() -> float:
        return max(0.0, max_time_s - (_time.monotonic() - _scrape_start))

    burl = base_url(website)
    log.info("=== scrape_nav_products: %s (%s) ===", company, burl)

    with BrowserSession() as browser:

        # ── Phase 1: load the homepage ────────────────────────────────────────
        static_soup = fetch_soup_static(sess, burl, timeout=14)
        is_static   = static_soup and len(static_soup.find_all("a")) >= _JS_RENDER_THRESHOLD

        if is_static:
            homepage_soup = static_soup
            log.info("Static HTML: %d links", len(static_soup.find_all("a")))
        else:
            log.info("JS site — rendering with nav hover")
            html = browser.render(burl, timeout_s=20, hover_nav=True)
            homepage_soup = BeautifulSoup(html, "html.parser") if html else None

        # If homepage is completely blocked (Tesla etc.) probe common paths
        co_key = company.lower().split()[0]  # e.g. "tesla" from "Tesla Inc"
        # Probe pages that were loaded directly (each may be a product page itself)
        probe_direct_candidates: list[tuple[str, str]] = []

        if not homepage_soup or len(homepage_soup.find_all("a")) < 5:
            log.warning("Homepage blocked — probing product paths")
            homepage_soup = None
            probe_list = _COMPANY_PROBE_PATHS.get(co_key, []) + _PROBE_PATHS
            _probe_start = time.time()
            _probe_max = 8          # stop after this many successful + failed attempts
            _probe_attempts = 0
            for path in probe_list:
                if _probe_attempts >= _probe_max or (time.time() - _probe_start) > 60:
                    log.info("Probe limit reached — stopping")
                    break
                _probe_attempts += 1
                probe_url = base_url(website) + path
                probe_html = browser.render(probe_url, timeout_s=20) if browser._active else None
                if probe_html:
                    probe_soup = BeautifulSoup(probe_html, "html.parser")
                    n_links = len(probe_soup.find_all("a"))
                    if n_links >= 5:
                        log.info("Probe succeeded: %s (%d links)", probe_url, n_links)
                        if homepage_soup is None:
                            # Use first successful probe as the "homepage" for nav discovery
                            homepage_soup = probe_soup
                            burl = probe_url
                        # Also queue it directly as a product candidate
                        path_name = path.strip("/").replace("-", " ").title() or company
                        probe_direct_candidates.append((path_name, probe_url))

        if not homepage_soup:
            log.warning("Could not load any page for %s", website)
            return []

        # ── Phase 2: collect candidate product links ──────────────────────────
        # First pass: no locale restriction so we can auto-detect it
        direct_links, follow_urls = find_nav_product_links(
            homepage_soup, burl, website
        )

        # If static-HTML nav only found category-level links (e.g. Apple /mac/, /ipad/),
        # OR found nothing at all (e.g. Stripe — JS-only nav despite 100+ static links),
        # try a Playwright hover render to capture product models from CSS-hover dropdowns.
        _need_hover = False
        if is_static and browser._active:
            if not direct_links and not follow_urls:
                # No links at all from static HTML nav — site likely uses JS-only dropdown
                _need_hover = True
                log.info("No nav links from static HTML — trying Playwright hover render")
            elif direct_links and not follow_urls:
                _depths = [len([p for p in urlparse(u).path.split("/") if p]) for _, u in direct_links]
                _shallow = sum(1 for d in _depths if d <= 1)
                if _shallow >= len(_depths) * 0.6:
                    _need_hover = True
                    log.info("Category-only nav — trying Playwright hover to reveal product dropdowns")
        if _need_hover:
            hover_html = browser.render(burl, timeout_s=20, hover_nav=True)
            if hover_html:
                hover_soup = BeautifulSoup(hover_html, "html.parser")
                hover_links, hover_follows = find_nav_product_links(
                    hover_soup, burl, website
                )
                if len(hover_links) > len(direct_links) or hover_follows:
                    log.info("Playwright hover found %d links, %d follows (vs %d static)",
                             len(hover_links), len(hover_follows), len(direct_links))
                    direct_links = hover_links
                    follow_urls  = hover_follows

        # Auto-detect locale from the first batch of nav links.
        # E.g. Zebra nav links all start with /us/en/ — pick the most common prefix.
        locale = _locale_prefix(burl)  # start from homepage URL
        if not locale:
            from collections import Counter as _Counter
            locale_counts: _Counter = _Counter()
            for _, u in (direct_links + [(None, f) for f in follow_urls]):
                lp = _locale_prefix(u)
                if lp:
                    locale_counts[lp] += 1
            if locale_counts:
                locale = locale_counts.most_common(1)[0][0]

        if locale:
            log.info("Locale prefix detected: %s — restricting BFS to same locale", locale)
            # Re-filter direct_links and follow_urls to the detected locale
            direct_links = [
                (t, u) for t, u in direct_links
                if not _locale_prefix(u) or _locale_prefix(u) == locale
            ]
            follow_urls = [
                u for u in follow_urls
                if not _locale_prefix(u) or _locale_prefix(u) == locale
            ]

        extra_links: list[tuple[str, str]] = []
        for ep_url in follow_urls[:5]:
            log.info("Following entry-point: %s", ep_url)
            ep_soup = fetch_soup(sess, ep_url, timeout=10, browser=browser)
            if ep_soup:
                extra_links.extend(
                    collect_product_links_from_page(ep_soup, ep_url, website,
                                                    required_locale=locale)
                )
            time.sleep(0.2)

        all_candidates: list[tuple[str, str]] = []
        seen_urls: set[str] = set()
        for text, url in direct_links + extra_links + probe_direct_candidates:
            if url not in seen_urls:
                seen_urls.add(url)
                all_candidates.append((text, url))

        if not all_candidates:
            log.warning("No product links found for %s", website)
            return []

        log.info("%d candidate links before BFS", len(all_candidates))

        # ── Phase 3: BFS drilling ─────────────────────────────────────────────
        # Each queue item: (link_text, url, depth)
        # depth=0 items come from the nav; listing pages at depth<2 are drilled.
        queue: deque = deque(
            (text, url, 0) for text, url in all_candidates[:80]
        )
        visited_pages = set(url for _, url in all_candidates)
        products:    list[dict] = []
        seen_names:  set[str]   = set()

        while queue and len(products) < max_products:
            if _time_left() < 5:
                log.warning("Time budget exhausted (%.0fs) — stopping BFS with %d products",
                            max_time_s, len(products))
                break

            link_text, prod_url, depth = queue.popleft()

            log.info("  [d%d] Fetching: [%s] %s", depth, link_text, prod_url)
            prod_soup = fetch_soup(sess, prod_url, timeout=10, browser=browser)
            if not prod_soup:
                continue

            # Drill into category / listing pages (up to depth 3)
            is_listing = _is_listing_page(prod_soup, prod_url, website,
                                          required_locale=locale)

            # If static HTML shows no product sub-links on a non-leaf page, try
            # browser rendering — the product cards may be JS-rendered (e.g. Zebra, Apple).
            if not is_listing and depth < 3 and browser._active:
                page_path_depth = len([p for p in urlparse(prod_url).path.split("/") if p])
                static_sub_links = collect_product_links_from_page(
                    prod_soup, prod_url, website, required_locale=locale
                )
                deeper_static = [
                    u for _, u in static_sub_links
                    if len([p for p in urlparse(u).path.split("/") if p]) > page_path_depth
                ]
                # Trigger JS render for deep category pages (Zebra-style sites) where
                # product cards are JS-rendered and static HTML has few deeper links.
                _should_js = (len(deeper_static) < 4 and page_path_depth >= 3)
                if _should_js and _time_left() > 15:
                    log.info("  → few content links in static HTML, trying JS render")
                    js_html = browser.render(prod_url, timeout_s=12)
                    if js_html:
                        js_soup = BeautifulSoup(js_html, "html.parser")
                        if _is_listing_page(js_soup, prod_url, website,
                                            required_locale=locale):
                            prod_soup = js_soup
                            is_listing = True

            if is_listing and depth < 3:
                sub_links = collect_product_links_from_page(
                    prod_soup, prod_url, website, required_locale=locale
                )
                log.info("  → listing page, drilling %d sub-links", len(sub_links))
                # Prioritise links that go DEEPER than the current page (more specific).
                # This ensures model pages (TC22, MC3400) are processed before nav links.
                _cur_path_d = len([p for p in urlparse(prod_url).path.split("/") if p])
                deeper_sub = [
                    (t, u) for t, u in sub_links
                    if len([p for p in urlparse(u).path.split("/") if p]) > _cur_path_d
                ]
                # For shallow pages (Apple /mac/ style), sibling pages (/macbook-pro/)
                # are at the same depth — include all links.
                # For deep pages (Zebra /handheld.html), prefer deeper model pages.
                if _cur_path_d <= 1:
                    priority_sub = sub_links  # include siblings for root-level pages
                else:
                    priority_sub = deeper_sub if len(deeper_sub) >= 3 else sub_links
                # Cap sub-links per listing to prevent one category flooding the queue
                # and starving other product families (e.g. Mac filling all slots before iPhone).
                _per_listing_cap = 8
                added = 0
                for sub_text, sub_url in priority_sub:
                    if added >= _per_listing_cap:
                        break
                    if sub_url not in visited_pages:
                        visited_pages.add(sub_url)
                        queue.appendleft((sub_text, sub_url, depth + 1))
                        added += 1
                continue

            # Extract product data from this page
            result = extract_product_from_page(prod_soup, link_text, company)
            if not result:
                continue

            name_key = re.sub(r"[^a-z0-9]", "", result["name"].lower())[:20]
            if name_key in seen_names:
                continue
            seen_names.add(name_key)
            products.append(result)
            log.info("  ✓ [d%d] %s", depth, result["name"])
            time.sleep(0.2)

    log.info("Navbar scrape complete: %d products for %s", len(products), company)
    return products


# ─── Synthetic fallback (last resort only) ────────────────────────────────────

_KNOWN_BLOCKED_PRODUCTS: dict[str, list[dict]] = {
    "tesla": [
        {"name": "Model 3",    "tagline": "Premium all-electric sedan with up to 358 miles range"},
        {"name": "Model Y",    "tagline": "Versatile all-electric SUV, world's best-selling vehicle"},
        {"name": "Model S",    "tagline": "Flagship luxury electric sedan with Plaid powertrain"},
        {"name": "Model X",    "tagline": "Premium electric SUV with distinctive Falcon Wing doors"},
        {"name": "Cybertruck", "tagline": "All-electric pickup truck built for durability and utility"},
        {"name": "Semi",       "tagline": "Electric commercial semi-truck for sustainable freight"},
        {"name": "Roadster",   "tagline": "Next-generation electric sports car for ultimate performance"},
        {"name": "Powerwall",  "tagline": "Home battery for energy storage and backup power"},
        {"name": "Megapack",   "tagline": "Utility-scale battery storage for grid energy"},
        {"name": "Solar Panels","tagline": "Low-profile solar energy system for homes"},
    ],
}


def synthetic_products(company: str, company_category: str = "") -> list[dict]:
    """
    Minimal fallback — only used when the website navbar scrape returns nothing.
    Produces generic placeholder products so the UI is never empty.
    """
    log.info("Using synthetic fallback for %s (category=%s)", company, company_category)

    # Company-specific known products for sites that block scraping
    co_key = company.lower().split()[0]
    if co_key in _KNOWN_BLOCKED_PRODUCTS:
        items = _KNOWN_BLOCKED_PRODUCTS[co_key]
        return [
            {
                "name":        p["name"],
                "tagline":     p["tagline"],
                "description": f"{p['name']} by {company}. {p['tagline']}.",
                "image_url":   None,
                "_score":      3,   # lower than scraped (5) but above generic (0)
                "_source":     "known_products",
            }
            for p in items
        ]

    c = company_category.lower()
    if any(k in c for k in ["vehicle", "auto", "car", "transport", "electric"]):
        items = [
            {"name": "Electric Vehicle",  "tagline": "Zero-emission passenger vehicle"},
            {"name": "Energy Storage",    "tagline": "Home and grid-scale battery system"},
            {"name": "Charging Network",  "tagline": "Fast-charging infrastructure"},
        ]
    elif any(k in c for k in ["scanner", "printer", "hardware", "device", "equipment"]):
        items = [
            {"name": "Handheld Scanner",   "tagline": "Barcode and RFID scanning device"},
            {"name": "Mobile Computer",    "tagline": "Enterprise-grade rugged handheld"},
            {"name": "Industrial Printer", "tagline": "Label and barcode printing solution"},
        ]
    elif any(k in c for k in ["finance", "bank", "payment", "fintech"]):
        items = [
            {"name": "Payment Processing", "tagline": "Accept payments online and in-store"},
            {"name": "Risk Management",    "tagline": "Fraud detection and compliance"},
            {"name": "Financial Analytics","tagline": "Real-time financial intelligence"},
        ]
    else:
        items = [
            {"name": "Core Platform",     "tagline": "Flagship product offering"},
            {"name": "Enterprise Suite",  "tagline": "Solutions for large organisations"},
            {"name": "Developer Platform","tagline": "APIs and integration tools"},
        ]

    return [
        {
            "name":        p["name"],
            "tagline":     p["tagline"],
            "description": f"{p['name']} by {company}. {p['tagline']}.",
            "image_url":   None,
            "_score":      0,
            "_source":     "synthetic",
        }
        for p in items
    ]


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
def scrape_products(
    company: str,
    website: str,
    timeout: int = DEFAULT_TIMEOUT,
    company_category: str = "",
    max_time_s: int = 200,
) -> list[dict]:
    sess = Session(timeout=timeout)
    log.info("=== Scraping products for: %s (%s) ===", company, website)

    # Primary source: official website navbar
    all_products: list[dict] = []
    try:
        all_products = scrape_nav_products(sess, company, website, max_time_s=max_time_s)
    except Exception as e:
        log.warning("Navbar scrape raised an exception: %s", e)

    # Last resort: synthetic placeholder products
    if not all_products:
        log.info("Navbar returned no products — falling back to synthetic")
        all_products = synthetic_products(company, company_category)

    all_products.sort(key=lambda x: x.get("_score", 0), reverse=True)
    deduped  = deduplicate(all_products)[:20]
    enriched = enrich(deduped, company)

    log.info("Final: %d products for %s", len(enriched), company)
    return enriched


# ─── Supabase writer ──────────────────────────────────────────────────────────
def push_products_to_supabase(
    company_id: str,
    products: list[dict],
    auth_token: str,
) -> bool:
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
def upload_product_image(
    company_id: str,
    product_slug: str,
    image_url_val: str,
    auth_token: str,
) -> Optional[str]:
    """Download a product og:image and store it permanently in Supabase Storage."""
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
    file_path  = f"{company_id}/{product_slug}.{ext}"
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
    parser = argparse.ArgumentParser(
        description="Scrape products from an official company website navbar."
    )
    parser.add_argument("--company",    required=True,  help="Company display name")
    parser.add_argument("--website",    required=True,  help="Company website (e.g. canva.com)")
    parser.add_argument("--timeout",    type=int, default=DEFAULT_TIMEOUT)
    parser.add_argument("--max-time",   type=int, default=200,
                        help="Total wall-clock budget in seconds for BFS scraping")
    parser.add_argument("--company-id", default=None,   help="Supabase company UUID")
    parser.add_argument("--auth-token", default=None,   help="Supabase auth JWT")
    parser.add_argument("--app-url",    default=None,   help="Next.js app URL for revalidation")
    parser.add_argument("--category",   default="",
                        help="Company category hint used only for synthetic fallback")
    args = parser.parse_args()

    company = args.company.strip()
    website = args.website.strip()

    if not company or not website:
        print(json.dumps({"error": "company and website are required"}))
        sys.exit(1)

    products = scrape_products(
        company,
        website,
        timeout=args.timeout,
        company_category=args.category,
        max_time_s=args.max_time,
    )

    if not products:
        print(json.dumps({"error": f"No products found for {company}"}))
        sys.exit(2)

    if args.company_id:
        # Persist og:images to Supabase Storage
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
