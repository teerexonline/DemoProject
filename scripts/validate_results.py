#!/usr/bin/env python3
"""
ResearchOrg Scraper Results Validator
Reads /tmp/scraper_results/COMPANY/SCRAPER.json files and validates data quality.

Quality rules per scraper:
  seed_company    : has name, slug, description (>50 chars), website; employees/founded are numbers if present
  seed_departments: array with >=3 items; each has `name` and optional `roles` list
  seed_exec_groups: array with >=1 item; each has `name` and `title`/`role`
  seed_roles      : array with >=2 items; each has `title`, `level`, `department`;
                    tools/skills/processes non-empty for >=50% of roles
  seed_news       : array with >=3 items; each has `title`/`headline`, `url`/`source_url`, `published_at`/`published_date`
  seed_milestones : array with >=3 items; each has `title`, `year`
  seed_products   : array with >=1 item; each has `name`, `description`
  seed_financials : has `revenue` OR `valuation` OR `funding_total` as non-null/non-empty
"""

import json
import os
import sys
from pathlib import Path
from typing import Any

RESULTS_DIR = Path("/tmp/scraper_results")

COMPANIES = [
    "Airbnb", "Anthropic", "Apple", "Atlassian", "Bombardier",
    "CAE", "Canva", "Cloudflare", "Coinbase", "Databricks",
    "Datadog", "DoorDash", "Figma", "Google", "Linear",
    "Meta", "MongoDB", "Netflix", "Notion", "OpenAI",
    "Palantir", "Shopify", "Snowflake", "Spotify", "Stripe",
    "Tesla", "Twilio", "Vercel", "Zebra Technologies",
]

SCRAPERS = [
    "seed_company",
    "seed_departments",
    "seed_exec_groups",
    "seed_roles",
    "seed_news",
    "seed_milestones",
    "seed_products",
    "seed_financials",
]

def company_dir_name(name: str) -> str:
    return name.replace(" ", "_").replace("/", "-")


def load_json(company: str, scraper: str) -> tuple[Any, str]:
    """Returns (data, error_string). data is None if load failed."""
    dir_name = company_dir_name(company)
    json_path = RESULTS_DIR / dir_name / f"{scraper}.json"
    err_path  = RESULTS_DIR / dir_name / f"{scraper}.err"

    if not json_path.exists():
        return None, "FILE_MISSING"

    raw = json_path.read_text().strip()
    if not raw:
        return None, "EMPTY_OUTPUT"

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        return None, f"JSON_PARSE_ERROR: {e}"

    return data, ""


def validate_company(data: Any) -> tuple[str, list[str]]:
    """Returns (status, reasons)."""
    if not isinstance(data, dict):
        return "FAIL", ["Not a dict"]
    reasons = []
    warnings = []

    name = data.get("name", "")
    if not name:
        reasons.append("missing name")
    slug = data.get("slug", "")
    if not slug:
        warnings.append("missing slug")
    desc = data.get("description", "")
    if not desc:
        reasons.append("missing description")
    elif len(desc) < 50:
        warnings.append(f"short description ({len(desc)} chars)")
    website = data.get("website", "")
    if not website:
        warnings.append("missing website")

    employees = data.get("employees")
    if employees is not None and not isinstance(employees, (int, float)):
        warnings.append(f"employees is not a number: {type(employees).__name__}")
    founded = data.get("founded")
    if founded is not None and not isinstance(founded, (int, float)):
        warnings.append(f"founded is not a number: {type(founded).__name__}")

    if reasons:
        return "FAIL", reasons
    if warnings:
        return "WARN", warnings
    return "PASS", []


def validate_departments(data: Any) -> tuple[str, list[str]]:
    if not isinstance(data, list):
        return "FAIL", ["Not an array"]
    if len(data) < 3:
        return "FAIL", [f"Only {len(data)} departments (need >=3)"]
    reasons = []
    for i, dept in enumerate(data):
        if not isinstance(dept, dict):
            reasons.append(f"item[{i}] not a dict")
            continue
        if not dept.get("name"):
            reasons.append(f"item[{i}] missing name")
    if reasons:
        return "WARN", reasons[:3]
    return "PASS", [f"{len(data)} departments"]


