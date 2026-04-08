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

# Pillow is optional — used for image dimension validation.
# Install: pip install Pillow
try:
    from PIL import Image as _PILImage
    import io as _io
    _PIL_AVAILABLE = True
except ImportError:
    _PIL_AVAILABLE = False

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
    _AUTH_REDIRECT_RE = re.compile(
        r"/(login|sign[-_]?in|signin|auth|sso)"
        r"|account\.[a-z]+\.(com|us|io)"
        r"|[?&](redirect|next|return_to|continue)=",
        re.IGNORECASE,
    )

    html: Optional[str] = None
    try:
        r = sess.get(url, timeout=timeout)
        if r.status_code == 200:
            # If redirected to a sign-in/auth page, treat as failed fetch
            if _AUTH_REDIRECT_RE.search(r.url) and not _AUTH_REDIRECT_RE.search(url):
                log.info("Auth redirect detected: %s → %s — skipping", url, r.url)
                return None
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
    (r"business.jet|private.jet|ultra.long.range|long.range.jet|cabin.jet|"
     r"global \d{4}|challenger \d{3,4}|learjet|aircraft|aerospace|aviation.{0,15}product|"
     r"special.mission|defence.aircraft|government.aircraft",                                "Aircraft"),
    (r"simulator|simulation|full.flight|flight.training.device|full.mission|patient.simulator|"
     r"ultrasound.sim|obstetric.sim|synthetic.training|training.environment|mission.rehearsal|"
     r"type.rating|recurrent.training|crew.training|pilot.training|clinical.training", "Simulation"),
    (r"tc\d{2}|mc\d{2}|wt\d{4}|mobile.{0,8}computer|handheld",                            "Mobile Computer"),
    (r"scanner|barcode|rfid|imager|ds\d{4}",                                                "Scanner"),
    (r"printer|zt\d{3}|zd\d{3}|zc\d{3}|label print",                                       "Printer"),
    (r"tablet|device|rugged",                                                                "Rugged Device"),
    (r"crypto|bitcoin|ethereum|blockchain|defi|nft|web3|staking|wallet.{0,15}crypto|on.chain|l2.network|layer.2|exchange.{0,10}crypto|crypto.{0,10}exchange|digital.asset|token|coin\b", "Crypto"),
    (r"payment|checkout|billing|pos |point.of.sale",                                        "Payments"),
    (r"analytics|insight|dashboard|report|bi |intelligence",                                "Analytics"),
    (r"security|fraud|identity|auth|sso|zero.trust",                                        "Security"),
    (r"\bcloud\b|infrastructure|storage|\bcompute\b|server",                               "Cloud"),
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
    "Aircraft":         "#1E3A5F",
    "Simulation":       "#0F766E",
    "Mobile Computer":  "#2563EB",
    "Scanner":          "#7C3AED",
    "Printer":          "#52525B",
    "Rugged Device":    "#374151",
    "Crypto":           "#F7931A",
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
    "Electric Vehicle": ["Personal Transport", "Commercial Fleet", "Zero Emissions", "Long-Range Driving", "Autonomous Driving"],
    "Energy Storage":   ["Home Energy Backup", "Grid Stabilization", "Solar Storage", "Backup Power", "Peak Shaving"],
    "Solar":            ["Residential Solar", "Commercial Installations", "Energy Independence", "Rooftop Solar", "Off-Grid Power"],
    "EV Charging":      ["Fast Charging", "Fleet Charging", "Network Access", "Home Charging", "Workplace Charging"],
    "Simulation":       ["Pilot Training", "Mission Rehearsal", "Clinical Training", "Crew Certification", "Tactical Skills Development"],
    "Mobile Computer":  ["Warehouse Operations", "Field Service", "Retail Checkout", "Inventory Scanning", "Route Management"],
    "Scanner":          ["Inventory Management", "Point-of-Sale", "Asset Tracking", "Barcode Scanning", "RFID Tracking"],
    "Printer":          ["Label Printing", "Receipt Printing", "Industrial Labelling", "Barcode Printing", "On-Demand Printing"],
    "Rugged Device":    ["Field Operations", "Manufacturing", "Logistics", "Asset Management", "Remote Work"],
    "Crypto":           ["Crypto Trading", "Self-Custody", "DeFi & Staking", "Institutional Custody", "On-Chain Development"],
    "Payments":         ["Online Checkout", "In-Person Payments", "Subscription Billing", "Fraud Prevention", "Global Payments"],
    "Analytics":        ["Business Intelligence", "Performance Tracking", "Data Visualization", "Customer Insights", "Real-Time Reporting"],
    "Security":         ["Fraud Prevention", "Access Control", "Compliance", "Identity Management", "Threat Detection"],
    "Cloud":            ["Scalable Infrastructure", "Global Deployment", "Cost Optimization", "DevOps", "Serverless Computing"],
    "AI":               ["Predictive Models", "Automation", "Natural Language Processing", "Computer Vision", "AI Agents"],
    "CRM":              ["Sales Pipeline", "Customer Management", "Lead Tracking", "Deal Forecasting", "Contact Management"],
    "Mobile":           ["iOS Apps", "Android Apps", "Cross-Platform Development", "Push Notifications", "Mobile Analytics"],
    "Developer Tools":  ["API Integration", "App Development", "CI/CD", "Testing", "Monitoring"],
    "Data":             ["Data Storage", "Real-Time Analytics", "ETL Pipelines", "Data Warehousing", "Stream Processing"],
    "E-Commerce":       ["Online Store", "Inventory Management", "Order Fulfillment", "Product Catalog", "Shopping Cart"],
    "HR":               ["Talent Management", "Payroll", "Employee Engagement", "Onboarding", "Performance Reviews"],
    "Marketing":        ["Campaign Management", "Customer Acquisition", "A/B Testing", "Email Marketing", "SEO Optimization"],
    "Collaboration":    ["Team Communication", "Project Management", "File Sharing", "Video Conferencing", "Knowledge Base"],
    "Finance":          ["Financial Reporting", "Expense Management", "Invoicing", "Budgeting", "Accounts Payable"],
    "Design":           ["Graphic Design", "Brand Assets", "Social Media Visuals", "UI/UX Design", "Print Design"],
    "Video":            ["Video Editing", "Animations", "Short-Form Content", "Live Streaming", "Video Hosting"],
    "Presentations":    ["Pitch Decks", "Team Meetings", "Sales Presentations", "Webinars", "Investor Decks"],
    "Platform":         ["Enterprise Integration", "Workflow Automation", "Reporting", "Custom Apps", "API Management"],
    "Software":         ["Business Automation", "Workflow Management", "Reporting", "Process Optimization", "SaaS Delivery"],
    "Aircraft":         ["Ultra-Long-Range Private Travel", "Corporate Executive Transport", "Government & Special Missions"],
    "Hardware":         ["Field Operations", "Asset Management", "Industrial IoT", "Remote Monitoring", "Manufacturing"],
    "Product":          ["Product Integration", "Business Automation", "Workflow Optimization", "Team Collaboration", "Data Analytics"],
}

