import re

filepath = r"C:\Users\Hp\.gemini\antigravity-ide\scratch\smart-waste-management\src\route_engine.c"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# Add include for qr.h
if '#include "qr.h"' not in content:
    content = content.replace('#include "route_engine.h"', '#include "route_engine.h"\n#include "qr.h"')

# 1. Add Inspection Logic
inspection_funcs = """
int submitVehicleInspection(int vehicleId, int driverId, int routeId, int passed) {
    VehicleInspection ins;
    memset(&ins, 0, sizeof(VehicleInspection));
    ins.vehicleId = vehicleId;
    ins.driverId = driverId;
    ins.routeId = routeId;
    ins.inspectionStatus = passed ? INSPECT_PASS : INSPECT_FAIL;
    getCurrentTimestamp(ins.timestamp, sizeof(ins.timestamp));
    
    FILE *fp = fopen(VEHICLE_INSPECTIONS_FILE, "ab");
    if(fp) {
        fwrite(&ins, sizeof(VehicleInspection), 1, fp);
        fclose(fp);
    }
    
    // Update Route Status if failed
    if(!passed) {
        // Find route and mark it paused or aborted
        Route arr[100];
        int count = getRoutes(arr, 100);
        for(int i=0; i<count; i++) {
            if(arr[i].routeId == routeId) {
                arr[i].status = ROUTE_VEHICLE_BREAKDOWN;
                saveRoutes(arr, count);
                break;
            }
        }
        return 0; // Failed
    }
    
    // Move route to READY if passed
    Route arr[100];
    int count = getRoutes(arr, 100);
    for(int i=0; i<count; i++) {
        if(arr[i].routeId == routeId && arr[i].status == ROUTE_PRE_TRIP_CHECK) {
            arr[i].status = ROUTE_READY;
            saveRoutes(arr, count);
            break;
        }
    }
    return 1;
}

int driverCheckInVehicle(int routeId, int driverId, const char* vehicleQrCode) {
    Route arr[100];
    int count = getRoutes(arr, 100);
    for(int i=0; i<count; i++) {
        if(arr[i].routeId == routeId && arr[i].driverId == driverId) {
            if(arr[i].status != ROUTE_ACCEPTED) return 0; // Must be accepted first
            
            char reason[128] = "";
            if (validateQRCode(vehicleQrCode, routeId, arr[i].vehicleId, driverId, 0, reason) != QR_SUCCESS) {
                logQREvent("VEHICLE", arr[i].vehicleId, driverId, routeId, arr[i].vehicleId, 0, QR_FAILED, reason);
                return 0; // Wrong vehicle
            }
            logQREvent("VEHICLE", arr[i].vehicleId, driverId, routeId, arr[i].vehicleId, 0, QR_SUCCESS, "");
            
            arr[i].status = ROUTE_PRE_TRIP_CHECK;
            saveRoutes(arr, count);
            return 1;
        }
    }
    return 0;
}
"""

if "submitVehicleInspection" not in content:
    content = content.replace("int dispatchRoute", inspection_funcs + "\nint dispatchRoute")

# 2. Modify completeStop for Load Variance
old_complete_stop = """int completeStop(int routeId, int stopId, int actorId, float actualWeightKg) {
    RouteEngineStop stops[100];
    int count = getRouteEngineStops(routeId, stops, 100);
    for(int i=0; i<count; i++) {
        if(stops[i].routeStopId == stopId) {
            if(stops[i].status != STOP_SERVICING) return 0;
            stops[i].status = STOP_COMPLETED;
            stops[i].actualWeightKg = actualWeightKg;
            getCurrentTimestamp(stops[i].serviceCompletedTime, sizeof(stops[i].serviceCompletedTime));
            
            // Mark reference as complete
            if(strcmp(stops[i].stopType, "RESIDENT_COLLECTION") == 0) {
                CollectionRequest req;
                if(getCollectionRequest(stops[i].referenceId, &req)) {
                    req.status = REQ_COMPLETED;
                    req.actualWeightKg = actualWeightKg;
                    updateCollectionRequest(&req);
                }
            }
            saveStops(stops, count);
            logRouteEvent(routeId, actorId, "STOP_COMPLETED", "Stop service completed");
            return 1;
        }
    }
    return 0;
}"""

new_complete_stop = """int completeStop(int routeId, int stopId, int actorId, float actualWeightKg) {
    RouteEngineStop stops[100];
    int count = getRouteEngineStops(routeId, stops, 100);
    for(int i=0; i<count; i++) {
        if(stops[i].routeStopId == stopId) {
            if(stops[i].status != STOP_SERVICING) return 0;
            
            // Calculate Variance
            float estimated = stops[i].estimatedWeightKg;
            if (estimated > 0) {
                float variancePct = (abs(actualWeightKg - estimated) / estimated) * 100.0f;
                if (variancePct > LOAD_VARIANCE_THRESHOLD_PCT) {
                    // Create incident for weight variance
                    char notes[128];
                    snprintf(notes, sizeof(notes), "Weight variance: Est %.2f kg, Actual %.2f kg", estimated, actualWeightKg);
                    createIncident(actorId, WEIGHT_VARIANCE, SEVERITY_MEDIUM, stops[i].referenceId, notes);
                }
            }
            
            // Update Vehicle Load
            Route r_arr[100];
            int r_count = getRoutes(r_arr, 100);
            for(int r=0; r<r_count; r++) {
                if(r_arr[r].routeId == routeId) {
                    Vehicle v;
                    if(getVehicleById(r_arr[r].vehicleId, &v)) {
                        v.currentLoadKg += actualWeightKg;
                        v.availableCapacityKg = v.capacityKg - v.currentLoadKg;
                        if(v.capacityKg > 0) v.utilizationPercentage = (v.currentLoadKg / v.capacityKg) * 100.0f;
                        
                        if(v.currentLoadKg > v.capacityKg) {
                            createIncident(actorId, CAPACITY_EXCEEDED, SEVERITY_HIGH, v.vehicleId, "Vehicle exceeded max capacity");
                        }
                        updateVehicle(&v);
                    }
                    break;
                }
            }

            stops[i].status = STOP_COMPLETED;
            stops[i].actualWeightKg = actualWeightKg;
            getCurrentTimestamp(stops[i].serviceCompletedTime, sizeof(stops[i].serviceCompletedTime));
            
            // Mark reference as complete
            if(strcmp(stops[i].stopType, "RESIDENT_COLLECTION") == 0) {
                CollectionRequest req;
                if(getCollectionRequest(stops[i].referenceId, &req)) {
                    req.status = REQ_COMPLETED;
                    req.actualWeightKg = actualWeightKg;
                    updateCollectionRequest(&req);
                }
            }
            saveStops(stops, count);
            logRouteEvent(routeId, actorId, "STOP_COMPLETED", "Stop service completed");
            return 1;
        }
    }
    return 0;
}"""

if "Calculate Variance" not in content:
    content = content.replace(old_complete_stop, new_complete_stop)

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated route_engine.c successfully")
