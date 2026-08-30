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
#include <stdlib.h>

int main(void) {
    printf("Initializing Smart Waste Management System...\n");

    // Port is configurable via the PORT env var (default 8080).
    const char *port = getenv("PORT");
    if (!port || !*port) port = "8080";
    
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

    startServer(port);
    return 0;
}
