# Smart Waste Platform — Repository Audit

**Audited HEAD:** `6eaff14` on branch `arena/01a05350-smart-waste`
(contains user checkpoint `ad71ed6` on `main` + one backend-hardening round
`6eaff14`; the delta is listed in §L so findings can be read against either).

**Method:** source inspection of every backend module + `server.c` route table,
compilation of all legacy test suites, `make test` (API smoke), `tsc --noEmit`,
secret/dependency scans, response-shape cross-checking with the React client.
**Sandbox limits (marked UNVERIFIED where relevant):** Linux/GCC sandbox only —
no MinGW-W64 toolchain, no real Firebase project, no headless browser (black
screen was root-caused statically from code paths).

---

## A. Repository Structure

```
Smart-waste-/
├── include/                   45 headers (config, types, per-module)
├── src/                       42 C sources (~52.4k LOC incl. Mongoose 7.23)
│   ├── mongoose.c/h           bundled embedded HTTP server
│   ├── server.c               router + handlers (~2.7k LOC, ~101 route patterns)
│   ├── server_main.c          HTTP entry point (PORT env, default 8080)
│   ├── main.c                 console CLI entry (restored; was only .bak)
│   ├── security.c/h           NEW: CSPRNG, KDF, UUID, tokens, SHA-256
│   └── migration/             2024_add_workspace.sql  + migrate_v11.c
│                              (documentation/one-off .dat rewriter)
├── data/                      29 .dat files — ALL TRACKED IN GIT (finding D.5)
├── tests/
│   ├── test_phase5/6/8/9/10.c  legacy suites (asserts, pass when linked)
│   ├── test_phase13_workspace_security.c  BROKEN (stale enum names)
│   └── api_smoke.sh           30-check HTTP suite (isolated data copy)
├── frontend/src/
│   ├── pages/                 27 pages (Dashboard, ExecutiveCommand,
│   │                          IncidentCommand, GISCommand, Hubs, Transfers,
│   │                          RecyclingCommand, DriverOperations,
│   │                          DispatchDashboard, DataGovernance, …)
│   ├── components/            layout/, 3d/CityScene, gis/MapProvider,
│   │                          cards/, recycling/, ErrorBoundary, AlertCenter
│   └── services/              api.ts, mockFallback.ts, supabaseApi.ts
├── Makefile  build.bat  start.bat  .clangd  compile_flags.txt
├── BACKEND_IMPROVEMENTS.md    round-1 changelog
└── AUDIT_REPORT.md            this file
```

---

## B. Phase Audit (against actual code)

