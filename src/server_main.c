#include "server.h"
#include "user.h"
#include "resident.h"
#include "waste.h"
#include "bin.h"
#include "alert.h"
#include "vehicle.h"
#include "collection.h"
#include "route.h"
#include "recycling.h"
#include "location.h"
#include "gis_route.h"

int main() {
    initUsersData();
    initResidentsData();
    initWasteData();
    initBinsData();
    initAlertsData();
    initVehiclesData();
    initCollectionsData();
    initRouteData();
    initRecyclingData();
    initLocationsData();
    initGisRoutesData();

    startServer("8080");
    return 0;
}
