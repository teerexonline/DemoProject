#!/usr/bin/env python3
"""
fix_competitor_descriptions.py
================================
Audits and fixes all company_products rows where competitors entries are
missing the required `description` field.

Rule (from prompt.md):
  competitors: [{"name":"...", "description":"1–2 sentences describing what
    the competitor product does and who it serves", "edge":"..."}]
  RULE: "description" must be about the COMPETITOR product — neutral, factual,
  as if written independently. Never about the seeding company's product.

Usage:
  # Dry-run (shows what would be fixed, writes nothing):
  python fix_competitor_descriptions.py --dry-run

  # Fix all companies:
  python fix_competitor_descriptions.py

  # Fix a single company:
  python fix_competitor_descriptions.py --company "Zebra Technologies"

  # Show audit summary only:
  python fix_competitor_descriptions.py --audit-only

Requires:
  NEXT_PUBLIC_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY  (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
  ANTHROPIC_API_KEY
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
import time
from typing import Optional

import requests

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    stream=sys.stderr,
)
log = logging.getLogger("fix_competitor_descriptions")

# ─── Supabase helpers ──────────────────────────────────────────────────────────

def supabase_headers() -> dict:
    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    anon_key    = os.environ.get("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "")
    bearer = service_key or anon_key
    api_key = service_key or anon_key
    return {
        "apikey":        api_key,
        "Authorization": f"Bearer {bearer}",
        "Content-Type":  "application/json",
    }

def supabase_url() -> str:
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
    if not url:
        log.error("NEXT_PUBLIC_SUPABASE_URL not set")
        sys.exit(1)
    return url

def check_credentials() -> bool:
    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    anon_key    = os.environ.get("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "")
    anthropic   = os.environ.get("ANTHROPIC_API_KEY", "")
    if not (service_key or anon_key):
        log.error("Supabase credentials not available. Set SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.")
        return False
    if not anthropic:
        log.error("ANTHROPIC_API_KEY not set.")
        return False
    return True

def fetch_products_missing_descriptions(company_filter: Optional[str] = None) -> list[dict]:
    """
    Fetches all company_products rows where at least one competitor entry
    is missing a description field. Returns list of {product_id, company, product, competitors}.
    """
    base = supabase_url()
    hdrs = supabase_headers()

    # We need to join companies to get the company name for logging
    # Use the Supabase REST API with a select query
    params = {
        "select": "id,name,company_id,competitors,companies(name)",
        "competitors": "not.is.null",
        "order": "company_id",
    }
    if company_filter:
        # We'll filter after fetching since we can't filter by nested join easily
        pass

    all_rows = []
    offset = 0
    page_size = 200

    while True:
        p = dict(params)
        p["offset"] = offset
        p["limit"]  = page_size
        resp = requests.get(
            f"{base}/rest/v1/company_products",
            headers={**hdrs, "Range": f"{offset}-{offset+page_size-1}", "Prefer": "count=none"},
            params=p,
            timeout=30,
        )
        resp.raise_for_status()
        rows = resp.json()
        if not rows:
            break
        all_rows.extend(rows)
        if len(rows) < page_size:
            break
        offset += page_size

    # Filter: only rows with at least one competitor missing description
    result = []
    for row in all_rows:
        if not row.get("competitors"):
            continue
        comps = row["competitors"]
        if not isinstance(comps, list):
            continue
        missing = [c for c in comps if isinstance(c, dict) and not c.get("description")]
        if not missing:
            continue
        company_name = (row.get("companies") or {}).get("name", "Unknown")
        if company_filter and company_name.lower() != company_filter.lower():
            continue
        result.append({
            "product_id":   row["id"],
            "company":      company_name,
            "product":      row["name"],
            "competitors":  comps,
        })

    return result


# ─── Claude API helper ────────────────────────────────────────────────────────

CLAUDE_MODEL = "claude-haiku-4-5-20251001"  # Use Haiku for cost efficiency on this bulk task

def generate_descriptions(competitor_names: list[str], product_context: str) -> dict[str, str]:
    """
    Given a list of competitor names and a product context string,
    calls the Claude API to generate neutral, factual 1-2 sentence descriptions
    of each competitor product.
    Returns a dict: {competitor_name: description}
    """
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY not set")

    names_list = "\n".join(f"- {n}" for n in competitor_names)

    prompt = f"""You are writing neutral, factual descriptions of competitor products for a B2B research platform.

Context: These competitors appear in the "Vs. Competitors" section for a product in the category: {product_context}

For each competitor name below, write exactly 1–2 sentences describing:
1. What the competitor product IS (what type of product/service it is)
2. What it DOES and who uses it

RULES:
- Describe ONLY the competitor product itself — never mention or compare to the seeding company
- Be neutral and factual, as if writing a Wikipedia summary of that product
- Do not start with "I" or "We"
- Keep it under 50 words per description
- If the name is ambiguous (e.g. just a company name), describe their flagship/most relevant product in this category

Competitor names:
{names_list}

