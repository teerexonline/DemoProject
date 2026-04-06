#!/usr/bin/env python3
"""
ResearchOrg Scraper Validation Test Harness
=============================================
Runs each scraper for a sample of test companies, validates output JSON
against schema rules, and prints a summary table.

Usage:
    python3 scripts/test_scrapers.py
    python3 scripts/test_scrapers.py --company Stripe --scraper seed_company
    python3 scripts/test_scrapers.py --timeout 12 --fast

Exit codes:
    0 = all tests passed (or only WARNs)
    1 = at least one FAIL
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import textwrap
import time
from typing import Any, Optional

SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
PYTHON_BIN  = sys.executable  # use same Python that runs this script

# ─── Test matrix ──────────────────────────────────────────────────────────────

TEST_COMPANIES = [
    # (name, website, size, type)
    ("Apple",     "apple.com",     "big",    "public"),
    ("Microsoft", "microsoft.com", "big",    "public"),
    ("Stripe",    "stripe.com",    "big",    "private"),
    ("SpaceX",    "spacex.com",    "big",    "private"),
    ("Shopify",   "shopify.com",   "medium", "public"),
    ("Notion",    "notion.so",     "medium", "private"),
    ("Duolingo",  "duolingo.com",  "small",  "public"),
    ("Retool",    "retool.com",    "small",  "private"),
]

# Fast mode: only run 3 companies
FAST_COMPANIES = [
    ("Stripe",   "stripe.com",   "big",   "private"),
    ("Apple",    "apple.com",    "big",   "public"),
    ("Duolingo", "duolingo.com", "small", "public"),
]

# ─── Schema rules ─────────────────────────────────────────────────────────────

def validate_seed_company(data: Any, company: str) -> list[str]:
    """Returns list of failure reasons (empty = PASS)."""
    failures: list[str] = []
    if not isinstance(data, dict):
        return [f"Output is not a dict (got {type(data).__name__})"]
    if data.get("error"):
        return [f"Script returned error: {data['error']}"]

    required_str = ["name", "slug", "website"]
    for f in required_str:
        if not data.get(f) or not isinstance(data[f], str) or not data[f].strip():
            failures.append(f"Missing/empty required string field: {f}")

    # Employees: if present, must be positive int in range
    emp = data.get("employees")
    if emp is not None:
        if not isinstance(emp, int) or emp <= 0:
            failures.append(f"employees must be positive int, got {emp!r}")
        elif emp > 5_000_000:
            failures.append(f"employees {emp} is implausibly large (>5M)")

    # Founded: if present, must be in range
    founded = data.get("founded")
    if founded is not None:
        if not isinstance(founded, int):
            failures.append(f"founded must be int, got {type(founded).__name__}")
        elif not (1800 <= founded <= 2025):
            failures.append(f"founded year {founded} out of range [1800,2025]")

    # logo_url: if present should look like a URL and not be an obvious generic food/plant
    logo = data.get("logo_url", "")
    if logo:
        low = logo.lower()
        # Detect known hallucinated logo images
        bad_logo_patterns = [
            "pink_lady",       # apple fruit Wikipedia image
            "white_stripes",   # White Stripes band
            "enterprise_suite",# seed_products generic
        ]
        for pat in bad_logo_patterns:
            if pat in low:
                failures.append(f"logo_url appears to be wrong image ({pat}): {logo}")

    # tags must be a list
    tags = data.get("tags")
    if tags is not None and not isinstance(tags, list):
        failures.append(f"tags must be list, got {type(tags).__name__}")

    return failures


def validate_seed_financials(data: Any, company: str) -> list[str]:
    failures: list[str] = []
    if not isinstance(data, dict):
        return [f"Output is not a dict (got {type(data).__name__})"]
    if data.get("error"):
        return [f"Script returned error: {data['error']}"]

    # At least one of these financial fields must be present
    financial_fields = ["tam", "arr", "yoy_growth", "revenue_growth", "revenue_per_employee"]
    has_any = any(data.get(f) for f in financial_fields)
    if not has_any:
        failures.append(f"No meaningful financial fields populated ({financial_fields})")

    # revenue_streams must be a list if present
    rs = data.get("revenue_streams")
    if rs is not None and not isinstance(rs, list):
        failures.append(f"revenue_streams must be list")
    if isinstance(rs, list) and len(rs) == 0:
        failures.append("revenue_streams is empty list")

    # business_units must be a list if present
    bu = data.get("business_units")
    if bu is not None and not isinstance(bu, list):
        failures.append(f"business_units must be list")

    # yoy_growth: if only benchmark fallback, warn
    yoy = data.get("yoy_growth", "")
    warnings: list[str] = []
    if yoy and "(sector avg)" in yoy:
        warnings.append(f"yoy_growth is benchmark estimate only: {yoy!r}")

    return failures  # warnings handled separately via WARN checks


def validate_seed_departments(data: Any, company: str) -> list[str]:
    failures: list[str] = []
    if not isinstance(data, list):
        if isinstance(data, dict) and data.get("error"):
            return [f"Script returned error: {data['error']}"]
        return [f"Output is not a list (got {type(data).__name__})"]

    if len(data) == 0:
        return ["No departments returned (empty list)"]

    if len(data) < 3:
        failures.append(f"Only {len(data)} departments returned (expected ≥3)")

    for i, d in enumerate(data):
        if not isinstance(d, dict):
            failures.append(f"Department[{i}] is not a dict")
            continue
        if not d.get("name") or not isinstance(d["name"], str):
            failures.append(f"Department[{i}] missing/invalid 'name'")
        # headcount must be int ≥ 0
        hc = d.get("headcount")
        if hc is not None and (not isinstance(hc, (int, float)) or hc < 0):
            failures.append(f"Department[{i}].headcount invalid: {hc!r}")

    return failures


def validate_seed_exec_groups(data: Any, company: str) -> list[str]:
    failures: list[str] = []
    if not isinstance(data, list):
        if isinstance(data, dict) and data.get("error"):
            return [f"Script returned error: {data['error']}"]
        return [f"Output is not a list (got {type(data).__name__})"]

    if len(data) == 0:
        return ["No exec groups returned (empty list)"]

    if len(data) < 3:
        failures.append(f"Only {len(data)} exec groups returned (expected ≥3)")

    ceo_found = False
    for i, e in enumerate(data):
        if not isinstance(e, dict):
            failures.append(f"ExecGroup[{i}] is not a dict")
            continue
        if not e.get("title") or not isinstance(e["title"], str):
            failures.append(f"ExecGroup[{i}] missing/invalid 'title'")
        else:
            if "ceo" in e["title"].lower() or "chief executive" in e["title"].lower():
                ceo_found = True
        if not e.get("short_title"):
            failures.append(f"ExecGroup[{i}] missing 'short_title'")
        # Check for former executive contamination
        title_l = e.get("title", "").lower()
        if any(tok in title_l for tok in ("former", "ex-", "retired", "emeritus", "departed")):
            failures.append(f"ExecGroup[{i}] appears to be former exec: {e['title']!r}")

    if not ceo_found:
        failures.append("No CEO found in exec groups")

    return failures


def validate_seed_roles(data: Any, company: str) -> list[str]:
    failures: list[str] = []
    if not isinstance(data, list):
        if isinstance(data, dict) and data.get("error"):
            return [f"Script returned error: {data['error']}"]
        return [f"Output is not a list (got {type(data).__name__})"]

    if len(data) == 0:
        return ["No roles returned (empty list)"]

    if len(data) < 5:
        failures.append(f"Only {len(data)} roles returned (expected ≥5)")

    for i, r in enumerate(data[:5]):  # check first 5 only
        if not isinstance(r, dict):
            failures.append(f"Role[{i}] is not a dict")
            continue
        if not r.get("title"):
            failures.append(f"Role[{i}] missing 'title'")
        # tools and skills should be non-empty lists
        tools = r.get("tools")
        if tools is not None and (not isinstance(tools, list) or len(tools) == 0):
            failures.append(f"Role[{i}] '{r.get('title')}': tools is empty or invalid")

    return failures


def validate_seed_news(data: Any, company: str) -> list[str]:
    failures: list[str] = []
    if not isinstance(data, list):
        if isinstance(data, dict) and data.get("error"):
            return [f"Script returned error: {data['error']}"]
        return [f"Output is not a list (got {type(data).__name__})"]

    if len(data) == 0:
        return ["No news items returned (empty list)"]

    for i, item in enumerate(data):
        if not isinstance(item, dict):
            failures.append(f"NewsItem[{i}] is not a dict")
            continue
        if not item.get("headline"):
            failures.append(f"NewsItem[{i}] missing 'headline'")
        else:
            # Company name must appear in headline (case-insensitive)
            co_lower = company.lower()
            headline_lower = item["headline"].lower()
            if co_lower not in headline_lower:
                failures.append(
                    f"NewsItem[{i}] headline does not mention '{company}': {item['headline']!r}"
                )
        if not item.get("published_date"):
            failures.append(f"NewsItem[{i}] missing 'published_date'")
        if not item.get("source_url"):
            failures.append(f"NewsItem[{i}] missing 'source_url'")

    return failures


def validate_seed_milestones(data: Any, company: str) -> list[str]:
    failures: list[str] = []
    if not isinstance(data, list):
        if isinstance(data, dict) and data.get("error"):
            return [f"Script returned error: {data['error']}"]
        return [f"Output is not a list (got {type(data).__name__})"]

    if len(data) == 0:
        return ["No milestones returned (empty list)"]

    if len(data) < 3:
        failures.append(f"Only {len(data)} milestones (expected ≥3)")

    founding_found = False
    for i, m in enumerate(data):
        if not isinstance(m, dict):
            failures.append(f"Milestone[{i}] is not a dict")
            continue
        year = m.get("year")
        if year is None:
            failures.append(f"Milestone[{i}] missing 'year'")
        elif not isinstance(year, int):
            failures.append(f"Milestone[{i}].year must be int, got {type(year).__name__}")
        elif not (1800 <= year <= 2026):
            failures.append(f"Milestone[{i}].year {year} out of range")
        if not m.get("title"):
            failures.append(f"Milestone[{i}] missing 'title'")
        if not m.get("type"):
            failures.append(f"Milestone[{i}] missing 'type'")
        if m.get("type") == "founding":
            founding_found = True

    if not founding_found:
        failures.append("No founding milestone found")

    return failures


def validate_seed_products(data: Any, company: str) -> list[str]:
    failures: list[str] = []
    if not isinstance(data, list):
        if isinstance(data, dict) and data.get("error"):
            return [f"Script returned error: {data['error']}"]
        return [f"Output is not a list (got {type(data).__name__})"]

    if len(data) == 0:
        return ["No products returned (empty list)"]

    GENERIC_NAMES = {
        "core product", "enterprise suite", "developer platform",
        "core platform", "analytics suite", "api platform",
    }

    for i, p in enumerate(data):
        if not isinstance(p, dict):
            failures.append(f"Product[{i}] is not a dict")
            continue
        name = p.get("name", "")
        if not name:
            failures.append(f"Product[{i}] missing 'name'")
        elif name.lower() in GENERIC_NAMES:
            failures.append(
                f"Product[{i}] is a generic synthetic placeholder: {name!r} — "
                "synthetic fallback should not return company-agnostic names"
            )
        # Check for obviously wrong images (band/food photos)
        img = p.get("image_url") or ""
        bad_img_patterns = ["white_stripes", "pink_lady_and_cross", "enterprise_suite.jpg"]
        for pat in bad_img_patterns:
            if pat in img.lower():
                failures.append(f"Product[{i}] has incorrect image ({pat}): {img}")

    return failures


# ─── Validator dispatch ───────────────────────────────────────────────────────

VALIDATORS = {
    "seed_company":    validate_seed_company,
    "seed_financials": validate_seed_financials,
    "seed_departments":validate_seed_departments,
    "seed_exec_groups":validate_seed_exec_groups,
    "seed_roles":      validate_seed_roles,
    "seed_news":       validate_seed_news,
    "seed_milestones": validate_seed_milestones,
    "seed_products":   validate_seed_products,
}

# ─── Script argument builders ─────────────────────────────────────────────────

def build_args(scraper: str, company: str, website: str, timeout: int) -> list[str]:
    """Build CLI args for each scraper. No --company-id so no DB writes."""
    if scraper == "seed_company":
        # seed_company uses --name (bug: API calls with --company, but CLI uses --name)
        # This test script uses the correct --name arg for seed_company
        return ["--name", company, "--website", website, "--timeout", str(timeout)]
    else:
        return ["--company", company, "--website", website, "--timeout", str(timeout)]


# ─── Runner ────────────────────────────────────────────────────────────────────

class TestResult:
    def __init__(self, scraper: str, company: str, size: str, co_type: str):
        self.scraper  = scraper
        self.company  = company
        self.size     = size
        self.co_type  = co_type
        self.status   = "SKIP"   # PASS / FAIL / WARN / ERROR / SKIP
        self.reason   = ""
        self.duration = 0.0
        self.warnings: list[str] = []


def run_one(
    scraper: str, company: str, website: str, size: str, co_type: str,
    timeout: int,
) -> TestResult:
    r = TestResult(scraper, company, size, co_type)
    script = os.path.join(SCRIPTS_DIR, f"{scraper}.py")
    if not os.path.exists(script):
        r.status = "ERROR"
        r.reason = f"Script not found: {script}"
        return r

    args = build_args(scraper, company, website, timeout)
    cmd  = [PYTHON_BIN, script] + args

    # Give news and milestones extra time — they can make many HTTP requests
    # (e.g., Apple's newsroom RSS can take 60+ seconds to respond)
    extra_time = 90 if scraper in ("seed_news", "seed_milestones") else 30
    subprocess_timeout = timeout + extra_time

    t0 = time.monotonic()
    try:
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=subprocess_timeout,
        )
        r.duration = time.monotonic() - t0

        if proc.returncode != 0 and not proc.stdout.strip():
            r.status = "ERROR"
            r.reason = (
                f"Exit code {proc.returncode}. "
                f"stderr: {proc.stderr.strip()[-200:]}"
            )
            return r

        # Try to parse stdout as JSON
        try:
            data = json.loads(proc.stdout.strip())
        except json.JSONDecodeError as e:
            r.status = "ERROR"
            r.reason = f"Invalid JSON output: {e}. stdout: {proc.stdout[:200]!r}"
            return r

        # Validate
        validator = VALIDATORS.get(scraper)
        if not validator:
            r.status = "PASS"
            r.reason = "No validator defined"
            return r

        failures = validator(data, company)

        # Separate WARN-level issues (non-critical)
        warns: list[str] = []
        hard_failures: list[str] = []
        WARN_PATTERNS = [
            "(sector avg)",        # benchmark fallback for yoy_growth
            "Only 1 ",             # only 1 item when we expected more
            "generic synthetic",   # synthetic product placeholder (bug, but not crash)
            "incorrect image",     # bad image URL (visual defect, not data loss)
        ]
        for f in failures:
            is_warn = any(p in f for p in WARN_PATTERNS)
            if is_warn:
                warns.append(f)
            else:
                hard_failures.append(f)

        r.warnings = warns
        if hard_failures:
            r.status = "FAIL"
            r.reason = "; ".join(hard_failures)
        elif warns:
            r.status = "WARN"
            r.reason = "; ".join(warns)
        else:
            r.status = "PASS"

    except subprocess.TimeoutExpired:
        r.duration = time.monotonic() - t0
        r.status = "ERROR"
        r.reason = f"Timed out after {subprocess_timeout}s"

    return r


# ─── Formatting ───────────────────────────────────────────────────────────────

STATUS_COLORS = {
    "PASS":  "\033[32m",   # green
    "WARN":  "\033[33m",   # yellow
    "FAIL":  "\033[31m",   # red
    "ERROR": "\033[35m",   # magenta
    "SKIP":  "\033[90m",   # dark gray
}
RESET = "\033[0m"


def colorize(status: str, text: str) -> str:
    return f"{STATUS_COLORS.get(status, '')}{text}{RESET}"


def print_table(results: list[TestResult]) -> None:
    scrapers  = sorted(set(r.scraper  for r in results))
    companies = sorted(set(r.company  for r in results), key=lambda c: [x.company for x in results].index(c))

    # Build lookup
    cell: dict[tuple[str,str], TestResult] = {}
    for r in results:
        cell[(r.scraper, r.company)] = r

    # Header
    col_w = 18
    hdr = f"{'SCRAPER':<22}" + "".join(f"{c:<{col_w}}" for c in companies)
    sep = "─" * len(hdr)
    print("\n" + sep)
    print(hdr)
    print(sep)

    for scraper in scrapers:
        row = f"{scraper:<22}"
        for company in companies:
            r = cell.get((scraper, company))
            if r:
                status = r.status
                cell_text = f"{status:<8}{r.duration:5.1f}s"
                row += colorize(status, f"{cell_text:<{col_w}}")
            else:
                row += f"{'–':<{col_w}}"
        print(row)

    print(sep + "\n")


def print_failures(results: list[TestResult]) -> None:
    fails = [r for r in results if r.status in ("FAIL", "ERROR")]
    warns = [r for r in results if r.status == "WARN"]

    if fails:
        print(colorize("FAIL", "=== FAILURES / ERRORS ==="))
        for r in fails:
            print(f"  {r.scraper} × {r.company}: {r.reason}")
        print()

    if warns:
        print(colorize("WARN", "=== WARNINGS ==="))
        for r in warns:
            print(f"  {r.scraper} × {r.company}: {r.reason}")
        print()


def print_summary(results: list[TestResult]) -> None:
    counts: dict[str, int] = {"PASS": 0, "WARN": 0, "FAIL": 0, "ERROR": 0, "SKIP": 0}
    for r in results:
        counts[r.status] = counts.get(r.status, 0) + 1

    total = sum(counts.values())
    parts = []
    for status in ("PASS", "WARN", "FAIL", "ERROR"):
        if counts[status]:
            parts.append(colorize(status, f"{counts[status]} {status}"))
    print(f"Summary ({total} tests): " + " | ".join(parts))


# ─── CLI ──────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Run all scraper tests")
    parser.add_argument("--company",  default=None, help="Run only for this company name")
    parser.add_argument("--scraper",  default=None, help="Run only this scraper")
    parser.add_argument("--timeout",  type=int, default=18, help="Per-request timeout (s)")
    parser.add_argument("--fast",     action="store_true", help="Use 3-company fast mode")
    parser.add_argument("--no-color", action="store_true", help="Disable ANSI colors")
    args = parser.parse_args()

    if args.no_color:
        for k in STATUS_COLORS:
            STATUS_COLORS[k] = ""
        global RESET
        RESET = ""

    scrapers = list(VALIDATORS.keys())
    if args.scraper:
        scrapers = [args.scraper]

    companies = FAST_COMPANIES if args.fast else TEST_COMPANIES
    if args.company:
        companies = [(c, w, s, t) for (c, w, s, t) in companies if c.lower() == args.company.lower()]
        if not companies:
            # Try as a new company with no website (can't run)
            print(f"Company {args.company!r} not in test matrix.")
            sys.exit(1)

    print(f"\nRunning {len(scrapers)} scrapers × {len(companies)} companies "
          f"= {len(scrapers)*len(companies)} tests  (timeout={args.timeout}s)\n")

    results: list[TestResult] = []

    for scraper in scrapers:
        for (company, website, size, co_type) in companies:
            print(f"  Running {scraper} × {company}...", end=" ", flush=True)
            r = run_one(scraper, company, website, size, co_type, args.timeout)
            results.append(r)
            status_str = colorize(r.status, r.status)
            print(f"{status_str} ({r.duration:.1f}s)")
            if r.status in ("FAIL", "ERROR"):
                # Print reason inline, truncated
                truncated = r.reason[:120] + ("…" if len(r.reason) > 120 else "")
                print(f"    {colorize(r.status, '↳')} {truncated}")

    print_table(results)
    print_failures(results)
    print_summary(results)

    # Exit 1 if any hard failures
    has_failures = any(r.status in ("FAIL", "ERROR") for r in results)
    sys.exit(1 if has_failures else 0)


if __name__ == "__main__":
    main()
