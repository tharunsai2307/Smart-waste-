import urllib.request
import json
import urllib.error

def req(url, method='GET', data=None):
    if data:
        data = json.dumps(data).encode('utf-8')
    r = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'}, method=method)
    try:
        return json.loads(urllib.request.urlopen(r).read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        print(f"HTTP Error {e.code}: {e.read().decode('utf-8')}")
        return None

print("Resetting demo data...")
req('http://localhost:8080/api/demo/reset', method='POST')

print("Fetching Hubs...")
hubs = req('http://localhost:8080/api/locations')
hubId = hubs[0]['id'] if hubs else 1

print(f"Planning route for hubId {hubId}...")
res = req('http://localhost:8080/api/routes/plan', method='POST', data={'hubId': hubId, 'cleanerId': 3, 'vehicleId': 1})
print(res)

if res and 'routeId' in res:
    routeId = res['routeId']
    print("Dispatching Route...")
    req(f'http://localhost:8080/api/routes/{routeId}/assign', method='POST')
    
    print("Accepting Route...")
    req(f'http://localhost:8080/api/routes/{routeId}/accept', method='POST')
    
    print("Starting Route...")
    req(f'http://localhost:8080/api/routes/{routeId}/start', method='POST')
    
    print("Getting Route Stops...")
    stops = req(f'http://localhost:8080/api/routes/{routeId}/stops')
    print(stops)
    
    if stops:
        stopId = stops[0]['stopId']
        print("Arriving at Stop...")
        req(f'http://localhost:8080/api/routes/{routeId}/stops/{stopId}/arrive', method='POST')
        
        print("Completing Stop...")
        req(f'http://localhost:8080/api/routes/{routeId}/stops/{stopId}/complete', method='POST', data={'actualWeightKg': 12.5})
