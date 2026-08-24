import urllib.request
import urllib.error
import json
import time

base = "http://127.0.0.1:8080"

def req(path, method="GET", body=None, headers=None):
    url = base + path
    h = headers or {}
    data = json.dumps(body).encode('utf-8') if body else None
    if body:
        h["Content-Type"] = "application/json"
    r = urllib.request.Request(url, data=data, headers=h, method=method)
    with urllib.request.urlopen(r, timeout=5) as response:
        status = response.status
        content = response.read().decode('utf-8')
        return status, json.loads(content) if content.strip().startswith(('{', '[')) else content

print("Testing Phase 10 Incident Response REST API...")

# 1. Create Incident
status, res = req("/api/incidents", "POST", {
    "type": "HUB_OVERFLOW",
    "severity": "CRITICAL",
    "entityType": "HUB",
    "entityId": 99,
    "hubId": 99,
    "description": "Live REST API test overflow event",
    "assignedRole": "LOCAL_HUB_MANAGER"
})
assert status == 201, f"Expected 201, got {status}: {res}"
incId = res["incidentId"]
print(f"[OK] POST /api/incidents -> Created INC-{incId}")

# 2. Get Incident Detail
status, inc = req(f"/api/incidents/{incId}", "GET")
assert status == 200 and inc["incidentId"] == incId
print(f"[OK] GET /api/incidents/{incId} -> Status: {inc['status']}, Severity: {inc['severity']}")

# 3. Acknowledge Incident
status, res = req(f"/api/incidents/{incId}/acknowledge", "POST", {
    "actorId": 2,
    "actorRole": "LOCAL_HUB_MANAGER",
    "note": "Hub Manager acknowledged on scene"
})
assert status == 200
print(f"[OK] POST /api/incidents/{incId}/acknowledge")

# 4. Assign Incident
status, res = req(f"/api/incidents/{incId}/assign", "POST", {
    "actorId": 1,
    "actorRole": "ADMIN",
    "assignToUserId": 7,
    "targetRole": "DRIVER",
    "note": "Assigned driver 7 for waste transfer"
})
assert status == 200
print(f"[OK] POST /api/incidents/{incId}/assign")

# 5. Investigate Incident
status, res = req(f"/api/incidents/{incId}/investigate", "POST", {
    "actorId": 7,
    "actorRole": "DRIVER",
    "note": "Driver en route"
})
assert status == 200
print(f"[OK] POST /api/incidents/{incId}/investigate")

# 6. Action Taken
status, res = req(f"/api/incidents/{incId}/action", "POST", {
    "actorId": 7,
    "actorRole": "DRIVER",
    "actionTaken": "Dispatched emergency collection vehicle",
    "note": "Loaded waste"
})
assert status == 200
print(f"[OK] POST /api/incidents/{incId}/action")

# 7. Add Comment
status, res = req(f"/api/incidents/{incId}/comments", "POST", {
    "actorId": 2,
    "actorRole": "LOCAL_HUB_MANAGER",
    "comment": "Inventory load reduced to safe limit"
})
assert status == 201
print(f"[OK] POST /api/incidents/{incId}/comments")

# 8. Resolve Incident
status, res = req(f"/api/incidents/{incId}/resolve", "POST", {
    "actorId": 2,
    "actorRole": "LOCAL_HUB_MANAGER",
    "note": "Hub operational levels normal"
})
assert status == 200
print(f"[OK] POST /api/incidents/{incId}/resolve")

# 9. Close Incident
status, res = req(f"/api/incidents/{incId}/close", "POST", {
    "actorId": 1,
    "actorRole": "ADMIN",
    "note": "Verified by central dispatch"
})
assert status == 200
print(f"[OK] POST /api/incidents/{incId}/close")

# 10. Check Timeline
status, timeline = req(f"/api/incidents/{incId}/timeline", "GET")
assert status == 200 and len(timeline) >= 6
print(f"[OK] GET /api/incidents/{incId}/timeline -> {len(timeline)} events recorded")

# 11. Notification Preferences
status, prefs = req("/api/notifications/preferences?userId=1", "GET")
assert status == 200 and prefs["userId"] == 1
print(f"[OK] GET /api/notifications/preferences -> {prefs}")

status, res = req("/api/notifications/preferences", "POST", {
    "userId": 1,
    "criticalAlerts": 1,
    "highSeverityAlerts": 1,
    "assignedIncidentsOnly": 1,
    "hubAlerts": 1,
    "vehicleAlerts": 0,
    "collectionExceptions": 1,
    "recyclingExceptions": 1
})
assert status == 200
print(f"[OK] POST /api/notifications/preferences -> Saved")

print("\nALL PHASE 10 REST API ENDPOINTS VALIDATED SUCCESSFULLY!")
