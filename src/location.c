#include "location.h"
#include "geospatial.h"
#include "hub.h"
#include "facility.h"
#include "utils.h"
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

void initLocationsData() {
    FILE *fp = fopen(LOCATIONS_FILE, "ab+");
    if (fp) fclose(fp);
    
    fp = fopen(SERVICE_AREAS_FILE, "ab+");
    if (fp) fclose(fp);
}

static int getNextLocationId() {
    FILE *fp = fopen(LOCATIONS_FILE, "rb");
    if (!fp) return 1;
    GeoLocation loc;
    int maxId = 0;
    while (fread(&loc, sizeof(GeoLocation), 1, fp) == 1) {
        if (loc.locationId > maxId) maxId = loc.locationId;
    }
    fclose(fp);
    return maxId + 1;
}

int addGeoLocation(GeoLocation *loc) {
    loc->locationId = getNextLocationId();
    getCurrentTimestamp(loc->createdAt, sizeof(loc->createdAt));
    strcpy(loc->updatedAt, loc->createdAt);
    
    FILE *fp = fopen(LOCATIONS_FILE, "ab");
    if (!fp) return 0;
    fwrite(loc, sizeof(GeoLocation), 1, fp);
    fclose(fp);
    return 1;
}

int updateGeoLocation(GeoLocation *loc) {
    FILE *fp = fopen(LOCATIONS_FILE, "r+b");
    if (!fp) return 0;
    GeoLocation temp;
    int found = 0;
    while (fread(&temp, sizeof(GeoLocation), 1, fp) == 1) {
        if (temp.locationId == loc->locationId) {
            getCurrentTimestamp(loc->updatedAt, sizeof(loc->updatedAt));
            fseek(fp, -(long)sizeof(GeoLocation), SEEK_CUR);
            fwrite(loc, sizeof(GeoLocation), 1, fp);
            found = 1;
            break;
        }
    }
    fclose(fp);
    return found;
}

int getGeoLocation(int locationId, GeoLocation *loc) {
    FILE *fp = fopen(LOCATIONS_FILE, "rb");
    if (!fp) return 0;
    GeoLocation temp;
    while (fread(&temp, sizeof(GeoLocation), 1, fp) == 1) {
        if (temp.locationId == locationId) {
            *loc = temp;
            fclose(fp);
            return 1;
        }
    }
    fclose(fp);
    return 0;
}

int getGeoLocationByRef(LocationType type, int refId, GeoLocation *loc) {
    FILE *fp = fopen(LOCATIONS_FILE, "rb");
    if (!fp) return 0;
    GeoLocation temp;
    while (fread(&temp, sizeof(GeoLocation), 1, fp) == 1) {
        if (temp.type == type && temp.referenceId == refId) {
            *loc = temp;
            fclose(fp);
            return 1;
        }
    }
    fclose(fp);
    return 0;
}

int getAllGeoLocations(GeoLocation *list, int maxCount) {
    FILE *fp = fopen(LOCATIONS_FILE, "rb");
    if (!fp) return 0;
    int count = 0;
    while (count < maxCount && fread(&list[count], sizeof(GeoLocation), 1, fp) == 1) {
        count++;
    }
    fclose(fp);
    return count;
}

// Service Area basic implementation
static int getNextServiceAreaId() {
    FILE *fp = fopen(SERVICE_AREAS_FILE, "rb");
    if (!fp) return 1;
    ServiceArea area;
    int maxId = 0;
    while (fread(&area, sizeof(ServiceArea), 1, fp) == 1) {
        if (area.areaId > maxId) maxId = area.areaId;
    }
    fclose(fp);
    return maxId + 1;
}

int addServiceArea(ServiceArea *area) {
    area->areaId = getNextServiceAreaId();
    FILE *fp = fopen(SERVICE_AREAS_FILE, "ab");
    if (!fp) return 0;
    fwrite(area, sizeof(ServiceArea), 1, fp);
    fclose(fp);
    return 1;
}

int getAllServiceAreas(ServiceArea *list, int maxCount) {
    FILE *fp = fopen(SERVICE_AREAS_FILE, "rb");
    if (!fp) return 0;
    int count = 0;
    while (count < maxCount && fread(&list[count], sizeof(ServiceArea), 1, fp) == 1) {
        count++;
    }
    fclose(fp);
    return count;
}

// Distance and logic helpers

int findNearestHubs(double lat, double lon, double radiusKm, LocalHub *hubs, double *distances, int maxCount) {
    LocalHub allHubs[50];
    int totalHubs = getAllHubs(allHubs, 50);
    
    int count = 0;
    for (int i = 0; i < totalHubs; i++) {
        if (allHubs[i].status == HUB_TEMPORARILY_CLOSED) continue;
        
        double dist = calculateDistanceKm(lat, lon, allHubs[i].latitude, allHubs[i].longitude);
        if (dist <= radiusKm) {
            // Very simple insertion sort by distance
            int j = count;
            while (j > 0 && distances[j-1] > dist) {
                if (j < maxCount) {
                    hubs[j] = hubs[j-1];
                    distances[j] = distances[j-1];
                }
                j--;
            }
            if (j < maxCount) {
                hubs[j] = allHubs[i];
                distances[j] = dist;
                if (count < maxCount) count++;
            }
        }
    }
    return count;
}

int findNearbyFacilities(double lat, double lon, double radiusKm, TransportFacility *facilities, double *distances, int maxCount) {
    TransportFacility allF[50];
    int totalF = getAllFacilities(allF, 50);
    
    int count = 0;
    for (int i = 0; i < totalF; i++) {
        // Assume ACTIVE status string
        if (strcmp(allF[i].status, "ACTIVE") != 0) continue;
        
        double dist = calculateDistanceKm(lat, lon, allF[i].latitude, allF[i].longitude);
        if (dist <= radiusKm) {
            int j = count;
            while (j > 0 && distances[j-1] > dist) {
                if (j < maxCount) {
                    facilities[j] = facilities[j-1];
                    distances[j] = distances[j-1];
                }
                j--;
            }
            if (j < maxCount) {
                facilities[j] = allF[i];
                distances[j] = dist;
                if (count < maxCount) count++;
            }
        }
    }
    return count;
}

int assignHubForResident(int residentId, double lat, double lon) {
    (void)residentId;
    // 1. Basic distance-based assignment for now
    LocalHub nearest[1];
    double dist[1];
    int count = findNearestHubs(lat, lon, 20.0, nearest, dist, 1);
    
    if (count > 0) {
        // You would typically update the Resident record here in a real scenario
        // but for now we just return the hubId
        return nearest[0].hubId;
    }
    return 0; // Unassigned
}