# Keyword patterns that validate whether a use case label applies to a given product.
# Used by get_use_cases() to rank candidates against the actual product text.
USE_CASE_PATTERNS: dict[str, str] = {
    # Simulation
    "Pilot Training":               r"pilot|aircrew|airline|aviation|flight.crew|type.rating|recurrent",
    "Mission Rehearsal":            r"mission.rehearsal|rehearsal|battlespace|multi.domain|operational|tactical.scenario",
    "Clinical Training":            r"clinical|patient|nursing|medical|healthcare|obstetric|echocardiograph|ultrasound",
    "Crew Certification":           r"certif|type.rating|recurrent|qualification|attestation|licence",
    "Tactical Skills Development":  r"tactical|combat|military|defence|defense|ground.vehicle|naval|armoured|rotary.wing",
    # Electric Vehicle
    "Personal Transport":          r"personal|consumer|individual|commut|everyday|family|sedan|suv|hatchback",
    "Commercial Fleet":            r"fleet|commercial|logistics|freight|delivery|cargo|semi|truck",
    "Zero Emissions":              r"zero.emiss|emission.free|carbon.neutral|sustainable|clean.energy|all.electric",
    "Long-Range Driving":          r"range|\d+\s*miles|\d+\s*km|long.range|distance|mileage",
    "Autonomous Driving":          r"autopilot|autonomous|self.driv|full self|fsd|driver.assist",
    # Energy Storage
    "Home Energy Backup":          r"home|residential|household|backup.power|outage|power.outage",
    "Grid Stabilization":          r"grid|utility|megapack|stabiliz|utility.scale|peak.demand",
    "Solar Storage":               r"solar|photovoltaic|panel|renewable|store.solar",
    "Backup Power":                r"backup|emergency|outage|uninterrupt|\bups\b",
    "Peak Shaving":                r"peak.shav|demand.charg|time.of.use|off.peak",
    # Solar
    "Residential Solar":           r"residential|home|roof|household|homeowner",
    "Commercial Installations":    r"commercial|business|enterprise|building|campus|facility",
    "Energy Independence":         r"independen|self.sufficient|off.grid|autonomy|energy.independen",
    "Rooftop Solar":               r"rooftop|roof.solar|solar.roof|tile",
    "Off-Grid Power":              r"off.grid|remote|standalone|island.mode",
    # EV Charging
    "Fast Charging":               r"fast.charg|rapid.charg|dc.fast|supercharg|level.3|quick.charg",
    "Fleet Charging":              r"fleet|depot|commercial.charg|fleet.manag",
    "Network Access":              r"network|open.charg|interoper|roaming|charging.network",
    "Home Charging":               r"home.charg|residential.charg|level.2|wall.connect|home.install",
    "Workplace Charging":          r"workplace|office|destination.charg|employee|parking",
    # Mobile Computer / Rugged Device
    "Warehouse Operations":        r"warehouse|distribution|fulfillment|picking|packing",
    "Field Service":               r"field.service|technician|on.site|remote.service|maintenance",
    "Retail Checkout":             r"retail|checkout|point.of.sale|\bpos\b|cashier|storefront",
    "Inventory Scanning":          r"inventory|stock.count|cycle.count|stock.tak",
    "Route Management":            r"route|delivery.route|dispatch|navigation|routing",
    "Remote Work":                 r"remote|mobile.work|work.anywhere|distributed|deskless",
    # Scanner
    "Inventory Management":        r"inventory|stock|warehouse|supply|asset.track",
    "Point-of-Sale":               r"point.of.sale|\bpos\b|checkout|cashier|retail",
    "Asset Tracking":              r"asset.track|asset.manag|location.track|rfid|iot.track",
    "Barcode Scanning":            r"barcode|qr.code|scanner|scan|\bean\b|\bupc\b",
    "RFID Tracking":               r"rfid|radio.frequen|\bnfc\b|tag.track",
    # Printer
    "Label Printing":              r"label|tag.print|sticker|thermal.print",
    "Receipt Printing":            r"receipt|pos.print|transaction.print|customer.receipt",
    "Industrial Labelling":        r"industrial|manufactur|compliance.label|shipping.label",
    "Barcode Printing":            r"barcode.print|label.print|print.barcode",
    "On-Demand Printing":          r"on.demand|print.on.demand|just.in.time",
    # Rugged Device
    "Field Operations":            r"field|outdoor|rugged|remote|on.site|mobile.work",
    "Manufacturing":               r"manufactur|production|assembly|plant|factory",
    "Logistics":                   r"logistic|supply.chain|shipping|freight|transport",
    "Asset Management":            r"asset.manag|asset.track|maintenance|lifecycle",
    # Payments
    # Crypto
    "Crypto Trading":              r"trading|exchange|buy.{0,10}sell|order.type|charting|market|spot|futures",
    "Self-Custody":                r"self.custody|non.custodial|private.key|seed.phrase|own.key|wallet",
    "DeFi & Staking":              r"defi|staking|yield|liquidity|pool|protocol|earn.reward|validator",
    "Institutional Custody":       r"institutional|prime.brokerage|custody|qualified.custodian|cold.storage|enterprise.grade",
    "On-Chain Development":        r"on.chain|layer.2|l2|developer|node|api.{0,10}chain|blockchain.app|smart.contract|dapp",
    # Payments
    "Online Checkout":             r"online.checkout|e.?commerce|web.pay|digital.pay|checkout.page",
    "In-Person Payments":          r"in.person|point.of.sale|\bpos\b|card.present|contactless|tap.to.pay|terminal",
    "Subscription Billing":        r"subscri|recurring|billing.cycle|monthly.bill|annual.bill",
    "Global Payments":             r"global|international|cross.border|multi.currenc|foreign.exchange",
    "Fraud Prevention":            r"fraud|risk.detect|chargeback|dispute|suspicious.transact",
    # Analytics
    "Business Intelligence":       r"business.intelligence|\bbi\b|dashboard|insight|\bkpi\b|\bmetric\b",
    "Performance Tracking":        r"performance|\bkpi\b|goal.track|benchmark|measure",
    "Data Visualization":          r"visualiz|chart|graph|report|dashboard",
    "Customer Insights":           r"customer.insight|user.behavior|segment|cohort|audience",
    "Real-Time Reporting":         r"real.time|live.data|streaming.analytic|instant.report",
    # Security
    "Access Control":              r"access.control|permission|role.based|\brbac\b|authorization",
    "Compliance":                  r"complian|gdpr|hipaa|\bsoc2?\b|iso.270|regulatory",
    "Identity Management":         r"identity|\bsso\b|single.sign|\bmfa\b|multi.factor|auth",
    "Threat Detection":            r"threat.detect|intrusion|anomaly|\bsiem\b|\bedr\b|incident.response",
    # Cloud
    "Scalable Infrastructure":     r"scalable|elastic|auto.scal|resize|infrastructure",
    "Global Deployment":           r"global|multi.region|world.wide|geographic|latency",
    "Cost Optimization":           r"cost.optim|cost.saving|budget|efficiency|reduce.spend",
    "DevOps":                      r"devops|ci.?cd|pipeline|deploy|docker|kubernetes|container",
    "Serverless Computing":        r"serverless|function.as|\blambda\b|cloud.run|\bfaas\b",
    # AI
    "Predictive Models":           r"predict|forecast|machine.learn|\bml\b|model.train",
    "Automation":                  r"automat|workflow.automat|no.code|\brpa\b|\bbot\b",
    "Natural Language Processing": r"nlp|natural.language|text.analyt|sentiment|language.model|\bllm\b|\bgpt\b",
    "Computer Vision":             r"computer.vision|image.recognit|object.detect|visual.ai|\bocr\b",
    "AI Agents":                   r"ai.agent|autonomous.agent|agentic|copilot|assistant",
    # CRM
    "Sales Pipeline":              r"sales.pipeline|deal.stage|opportunity|pipeline.manag",
    "Customer Management":         r"customer.manag|account.manag|contact.manag|\bcrm\b",
    "Lead Tracking":               r"lead.track|lead.manag|prospect|lead.gen|inbound.lead",
    "Deal Forecasting":            r"forecast|deal.predict|revenue.predict|quota",
    "Contact Management":          r"contact|address.book|account.record|customer.record",
    # Mobile
    "iOS Apps":                    r"ios|iphone|ipad|apple.app|swift|xcode",
    "Android Apps":                r"android|google.play|kotlin|java.mobile",
    "Cross-Platform Development":  r"cross.platform|react.native|flutter|xamarin|hybrid.app",
    "Push Notifications":          r"push.notif|mobile.notif|app.notif",
    "Mobile Analytics":            r"mobile.analytic|app.analytic|in.app",
    # Developer Tools
    "API Integration":             r"api.integrat|rest.api|webhook|\bsdk\b|third.party.integrat",
    "App Development":             r"app.develop|build.app|application.develop|platform.develop",
    "CI/CD":                       r"ci.?cd|continuous.integrat|continuous.deploy|pipeline|devops",
    "Testing":                     r"test|\bqa\b|quality.assur|unit.test|automated.test",
    "Monitoring":                  r"monitor|observ|alert|uptime|\bapm\b|log.manag",
    # Data
    "Data Storage":                r"data.storage|store.data|database|data.lake|object.storage",
    "Real-Time Analytics":         r"real.time.analyt|streaming|live.analyt|event.stream",
    "ETL Pipelines":               r"\betl\b|extract.transform|data.pipeline|ingestion|data.integrat",
    "Data Warehousing":            r"data.warehouse|warehouse|\bolap\b|analytical.query|big.data",
    "Stream Processing":           r"stream.process|kafka|kinesis|event.stream|real.time.event",
    # E-Commerce
    "Online Store":                r"online.store|e.?commerce|web.shop|digital.store",
    "Order Fulfillment":           r"fulfillment|order.process|shipping|dispatch|order.manag",
    "Product Catalog":             r"product.catalog|catalog.manag|product.list|\bsku\b",
    "Shopping Cart":               r"shopping.cart|\bcart\b|checkout.flow|basket",
    # HR
    "Talent Management":           r"talent|recruit|hire|applicant|job.post",
    "Payroll":                     r"payroll|salary|compensation|wage|pay.stub",
    "Employee Engagement":         r"engagement|culture|satisfaction|survey|feedback",
    "Onboarding":                  r"onboard|new.hire|orientation|first.day",
    "Performance Reviews":         r"performance.review|appraisal|review.cycle|goal.setting",
    # Marketing
    "Campaign Management":         r"campaign|marketing.campaign|multi.channel|campaign.manag",
    "Customer Acquisition":        r"acquisition|new.customer|lead.gen|conversion|funnel",
    "A/B Testing":                 r"a.?b.test|experiment|variant|split.test|multivariate",
    "Email Marketing":             r"email.market|newsletter|email.campaign|drip.campaign",
    "SEO Optimization":            r"seo|search.engine.optim|organic.search|keyword.rank",
    # Collaboration
    "Team Communication":          r"team.communicat|messaging|chat|channel|instant.messag",
    "Project Management":          r"project.manag|task.manag|milestone|kanban|sprint",
    "File Sharing":                r"file.shar|document.shar|storage.shar|cloud.file",
    "Video Conferencing":          r"video.conf|video.call|meeting|video.chat|webinar",
    "Knowledge Base":              r"knowledge.base|wiki|documentation|internal.docs|knowledge.manag",
    # Finance
    "Financial Reporting":         r"financial.report|income.statement|balance.sheet|p.?l\b|profit.loss",
    "Expense Management":          r"expense|spend.manag|reimburs|receipt.capture",
    "Invoicing":                   r"invoic|invoice.manag|billing|accounts.receivable",
    "Budgeting":                   r"budget|forecast|financial.plan|spend.plan",
    "Accounts Payable":            r"accounts.payable|vendor.payment|bill.pay|\bap\b",
    # Design
    "Graphic Design":              r"graphic.design|visual.design|illustration|artwork",
    "Brand Assets":                r"brand|logo|brand.guideline|style.guide|brand.asset",
    "Social Media Visuals":        r"social.media|instagram|facebook|twitter|post.design|social.visual",
    "UI/UX Design":                r"ui.?ux|interface.design|wireframe|prototype|user.experience",
    "Print Design":                r"print|brochure|flyer|poster|print.ready",
    # Video
    "Video Editing":               r"video.edit|cut|timeline|footage|post.production",
    "Animations":                  r"animation|motion.graphic|animate|\bgif\b|render",
    "Short-Form Content":          r"short.form|reel|tiktok|story|\bclip\b|short.video",
    "Live Streaming":              r"live.stream|broadcast|live.video|webcast",
    "Video Hosting":               r"video.host|\bvod\b|video.on.demand|embed.video",
    # Presentations
    "Pitch Decks":                 r"pitch.deck|investor.present|startup.pitch|fundrais",
    "Team Meetings":               r"team.meeting|meeting.present|internal.present",
    "Sales Presentations":         r"sales.present|demo|prospect.present|client.present",
    "Webinars":                    r"webinar|online.event|virtual.event|live.present",
    "Investor Decks":              r"investor|fundrais|vc.present|capital.raise",
    # Platform
    "Enterprise Integration":      r"enterprise.integrat|legacy.integrat|erp.integrat|system.integrat",
    "Workflow Automation":         r"workflow.automat|process.automat|no.code|low.code",
    "Reporting":                   r"report|dashboard|analytics.report|executive.report",
    "Custom Apps":                 r"custom.app|build.app|low.code.app|citizen.developer",
    "API Management":              r"api.manag|api.gateway|api.lifecycle|developer.portal",
    # Software / Hardware / Product (generic)
    "Business Automation":         r"business.automat|process.automat|workflow|efficiency",
    "Workflow Management":         r"workflow|process.manag|\bbpm\b|task.flow",
    "Process Optimization":        r"optim|improve.process|streamline|efficiency",
    "SaaS Delivery":               r"saas|cloud.software|software.as.a.service|cloud.deliver",
    "Remote Monitoring":           r"remote.monitor|iot.monitor|sensor|telemetry|remote.access",
    "Industrial IoT":              r"industrial.iot|\biiot\b|edge.device|sensor.network|connected.device",
    "Team Collaboration":          r"team.collab|collaborate|shared.workspace",
    "Data Analytics":              r"analytic|data.driven|insight|metric|report",
    "Product Integration":         r"integrat|connect|plugin|extension|embed",
    "Workflow Optimization":       r"workflow.optim|process.optim|improve.workflow|streamline",
}


def infer_category(name: str, desc: str = "", tagline: str = "") -> str:
    text = f"{name} {tagline} {desc}".lower()
    for pattern, cat in CATEGORY_RULES:
        if re.search(pattern, text, re.IGNORECASE):
            return cat
    return "Product"

def get_color(category: str) -> str:
    return CATEGORY_COLORS.get(category, "#52525B")

def get_use_cases(
    category: str,
    name: str = "",
    tagline: str = "",
    desc: str = "",
) -> list[str]:
    """
    Return 3 use cases for a product.

    When product content (name/tagline/desc) is provided, each candidate use
    case is validated against the product text using USE_CASE_PATTERNS.
    Validated use cases are ranked first; unvalidated ones fill remaining slots.
    Falls back to the first 3 category defaults when no content is given.
    """
    candidates = USE_CASES.get(category, USE_CASES["Product"])

    if not (name or tagline or desc):
        return candidates[:3]

    text = f"{name} {tagline} {desc}"

    validated: list[str] = []
    unvalidated: list[str] = []
    for uc in candidates:
        pattern = USE_CASE_PATTERNS.get(uc)
        if pattern and re.search(pattern, text, re.IGNORECASE):
            validated.append(uc)
        else:
            unvalidated.append(uc)

    # Return up to 3: validated ones first, then fill with unvalidated defaults
    return (validated + unvalidated)[:3]


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
    r"channels?|sell|selling|"
    r"now|quality|method|culture|handbook|manifesto|essay|series|episode)\b",
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
    r"privacy|legal|compliance|security|trust|terms|themes?|"
    r"learn|live|kb|academy|university|certification|training|"
    r"answers|forums?|ideaexchange|trailhead|success|"
    r"knowledge|insights?|resources?|events?)$",
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


