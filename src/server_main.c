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
#include "geospatial.h"
#include "route_engine.h"
#include "alert_engine.h"
#include "external_services.h"
#include "observability.h"
#include <stdio.h>

int main(void) {
    printf("Initializing Smart Waste Management System...\n");
    
    // Initialize data files
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
    initRouteEngineData();
    initAlertEngine();
    initExternalServices();
    initObservability();

    startServer("8080");
    return 0;
}
