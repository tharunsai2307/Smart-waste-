#include "geospatial.h"
#include <math.h>

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

// Radius of the Earth in kilometers
#define EARTH_RADIUS_KM 6371.0

static double degreesToRadians(double degrees) {
    return degrees * M_PI / 180.0;
}

double calculateDistanceKm(double lat1, double lon1, double lat2, double lon2) {
    double dLat = degreesToRadians(lat2 - lat1);
    double dLon = degreesToRadians(lon2 - lon1);
    
    double lat1Rad = degreesToRadians(lat1);
    double lat2Rad = degreesToRadians(lat2);
    
    double a = sin(dLat / 2) * sin(dLat / 2) +
               sin(dLon / 2) * sin(dLon / 2) * cos(lat1Rad) * cos(lat2Rad);
    
    double c = 2 * atan2(sqrt(a), sqrt(1 - a));
    
    return EARTH_RADIUS_KM * c;
}
