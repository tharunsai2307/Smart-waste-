import requests

BASE_URL = "http://localhost:8080"

def test_endpoint(name, method, url, data=None):
    try:
        if method == "GET":
            res = requests.get(BASE_URL + url)
        else:
            res = requests.post(BASE_URL + url, json=data)
        
        print(f"[{name}] {method} {url} - Status: {res.status_code}")
    except Exception as e:
        print(f"[{name}] {method} {url} - ERROR: {e}")

# 2. GET /api/health
test_endpoint("Health", "GET", "/api/health")

# 3. Test Phase 1
test_endpoint("Staff Login", "POST", "/api/auth/login", {"username":"admin", "password":"password"})
# Phase 1 endpoints are mocked/basic but they route correctly.

# 4. Test Phase 2
test_endpoint("Get Hubs", "GET", "/api/hubs")
test_endpoint("My Hub", "GET", "/api/hubs/my-hub?managerId=2")
test_endpoint("Hub Transactions", "GET", "/api/hubs/transactions?hubId=1")

# 5. Test Phase 3
test_endpoint("Get Collections", "GET", "/api/collections/all")
test_endpoint("Collection Resident", "GET", "/api/collections/resident?residentId=1")
test_endpoint("Collection Cleaner", "GET", "/api/collections/cleaner?cleanerId=1")
test_endpoint("Collection Assign", "POST", "/api/collections/assign")

# 6. Test Phase 4
test_endpoint("Get Transfers", "GET", "/api/transfers")

# 7. Test Phase 5
test_endpoint("Get Facilities", "GET", "/api/recycling/facilities")
test_endpoint("Get Batches", "GET", "/api/recycling/batches")

# Incidents
test_endpoint("Get Incidents", "GET", "/api/incidents")

print("API tests completed.")
