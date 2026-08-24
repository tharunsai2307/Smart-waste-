#include "route_engine.h"
#include "qr.h"
#include "collection.h"
#include "hub.h"
#include "vehicle.h"
#include "geospatial.h"
#include "location.h"
#include "utils.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define MAX_ROUTES 500
#define MAX_STOPS 2000
#define MAX_EVENTS 5000

static Route routes[MAX_ROUTES];
static int numRoutes = 0;

static RouteEngineStop stops[MAX_STOPS];
static int numStops = 0;

static RouteEvent events[MAX_EVENTS];
static int numEvents = 0;

static void saveRoutes() {
    FILE *f = fopen(ROUTES_FILE, "wb");
    if (f) {
        fwrite(&numRoutes, sizeof(int), 1, f);
        fwrite(routes, sizeof(Route), numRoutes, f);
        fclose(f);
    }
}

static void saveStops() {
    FILE *f = fopen(ROUTE_STOPS_FILE, "wb");
    if (f) {
        fwrite(&numStops, sizeof(int), 1, f);
        fwrite(stops, sizeof(RouteEngineStop), numStops, f);
        fclose(f);
    }
}

static void saveEvents() {
    FILE *f = fopen(ROUTE_EVENTS_FILE, "wb");
    if (f) {
        fwrite(&numEvents, sizeof(int), 1, f);
        fwrite(events, sizeof(RouteEvent), numEvents, f);
        fclose(f);
    }
}

void initRouteEngineData() {
    FILE *f = fopen(ROUTES_FILE, "rb");
    if (f) {
        fread(&numRoutes, sizeof(int), 1, f);
        fread(routes, sizeof(Route), numRoutes, f);
        fclose(f);
    }
    f = fopen(ROUTE_STOPS_FILE, "rb");
    if (f) {
        fread(&numStops, sizeof(int), 1, f);
        fread(stops, sizeof(RouteEngineStop), numStops, f);
        fclose(f);
    }
    f = fopen(ROUTE_EVENTS_FILE, "rb");
    if (f) {
        fread(&numEvents, sizeof(int), 1, f);
        fread(events, sizeof(RouteEvent), numEvents, f);
        fclose(f);
    }
}

int getRoutes(Route *list, int maxCount) {
    int count = 0;
    for (int i = 0; i < numRoutes && count < maxCount; i++) {
        list[count++] = routes[i];
    }
    return count;
}

int getRouteById(int routeId, Route *route) {
    for (int i = 0; i < numRoutes; i++) {
        if (routes[i].routeId == routeId) {
            *route = routes[i];
            return 1;
        }
    }
    return 0;
}

int getRouteEngineStops(int routeId, RouteEngineStop *list, int maxCount) {
    int count = 0;
    for (int i = 0; i < numStops && count < maxCount; i++) {
        if (stops[i].routeId == routeId) {
            list[count++] = stops[i];
        }
    }
    return count;
}

int getDriverRoutes(int driverId, Route *list, int maxCount) {
    int count = 0;
    for (int i = 0; i < numRoutes && count < maxCount; i++) {
        if (routes[i].driverId == driverId) {
            list[count++] = routes[i];
        }
    }
    return count;
}

int getCleanerRoutes(int cleanerId, Route *list, int maxCount) {
    int count = 0;
    for (int i = 0; i < numRoutes && count < maxCount; i++) {
        if (routes[i].driverId == cleanerId) {
            list[count++] = routes[i];
        }
    }
    return count;
}

int recordRouteEvent(int routeId, int actorId, const char* eventType, const char* notes) {
    if (numEvents >= MAX_EVENTS) return 0;
    RouteEvent ev = {0};
    ev.eventId = (numEvents > 0) ? events[numEvents-1].eventId + 1 : 1;
    ev.routeId = routeId;
    ev.actorId = actorId;
    strcpy(ev.eventType, eventType);
    if(notes) strncpy(ev.notes, notes, sizeof(ev.notes)-1);
    getCurrentTimestamp(ev.timestamp, sizeof(ev.timestamp));
    
    // Attempt to get location if available from vehicle tracking
    // For now we default to 0,0
    ev.latitude = 0.0;
    ev.longitude = 0.0;
    
    events[numEvents++] = ev;
    saveEvents();
    return ev.eventId;
}

int getRouteTelemetry(int routeId, RouteEvent *list, int maxCount) {
    int count = 0;
    for (int i = 0; i < numEvents && count < maxCount; i++) {
        if (events[i].routeId == routeId) {
            list[count++] = events[i];
        }
    }
    return count;
}

