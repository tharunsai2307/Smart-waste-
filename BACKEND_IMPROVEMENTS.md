# Backend Hardening & Roadmap

Status: **round 1 implemented** (July 2026 review of the `ad71ed6` codebase).
This document records (a) what changed in this round, (b) the exact API surface,
and (c) the prioritized backlog for the next rounds.

---

## 1. What was wrong (audit findings)

| # | Finding | Severity |
|---|---------|----------|
| 1 | **Almost every `/api/*` handler was unauthenticated.** Only ~5 handlers called `getAuthenticatedUser`; bins, vehicles, collections, residents, waste, alerts, recycling, incidents, analytics, reports, QR, driver-checkin, hub-arrival and demo-reset were all reachable anonymously. | Critical |
| 2 | **"Auth" was a trivially forgeable integer.** `Authorization: 1` = user id 1. No token, no signature, no expiry. | Critical |
| 3 | **Incident identity was client-controlled.** `handleGetIncidentsPhase10` trusted `X-User-Role` / `X-User-Id` headers; `handleCreateIncidentManual` trusted `$.reportedBy`; `handleIncidentActionWorkflow` trusted `$.actorId` / `$.actorRole` from the body — anyone could forge audit trails and assign incidents as themselves. | Critical |
| 4 | **Passwords used a single global salt** (`smart_waste_salt_2026$`) with one SHA-256 pass, and `validateLogin` still accepted **plaintext** as a valid password (`|| constantTimeStrcmp(..., password)`). | High |
| 5 | **Workspace isolation had a bypass.** `X-Workspace-Id` was honored for any `ROLE_ADMIN` request; when `g_current_workspace` was empty (anonymous), most handlers skipped the workspace filter entirely and returned global data. | High |
| 6 | **Unknown POST routes faked success** (`handlePostAction` returned 200 `{"success":true}`), hiding missing backend implementations from the UI. | Medium |
| 7 | **Fixed-size JSON buffers with `strcat`** (16 KB–64 KB, plus `char body[8192]`) overflowed as soon as a `.dat` file exceeded the hard-coded record count, and `handleGetIncidentsPhase10` silently truncated. | Medium |
| 8 | **Predictable identifiers.** Workspace UUIDs used `srand(time(NULL))` + `rand()`; Google-login user ids used `time(NULL) % 100000` (collides with existing ids); `wasteId = rand() % 90000 + 10000` unseeded. | Medium |
| 9 | **`routeAllowedForRole` never existed** — no central role matrix; `permissions.c` was partially wired but the HTTP layer bypassed it. | High |
| 10 | **Build was broken on POSIX and on Windows-by-Makefile.** `make` referenced a missing `src/main.c` and linked `-lws2_32` unconditionally; Mongoose required GNU extensions (`ip_mreq`, `strcasecmp`) and `-lm` on Linux. | High |
| 11 | **Frontend/backend contract gaps.** `Login.tsx` calls `/auth/change_password`, `/residents/profile`, `/staff/profile`, `/admin/staff` — none existed server-side (all silently "succeeded" via the fake POST handler). | Medium |
| 12 | **No login rate limiting, no body-size cap, no security headers, no logout/session revocation.** | Medium |

---

## 2. What was implemented in this round

### 2.1 New module: `include/security.h` + `src/security.c`
Self-contained crypto (no OpenSSL, builds into both the server and the CLI):

- OS-backed CSPRNG: `BCryptGenRandom` (Windows), `getrandom()`/`/dev/urandom` (POSIX).
- Iterated salted SHA-256 KDF (10 000 iterations, 12-byte per-user salt).
  Stored format: `S$<iterations>$<salt_hex>$<hash_hex>` (fits the existing 100-char field).
- **Backward-compatible verification**: old 64-hex salted hashes and legacy plaintext
  fields still verify, but the first successful login silently **re-hashes** to the
  new format (`validateLogin` → `updateUser`). Plaintext is never written again.
- Password policy helper (≥ 8 chars, at least one letter and one digit).
- `sw_sha256_file` streaming file checksum (used by `data_integrity.c`, which no
  longer depends on Mongoose).
- UUID v4 + 64-hex token generation.