| Phase | Status | Evidence / gaps |
|---|---|---|
| **1 Auth & security** | ⚠️ PARTIAL | Local login ✅ (session bearer, per-user salted KDF, rate limit, RBAC gate, audit log). **Google OAuth ❌** — client-side `signInWithPopup` only; backend trusts a client-supplied email (`POST /api/auth/google`) and creates a local account; no token verification, no OIDC callback, no account linking check. Firebase config is placeholder env vars (`YOUR_API_KEY` → login buttons fail without `.env`). Console `loginMenu` still exists (legacy). |
| **2 Hubs & inventory** | ⚠️ PARTIAL | `hub.c` full model + transactions + `add/update/get/performance` ✅. APIs: `GET /api/hubs`, `/my-hub`, `/transactions`, `POST /api/hubs`, `/update`, `GET /cleaners`, `/dashboard` ✅. **No delete**, no capacity-enforcement mutation endpoint, and list handlers read ALL workspaces (no filter). |
| **3 Collection & field ops** | ⚠️ PARTIAL | `collection.c` lifecycle, priority engine, cleaner assignments, `process` endpoint, list endpoints ✅ (phase-5 suite passes). **Most HTTP mutations are stubs**: `/api/collections/*` → `handleCollectionAction` returns fake `{"success":true}`; `assign/request/status/record-weight/deposit-hub/report-missed/reschedule` have **no real handler**. QR-validated collection deposit only partially tied in. |
| **4 Transfers** | ⚠️ PARTIAL | `transfer.c` lifecycle/variance ~500 LOC ✅ (used by phase-5 tests). **Only `GET /api/transfers` exists**; all 15 action endpoints (`assign-driver/vehicle`, `load`, `depart`, `arrive`, `complete`, `cancel`, `delay`, `checkin`, `record-*`, `approve`, `my`, `analytics`) → 404 → frontend mock fallback. |
| **5 Recycling / processing** | ⚠️ PARTIAL | `recycling.c` batches, classification, segregation, recovery/residual ✅ (phase-5 suite passes). APIs: `GET /api/recycling`, `/recycling/facilities`, `/recycling/batches` only; `receive/weight/classify/segregate/process/recovery/residual/reject/quarantine/accept/arrivals/batches/complete/analytics` **missing** (404 → mock). |
| **6 GIS & location** | ⚠️ PARTIAL | `geospatial/location/gis_route` implemented; Haversine + nearest-hub tests pass; `GET /api/gis/locations`, `/nearest-hubs` real. **`/gis/nearby` and `/gis/routes` are hardcoded fake messages; `POST /api/gis/*` is a stub**; location/vehicle-position CRUD APIs absent; **frontend `GISCommand.tsx` uses hardcoded mock coordinates** and never calls the API. |
| **7 Route planning & dispatch** | ✅ COMPLETE (core) | `route_engine.c` + all 12 expected endpoints wired to real functions: plan/transfer-plan, assign/accept/start/complete/cancel, stop arrive/complete, `GET /routes`, `GET /routes/{id}/stops`, `GET /route/{id}`. Verified in route table + handler code. *Caveat: no UI end-to-end test found.* |
| **8 QR / fleet / real-time ops** | ⚠️ PARTIAL | `qr.c` parse/validate + `POST /qr/scan`, `/driver/vehicle-checkin`, `/driver/inspection`, `/hubs/*/arrival` implemented (phase-8 tests pass). **Missing**: facility arrival, weigh-bridge QR verification endpoint, QR event/audit listing in driver ops; `DriverOperations.tsx`/`DispatchDashboard.tsx` exist but depend on the missing collections/transfers mutations. |
| **9 Analytics & executive** | ✅ COMPLETE (core) | `analytics.c` (~1.35k LOC) computes from real `.dat` (no `rand()` found in analytics; only `handleAddWaste` uses `rand()` for wasteId). All 14 analytics endpoints + CSV export wired; shapes match TS interfaces; smoke-tested 200. *Gaps: buffers still fixed-size in live-feed; workspace scope filtered in analytics.c via `g_current_workspace` ✅.* |
| **10 Incident & notifications** | ✅ COMPLETE (core) | `alert_engine.c` + incident lifecycle state machine + timeline + notification prefs; tests pass; all workflow endpoints wired; session-derived actor identity (round 1). |
| **11 RBAC & workspaces** | ⚠️ PARTIAL | Backend: `workspace.c` + `permissions.c` + roles + session-bound workspace ✅ (server never trusts `X-Workspace-Id`). **`has_permission()` is used in exactly ONE handler** — the HTTP layer uses a separate `routeAllowedForRole` matrix, so `permissions.c` is effectively dead-code/documented-only. **Frontend `WorkspaceProvider` is never mounted** — `WorkspaceManagement.tsx`/`WorkspacesPage.tsx` run on the default empty context (switchWorkspace is a no-op after reload). `MUNICIPAL_ADMIN` exists in enum + matrix, **no seed account**. |
| **12 Governance/backup/archive** | ⚠️ PARTIAL | `data_integrity.c`: real registry + size/hash verification ✅. `backup.c`: real file copy ✅, but **verify = metadata only (no checksum check)**; **restore = direct overwrite, no safety snapshot, `remove(dest)` before rename on Windows (crash-window non-atomic)**; workspace filter ignored (backs up ALL files); timestamp-id collides within a second. `archive.c`: **stub** — writes fake `ARCH-*` metadata, `recordCount=0`, message literally "(Simulated)" — **no actual archival**; retention report is static text. `system_health.c`: `healthyFiles = totalFiles` (assumed, never scanned), `lastIntegrityScanAt` always "Never". **None of `initBackupEngine/initArchiveEngine/initDataIntegrity/initSystemHealth` are called at startup.** APIs newly exposed get 200 with these partial results. |
| **13 Hardening/observability/external** | ⚠️ PARTIAL | `observability.c`: structured logs + metrics counters ✅ (no metrics API endpoint yet; logs never rotated). External services abstraction ✅ with **safe fallbacks when keys absent** (verified by reading each provider). **All live provider HTTP calls are placeholders** — geocoding returns a fixed coordinate / "simulated" address; routing uses Haversine ×1.2; notifications create nothing external. Headers/RBAC/rate-limit hardening ✅ (round 1). |

