import re

# Update types.h
types_path = r"C:\Users\Hp\.gemini\antigravity-ide\scratch\smart-waste-management\include\types.h"

with open(types_path, "r", encoding="utf-8") as f:
    content = f.read()

new_structs = """
// Phase 6: GIS & Location Intelligence
typedef enum {
    LOCATION_RESIDENT,
    LOCATION_LOCAL_HUB,
    LOCATION_RECYCLING_FACILITY,
    LOCATION_DEPOT,
    LOCATION_VEHICLE,
    LOCATION_COLLECTION_POINT,
    LOCATION_SERVICE_AREA
} LocationType;

typedef struct {
    int locationId;
    LocationType type;
    int referenceId; // e.g. residentId, hubId, vehicleId

    double latitude;
    double longitude;

    char address[256];
    char area[100];
    char city[100];
    char postalCode[20];

    int verified;
    int active;

    char createdAt[32];
    char updatedAt[32];
} GeoLocation;

typedef struct {
    int areaId;
    char name[100];
    char city[100];
    char postalCodes[200];
    int assignedHubId;
    int activeCleaners;
    float collectionCapacityKg;
    int active;
} ServiceArea;

typedef struct {
    int vehicleId;
    int driverId;
    double latitude;
    double longitude;
    char timestamp[32];
    float accuracy;
    char source[30]; // MANUAL, GPS_API, MOBILE_DEVICE
} VehicleLocation;

typedef struct {
    int routeId;
    char routeCode[30];
    int driverId;
    int vehicleId;
    double startLat;
    double startLon;
    double endLat;
    double endLon;
    float estimatedDistanceKm;
    float estimatedDurationMin;
    char status[20]; // PENDING, IN_PROGRESS, COMPLETED, CANCELLED
    char createdAt[32];
} RouteRequest;

typedef struct {
    int stopId;
    int routeId;
    int stopOrder;
    char stopType[30]; // COLLECTION, DEPOSIT, TRANSFER
    int referenceId;   // collectionId, hubId, etc.
    double latitude;
    double longitude;
    char expectedTime[30];
    char status[20];
} RouteStop;
"""

if "GeoLocation" not in content:
    content = content.replace("#endif", new_structs + "\n#endif")
    with open(types_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Updated types.h")
else:
    print("GeoLocation already in types.h")


# Update config.h
config_path = r"C:\Users\Hp\.gemini\antigravity-ide\scratch\smart-waste-management\include\config.h"

with open(config_path, "r", encoding="utf-8") as f:
    content = f.read()

new_configs = """
#define LOCATIONS_FILE "data/locations.dat"
#define SERVICE_AREAS_FILE "data/service_areas.dat"
#define VEHICLE_LOCATIONS_FILE "data/vehicle_locations.dat"
#define ROUTES_FILE "data/routes.dat"
#define ROUTE_STOPS_FILE "data/route_stops.dat"
"""

if "LOCATIONS_FILE" not in content:
    content = content.replace("#endif", new_configs + "\n#endif")
    with open(config_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Updated config.h")
else:
    print("LOCATIONS_FILE already in config.h")