### 2.2 Authentication & sessions (`src/server.c`)
- `Authorization: Bearer <64-hex>` session tokens, 12-hour sliding expiry,
  256 concurrent sessions, periodic sweep, `POST /api/auth/logout` revocation.
- `getAuthenticatedUser` is now session-based. Numeric/user-id auth is rejected.
- Login rate limiting: 5 failures per username (+IP) and 20 per IP per 10 min → 429.
- Request body cap: 256 KB → 413.
- Security headers on all JSON replies (`nosniff`, `SAMEORIGIN`, `no-referrer`,
  `Cache-Control: no-store`).

### 2.3 Central gate + RBAC (`eventHandler`)
Every `/api/*` route except `GET /api/health`, `POST /api/auth/login`,
`POST /api/auth/google` now requires a valid session. A central
`routeAllowedForRole` matrix then enforces:
- `/api/admin/*` → `ADMIN`
- `/api/workspaces` GET → `ADMIN` / `MUNICIPAL_ADMIN`; POST → `ADMIN`
- `/api/analytics/*`, `/api/reports/*` → staff only
- `/api/incidents*` mutations → staff; reads → any authenticated user
- `/api/driver/*` → `DRIVER` / admins; `/api/qr/*` → `CLEANER` / `DRIVER` / staff
- `/api/demo/reset` → `ADMIN`
- `/api/residents/profile` → `RESIDENT`; `/api/staff/profile` → staff
- `/api/hubs` mutations → staff; `/api/system/*`, `/api/backups`, `/api/archives` → `ADMIN` / `MUNICIPAL_ADMIN`
- Anything else → any authenticated user (existing feature behavior preserved)

Workspace scoping is **always** taken from the session (never from
`X-Workspace-Id`); admins switch workspaces through `POST /api/auth/workspace`.

### 2.4 Incident identity integrity
- List handler: identity from session (headers ignored).
- Create manual incident: `reportedBy` from session.
- Workflow actions (`acknowledge/assign/…/reopen`): `actorId`/`actorRole` from
  session; body-supplied values ignored.

