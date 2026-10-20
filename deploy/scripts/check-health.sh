#!/usr/bin/env bash
# Quick health check of Finanverso. Exit code 0 = everything fine, 1 = something failed.
#   usage: check-health.sh [base_url]          (default https://finanverso.app)
# Run it from anywhere (your laptop) to check the public site, or on the server:
#   check-health.sh https://finanverso.app && docker compose -f /opt/winjgm/javi-portfolio/deploy/docker-compose.yml ps
# Optional: HEALTHCHECK_PING_URL=https://hc-ping.com/<uuid> pings healthchecks.io when all is fine
# (use it from cron every 5 minutes to get an e-mail when the check stops running).
set -uo pipefail

BASE="${1:-https://finanverso.app}"
BASE="${BASE%/}"
fail=0

check() { # name, url, expected substring ("" = only the status code)
  local name="$1" url="$2" expect="$3" body code
  body="$(curl -sS --max-time 10 -w '\n%{http_code}' "$url" 2>&1)" || { echo "FAIL  $name  ($url): no response"; fail=1; return; }
  code="${body##*$'\n'}"
  body="${body%$'\n'*}"
  if [ "$code" != "200" ]; then echo "FAIL  $name  ($url): HTTP $code"; fail=1; return; fi
  if [ -n "$expect" ] && [[ "$body" != *"$expect"* ]]; then
    echo "FAIL  $name  ($url): the answer does not contain '$expect'"; fail=1; return
  fi
  echo "OK    $name"
}

check "web"        "$BASE/"           "Finanverso"
check "api health" "$BASE/api/health" '"status":"ok"'

# The TLS certificate must not expire within 14 days.
host="${BASE#https://}"; host="${host%%/*}"
if [[ "$BASE" == https://* ]] && command -v openssl >/dev/null 2>&1; then
  if echo | openssl s_client -servername "$host" -connect "$host:443" 2>/dev/null \
      | openssl x509 -noout -checkend $((14 * 86400)) >/dev/null 2>&1; then
    echo "OK    certificate (valid for more than 14 days)"
  else
    echo "FAIL  certificate: expires within 14 days or cannot be read"; fail=1
  fi
fi

if [ "$fail" -eq 0 ] && [ -n "${HEALTHCHECK_PING_URL:-}" ]; then
  curl -fsS --max-time 10 --retry 3 -o /dev/null "$HEALTHCHECK_PING_URL" || echo "WARN  could not ping healthchecks.io"
fi
exit "$fail"
