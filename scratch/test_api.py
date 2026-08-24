import urllib.request
import json
import urllib.error

data = json.dumps({'hubId': 1, 'cleanerId': 101, 'vehicleId': 201}).encode('utf-8')
req = urllib.request.Request('http://localhost:8080/api/routes/plan', data=data, headers={'Content-Type': 'application/json'})

try:
    print(urllib.request.urlopen(req).read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print(f"HTTP Error {e.code}: {e.read().decode('utf-8')}")
