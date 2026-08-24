#ifndef LOCATION_H
#define LOCATION_H

#include "types.h"
#include "config.h"

void initLocationsData();

// GeoLocation CRUD
int addGeoLocation(GeoLocation *loc);
int updateGeoLocation(GeoLocation *loc);
int getGeoLocation(int locationId, GeoLocation *loc);
int getGeoLocationByRef(LocationType type, int refId, GeoLocation *loc);
int getAllGeoLocations(GeoLocation *list, int maxCount);

// ServiceArea CRUD
int addServiceArea(ServiceArea *area);
int updateServiceArea(ServiceArea *area);
int getServiceArea(int areaId, ServiceArea *area);
int getAllServiceAreas(ServiceArea *list, int maxCount);

// Helper for Hub Assignment & Queries
int determineServiceAreaForLocation(double lat, double lon, int *areaId);
int findNearestHubs(double lat, double lon, double radiusKm, LocalHub *hubs, double *distances, int maxCount);
int findNearbyFacilities(double lat, double lon, double radiusKm, TransportFacility *facilities, double *distances, int maxCount);
int assignHubForResident(int residentId, double lat, double lon);

#endif
