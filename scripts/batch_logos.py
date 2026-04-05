#!/usr/bin/env python3
"""
Batch logo scraper — runs LogoScraper against every company in the list,
prints one JSON object per line: { "slug": "...", "logo_url": "..." }
Results are consumed by the calling process to UPDATE Supabase.
"""

import json
import sys
import logging
import os
from concurrent.futures import ThreadPoolExecutor, as_completed

# Import LogoScraper from sibling script
sys.path.insert(0, os.path.dirname(__file__))
from seed_company import LogoScraper, Session  # noqa: E402

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    stream=sys.stderr,
)
log = logging.getLogger("batch_logos")

# ── Company list from Supabase (slug → website) ───────────────────────────────
COMPANIES = [
    {"name": "Airbnb",             "slug": "airbnb",             "website": "https://airbnb.com"},
    {"name": "Anthropic",          "slug": "anthropic",          "website": "https://anthropic.com"},
    {"name": "Apple",              "slug": "apple",              "website": "https://apple.com"},
    {"name": "Atlassian",          "slug": "atlassian",          "website": "https://atlassian.com"},
    {"name": "Canva",              "slug": "canva",              "website": "https://canva.com"},
    {"name": "Cloudflare",         "slug": "cloudflare",         "website": "https://cloudflare.com"},
    {"name": "Coinbase",           "slug": "coinbase",           "website": "https://coinbase.com"},
    {"name": "Databricks",         "slug": "databricks",         "website": "https://databricks.com"},
    {"name": "Datadog",            "slug": "datadog",            "website": "https://datadoghq.com"},
    {"name": "DoorDash",           "slug": "doordash",           "website": "https://doordash.com"},
    {"name": "Figma",              "slug": "figma",              "website": "https://figma.com"},
    {"name": "Google",             "slug": "google",             "website": "https://google.com"},
    {"name": "Linear",             "slug": "linear",             "website": "https://linear.app"},
    {"name": "Meta",               "slug": "meta",               "website": "https://meta.com"},
    {"name": "MongoDB",            "slug": "mongodb",            "website": "https://mongodb.com"},
    {"name": "Netflix",            "slug": "netflix",            "website": "https://netflix.com"},
    {"name": "Notion",             "slug": "notion",             "website": "https://notion.so"},
    {"name": "OpenAI",             "slug": "openai",             "website": "https://openai.com"},
    {"name": "Palantir",           "slug": "palantir",           "website": "https://palantir.com"},
    {"name": "Shopify",            "slug": "shopify",            "website": "https://shopify.com"},
    {"name": "Snowflake",          "slug": "snowflake",          "website": "https://snowflake.com"},
    {"name": "Spotify",            "slug": "spotify",            "website": "https://spotify.com"},
    {"name": "Stripe",             "slug": "stripe",             "website": "https://stripe.com"},
    {"name": "Twilio",             "slug": "twilio",             "website": "https://twilio.com"},
    {"name": "Vercel",             "slug": "vercel",             "website": "https://vercel.com"},
    {"name": "Zebra Technologies", "slug": "zebra-technologies",  "website": "https://zebra.com"},
]


def scrape_one(company: dict) -> dict:
    session = Session(timeout=12)
    scraper = LogoScraper(session)
    try:
        url = scraper.fetch(company["name"], company["website"])
        log.info("%-22s → %s", company["slug"], url or "(none)")
        return {"slug": company["slug"], "logo_url": url}
    except Exception as e:
        log.warning("%-22s → ERROR: %s", company["slug"], e)
        return {"slug": company["slug"], "logo_url": ""}


def main():
    results = []
    # 6 workers — polite enough not to hammer any single server
    with ThreadPoolExecutor(max_workers=6) as pool:
        futures = {pool.submit(scrape_one, c): c for c in COMPANIES}
        for future in as_completed(futures):
            try:
                results.append(future.result())
            except Exception as e:
                co = futures[future]
                log.warning("Future error for %s: %s", co["slug"], e)
                results.append({"slug": co["slug"], "logo_url": ""})

    # Output clean JSON to stdout
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
