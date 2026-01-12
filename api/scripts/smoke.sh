#!/usr/bin/env bash
set -euo pipefail

: "${API:?API missing}"
: "${TOK:?TOK missing}"
: "${PROJECT_ID:?PROJECT_ID missing}"

echo "== health"
curl -fsS "$API/health" >/dev/null
echo "OK"

echo "== cerfa/generate (legacy)"
code="$(curl -sS -o /dev/null -w "%{http_code}" -H "X-Api-Token: $TOK" -H "Content-Type: application/json" -X POST "$API/api/cerfa/generate" --data "{\"projectId\":\"$PROJECT_ID\"}")"
echo "$code"
test "$code" = "200"

echo "== rapport-pvgis (legacy)"
code="$(curl -sS -o /dev/null -w "%{http_code}" -H "X-Api-Token: $TOK" "$API/api/projects/$PROJECT_ID/rapport-pvgis")"
echo "$code"
test "$code" = "200"

echo "SMOKE OK"