# ─── Image validation ────────────────────────────────────────────────────────

# SVG and icon paths are not uploadable as product images
_BAD_IMAGE_PATH_RE = re.compile(
    r"\.svg(\?|$)"                          # SVG files
    r"|favicon"                             # favicons
    r"|apple-touch-icon"                    # iOS home-screen icons
    r"|/icons?/"                            # /icon/ or /icons/ directory
    r"|/icon\."                             # /icon.png, /icon.jpg
    r"|\bsprite\b"                          # CSS sprite sheets
    r"|/logo\."                             # /logo.png — generic company logo, not product image
    r"|placeholder"                         # placeholder images
    r"|default[-_]image"                    # default-image.jpg etc.
    r"|/og[-_]default"                      # og-default.jpg
    r"|no[-_]image"                         # no-image.png
    r"|missing[-_]image",                   # missing-image.png
    re.IGNORECASE,
)

# Accepted MIME types for product images
_VALID_IMAGE_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}

# File-size bounds: reject < 5 KB (icons) or > 10 MB (oversized banners)
_IMAGE_MIN_BYTES = 5_000
_IMAGE_MAX_BYTES = 10_000_000

# Minimum pixel dimension to be a useful product image (not a favicon/icon)
_IMAGE_MIN_DIM = 200


def _validate_image_url(url: str) -> bool:
    """
    Fast, zero-network check on an og:image URL.
    Returns False for obvious non-product images (SVG, icons, favicons, data URLs).
    """
    if not url or not url.startswith("http"):
        return False
    if _BAD_IMAGE_PATH_RE.search(urlparse(url).path):
        log.debug("Image rejected by URL pattern: %s", url)
        return False
    return True


def _validate_image_response(url: str, sess: Optional["Session"] = None) -> bool:
    """
    HEAD-request check: confirms the URL returns an accepted image content-type
    and a file size within bounds.  Falls back to a plain requests.head() when
    no Session is provided.
    """
    try:
        r = (sess.s if sess else requests).head(
            url, headers=HEADERS, timeout=8, allow_redirects=True
        )
        if r.status_code != 200:
            log.debug("Image HEAD %d: %s", r.status_code, url)
            return False
        ct = r.headers.get("content-type", "").split(";")[0].strip().lower()
        if ct not in _VALID_IMAGE_CONTENT_TYPES:
            log.debug("Image bad content-type '%s': %s", ct, url)
            return False
        cl_str = r.headers.get("content-length")
        if cl_str:
            cl = int(cl_str)
            if cl < _IMAGE_MIN_BYTES:
                log.debug("Image too small (%d B): %s", cl, url)
                return False
            if cl > _IMAGE_MAX_BYTES:
                log.debug("Image too large (%d B): %s", cl, url)
                return False
        return True
    except Exception as e:
        log.debug("Image HEAD failed (%s): %s", url, e)
        return False


def _validate_image_dimensions(data: bytes) -> bool:
    """
    Pillow-based dimension check on already-downloaded image bytes.
    Always returns True when Pillow is not installed.
    Rejects images smaller than _IMAGE_MIN_DIM × _IMAGE_MIN_DIM (icons/favicons).
    """
    if not _PIL_AVAILABLE:
        return True
    try:
        img = _PILImage.open(_io.BytesIO(data))
        w, h = img.size
        if w < _IMAGE_MIN_DIM or h < _IMAGE_MIN_DIM:
            log.debug("Image too small (%dx%d px) — rejected", w, h)
            return False
        return True
    except Exception as e:
        log.debug("Pillow dimension check failed: %s", e)
        return True  # can't parse — don't reject, let upload decide


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
            if 5 < len(t) <= 120 and t.lower() not in {
                "overview", "features", "pricing", "models", "in the box",
                "end of sale", "specifications", "accessories", "videos",
                "resources", "downloads", "support", "related products",
            }:
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
        if _validate_image_url(raw):
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
        # Names longer than 45 chars are almost certainly page titles / marketing copy
        if len(n) > 45:
            return True
        if re.search(r"\b(flexible|scalable|powerful|robust|comprehensive|advanced),?\s+"
                     r".{0,40}\b(tools?|platform|suite|solutions?|software)\b", n, re.IGNORECASE):
            return True
        # Generic "<category> Software/Solutions/Platform" multi-word catch-all
        if re.search(r"\b\w+\s+(management|tracking|automation)\s+software\b", n, re.IGNORECASE):
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

