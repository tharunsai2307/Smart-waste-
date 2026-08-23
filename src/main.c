#include "utils.h"
#include "user.h"
#include "auth.h"
#include "resident.h"
#include "waste.h"
#include "bin.h"
#include "alert.h"
#include "vehicle.h"
#include "collection.h"
#include "route.h"
#include "recycling.h"

int main() {
    // Initialize data files if they don't exist
    initUsersData();
    initResidentsData();
    initWasteData();
    initBinsData();
    initAlertsData();
    initVehiclesData();
    initCollectionsData();
    initRouteData();
    initRecyclingData();
    
    // Start login menu
    loginMenu();
    
    return 0;
}
