#!/usr/bin/env python3
"""
Batch financial data scraper.
Runs scrape_financials() for every company concurrently and prints
one JSON line per company to stdout for consumption by the caller.
"""

import json
import logging
import os
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed

sys.path.insert(0, os.path.dirname(__file__))
from seed_financials import scrape_financials  # noqa: E402

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    stream=sys.stderr,
)
log = logging.getLogger("batch_financials")

COMPANIES = [
    {"id": "2f1399b6-58e1-49de-a3e4-0a7f41d1a089", "name": "Airbnb",             "website": "airbnb.com"},
    {"id": "6d0de713-698e-4f47-b0ea-faf38df95e55", "name": "Anthropic",          "website": "anthropic.com"},
    {"id": "5ffdd4e3-64ca-4524-b1aa-fef7b2123153", "name": "Apple",              "website": "apple.com"},
    {"id": "5c1622b2-dc75-48fc-aeec-31801d3fd2bc", "name": "Atlassian",          "website": "atlassian.com"},
    {"id": "c418c723-c58a-44a7-bf47-28c684defc7b", "name": "Bombardier",         "website": "bombardier.com"},
    {"id": "e412f1a2-3ce6-4ba2-9703-870e0f1996a7", "name": "CAE Inc",            "website": "cae.com"},
    {"id": "943c7c37-305f-43c0-8b04-ad4d60822726", "name": "Canva",              "website": "canva.com"},
    {"id": "26309080-7e8a-4347-be3a-79954765d5e3", "name": "Cloudflare",         "website": "cloudflare.com"},
    {"id": "8c269ce0-1046-40e4-8071-30a4aba5ea56", "name": "Coinbase",           "website": "coinbase.com"},
    {"id": "deb57f25-7f98-4079-a949-ce04af79839e", "name": "Databricks",         "website": "databricks.com"},
    {"id": "8f6572ce-9476-4e19-b393-48119361b0d9", "name": "Datadog",            "website": "datadoghq.com"},
    {"id": "55ba02c7-8b60-4ae8-9930-a34752afe814", "name": "DoorDash",           "website": "doordash.com"},
    {"id": "a69dda65-89ce-47c4-870e-4af97d19bd2e", "name": "Figma",              "website": "figma.com"},
    {"id": "fd35facc-1df2-46a2-8313-6d91f82f0fee", "name": "Google",             "website": "google.com"},
    {"id": "c3f4553c-71fd-4ec9-a576-3811b8cb0f4c", "name": "Linear",             "website": "linear.app"},
    {"id": "3eb3dd0f-8be0-4a4f-afb1-05b45c09ca9a", "name": "Meta",               "website": "meta.com"},
    {"id": "2e25e6a8-7377-43a8-8131-eb6453c3b399", "name": "MongoDB",            "website": "mongodb.com"},
    {"id": "8414e5e2-524d-4394-89e9-fac931d6de74", "name": "Netflix",            "website": "netflix.com"},
    {"id": "deba923a-e051-4364-afa4-61843991a96e", "name": "Notion",             "website": "notion.so"},
    {"id": "f4b4eccd-ff19-4065-9b1e-bedfd3184616", "name": "OpenAI",             "website": "openai.com"},
    {"id": "d7303900-aa4f-4c18-955d-e25869af17bc", "name": "Palantir",           "website": "palantir.com"},
    {"id": "99982ff7-54d6-4dae-a382-d2209a7bb047", "name": "Shopify",            "website": "shopify.com"},
    {"id": "47c1061b-718f-43a2-90e2-db8424cd25f5", "name": "Snowflake",          "website": "snowflake.com"},
    {"id": "7376367b-1401-425a-9cd4-ba905646782c", "name": "Spotify",            "website": "spotify.com"},
    {"id": "efcfbb3b-3af4-44fd-94fa-090356bdb33e", "name": "Stripe",             "website": "stripe.com"},
    {"id": "78f9c1bb-95c3-4c95-8297-df655d245d0a", "name": "Tesla",              "website": "tesla.com"},
    {"id": "be768305-23cc-4812-9585-ed823fd361cd", "name": "Twilio",             "website": "twilio.com"},
    {"id": "63af2527-6b78-451a-a39c-96cf7cf7265f", "name": "Vercel",             "website": "vercel.com"},
    {"id": "5a8ba919-dd49-4f92-a420-11cbc7458cf0", "name": "Zebra Technologies", "website": "zebra.com"},
]


def scrape_one(company: dict) -> dict:
    log.info("Scraping: %s", company["name"])
    try:
        data = scrape_financials(company["name"], company["website"], timeout=14)
        return {"id": company["id"], "name": company["name"], "data": data}
    except Exception as e:
        log.error("Failed %s: %s", company["name"], e)
        return {"id": company["id"], "name": company["name"], "data": {"error": str(e)}}


def main():
    results = []
    with ThreadPoolExecutor(max_workers=6) as pool:
        futures = {pool.submit(scrape_one, co): co for co in COMPANIES}
        for future in as_completed(futures):
            result = future.result()
            log.info("Done: %s", result["name"])
            results.append(result)

    print(json.dumps(results, ensure_ascii=False, default=str))


if __name__ == "__main__":
    main()