int isVehicleAssigned(int vehicleId) {
    for (int i = 0; i < numRoutes; i++) {
        if (routes[i].vehicleId == vehicleId && 
            (routes[i].status != ROUTE_COMPLETED && routes[i].status != ROUTE_CANCELLED && routes[i].status != ROUTE_FAILED)) {
            return 1;
        }
    }
    return 0;
}

int isDriverAssigned(int driverId) {
    for (int i = 0; i < numRoutes; i++) {
        if (routes[i].driverId == driverId && 
            (routes[i].status != ROUTE_COMPLETED && routes[i].status != ROUTE_CANCELLED && routes[i].status != ROUTE_FAILED)) {
            return 1;
        }
    }
    return 0;
}

int isCleanerAssigned(int cleanerId) {
    return isDriverAssigned(cleanerId);
}


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
    int reqCount = getAllCollectionRequests(allReqs, 1000);
    
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
    getCurrentTimestamp(r.createdAt, sizeof(r.createdAt));
    getCurrentTimestamp(r.updatedAt, sizeof(r.updatedAt));
    
    double currentLat = h.latitude;
    double currentLon = h.longitude;
    int seq = 1;
    
    // Origin stop (Hub)
    if(numStops >= MAX_STOPS) return -1;
    RouteEngineStop originStop = {0};
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
                RouteEngineStop st = {0};
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
    RouteEngineStop destStop = {0};
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
    getCurrentTimestamp(r.createdAt, sizeof(r.createdAt));
    getCurrentTimestamp(r.updatedAt, sizeof(r.updatedAt));
    
    // Two stops: origin hub and dest facility
    if(numStops + 1 >= MAX_STOPS) return -1;
    RouteEngineStop originStop = {0};
    originStop.routeStopId = (numStops > 0) ? stops[numStops-1].routeStopId + 1 : 1;
    originStop.routeId = r.routeId;
    originStop.sequenceNumber = 1;
    originStop.referenceId = hubId;
    strcpy(originStop.stopType, "LOCAL_HUB");
    originStop.status = STOP_PLANNED;
    stops[numStops++] = originStop;
    
    RouteEngineStop destStop = {0};
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
}

int driverCheckInVehicle(int routeId, int driverId, const char* vehicleQrCode) {
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
}

int dispatchRoute(int routeId, int actorId) {
    for(int i=0; i<numRoutes; i++) {
        if(routes[i].routeId == routeId && routes[i].status == ROUTE_PLANNED) {
            routes[i].status = ROUTE_ASSIGNED;
            getCurrentTimestamp(routes[i].updatedAt, sizeof(routes[i].updatedAt));
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
            getCurrentTimestamp(routes[i].updatedAt, sizeof(routes[i].updatedAt));
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
           routes[i].status == ROUTE_READY) {
            routes[i].status = ROUTE_EN_ROUTE;
            getCurrentTimestamp(routes[i].updatedAt, sizeof(routes[i].updatedAt));
            saveRoutes();
            recordRouteEvent(routeId, actorId, "ROUTE_STARTED", "Route has started");
            return 1;
        }
    }
    return 0;
}

// Updated with QR scan validation
int arriveAtStopQR(int routeId, int stopId, int actorId, const char* stopQrCode) {
    for(int i=0; i<numStops; i++) {
        if(stops[i].routeId == routeId && stops[i].routeStopId == stopId) {
            
            char reason[128] = "";
            if (validateQRCode(stopQrCode, routeId, 0, actorId, stopId, reason) != QR_SUCCESS) {
                logQREvent("STOP", stopId, actorId, routeId, 0, 0, QR_FAILED, reason);
                return 0;
            }
            logQREvent("STOP", stopId, actorId, routeId, 0, 0, QR_SUCCESS, "");
            
            stops[i].status = STOP_ARRIVED;
            getCurrentTimestamp(stops[i].arrivalTime, sizeof(stops[i].arrivalTime));
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
            getCurrentTimestamp(stops[i].serviceCompletedTime, sizeof(stops[i].serviceCompletedTime));
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
            getCurrentTimestamp(routes[i].updatedAt, sizeof(routes[i].updatedAt));
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
            getCurrentTimestamp(routes[i].updatedAt, sizeof(routes[i].updatedAt));
            saveRoutes();
            recordRouteEvent(routeId, actorId, "ROUTE_CANCELLED", reason);
            return 1;
        }
    }
    return 0;
}
