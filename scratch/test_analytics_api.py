import urllib.request
import urllib.error
import json

base = "http://127.0.0.1:8080"

endpoints = [
    ("/api/health", "GET"),
    ("/api/analytics/summary", "GET"),
    ("/api/analytics/collections", "GET"),
    ("/api/analytics/hubs", "GET"),
    ("/api/analytics/fleet", "GET"),
    ("/api/analytics/routes", "GET"),
    ("/api/analytics/recycling", "GET"),
    ("/api/analytics/waste-types", "GET"),
    ("/api/analytics/incidents", "GET"),
    ("/api/analytics/qr", "GET"),
    ("/api/analytics/drivers", "GET"),
    ("/api/analytics/cleaners", "GET"),
    ("/api/analytics/facilities", "GET"),
    ("/api/analytics/trends", "GET"),
    ("/api/analytics/live-feed", "GET"),
    ("/api/reports/export?type=collection", "GET"),
    ("/api/reports/export?type=hub", "GET"),
    ("/api/reports/export?type=fleet", "GET"),
    ("/api/reports/export?type=recycling", "GET"),
]

print("Testing Phase 9 Analytics & Reports REST API...")
all_passed = True

for path, method in endpoints:
    url = base + path
    req = urllib.request.Request(url, method=method)
    try:
        resp = urllib.request.urlopen(req, timeout=3)
        status = resp.status
        body = resp.read().decode('utf-8')
        print(f"[OK] {method} {path} -> {status} (Length: {len(body)} bytes)")
        if "export" not in path:
            data = json.loads(body)
            assert data is not None
        else:
            assert "\n" in body
    except Exception as e:
        print(f"[FAIL] {method} {path} -> Error: {e}")
        all_passed = False

if all_passed:
    print("\nALL PHASE 9 REST API ENDPOINTS VALIDATED SUCCESSFULLY!")
else:
    print("\nSOME ENDPOINTS FAILED.")
