#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <assert.h>
#include "analytics.h"
#include "report_export.h"

static void cleanTestFiles() {
    remove("data/test_residents.dat");
    remove("data/test_collections.dat");
    remove("data/test_hubs.dat");
    remove("data/test_hub_transactions.dat");
    remove("data/test_vehicles.dat");
    remove("data/test_routes.dat");
    remove("data/test_route_stops.dat");
    remove("data/test_recycling_batches.dat");
    remove("data/test_incidents.dat");
    remove("data/test_qr_events.dat");
    remove("data/test_vehicle_inspections.dat");
}

void test_empty_database() {
    printf("Testing empty database behavior...\n");
    AnalyticsFilter filter;
    memset(&filter, 0, sizeof(AnalyticsFilter));
    filter.timeFilter = TIME_FILTER_ALL;

    AnalyticsSummary summary;
    calculateAnalyticsSummary(&filter, &summary);

    assert(summary.totalResidents >= 0);
    assert(summary.totalCollectionRequests >= 0);
    assert(summary.totalWasteCollectedKg >= 0.0f);
    assert(summary.operationalEfficiencyIndex >= 0.0f && summary.operationalEfficiencyIndex <= 100.0f);

    CollectionAnalytics coll;
    calculateCollectionAnalytics(&filter, &coll);
    assert(coll.totalRequests >= 0);

    FleetAnalytics fleet;
    calculateFleetAnalytics(&filter, &fleet);
    assert(fleet.totalVehicles >= 0);

    RouteAnalytics route;
    calculateRouteAnalytics(&filter, &route);
    assert(route.totalRoutes >= 0);

    RecyclingAnalytics rec;
    calculateRecyclingAnalytics(&filter, &rec);
    assert(rec.totalBatches >= 0);

    IncidentAnalytics inc;
    calculateIncidentAnalytics(&filter, &inc);
    assert(inc.totalIncidents >= 0);

    QRAnalytics qr;
    calculateQRAnalytics(&filter, &qr);
    assert(qr.totalScans >= 0);
    printf("-> Empty database tests passed!\n");
}

void test_efficiency_index_formula() {
    printf("Testing Operational Efficiency Index Formula...\n");
    AnalyticsSummary s;
    memset(&s, 0, sizeof(AnalyticsSummary));

    // Perfect scores
    s.totalCollectionRequests = 100;
    s.completedCollections = 100;
    s.totalHubs = 5;
    s.criticalHubs = 0;
    s.totalRoutes = 10;
    s.completedRoutes = 10;
    s.totalVehicles = 10;
    s.activeVehicles = 10;
    s.totalQrScans = 50;
    s.successfulQrScans = 50;
    s.qrComplianceRate = 100.0f;
    s.totalWasteProcessedKg = 1000.0f;
    s.totalRecoveredKg = 900.0f;
    s.totalIncidents = 5;
    s.openIncidents = 0;

    float eff = calculateMunicipalOperationalEfficiency(&s);
    assert(eff >= 95.0f && eff <= 100.0f);

    // Degraded scenario
    s.completedCollections = 50; // 50%
    s.criticalHubs = 3;          // High penalty
    s.completedRoutes = 4;       // 40%
    s.activeVehicles = 5;        // 50%
    s.openIncidents = 5;         // 0% resolved
    float degradedEff = calculateMunicipalOperationalEfficiency(&s);
    assert(degradedEff < eff);
    assert(degradedEff >= 0.0f && degradedEff <= 100.0f);
    printf("-> Efficiency Index tests passed! (Perfect: %.2f%%, Degraded: %.2f%%)\n", eff, degradedEff);
}

void test_date_filters() {
    printf("Testing date filtering logic...\n");
    AnalyticsFilter filter;
    memset(&filter, 0, sizeof(AnalyticsFilter));

    filter.timeFilter = TIME_FILTER_ALL;
    assert(isDateInFilter("2026-08-24 10:00:00", &filter) == 1);

    filter.timeFilter = TIME_FILTER_CUSTOM;
    strcpy(filter.fromDate, "2026-08-01");
    strcpy(filter.toDate, "2026-08-20");

    assert(isDateInFilter("2026-08-15 12:00:00", &filter) == 1);
    assert(isDateInFilter("2026-07-31 23:59:59", &filter) == 0);
    assert(isDateInFilter("2026-08-21 00:00:00", &filter) == 0);
    printf("-> Date filter tests passed!\n");
}

void test_csv_export() {
    printf("Testing CSV Report Exports...\n");
    AnalyticsFilter filter;
    memset(&filter, 0, sizeof(AnalyticsFilter));
    filter.timeFilter = TIME_FILTER_ALL;

    char buffer[4096];
    int len = exportCollectionReportCSV(&filter, buffer, sizeof(buffer));
    assert(len > 0);
    assert(strstr(buffer, "CollectionId") != NULL);

    len = exportHubInventoryReportCSV(&filter, buffer, sizeof(buffer));
    assert(len > 0);
    assert(strstr(buffer, "HubId") != NULL);

    len = exportFleetReportCSV(&filter, buffer, sizeof(buffer));
    assert(len > 0);
    assert(strstr(buffer, "VehicleId") != NULL);

    len = exportRouteReportCSV(&filter, buffer, sizeof(buffer));
    assert(len > 0);
    assert(strstr(buffer, "RouteId") != NULL);

    len = exportRecyclingReportCSV(&filter, buffer, sizeof(buffer));
    assert(len > 0);
    assert(strstr(buffer, "BatchId") != NULL);

    len = exportIncidentReportCSV(&filter, buffer, sizeof(buffer));
    assert(len > 0);
    assert(strstr(buffer, "IncidentId") != NULL);

    len = exportWasteStreamReportCSV(&filter, buffer, sizeof(buffer));
    assert(len > 0);
    assert(strstr(buffer, "WasteType") != NULL);
    printf("-> CSV Report Export tests passed!\n");
}

int main() {
    printf("============================================================\n");
    printf("RUNNING PHASE 9 ANALYTICS & INTELLIGENCE TESTS\n");
    printf("============================================================\n");

    cleanTestFiles();
    test_empty_database();
    test_efficiency_index_formula();
    test_date_filters();
    test_csv_export();

    printf("============================================================\n");
    printf("ALL PHASE 9 TESTS PASSED SUCCESSFULLY!\n");
    printf("============================================================\n");
    return 0;
}
