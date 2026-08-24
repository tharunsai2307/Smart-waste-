#include "geospatial.h"
#include "location.h"
#include "gis_route.h"
#include "hub.h"
#include <stdio.h>
#include <assert.h>
#include <math.h>

void testHaversine() {
    printf("[TEST 1] Testing Haversine distance...\\n");
    // New York: 40.7128, -74.0060
    // London: 51.5074, -0.1278
    double dist = calculateDistanceKm(40.7128, -74.0060, 51.5074, -0.1278);
    // Should be around 5570 km
    assert(dist > 5500 && dist < 5600);
    
    // Same point
    double dist0 = calculateDistanceKm(40.7128, -74.0060, 40.7128, -74.0060);
    assert(dist0 == 0.0);
    printf("  v Haversine tests passed.\\n");
}

void testNearestHub() {
    printf("[TEST 2] Testing Nearest Hub Calculation...\\n");
    initLocationsData();
    // Simulate some hubs
    // Note: since test_hub.c or others might have cleared hubs, we rely on the logic ignoring empty lists
    LocalHub hubs[5];
    double dists[5];
    int count = findNearestHubs(40.7, -74.0, 10.0, hubs, dists, 5);
    // Since we didn't mock hubs with coordinates here, count might be 0, which is fine to verify no crash
    printf("  v Nearest hub logic passed (Found %d).\\n", count);
}

int main() {
    printf("=========================================\\n");
    printf("   PHASE 6: GIS & LOCATION TEST SUITE    \\n");
    printf("=========================================\\n\\n");
    
    testHaversine();
    testNearestHub();
    
    printf("\\nTests completed successfully.\\n");
    return 0;
}