def validate_exec_groups(data: Any) -> tuple[str, list[str]]:
    if not isinstance(data, list):
        return "FAIL", ["Not an array"]
    if len(data) < 1:
        return "FAIL", ["Empty array (need >=1)"]
    reasons = []
    for i, exec_ in enumerate(data[:5]):
        if not isinstance(exec_, dict):
            reasons.append(f"item[{i}] not a dict")
            continue
        # seed_exec_groups output schema: title="Name — Role", short_title="CEO"
        # (name is embedded in the title field as "Name — Role" format)
        title = exec_.get("title", exec_.get("name", exec_.get("role", "")))
        short_title = exec_.get("short_title", "")
        # Accept either a combined "Name — Role" title or separate name/role fields
        has_person = bool(title and len(title) > 3)
        if not has_person:
            reasons.append(f"item[{i}] missing title/name")
    if reasons:
        return "WARN", reasons[:3]
    return "PASS", [f"{len(data)} executives"]


def validate_roles(data: Any) -> tuple[str, list[str]]:
    if not isinstance(data, list):
        return "FAIL", ["Not an array"]
    if len(data) < 2:
        return "FAIL", [f"Only {len(data)} roles (need >=2)"]

    missing_title = 0
    missing_dept  = 0
    has_metadata  = 0  # roles with tools or skills or processes

    for role in data:
        if not isinstance(role, dict):
            continue
        if not role.get("title"):
            missing_title += 1
        # seed_roles uses `department_name` (not `department`)
        dept = role.get("department", role.get("department_name", ""))
        if not dept:
            missing_dept += 1

        tools     = role.get("tools",     [])
        skills    = role.get("skills",    [])
        processes = role.get("processes", [])
        if (tools and len(tools) > 0) or (skills and len(skills) > 0) or (processes and len(processes) > 0):
            has_metadata += 1

    total = len(data)
    metadata_pct = has_metadata / total if total > 0 else 0

    reasons = []
    if missing_title > 0:
        reasons.append(f"{missing_title}/{total} roles missing title")
    if missing_dept > total * 0.5:
        reasons.append(f"{missing_dept}/{total} roles missing department")
    if metadata_pct < 0.5:
        reasons.append(f"Only {has_metadata}/{total} roles have tools/skills/processes (need 50%)")

    if reasons:
        return "WARN", reasons
    return "PASS", [f"{total} roles, {has_metadata}/{total} with metadata"]


def validate_news(data: Any) -> tuple[str, list[str]]:
    if not isinstance(data, list):
        return "FAIL", ["Not an array"]
    if len(data) < 3:
        return "FAIL", [f"Only {len(data)} items (need >=3)"]

    reasons = []
    for i, item in enumerate(data[:5]):
        if not isinstance(item, dict):
            reasons.append(f"item[{i}] not a dict")
            continue
        # Accept various field name variants
        headline = item.get("headline", item.get("title", ""))
        url      = item.get("source_url", item.get("url", ""))
        pub_date = item.get("published_date", item.get("published_at", ""))
        if not headline:
            reasons.append(f"item[{i}] missing headline/title")
        if not url:
            reasons.append(f"item[{i}] missing url/source_url")
        if not pub_date:
            reasons.append(f"item[{i}] missing published_at/published_date")

    if reasons:
        return "WARN", reasons[:3]
    return "PASS", [f"{len(data)} news items"]


def validate_milestones(data: Any) -> tuple[str, list[str]]:
    if not isinstance(data, list):
        return "FAIL", ["Not an array"]
    if len(data) < 3:
        return "FAIL", [f"Only {len(data)} milestones (need >=3)"]

    reasons = []
    for i, m in enumerate(data[:5]):
        if not isinstance(m, dict):
            reasons.append(f"item[{i}] not a dict")
            continue
        if not m.get("title"):
            reasons.append(f"item[{i}] missing title")
        year = m.get("year")
        if year is None:
            reasons.append(f"item[{i}] missing year")
        elif not isinstance(year, (int, float)):
            reasons.append(f"item[{i}] year is not a number: {year!r}")

    if reasons:
        return "WARN", reasons[:3]
    return "PASS", [f"{len(data)} milestones"]


def validate_products(data: Any) -> tuple[str, list[str]]:
    if not isinstance(data, list):
        return "FAIL", ["Not an array"]
    if len(data) < 1:
        return "FAIL", ["Empty array (need >=1)"]

    reasons = []
    for i, p in enumerate(data[:5]):
        if not isinstance(p, dict):
            reasons.append(f"item[{i}] not a dict")
            continue
        if not p.get("name"):
            reasons.append(f"item[{i}] missing name")
        desc = p.get("description", "")
        if not desc or len(str(desc)) < 10:
            reasons.append(f"item[{i}] missing/short description")

    if reasons:
        return "WARN", reasons[:3]
    return "PASS", [f"{len(data)} products"]