### 2.5 New endpoints (previously missing; the UI called them and got fake success)
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/auth/me` | Session profile (role, `requiresPasswordChange`, `profileComplete`) |
| POST | `/api/auth/logout` | Revoke session |
| POST | `/api/auth/change_password` | Verify old, enforce policy, re-hash, audit |
| POST | `/api/auth/workspace` | Admin: switch session workspace |
| POST | `/api/residents/profile` | Create/update resident profile (resident role) |
| POST | `/api/staff/profile` | Update staff phone/name/hub |
| POST | `/api/admin/staff` | Admin: create staff with password policy, `requiresPasswordChange=1` |
| POST | `/api/hubs` | Create hub (persisted) |
| POST | `/api/hubs/update` | Update hub |
| GET | `/api/hubs/cleaners` | List cleaners (optional `?hubId=`) |
| GET | `/api/hubs/dashboard` | Hub KPIs (inbound/outbound/active cleaners) |
| GET | `/api/system/health` | Health totals from `system_health.c` |
| GET | `/api/system/integrity` | Per-file record-size/CRC verification |
| POST | `/api/system/integrity/scan` | Run verification, summary counts |
| POST | `/api/system/retention/evaluate` | Retention policy report |
| GET / POST | `/api/backups` | List / create backups |
| GET | `/api/archives` | List archives |

### 2.6 Reliability & correctness
- Growable `JsonBuf` replaces fixed-buffer/malloc+`strcat` builders in:
  workspaces, bins, vehicles, collections, residents, waste, alerts, recycling,
  incidents (Phase 10), hub cleaners, integrity, backups, archives.
- Removed dead duplicate `GET /api/incidents` stub (was shadowing the Phase 10
  list handler) and `handleGetAllIncidents`.
- `roleToStr` now maps `ROLE_MUNICIPAL_ADMIN`.
- `handleGoogleLogin`: validates email, collision-safe `maxId+1` id, real default
  workspace (`global` or first workspace record), `status=1` (previously new
  accounts were created **locked**, `status=0`), random throwaway password hash,
  profile-complete now reflects an actual resident record.
- `getUserByUsername(username, NULL)` is NULL-safe for existence checks.
- `data_integrity.c` no longer depends on Mongoose (uses `security.c`), so the
  CLI binary can link it.

### 2.7 Build & tests
- `Makefile` now cross-platform: Windows → `-lws2_32`, POSIX → `-pthread -lm`,
  `-std=gnu11` (Mongoose needs POSIX extensions), `-O2`, includes `security.c`.
- Restored `src/main.c` (was only present as `main.c.bak`), CLI defines its own
  `g_current_workspace`.
- `PORT` env var for the HTTP server (default 8080).
- New `tests/api_smoke.sh` (30 checks, isolated data copy, never touches real
  `data/`): auth-gate, forged-id rejection, rate limit, legacy-hash migration,
  password change, RBAC, staff creation, Google + resident profile flow,
  workspace switch, logout invalidation, governance endpoints, unknown-POST 404.

**Verification:** `make` → both binaries compile; `make test` → 30/30 pass;
`cd frontend && npm run build` → `tsc -b && vite build` exit 0.

---

## 3. API changes that affect the frontend

1. Login / Google login now return a **`token`** field (64-hex). The frontend
   sends it as `Authorization: Bearer <token>` (already wired in
   `frontend/src/services/api.ts`, `Login.tsx`, `Sidebar.tsx`,
   `WorkspaceContext.tsx`).
2. `X-Workspace-Id` is ignored by the backend — use
   `POST /api/auth/workspace` to switch (already wired).
3. Unknown POST routes now return **404** instead of fake `{"success":true}`.
   The frontend's mock-data fallback still catches 404s, but pages that relied
   on the fake success (e.g. collection/transfer actions) will now visibly fall
   back until the real handlers are implemented (see roadmap §4).

## 4. Backlog (next rounds, in priority order)

### Phase A — finish the missing operational endpoints
The frontend calls these; they currently 404 (→ mock fallback):
- Collections: `assign`, `request`, `status`, `record-weight`, `deposit-hub`,
  `report-missed`, `reschedule`, `hub`
- Vehicles: `available`, `hub`, `setstatus`, `update`
- Drivers: `available`, `my-assignment`, `profile`
- Transfers: all actions (`assign-driver`, `assign-vehicle`, `load`, `depart`,
  `arrive`, `complete`, `cancel`, `delay`, `checkin`, `record-load`,
  `record-delivery`, `approve`, `my`, `analytics`)
- Recycling: `receive`, `weight`, `classify`, `segregate`, `process`,
  `recovery`, `residual`, `reject`, `quarantine`, `accept`, `arrivals`,
  `batches/complete`, `analytics`
- Facilities: `GET /api/facilities` (list)

### Phase B — persistence & concurrency
- Replace per-file `updateUser`-style rewrite-on-write with a real append log +
  compaction, and use a single writer lock (the C backend is still single-request
  safe today because Mongoose here is single-threaded; document that).
- Record-level CRC32 headers in `.dat` files (registry already records
  record sizes; add per-record checksums).
- Graceful shutdown: flush + backup on SIGINT/SIGTERM.

### Phase C — observability
- `/api/observability/metrics` endpoint (auth/admin) exposing
  `ObservabilityMetrics`.
- Structured request log: method, path, status, duration, user id.
- Log rotation (`data/system.log` grows forever).

### Phase D — engineering
- C unit tests for `security.c` (KDF vectors, legacy migration, policy) with
  `make unit-test`.
- CI workflow (GitHub Actions): build on ubuntu + windows, run smoke tests.
- `clang-tidy`/`cppcheck` config; `-Werror` in CI only.
- Untrusted-`strcpy` sweep in `types`-mutation modules (bin.c, vehicle.c, …).

### Phase E — longer-term architecture
- SQLite (or SQLite-compatible KV) behind the existing module APIs; keep the
  `.dat` files as import/export format.
- TLS (Mongoose `mg_tls` / cert paths) + optional Basic API key for machine
  clients.
- Real OAuth verification for Google login (Firebase ID token → verify
  signature server-side; currently the backend trusts the email the client
  sends, as before, with a random local password).
- Multi-process-safe workspace switching (per-request context instead of the
  `g_current_workspace` global).
