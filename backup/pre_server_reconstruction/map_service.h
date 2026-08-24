#ifndef MAP_SERVICE_H
#define MAP_SERVICE_H

#include "types.h"

// Calculate distance between two coordinates in km using Haversine formula
float calculateDistanceKm(double lat1, double lon1, double lat2, double lon2);

// Check if a point is within a geofence radius
int isWithinGeofence(double lat, double lon, double targetLat, double targetLon, float radiusMeters);

// Validate that coordinates are non-zero/valid
int validateCoordinates(double lat, double lon);

// Assign nearest hub based on distance and service zone
int assignHubToCollection(double lat, double lon, const char* serviceZone);

// Find nearest hubs and return count found
int findNearestHubs(double lat, double lon, LocalHub* outHubs, int maxCount);

// Initialize route data files
void initMapService();

// Create and save a new route plan
int createRoutePlan(RoutePlan *plan);

// Retrieve route plans by assigned user
int getRoutePlansByUser(int userId, RoutePlan *arr, int maxCount);

// Get route plan by id
int getRoutePlanById(int routeId, RoutePlan *plan);

// Optimize collection route using Nearest Neighbor
RoutePlan optimizeCollectionRoute(int hubId, int cleanerId, int* collectionIds, int count);

// Create transfer route
RoutePlan createTransferRoute(int hubId, int facilityId, int driverId);

#endif
