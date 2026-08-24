import re

filepath = r"C:\Users\Hp\.gemini\antigravity-ide\scratch\smart-waste-management\src\route_engine.c"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

submit_old = """int submitVehicleInspection(int vehicleId, int driverId, int routeId, int passed) {
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
}"""

submit_new = """int submitVehicleInspection(int vehicleId, int driverId, int routeId, int passed) {
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
    
    if(!passed) {
        for(int i=0; i<numRoutes; i++) {
            if(routes[i].routeId == routeId) {
                routes[i].status = ROUTE_VEHICLE_BREAKDOWN;
                saveRoutes();
                break;
            }
        }
        return 0; 
    }
    
    for(int i=0; i<numRoutes; i++) {
        if(routes[i].routeId == routeId && routes[i].status == ROUTE_PRE_TRIP_CHECK) {
            routes[i].status = ROUTE_READY;
            saveRoutes();
            break;
        }
    }
    return 1;
}"""
content = content.replace(submit_old, submit_new)


checkin_old = """int driverCheckInVehicle(int routeId, int driverId, const char* vehicleQrCode) {
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
}"""

checkin_new = """int driverCheckInVehicle(int routeId, int driverId, const char* vehicleQrCode) {
    for(int i=0; i<numRoutes; i++) {
        if(routes[i].routeId == routeId && routes[i].driverId == driverId) {
            if(routes[i].status != ROUTE_ACCEPTED) return 0;
            
            char reason[128] = "";
            if (validateQRCode(vehicleQrCode, routeId, routes[i].vehicleId, driverId, 0, reason) != QR_SUCCESS) {
                logQREvent("VEHICLE", routes[i].vehicleId, driverId, routeId, routes[i].vehicleId, 0, QR_FAILED, reason);
                return 0; 
            }
            logQREvent("VEHICLE", routes[i].vehicleId, driverId, routeId, routes[i].vehicleId, 0, QR_SUCCESS, "");
            
            routes[i].status = ROUTE_PRE_TRIP_CHECK;
            saveRoutes();
            return 1;
        }
    }
    return 0;
}"""
content = content.replace(checkin_old, checkin_new)

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)
print("Patched route_engine.c to use saveRoutes() properly")
