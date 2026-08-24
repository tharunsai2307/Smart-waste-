import re

filepath = r"C:\Users\Hp\.gemini\antigravity-ide\scratch\smart-waste-management\include\types.h"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

replacement = """
// Phase 7: Intelligent Route
typedef enum {
    ROUTE_PLANNED, ROUTE_ASSIGNED, ROUTE_ACCEPTED, ROUTE_EN_ROUTE,
    ROUTE_ARRIVED, ROUTE_COLLECTING, ROUTE_COMPLETED, ROUTE_DECLINED,
    ROUTE_CANCELLED, ROUTE_FAILED, ROUTE_RESCHEDULED
} RouteStatus;

typedef enum {
    STOP_PLANNED, STOP_EN_ROUTE, STOP_ARRIVED, STOP_SERVICING,
    STOP_COMPLETED, STOP_SKIPPED, STOP_FAILED, STOP_RESCHEDULED
} StopStatus;

typedef struct {
    int routeId;
    char routeType[30];
    int driverId;
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
    int referenceId;
    char stopType[30];
    int priority;
    float estimatedWeightKg;
    float actualWeightKg;
    char arrivalTime[30];
    char serviceStartTime[30];
    char serviceCompletedTime[30];
    StopStatus status;
    char notes[150];
} RouteEngineStop;

typedef struct {
    int eventId;
    int routeId;
    int actorId;
    char timestamp[32];
    double latitude;
    double longitude;
    char eventType[30];
    char notes[150];
} RouteEvent;

"""
content = content.replace("#endif", replacement + "\n#endif")
with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated types.h")
