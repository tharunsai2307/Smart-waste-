import re

types_path = r"C:\Users\Hp\.gemini\antigravity-ide\scratch\smart-waste-management\include\types.h"

with open(types_path, "r", encoding="utf-8") as f:
    content = f.read()

# Add enums
enums_to_add = """
typedef enum {
    ROUTE_PLANNED,
    ROUTE_ASSIGNED,
    ROUTE_ACCEPTED,
    ROUTE_EN_ROUTE,
    ROUTE_ARRIVED,
    ROUTE_COLLECTING,
    ROUTE_COMPLETED,
    ROUTE_DECLINED,
    ROUTE_CANCELLED,
    ROUTE_FAILED,
    ROUTE_RESCHEDULED
} RouteStatus;

typedef enum {
    STOP_PLANNED,
    STOP_EN_ROUTE,
    STOP_ARRIVED,
    STOP_SERVICING,
    STOP_COMPLETED,
    STOP_SKIPPED,
    STOP_FAILED,
    STOP_RESCHEDULED
} StopStatus;
"""

if "RouteStatus" not in content:
    content = content.replace("typedef enum {\n    LOCATION_RESIDENT,", enums_to_add + "\ntypedef enum {\n    LOCATION_RESIDENT,")

# Replace RoutePlan, RouteRequest, and RouteStop
# Delete RoutePlan
content = re.sub(r"// Phase 6: Route Plan.*?typedef struct \{.*?\} RoutePlan;\n", "", content, flags=re.DOTALL)
# Replace RouteRequest and RouteStop
replacement_structs = """
// Phase 7: Intelligent Route
typedef struct {
    int routeId;
    char routeType[30]; // COLLECTION, TRANSFER
    int driverId;       // or cleanerId
    int vehicleId;
    int originId;
    int destinationId;
    float totalDistanceKm;
    float estimatedDurationMinutes;
    float totalPlannedLoadKg;
    float vehicleCapacityKg;
    float utilizationPercentage;
    RouteStatus status;
    char createdAt[32];
    char updatedAt[32];
} Route;

typedef struct {
    int routeStopId;
    int routeId;
    int sequenceNumber;
    int locationId;
    int referenceId; // collectionId / transferId
    char stopType[30]; // RESIDENT_COLLECTION, LOCAL_HUB, RECYCLING_FACILITY, TRANSFER_POINT
    int priority;
    float estimatedWeightKg;
    float actualWeightKg;
    char arrivalTime[30];
    char serviceStartTime[30];
    char serviceCompletedTime[30];
    StopStatus status;
    char notes[150];
} RouteStop;

typedef struct {
    int eventId;
    int routeId;
    int actorId;
    char timestamp[32];
    double latitude;
    double longitude;
    char eventType[30]; // ROUTE_STARTED, STOP_ARRIVED, etc.
    char notes[150];
} RouteEvent;
"""

content = re.sub(r"typedef struct \{.*?\} RouteRequest;\n\ntypedef struct \{.*?\} RouteStop;", replacement_structs, content, flags=re.DOTALL)

with open(types_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated types.h")
