#ifndef GEOCODING_H
#define GEOCODING_H

#include <stdbool.h>
#include <stddef.h>

typedef struct {
    double latitude;
    double longitude;
} GeoCoordinate;

// Geocode an address string into lat/lon
bool geocodeAddress(const char *address, GeoCoordinate *outCoord, char *errorMsg, size_t errorSize);

// Reverse geocode lat/lon into an address string
bool reverseGeocode(const GeoCoordinate *coord, char *outAddress, size_t addrSize, char *errorMsg, size_t errorSize);

#endif
