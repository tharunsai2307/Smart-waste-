#!/usr/bin/env bash
# API smoke tests for the Smart City Waste backend.
# Runs the server against a COPY of data/ so real data is never mutated.
set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="$ROOT/tests/.smoke"
BIN="$ROOT/server.exe"
# Unique per-run port so a leftover server from a previous run can never be hit
PORT=$((18081 + RANDOM % 1000))
BASE="http://127.0.0.1:$PORT"
PASS=0
FAIL=0

cleanup() {
  [ -n "${SRV_PID:-}" ] && kill "$SRV_PID" 2>/dev/null
  wait "$SRV_PID" 2>/dev/null
}
trap cleanup EXIT

json_get() { # json_get <json> <python expr returning str>
  python3 -c "import json,sys; d=json.loads(sys.argv[1]); print($2)" "$1" 2>/dev/null
}

check() { # check <name> <expected> <actual>
  if [ "$2" = "$3" ]; then
    PASS=$((PASS+1)); echo "  ok    $1"
  else
    FAIL=$((FAIL+1)); echo "  FAIL  $1 (expected '$2' got '$3')"
  fi
}

check_contains() { # check_contains <name> <part> <actual>
  case "$3" in
    *"$2"*) PASS=$((PASS+1)); echo "  ok    $1" ;;
    *) FAIL=$((FAIL+1)); echo "  FAIL  $1 (missing '$2' in '$3')" ;;
  esac
}

status_of() { curl -s -o /dev/null -w "%{http_code}" "$@"; }

# ── Prepare isolated data copy ──────────────────────────────────────────
# Kill any leftover smoke server from a previous run (scoped to this dir).
pkill -f "^$WORK/server" 2>/dev/null || true
sleep 0.2

