#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include "map_service.h"
#include "hub.h"
#include "collection.h"
#include "facility.h"
#include "utils.h"
#include "search_sort.h" // For getting all hubs/facilities

#define PI 3.14159265358979323846

static double toRadians(double degree) {
    return degree * PI / 180.0;
}

float calculateDistanceKm(double lat1, double lon1, double lat2, double lon2) {
    // Haversine formula
    double R = 6371.0; // Earth radius in km
    double dLat = toRadians(lat2 - lat1);
    double dLon = toRadians(lon2 - lon1);
    
    double a = sin(dLat/2) * sin(dLat/2) +
               cos(toRadians(lat1)) * cos(toRadians(lat2)) *
               sin(dLon/2) * sin(dLon/2);
               
    double c = 2 * atan2(sqrt(a), sqrt(1-a));
    return (float)(R * c);
}

int isWithinGeofence(double lat, double lon, double targetLat, double targetLon, float radiusMeters) {
    float distKm = calculateDistanceKm(lat, lon, targetLat, targetLon);
    return (distKm * 1000.0f) <= radiusMeters;
}

int validateCoordinates(double lat, double lon) {
    if (lat < -90.0 || lat > 90.0) return 0;
    if (lon < -180.0 || lon > 180.0) return 0;
    if (lat == 0.0 && lon == 0.0) return 0;
    return 1;
}

int assignHubToCollection(double lat, double lon, const char* serviceZone) {
    LocalHub hubs[MAX_USERS]; // max hubs
    int count = getAllHubs(hubs, MAX_USERS);
    if (count == 0) return -1;

    int bestHubId = -1;
    float minDistance = 999999.0f;
    
    for (int i = 0; i < count; i++) {
        if (hubs[i].status != HUB_NORMAL && hubs[i].status != HUB_WARNING) {
            continue; // Skip full/closed hubs
        }
        
        // Zone matching: if zone provided and hub has a zone, they must match
        if (serviceZone && strlen(serviceZone) > 0 && strlen(hubs[i].serviceZone) > 0) {
            if (strcmp(serviceZone, hubs[i].serviceZone) != 0) {
                continue;
            }
        }
        
        float dist = calculateDistanceKm(lat, lon, hubs[i].latitude, hubs[i].longitude);
        if (dist < minDistance) {
            minDistance = dist;
            bestHubId = hubs[i].hubId;
        }
    }
    
    // Fallback if no hub matches strictly
    if (bestHubId == -1 && count > 0) {
        bestHubId = hubs[0].hubId; // Fallback
    }
    
    return bestHubId;
}

typedef struct {
    LocalHub hub;
    float distance;
} HubDist;

static int compareHubDist(const void* a, const void* b) {
    float d1 = ((HubDist*)a)->distance;
    float d2 = ((HubDist*)b)->distance;
    if (d1 < d2) return -1;
    if (d1 > d2) return 1;
    return 0;
}

int findNearestHubs(double lat, double lon, LocalHub* outHubs, int maxCount) {
    LocalHub allHubs[100];
    int count = getAllHubs(allHubs, 100);
    
    HubDist *hd = malloc(count * sizeof(HubDist));
    for (int i=0; i<count; i++) {
        hd[i].hub = allHubs[i];
        hd[i].distance = calculateDistanceKm(lat, lon, allHubs[i].latitude, allHubs[i].longitude);
    }
    
    qsort(hd, count, sizeof(HubDist), compareHubDist);
    
    int resultCount = (count < maxCount) ? count : maxCount;
    for (int i=0; i<resultCount; i++) {
        outHubs[i] = hd[i].hub;
    }
    
    free(hd);
    return resultCount;
}

void initMapService() {
    FILE *fp = fopen(ROUTES_FILE, "ab");
    if (fp) fclose(fp);
}

static int getNextRouteId() {
    FILE *fp = fopen(ROUTES_FILE, "rb");
    if (!fp) return 1;
    fseek(fp, 0, SEEK_END);
    long size = ftell(fp);
    fclose(fp);
    return (int)((size / sizeof(RoutePlan)) + 1);
}

int createRoutePlan(RoutePlan *plan) {
    plan->routeId = getNextRouteId();
    getCurrentTimestamp(plan->createdAt, sizeof(plan->createdAt));
    FILE *fp = fopen(ROUTES_FILE, "ab");
    if (!fp) return 0;
    fwrite(plan, sizeof(RoutePlan), 1, fp);
    fclose(fp);
    return 1;
}