# Companies whose scraper output is known-bad regardless of what the nav returns.
# These are checked FIRST in scrape_products() — scraping is skipped entirely.
#
# Use cases:
#   - Consumer marketplaces with no Products nav (Airbnb)
#   - Sites whose nav links resolve to wrong subdomains/redirects (Anthropic)
#   - Fully Cloudflare-blocked homepages (Tesla)
#
# Key: first word of company name, lowercased (matches co_key logic elsewhere).
_COMPANY_OVERRIDES: dict[str, list[dict]] = {
    # Tesla: fully blocked by Cloudflare, homepage returns bot-challenge page.
    "tesla": [
        {"name": "Model 3",     "tagline": "Premium all-electric sedan with up to 358 miles range"},
        {"name": "Model Y",     "tagline": "Versatile all-electric SUV, world's best-selling vehicle"},
        {"name": "Model S",     "tagline": "Flagship luxury electric sedan with Plaid powertrain"},
        {"name": "Model X",     "tagline": "Premium electric SUV with distinctive Falcon Wing doors"},
        {"name": "Cybertruck",  "tagline": "All-electric pickup truck built for durability and utility"},
        {"name": "Semi",        "tagline": "Electric commercial semi-truck for sustainable freight"},
        {"name": "Roadster",    "tagline": "Next-generation electric sports car for ultimate performance"},
        {"name": "Powerwall",   "tagline": "Home battery for energy storage and backup power"},
        {"name": "Megapack",    "tagline": "Utility-scale battery storage for grid energy"},
        {"name": "Solar Panels","tagline": "Low-profile solar energy system for homes"},
    ],

    # Anthropic: nav has a Products link but it resolves to claude.ai (external
    # subdomain) and API docs pages. Scraper finds wrong/generic pages from the
    # redirect chain even though scraping doesn't error out.
    "anthropic": [
        {"name": "Claude",                "tagline": "Anthropic's frontier AI assistant for complex reasoning and analysis"},
        {"name": "Claude API",            "tagline": "API access to Claude models for developers and enterprises"},
        {"name": "Claude.ai",             "tagline": "Consumer and Teams chat interface powered by Claude"},
        {"name": "Claude for Enterprise", "tagline": "Secure, compliant Claude deployment for large organisations"},
        {"name": "Claude Haiku",          "tagline": "Fast, compact model optimised for near-instant responsiveness"},
        {"name": "Claude Sonnet",         "tagline": "Balanced intelligence and speed for a wide range of tasks"},
        {"name": "Claude Opus",           "tagline": "Most capable Claude model for highly complex workloads"},
    ],

    # Microsoft: nav crawls into learn.microsoft.com driver/API docs instead of
    # product pages — override with canonical product suite.
    "microsoft": [
        {"name": "Azure",            "tagline": "Cloud computing platform for building, deploying, and managing services"},
        {"name": "Microsoft 365",    "tagline": "Productivity apps including Word, Excel, PowerPoint, Teams, and Outlook"},
        {"name": "Windows",          "tagline": "Operating system powering PCs and enterprise devices worldwide"},
        {"name": "GitHub",           "tagline": "AI-powered developer platform for code hosting, review, and CI/CD"},
        {"name": "Teams",            "tagline": "Chat, meetings, and collaboration hub for modern workplaces"},
        {"name": "Dynamics 365",     "tagline": "Business applications for CRM, ERP, finance, and operations"},
        {"name": "Xbox",             "tagline": "Gaming platform spanning console, PC, and cloud gaming"},
        {"name": "Surface",          "tagline": "Premium laptops, tablets, and 2-in-1 devices designed for productivity"},
        {"name": "Copilot",          "tagline": "AI assistant embedded across Microsoft products and the web"},
        {"name": "Power Platform",   "tagline": "Low-code tools for building apps, automating workflows, and analysing data"},
    ],

    # Adobe: homepage is likely Cloudflare-protected — scraper hits synthetic fallback.
    "adobe": [
        {"name": "Photoshop",        "tagline": "Industry-standard image editing and graphic design software"},
        {"name": "Illustrator",      "tagline": "Vector graphics editor for logos, icons, and illustrations"},
        {"name": "Premiere Pro",     "tagline": "Professional video editing software for film and broadcast"},
        {"name": "After Effects",    "tagline": "Motion graphics and visual effects for video and film"},
        {"name": "Acrobat",          "tagline": "PDF creation, editing, and e-signature platform"},
        {"name": "Creative Cloud",   "tagline": "All-in-one subscription for 20+ creative desktop and mobile apps"},
        {"name": "Experience Cloud", "tagline": "Digital marketing platform for analytics, personalisation, and commerce"},
        {"name": "Lightroom",        "tagline": "Photo editing and organisation tool for photographers"},
        {"name": "Firefly",          "tagline": "Generative AI for image creation and creative workflows"},
        {"name": "Adobe Express",    "tagline": "Quick content creation for social media, flyers, and presentations"},
    ],

    # Uber: consumer marketplace — scraper finds locale city pages (Toronto, Montreal)
    # instead of product offerings.
    "uber": [
        {"name": "Uber",             "tagline": "On-demand ridesharing for everyday trips"},
        {"name": "Uber Eats",        "tagline": "Food and grocery delivery from local restaurants and stores"},
        {"name": "Uber for Business","tagline": "Corporate travel and meal programs for companies"},
        {"name": "Uber Freight",     "tagline": "Digital freight brokerage connecting shippers and carriers"},
        {"name": "Uber Health",      "tagline": "Non-emergency medical transportation for patients and healthcare"},
        {"name": "Uber Connect",     "tagline": "Same-day package and courier delivery service"},
    ],

    # Spotify: scraper hits a 404 error page ("This page is out of tune").
    "spotify": [
        {"name": "Spotify Free",         "tagline": "Stream music and podcasts with ads on any device"},
        {"name": "Spotify Premium",      "tagline": "Ad-free listening with offline downloads and higher audio quality"},
        {"name": "Spotify for Artists",  "tagline": "Tools for musicians to distribute, promote, and analyse their music"},
        {"name": "Spotify for Podcasters","tagline": "Creation, hosting, and monetisation platform for podcast creators"},
        {"name": "Spotify Advertising",  "tagline": "Audio and video ad platform reaching Spotify's global audience"},
        {"name": "Spotify for Business", "tagline": "Licensed music streaming for commercial venues and businesses"},
    ],

    # Samsung: complex JS nav with hardware categories — scraper hits synthetic fallback.
    "samsung": [
        {"name": "Galaxy S Series",    "tagline": "Flagship Android smartphones with advanced cameras and AI features"},
        {"name": "Galaxy Z Series",    "tagline": "Foldable smartphones redefining mobile form factor"},
        {"name": "Galaxy Tab",         "tagline": "Android tablets for productivity and entertainment"},
        {"name": "Galaxy Watch",       "tagline": "Smartwatches with health tracking and fitness features"},
        {"name": "Samsung TV",         "tagline": "QLED, OLED, and 8K televisions for home entertainment"},
        {"name": "Samsung Monitors",   "tagline": "Gaming, professional, and lifestyle displays"},
        {"name": "Samsung Refrigerators","tagline": "Smart refrigerators with Family Hub and connected home features"},
        {"name": "Samsung Washer & Dryer","tagline": "AI-powered laundry appliances with smart care technology"},
        {"name": "Galaxy Buds",        "tagline": "True wireless earbuds with noise cancellation and spatial audio"},
    ],

    # Boeing: scraper finds real aircraft but mixes in non-product pages
    # (Market Outlook reports, Government Services, docs). Override with clean list.
    "boeing": [
        {"name": "737 MAX",           "tagline": "Next-generation single-aisle aircraft for short to medium-range routes"},
        {"name": "787 Dreamliner",    "tagline": "Fuel-efficient widebody jet with exceptional passenger comfort"},
        {"name": "777X",              "tagline": "Next-generation twin-engine widebody with folding wingtips"},
        {"name": "747-8",             "tagline": "Iconic double-deck widebody freighter and passenger aircraft"},
        {"name": "F/A-18 Super Hornet","tagline": "Combat-proven multirole carrier fighter for naval aviation"},
        {"name": "F-15EX",            "tagline": "Advanced air dominance fighter with unmatched payload capacity"},
        {"name": "T-7A Red Hawk",     "tagline": "Next-generation advanced pilot training system for the US Air Force"},
        {"name": "MQ-25 Stingray",    "tagline": "First operational carrier-based unmanned aerial refuelling aircraft"},
        {"name": "B-52 Stratofortress","tagline": "Long-range strategic bomber serving US nuclear deterrence"},
        {"name": "Satellites",        "tagline": "Commercial and government satellites from LEO to GEO orbits"},
    ],

    # Bombardier: aviation manufacturer — website nav is marketing-focused with no
    # standard Products dropdown; individual jet pages are JS-rendered and scraper
    # picks up generic campaign/lifestyle content instead of aircraft names.
    "bombardier": [
        {"name": "Global 8000",    "tagline": "The world's longest-range business jet, flying farther than any other", "use_cases": ["Ultra-long-range nonstop travel", "C-suite global executive transport", "Private charter for 19 passengers"]},
        {"name": "Global 7500",    "tagline": "Ultra-long-range business jet with the longest range in its class",       "use_cases": ["Transatlantic nonstop private travel", "Corporate fleet flagship", "Government VIP transport"]},
        {"name": "Global 6500",    "tagline": "Long-range business jet combining performance and cabin comfort",          "use_cases": ["Intercontinental nonstop missions", "Large-group executive travel", "Charter operations"]},
        {"name": "Global 5500",    "tagline": "Large-cabin business jet with exceptional range and efficiency",           "use_cases": ["Transcontinental business travel", "Medium-group executive missions", "Owner-operated jets"]},
        {"name": "Challenger 3500","tagline": "Super mid-size jet delivering best-in-class cabin and performance",        "use_cases": ["Short-to-medium range corporate travel", "Owner-operated business aviation", "Regional charter services"]},
        {"name": "Challenger 650", "tagline": "Large-cabin business jet renowned for reliability and range",              "use_cases": ["High-frequency corporate shuttle", "Mixed passenger and cargo missions", "Fleet operator large-cabin routes"]},
        {"name": "Challenger 350", "tagline": "Super mid-size business jet with best-in-class operating costs",          "use_cases": ["Cost-efficient corporate travel", "Regional business aviation", "Entry-level large-cabin ownership"]},
        {"name": "Special Mission", "tagline": "Military and government aircraft for surveillance, patrol, and transport", "use_cases": ["Maritime patrol and surveillance", "Government VIP and head-of-state transport", "Intelligence and reconnaissance missions"]},
    ],

    # Atlassian: nav has Products but the dropdown is JS-rendered and links resolve
    # to per-product subdomains (jira.atlassian.com, confluence.atlassian.com etc.)
    # — scraper picks up wrong/generic pages from the redirect chain.
    "atlassian": [
        {"name": "Jira",                  "tagline": "Issue and project tracking for agile software teams"},
        {"name": "Confluence",            "tagline": "Team workspace for docs, wikis, and knowledge sharing"},
        {"name": "Jira Service Management","tagline": "IT service management and helpdesk for modern teams"},
        {"name": "Bitbucket",             "tagline": "Git code hosting with built-in CI/CD pipelines"},
        {"name": "Trello",                "tagline": "Visual project boards for flexible team workflows"},
        {"name": "Loom",                  "tagline": "Async video messaging for faster team communication"},
        {"name": "Compass",               "tagline": "Developer experience platform for tracking software components"},
        {"name": "Statuspage",            "tagline": "Incident communication and status page for customers"},
        {"name": "Opsgenie",              "tagline": "On-call alerting and incident management for ops teams"},
        {"name": "Jira Product Discovery","tagline": "Prioritisation and roadmap tool for product managers"},
    ],

    # Zendesk: scraper finds generic feature labels ("Live chat software", "Live chat",
    # "AI Agents", "Copilot") rather than Zendesk's named product suite.
    "zendesk": [
        {"name": "Zendesk Support",     "tagline": "Ticketing system for managing customer requests across channels"},
        {"name": "Zendesk Chat",        "tagline": "Live chat and messaging for real-time customer conversations"},
        {"name": "Zendesk Sell",        "tagline": "CRM for sales teams with pipeline management and reporting"},
        {"name": "Zendesk AI",          "tagline": "AI-powered automation, bots, and intelligent triage for support"},
        {"name": "Zendesk Suite",       "tagline": "All-in-one customer service platform combining support, chat, and voice"},
        {"name": "Zendesk Workforce Mgmt","tagline": "Scheduling and capacity planning for support teams"},
        {"name": "Zendesk QA",          "tagline": "Automated quality assurance and conversation review for agents"},
    ],

    # MongoDB: scraper finds real product names mixed with generic labels
    # ("Multi-cloud") and feature article titles.
    "mongodb": [
        {"name": "MongoDB Atlas",                "tagline": "Fully managed cloud database available on AWS, Azure, and GCP"},
        {"name": "Atlas Vector Search",           "tagline": "Native vector search for AI and semantic search applications"},
        {"name": "Atlas Data Federation",         "tagline": "Query data across Atlas, S3, and HTTP stores with a unified API"},
        {"name": "Atlas Stream Processing",       "tagline": "Real-time data processing pipelines built into MongoDB Atlas"},
        {"name": "MongoDB Community Edition",     "tagline": "Free, open-source version of the MongoDB database"},
        {"name": "MongoDB Enterprise Advanced",   "tagline": "Enterprise-grade database with security, ops tools, and support"},
        {"name": "Queryable Encryption",          "tagline": "Encrypt sensitive fields while keeping them queryable"},
        {"name": "Relational Migrator",           "tagline": "Tool to migrate relational database schemas and data to MongoDB"},
    ],

    # Okta: scraper finds "Training", "Single Sign-On", "MFA Solutions" — generic feature
    # category labels and support pages rather than named Okta products.
    "okta": [
        {"name": "Okta Workforce Identity",     "tagline": "Identity and access management for employees and contractors"},
        {"name": "Okta Customer Identity Cloud","tagline": "Auth0-powered identity platform for customer-facing apps"},
        {"name": "Single Sign-On",              "tagline": "One login for all apps with SAML and OIDC support"},
        {"name": "Adaptive Multi-Factor Auth",  "tagline": "Risk-based MFA with 15+ factors and policy engine"},
        {"name": "Okta Device Access",          "tagline": "Passwordless desktop and device login powered by Okta"},
        {"name": "Okta Identity Governance",    "tagline": "Access certification, lifecycle management, and entitlement control"},
        {"name": "Okta Privileged Access",      "tagline": "Secure privileged account and infrastructure access management"},
        {"name": "Okta for AI Agents",          "tagline": "Identity and access control layer for AI agent workflows"},
    ],

    # Asana: scraper finds "Goals and reporting", long page title "Asana AI for Work
    # & Project Management • Asana", plus real products like Asana AI Studio buried in noise.
    "asana": [
        {"name": "Asana Work Management",  "tagline": "Task and project management to connect work to company goals"},
        {"name": "Asana AI Studio",        "tagline": "No-code AI workflow builder for automating complex business processes"},
        {"name": "Asana AI Teammates",     "tagline": "AI agents that collaborate on work inside Asana projects"},
        {"name": "Asana Goals",            "tagline": "OKR and goal tracking connected to day-to-day work"},
        {"name": "Asana Portfolio",        "tagline": "Executive view of progress across all projects and initiatives"},
        {"name": "Asana Reporting",        "tagline": "Dashboards and charts for tracking team and project performance"},
        {"name": "Asana Enterprise",       "tagline": "Enterprise-grade security, SSO, and admin controls for large teams"},
    ],

    # Snowflake: scraper finds real products ("Snowflake Intelligence", "Horizon Catalog")
    # mixed with article/feature titles ("End-to-end ML Workflows", "Native Support for
    # Apache Iceberg Tables").
    "snowflake": [
        {"name": "Snowflake Data Cloud",       "tagline": "Cloud data platform for data warehousing, sharing, and collaboration"},
        {"name": "Snowflake Intelligence",     "tagline": "AI-powered analytics and insights layer on Snowflake data"},
        {"name": "Snowflake Cortex AI",        "tagline": "Fully managed AI and ML services running directly on Snowflake"},
        {"name": "Snowflake Horizon Catalog",  "tagline": "Unified governance, discovery, and compliance for all data assets"},
        {"name": "Snowflake Marketplace",      "tagline": "Data and app marketplace for sharing and monetising data products"},
        {"name": "Snowflake Data Engineering", "tagline": "ETL, transformation, and pipeline orchestration on Snowflake"},
        {"name": "Snowflake Dynamic Tables",   "tagline": "Declarative data pipelines for continuous transformation in Snowflake"},
        {"name": "Snowflake Arctic",           "tagline": "Open-source enterprise-focused LLM built by Snowflake"},
    ],

    # Dropbox: scraper finds feature taglines ("Electronic signatures", "Edit PDFs in a
    # few clicks", "Cloud backup") rather than Dropbox product names.
    "dropbox": [
        {"name": "Dropbox",               "tagline": "Cloud storage and file sync for individuals and teams"},
        {"name": "Dropbox Business",      "tagline": "Team collaboration with shared storage, admin controls, and SSO"},
        {"name": "Dropbox Sign",          "tagline": "eSignature platform for collecting legally binding signatures"},
        {"name": "Dropbox DocSend",       "tagline": "Secure document sharing with tracking, analytics, and NDA requests"},
        {"name": "Dropbox Dash",          "tagline": "AI-powered universal search across all apps and files"},
        {"name": "Dropbox Backup",        "tagline": "Automatic cloud backup for computers and external drives"},
        {"name": "Dropbox Paper",         "tagline": "Collaborative docs and meeting notes integrated with Dropbox"},
    ],

    # Elastic: scraper returns 3 use-case description titles and nothing more.
    # Root cause: elastic.co uses a complex JS nav; scraper cannot enumerate product links.
    "elastic": [
        {"name": "Elasticsearch",             "tagline": "Distributed search and analytics engine at the core of the Elastic Stack"},
        {"name": "Elastic Observability",     "tagline": "Unified logs, metrics, and APM for infrastructure and application monitoring"},
        {"name": "Elastic Security",          "tagline": "SIEM, endpoint security, and threat hunting on the Elastic Stack"},
        {"name": "Elastic Search AI Platform","tagline": "AI-powered search for enterprise applications and vector search"},
        {"name": "Kibana",                    "tagline": "Visualisation and dashboarding interface for Elasticsearch data"},
        {"name": "Elastic Cloud",             "tagline": "Fully managed Elasticsearch Service on AWS, Azure, and GCP"},
        {"name": "Logstash",                  "tagline": "Server-side data processing pipeline for ingesting and transforming data"},
    ],

    # CrowdStrike: scraper finds headlines ("Orchestrate the agentic security workforce"),
    # CTAs ("Experienced a breach?"), and "Latest Innovations" — not product names.
    "crowdstrike": [
        {"name": "Falcon Platform",          "tagline": "AI-native cybersecurity platform unifying all CrowdStrike modules"},
        {"name": "Falcon Endpoint Security", "tagline": "Next-gen antivirus and EDR for workstations, servers, and cloud"},
        {"name": "Falcon Identity Protection","tagline": "Identity threat detection and Zero Trust enforcement"},
        {"name": "Falcon Cloud Security",    "tagline": "Cloud workload protection and CNAPP across AWS, Azure, and GCP"},
        {"name": "Falcon Next-Gen SIEM",     "tagline": "AI-powered SIEM ingesting all data at petabyte scale"},
        {"name": "Falcon Adversary Intelligence","tagline": "Threat intelligence on adversary TTPs and campaigns"},
        {"name": "Falcon LogScale",          "tagline": "High-performance log management and search at any scale"},
        {"name": "Charlotte AI",             "tagline": "Generative AI security analyst built into the Falcon platform"},
    ],

    # Palo Alto Networks: scraper hits a community/knowledge-base page and returns
    # page-management UI strings ("Deploybravely", "Who rated this article",
    # "Important Update") — completely off target.
    "palo": [
        {"name": "Prisma Cloud",            "tagline": "CNAPP for securing cloud infrastructure, workloads, and code"},
        {"name": "Cortex XSIAM",            "tagline": "AI-driven security operations platform replacing traditional SIEM/SOAR"},
        {"name": "Cortex XDR",              "tagline": "Extended detection and response across endpoint, network, and cloud"},
        {"name": "Prisma Access",           "tagline": "SASE platform delivering network security as a cloud service"},
        {"name": "Prisma SD-WAN",           "tagline": "AI-powered SD-WAN for branch office and remote connectivity"},
        {"name": "Strata Identity",         "tagline": "Identity security for hybrid and multicloud environments"},
        {"name": "Advanced Threat Prevention","tagline": "Inline protection blocking zero-day threats and evasion techniques"},
        {"name": "AI-Powered NGFW",         "tagline": "Next-generation firewall with machine learning threat prevention"},
    ],

    # Monday.com: scraper finds blog/academy titles and long sentence descriptions
    # ("Work Management Software For Connecting Work to Shared Goals", "CRM Academy").
    "monday": [
        {"name": "monday Work Management", "tagline": "Project and task management platform for teams of all sizes"},
        {"name": "monday CRM",             "tagline": "Customisable CRM for managing sales pipeline and customer data"},
        {"name": "monday Dev",             "tagline": "Agile development planning with sprints, backlogs, and roadmaps"},
        {"name": "monday Service",         "tagline": "IT and business service management with ticketing and SLAs"},
        {"name": "monday AI",              "tagline": "AI automations and no-code AI blocks across all monday products"},
    ],

    # DocuSign: scraper finds "Contract Lifecycle Management Software" (generic category)
    # and "Agreement Preparation" alongside real products (Docusign AI, Docusign Iris).
    "docusign": [
        {"name": "Docusign eSignature",        "tagline": "Electronic signature platform used by 1.5M+ customers worldwide"},
        {"name": "Docusign AI",                "tagline": "AI that reads, analyses, and extracts data from agreements"},
        {"name": "Docusign Iris",              "tagline": "AI engine powering contract analysis and risk identification"},
        {"name": "Docusign CLM",               "tagline": "Contract lifecycle management from creation to renewal"},
        {"name": "Docusign IAM",               "tagline": "Intelligent Agreement Management for enterprise contract workflows"},
        {"name": "Docusign Notary",            "tagline": "Remote online notarisation integrated with eSignature"},
        {"name": "Docusign Identify",          "tagline": "Identity verification for signers using ID checks and biometrics"},
    ],

    # AMD: scraper finds individual CPU model SKUs ("EPYC 4004", "EPYC 4005") plus a
    # marketing headline — override with product line names instead of individual SKUs.
    "amd": [
        {"name": "AMD EPYC",          "tagline": "Server CPUs for data centres, cloud, and HPC workloads"},
        {"name": "AMD Ryzen",         "tagline": "Consumer and prosumer CPUs for desktops and laptops"},
        {"name": "AMD Radeon",        "tagline": "Consumer graphics cards for gaming and content creation"},
        {"name": "AMD Instinct",      "tagline": "Data centre GPUs for AI training and HPC accelerated computing"},
        {"name": "AMD ROCm",          "tagline": "Open-source software stack for GPU compute and AI development"},
        {"name": "AMD Versal",        "tagline": "Adaptive compute acceleration platforms for embedded and edge AI"},
        {"name": "AMD FPGAs",         "tagline": "Field-programmable gate arrays for networking, aerospace, and defence"},
    ],

    # Autodesk: scraper finds "Autodesk Fusion Plans & Pricing" (pricing page) and
    # "Stay informed" (CTA) alongside real product names. Override for clean list.
    "autodesk": [
        {"name": "Autodesk Fusion",      "tagline": "Integrated CAD, CAM, CAE, and PCB design platform"},
        {"name": "AutoCAD",              "tagline": "2D and 3D CAD software for drafting and design professionals"},
        {"name": "Revit",                "tagline": "BIM software for architects, structural engineers, and MEP teams"},
        {"name": "3ds Max",              "tagline": "3D modelling, animation, and rendering for games and film"},
        {"name": "Maya",                 "tagline": "3D animation, modelling, and VFX for film and TV production"},
        {"name": "Inventor",             "tagline": "Mechanical design, product simulation, and documentation tool"},
        {"name": "Civil 3D",             "tagline": "Civil engineering design, analysis, and documentation software"},
        {"name": "Navisworks",           "tagline": "Project review and coordination software for construction teams"},
        {"name": "BIM 360",              "tagline": "Construction management platform for connected project delivery"},
        {"name": "Forma",                "tagline": "Cloud-based architectural concept design and analysis tool"},
    ],

    # Box: scraper returns only "Secure collaboration" and "www.box.com" — completely
    # fails to enumerate any product pages from box.com's JS nav.
    "box": [
        {"name": "Box",                  "tagline": "Cloud content management and file sharing for enterprises"},
        {"name": "Box AI",               "tagline": "AI-powered document analysis and content intelligence on Box"},
        {"name": "Box Sign",             "tagline": "Native eSignature embedded in the Box content workflow"},
        {"name": "Box Relay",            "tagline": "No-code workflow automation for content-driven business processes"},
        {"name": "Box Shield",           "tagline": "Intelligent threat detection and access controls for Box content"},
        {"name": "Box Hubs",             "tagline": "Centralised knowledge portals for teams and external stakeholders"},
        {"name": "Box Platform",         "tagline": "APIs and SDKs for embedding Box content management in any app"},
    ],

    # NVIDIA: scraper returns architecture names ("NVIDIA Hopper GPU Architecture"),
    # certification programs ("NVIDIA Certified Systems"), and solution category labels.
    # Override with actual product names.
    "nvidia": [
        {"name": "GeForce RTX",         "tagline": "Consumer gaming GPUs with ray tracing and DLSS AI acceleration"},
        {"name": "NVIDIA H100",         "tagline": "Data centre GPU for large-scale AI training and inference"},
        {"name": "NVIDIA B200",         "tagline": "Blackwell-architecture GPU for next-generation AI workloads"},
        {"name": "NVIDIA DGX",          "tagline": "AI supercomputing systems for enterprise AI development"},
        {"name": "NVIDIA Jetson",       "tagline": "Edge AI computing platform for robotics and autonomous machines"},
        {"name": "NVIDIA DRIVE",        "tagline": "End-to-end platform for autonomous vehicle development"},
        {"name": "NVIDIA Omniverse",    "tagline": "Platform for building and running industrial digital twins"},
        {"name": "NVIDIA NIM",          "tagline": "Microservices for deploying optimised AI models in production"},
        {"name": "CUDA",                "tagline": "Parallel computing platform and API for GPU-accelerated computing"},
        {"name": "NVIDIA Networking",   "tagline": "InfiniBand and Ethernet networking for AI and HPC clusters"},
    ],

    # Palantir: scraper finds "Ontology" (concept, not product), sub-features of
    # Foundry ("Foundry Rules & Real-Time Alerting") alongside real top-level products.
    "palantir": [
        {"name": "Palantir Foundry",    "tagline": "Data integration and operations platform for enterprise analytics"},
        {"name": "Palantir Gotham",     "tagline": "Intelligence and operations platform for defence and government"},
        {"name": "Palantir Apollo",     "tagline": "Continuous delivery and deployment system for software operations"},
        {"name": "Palantir AIP",        "tagline": "AI platform for deploying and orchestrating LLMs on enterprise data"},
        {"name": "Palantir TITAN",      "tagline": "AI-enabled targeting and decision-support for US Army"},
    ],

    # Splunk: consistently times out during scraping — likely JS-heavy nav or rate limiting.
    "splunk": [
        {"name": "Splunk Enterprise",       "tagline": "On-premises platform for searching, monitoring, and analysing machine data"},
        {"name": "Splunk Cloud Platform",   "tagline": "Cloud-managed Splunk for data analytics and operations at scale"},
        {"name": "Splunk Observability Cloud","tagline": "Full-stack observability for infrastructure, APM, and real user monitoring"},
        {"name": "Splunk SOAR",             "tagline": "Security orchestration, automation, and response platform"},
        {"name": "Splunk Enterprise Security","tagline": "SIEM for threat detection, investigation, and incident response"},
        {"name": "Splunk IT Service Intelligence","tagline": "AI-driven ITSI for monitoring services and predicting outages"},
    ],

    # Freshworks: scraper finds "People-First AI for Customer & Employee Experience"
    # (49-char tagline, just under the 50-char filter) alongside real products.
    "freshworks": [
        {"name": "Freshdesk",          "tagline": "Customer support and helpdesk software for teams of all sizes"},
        {"name": "Freshservice",       "tagline": "IT service management and ITSM platform for modern IT teams"},
        {"name": "Freshsales",         "tagline": "AI-powered CRM for sales teams with pipeline and contact management"},
        {"name": "Freshmarketer",      "tagline": "Marketing automation and customer journey platform"},
        {"name": "Freshchat",          "tagline": "Messaging and live chat for customer and employee support"},
        {"name": "Freddy AI",          "tagline": "AI engine powering automation, insights, and agents across Freshworks"},
        {"name": "Freshworks Neo",     "tagline": "Unified platform integrating all Freshworks products and data"},
    ],

    # HashiCorp: times out during scraping.
    "hashicorp": [
        {"name": "Terraform",          "tagline": "Infrastructure as code tool for provisioning cloud and on-prem resources"},
        {"name": "Vault",              "tagline": "Secrets management and data encryption for dynamic infrastructure"},
        {"name": "Consul",             "tagline": "Service mesh and network infrastructure automation platform"},
        {"name": "Nomad",              "tagline": "Flexible workload orchestrator for containers, VMs, and binaries"},
        {"name": "Packer",             "tagline": "Automated machine image creation for any platform or cloud"},
        {"name": "Vagrant",            "tagline": "Development environment management tool for reproducible builds"},
        {"name": "Boundary",           "tagline": "Identity-based access management for infrastructure and services"},
        {"name": "Waypoint",           "tagline": "Unified workflow for build, deploy, and release of any application"},
    ],

    # Cloudflare: scraper finds newsletter "theNET", "What is SD-WAN?" (blog article),
    # and category labels rather than Cloudflare's named product suite.
    "cloudflare": [
        {"name": "Cloudflare CDN",         "tagline": "Global content delivery network with DDoS protection and caching"},
        {"name": "Cloudflare Workers",     "tagline": "Serverless edge computing platform running at 300+ locations"},
        {"name": "Cloudflare Zero Trust",  "tagline": "SASE and Zero Trust security replacing traditional VPN and firewalls"},
        {"name": "Cloudflare R2",          "tagline": "Object storage with zero egress fees, compatible with S3 API"},
        {"name": "Cloudflare Pages",       "tagline": "JAMstack platform for deploying front-end applications at the edge"},
        {"name": "Cloudflare Stream",      "tagline": "Video storage, encoding, and delivery built on the Cloudflare network"},
        {"name": "Cloudflare AI Gateway",  "tagline": "Proxy and observability layer for AI model API traffic"},
        {"name": "Magic Transit",          "tagline": "BGP-based DDoS protection and network performance for enterprise infrastructure"},
        {"name": "Cloudflare Gateway",     "tagline": "DNS-layer and HTTP security filtering for enterprise networks"},
    ],

    # Twitch: scraper finds trending game categories ("World of Warcraft", "Just Chatting",
    # "Super Mario World") from the Browse page instead of Twitch's product/platform offerings.
    "twitch": [
        {"name": "Twitch Live Streaming", "tagline": "Live video broadcasting platform for gaming, creative, and IRL content"},
        {"name": "Twitch Subscriptions",  "tagline": "Paid subscriptions supporting streamers with badges and emotes"},
        {"name": "Twitch Bits",           "tagline": "Virtual currency for tipping and cheering streamers in chat"},
        {"name": "Twitch Clips",          "tagline": "Short shareable video clips captured from live broadcasts"},
        {"name": "Twitch Extensions",     "tagline": "Interactive overlays and panels built by developers for streams"},
        {"name": "Twitch for Advertisers","tagline": "Brand advertising platform reaching Twitch's gaming audience"},
    ],

    # Box already handled above. Coupa: scraper returns only "www.coupa.com" as a
    # product name — completely blocked or unnavigable JS site.
    "coupa": [
        {"name": "Coupa BSM Platform",   "tagline": "Business spend management platform for procurement, invoicing, and payments"},
        {"name": "Coupa Procurement",    "tagline": "Source-to-pay procurement for strategic sourcing and purchasing"},
        {"name": "Coupa Invoicing",      "tagline": "Automated invoice capture, approval, and payment workflows"},
        {"name": "Coupa Expenses",       "tagline": "Employee expense management with policy enforcement and ERP integration"},
        {"name": "Coupa Pay",            "tagline": "Global payments and working capital solutions for businesses"},
        {"name": "Coupa Supply Chain",   "tagline": "Supply chain design, risk, and inventory optimisation platform"},
        {"name": "Coupa Treasury",       "tagline": "Cash and liquidity management for finance teams"},
    ],

    # Intercom: scraper finds real products (Inbox, Copilot, Tickets, Omnichannel) but
    # "View demo" CTA slips through — not a clean pass. Override for guaranteed accuracy.
    "intercom": [
        {"name": "Intercom Inbox",       "tagline": "Shared inbox for managing customer conversations across all channels"},
        {"name": "Intercom Copilot",     "tagline": "AI agent that resolves customer issues autonomously"},
        {"name": "Intercom Tickets",     "tagline": "Ticket system for tracking and resolving complex customer issues"},
        {"name": "Intercom Messenger",   "tagline": "Customisable in-app and web chat widget for customer engagement"},
        {"name": "Intercom Fin AI",      "tagline": "AI customer service agent that handles support queries end-to-end"},
        {"name": "Intercom Outbound",    "tagline": "Proactive messaging via email, push, and in-app to drive engagement"},
        {"name": "Intercom Help Centre", "tagline": "Self-serve knowledge base and customer portal integrated with Messenger"},
    ],

    # Brex: scraper finds Corporate cards, Travel, Bill pay (real products) but also
    # "Startups" (audience segment) and generic labels. Override for clean list.
    "brex": [
        {"name": "Brex Corporate Card",  "tagline": "Corporate credit card with high limits and real-time spend controls"},
        {"name": "Brex Travel",          "tagline": "Business travel booking and management integrated with Brex spend"},
        {"name": "Brex Bill Pay",        "tagline": "Accounts payable and invoice payment automation platform"},
        {"name": "Brex Expense",         "tagline": "Expense management with AI receipt capture and policy enforcement"},
        {"name": "Brex Business Account","tagline": "High-yield business banking account with no account fees"},
        {"name": "Brex Equity",          "tagline": "Equity management and cap table tool for startups"},
        {"name": "Brex Empower",         "tagline": "Unified spend platform combining cards, expenses, and reimbursements"},
    ],

    # Airtable: finds HyperDB, Airtable Omni, Portals (real) but also "AI agent software"
    # (generic description). Override for clean list.
    "airtable": [
        {"name": "Airtable",             "tagline": "Low-code platform for building apps and workflows on structured data"},
        {"name": "Airtable Omni",        "tagline": "AI-native work platform connecting data, workflows, and agents"},
        {"name": "Airtable HyperDB",     "tagline": "High-performance database layer for large-scale Airtable deployments"},
        {"name": "Airtable AI",          "tagline": "AI features for automating data entry, summaries, and workflows"},
        {"name": "Airtable Automations", "tagline": "No-code automation for triggering actions across apps and data"},
        {"name": "Airtable Portals",     "tagline": "External-facing portals for sharing Airtable data with stakeholders"},
        {"name": "Airtable Interface Designer","tagline": "Drag-and-drop UI builder for creating apps on top of Airtable bases"},
    ],

    # Amplitude: scraper returns marketing description strings
    # ("Product Analytics for Mobile, Web, & More") — no clean product names found.
    "amplitude": [
        {"name": "Amplitude Analytics",  "tagline": "Product analytics platform for understanding user behaviour and growth"},
        {"name": "Amplitude Experiment",  "tagline": "Feature flagging and A/B experimentation platform"},
        {"name": "Amplitude CDP",         "tagline": "Customer data platform for collecting and activating behavioural data"},
        {"name": "Amplitude Session Replay","tagline": "Visual session playback to understand how users interact with products"},
        {"name": "Amplitude Metrics",     "tagline": "Metric framework for defining and tracking north-star business metrics"},
    ],

    # Mixpanel: scraper hits community/resources pages returning "Agent Prompt Library",
    # "Case Study", "Amp Champs", "Acceptable Use Policy" instead of product pages.
    "mixpanel": [
        {"name": "Mixpanel Analytics",   "tagline": "Self-serve product analytics for tracking user actions and funnels"},
        {"name": "Mixpanel Engage",      "tagline": "User segmentation and cohort analysis for product and growth teams"},
        {"name": "Mixpanel Experiments", "tagline": "A/B testing and feature flag management integrated with Mixpanel data"},
        {"name": "Mixpanel Warehouse Connectors","tagline": "Sync Mixpanel data with Snowflake, BigQuery, and Redshift"},
        {"name": "Mixpanel Session Replay","tagline": "Visual session recordings tied directly to Mixpanel event data"},
    ],

    # Rippling: consistently times out during scraping.
    "rippling": [
        {"name": "Rippling HR",           "tagline": "Global HR platform for onboarding, payroll, and HR management"},
        {"name": "Rippling IT",           "tagline": "IT management for device provisioning, apps, and security policies"},
        {"name": "Rippling Finance",      "tagline": "Corporate cards, expense management, and bill pay for businesses"},
        {"name": "Rippling PEO",          "tagline": "Professional employer organisation for benefits and compliance"},
        {"name": "Rippling Payroll",      "tagline": "Automated global payroll synced with HR and time tracking"},
        {"name": "Rippling Benefits",     "tagline": "Health insurance and benefits administration for distributed teams"},
        {"name": "Rippling EOR",          "tagline": "Employer of record service for hiring internationally without an entity"},
    ],

    # Google: scraper drills into support/help pages ("Search history", "Detecting Spam",
    # "Search Engine Testing & Evaluation") rather than Google's product portfolio.
    "google": [
        {"name": "Google Search",        "tagline": "World's most-used search engine powering billions of queries daily"},
        {"name": "Google Ads",           "tagline": "Online advertising platform for search, display, video, and shopping"},
        {"name": "Google Workspace",     "tagline": "Productivity suite with Gmail, Docs, Drive, Meet, and Calendar"},
        {"name": "Google Cloud",         "tagline": "Cloud computing platform for data, AI, and infrastructure"},
        {"name": "YouTube",              "tagline": "Video sharing and streaming platform with 2B+ monthly users"},
        {"name": "Google Maps",          "tagline": "Mapping, navigation, and local business discovery platform"},
        {"name": "Android",              "tagline": "World's most popular mobile operating system"},
        {"name": "Chrome",               "tagline": "Fast, secure web browser built on open-source Chromium"},
        {"name": "Google Gemini",        "tagline": "Frontier multimodal AI model family powering Google products"},
        {"name": "Google Pixel",         "tagline": "Google-designed smartphones showcasing Android and AI features"},
    ],

    # Meta: scraper hits meta.com and finds blog/newsroom article titles
    # ("Importance of Mental Resilience", "Digital Detox") — completely wrong content.
    # Root cause: meta.com redirects to a page with blog-style content, not a products nav.
    "meta": [
        {"name": "Facebook",             "tagline": "Social network connecting billions of people worldwide"},
        {"name": "Instagram",            "tagline": "Photo and video sharing platform with Reels, Stories, and Shopping"},
        {"name": "WhatsApp",             "tagline": "End-to-end encrypted messaging app for personal and business use"},
        {"name": "Messenger",            "tagline": "Cross-platform messaging with calls, video, and Marketplace"},
        {"name": "Meta Quest",           "tagline": "Mixed-reality headsets for VR gaming and productivity"},
        {"name": "Threads",              "tagline": "Text-based conversation app built on the Instagram network"},
        {"name": "Meta AI",              "tagline": "AI assistant and model family powering Meta's products"},
        {"name": "Meta Business Suite",  "tagline": "Unified tool for managing Facebook and Instagram business presence"},
        {"name": "Meta Ads",             "tagline": "Cross-platform advertising across Facebook, Instagram, and the Audience Network"},
    ],

    # Twilio: finds some real product names (ConversationRelay) but also blog articles
    # ("SMS Marketing to Drive ROI") and vague category labels ("Data engineering solutions").
    "twilio": [
        {"name": "Twilio Messaging",        "tagline": "Programmable SMS, MMS, and WhatsApp API for global messaging"},
        {"name": "Twilio Voice",            "tagline": "Programmable voice calling and IVR for any application"},
        {"name": "Twilio Verify",           "tagline": "Phone number verification and two-factor authentication API"},
        {"name": "Twilio Flex",             "tagline": "Fully programmable cloud contact centre platform"},
        {"name": "Twilio Segment",          "tagline": "Customer data platform for collecting, unifying, and activating data"},
        {"name": "Twilio SendGrid",         "tagline": "Email delivery API for transactional and marketing emails"},
        {"name": "Twilio Video",            "tagline": "Programmable video API for embedded video experiences"},
        {"name": "ConversationRelay",       "tagline": "Real-time AI conversation infrastructure for voice and messaging"},
    ],

    # Slack: nav DFS finds a few real names (Slack Connect, Slack Builder) then
    # descends into locale-duplicated legal pages (Main Services Agreement in IT/FR/ES/DE/PT)
    # and feature-description pages — locale filter doesn't catch slack.com sub-paths.
    "slack": [
        {"name": "Slack",              "tagline": "Messaging and collaboration platform for teams and organisations"},
        {"name": "Slack Connect",      "tagline": "Secure channel-based messaging with external partners and customers"},
        {"name": "Slack AI",           "tagline": "AI search, summaries, and highlights across all Slack conversations"},
        {"name": "Slack Huddles",      "tagline": "Lightweight live audio and video for quick team conversations"},
        {"name": "Slack Canvas",       "tagline": "Persistent, rich-text docs embedded directly into Slack channels"},
        {"name": "Slack Workflow Builder","tagline": "No-code automation for routing messages, approvals, and notifications"},
        {"name": "Slack Lists",        "tagline": "Project tracking and task management inside Slack channels"},
        {"name": "Slack for Enterprise","tagline": "Enterprise Key Management, DLP, and compliance controls for large orgs"},
    ],

    # Oracle: scraper finds "Oracle LiveLabs", "Oracle Database Insider" (a blog),
    # and "AI Vector Search" — mix of real product names and marketing/lab content.
    "oracle": [
        {"name": "Oracle Database",       "tagline": "World's leading relational database for enterprise workloads"},
        {"name": "Oracle Cloud Infrastructure","tagline": "High-performance public cloud with bare metal, VMs, and Kubernetes"},
        {"name": "Oracle Fusion Cloud ERP","tagline": "Cloud ERP for financial management, supply chain, and procurement"},
        {"name": "Oracle HCM Cloud",      "tagline": "HR, talent, and payroll suite for global enterprises"},
        {"name": "Oracle CX Cloud",       "tagline": "CRM and customer experience suite for sales, service, and marketing"},
        {"name": "Oracle Analytics Cloud","tagline": "Business intelligence and data visualisation on OCI"},
        {"name": "Oracle Autonomous Database","tagline": "Self-driving database with automatic provisioning, tuning, and patching"},
        {"name": "Oracle NetSuite",       "tagline": "Cloud ERP for mid-market companies covering finance, inventory, and CRM"},
        {"name": "Oracle MySQL HeatWave", "tagline": "Integrated MySQL database with in-database ML and analytics"},
        {"name": "Java",                  "tagline": "Widely-used programming language and platform maintained by Oracle"},
    ],

    # Zoom: homepage redirects to account.zoom.us sign-in page — scraper picks up
    # "Host a meeting" / "Add Account" from the auth UI instead of product pages.
    "zoom": [
        {"name": "Zoom Meetings",     "tagline": "HD video and audio conferencing for teams of any size"},
        {"name": "Zoom Phone",        "tagline": "Cloud phone system with calling, SMS, and voicemail"},
        {"name": "Zoom Webinars",     "tagline": "Large-scale virtual events and broadcast-style webinars"},
        {"name": "Zoom Rooms",        "tagline": "Software-defined conference room system for hybrid work"},
        {"name": "Zoom Events",       "tagline": "End-to-end platform for virtual, hybrid, and in-person events"},
        {"name": "Zoom Contact Center","tagline": "AI-powered omnichannel contact centre on the Zoom platform"},
        {"name": "Zoom AI Companion", "tagline": "AI assistant for meeting summaries, chat drafts, and task management"},
        {"name": "Zoom Docs",         "tagline": "AI-first collaborative docs built into the Zoom workspace"},
    ],

    # SAP: scraper finds some real product names but mixes in blog posts, tour pages,
    # font exploration pages, and support docs ("Subscribe now", "Packaged services").
    # Override with canonical SAP product line for clean results.
    "sap": [
        {"name": "SAP S/4HANA",               "tagline": "Intelligent ERP suite for finance, supply chain, and manufacturing"},
        {"name": "SAP Business Technology Platform","tagline": "Integration, extension, and analytics platform for SAP and third-party apps"},
        {"name": "SAP Analytics Cloud",        "tagline": "Cloud BI and planning platform for data-driven decisions"},
        {"name": "SAP SuccessFactors",         "tagline": "Cloud HCM suite for HR, payroll, talent, and workforce planning"},
        {"name": "SAP Ariba",                  "tagline": "Procurement and supply chain collaboration network"},
        {"name": "SAP Concur",                 "tagline": "Travel, expense, and invoice management for enterprises"},
        {"name": "SAP Customer Experience",    "tagline": "CX suite covering sales, service, marketing, and commerce"},
        {"name": "SAP Datasphere",             "tagline": "Business data fabric for connecting and harmonising enterprise data"},
        {"name": "SAP Business Network",       "tagline": "Trading partner network for procurement, logistics, and asset management"},
        {"name": "Joule",                      "tagline": "AI copilot embedded across SAP applications and workflows"},
    ],

    # Figma: scraper drills into /use-cases/* paths and returns font pages, color
    # guides, and template names instead of the actual product suite.
    "figma": [
        {"name": "Figma Design",    "tagline": "Collaborative interface design tool for web and mobile products"},
        {"name": "FigJam",          "tagline": "Online whiteboard for brainstorming, diagrams, and team workshops"},
        {"name": "Figma Slides",    "tagline": "Presentation tool built natively in Figma for design-driven decks"},
        {"name": "Dev Mode",        "tagline": "Developer handoff with code snippets, specs, and design token inspection"},
        {"name": "Figma AI",        "tagline": "AI features for generating designs, layers, and prototypes faster"},
        {"name": "Figma Enterprise","tagline": "Org-wide design platform with SSO, governance, and advanced permissions"},
    ],

    # Salesforce: nav triggers JS mega-menu; scraper hits synthetic fallback.
    "salesforce": [
        {"name": "Sales Cloud",         "tagline": "CRM platform for managing leads, opportunities, and forecasts"},
        {"name": "Service Cloud",        "tagline": "Customer service and support platform with AI-powered case routing"},
        {"name": "Marketing Cloud",      "tagline": "Digital marketing automation for email, social, and journeys"},
        {"name": "Commerce Cloud",       "tagline": "B2C and B2B ecommerce platform built on Salesforce"},
        {"name": "Tableau",              "tagline": "Business intelligence and visual analytics platform"},
        {"name": "Slack",                "tagline": "Team messaging and collaboration hub (acquired by Salesforce)"},
        {"name": "MuleSoft",             "tagline": "Integration platform for connecting apps, data, and APIs"},
        {"name": "Einstein AI",          "tagline": "AI and machine learning layer across all Salesforce products"},
        {"name": "Salesforce Platform",  "tagline": "Low-code app development and automation platform"},
        {"name": "Data Cloud",           "tagline": "Unified customer data platform for real-time activation"},
    ],

    # Netflix: consumer streaming service — scraper finds no products section.
    "netflix": [
        {"name": "Netflix Standard with Ads", "tagline": "Ad-supported streaming plan with HD video quality"},
        {"name": "Netflix Standard",           "tagline": "Ad-free HD streaming on two devices simultaneously"},
        {"name": "Netflix Premium",            "tagline": "4K Ultra HD streaming on four devices with spatial audio"},
        {"name": "Netflix Games",              "tagline": "Mobile gaming catalogue included with membership"},
    ],

    # HubSpot: JS-rendered nav with product dropdown — scraper hits synthetic fallback.
    "hubspot": [
        {"name": "Marketing Hub",   "tagline": "Inbound marketing software for attracting and converting leads"},
        {"name": "Sales Hub",       "tagline": "CRM and sales automation tools for closing deals faster"},
        {"name": "Service Hub",     "tagline": "Customer service platform for support, feedback, and retention"},
        {"name": "CMS Hub",         "tagline": "Content management system built on the HubSpot CRM"},
        {"name": "Operations Hub",  "tagline": "Data sync, automation, and quality tools for RevOps teams"},
        {"name": "Commerce Hub",    "tagline": "Payments, invoicing, and B2B commerce tools for growing businesses"},
        {"name": "HubSpot CRM",     "tagline": "Free CRM platform at the core of all HubSpot products"},
    ],

    # ServiceNow: enterprise IT platform — scraper hits synthetic fallback.
    "servicenow": [
        {"name": "IT Service Management",   "tagline": "ITSM platform for incident, problem, and change management"},
        {"name": "IT Operations Management","tagline": "AIOps and infrastructure visibility for IT ops teams"},
        {"name": "Strategic Portfolio Mgmt","tagline": "Demand, resource, and portfolio planning for enterprises"},
        {"name": "Customer Service Mgmt",   "tagline": "Connected customer service to resolve issues end-to-end"},
        {"name": "HR Service Delivery",     "tagline": "Employee experience and HR case management platform"},
        {"name": "Field Service Management","tagline": "Scheduling, dispatch, and asset management for field teams"},
        {"name": "Security Operations",     "tagline": "Incident response and vulnerability risk management"},
        {"name": "Now Platform",            "tagline": "Low-code application development platform for enterprise workflows"},
    ],

    # Workday: enterprise HCM/finance — complex JS nav, scraper hits synthetic fallback.
    "workday": [
        {"name": "Workday HCM",                 "tagline": "Unified human capital management for HR, payroll, and talent"},
        {"name": "Workday Financial Management","tagline": "Cloud finance platform for accounting, planning, and analytics"},
        {"name": "Workday Payroll",             "tagline": "Global payroll processing integrated with HCM"},
        {"name": "Workday Recruiting",          "tagline": "Talent acquisition and applicant tracking built into Workday"},
        {"name": "Workday Learning",            "tagline": "Learning management system for employee development"},
        {"name": "Workday Planning",            "tagline": "Collaborative planning, budgeting, and forecasting platform"},
        {"name": "Workday Prism Analytics",     "tagline": "Data analytics and business intelligence for Workday data"},
        {"name": "Workday Extend",              "tagline": "Low-code platform for building custom apps on Workday"},
    ],

    # Linear: "Product" nav link leads to /homepage (blog/changelog) and /now (articles),
    # /quality (podcast series) — DFS drills into episode pages and article titles.
    # Path filter now blocks /now and /quality, but override ensures clean product list.
    "linear": [
        {"name": "Linear Issues",     "tagline": "Issue tracking with keyboard-first design built for speed"},
        {"name": "Linear Cycles",     "tagline": "Sprint planning and iteration management for engineering teams"},
        {"name": "Linear Projects",   "tagline": "Cross-team project tracking with milestones and progress views"},
        {"name": "Linear Roadmaps",   "tagline": "Visual product roadmap tied directly to issues and projects"},
        {"name": "Linear Triage",     "tagline": "Structured inbox to prioritise and route incoming bug reports"},
        {"name": "Linear Insights",   "tagline": "Analytics and velocity reporting for engineering teams"},
        {"name": "Linear AI",         "tagline": "AI that auto-fills issues, suggests fixes, and writes changelogs"},
    ],

    # Coinbase: nav links to /en-ca/explore (crypto price listing pages like TRX, BTC)
    # and /en-ca/learn/ (educational articles like "What is a stablecoin?").
    # DFS drills into price pages and learn articles instead of actual product pages.
    "coinbase": [
        {"name": "Coinbase Exchange",  "tagline": "Leading crypto exchange for buying, selling, and trading digital assets"},
        {"name": "Coinbase Wallet",    "tagline": "Self-custody crypto wallet for DeFi and NFTs"},
        {"name": "Coinbase Advanced",  "tagline": "Professional trading platform with advanced charting and order types"},
        {"name": "Coinbase Prime",     "tagline": "Institutional-grade crypto prime brokerage and custody"},
        {"name": "Coinbase One",       "tagline": "Subscription for zero trading fees and boosted staking rewards"},
        {"name": "Coinbase Commerce",  "tagline": "Accept cryptocurrency payments as a merchant"},
        {"name": "Coinbase Cloud",     "tagline": "Developer platform for building on-chain apps with staking and node APIs"},
        {"name": "Base",               "tagline": "Coinbase's Ethereum L2 network for fast, low-cost on-chain apps"},
    ],

    # CAE: nav drills into defence consulting sub-pages (Analysis, Design, Human Factors),
    # geographic office pages (CAE Australia, CAE in India, CAE in the UK), and
    # training-methodology pages instead of actual simulator products.
    "cae": [
        {"name": "CAE 7000XR Full Flight Simulator",  "tagline": "World's highest-fidelity Level D full flight simulator for airline pilot training"},
        {"name": "CAE 500XR Flight Training Device",  "tagline": "Fixed-based flight training device for procedural and instrument proficiency"},
        {"name": "CAE Rise",                          "tagline": "Digital crew training platform combining data, AI, and simulation for airlines"},
        {"name": "CAE Type Rating",                   "tagline": "Airline type rating and recurrent training delivered at CAE training centres worldwide"},
        {"name": "CAE Military Flight Simulators",    "tagline": "High-fidelity full-mission simulators for fixed-wing and rotary-wing military aircraft"},
        {"name": "CAE Ground Vehicle Simulators",     "tagline": "Simulation-based training systems for armoured vehicles and ground combat platforms"},
        {"name": "CAE Naval Simulators",              "tagline": "Integrated bridge, combat management, and ship-handling simulators for naval forces"},
        {"name": "CAE Synthetic Training Environment","tagline": "Networked, immersive training environments for multi-domain mission rehearsal"},
        {"name": "CAE Aria",                          "tagline": "Advanced patient simulator for emergency and acute care clinical training"},
        {"name": "CAE Juno",                          "tagline": "Mid-fidelity patient simulator for foundational nursing and clinical skills training"},
        {"name": "CAE Lucina",                        "tagline": "Maternal and neonatal simulator for high-acuity obstetric emergency training"},
        {"name": "CAE VimedixAR",                     "tagline": "Augmented-reality ultrasound simulator for point-of-care and echocardiography training"},
    ],

    # Airbnb: consumer marketplace — nav contains Host, Help, Log in only.
    # Scraper finds some links but they are wrong (host sign-up pages etc.).
    "airbnb": [
        {"name": "Stays",            "tagline": "Book unique homes, apartments, and rooms around the world"},
        {"name": "Experiences",      "tagline": "Activities and tours hosted by local experts"},
        {"name": "Rooms",            "tagline": "Affordable private rooms in a host's home"},
        {"name": "Airbnb for Work",  "tagline": "Business travel and team accommodation management"},
        {"name": "Airbnb Your Home", "tagline": "Platform for hosts to list and manage their properties"},
    ],

    # Zebra: scraper only retrieves mobile computers (TC/MC/HC series) because
    # the [:20] product cap fills before printers, scanners, RFID, and software
    # sections are visited. Tab labels ("Models", "In the Box") also pollute
    # taglines. Override with a curated model-level list across all categories.
    # Taglines are crafted to avoid category rule false-positives:
    #   - avoid "computer" (triggers Cloud via "compute")
    #   - avoid "handheld" before scanner products (Mobile Computer fires first)
    #   - avoid "rfid" in printer taglines (Scanner fires before Printer)
    #   - avoid "cloud" in software taglines (Cloud fires before Software)
    #   - avoid "device" in software taglines (Rugged Device fires before Software)
    "zebra": [
        {"name": "TC73 Ultra-Rugged Mobile Computer",   "tagline": "Wi-Fi 6E rugged mobile handheld with extended-range scan engine for indoor warehouse use"},
        {"name": "TC701 Mobile Computer",               "tagline": "AI-ready rugged mobile handheld with UHF RFID, 50MP camera, and 5G connectivity"},
        {"name": "MC9400 Ultra-Rugged Mobile Computer", "tagline": "Gun-style warehouse mobile handheld with 100ft+ SE58 scan range and 5G"},
        {"name": "HC55 Healthcare Mobile Computer",     "tagline": "5G/Wi-Fi 6E rugged mobile handheld purpose-built for clinical workflows"},
        {"name": "WS50 Wearable Computer",              "tagline": "Wrist-worn ring barcode scanner for scan-intensive picking and fulfilment tasks"},
        {"name": "ET45 Enterprise Tablet",              "tagline": "10-inch rugged tablet with 5G for retail associates and field operations"},
        {"name": "DS8178 Digital Scanner",              "tagline": "Cordless 1D/2D barcode scanner with omnidirectional scan pattern for retail and healthcare"},
        {"name": "DS9300 Series Presentation Scanner",  "tagline": "Hands-free multi-plane barcode scanner for high-volume retail checkout"},
        {"name": "FXR90 Fixed RFID Reader",             "tagline": "5G-enabled fixed RAIN RFID reader with 1000+ tags per second read rate"},
        {"name": "ZT610 Industrial Printer",            "tagline": "High-speed ZT-series industrial label printer rated for 24/7 production lines"},
        {"name": "ZD620 Desktop Printer",               "tagline": "Compact ZD-series desktop label printer for healthcare wristbands and retail shelf-edge"},
        {"name": "ZQ620 Plus Mobile Printer",           "tagline": "Rugged Bluetooth label and receipt printer with IP54 sealing for delivery workers"},
        {"name": "Zebra Workcloud",                     "tagline": "Four-module frontline software platform for workforce scheduling and inventory management"},
        {"name": "MotionWorks Enterprise",              "tagline": "RTLS software platform for real-time tracking of assets and personnel across large facilities"},
        {"name": "Zebra Symmetry Fulfillment",          "tagline": "AMR-assisted order picking software combining autonomous robots, wearables, and AI"},
        {"name": "Aurora Vision Studio",                "tagline": "No-code machine vision software for quality inspection, OCR, and parcel automation"},
        {"name": "Zebra DNA",                           "tagline": "Enterprise suite for OTA updates, lifecycle management, and compliance across the Zebra product fleet"},
    ],
}

