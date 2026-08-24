#ifndef ROUTE_ENGINE_H
#define ROUTE_ENGINE_H

#include "types.h"

// Initialization
void initRouteEngineData();

// Core Route Engine functions
int planCollectionRoute(int hubId, int cleanerId, int vehicleId);
int planTransferRoute(int hubId, int facilityId, int driverId, int vehicleId);
int submitVehicleInspection(int vehicleId, int driverId, int routeId, int passed);
int driverCheckInVehicle(int routeId, int driverId, const char* vehicleQrCode);
int dispatchRoute(int routeId, int actorId);
int driverAcceptRoute(int routeId, int driverId);
int startRoute(int routeId, int actorId);
int arriveAtStop(int routeId, int stopId, int actorId);
int arriveAtStopQR(int routeId, int stopId, int actorId, const char* stopQrCode);
int completeStop(int routeId, int stopId, int actorId, float actualWeightKg);
int completeRoute(int routeId, int actorId);
int cancelRoute(int routeId, int actorId, const char* reason);

// Data Access
int getRoutes(Route *list, int maxCount);
int getRouteById(int routeId, Route *route);
int getRouteEngineStops(int routeId, RouteEngineStop *list, int maxCount);
int getDriverRoutes(int driverId, Route *list, int maxCount);
int getCleanerRoutes(int cleanerId, Route *list, int maxCount);

// Telemetry
int recordRouteEvent(int routeId, int actorId, const char* eventType, const char* notes);
int getRouteTelemetry(int routeId, RouteEvent *list, int maxCount);

// Internal state validation
int isVehicleAssigned(int vehicleId);
int isDriverAssigned(int driverId);
int isCleanerAssigned(int cleanerId);

#endif
