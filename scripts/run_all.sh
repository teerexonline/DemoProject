#!/usr/bin/env bash
# ============================================================
# ResearchOrg Batch Scraper Runner
# Runs all 8 scrapers for all 29 companies
# Output: /tmp/scraper_results/COMPANY/SCRAPER.{json,err}
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
RESULTS_DIR="/tmp/scraper_results"
PYTHON="${PYTHON:-python3}"
TIMEOUT_SECS=120

# Load env vars
if [[ -f "$PROJECT_ROOT/.env.local" ]]; then
  while IFS= read -r line; do
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ -z "${line// }" ]] && continue
    export "$line" 2>/dev/null || true
  done < "$PROJECT_ROOT/.env.local"
fi

# macOS-compatible timeout: use python3 signal-based wrapper
run_with_timeout() {
  local timeout_s="$1"; shift
  local out_file="$1"; shift
  local err_file="$1"; shift

  "$PYTHON" - "$timeout_s" "$out_file" "$err_file" "$@" <<'PYEOF'
import sys, subprocess, signal, os

timeout_s = int(sys.argv[1])
out_file  = sys.argv[2]
err_file  = sys.argv[3]
cmd       = sys.argv[4:]

with open(out_file, "w") as fout, open(err_file, "w") as ferr:
    try:
        proc = subprocess.run(
            cmd, stdout=fout, stderr=ferr,
            timeout=timeout_s,
        )
        sys.exit(proc.returncode)
    except subprocess.TimeoutExpired:
        ferr.write(f"\nTIMEOUT after {timeout_s}s\n")
        sys.exit(124)
    except Exception as e:
        ferr.write(f"\nRUN ERROR: {e}\n")
        sys.exit(1)
PYEOF
}

# ── Company list: NAME | WEBSITE ──────────────────────────────
declare -a COMPANIES=(
  "Airbnb|https://airbnb.com"
  "Anthropic|https://anthropic.com"
  "Apple|https://apple.com"
  "Atlassian|https://atlassian.com"
  "Bombardier|https://bombardier.com"
  "CAE|https://cae.com"
  "Canva|https://canva.com"
  "Cloudflare|https://cloudflare.com"
  "Coinbase|https://coinbase.com"
  "Databricks|https://databricks.com"
  "Datadog|https://datadoghq.com"
  "DoorDash|https://doordash.com"
  "Figma|https://figma.com"
  "Google|https://google.com"
  "Linear|https://linear.app"
  "Meta|https://meta.com"
  "MongoDB|https://mongodb.com"
  "Netflix|https://netflix.com"
  "Notion|https://notion.so"
  "OpenAI|https://openai.com"
  "Palantir|https://palantir.com"
  "Shopify|https://shopify.com"
  "Snowflake|https://snowflake.com"
  "Spotify|https://spotify.com"
  "Stripe|https://stripe.com"
  "Tesla|https://tesla.com"
  "Twilio|https://twilio.com"
  "Vercel|https://vercel.com"
  "Zebra Technologies|https://zebra.com"
)

# ── Scraper list ──────────────────────────────────────────────
declare -a SCRAPERS=(
  "seed_company.py"
  "seed_departments.py"
  "seed_exec_groups.py"
  "seed_roles.py"
  "seed_news.py"
  "seed_milestones.py"
  "seed_products.py"
  "seed_financials.py"
)

TOTAL_COMPANIES=${#COMPANIES[@]}
TOTAL_SCRAPERS=${#SCRAPERS[@]}
TOTAL_RUNS=$(( TOTAL_COMPANIES * TOTAL_SCRAPERS ))
RUN=0
PASS=0
FAIL=0
TIMEOUT_COUNT=0

echo "========================================================"
echo "  ResearchOrg Batch Scraper — ${TOTAL_COMPANIES} companies x ${TOTAL_SCRAPERS} scrapers"
echo "  Results: $RESULTS_DIR"
echo "  Python: $($PYTHON --version 2>&1)"
echo "  Started: $(date)"
echo "========================================================"

for company_entry in "${COMPANIES[@]}"; do
  COMPANY_NAME="${company_entry%%|*}"
  COMPANY_WEBSITE="${company_entry##*|}"

  # Sanitize company name for directory
  COMPANY_DIR_NAME="$(echo "$COMPANY_NAME" | tr ' ' '_' | tr -cd '[:alnum:]_-')"
  OUT_DIR="$RESULTS_DIR/$COMPANY_DIR_NAME"
  mkdir -p "$OUT_DIR"

  for SCRIPT in "${SCRAPERS[@]}"; do
    RUN=$(( RUN + 1 ))
    SCRAPER_NAME="${SCRIPT%.py}"
    OUT_JSON="$OUT_DIR/${SCRAPER_NAME}.json"
    OUT_ERR="$OUT_DIR/${SCRAPER_NAME}.err"

    # Record start time
    START_S=$(date +%s)

    printf "[%3d/%d] %-22s - %-25s ... " \
      "$RUN" "$TOTAL_RUNS" \
      "$COMPANY_NAME" \
      "$SCRAPER_NAME"

    # Run with Python-based timeout
    run_with_timeout "$TIMEOUT_SECS" "$OUT_JSON" "$OUT_ERR" \
      "$PYTHON" "$SCRIPT_DIR/$SCRIPT" \
      --company "$COMPANY_NAME" \
      --website "$COMPANY_WEBSITE"
    EXIT_CODE=$?

    END_S=$(date +%s)
    ELAPSED=$(( END_S - START_S ))

    if [[ $EXIT_CODE -eq 0 ]]; then
      printf "OK   (%ds)\n" "$ELAPSED"
      PASS=$(( PASS + 1 ))
    elif [[ $EXIT_CODE -eq 124 ]]; then
      printf "TIMEOUT (%ds)\n" "$ELAPSED"
      TIMEOUT_COUNT=$(( TIMEOUT_COUNT + 1 ))
      FAIL=$(( FAIL + 1 ))
    else
      printf "FAIL (exit=%d, %ds)\n" "$EXIT_CODE" "$ELAPSED"
      FAIL=$(( FAIL + 1 ))
    fi

  done
  echo ""
done

echo "========================================================"
echo "  Batch complete: $(date)"
echo "  PASS=${PASS}  FAIL=${FAIL}  TIMEOUT=${TIMEOUT_COUNT}"
echo "  Total: ${TOTAL_RUNS} runs"
echo "========================================================"