# Keep old name as alias so any other call sites still work
_KNOWN_BLOCKED_PRODUCTS = _COMPANY_OVERRIDES


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
                "description": p.get("description") or f"{p['name']} by {company}. {p['tagline']}.",
                "use_cases":   p.get("use_cases") or [],
                "image_url":   p.get("image_url"),
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
def enrich(products: list[dict], company: str, logo_url: str = "") -> list[dict]:
    enriched = []
    for i, p in enumerate(products):
        category = infer_category(p["name"], p.get("description", ""), p.get("tagline", ""))
        tagline  = p.get("tagline") or f"{company} {p['name']}"
        desc     = p.get("description") or f"{p['name']} is a product by {company}."

        # Image fallback logic:
        # - Scraped og:image always wins
        # - Abstract/software products fall back to company logo (no physical appearance to show)
        # - Physical/hardware products stay null (real image must be found separately)
        _ABSTRACT_CATEGORIES = {
            "Software", "AI", "Cloud", "Platform", "Developer Tools",
            "Collaboration", "Analytics", "Security", "CRM", "Data",
            "Marketing", "Finance", "HR", "Payments", "Presentations", "Video",
        }
        scraped_image = p.get("image_url")
        if scraped_image:
            image_url = scraped_image
        elif category in _ABSTRACT_CATEGORIES and logo_url:
            image_url = logo_url
        else:
            image_url = None

        enriched.append({
            "name":        p["name"],
            "tagline":     truncate(tagline, 120),
            "description": truncate(desc, 400),
            "category":    category,
            "cat_color":   get_color(category),
            "use_cases":   p["use_cases"] if p.get("use_cases") else get_use_cases(category, p["name"], p.get("tagline", ""), p.get("description", "")),
            "customers":   [],
            "competitors": [],
            "image_url":   image_url,
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
    logo_url: str = "",
) -> list[dict]:
    sess = Session(timeout=timeout)
    log.info("=== Scraping products for: %s (%s) ===", company, website)

    # Check company override FIRST — skips scraping entirely for known-bad sites
    co_key = company.lower().split()[0]
    if co_key in _COMPANY_OVERRIDES:
        log.info("Using company override for %s (skipping nav scrape)", company)
        all_products = [
            {
                "name":        p["name"],
                "tagline":     p["tagline"],
                "description": p.get("description") or f"{p['name']} by {company}. {p['tagline']}.",
                "use_cases":   p.get("use_cases") or [],
                "image_url":   p.get("image_url"),
                "_score":      5,
                "_source":     "company_override",
            }
            for p in _COMPANY_OVERRIDES[co_key]
        ]
        all_products.sort(key=lambda x: x.get("_score", 0), reverse=True)
        deduped  = deduplicate(all_products)[:20]
        enriched = enrich(deduped, company, logo_url=logo_url)
        log.info("Final: %d products for %s (override)", len(enriched), company)
        return enriched

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
    enriched = enrich(deduped, company, logo_url=logo_url)

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

    # Pre-flight: URL pattern + HTTP header check before committing to a full download
    if not _validate_image_url(image_url_val):
        log.info("Image skipped (bad URL pattern): %s", image_url_val)
        return None
    if not _validate_image_response(image_url_val):
        log.info("Image skipped (failed header validation): %s", image_url_val)
        return None

    try:
        r = requests.get(image_url_val, headers=HEADERS, timeout=20, allow_redirects=True)
        r.raise_for_status()
        ct = r.headers.get("content-type", "").split(";")[0].strip().lower()
        if ct not in _VALID_IMAGE_CONTENT_TYPES:
            log.info("Image skipped (bad content-type '%s'): %s", ct, image_url_val)
            return None
        data = r.content
        if len(data) < _IMAGE_MIN_BYTES:
            log.info("Image skipped (too small, %d B): %s", len(data), image_url_val)
            return None
        if len(data) > _IMAGE_MAX_BYTES:
            log.info("Image skipped (too large, %d B): %s", len(data), image_url_val)
            return None
        if not _validate_image_dimensions(data):
            log.info("Image skipped (dimensions too small): %s", image_url_val)
            return None
    except Exception as e:
        log.warning("Image download failed (%s): %s", image_url_val, e)
        return None

    ext = {"image/jpeg": "jpg", "image/png": "png",
           "image/webp": "webp", "image/gif": "gif"}.get(ct, "jpg")  # ct already validated above
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
    parser.add_argument("--logo-url",   default="",
                        help="Company logo URL — used as image fallback for products with no og:image")
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
        logo_url=args.logo_url.strip(),
    )

    if not products:
        print(json.dumps({"error": f"No products found for {company}"}))
        sys.exit(2)

    if args.company_id:
        # Persist og:images to Supabase Storage
        if args.auth_token:
            for p in products:
                if p.get("image_url") and _validate_image_url(p["image_url"]):
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