Respond with ONLY a JSON object mapping each name to its description, like:
{{"Competitor Name": "Description here.", "Other Competitor": "Description here."}}"""

    resp = requests.post(
        "https://api.anthropic.com/v1/messages",
        headers={
            "x-api-key":         api_key,
            "anthropic-version": "2023-06-01",
            "content-type":      "application/json",
        },
        json={
            "model":      CLAUDE_MODEL,
            "max_tokens": 2048,
            "messages":   [{"role": "user", "content": prompt}],
        },
        timeout=60,
    )
    resp.raise_for_status()
    content = resp.json()["content"][0]["text"].strip()

    # Parse JSON response
    try:
        # Strip markdown code blocks if present
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        return json.loads(content.strip())
    except json.JSONDecodeError as e:
        log.warning("Failed to parse Claude response as JSON: %s\nResponse: %s", e, content[:500])
        return {}


def enrich_competitors(competitors: list[dict], product_name: str, company_name: str) -> list[dict]:
    """
    Given a product's competitors list, generates descriptions for any entries
    missing one, then returns the enriched list.
    """
    missing = [(i, c) for i, c in enumerate(competitors) if not c.get("description")]
    if not missing:
        return competitors

    names = [c["name"] for _, c in missing]
    context = f"{company_name} — {product_name}"

    # Batch all missing names in one API call (up to 15 at a time)
    descriptions = {}
    batch_size = 15
    for i in range(0, len(names), batch_size):
        batch = names[i:i+batch_size]
        result = generate_descriptions(batch, context)
        descriptions.update(result)
        if len(names) > batch_size:
            time.sleep(0.5)  # Rate limit courtesy pause

    enriched = list(competitors)
    for idx, comp in missing:
        desc = descriptions.get(comp["name"], "")
        if desc:
            enriched[idx] = {**comp, "description": desc}
        else:
            log.warning("No description generated for competitor '%s' in product '%s'", comp["name"], product_name)

    return enriched


def update_product_competitors(product_id: str, competitors: list[dict]) -> bool:
    """Patches a single company_products row with the updated competitors array."""
    base = supabase_url()
    hdrs = {**supabase_headers(), "Prefer": "return=minimal"}
    resp = requests.patch(
        f"{base}/rest/v1/company_products",
        headers=hdrs,
        params={"id": f"eq.{product_id}"},
        json={"competitors": competitors},
        timeout=15,
    )
    try:
        resp.raise_for_status()
        return True
    except Exception as e:
        log.error("Failed to update product %s: %s", product_id, e)
        return False


# ─── Main ─────────────────────────────────────────────────────────────────────

def run_audit(products: list[dict]) -> None:
    """Print audit summary."""
    by_company: dict[str, int] = {}
    total_missing = 0
    for p in products:
        missing_count = sum(1 for c in p["competitors"] if not c.get("description"))
        by_company[p["company"]] = by_company.get(p["company"], 0) + 1
        total_missing += missing_count

    print(f"\n{'='*60}")
    print(f"COMPETITOR DESCRIPTION AUDIT REPORT")
    print(f"{'='*60}")
    print(f"Products with missing descriptions: {len(products)}")
    print(f"Total competitor entries missing description: {total_missing}")
    print(f"Companies affected: {len(by_company)}")
    print(f"\nBreakdown by company:")
    for company, count in sorted(by_company.items(), key=lambda x: -x[1]):
        print(f"  {company:<40} {count} products")
    print(f"{'='*60}\n")


def main():
    parser = argparse.ArgumentParser(description="Fix missing competitor descriptions in company_products")
    parser.add_argument("--company",     help="Only fix this company (exact name)")
    parser.add_argument("--dry-run",     action="store_true", help="Show changes without writing")
    parser.add_argument("--audit-only",  action="store_true", help="Print audit report and exit")
    args = parser.parse_args()

    if not args.dry_run and not args.audit_only:
        if not check_credentials():
            sys.exit(1)

    log.info("Fetching products with missing competitor descriptions...")
    products = fetch_products_missing_descriptions(company_filter=args.company)

    if not products:
        log.info("✓ All products already have competitor descriptions. Nothing to fix.")
        return

    run_audit(products)

    if args.audit_only:
        return

    # Fix each product
    fixed = 0
    failed = 0
    skipped = 0

    for i, p in enumerate(products, 1):
        log.info("[%d/%d] %s — %s", i, len(products), p["company"], p["product"])

        enriched = enrich_competitors(p["competitors"], p["product"], p["company"])

        # Check if anything changed
        if enriched == p["competitors"]:
            log.info("  → No changes (all descriptions already present or generation failed)")
            skipped += 1
            continue

        if args.dry_run:
            for comp in enriched:
                if comp.get("description"):
                    log.info("  [DRY-RUN] Would set description for '%s': %s", comp["name"], comp["description"][:80])
            fixed += 1
            continue

        success = update_product_competitors(p["product_id"], enriched)
        if success:
            log.info("  ✓ Updated %d competitor(s)", sum(1 for c in enriched if c.get("description")))
            fixed += 1
        else:
            failed += 1

        # Courtesy pause between products to avoid API rate limits
        time.sleep(0.3)

    print(f"\n{'='*60}")
    print(f"RESULTS")
    print(f"{'='*60}")
    print(f"  Fixed:   {fixed}")
    print(f"  Skipped: {skipped}")
    print(f"  Failed:  {failed}")
    if args.dry_run:
        print(f"  (dry-run — no changes written)")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
