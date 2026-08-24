# Incident Lifecycle State Machine

This document formalizes the incident lifecycle states, valid state transitions, transition guards, and required side-effects implemented in Phase 10.

---

## 1. State Transition Diagram

```text
       [Operational Exception Detected]
                      │
                      ▼
                 ┌──────────┐
                 │ DETECTED │
                 └────┬─────┘
                      │ Auto-created / Logged
                      ▼
                 ┌──────────┐
                 │   OPEN   │◄─────────────────────────────┐
                 └────┬─────┘                              │
                      │ Acknowledge                        │
                      ▼                                    │
               ┌──────────────┐                            │
               │ ACKNOWLEDGED │                            │
               └──────┬───────┘                            │
                      │ Assign to User / Role              │
                      ▼                                    │ Reopen
                 ┌──────────┐                              │ (Requires Note)
                 │ ASSIGNED │                              │
                 └────┬─────┘                              │
                      │ Start Investigation                │
                      ▼                                    │
              ┌───────────────┐                            │
              │ INVESTIGATING │                            │
              └───────┬───────┘                            │
                      │ Action Taken / Requested           │
                      ▼                                    │
             ┌─────────────────┐                           │
             │ ACTION_REQUIRED │                           │
             └────────┬────────┘                           │
                      │ Resolve (Resolution Note)          │
                      ▼                                    │
                ┌──────────┐                               │
                │ RESOLVED │                               │
                └─────┬────┘                               │
                      │ Close & Audit                      │
                      ▼                                    │
                 ┌──────────┐                              │
                 │  CLOSED  │──────────────────────────────┘
                 └──────────┘

Exceptions / Early Termination:
- DETECTED / OPEN ──► REJECTED (False positive / duplicate)
- OPEN / ASSIGNED ──► CANCELLED (Condition cleared organically)
```

---

## 2. Transition Matrix & RBAC Guards

| Current Status | Target Status | Allowed Actions | Required Permissions | Mandatory Parameters |
| :--- | :--- | :--- | :--- | :--- |
| `DETECTED` | `OPEN` | Auto-promoted / Logged | System / Admin | Trigger details, severity |
| `OPEN` | `ACKNOWLEDGED` | `POST /api/incidents/{id}/acknowledge` | Admin, Assigned Mgr, Driver, Cleaner | `actorId`, `note` |
| `OPEN` / `ACKNOWLEDGED` | `ASSIGNED` | `POST /api/incidents/{id}/assign` | Admin, Local Hub Mgr, Recycling Mgr | `assignToUserId`, `role`, `note` |
| `ASSIGNED` | `INVESTIGATING` | `POST /api/incidents/{id}/investigate` | Admin, Assigned User | `note` |
| `INVESTIGATING` | `ACTION_REQUIRED` | `POST /api/incidents/{id}/action` | Admin, Assigned User | `actionTaken`, `note` |
| `ACTION_REQUIRED` / `INVESTIGATING` | `RESOLVED` | `POST /api/incidents/{id}/resolve` | Admin, Assigned Mgr, Assigned User | `resolutionNote` (min 5 chars) |
| `RESOLVED` | `CLOSED` | `POST /api/incidents/{id}/close` | Admin, Responsible Manager | `closingNote` |
| `CLOSED` | `OPEN` / `REOPENED` | `POST /api/incidents/{id}/reopen` | Admin | `reopenReason` |
| `OPEN` / `DETECTED` | `REJECTED` | `POST /api/incidents/{id}/reject` | Admin, Responsible Manager | `rejectionReason` |
| `ANY_ACTIVE` | `CANCELLED` | `POST /api/incidents/{id}/cancel` | Admin, Responsible Manager | `cancellationReason` |

---

## 3. Transition Side-Effects & Auditing

Whenever any state transition occurs:
1. The incident's `status` field is updated in `data/incidents.dat`.
2. If moving to `RESOLVED`, `resolvedAt` timestamp is recorded.
3. If moving to `CLOSED`, `closedAt` timestamp is recorded.
4. An immutable `IncidentTimelineEntry` is appended to `data/incident_timeline.dat` containing:
   - `incidentId`, `timestamp`, `actorId`, `actorRole`, `action`, `previousStatus`, `newStatus`, `comment`, `evidenceRef`.
5. An audit record is created in `data/audit.dat` with action string `INCIDENT_STATUS_CHANGE`.
