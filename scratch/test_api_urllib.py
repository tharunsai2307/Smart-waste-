import urllib.request
import urllib.error
import json

BASE_URL = "http://localhost:8080"

def test_endpoint(name, method, url, data=None):
    try:
        req = urllib.request.Request(BASE_URL + url, method=method)
        if data:
            req.data = json.dumps(data).encode('utf-8')
            req.add_header('Content-Type', 'application/json')
        
        with urllib.request.urlopen(req) as response:
            print(f"[{name}] {method} {url} - Status: {response.status}")
    except urllib.error.HTTPError as e:
        print(f"[{name}] {method} {url} - Status: {e.code}")
    except Exception as e:
        print(f"[{name}] {method} {url} - ERROR: {e}")

test_endpoint("Health", "GET", "/api/health")
test_endpoint("Staff Login", "POST", "/api/auth/login", {"username":"admin", "password":"password"})
test_endpoint("Get Hubs", "GET", "/api/hubs")
test_endpoint("My Hub", "GET", "/api/hubs/my-hub?managerId=2")
test_endpoint("Hub Transactions", "GET", "/api/hubs/transactions?hubId=1")
test_endpoint("Get Collections", "GET", "/api/collections/all")
test_endpoint("Collection Resident", "GET", "/api/collections/resident?residentId=1")
test_endpoint("Collection Cleaner", "GET", "/api/collections/cleaner?cleanerId=1")
test_endpoint("Collection Assign", "POST", "/api/collections/assign")
test_endpoint("Get Transfers", "GET", "/api/transfers")
test_endpoint("Get Facilities", "GET", "/api/recycling/facilities")
test_endpoint("Get Batches", "GET", "/api/recycling/batches")
test_endpoint("Get Incidents", "GET", "/api/incidents")

print("API tests completed.")
