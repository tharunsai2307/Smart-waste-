# Smart City Waste Intelligence Platform

Full-stack municipal waste management platform:

- **Backend**: C99/C11 HTTP server (Mongoose 7.23 embedded), binary flat-file
  persistence (`data/*.dat`), session-token auth, role-based access control.
- **Frontend**: React 19 + Vite + TypeScript, Tailwind CSS 4, Framer Motion,
  TanStack React Query, Zustand, Three.js smart-city visualization with a 2D
  radar fallback, Firebase Auth (Google) + Supabase.
- **Domains**: smart-bin telemetry, collection logistics, fleet/vehicle
  management, hubs & transfers, recycling plant, incident response command,
  executive analytics, multi-tenant workspaces, data governance (integrity,
  backups, archives).

## Build

Works on **Windows (MinGW-W64)** and **Linux/macOS**.

```bash
# Both binaries
make

# Backend HTTP server only
make server.exe

# Console CLI (legacy) only
make smart_waste.exe
```

On Windows with MinGW, `make` or `build.bat` both work; `build.bat` is a
convenience wrapper for the server binary.

## Run

```bash
# HTTP API server (default port 8080; override with PORT env var)
./server.exe

# Console CLI (legacy demo application)
./smart_waste.exe --create-admin
```

```bash
cd frontend
npm install
npm run dev      # http://localhost:3000, proxies /api -> :8080
```

## Test

```bash
make test
```

`tests/api_smoke.sh` runs 30 checks against an isolated copy of `data/` (never
mutates your real data): auth gate, forged-token rejection, login rate limit,
legacy password migration, password change, RBAC, staff creation, Google
resident onboarding, workspace switching, logout invalidation, governance
endpoints and unauthenticated/unknown-route behaviour.

## Default credentials

| Role              | Username            | Password            |
|-------------------|---------------------|---------------------|
| Master Admin      | `admin`             | `admin123`          |
| (staff accounts)  | create via POST `/api/admin/staff` | ≥ 8 chars, letter + digit |

The old `manager1` / `cleaner1` / `driver1` seed accounts are not present in the
current `data/users.dat`; staff accounts are created by the admin through the
API (or Users page when wired).

## Security model (this round)

- **Sessions**: `POST /api/auth/login` returns a 64-hex bearer token (12 h
  sliding expiry, revocable via `/api/auth/logout`). All `/api/*` routes except
  `/api/health`, `/api/auth/login`, `/api/auth/google` require it.
- **Passwords**: per-user salted, iterated SHA-256 (`10 000` rounds). Old
  records are verified for backward compatibility and re-hashed on first login.
- **RBAC**: central `routeAllowedForRole` matrix (ADMIN, MUNICIPAL_ADMIN,
  LOCAL_HUB_MANAGER, CLEANER, DRIVER, RECYCLING_MANAGER, RESIDENT).
- **Workspaces**: scope always comes from the session, never from headers.
- **Hardening**: login rate limiting (429), 256 KB body cap (413), security
  headers, collision-safe ids, CSPRNG UUIDs/tokens, growable JSON responses.

See `BACKEND_IMPROVEMENTS.md` for the full audit → implementation → roadmap.

## Storage

Binary records in `data/*.dat` with workspace isolation columns; integrity
registry in `data_integrity.c` supports SHA-256 verification, backups and
archives (`/api/system/*`, `/api/backups`, `/api/archives`).