def validate_financials(data: Any) -> tuple[str, list[str]]:
    if not isinstance(data, dict):
        return "FAIL", ["Not a dict"]

    # Check for at least one meaningful financial field
    revenue         = data.get("revenue", "")
    valuation       = data.get("valuation", "")
    funding_total   = data.get("funding_total", "")
    arr             = data.get("arr", "")
    tam             = data.get("tam", "")

    has_financial = any([
        revenue and revenue not in ("", None),
        valuation and valuation not in ("", None),
        funding_total and funding_total not in ("", None),
        arr and arr not in ("", None),
        tam and tam not in ("", None),
    ])

    if not has_financial:
        return "FAIL", ["No revenue, valuation, funding_total, arr, or tam found"]

    notes = []
    if revenue:
        notes.append(f"revenue={revenue}")
    if valuation:
        notes.append(f"valuation={valuation}")
    return "PASS", notes


VALIDATORS = {
    "seed_company":     validate_company,
    "seed_departments": validate_departments,
    "seed_exec_groups": validate_exec_groups,
    "seed_roles":       validate_roles,
    "seed_news":        validate_news,
    "seed_milestones":  validate_milestones,
    "seed_products":    validate_products,
    "seed_financials":  validate_financials,
}


def status_color(status: str) -> str:
    return {"PASS": "\033[32m", "WARN": "\033[33m", "FAIL": "\033[31m"}.get(status, "")

RESET = "\033[0m"


def main() -> None:
    # Results matrix: company → scraper → (status, reasons)
    matrix: dict[str, dict[str, tuple[str, list[str]]]] = {}

    total_pass = total_warn = total_fail = 0
    all_failures: list[tuple[str, str, str, list[str]]] = []

    for company in COMPANIES:
        matrix[company] = {}
        for scraper in SCRAPERS:
            data, load_err = load_json(company, scraper)
            if load_err:
                status = "FAIL"
                reasons = [load_err]
            else:
                validator = VALIDATORS.get(scraper)
                if validator:
                    status, reasons = validator(data)
                else:
                    status, reasons = "PASS", []

            matrix[company][scraper] = (status, reasons)
            if status == "PASS":
                total_pass += 1
            elif status == "WARN":
                total_warn += 1
                all_failures.append((company, scraper, status, reasons))
            else:
                total_fail += 1
                all_failures.append((company, scraper, status, reasons))

    # ── Print results table ────────────────────────────────────────────────────
    SCRAPER_SHORT = {
        "seed_company":     "company",
        "seed_departments": "depts",
        "seed_exec_groups": "execs",
        "seed_roles":       "roles",
        "seed_news":        "news",
        "seed_milestones":  "miles",
        "seed_products":    "prods",
        "seed_financials":  "finan",
    }

    col_w = 6
    name_w = 22
    header = f"{'Company':<{name_w}}" + " ".join(f"{SCRAPER_SHORT[s]:>{col_w}}" for s in SCRAPERS)
    print("\n" + "=" * (name_w + col_w * len(SCRAPERS) + len(SCRAPERS)) )
    print("  RESULTS MATRIX")
    print("=" * (name_w + col_w * len(SCRAPERS) + len(SCRAPERS)))
    print(header)
    print("-" * (name_w + col_w * len(SCRAPERS) + len(SCRAPERS)))

    for company in COMPANIES:
        row = f"{company:<{name_w}}"
        for scraper in SCRAPERS:
            status, _ = matrix[company][scraper]
            color = status_color(status)
            short = {"PASS": " PASS", "WARN": " WARN", "FAIL": " FAIL"}[status]
            row += f" {color}{short}{RESET}"
        print(row)

    print("=" * (name_w + col_w * len(SCRAPERS) + len(SCRAPERS)))
    print(f"\nTotals: PASS={total_pass}  WARN={total_warn}  FAIL={total_fail}  Total={total_pass+total_warn+total_fail}")

    # ── Detailed failures ──────────────────────────────────────────────────────
    if all_failures:
        print("\n" + "=" * 70)
        print("  FAILURES AND WARNINGS (detailed)")
        print("=" * 70)
        for company, scraper, status, reasons in all_failures:
            color = status_color(status)
            print(f"\n{color}[{status}]{RESET} {company} / {scraper}")
            for r in reasons:
                print(f"       - {r}")

    # ── Per-scraper summary ────────────────────────────────────────────────────
    print("\n" + "=" * 70)
    print("  PER-SCRAPER SUMMARY")
    print("=" * 70)
    for scraper in SCRAPERS:
        p = w = f = 0
        for company in COMPANIES:
            status, _ = matrix[company][scraper]
            if status == "PASS": p += 1
            elif status == "WARN": w += 1
            else: f += 1
        print(f"  {scraper:<25}  PASS={p:2d}  WARN={w:2d}  FAIL={f:2d}")

    print("\n")


if __name__ == "__main__":
    main()