---

## C. Build Status (verified in sandbox)

| Check | Result |
|---|---|
| `make` (server.exe + smart_waste.exe, GCC 12, `-Wall -Wextra -std=gnu11`) | ✅ exit 0, **0 errors**; ~130 pre-existing `-Wstringop-truncation`/`-Wmissing-field-initializers` warnings in legacy modules (none from round-1 code) |
| `make test` → `tests/api_smoke.sh` | ✅ **30/30 pass**, isolated data copy, repo `data/` untouched |
| Legacy suites (link with all core sources + `g_current_workspace` shim) | ✅ phase 5/6/8/9/10 all pass; **❌ `tests/test_phase13_workspace_security.c` does not compile** (uses `PERM_VIEW_DASHBOARD`, `PERM_MANAGE_WORKSPACES`, which do not exist in `permissions.h`) |
| `cd frontend && npx tsc --noEmit` | ✅ exit 0 |
| `npm run build` | ✅ exit 0 (chunk-size warnings only) |
| Windows `mingw32-make` / `build.bat` | 🔴 UNVERIFIED (no Windows toolchain here). **Static issue found & fixed**: `build.bat` globbed all `src/*.c`, so restoring `src/main.c` introduces a **duplicate `main()`** → server build would fail on Windows; `build.bat` now excludes `src/main.c`. |
| Git | branches: `main`, `arena/01a05350-smart-waste`; **no tags**; `main` = `ad71ed6`. |

---

## D. API Audit

- **Route patterns:** 101 registered (incl. catch-alls), 87 distinct calls from the frontend API client.
- **Auth protection:** ✅ in round-1 build — every `/api/*` except `/api/health`, `/api/auth/login`, `/api/auth/google` requires a Bearer session (`isPublicRoute` + central gate). Forged numeric `Authorization: 1` → 401 (smoke-tested).
- **Workspace protection:** ⚠️ **incomplete** — the gate scopes `g_current_workspace` from the session, and the main list handlers (bins/vehicles/collections/residents/waste/alerts/recycling, incidents, cleaners) filter by it. **But these handlers do NOT filter workspace:** `handleGetAllHubs`, `handleGetMyHub`, `handleGetHubTransactions`, `handleGetAllCollections`, `handleGetAllTransfers`, `handleGetAllFacilities`, `handleGetRoute(s)`, `handlePlan*Route`, and **`handleGetDashboard`** (all counts global, incl. for a municipal user). → cross-workspace data leak via those endpoints (P1).
- **Stub / fake-success endpoints (🔴):** `POST /api/collections/*` → `handleCollectionAction` returns `{"success":true,"message":"Action processed"}` **without doing anything**; `GET /api/gis/nearby`, `GET /api/gis/routes` return canned messages; `POST /api/gis/*` canned. These are the worst class: UI believes mutations succeeded.
- **Duplicate/conflicting:** one duplicate `GET /api/incidents` stub removed in round 1; remaining duplicates (`/api/workspaces`, `/api/hubs`, `/api/backups` GET+POST, `/api/incidents` GET+POST) are method-disambiguated and consistent. `/api/incidents/#` vs `/api/incidents/*` ordering is correct.
- **Missing (frontend calls → 404 → mock fallback):** collections `assign/request/status/record-weight/deposit-hub/report-missed/reschedule/hub`; transfers all 15; recycling 13; `GET /api/drivers`, `/drivers/available|my-assignment|profile`; `GET /api/facilities`; vehicles `available|hub|setstatus|update`; `POST /api/recycling/arrivals` etc. — **~45 endpoints** (same list as `BACKEND_IMPROVEMENTS.md` Phase A).

