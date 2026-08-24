#ifndef GIS_ROUTE_H
#define GIS_ROUTE_H

#include "types.h"
#include "config.h"

void initGisRoutesData();

// Vehicle Location Tracking
int recordVehicleLocation(VehicleLocation *loc);
int getLatestVehicleLocation(int vehicleId, VehicleLocation *loc);

// Route Requests
int addRouteRequest(RouteRequest *req);
int updateRouteRequest(RouteRequest *req);
int getRouteRequest(int routeId, RouteRequest *req);
int getDriverRouteRequests(int driverId, RouteRequest *list, int maxCount);

// Route Stops
int addRouteStop(RouteStop *stop);
int getRouteStops(int routeId, RouteStop *list, int maxCount);

// Helper
int generateCollectionRoute(int driverId, int vehicleId, int hubId);

#endif
