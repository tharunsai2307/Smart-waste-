#include "routing_provider.h"
#include "external_services.h"
#include "geospatial.h"
#include <string.h>

bool getRouteEstimate(const GeoCoordinate *origin, const GeoCoordinate *destination, RouteEstimate *outEstimate) {
    if (!origin || !destination || !outEstimate) return false;

    const char *provider = getRoutingProvider();
    const char *key = getRoutingApiKey();

    if (strcmp(provider, "none") == 0 || strlen(key) == 0) {
        // Fallback Logic using internal Haversine distance
        outEstimate->usingFallback = true;
        outEstimate->distanceKm = calculateDistanceKm(origin->latitude, origin->longitude, destination->latitude, destination->longitude);
        // Assume average speed of 25 km/h for municipal vehicles in city
        outEstimate->estimatedTimeMin = (outEstimate->distanceKm / 25.0) * 60.0;
        return true;
    }

    // External Provider Logic (Stubbed for actual HTTP request)
    // Here we would call the real routing API
    
    // Simulate successful real response
    outEstimate->usingFallback = false;
    outEstimate->distanceKm = calculateDistanceKm(origin->latitude, origin->longitude, destination->latitude, destination->longitude) * 1.2; // road distance is usually longer
    outEstimate->estimatedTimeMin = (outEstimate->distanceKm / 20.0) * 60.0; // road speed
    return true;
}