---

## E. Authentication Audit

| Item | Status |
|---|---|
| Local login | ✅ `POST /api/auth/login` — session token issued |
| Token | ✅ **In-memory** 256-bit bearer (`Authorization: Bearer <64hex>`), 12 h sliding expiry, logout revocation; ❌ not persistent/JWT — every server restart logs everyone out (acceptable for demo, noted) |
| Password storage | ✅ per-user salt, 10 000-iter SHA-256 (`S$it$salt$hash`), transparent migration of legacy hashes/plaintext on first successful login; plaintext acceptance removed |
| Policy | ✅ ≥8 chars + letter + digit enforced on change/create |
| Rate limiting | ✅ 5/user, 20/IP per 10 min → 429 |
| RBAC matrix | ✅ central `routeAllowedForRole` (ADMIN/MUNICIPAL_ADMIN/staff/resident granularity) + per-handler checks where needed |
| Workspace binding | ✅ session-owned; `X-Workspace-Id` ignored |
| Google OAuth | ❌ **placeholder** — see Phase 1; requires Firebase client + server trust of client email |
| Audit logging | ✅ `data/audit.dat` writes on login-adjacent actions (change-password, create staff/hub, backup, workspace switch, incident ops) + `logAudit` in domain modules |

---

## F. Database Audit

- **Persistence = flat binary `.dat` files only.** No SQLite, PostgreSQL, MySQL, ORM, or driver code anywhere in the repository (grep over `.c/.h/.ts/.tsx/.json` → zero hits outside comments).
- `src/migration/2024_add_workspace.sql` is **documentation only** — it describes a SQLite schema that no code consumes; no sqlite3 header/source exists.
- `migrate_v11.c` is a real **one-off `.dat` rewriter** (adds `workspaceId="global"` to records), not a DB migration.
- **Conclusion:** the architecture is intentionally flat-file. A DB migration is **not required** for continued development; the correct target (whenever asked) is to keep the module APIs and swap the storage layer, not add a DB beside it. Verdict: **remaining `.dat` architecture is intentional — no migration needed now.**

---

## G. External Services Audit

| Service | Provider | Required? | Where used | Env vars | Fallback present? |
|---|---|---|---|---|---|
| Maps | Mapbox (frontend) | OPTIONAL | `GISCommand` / `MapProvider.tsx` | `VITE_MAP_PROVIDER`, `VITE_MAP_API_KEY` | ✅ falls back to local SVG/canvas radar; today GISCommand uses **hardcoded mock coords** |
| Geocoding | generic (Mapbox/Google intended) | OPTIONAL | `geocoding.c` (resident profile, location) | `GEOCODING_PROVIDER`, `GEOCODING_API_KEY` | ✅ returns fixed Chennai coords (still a **simulation**, not real lookup) |
| Routing | generic | OPTIONAL | `routing_provider.c` (route planning) | `ROUTING_PROVIDER`, `ROUTING_API_KEY` | ✅ internal Haversine ×1.2 fallback |
| Email/SMS | generic | OPTIONAL | `notification_provider.c` | `EMAIL_PROVIDER`, `EMAIL_API_KEY` | ✅ internal-only, never blocks |
| Google login | Firebase (Firebase Auth) | OPTIONAL (residents) | `frontend/src/firebase.ts` | `VITE_FIREBASE_*` | ❌ no server-side verification; misconfigured env → unusable |
| Database | none | — | — | — | `.dat` is the store |

**Secrets:** ✅ none hardcoded. No `.env*` files exist; `firebase.ts`/`supabase.ts` contain literal `"YOUR_API_KEY"` placeholders (safe but broken-by-default); `.gitignore` covers `frontend/.env`. No secret in the 2 commits.

---

## H. Frontend Runtime Audit (black screen / "cannot connect")

