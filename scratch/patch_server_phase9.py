import re

server_path = r"C:\Users\Hp\.gemini\antigravity-ide\scratch\smart-waste-management\src\server.c"
with open(server_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add headers if not present
if '#include "analytics.h"' not in content:
    content = content.replace('#include "qr.h"', '#include "qr.h"\n#include "analytics.h"\n#include "report_export.h"')

# 2. Add Phase 9 handlers
handlers_code = """
// ─────────────────────────────────────────────────────────────
// PHASE 9: ANALYTICS & EXECUTIVE COMMAND CENTER HANDLERS
// ─────────────────────────────────────────────────────────────

static void parseAnalyticsFilter(struct mg_http_message *hm, AnalyticsFilter *f) {
    memset(f, 0, sizeof(AnalyticsFilter));
    f->timeFilter = TIME_FILTER_ALL;

    char tfStr[32] = "";
    if (mg_http_get_var(&hm->query, "timeFilter", tfStr, sizeof(tfStr)) > 0 ||
        mg_http_get_var(&hm->query, "filter", tfStr, sizeof(tfStr)) > 0 ||
        mg_http_get_var(&hm->query, "range", tfStr, sizeof(tfStr)) > 0) {
        if (strcmp(tfStr, "today") == 0 || strcmp(tfStr, "TODAY") == 0) f->timeFilter = TIME_FILTER_TODAY;
        else if (strcmp(tfStr, "yesterday") == 0 || strcmp(tfStr, "YESTERDAY") == 0) f->timeFilter = TIME_FILTER_YESTERDAY;
        else if (strcmp(tfStr, "last_7_days") == 0 || strcmp(tfStr, "7d") == 0) f->timeFilter = TIME_FILTER_LAST_7_DAYS;
        else if (strcmp(tfStr, "last_30_days") == 0 || strcmp(tfStr, "30d") == 0) f->timeFilter = TIME_FILTER_LAST_30_DAYS;
        else if (strcmp(tfStr, "this_month") == 0) f->timeFilter = TIME_FILTER_THIS_MONTH;
        else if (strcmp(tfStr, "last_month") == 0) f->timeFilter = TIME_FILTER_LAST_MONTH;
        else if (strcmp(tfStr, "custom") == 0) f->timeFilter = TIME_FILTER_CUSTOM;
    }

    mg_http_get_var(&hm->query, "from", f->fromDate, sizeof(f->fromDate));
    mg_http_get_var(&hm->query, "to", f->toDate, sizeof(f->toDate));
    mg_http_get_var(&hm->query, "wasteType", f->wasteType, sizeof(f->wasteType));

    char numBuf[32];
    if (mg_http_get_var(&hm->query, "hubId", numBuf, sizeof(numBuf)) > 0) f->hubId = atoi(numBuf);
    if (mg_http_get_var(&hm->query, "facilityId", numBuf, sizeof(numBuf)) > 0) f->facilityId = atoi(numBuf);
    if (mg_http_get_var(&hm->query, "vehicleId", numBuf, sizeof(numBuf)) > 0) f->vehicleId = atoi(numBuf);
    if (mg_http_get_var(&hm->query, "driverId", numBuf, sizeof(numBuf)) > 0) f->driverId = atoi(numBuf);
    if (mg_http_get_var(&hm->query, "cleanerId", numBuf, sizeof(numBuf)) > 0) f->cleanerId = atoi(numBuf);
    if (mg_http_get_var(&hm->query, "residentId", numBuf, sizeof(numBuf)) > 0) f->residentId = atoi(numBuf);

    // Extract requester role & ID from headers or query
    char roleBuf[32] = "";
    struct mg_str *rHeader = mg_http_get_header(hm, "X-User-Role");
    if (rHeader && rHeader->len > 0) {
        snprintf(roleBuf, sizeof(roleBuf), "%.*s", (int)rHeader->len, rHeader->buf);
    } else {
        mg_http_get_var(&hm->query, "role", roleBuf, sizeof(roleBuf));
    }

    char idBuf[32] = "";
    struct mg_str *idHeader = mg_http_get_header(hm, "X-User-Id");
    if (idHeader && idHeader->len > 0) {
        snprintf(idBuf, sizeof(idBuf), "%.*s", (int)idHeader->len, idHeader->buf);
        f->requesterId = atoi(idBuf);
    } else if (mg_http_get_var(&hm->query, "userId", idBuf, sizeof(idBuf)) > 0) {
        f->requesterId = atoi(idBuf);
    }

    if (strcmp(roleBuf, "LOCAL_HUB_MANAGER") == 0) f->requesterRole = ROLE_LOCAL_HUB_MANAGER;
    else if (strcmp(roleBuf, "CLEANER") == 0) f->requesterRole = ROLE_CLEANER;
    else if (strcmp(roleBuf, "DRIVER") == 0) f->requesterRole = ROLE_DRIVER;
    else if (strcmp(roleBuf, "RECYCLING_MANAGER") == 0) f->requesterRole = ROLE_RECYCLING_MANAGER;
    else if (strcmp(roleBuf, "RESIDENT") == 0) f->requesterRole = ROLE_RESIDENT;
    else f->requesterRole = ROLE_ADMIN;
}

static void handleAnalyticsSummary(struct mg_connection *c, struct mg_http_message *hm) {
    AnalyticsFilter filter;
    parseAnalyticsFilter(hm, &filter);

    AnalyticsSummary s;
    calculateAnalyticsSummary(&filter, &s);

    char *buf = (char*)malloc(4096);
    if (!buf) { sendJsonResponse(c, 500, "{\\"error\\":\\"OOM\\"}"); return; }

    snprintf(buf, 4096,
        "{\\"totalResidents\\":%d,\\"activeResidents\\":%d,"
        "\\"totalCollectionRequests\\":%d,\\"completedCollections\\":%d,"
        "\\"pendingCollections\\":%d,\\"missedCollections\\":%d,\\"cancelledCollections\\":%d,"
        "\\"totalWasteCollectedKg\\":%.2f,\\"totalWasteTransferredKg\\":%.2f,"
        "\\"totalWasteProcessedKg\\":%.2f,\\"totalRecoveredKg\\":%.2f,\\"totalResidualKg\\":%.2f,"
        "\\"recyclingRecoveryRate\\":%.2f,\\"totalVehicles\\":%d,\\"activeVehicles\\":%d,"
        "\\"totalRoutes\\":%d,\\"activeRoutes\\":%d,\\"completedRoutes\\":%d,"
        "\\"totalHubs\\":%d,\\"activeHubs\\":%d,\\"criticalHubs\\":%d,"
        "\\"totalIncidents\\":%d,\\"openIncidents\\":%d,"
        "\\"totalQrScans\\":%d,\\"successfulQrScans\\":%d,\\"qrComplianceRate\\":%.2f,"
        "\\"operationalEfficiencyIndex\\":%.2f}",
        s.totalResidents, s.activeResidents,
        s.totalCollectionRequests, s.completedCollections,
        s.pendingCollections, s.missedCollections, s.cancelledCollections,
        s.totalWasteCollectedKg, s.totalWasteTransferredKg,
        s.totalWasteProcessedKg, s.totalRecoveredKg, s.totalResidualKg,
        s.recyclingRecoveryRate, s.totalVehicles, s.activeVehicles,
        s.totalRoutes, s.activeRoutes, s.completedRoutes,
        s.totalHubs, s.activeHubs, s.criticalHubs,
        s.totalIncidents, s.openIncidents,
        s.totalQrScans, s.successfulQrScans, s.qrComplianceRate,
        s.operationalEfficiencyIndex);

    sendJsonResponse(c, 200, buf);
    free(buf);
}

static void handleAnalyticsCollections(struct mg_connection *c, struct mg_http_message *hm) {
    AnalyticsFilter filter;
    parseAnalyticsFilter(hm, &filter);

    CollectionAnalytics coll;
    calculateCollectionAnalytics(&filter, &coll);

    char buf[1024];
    snprintf(buf, sizeof(buf),
        "{\\"totalRequests\\":%d,\\"completedRequests\\":%d,\\"pendingRequests\\":%d,"
        "\\"assignedRequests\\":%d,\\"enRouteRequests\\":%d,\\"collectingRequests\\":%d,"
        "\\"missedRequests\\":%d,\\"cancelledRequests\\":%d,\\"rescheduledRequests\\":%d,"
        "\\"totalCollectedKg\\":%.2f,\\"averageCollectionWeightKg\\":%.2f,"
        "\\"averageCompletionTimeMin\\":%.2f,\\"collectionSuccessRate\\":%.2f,"
        "\\"missedCollectionRate\\":%.2f,"
        "\\"priorities\\":{\\"low\\":%d,\\"normal\\":%d,\\"high\\":%d,\\"urgent\\":%d}}",
        coll.totalRequests, coll.completedRequests, coll.pendingRequests,
        coll.assignedRequests, coll.enRouteRequests, coll.collectingRequests,
        coll.missedRequests, coll.cancelledRequests, coll.rescheduledRequests,
        coll.totalCollectedKg, coll.averageCollectionWeightKg,
        coll.averageCompletionTimeMin, coll.collectionSuccessRate,
        coll.missedCollectionRate,
        coll.priorityLow, coll.priorityNormal, coll.priorityHigh, coll.priorityUrgent);

    sendJsonResponse(c, 200, buf);
}

static void handleAnalyticsHubs(struct mg_connection *c, struct mg_http_message *hm) {
    AnalyticsFilter filter;
    parseAnalyticsFilter(hm, &filter);

    HubAnalyticsItem items[50];
    int count = getHubAnalyticsList(&filter, items, 50);

    char *buf = (char*)malloc(32768);
    if (!buf) { sendJsonResponse(c, 500, "{\\"error\\":\\"OOM\\"}"); return; }

    int offset = snprintf(buf, 32768, "[");
    for (int i = 0; i < count; i++) {
        char name[128], code[64];
        jsonStr(name, sizeof(name), items[i].name);
        jsonStr(code, sizeof(code), items[i].hubCode);

        int written = snprintf(buf + offset, 32768 - offset,
            "%s{\\"hubId\\":%d,\\"hubCode\\":\\"%s\\",\\"name\\":\\"%s\\","
            "\\"maximumCapacityKg\\":%.2f,\\"currentInventoryKg\\":%.2f,"
            "\\"availableCapacityKg\\":%.2f,\\"utilizationPercentage\\":%.2f,"
            "\\"inboundKg\\":%.2f,\\"outboundKg\\":%.2f,"
            "\\"activeCleaners\\":%d,\\"pendingCollections\\":%d,\\"pendingTransfers\\":%d,"
            "\\"status\\":%d,\\"alertCount\\":%d}",
            (i == 0 ? "" : ","),
            items[i].hubId, code, name,
            items[i].maximumCapacityKg, items[i].currentInventoryKg,
            items[i].availableCapacityKg, items[i].utilizationPercentage,
            items[i].inboundKg, items[i].outboundKg,
            items[i].activeCleaners, items[i].pendingCollections, items[i].pendingTransfers,
            (int)items[i].status, items[i].alertCount);
        if (written < 0 || offset + written >= 32768) break;
        offset += written;
    }
    snprintf(buf + offset, 32768 - offset, "]");

    sendJsonResponse(c, 200, buf);
    free(buf);
}

static void handleAnalyticsFleet(struct mg_connection *c, struct mg_http_message *hm) {
    AnalyticsFilter filter;
    parseAnalyticsFilter(hm, &filter);

    FleetAnalytics fleet;
    calculateFleetAnalytics(&filter, &fleet);

    VehicleAnalyticsItem vItems[50];
    int vCount = getVehicleAnalyticsList(&filter, vItems, 50);

    char *buf = (char*)malloc(32768);
    if (!buf) { sendJsonResponse(c, 500, "{\\"error\\":\\"OOM\\"}"); return; }

    int offset = snprintf(buf, 32768,
        "{\\"totalVehicles\\":%d,\\"activeVehicles\\":%d,\\"inactiveVehicles\\":%d,"
        "\\"underMaintenance\\":%d,\\"availableVehicles\\":%d,\\"assignedVehicles\\":%d,"
        "\\"onRouteVehicles\\":%d,\\"atCapacityVehicles\\":%d,"
        "\\"totalFleetCapacityKg\\":%.2f,\\"currentFleetLoadKg\\":%.2f,"
        "\\"fleetUtilizationPercentage\\":%.2f,\\"inspectionPasses\\":%d,\\"inspectionFailures\\":%d,"
        "\\"vehicles\\":[",
        fleet.totalVehicles, fleet.activeVehicles, fleet.inactiveVehicles,
        fleet.underMaintenance, fleet.availableVehicles, fleet.assignedVehicles,
        fleet.onRouteVehicles, fleet.atCapacityVehicles,
        fleet.totalFleetCapacityKg, fleet.currentFleetLoadKg,
        fleet.fleetUtilizationPercentage, fleet.inspectionPasses, fleet.inspectionFailures);

    for (int i = 0; i < vCount; i++) {
        char reg[64], type[64], inspDate[64];
        jsonStr(reg, sizeof(reg), vItems[i].registrationNumber);
        jsonStr(type, sizeof(type), vItems[i].vehicleType);
        jsonStr(inspDate, sizeof(inspDate), vItems[i].lastInspectionDate);

        int written = snprintf(buf + offset, 32768 - offset,
            "%s{\\"vehicleId\\":%d,\\"registrationNumber\\":\\"%s\\",\\"vehicleType\\":\\"%s\\","
            "\\"capacityKg\\":%.2f,\\"currentLoadKg\\":%.2f,\\"utilizationPercentage\\":%.2f,"
            "\\"driverId\\":%d,\\"status\\":%d,\\"lastInspectionDate\\":\\"%s\\",\\"lastInspectionStatus\\":%d}",
            (i == 0 ? "" : ","),
            vItems[i].vehicleId, reg, type,
            vItems[i].capacityKg, vItems[i].currentLoadKg, vItems[i].utilizationPercentage,
            vItems[i].driverId, (int)vItems[i].status, inspDate, (int)vItems[i].lastInspectionStatus);
        if (written < 0 || offset + written >= 32768) break;
        offset += written;
    }
    snprintf(buf + offset, 32768 - offset, "]}");

    sendJsonResponse(c, 200, buf);
    free(buf);
}

static void handleAnalyticsRoutes(struct mg_connection *c, struct mg_http_message *hm) {
    AnalyticsFilter filter;
    parseAnalyticsFilter(hm, &filter);

    RouteAnalytics route;
    calculateRouteAnalytics(&filter, &route);

    RouteAnalyticsItem rItems[50];
    int rCount = getRouteAnalyticsList(&filter, rItems, 50);

    char *buf = (char*)malloc(32768);
    if (!buf) { sendJsonResponse(c, 500, "{\\"error\\":\\"OOM\\"}"); return; }

    int offset = snprintf(buf, 32768,
        "{\\"totalRoutes\\":%d,\\"plannedRoutes\\":%d,\\"dispatchedRoutes\\":%d,"
        "\\"acceptedRoutes\\":%d,\\"activeRoutes\\":%d,\\"completedRoutes\\":%d,"
        "\\"cancelledRoutes\\":%d,\\"averageRouteDurationMin\\":%.2f,"
        "\\"averageStopsPerRoute\\":%.2f,\\"totalStops\\":%d,\\"completedStops\\":%d,"
        "\\"pendingStops\\":%d,\\"routeUtilizationPercentage\\":%.2f,"
        "\\"routes\\":[",
        route.totalRoutes, route.plannedRoutes, route.dispatchedRoutes,
        route.acceptedRoutes, route.activeRoutes, route.completedRoutes,
        route.cancelledRoutes, route.averageRouteDurationMin,
        route.averageStopsPerRoute, route.totalStops, route.completedStops,
        route.pendingStops, route.routeUtilizationPercentage);

    for (int i = 0; i < rCount; i++) {
        char type[64];
        jsonStr(type, sizeof(type), rItems[i].routeType);

        int written = snprintf(buf + offset, 32768 - offset,
            "%s{\\"routeId\\":%d,\\"routeType\\":\\"%s\\",\\"driverId\\":%d,"
            "\\"vehicleId\\":%d,\\"originId\\":%d,\\"destinationId\\":%d,"
            "\\"stopCount\\":%d,\\"completedStopCount\\":%d,\\"totalWeightKg\\":%.2f,"
            "\\"status\\":%d,\\"durationMinutes\\":%.2f}",
            (i == 0 ? "" : ","),
            rItems[i].routeId, type, rItems[i].driverId,
            rItems[i].vehicleId, rItems[i].originId, rItems[i].destinationId,
            rItems[i].stopCount, rItems[i].completedStopCount, rItems[i].totalWeightKg,
            (int)rItems[i].status, rItems[i].durationMinutes);
        if (written < 0 || offset + written >= 32768) break;
        offset += written;
    }
    snprintf(buf + offset, 32768 - offset, "]}");

    sendJsonResponse(c, 200, buf);
    free(buf);
}

static void handleAnalyticsRecycling(struct mg_connection *c, struct mg_http_message *hm) {
    AnalyticsFilter filter;
    parseAnalyticsFilter(hm, &filter);

    RecyclingAnalytics rec;
    calculateRecyclingAnalytics(&filter, &rec);

    char buf[1024];
    snprintf(buf, sizeof(buf),
        "{\\"totalInputKg\\":%.2f,\\"totalClassifiedKg\\":%.2f,\\"totalSegregatedKg\\":%.2f,"
        "\\"totalProcessedKg\\":%.2f,\\"totalRecoveredKg\\":%.2f,\\"totalResidualKg\\":%.2f,"
        "\\"recoveryRate\\":%.2f,\\"residualRate\\":%.2f,\\"processingLossKg\\":%.2f,"
        "\\"processingLossRate\\":%.2f,\\"totalBatches\\":%d,\\"activeBatches\\":%d,\\"completedBatches\\":%d}",
        rec.totalInputKg, rec.totalClassifiedKg, rec.totalSegregatedKg,
        rec.totalProcessedKg, rec.totalRecoveredKg, rec.totalResidualKg,
        rec.recoveryRate, rec.residualRate, rec.processingLossKg,
        rec.processingLossRate, rec.totalBatches, rec.activeBatches, rec.completedBatches);

    sendJsonResponse(c, 200, buf);
}

static void handleAnalyticsWasteTypes(struct mg_connection *c, struct mg_http_message *hm) {
    AnalyticsFilter filter;
    parseAnalyticsFilter(hm, &filter);

    WasteTypeAnalyticsItem items[20];
    int count = getWasteTypeAnalytics(&filter, items, 20);

    char buf[4096];
    int offset = snprintf(buf, sizeof(buf), "[");
    for (int i = 0; i < count; i++) {
        char wt[64];
        jsonStr(wt, sizeof(wt), items[i].wasteType);

        int written = snprintf(buf + offset, sizeof(buf) - offset,
            "%s{\\"wasteType\\":\\"%s\\",\\"collectedKg\\":%.2f,\\"processedKg\\":%.2f,"
            "\\"recoveredKg\\":%.2f,\\"residualKg\\":%.2f,\\"percentageOfTotal\\":%.2f}",
            (i == 0 ? "" : ","),
            wt, items[i].collectedKg, items[i].processedKg,
            items[i].recoveredKg, items[i].residualKg, items[i].percentageOfTotal);
        if (written < 0 || offset + written >= (int)sizeof(buf)) break;
        offset += written;
    }
    snprintf(buf + offset, sizeof(buf) - offset, "]");

    sendJsonResponse(c, 200, buf);
}

static void handleAnalyticsIncidents(struct mg_connection *c, struct mg_http_message *hm) {
    AnalyticsFilter filter;
    parseAnalyticsFilter(hm, &filter);

    IncidentAnalytics inc;
    calculateIncidentAnalytics(&filter, &inc);

    char buf[1024];
    snprintf(buf, sizeof(buf),
        "{\\"totalIncidents\\":%d,\\"openIncidents\\":%d,\\"resolvedIncidents\\":%d,"
        "\\"severity\\":{\\"critical\\":%d,\\"high\\":%d,\\"medium\\":%d,\\"low\\":%d},"
        "\\"types\\":{\\"missedCollection\\":%d,\\"weightVariance\\":%d,\\"vehicleFailure\\":%d,"
        "\\"qrFailure\\":%d,\\"capacityOverflow\\":%d,\\"routeException\\":%d,"
        "\\"facilityRejection\\":%d,\\"safety\\":%d,\\"other\\":%d}}",
        inc.totalIncidents, inc.openIncidents, inc.resolvedIncidents,
        inc.criticalIncidents, inc.highSeverityIncidents, inc.mediumSeverityIncidents, inc.lowSeverityIncidents,
        inc.missedCollectionCount, inc.weightVarianceCount, inc.vehicleFailureCount,
        inc.qrFailureCount, inc.capacityOverflowCount, inc.routeExceptionCount,
        inc.facilityRejectionCount, inc.safetyCount, inc.otherCount);

    sendJsonResponse(c, 200, buf);
}

static void handleAnalyticsQR(struct mg_connection *c, struct mg_http_message *hm) {
    AnalyticsFilter filter;
    parseAnalyticsFilter(hm, &filter);

    QRAnalytics qr;
    calculateQRAnalytics(&filter, &qr);

    char buf[1024];
    snprintf(buf, sizeof(buf),
        "{\\"totalScans\\":%d,\\"successfulScans\\":%d,\\"failedScans\\":%d,"
        "\\"complianceRate\\":%.2f,"
        "\\"byType\\":{\\"vehicle\\":%d,\\"hub\\":%d,\\"route\\":%d,\\"stop\\":%d,\\"facility\\":%d}}",
        qr.totalScans, qr.successfulScans, qr.failedScans, qr.complianceRate,
        qr.vehicleScans, qr.hubScans, qr.routeScans, qr.stopScans, qr.facilityScans);

    sendJsonResponse(c, 200, buf);
}

static void handleAnalyticsDrivers(struct mg_connection *c, struct mg_http_message *hm) {
    AnalyticsFilter filter;
    parseAnalyticsFilter(hm, &filter);

    DriverPerformanceItem items[50];
    int count = getDriverPerformanceList(&filter, items, 50);

    char *buf = (char*)malloc(16384);
    if (!buf) { sendJsonResponse(c, 500, "{\\"error\\":\\"OOM\\"}"); return; }

    int offset = snprintf(buf, 16384, "[");
    for (int i = 0; i < count; i++) {
        char name[128], code[64];
        jsonStr(name, sizeof(name), items[i].name);
        jsonStr(code, sizeof(code), items[i].employeeCode);

        int written = snprintf(buf + offset, 16384 - offset,
            "%s{\\"driverId\\":%d,\\"name\\":\\"%s\\",\\"employeeCode\\":\\"%s\\","
            "\\"assignedRoutes\\":%d,\\"acceptedRoutes\\":%d,\\"completedRoutes\\":%d,"
            "\\"cancelledRoutes\\":%d,\\"completedStops\\":%d,\\"missedStops\\":%d,"
            "\\"totalCollectedKg\\":%.2f,\\"averageRouteCompletionTimeMin\\":%.2f,"
            "\\"weightVarianceIncidents\\":%d,\\"qrScanFailures\\":%d,\\"inspectionFailures\\":%d,"
            "\\"performanceScore\\":%.2f}",
            (i == 0 ? "" : ","),
            items[i].driverId, name, code,
            items[i].assignedRoutes, items[i].acceptedRoutes, items[i].completedRoutes,
            items[i].cancelledRoutes, items[i].completedStops, items[i].missedStops,
            items[i].totalCollectedKg, items[i].averageRouteCompletionTimeMin,
            items[i].weightVarianceIncidents, items[i].qrScanFailures, items[i].inspectionFailures,
            items[i].performanceScore);
        if (written < 0 || offset + written >= 16384) break;
        offset += written;
    }
    snprintf(buf + offset, 16384 - offset, "]");

    sendJsonResponse(c, 200, buf);
    free(buf);
}

static void handleAnalyticsCleaners(struct mg_connection *c, struct mg_http_message *hm) {
    AnalyticsFilter filter;
    parseAnalyticsFilter(hm, &filter);

    CleanerPerformanceItem items[50];
    int count = getCleanerPerformanceList(&filter, items, 50);

    char *buf = (char*)malloc(16384);
    if (!buf) { sendJsonResponse(c, 500, "{\\"error\\":\\"OOM\\"}"); return; }

    int offset = snprintf(buf, 16384, "[");
    for (int i = 0; i < count; i++) {
        char name[128];
        jsonStr(name, sizeof(name), items[i].name);

        int written = snprintf(buf + offset, 16384 - offset,
            "%s{\\"cleanerId\\":%d,\\"name\\":\\"%s\\",\\"assignedHubId\\":%d,"
            "\\"assignedCollections\\":%d,\\"completedCollections\\":%d,\\"missedCollections\\":%d,"
            "\\"totalCollectedKg\\":%.2f,\\"averageCollectionWeightKg\\":%.2f,"
            "\\"weightVarianceIncidents\\":%d,\\"successfulDeposits\\":%d,"
            "\\"performanceScore\\":%.2f}",
            (i == 0 ? "" : ","),
            items[i].cleanerId, name, items[i].assignedHubId,
            items[i].assignedCollections, items[i].completedCollections, items[i].missedCollections,
            items[i].totalCollectedKg, items[i].averageCollectionWeightKg,
            items[i].weightVarianceIncidents, items[i].successfulDeposits,
            items[i].performanceScore);
        if (written < 0 || offset + written >= 16384) break;
        offset += written;
    }
    snprintf(buf + offset, 16384 - offset, "]");

    sendJsonResponse(c, 200, buf);
    free(buf);
}

static void handleAnalyticsFacilities(struct mg_connection *c, struct mg_http_message *hm) {
    AnalyticsFilter filter;
    parseAnalyticsFilter(hm, &filter);

    FacilityAnalyticsItem items[50];
    int count = getFacilityAnalyticsList(&filter, items, 50);

    char *buf = (char*)malloc(16384);
    if (!buf) { sendJsonResponse(c, 500, "{\\"error\\":\\"OOM\\"}"); return; }

    int offset = snprintf(buf, 16384, "[");
    for (int i = 0; i < count; i++) {
        char name[128], code[64], type[64], status[64];
        jsonStr(name, sizeof(name), items[i].name);
        jsonStr(code, sizeof(code), items[i].facilityCode);
        jsonStr(type, sizeof(type), items[i].facilityType);
        jsonStr(status, sizeof(status), items[i].currentOperationalStatus);

        int written = snprintf(buf + offset, 16384 - offset,
            "%s{\\"facilityId\\":%d,\\"facilityCode\\":\\"%s\\",\\"name\\":\\"%s\\",\\"facilityType\\":\\"%s\\","
            "\\"receivedKg\\":%.2f,\\"acceptedLoads\\":%d,\\"rejectedLoads\\":%d,\\"quarantinedLoads\\":%d,"
            "\\"activeBatches\\":%d,\\"completedBatches\\":%d,\\"recoveredKg\\":%.2f,\\"residualKg\\":%.2f,"
            "\\"recoveryRate\\":%.2f,\\"maximumDailyCapacityKg\\":%.2f,\\"currentOperationalStatus\\":\\"%s\\"}",
            (i == 0 ? "" : ","),
            items[i].facilityId, code, name, type,
            items[i].receivedKg, items[i].acceptedLoads, items[i].rejectedLoads, items[i].quarantinedLoads,
            items[i].activeBatches, items[i].completedBatches, items[i].recoveredKg, items[i].residualKg,
            items[i].recoveryRate, items[i].maximumDailyCapacityKg, status);
        if (written < 0 || offset + written >= 16384) break;
        offset += written;
    }
    snprintf(buf + offset, 16384 - offset, "]");

    sendJsonResponse(c, 200, buf);
    free(buf);
}

static void handleAnalyticsTrends(struct mg_connection *c, struct mg_http_message *hm) {
    AnalyticsFilter filter;
    parseAnalyticsFilter(hm, &filter);

    OperationalTrendItem items[30];
    int count = getOperationalTrends(&filter, items, 30);

    char buf[4096];
    int offset = snprintf(buf, sizeof(buf), "[");
    for (int i = 0; i < count; i++) {
        int written = snprintf(buf + offset, sizeof(buf) - offset,
            "%s{\\"date\\":\\"%s\\",\\"requests\\":%d,\\"completed\\":%d,\\"missed\\":%d,"
            "\\"wasteKg\\":%.2f,\\"recoveredKg\\":%.2f,\\"incidentCount\\":%d}",
            (i == 0 ? "" : ","),
            items[i].date, items[i].requests, items[i].completed, items[i].missed,
            items[i].wasteKg, items[i].recoveredKg, items[i].incidentCount);
        if (written < 0 || offset + written >= (int)sizeof(buf)) break;
        offset += written;
    }
    snprintf(buf + offset, sizeof(buf) - offset, "]");

    sendJsonResponse(c, 200, buf);
}

static void handleAnalyticsLiveFeed(struct mg_connection *c, struct mg_http_message *hm) {
    AnalyticsFilter filter;
    parseAnalyticsFilter(hm, &filter);

    LiveFeedEvent items[50];
    int count = getLiveFeedEvents(&filter, items, 50);

    char *buf = (char*)malloc(32768);
    if (!buf) { sendJsonResponse(c, 500, "{\\"error\\":\\"OOM\\"}"); return; }

    int offset = snprintf(buf, 32768, "[");
    for (int i = 0; i < count; i++) {
        char ts[64], type[64], title[128], desc[256], sev[32];
        jsonStr(ts, sizeof(ts), items[i].timestamp);
        jsonStr(type, sizeof(type), items[i].eventType);
        jsonStr(title, sizeof(title), items[i].title);
        jsonStr(desc, sizeof(desc), items[i].description);
        jsonStr(sev, sizeof(sev), items[i].severity);

        int written = snprintf(buf + offset, 32768 - offset,
            "%s{\\"eventId\\":%d,\\"timestamp\\":\\"%s\\",\\"eventType\\":\\"%s\\","
            "\\"title\\":\\"%s\\",\\"description\\":\\"%s\\",\\"severity\\":\\"%s\\",\\"actorId\\":%d}",
            (i == 0 ? "" : ","),
            items[i].eventId, ts, type, title, desc, sev, items[i].actorId);
        if (written < 0 || offset + written >= 32768) break;
        offset += written;
    }
    snprintf(buf + offset, 32768 - offset, "]");

    sendJsonResponse(c, 200, buf);
    free(buf);
}

static void handleReportsExport(struct mg_connection *c, struct mg_http_message *hm) {
    AnalyticsFilter filter;
    parseAnalyticsFilter(hm, &filter);

    char type[64] = "collection";
    mg_http_get_var(&hm->query, "type", type, sizeof(type));

    char *csvBuf = (char*)malloc(65536);
    if (!csvBuf) { sendJsonResponse(c, 500, "{\\"error\\":\\"OOM\\"}"); return; }
    csvBuf[0] = '\0';

    int len = 0;
    if (strcmp(type, "collection") == 0 || strcmp(type, "collections") == 0) {
        len = exportCollectionReportCSV(&filter, csvBuf, 65536);
    } else if (strcmp(type, "hub") == 0 || strcmp(type, "hubs") == 0 || strcmp(type, "inventory") == 0) {
        len = exportHubInventoryReportCSV(&filter, csvBuf, 65536);
    } else if (strcmp(type, "fleet") == 0 || strcmp(type, "vehicles") == 0) {
        len = exportFleetReportCSV(&filter, csvBuf, 65536);
    } else if (strcmp(type, "route") == 0 || strcmp(type, "routes") == 0) {
        len = exportRouteReportCSV(&filter, csvBuf, 65536);
    } else if (strcmp(type, "recycling") == 0) {
        len = exportRecyclingReportCSV(&filter, csvBuf, 65536);
    } else if (strcmp(type, "incident") == 0 || strcmp(type, "incidents") == 0) {
        len = exportIncidentReportCSV(&filter, csvBuf, 65536);
    } else if (strcmp(type, "waste") == 0 || strcmp(type, "waste_stream") == 0) {
        len = exportWasteStreamReportCSV(&filter, csvBuf, 65536);
    } else {
        len = exportCollectionReportCSV(&filter, csvBuf, 65536);
    }

    if (len >= 0) {
        char headers[256];
        snprintf(headers, sizeof(headers),
            "Content-Type: text/csv\\r\\n"
            "Content-Disposition: attachment; filename=\\"%s_report.csv\\"\\r\\n"
            "Access-Control-Allow-Origin: *\\r\\n"
            "Access-Control-Allow-Methods: GET, POST, OPTIONS\\r\\n",
            type);
        mg_http_reply(c, 200, headers, "%s", csvBuf);
    } else {
        sendJsonResponse(c, 500, "{\\"error\\":\\"Failed to export report\\"}");
    }

    free(csvBuf);
}
"""

# Insert handlers before handleLogin or handleDemoReset
if "handleAnalyticsSummary" not in content:
    idx = content.find("static void handleDemoReset")
    content = content[:idx] + handlers_code + "\n" + content[idx:]

# 3. Add routes in eventHandler
analytics_routes = """
    // Phase 9: Analytics & Reports APIs
    else if (isGet  && mg_match(hm->uri, mg_str("/api/analytics/summary"), NULL))      handleAnalyticsSummary(c, hm);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/analytics/collections"), NULL))  handleAnalyticsCollections(c, hm);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/analytics/hubs"), NULL))         handleAnalyticsHubs(c, hm);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/analytics/fleet"), NULL))        handleAnalyticsFleet(c, hm);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/analytics/routes"), NULL))       handleAnalyticsRoutes(c, hm);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/analytics/recycling"), NULL))    handleAnalyticsRecycling(c, hm);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/analytics/waste-types"), NULL))  handleAnalyticsWasteTypes(c, hm);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/analytics/incidents"), NULL))    handleAnalyticsIncidents(c, hm);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/analytics/qr"), NULL))           handleAnalyticsQR(c, hm);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/analytics/drivers"), NULL))      handleAnalyticsDrivers(c, hm);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/analytics/cleaners"), NULL))     handleAnalyticsCleaners(c, hm);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/analytics/facilities"), NULL))   handleAnalyticsFacilities(c, hm);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/analytics/trends"), NULL))       handleAnalyticsTrends(c, hm);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/analytics/live-feed"), NULL))    handleAnalyticsLiveFeed(c, hm);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/reports/export"), NULL))         handleReportsExport(c, hm);
"""

if "/api/analytics/summary" not in content:
    target_pos = content.find("else if (isGet  && mg_match(hm->uri, mg_str(\"/api/analytics/dashboard\"), NULL))")
    content = content[:target_pos] + analytics_routes + "    " + content[target_pos:]

with open(server_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated server.c with Phase 9 Analytics and Reports endpoints successfully")
