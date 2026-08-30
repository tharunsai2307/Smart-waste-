#ifndef ROUTING_PROVIDER_H
#define ROUTING_PROVIDER_H

#include "geocoding.h"
#include <stdbool.h>

typedef struct {
    double distanceKm;
    double estimatedTimeMin;
    bool usingFallback; // True if calculated using internal haversine instead of real provider
} RouteEstimate;

// Provide estimated travel time and distance between two coordinates
bool getRouteEstimate(const GeoCoordinate *origin, const GeoCoordinate *destination, RouteEstimate *outEstimate);

#endif