**Finding A — response-shape mismatches (page crashes):** backend list handlers return objects, frontend api.ts types/uses arrays:
- `GET /api/hubs` → `{"success":true,"hubs":[…]}` but `api.getHubs` typed `LocalHub[]`; `Hubs.tsx` does `hubs.find(...)` → `TypeError` on the page.
- `GET /api/transfers` → `{"success":true,"transfers":[…]}` vs `WasteTransfer[]`; `getFacilities`/`getRecyclingFacilities` similarly (`facilities` vs `[]`).
- `api.getRecyclingArrivals` → expects `{arrivals:[…]}`, but backend route is missing → mock returns `[]` → `arrivals.map` crash.

Note: these are inside `AppShell`'s `<ErrorBoundary>` (one level around `<Outlet/>`), so they show the error card, not a black screen.

**Finding B — outside the ErrorBoundary (true black-screen path):** `Sidebar` and `Topbar` render **outside** the only `<ErrorBoundary>` in AppShell. `Topbar` does `user.username.slice(0,1)` **unconditionally after `user &&`** — `"undefined".slice` isn't a crash but `undefined.slice` is. Concrete path: Google login while backend is down → `fetchJSON` catch → `getMockData('/auth/google')` → **`{success:true}` mock** → `handleFirebaseGoogleLogin` does `if (res.success)` → sets user `{userId: undefined, role: undefined, username: undefined, …}` → `Topbar` throws → React unmounts the whole tree → **black screen**. Same fake-success fallback makes local login show "Mock success" instead of a connection error.

**Finding C — "Cannot connect to backend" message:** it is the literal text in `Login.tsx` catch block. It surfaces when `api.login` rejects — which now happens for non-404/500 failures only if `getMockData` output is unusable, and for direct `/api` access with no Vite proxy (e.g., `npm run preview` of the production build: Vite dev proxy `/api → :8080` exists **only in dev**; the built app has no proxy and no `VITE_API_URL` handling). Root causes: (1) backend not running / wrong port; (2) **mock-fallback swallowing real 401s** so credential errors can appear as "Mock success"; (3) no configurable API base URL in production builds.

**Finding D — workspace UI dead:** `WorkspaceProvider` (contexts/WorkspaceContext.tsx) is **never mounted** in `App.tsx`; the Workspaces pages render the default context (empty list, no-op switch).

**Finding E — GIS fake data:** `GISCommand.tsx` hardcodes 3 mock locations and never calls `/api/gis/locations` (also note those coordinates are US-based; seed data is India-based).

**Verdict:** the most probable literal "black screen" is **Finding B** (Topbar/Sidebar outside ErrorBoundary + mock-success login producing an undefined user). The most probable per-page "broken/content missing" is **Finding A**. Recommended minimal fixes (pending your go-ahead): mount a root ErrorBoundary above `WorkspaceProvider`/`AppShell`; guard `Topbar`; make `fetchJSON` throw on 401/connection errors instead of returning mock for auth calls; align `api.ts` getters with real response shapes; mount `WorkspaceProvider`; have `GISCommand` call the real API with fallback.

---

## I. Security Audit

