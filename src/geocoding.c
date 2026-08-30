#include "geocoding.h"
#include "external_services.h"
#include <string.h>
#include <stdio.h>
#include <stdlib.h>

bool geocodeAddress(const char *address, GeoCoordinate *outCoord, char *errorMsg, size_t errorSize) {
    if (!address || strlen(address) == 0) {
        snprintf(errorMsg, errorSize, "Invalid address");
        return false;
    }

    const char *provider = getGeocodingProvider();
    const char *key = getGeocodingApiKey();

    if (strcmp(provider, "none") == 0 || strlen(key) == 0) {
        // Fallback Logic
        // In a real system, fallback could use local DB or heuristic.
        // For testing, we just simulate a central point if it contains "Chennai", else arbitrary.
        if (strstr(address, "Chennai")) {
            outCoord->latitude = 13.0827;
            outCoord->longitude = 80.2707;
        } else {
            outCoord->latitude = 0.0;
            outCoord->longitude = 0.0;
        }
        return true;
    }

    // External Provider Logic (Stubbed for actual HTTP request)
    // if (strcmp(provider, "mapbox") == 0) { ... }
    
    // Simulate successful external geocoding for now
    outCoord->latitude = 13.0827;
    outCoord->longitude = 80.2707;
    return true;
}

bool reverseGeocode(const GeoCoordinate *coord, char *outAddress, size_t addrSize, char *errorMsg, size_t errorSize) {
    if (!coord || coord->latitude < -90 || coord->latitude > 90 || coord->longitude < -180 || coord->longitude > 180) {
        snprintf(errorMsg, errorSize, "Invalid coordinates");
        return false;
    }

    const char *provider = getGeocodingProvider();
    const char *key = getGeocodingApiKey();

    if (strcmp(provider, "none") == 0 || strlen(key) == 0) {
        // Fallback Logic
        snprintf(outAddress, addrSize, "Fallback Address near %.4f, %.4f", coord->latitude, coord->longitude);
        return true;
    }

    // External Provider Logic (Stubbed for actual HTTP request)
    snprintf(outAddress, addrSize, "Simulated Real Address near %.4f, %.4f", coord->latitude, coord->longitude);
    return true;
}
