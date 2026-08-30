# API Security Inventory

**Date**: 2026-08-26
**Scope**: All REST APIs from Phases 1-12.

## Methodology
The `src/server.c` file was audited to ensure every endpoint strictly enforces:
1. Valid JWT-like token mapping to a user (`getAuthenticatedUser`).
2. Correct Role-Based Access Control (`has_permission`).
3. Correct Workspace Isolation (matching `g_current_workspace`).

## Audit Results

### Phase 1: Authentication
- `POST /api/login`: Public. Validates credentials.
- `GET /api/me`: Authenticated. Returns current user.

### Phase 2: Hubs & Inventory
- `GET /api/hubs`: Authenticated. Restricted to workspace. Role: Any.
- `POST /api/hubs`: Authenticated. Workspace restricted. Role: `ADMIN`, `MUNICIPAL_ADMIN`.

### Phase 3: Collections
- `GET /api/collections`: Authenticated. Workspace restricted. Role: `ADMIN`, `LOCAL_HUB_MANAGER`, `CLEANER`.
- `POST /api/collections`: Authenticated. Workspace restricted. Role: `RESIDENT`, `ADMIN`.

### Phase 4: Transfers
- `GET /api/transfers`: Authenticated. Workspace restricted. Role: `ADMIN`, `LOCAL_HUB_MANAGER`.

### Phase 5: Recycling
- `GET /api/recycling`: Authenticated. Workspace restricted. Role: `ADMIN`, `RECYCLING_MANAGER`.

### Phase 6: GIS & Routing
- `GET /api/routes`: Authenticated. Workspace restricted. Role: `ADMIN`, `LOCAL_HUB_MANAGER`, `DRIVER`.

### Phase 8: QR Verification
- `POST /api/qr/scan`: Authenticated. Workspace restricted. Role: `CLEANER`, `DRIVER`.

### Phase 9: Analytics
- `GET /api/analytics/*`: Authenticated. Workspace restricted. Role: `ADMIN`, `LOCAL_HUB_MANAGER`.

### Phase 10: Incidents
- `GET /api/incidents`: Authenticated. Workspace restricted. Role: Any.
- `POST /api/incidents`: Authenticated. Workspace restricted. Role: Any.

### Phase 11: Workspaces
- `GET /api/workspaces`: Authenticated. Role: `ADMIN`, `MUNICIPAL_ADMIN`.
- `POST /api/workspaces`: Authenticated. Role: `GLOBAL_ADMIN`.

### Phase 12: Data Governance
- `GET /api/system/health`: Authenticated. Workspace restricted. Role: `ADMIN`, `MUNICIPAL_ADMIN`.
- `GET /api/system/integrity`: Authenticated. Workspace restricted. Role: `ADMIN`, `MUNICIPAL_ADMIN`.
- `POST /api/backups`: Authenticated. Workspace restricted. Role: `ADMIN`, `MUNICIPAL_ADMIN`.
- `POST /api/backups/:id/restore`: Authenticated. Workspace restricted. Role: `ADMIN`, `MUNICIPAL_ADMIN`.

## Vulnerability Check
- **Unauthenticated**: Correctly returns `401 Unauthorized` inside `verify_admin_access` and `getAuthenticatedUser` failure handlers.
- **Unauthorized**: Correctly returns `403 Forbidden` inside `has_permission` failure paths.
- **Missing Field Handling**: Most routes do basic string extraction, which returns empty strings gracefully if missing.
- **Sensitive Data**: Passwords are not returned in `/api/me`. JWT tokens (or simplistic token equivalent) are expected in headers.

## Workspace Isolation Analysis
Phase 11 fundamentally enforces that `has_permission` checks the current workspace header. If a user does not have permission in that workspace, they get 403. This successfully protects tenants.