int getRoutePlansByUser(int userId, RoutePlan *arr, int maxCount) {
    FILE *fp = fopen(ROUTES_FILE, "rb");
    if (!fp) return 0;
    int count = 0;
    RoutePlan p;
    while (fread(&p, sizeof(RoutePlan), 1, fp) && count < maxCount) {
        if (p.assignedToId == userId) {
            arr[count++] = p;
        }
    }
    fclose(fp);
    return count;
}

int getRoutePlanById(int routeId, RoutePlan *plan) {
    FILE *fp = fopen(ROUTES_FILE, "rb");
    if (!fp) return 0;
    RoutePlan p;
    while (fread(&p, sizeof(RoutePlan), 1, fp)) {
        if (p.routeId == routeId) {
            *plan = p;
            fclose(fp);
            return 1;
        }
    }
    fclose(fp);
    return 0;
}

RoutePlan optimizeCollectionRoute(int hubId, int cleanerId, int* collectionIds, int count) {
    RoutePlan plan;
    memset(&plan, 0, sizeof(RoutePlan));
    strncpy(plan.routeType, "COLLECTION", sizeof(plan.routeType)-1);
    plan.originId = hubId;
    plan.destinationId = hubId;
    plan.assignedToId = cleanerId;
    
    if (count == 0 || count > 20) {
        plan.stopCount = 0;
        return plan;
    }
    
    LocalHub hub;
    if (!getHubById(hubId, &hub)) return plan;
    
    CollectionRequest reqs[20];
    for(int i=0; i<count; i++) {
        getCollectionRequestById(collectionIds[i], &reqs[i]);
    }
    
    // Nearest neighbor TSP heuristic
    int visited[20] = {0};
    double currentLat = hub.latitude;
    double currentLon = hub.longitude;
    float totalDist = 0.0f;
    
    for (int step = 0; step < count; step++) {
        int bestIdx = -1;
        float minDist = 999999.0f;
        int bestPriority = -1; // Also consider priority
        
        for (int i = 0; i < count; i++) {
            if (!visited[i]) {
                float dist = calculateDistanceKm(currentLat, currentLon, reqs[i].latitude, reqs[i].longitude);
                
                // Priority awareness: high priority artificially reduces effective distance
                float effDist = dist;
                if (reqs[i].priorityScore >= 100) effDist -= 5.0f; // URGENT gets massive boost
                else if (reqs[i].priorityScore >= 50) effDist -= 2.0f;
                
                if (effDist < minDist || (effDist == minDist && reqs[i].priorityScore > bestPriority)) {
                    minDist = effDist;
                    bestIdx = i;
                    bestPriority = reqs[i].priorityScore;
                }
            }
        }
        
        if (bestIdx != -1) {
            visited[bestIdx] = 1;
            plan.stops[step] = reqs[bestIdx].collectionId;
            float actualDist = calculateDistanceKm(currentLat, currentLon, reqs[bestIdx].latitude, reqs[bestIdx].longitude);
            totalDist += actualDist;
            currentLat = reqs[bestIdx].latitude;
            currentLon = reqs[bestIdx].longitude;
        }
    }
    
    // Return to hub
    totalDist += calculateDistanceKm(currentLat, currentLon, hub.latitude, hub.longitude);
    
    plan.stopCount = count;
    plan.totalDistanceKm = totalDist;
    plan.estimatedDurationMin = totalDist * 4.0f + count * 5.0f; // rough estimate: 15km/h avg speed (4 mins per km) + 5 min per stop
    
    createRoutePlan(&plan);
    return plan;
}

RoutePlan createTransferRoute(int hubId, int facilityId, int driverId) {
    RoutePlan plan;
    memset(&plan, 0, sizeof(RoutePlan));
    strncpy(plan.routeType, "TRANSFER", sizeof(plan.routeType)-1);
    plan.originId = hubId;
    plan.destinationId = facilityId;
    plan.assignedToId = driverId;
    plan.stopCount = 0;
    
    LocalHub hub;
    TransportFacility fac;
    if (getHubById(hubId, &hub) && getFacilityById(facilityId, &fac)) {
        float dist = calculateDistanceKm(hub.latitude, hub.longitude, fac.latitude, fac.longitude);
        plan.totalDistanceKm = dist;
        plan.estimatedDurationMin = dist * 2.5f; // rough estimate: 24km/h avg speed for large trucks
    }
    
    createRoutePlan(&plan);
    return plan;
}
