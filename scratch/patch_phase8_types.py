import re

# PATCH CONFIG.H
config_path = r"C:\Users\Hp\.gemini\antigravity-ide\scratch\smart-waste-management\include\config.h"
with open(config_path, "r", encoding="utf-8") as f:
    c_config = f.read()

if "VEHICLE_INSPECTIONS_FILE" not in c_config:
    new_macros = """
// Phase 8: Operations Tracking
#define VEHICLE_INSPECTIONS_FILE "data/vehicle_inspections.dat"
#define QR_EVENTS_FILE "data/qr_events.dat"
#define OPERATIONAL_EVENTS_FILE "data/operational_events.dat"
#define VEHICLE_LOADS_FILE "data/vehicle_loads.dat"
"""
    c_config = c_config.replace("#endif", new_macros + "\n#endif")
    with open(config_path, "w", encoding="utf-8") as f:
        f.write(c_config)

# PATCH TYPES.H
types_path = r"C:\Users\Hp\.gemini\antigravity-ide\scratch\smart-waste-management\include\types.h"
with open(types_path, "r", encoding="utf-8") as f:
    c_types = f.read()

if "QREventResult" not in c_types:
    # 1. Update Vehicle struct
    veh_old = """typedef struct {
    int vehicleId;
    char registrationNumber[20];
    char type[30]; // TRUCK, VAN, COMPACTOR
    float capacityKg;
    int isAvailable;
} Vehicle;"""
    veh_new = """typedef struct {
    int vehicleId;
    char registrationNumber[20];
    char type[30]; // TRUCK, VAN, COMPACTOR
    float capacityKg;
    int isAvailable;
    float currentLoadKg;
    float availableCapacityKg;
    float utilizationPercentage;
} Vehicle;"""
    c_types = c_types.replace(veh_old, veh_new)
    
    # 2. Add Phase 8 structs at the end
    phase8_structs = """
// Phase 8: Operations & QR Tracking
typedef enum { INSPECT_PASS, INSPECT_FAIL, INSPECT_REQUIRES_ATTENTION } VehicleInspectionStatus;
typedef enum { QR_SUCCESS, QR_FAILED } QREventResult;

typedef struct {
    int inspectionId;
    int vehicleId;
    int driverId;
    int routeId;
    char inspectionDate[32];
    int brakes;
    int tires;
    int lights;
    int mirrors;
    int horn;
    int hydraulicSystem;
    int bodyCondition;
    int fuelLevel;
    int odometer;
    char remarks[150];
    VehicleInspectionStatus inspectionStatus;
    char timestamp[32];
} VehicleInspection;

typedef struct {
    int eventId;
    char qrType[30];
    int entityId;
    int scannedBy;
    char scanTimestamp[32];
    int routeId;
    int vehicleId;
    int locationId;
    QREventResult result;
    char failureReason[150];
} QREvent;
"""
    c_types = c_types.replace("#endif", phase8_structs + "\n#endif")
    
    # 3. Update RouteStatus enum
    route_status_old = "ROUTE_CANCELLED, ROUTE_FAILED, ROUTE_RESCHEDULED"
    route_status_new = "ROUTE_CANCELLED, ROUTE_FAILED, ROUTE_RESCHEDULED, ROUTE_PRE_TRIP_CHECK, ROUTE_READY, ROUTE_PAUSED, ROUTE_RETURNING, ROUTE_AT_DESTINATION, ROUTE_LOAD_VERIFIED, ROUTE_ABORTED, ROUTE_VEHICLE_BREAKDOWN, ROUTE_DRIVER_UNAVAILABLE, ROUTE_ACCESS_BLOCKED, ROUTE_EMERGENCY"
    c_types = c_types.replace(route_status_old, route_status_new)
    
    # 4. Update IncidentType enum 
    if "MISSED_COLLECTION" not in c_types:
        incident_old = "INCIDENT_SPILLED_WASTE, INCIDENT_BIN_DAMAGED, INCIDENT_LATE_COLLECTION"
        incident_new = "INCIDENT_SPILLED_WASTE, INCIDENT_BIN_DAMAGED, INCIDENT_LATE_COLLECTION, MISSED_COLLECTION, WEIGHT_VARIANCE, VEHICLE_BREAKDOWN, ROUTE_DELAY, WRONG_QR, WRONG_HUB, CAPACITY_EXCEEDED, DRIVER_NO_SHOW, ACCESS_BLOCKED, SAFETY_INSPECTION_FAILED, UNAUTHORIZED_OPERATION"
        c_types = c_types.replace(incident_old, incident_new)

    with open(types_path, "w", encoding="utf-8") as f:
        f.write(c_types)

print("Patched types.h and config.h successfully")
