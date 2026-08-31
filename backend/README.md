# Smart Waste — Backend (v2, real-world business engine)

This is the new business-logic backend for the Smart Waste platform. It
replaces the old C/Mongoose server's data model with a real relational
schema and workflow engine that reflects how the physical operation
actually works: residents → cleaners → local hubs → recycling hubs, with
QR-gated dispatch and **zero fabricated numbers**.

## Stack & why

| Concern              | Choice                              | Why |
|-----------------------|--------------------------------------|-----|
| Database              | **Postgres**, run via `@electric-sql/pglite` (embedded WASM Postgres) | Sandbox has no system package access (`apt` blocked), so a real Postgres install isn't possible here. `pglite` gives a **real Postgres engine** with zero system dependencies — same SQL dialect, same `pg` wire semantics. The `schema.sql` is 100% portable: point `DATABASE_URL` at a hosted Supabase/RDS Postgres later and rerun the same file. |
| API server            | Express 5                            | Minimal, everyone knows it, plays nicely with the existing React/Vite frontend. |
| Auth (staff)          | JWT (`jsonwebtoken`) + bcrypt password hashes | Admin issues staff credentials; JWT carries role + hub scoping so every route can authorize by role without a DB round trip. |
| Auth (residents)      | Google Sign-In via Firebase (frontend) → backend trusts the verified profile and issues its own JWT | Residents never get a password; first sign-in creates their account, they fill in an address profile. |
| Validation            | `zod`                                | Fail fast, typed request bodies. |
| IDs / QR payloads     | `uuid`                                | Short unguessable codes embedded in QR payloads (`SWM:<KIND>:<CODE>:<NONCE>`). |

## Directory layout

```
backend/
  src/
    app.js                Express app + route mounting + startup
    db/
      schema.sql           Full Postgres schema (source of truth)
      index.js             PGlite connection + query helpers + migration runner
      seed.js               Bootstrap: creates the FIRST admin account only
    middleware/auth.js      JWT sign/verify, requireRole()
    services/
      dispatch.js           SLA + priority-score + cleaner-ranking logic (missed-pickup engine)
      ecoPoints.js           Resident reward calculation
    utils/
      geo.js                 Haversine distance
      codes.js               Human-readable codes + QR payload generation
    routes/
      auth.js                staff login, google login, resident profile, change-password
      users.js                admin: create/list/suspend staff, list drivers/cleaners
      hubs.js                 local hub + recycling hub CRUD
      collections.js           cleaner logs a real collection -> updates hub fill level
      pickups.js               resident pickup requests + missed-pickup escalation engine
      transfers.js             hub -> recycling dispatch lifecycle (QR-gated)
      vehicles.js               vehicle CRUD + capacity + driver "routes"
      recycling.js              batches: classify -> process -> stats
      alerts.js                 list/acknowledge/resolve
      dashboard.js               role-scoped read-model overviews (admin/resident/hub/recycling)
```

## Running

```bash
cd backend
npm install                # already done
node src/db/seed.js        # first time only: creates bootstrap admin (prints credentials)
npm start                  # or: node src/app.js  -> listens on 0.0.0.0:8081
```

Data persists on disk at `backend/pgdata/` (gitignored — this is a real
database file store, not something to commit).

**Bootstrap admin** (seed.js output, override via `SEED_ADMIN_USERNAME` /
`SEED_ADMIN_PASSWORD` env vars): the account is created with
`must_change_password = TRUE`, so the very first admin login should be
followed by `POST /api/auth/change-password`.

## Business model in one paragraph

