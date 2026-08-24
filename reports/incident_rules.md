# Municipal Incident & Alert Rules Catalog

This document defines the trigger conditions, severity classifications, automatic operational role assignments, and escalation criteria implemented in Phase 10 of the Smart Waste Management Platform. All alerts and incidents originate strictly from real operational events and persisted records.

---

## 1. Trigger Conditions & Severity Classifications

| Incident Type | Trigger Condition | Severity | Automatic Assignment | Action Required |
| :--- | :--- | :---: | :--- | :--- |
| **`HUB_CAPACITY`** | Hub Utilization $\ge 75\%$ and $< 90\%$ | `MEDIUM` | `LOCAL_HUB_MANAGER` | Monitor intake; plan outbound transfer |
| **`HUB_OVERFLOW`** | Hub Utilization $\ge 90\%$ (or $\ge 100\%$) | `CRITICAL` | `LOCAL_HUB_MANAGER` / `ADMIN` | Immediate outbound transport dispatch |
| **`MISSED_COLLECTION`** | Single collection request missed/overdue | `MEDIUM` | `LOCAL_HUB_MANAGER` | Reschedule or assign replacement cleaner |
| **`MISSED_COLLECTION_REPEAT`**| $\ge 2$ missed collections in same service area | `HIGH` | `LOCAL_HUB_MANAGER` / `ADMIN` | Cleaner workload review and route audit |
| **`WEIGHT_VARIANCE`** | $|Actual - Estimated| / Estimated > 10\%$ and $\le 25\%$ | `LOW` | `LOCAL_HUB_MANAGER` | Scale calibration & cleaner verification |
| **`WEIGHT_VARIANCE_CRITICAL`**| $|Actual - Estimated| / Estimated > 25\%$ | `HIGH` | `LOCAL_HUB_MANAGER` / `ADMIN` | Investigation for leakage or fraud |
| **`VEHICLE_FAILURE`** | Vehicle marked `MAINTENANCE` or `BREAKDOWN` | `HIGH` | `LOCAL_HUB_MANAGER` / `ADMIN` | Fleet maintenance; reassign route |
| **`VEHICLE_INSPECTION_FAILURE`**| Pre-trip safety inspection failed (`INSPECT_FAIL`) | `CRITICAL` | `LOCAL_HUB_MANAGER` / `ADMIN` | Block route start; replace vehicle |
| **`QR_FAILURE`** | 1 failed QR authentication scan | `LOW` | `ADMIN` | Log audit event |
| **`QR_FAILURE_REPEATED`** | $\ge 3$ failed QR scans by same actor within 1 hour | `HIGH` | `ADMIN` | Security audit & credential review |
| **`ROUTE_DELAY`** | Route duration exceeds estimate by $> 30$ mins | `MEDIUM` | `DISPATCH` / `ADMIN` | Check driver status & traffic anomalies |
| **`ROUTE_EXCEPTION`** | Route aborted, blocked, or emergency declared | `CRITICAL` | `DISPATCH` / `ADMIN` | Immediate emergency dispatch protocol |
| **`STOP_DELAY`** | Stop servicing time exceeds 30 minutes | `LOW` | `LOCAL_HUB_MANAGER` | Inaccessible address or resident issue |
| **`TRANSFER_VARIANCE`** | Transfer delivery variance $> 25$ kg | `HIGH` | `LOCAL_HUB_MANAGER` / `RECYCLING_MANAGER` | Investigate transit loss or weighbridge error |
| **`FACILITY_REJECTION`** | Recycling facility rejects inbound transfer | `HIGH` | `RECYCLING_MANAGER` / `LOCAL_HUB_MANAGER` | Quarantine load; determine contamination reason |
| **`FACILITY_QUARANTINE`** | Batch quarantined due to hazard or sorting defect | `HIGH` | `RECYCLING_MANAGER` | Specialized handling or re-sorting |
| **`MASS_BALANCE_EXCEPTION`** | $|Input - (Recovered + Residual + Loss)| > 1.0$ kg | `CRITICAL` | `RECYCLING_MANAGER` / `ADMIN` | Mass balance audit; recalibrate processing line |
| **`SAFETY_INCIDENT`** | Physical safety or hazard incident reported | `CRITICAL` | `ADMIN` | Immediate safety response & formal review |
| **`SYSTEM_EXCEPTION`** | File write failure, OOM, or database anomaly | `CRITICAL` | `ADMIN` | Infrastructure maintenance & restart |

---

## 2. Escalation Rules

Incidents that remain unacknowledged or unresolved are escalated automatically according to operational thresholds:

1. **High Severity Escalation**:
   - If a `HIGH` severity incident remains in `OPEN` or `DETECTED` status for $> 60$ minutes, it is automatically escalated to `ADMIN` and flagged with `ESCALATED` status.
2. **Critical Severity Escalation**:
   - `CRITICAL` incidents immediately notify `ADMIN` and relevant managers upon detection.
   - If a `CRITICAL` incident is unacknowledged after $15$ minutes, an urgent broadcast alert is logged to `data/audit.dat`.
3. **Repeat Incident Escalation**:
   - If the same vehicle suffers $\ge 2$ inspection failures within 7 days, severity escalates to `CRITICAL` (Fleet ground order).
   - If the same Hub crosses $95\%$ capacity twice within 48 hours, outbound transfer priority escalates to `URGENT`.
4. **Audit Requirement**:
   - Every automatic and manual escalation generates an immutable entry in `data/incident_timeline.dat` and `data/audit.dat`.

---

## 3. Deduplication Guards

To prevent alert flooding:
- A new alert is **not generated** if an unresolved alert with the exact same `(type, referenceId)` is already active in `data/alerts.dat`.
- A new incident is **not generated** if an open/investigating incident with the exact same `(type, entityId)` is already active in `data/incidents.dat`.