| Area | Status |
|---|---|
| Secrets in repo | ✅ clean (placeholders only) |
| JWT/token validation | ✅ bearer token format + in-memory session; ❌ restarts wipe sessions |
| Workspace isolation | ⚠️ session-scoped, but 10+ handlers lack record-level filtering (§D) |
| Authorization | ✅ central matrix; ⚠️ `permissions.c` unused by HTTP layer (divergence risk) |
| User-supplied IDs | ⚠️ `handleGetMyHub` takes `managerId` from query without ownership check (any authed user can query any manager's hub); incident viewers are role-scoped but hub/dashboard endpoints are not ownership-checked; `handleAddWaste` accepts any `residentId` |
| File path traversal | ✅ **no user-controlled paths** — all `fopen` fixed names; `backupId` is only used in `verifyBackup`/`restoreBackup` (not exposed via HTTP) but would need validation if a restore endpoint is added (`snprintf("data/backups/%s")`) |
| Restore safety | 🔴 `restoreBackup` = direct copy, no metadata validation, no pre-restore snapshot, `remove(dest)`+`rename` non-atomic on Windows; **not yet reachable over HTTP** (mitigating) |
| CORS | ✅ headers allow `Authorization`; `Access-Control-Allow-Origin: *` + `Authorization` header is acceptable for token (no cookies); no credentials mode needed |
| Body/DoS limits | ✅ 256 KB cap, 413 |
| `handleDemoReset` | ⚠️ deletes ALL `.dat` including `users.dat` then re-seeds; gated to ADMIN but destructive — recommend moving behind explicit confirmation + backup-first |
| Cross-tenant dashboard leak | 🔴 `handleGetDashboard` counts all workspaces |

---

## J. Recovery Plan

**P0 — Broken functionality (do first, low risk, high visibility)**
1. Replace `handleCollectionAction` fake-success with real dispatch (collections assign/status/record-weight/deposit-hub/report-missed/reschedule/request/hub) — collection.c already has the logic.
2. Remove/repair GIS canned endpoints (`/gis/nearby`, `/gis/routes`, `POST /gis/*`); wire to `gis_route.c`.
3. Fix frontend response-shape mismatches: `api.getHubs/getTransfers/getRecyclingFacilities` → unwrap `{success:…}` envelopes; guard `Topbar` user fields.
4. Mount root `ErrorBoundary` + `WorkspaceProvider`; make `fetchJSON` throw on 401/network for auth calls (no mock-success logins).
5. Make `build.bat` exclude `src/main.c` (done this round).

**P1 — Missing security/integrity**
6. Add workspace filtering to the 10 unfiltered handlers + `handleGetDashboard`; ownership check in `handleGetMyHub`.
7. Harden `restoreBackup` (metadata-bound id validation, snapshot, atomic swap) before any HTTP restore endpoint; add id+snapshot.
8. Gate `handleAddWaste`/mutation IDs to the caller's own entities (resident→own residentId).
9. Server-side Google OAuth verification (Firebase ID token verify) or explicitly document login as demo-only.
10. Move seed data out of VCS: untrack `data/*.dat`, keep `init*` seeding; add `data/*.dat` to `.gitignore` + `data/seed` sample (data-file changes currently pollute every commit).

**P2 — Partial phase completion**
11. Transfers + recycling action endpoints (~28) using transfer.c/recycling.c APIs.
12. Drivers/facilities/vehicles mutation endpoints (~10); collection of remaining `api.ts` 404s.
13. Real archive implementation (currently simulated) + retention evaluation; wire `initBackup/Archive/DataIntegrity/SystemHealth` at startup.
14. Make `test_phase13_workspace_security.c` compile against the actual permission enum; add `test` targets to Makefile for all suites.
15. Windows CI build (GitHub Actions, MinGW) to verify `build.bat`/Makefile parity.

**P3 — Architecture improvements**
16. SQLite (or KV) behind module APIs, `.dat` kept as import/export format — only after P0–P2.
17. Per-request context (drop `g_current_workspace` global) for concurrency/multi-process safety.
18. C unit-test harness + `-Werror` CI; structured logs with request duration + rotation; metrics endpoint.

**P4 — Future Phase 14** (nothing started until this audit is accepted by you; candidates: real Mapbox/Google integration behind the existing provider abstraction, resident app, mobile QR for cleaners via PWA, public API keys/TLS).

---

## K. What was touched in this audit round (recovery, not new features)

- `tests/api_smoke.sh`: unique per-run port, kills stale smoke servers, hard `pwd==WORK` guard (evidence: a stale server from an earlier run mutated tracked `data/*.dat`; after this change `make test` leaves `git status` clean).
- `build.bat`: exclude `src/main.c` from the server build (would have failed on Windows after `main.c` restoration).
- All `data/*.dat` reverted to the committed baseline; working tree otherwise clean except this report.
- No backend feature code changed in this round (audit-only, per instructions).

---

## L. Delta vs `main@ad71ed6` (previous round, already committed `6eaff14`)

Relevant because audit findings above assume it: bearer sessions + central RBAC gate, KDF passwords with legacy migration, session-derived incident identity, new auth/hub/governance endpoints, growable JSON buffers, CSPRNG UUIDs/IDs, security headers, cross-platform Makefile, restored `src/main.c`, `PORT` env, 30-case API smoke suite. Without that delta: Phase 1/11/12/13 would grade lower (set `🔴`/`❌`); with it the grades above apply. Full details in `BACKEND_IMPROVEMENTS.md`.
