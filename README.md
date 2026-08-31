# Smart Waste — Real-World Waste Management Platform

This repo has two generations of the system:

## Current platform (active)

- **`backend/`** — Node/Express + embedded Postgres (`@electric-sql/pglite`) business-logic
  server. This is the real system of record: admin-provisioned staff accounts, Google-only
  resident sign-in, local collection hubs with live capacity, cleaner collections, resident
  pickup requests with a real missed-pickup escalation engine, QR-gated driver dispatch
  (assign → scan to go on-the-job → scan at hub → scan again with real loaded weight →
  scan at recycling facility → manual received-weight confirmation), and recycling batch
  classification/processing — all backed by real logged numbers, never fabricated data.
  See **`backend/README.md`** for the full API reference and architecture rationale.
- **`frontend/`** — React + Vite + Tailwind UI wired to the new backend. Login is a
  slider between staff-role panels (admin-issued credentials) and a Google-only resident
  panel — no "Login"/"Demo" tabs. Every role lands on a dashboard built for their job:
  Admin oversight, Local Hub Manager, Recycling ("Recycle Commander"), Cleaner field ops,
  Driver QR scanning flow, and Resident pickup requests.

### Running the current platform

```bash
# 1. Backend (Postgres + API), first time only creates the bootstrap admin:
cd backend
npm install
node src/db/seed.js      # prints the bootstrap admin username/password
npm start                # listens on :8081

# 2. Frontend
cd frontend
npm install
npm run dev              # listens on :3000, proxies /api -> :8081
```

Log in as the bootstrap admin, change the password when prompted, then use
**Staff & Accounts** to create hub managers, cleaners, recycling managers,
and drivers — no other account creation path exists for staff.

## Legacy platform (retired)

The original `src/*.c` / `Makefile` / `server.exe` C+Mongoose backend that shipped with
this repo is **retired** in favor of the Node/Postgres backend above — it modeled "smart
bins" and a much simpler workflow that doesn't match the real-world hub → dispatch →
recycling business model now in place. The C source is kept in git history for reference
but is no longer built or run as part of the active app. See earlier commits in this
repo's history if you need the original academic-simulation README and credentials table.