rm -rf "$WORK"
mkdir -p "$WORK/data"
cp "$ROOT"/data/*.dat "$WORK/data/" 2>/dev/null || true
cp "$BIN" "$WORK/server"

cd "$WORK" || { echo "ERROR: cannot cd to $WORK"; exit 1; }
# NEVER let the server run with the repository as its cwd - writes must stay
# inside $WORK.
if [ "$(pwd)" != "$WORK" ]; then echo "ERROR: cwd is not $WORK"; exit 1; fi

PORT="$PORT" ./server > server.log 2>&1 &
SRV_PID=$!

# Wait for server
for i in $(seq 1 40); do
  if curl -s "$BASE/api/health" >/dev/null 2>&1; then break; fi
  sleep 0.25
  if ! kill -0 "$SRV_PID" 2>/dev/null; then
    echo "Server exited early. Log:"; tail -20 server.log; exit 1
  fi
done

echo "== Health =="
HEALTH=$(curl -s "$BASE/api/health")
check_contains "health endpoint" "\"status\":\"online\"" "$HEALTH"

echo "== Auth required =="
check "GET /api/bins without token -> 401" 401 "$(status_of "$BASE/api/bins")"
check "GET /api/vehicles with forged numeric id -> 401" 401 "$(status_of -H 'Authorization: 1' "$BASE/api/vehicles")"
check "GET /api/analytics/summary without token -> 401" 401 "$(status_of "$BASE/api/analytics/summary")"

echo "== Login rate limiting =="
for i in 1 2 3 4 5; do
  curl -s -o /dev/null -X POST "$BASE/api/auth/login" \
    -H 'Content-Type: application/json' \
    -d '{"username":"no_such_user_xyz","password":"wrongpass"}' || break
done
check "rate-limited after 5 failed attempts -> 429" 429 \
  "$(status_of -X POST "$BASE/api/auth/login" -H 'Content-Type: application/json' -d '{"username":"no_such_user_xyz","password":"wrongpass"}')"

echo "== Admin login (legacy hash migration) =="
LOGIN=$(curl -s -X POST "$BASE/api/auth/login" -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}')
TOKEN=$(json_get "$LOGIN" "d.get('token','')")
check_contains "admin login returns token" "success" "$LOGIN"
[ ${#TOKEN} -eq 64 ] && { PASS=$((PASS+1)); echo "  ok    token is 64 hex chars"; } || { FAIL=$((FAIL+1)); echo "  FAIL  token length is ${#TOKEN}"; }

echo "== Authenticated API works =="
check "GET /api/bins with token -> 200" 200 "$(status_of -H "Authorization: Bearer $TOKEN" "$BASE/api/bins")"
check "GET /api/incidents with token -> 200" 200 "$(status_of -H "Authorization: Bearer $TOKEN" "$BASE/api/incidents")"
check "GET /api/analytics/summary with token -> 200" 200 "$(status_of -H "Authorization: Bearer $TOKEN" "$BASE/api/analytics/summary")"
ME=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE/api/auth/me")
check_contains "GET /api/auth/me returns role" '"role":"ADMIN"' "$ME"

echo "== Password change =="
check "wrong old password -> 400" 400 \
  "$(status_of -X POST "$BASE/api/auth/change_password" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"oldPassword":"wrong","newPassword":"SecurePass123"}')"
check "valid password change -> 200" 200 \
  "$(status_of -X POST "$BASE/api/auth/change_password" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"oldPassword":"admin123","newPassword":"SecurePass123"}')"
LOGIN2=$(curl -s -X POST "$BASE/api/auth/login" -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"SecurePass123"}')
check_contains "re-login with new password" "\"success\":true" "$LOGIN2"

echo "== RBAC =="
# Create a hub manager first (the curated seed data only guarantees 'admin')
curl -s -o /dev/null -X POST "$BASE/api/admin/staff" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"username":"manager_smoke","name":"Smoke Manager","password":"ManagerPass123","role":"LOCAL_HUB_MANAGER"}'
STAFF=$(curl -s -X POST "$BASE/api/auth/login" -H 'Content-Type: application/json' \
  -d '{"username":"manager_smoke","password":"ManagerPass123"}')
STAFF_TOKEN=$(json_get "$STAFF" "d.get('token','')")
check "manager cannot create staff -> 403" 403 \
  "$(status_of -X POST "$BASE/api/admin/staff" -H "Authorization: Bearer $STAFF_TOKEN" -H 'Content-Type: application/json' -d '{"username":"x","name":"x","password":"SecurePass123","role":"CLEANER"}')"
check "manager can read analytics -> 200" 200 \
  "$(status_of -H "Authorization: Bearer $STAFF_TOKEN" "$BASE/api/analytics/summary")"

echo "== Admin creates staff =="
CREATED=$(curl -s -X POST "$BASE/api/admin/staff" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"username":"cleaner_new","name":"New Cleaner","password":"CleanerPass123","role":"CLEANER","phone":"9999999999"}')
check_contains "create staff returns userId" "\"userId\":" "$CREATED"
CLEANER=$(curl -s -X POST "$BASE/api/auth/login" -H 'Content-Type: application/json' \
  -d '{"username":"cleaner_new","password":"CleanerPass123"}')
check_contains "new staff can log in" "\"success\":true" "$CLEANER"
check "new staff cannot create workspaces -> 403" 403 \
  "$(status_of -X POST "$BASE/api/workspaces" -H "Authorization: Bearer $(json_get "$CLEANER" "d.get('token','')")" -H 'Content-Type: application/json' -d '{"name":"X"}')"

echo "== Google resident flow =="
GOOGLE=$(curl -s -X POST "$BASE/api/auth/google" -H 'Content-Type: application/json' \
  -d "{\"email\":\"resident.smoke.$RANDOM@example.com\",\"name\":\"Smoke Resident\"}")
GTOKEN=$(json_get "$GOOGLE" "d.get('token','')")
GUID=$(json_get "$GOOGLE" "d.get('userId',0)")
check_contains "google login returns token" "\"success\":true" "$GOOGLE"
PROF=$(curl -s -X POST "$BASE/api/residents/profile" -H "Authorization: Bearer $GTOKEN" -H 'Content-Type: application/json' \
  -d '{"address":"12 Test Street","area":"Test Area","city":"Chennai","postalCode":"600001","phone":"9000000000"}')
check_contains "resident profile saved" "\"success\":true" "$PROF"
check "resident cannot access analytics -> 403" 403 \
  "$(status_of -H "Authorization: Bearer $GTOKEN" "$BASE/api/analytics/summary")"

echo "== Workspace switch (admin) =="
SW=$(curl -s -X POST "$BASE/api/auth/workspace" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"workspaceId":"global"}')
check_contains "switch workspace -> global" "\"workspaceId\":\"global\"" "$SW"

echo "== Logout invalidates token =="
check "logout -> 200" 200 "$(status_of -X POST "$BASE/api/auth/logout" -H "Authorization: Bearer $TOKEN")"
check "token rejected after logout -> 401" 401 "$(status_of -H "Authorization: Bearer $TOKEN" "$BASE/api/bins")"

echo "== Governance endpoints (admin) =="
LOGIN3=$(curl -s -X POST "$BASE/api/auth/login" -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"SecurePass123"}')
TOKEN3=$(json_get "$LOGIN3" "d.get('token','')")
check "GET /api/system/health -> 200" 200 "$(status_of -H "Authorization: Bearer $TOKEN3" "$BASE/api/system/health")"
check "GET /api/system/integrity -> 200" 200 "$(status_of -H "Authorization: Bearer $TOKEN3" "$BASE/api/system/integrity")"
check "GET /api/backups -> 200" 200 "$(status_of -H "Authorization: Bearer $TOKEN3" "$BASE/api/backups")"
check "POST /api/backups -> 200" 200 "$(status_of -X POST "$BASE/api/backups" -H "Authorization: Bearer $TOKEN3")"

echo "== Unknown POST no longer fakes success =="
check "unknown POST -> 404" 404 "$(status_of -X POST "$BASE/api/does-not-exist" -H "Authorization: Bearer $TOKEN3" -H 'Content-Type: application/json' -d '{}')"

echo "== Admin portal P0: real list shapes (arrays, no fake envelopes) =="
HUBS=$(curl -s -H "Authorization: Bearer $TOKEN3" "$BASE/api/hubs")
check_contains "GET /api/hubs returns bare array" "[" "$(printf '%s' "$HUBS" | head -c 1)"
FACS=$(curl -s -H "Authorization: Bearer $TOKEN3" "$BASE/api/facilities")
check_contains "GET /api/facilities returns bare array" "[" "$(printf '%s' "$FACS" | head -c 1)"
DRVS=$(curl -s -H "Authorization: Bearer $TOKEN3" "$BASE/api/drivers")
check_contains "GET /api/drivers returns bare array" "[" "$(printf '%s' "$DRVS" | head -c 1)"
TRFS=$(curl -s -H "Authorization: Bearer $TOKEN3" "$BASE/api/transfers")
check_contains "GET /api/transfers returns bare array" "[" "$(printf '%s' "$TRFS" | head -c 1)"
BATS=$(curl -s -H "Authorization: Bearer $TOKEN3" "$BASE/api/recycling/batches")
check_contains "GET /api/recycling/batches has batches key" '"batches"' "$BATS"

echo "== Admin portal P0: real transfer create (domain validation) =="
CREATE=$(curl -s -X POST "$BASE/api/transfers" -H "Authorization: Bearer $TOKEN3" -H 'Content-Type: application/json' \
  -d '{"destinationFacilityId":1,"destinationType":"RECYCLING_HUB","wasteType":"Organic","plannedWeightKg":100,"priority":"NORMAL","scheduledDate":"2026-08-31","scheduledTime":"10:00","sourceHubId":1}')
check_contains "POST /api/transfers creates transfer" '"transferId"' "$CREATE"

echo ""
echo "==================================="
echo "RESULT: $PASS passed, $FAIL failed"
echo "==================================="
[ "$FAIL" -eq 0 ]