Admin is the only account that can call `POST /api/users` to mint staff
logins (hub managers, cleaners, recycling managers, drivers) — nobody
self-registers as staff. Residents exclusively sign in with Google
(`POST /api/auth/login/google`), and on first login must complete
`POST /api/auth/profile/resident`. Admin creates **local hubs**
(`POST /api/hubs/local`) each with a manager and a capacity; cleaners
attached to a hub log real collections (`POST /api/collections`), which
raises the hub's `current_load_kg` and fires `HUB_WARNING`/`HUB_CRITICAL`
alerts at configurable thresholds. A local hub manager or admin requests a
transfer (`POST /api/transfers/request`); a recycling manager assigns a
driver + vehicle (`PATCH /api/transfers/:id/assign`). The driver then must
**physically scan QR codes** to progress the job:
`start-job` (their vehicle's QR) → `arrive-hub` (hub gate QR) → `loaded`
(hub gate QR again + they type in the real loaded weight) →
`arrive-recycling` (recycling hub gate QR) → recycling staff manually
key in `receive` weight (no IoT scale assumed) which completes the job,
frees the driver/vehicle, and the weight becomes available to build a
`recycling_batches` record — classified into categories and processed
into recovered/residual weight, always by manual entry from the
accountable staff member, never fabricated.

Resident pickup requests (`POST /api/pickups`) are auto-assigned to the
least-loaded/nearest available cleaner at their hub. Each request gets an
SLA (`SCHEDULED` 24h / `ON_DEMAND` 4h / `MISSED_REPORT` 2h). Calling
`POST /api/pickups/escalate` (meant to run periodically, currently
callable on-demand by any staff) finds every request that blew its SLA,
marks it `MISSED`, spawns a new higher-priority `MISSED_REPORT` follow-up
request (escalation level +1, shorter SLA, priority score boosted), fires
a `CRITICAL` alert, and re-attempts auto-assignment — so a missed pickup
never silently disappears, it gets progressively more urgent until
someone handles it.

## Full API reference

All endpoints are namespaced under `/api`. Except `/health` and the two
login endpoints, every route requires `Authorization: Bearer <jwt>`.

### Auth — `/api/auth`
| Method & path | Role | Purpose |
|---|---|---|
| POST `/login/staff` | public | `{username,password}` → JWT (admin/hub-manager/cleaner/recycling-manager/driver) |
| POST `/login/google` | public | `{googleUid,email,name,avatarUrl?}` → JWT, auto-creates resident on first call |
| POST `/profile/resident` | RESIDENT | complete address profile after first Google sign-in |
| POST `/change-password` | any staff | self-service password change |
| GET `/me` | any | current user record |

### Users / staff provisioning — `/api/users`
| Method & path | Role | Purpose |
|---|---|---|
| POST `/` | ADMIN | create a staff account + issue credentials |
| GET `/` | ADMIN | list every user (optional `?role=`) — full visibility |
| GET `/hub/:hubId/cleaners` | ADMIN, LOCAL_HUB_MANAGER (own hub) | cleaners at a hub |
| GET `/drivers` | ADMIN, RECYCLING_MANAGER | drivers + profile + current vehicle |
| PATCH `/:id/status` | ADMIN | suspend/reactivate |
| POST `/:id/reset-password` | ADMIN | issue a new temp password |

### Hubs — `/api/hubs`
| Method & path | Role | Purpose |
|---|---|---|
| POST `/local` | ADMIN | create a local collection hub |
| GET `/local` | any | list (scoped: admin sees all, hub roles see their own) |
| GET `/local/:id` | any | hub detail |
| PATCH `/local/:id` | ADMIN, LOCAL_HUB_MANAGER (own) | update capacity/thresholds/manager |
| POST `/recycling` | ADMIN | create a recycling facility |
| GET `/recycling`, `/recycling/:id` | any | list / detail |

### Collections — `/api/collections`
| Method & path | Role | Purpose |
|---|---|---|
| POST `/` | CLEANER | log a real collection → increments hub fill level, awards eco points, may fire hub alerts |
| GET `/` | any | scoped history |

### Pickup requests — `/api/pickups`
| Method & path | Role | Purpose |
|---|---|---|
| POST `/` | RESIDENT | create SCHEDULED / ON_DEMAND / MISSED_REPORT request, auto-assigns a cleaner |
| PATCH `/:id/assign` | ADMIN, LOCAL_HUB_MANAGER | manual (re)assignment |
| PATCH `/:id/cancel` | RESIDENT (own) | cancel a pending/assigned request |
| POST `/escalate` | ADMIN, LOCAL_HUB_MANAGER, RECYCLING_MANAGER | run the missed-pickup escalation sweep |
| GET `/` | any | scoped, priority-ordered list |

### Transfers (hub → recycling dispatch) — `/api/transfers`
| Method & path | Role | Purpose |
|---|---|---|
| POST `/request` | ADMIN, LOCAL_HUB_MANAGER | request a truck for a hub |
| PATCH `/:id/assign` | ADMIN, RECYCLING_MANAGER | assign driver + vehicle |
| POST `/:id/scan/start-job` | DRIVER | scan vehicle QR → `ON_THE_JOB` |
| POST `/:id/scan/arrive-hub` | DRIVER | scan hub QR → `ARRIVED_AT_HUB` |
| POST `/:id/scan/loaded` | DRIVER | scan hub QR again + enter loaded kg → `EN_ROUTE` |
| POST `/:id/scan/arrive-recycling` | DRIVER | scan recycling-hub QR → `ARRIVED_AT_RECYCLING` |
| POST `/:id/receive` | ADMIN, RECYCLING_MANAGER | enter received kg → `COMPLETED` |
| GET `/` | any | scoped list, full lifecycle visibility |
| GET `/:id` | any | detail + full event timeline (who scanned what, when) |

### Vehicles & routes — `/api/vehicles`
| Method & path | Role | Purpose |
|---|---|---|
| POST `/` | ADMIN, RECYCLING_MANAGER | register a vehicle (auto QR) |
| GET `/`, `/:id` | any | list / detail |
| PATCH `/:id` | ADMIN, RECYCLING_MANAGER, LOCAL_HUB_MANAGER | update capacity/status |
| GET `/routes/:driverId` | own DRIVER or staff | live route derived from active transfers (not a static list) |

### Recycling — `/api/recycling`
| Method & path | Role | Purpose |
|---|---|---|
| POST `/batches` | ADMIN, RECYCLING_MANAGER | create batch from a completed transfer OR manual intake |
| POST `/batches/:id/classify` | ADMIN, RECYCLING_MANAGER | split into categories with market rate |
| POST `/batches/:id/process` | ADMIN, RECYCLING_MANAGER | log recovered/residual (manual, no fake defaults) |
| GET `/batches`, `/batches/:id` | any | list / detail |
| GET `/hub/:hubId/stats` | any | aggregate real totals + by-category breakdown |

### Alerts — `/api/alerts`
| Method & path | Role | Purpose |
|---|---|---|
| GET `/` | any | scoped active/ack/resolved alerts |
| PATCH `/:id/acknowledge`, `/:id/resolve` | any | triage |

### Dashboards — `/api/dashboard`
| Method & path | Role | Purpose |
|---|---|---|
| GET `/admin` | ADMIN | system-wide live counts (users, hubs, transfers, alerts, vehicles) |
| GET `/resident` | RESIDENT | personal impact + active requests |
| GET `/local-hub` | ADMIN, LOCAL_HUB_MANAGER | hub health, cleaner workload, pending requests, transfers |
| GET `/recycling-hub` | ADMIN, RECYCLING_MANAGER | inbound transfers, available drivers/vehicles, recent batches |

## Not yet wired (next steps)

- Frontend still talks to the old C server / Supabase stub — needs a new
  `services/api.ts` pointed at this backend, plus the login page redesign
  (slider between staff-role logins and a resident Google button, no
  "Login"/"Demo" labels).
- Firebase Google Sign-In: `frontend/src/firebase.ts` is wired but uses
  placeholder config; swap in the real project keys, then have the
  frontend call `POST /api/auth/login/google` with the Firebase user's
  `uid`/`email`/`displayName`/`photoURL` after `signInWithPopup` succeeds.
  (Full ID-token verification via Firebase Admin SDK should be added
  server-side once those keys exist, instead of trusting the client body.)
- Real camera QR scanning in the driver UI (e.g. `html5-qrcode` or
  `@zxing/browser`) feeding the `qrPayload` into the three `/transfers/:id/scan/*` calls.
- A scheduler (cron-like `setInterval`, since there's no external cron
  here) to call `/api/pickups/escalate` automatically instead of relying
  on a manual/staff-triggered sweep.
- Old C backend (`server.exe`) — recommend fully retiring it once the
  frontend cuts over to this backend; it has no path to the new
  hub/transfer/QR business model.
