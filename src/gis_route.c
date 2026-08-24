#include "gis_route.h"
#include "collection.h"
#include "hub.h"
#include "geospatial.h"
#include "utils.h"
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

void initGisRoutesData() {
    FILE *fp = fopen(VEHICLE_LOCATIONS_FILE, "ab+");
    if (fp) fclose(fp);
    
    fp = fopen(ROUTES_FILE, "ab+");
    if (fp) fclose(fp);
    
    fp = fopen(ROUTE_STOPS_FILE, "ab+");
    if (fp) fclose(fp);
}

int recordVehicleLocation(VehicleLocation *loc) {
    getCurrentTimestamp(loc->timestamp, sizeof(loc->timestamp));
    FILE *fp = fopen(VEHICLE_LOCATIONS_FILE, "ab");
    if (!fp) return 0;
    fwrite(loc, sizeof(VehicleLocation), 1, fp);
    fclose(fp);
    return 1;
}

int getLatestVehicleLocation(int vehicleId, VehicleLocation *loc) {
    FILE *fp = fopen(VEHICLE_LOCATIONS_FILE, "rb");
    if (!fp) return 0;
    
    VehicleLocation temp;
    int found = 0;
    while (fread(&temp, sizeof(VehicleLocation), 1, fp) == 1) {
        if (temp.vehicleId == vehicleId) {
            *loc = temp;
            found = 1;
        }
    }
    fclose(fp);
    return found;
}

static int getNextRouteId() {
    FILE *fp = fopen(ROUTES_FILE, "rb");
    if (!fp) return 1;
    RouteRequest req;
    int maxId = 0;
    while (fread(&req, sizeof(RouteRequest), 1, fp) == 1) {
        if (req.routeId > maxId) maxId = req.routeId;
    }
    fclose(fp);
    return maxId + 1;
}

int addRouteRequest(RouteRequest *req) {
    req->routeId = getNextRouteId();
    getCurrentTimestamp(req->createdAt, sizeof(req->createdAt));
    strcpy(req->status, "PENDING");
    
    FILE *fp = fopen(ROUTES_FILE, "ab");
    if (!fp) return 0;
    fwrite(req, sizeof(RouteRequest), 1, fp);
    fclose(fp);
    return 1;
}

int updateRouteRequest(RouteRequest *req) {
    FILE *fp = fopen(ROUTES_FILE, "r+b");
    if (!fp) return 0;
    RouteRequest temp;
    int found = 0;
    while (fread(&temp, sizeof(RouteRequest), 1, fp) == 1) {
        if (temp.routeId == req->routeId) {
            fseek(fp, -(long)sizeof(RouteRequest), SEEK_CUR);
            fwrite(req, sizeof(RouteRequest), 1, fp);
            found = 1;
            break;
        }
    }
    fclose(fp);
    return found;
}

int getRouteRequest(int routeId, RouteRequest *req) {
    FILE *fp = fopen(ROUTES_FILE, "rb");
    if (!fp) return 0;
    RouteRequest temp;
    while (fread(&temp, sizeof(RouteRequest), 1, fp) == 1) {
        if (temp.routeId == routeId) {
            *req = temp;
            fclose(fp);
            return 1;
        }
    }
    fclose(fp);
    return 0;
}

int getDriverRouteRequests(int driverId, RouteRequest *list, int maxCount) {
    FILE *fp = fopen(ROUTES_FILE, "rb");
    if (!fp) return 0;
    int count = 0;
    while (count < maxCount && fread(&list[count], sizeof(RouteRequest), 1, fp) == 1) {
        if (list[count].driverId == driverId) {
            count++;
        }
    }
    fclose(fp);
    return count;
}

static int getNextStopId() {
    FILE *fp = fopen(ROUTE_STOPS_FILE, "rb");
    if (!fp) return 1;
    RouteStop stop;
    int maxId = 0;
    while (fread(&stop, sizeof(RouteStop), 1, fp) == 1) {
        if (stop.stopId > maxId) maxId = stop.stopId;
    }
    fclose(fp);
    return maxId + 1;
}

int addRouteStop(RouteStop *stop) {
    stop->stopId = getNextStopId();
    strcpy(stop->status, "PENDING");
    FILE *fp = fopen(ROUTE_STOPS_FILE, "ab");
    if (!fp) return 0;
    fwrite(stop, sizeof(RouteStop), 1, fp);
    fclose(fp);
    return 1;
}

int getRouteStops(int routeId, RouteStop *list, int maxCount) {
    FILE *fp = fopen(ROUTE_STOPS_FILE, "rb");
    if (!fp) return 0;
    int count = 0;
    while (count < maxCount && fread(&list[count], sizeof(RouteStop), 1, fp) == 1) {
        if (list[count].routeId == routeId) {
            count++;
        }
    }
    fclose(fp);
    return count;
}

int generateCollectionRoute(int driverId, int vehicleId, int hubId) {
    // Basic implementation for generating a route from pending requests
    RouteRequest req;
    memset(&req, 0, sizeof(RouteRequest));
    req.driverId = driverId;
    req.vehicleId = vehicleId;
    snprintf(req.routeCode, sizeof(req.routeCode), "R-D%d-H%d", driverId, hubId);
    
    if (addRouteRequest(&req)) {
        return req.routeId;
    }
    return 0;
}
