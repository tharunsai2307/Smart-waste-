with open(r"C:\Users\Hp\.gemini\antigravity-ide\scratch\smart-waste-management\src\route_engine.c", "a", encoding="utf-8") as f:
    f.write("""

// Helper to calculate score for sorting
static float calculateCollectionScore(CollectionRequest* req, double currentLat, double currentLon) {
    float distance = calculateDistanceKm(currentLat, currentLon, req->latitude, req->longitude);
    float score = req->priorityScore * 100.0f; // prioritize high priority
    // closer is better -> subtract distance
    score -= (distance * 10.0f);
    return score;
}

int planCollectionRoute(int hubId, int cleanerId, int vehicleId) {
    if(numRoutes >= MAX_ROUTES) return -1;
    
    Vehicle v;
    if(!getVehicleById(vehicleId, &v)) return -1;
    if(v.status != VEHICLE_AVAILABLE) return -1;
    
    LocalHub h;
    if(!getHubById(hubId, &h)) return -1;
    
    if(isCleanerAssigned(cleanerId)) return -1;
    if(isVehicleAssigned(vehicleId)) return -1;
    
    CollectionRequest allReqs[1000];
    int reqCount = getAllCollections(allReqs, 1000);
    
    // Sort by priority and distance
    // In C, a simple selection sort is fine for a few hundred requests
    for(int i=0; i<reqCount-1; i++) {
        for(int j=i+1; j<reqCount; j++) {
            float s1 = calculateCollectionScore(&allReqs[i], h.latitude, h.longitude);
            float s2 = calculateCollectionScore(&allReqs[j], h.latitude, h.longitude);
            if(s2 > s1) {
                CollectionRequest temp = allReqs[i];
                allReqs[i] = allReqs[j];
                allReqs[j] = temp;
            }
        }
    }
    
    Route r = {0};
    r.routeId = (numRoutes > 0) ? routes[numRoutes-1].routeId + 1 : 1;
    strcpy(r.routeType, "COLLECTION");
    r.driverId = cleanerId;
    r.vehicleId = vehicleId;
    r.originId = hubId;
    r.destinationId = hubId; // Returns to hub
    r.vehicleCapacityKg = v.capacityKg;
    r.status = ROUTE_PLANNED;
    getCurrentTimestamp(r.createdAt);
    getCurrentTimestamp(r.updatedAt);
    
    double currentLat = h.latitude;
    double currentLon = h.longitude;
    int seq = 1;
    
    // Origin stop (Hub)
    if(numStops >= MAX_STOPS) return -1;
    RouteStop originStop = {0};
    originStop.routeStopId = (numStops > 0) ? stops[numStops-1].routeStopId + 1 : 1;
    originStop.routeId = r.routeId;
    originStop.sequenceNumber = seq++;
    originStop.referenceId = hubId;
    strcpy(originStop.stopType, "LOCAL_HUB");
    originStop.status = STOP_PLANNED;
    stops[numStops++] = originStop;
    
    // Collection stops
    for(int i=0; i<reqCount; i++) {
        if(allReqs[i].status == COLLECTION_REQUESTED && allReqs[i].hubId == hubId) {
            if(r.totalPlannedLoadKg + allReqs[i].estimatedWeightKg <= r.vehicleCapacityKg) {
                
                float dist = calculateDistanceKm(currentLat, currentLon, allReqs[i].latitude, allReqs[i].longitude);
                r.totalDistanceKm += dist;
                r.totalPlannedLoadKg += allReqs[i].estimatedWeightKg;
                currentLat = allReqs[i].latitude;
                currentLon = allReqs[i].longitude;
                
                if(numStops >= MAX_STOPS) break;
                RouteStop st = {0};
                st.routeStopId = stops[numStops-1].routeStopId + 1;
                st.routeId = r.routeId;
                st.sequenceNumber = seq++;
                st.referenceId = allReqs[i].collectionId;
                strcpy(st.stopType, "RESIDENT_COLLECTION");
                st.priority = allReqs[i].priorityScore;
                st.estimatedWeightKg = allReqs[i].estimatedWeightKg;
                st.status = STOP_PLANNED;
                stops[numStops++] = st;
                
                // Assign cleaner to collection locally in collection request
                // In a real system we'd update the collection status
            }
        }
    }
    
    // If no collections matched, cancel
    if(seq == 2) return -1;
    
    // Destination stop (Return to Hub)
    if(numStops >= MAX_STOPS) return -1;
    float retDist = calculateDistanceKm(currentLat, currentLon, h.latitude, h.longitude);
    r.totalDistanceKm += retDist;
    RouteStop destStop = {0};
    destStop.routeStopId = stops[numStops-1].routeStopId + 1;
    destStop.routeId = r.routeId;
    destStop.sequenceNumber = seq++;
    destStop.referenceId = hubId;
    strcpy(destStop.stopType, "LOCAL_HUB");
    destStop.status = STOP_PLANNED;
    stops[numStops++] = destStop;
    
    r.utilizationPercentage = (r.totalPlannedLoadKg / r.vehicleCapacityKg) * 100.0f;
    r.estimatedDurationMinutes = r.totalDistanceKm * 3.0f + (seq * 5.0f);
    
    routes[numRoutes++] = r;
    saveRoutes();
    saveStops();
    
    recordRouteEvent(r.routeId, cleanerId, "ROUTE_PLANNED", "Collection route auto-generated");
    
    return r.routeId;
}

int planTransferRoute(int hubId, int facilityId, int driverId, int vehicleId) {
    if(numRoutes >= MAX_ROUTES) return -1;
    
    Vehicle v;
    if(!getVehicleById(vehicleId, &v)) return -1;
    if(v.status != VEHICLE_AVAILABLE) return -1;
    
    LocalHub h;
    if(!getHubById(hubId, &h)) return -1;
    
    if(isDriverAssigned(driverId)) return -1;
    if(isVehicleAssigned(vehicleId)) return -1;
    
    Route r = {0};
    r.routeId = (numRoutes > 0) ? routes[numRoutes-1].routeId + 1 : 1;
    strcpy(r.routeType, "TRANSFER");
    r.driverId = driverId;
    r.vehicleId = vehicleId;
    r.originId = hubId;
    r.destinationId = facilityId;
    r.vehicleCapacityKg = v.capacityKg;
    r.status = ROUTE_PLANNED;
    getCurrentTimestamp(r.createdAt);
    getCurrentTimestamp(r.updatedAt);
    
    // Two stops: origin hub and dest facility
    if(numStops + 1 >= MAX_STOPS) return -1;
    RouteStop originStop = {0};
    originStop.routeStopId = (numStops > 0) ? stops[numStops-1].routeStopId + 1 : 1;
    originStop.routeId = r.routeId;
    originStop.sequenceNumber = 1;
    originStop.referenceId = hubId;
    strcpy(originStop.stopType, "LOCAL_HUB");
    originStop.status = STOP_PLANNED;
    stops[numStops++] = originStop;
    
    RouteStop destStop = {0};
    destStop.routeStopId = stops[numStops-1].routeStopId + 1;
    destStop.routeId = r.routeId;
    destStop.sequenceNumber = 2;
    destStop.referenceId = facilityId;
    strcpy(destStop.stopType, "RECYCLING_FACILITY");
    destStop.status = STOP_PLANNED;
    stops[numStops++] = destStop;
    
    routes[numRoutes++] = r;
    saveRoutes();
    saveStops();
    
    recordRouteEvent(r.routeId, driverId, "ROUTE_PLANNED", "Transfer route planned");
    return r.routeId;
}

int dispatchRoute(int routeId, int actorId) {
    for(int i=0; i<numRoutes; i++) {
        if(routes[i].routeId == routeId && routes[i].status == ROUTE_PLANNED) {
            routes[i].status = ROUTE_ASSIGNED;
            getCurrentTimestamp(routes[i].updatedAt);
            saveRoutes();
            recordRouteEvent(routeId, actorId, "ROUTE_ASSIGNED", "Route dispatched to driver");
            return 1;
        }
    }
    return 0;
}

int driverAcceptRoute(int routeId, int driverId) {
    for(int i=0; i<numRoutes; i++) {
        if(routes[i].routeId == routeId && routes[i].driverId == driverId && routes[i].status == ROUTE_ASSIGNED) {
            routes[i].status = ROUTE_ACCEPTED;
            getCurrentTimestamp(routes[i].updatedAt);
            saveRoutes();
            recordRouteEvent(routeId, driverId, "ROUTE_ACCEPTED", "Driver accepted route");
            return 1;
        }
    }
    return 0;
}

int startRoute(int routeId, int actorId) {
    for(int i=0; i<numRoutes; i++) {
        if(routes[i].routeId == routeId && routes[i].driverId == actorId && 
           (routes[i].status == ROUTE_ACCEPTED || routes[i].status == ROUTE_ASSIGNED)) {
            routes[i].status = ROUTE_EN_ROUTE;
            getCurrentTimestamp(routes[i].updatedAt);
            saveRoutes();
            recordRouteEvent(routeId, actorId, "ROUTE_STARTED", "Route has started");
            return 1;
        }
    }
    return 0;
}

int arriveAtStop(int routeId, int stopId, int actorId) {
    for(int i=0; i<numStops; i++) {
        if(stops[i].routeId == routeId && stops[i].routeStopId == stopId) {
            stops[i].status = STOP_ARRIVED;
            getCurrentTimestamp(stops[i].arrivalTime);
            saveStops();
            recordRouteEvent(routeId, actorId, "STOP_ARRIVED", "Arrived at stop");
            return 1;
        }
    }
    return 0;
}

int completeStop(int routeId, int stopId, int actorId, float actualWeightKg) {
    for(int i=0; i<numStops; i++) {
        if(stops[i].routeId == routeId && stops[i].routeStopId == stopId && stops[i].status == STOP_ARRIVED) {
            stops[i].status = STOP_COMPLETED;
            stops[i].actualWeightKg = actualWeightKg;
            getCurrentTimestamp(stops[i].serviceCompletedTime);
            saveStops();
            char notes[100];
            snprintf(notes, sizeof(notes), "Completed stop. Weight: %.2f kg", actualWeightKg);
            recordRouteEvent(routeId, actorId, "STOP_COMPLETED", notes);
            return 1;
        }
    }
    return 0;
}

int completeRoute(int routeId, int actorId) {
    for(int i=0; i<numRoutes; i++) {
        if(routes[i].routeId == routeId && routes[i].status == ROUTE_EN_ROUTE) {
            // Check if all stops are completed
            int allCompleted = 1;
            for(int j=0; j<numStops; j++) {
                if(stops[j].routeId == routeId && stops[j].status != STOP_COMPLETED && stops[j].status != STOP_SKIPPED) {
                    allCompleted = 0;
                    break;
                }
            }
            if(!allCompleted) return 0; // cannot complete if stops are pending
            
            routes[i].status = ROUTE_COMPLETED;
            getCurrentTimestamp(routes[i].updatedAt);
            saveRoutes();
            recordRouteEvent(routeId, actorId, "ROUTE_COMPLETED", "Route successfully completed");
            return 1;
        }
    }
    return 0;
}

int cancelRoute(int routeId, int actorId, const char* reason) {
    for(int i=0; i<numRoutes; i++) {
        if(routes[i].routeId == routeId && routes[i].status != ROUTE_COMPLETED) {
            routes[i].status = ROUTE_CANCELLED;
            getCurrentTimestamp(routes[i].updatedAt);
            saveRoutes();
            recordRouteEvent(routeId, actorId, "ROUTE_CANCELLED", reason);
            return 1;
        }
    }
    return 0;
}
""")
print("Done writing to route_engine.c")
