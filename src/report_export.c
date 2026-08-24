#include "report_export.h"
#include <stdio.h>
#include <string.h>

static void sanitizeCSV(char *dest, size_t dsz, const char *src) {
    size_t i = 0, di = 0;
    if (!src || !dest || dsz == 0) return;
    while (src[i] && di + 1 < dsz) {
        unsigned char c = (unsigned char)src[i];
        if (c >= 32 && c <= 126 && c != '"') {
            dest[di++] = (char)c;
        } else if (c == '"') {
            dest[di++] = '\'';
        }
        i++;
    }
    dest[di] = 0;
}

int exportCollectionReportCSV(const AnalyticsFilter* filter, char* outBuffer, int maxBufferLen) {
    if (!outBuffer || maxBufferLen <= 0) return -1;

    int offset = snprintf(outBuffer, maxBufferLen, "CollectionId,ResidentId,HubId,CleanerId,WasteType,EstimatedKg,ActualKg,Status,Priority,CreatedAt,CompletedAt\n");
    if (offset >= maxBufferLen) return -1;

    FILE* fp = fopen(COLLECTIONS_FILE, "rb");
    if (!fp) return offset;

    CollectionRequest req;
    while (fread(&req, sizeof(CollectionRequest), 1, fp) == 1) {
        if (filter && filter->hubId > 0 && req.hubId != filter->hubId) continue;
        if (filter && filter->cleanerId > 0 && req.cleanerId != filter->cleanerId) continue;
        if (filter && filter->residentId > 0 && req.residentId != filter->residentId) continue;
        if (!isDateInFilter(req.createdAt, filter)) continue;

        char wt[64], pri[32], cat[32], com[32];
        sanitizeCSV(wt, sizeof(wt), req.wasteType);
        sanitizeCSV(pri, sizeof(pri), req.priorityLevel);
        sanitizeCSV(cat, sizeof(cat), req.createdAt);
        sanitizeCSV(com, sizeof(com), req.completedAt);

        int written = snprintf(outBuffer + offset, maxBufferLen - offset, 
            "%d,%d,%d,%d,\"%s\",%.2f,%.2f,%d,\"%s\",\"%s\",\"%s\"\n",
            req.collectionId, req.residentId, req.hubId, req.cleanerId,
            wt, req.estimatedWeightKg, req.actualWeightKg,
            (int)req.status, pri, cat, com);
        if (written < 0 || offset + written >= maxBufferLen) break;
        offset += written;
    }
    fclose(fp);
    return offset;
}

int exportHubInventoryReportCSV(const AnalyticsFilter* filter, char* outBuffer, int maxBufferLen) {
    if (!outBuffer || maxBufferLen <= 0) return -1;

    int offset = snprintf(outBuffer, maxBufferLen, "HubId,HubCode,Name,MaxCapacityKg,CurrentInventoryKg,UtilizationPct,Status,InboundKg,OutboundKg\n");
    if (offset >= maxBufferLen) return -1;

    HubAnalyticsItem items[50];
    int count = getHubAnalyticsList(filter, items, 50);

    for (int i = 0; i < count; i++) {
        char cleanName[128], cleanCode[64];
        sanitizeCSV(cleanName, sizeof(cleanName), items[i].name);
        sanitizeCSV(cleanCode, sizeof(cleanCode), items[i].hubCode);

        int written = snprintf(outBuffer + offset, maxBufferLen - offset,
            "%d,\"%s\",\"%s\",%.2f,%.2f,%.2f,%d,%.2f,%.2f\n",
            items[i].hubId, cleanCode, cleanName,
            items[i].maximumCapacityKg, items[i].currentInventoryKg,
            items[i].utilizationPercentage, (int)items[i].status,
            items[i].inboundKg, items[i].outboundKg);
        if (written < 0 || offset + written >= maxBufferLen) break;
        offset += written;
    }
    return offset;
}

int exportFleetReportCSV(const AnalyticsFilter* filter, char* outBuffer, int maxBufferLen) {
    if (!outBuffer || maxBufferLen <= 0) return -1;

    int offset = snprintf(outBuffer, maxBufferLen, "VehicleId,Registration,Type,CapacityKg,CurrentLoadKg,UtilizationPct,Status,LastInspectionDate,LastInspectionStatus\n");
    if (offset >= maxBufferLen) return -1;

    VehicleAnalyticsItem items[50];
    int count = getVehicleAnalyticsList(filter, items, 50);

    for (int i = 0; i < count; i++) {
        char reg[64], type[64], inspDate[64];
        sanitizeCSV(reg, sizeof(reg), items[i].registrationNumber);
        sanitizeCSV(type, sizeof(type), items[i].vehicleType);
        sanitizeCSV(inspDate, sizeof(inspDate), items[i].lastInspectionDate);

        int written = snprintf(outBuffer + offset, maxBufferLen - offset,
            "%d,\"%s\",\"%s\",%.2f,%.2f,%.2f,%d,\"%s\",%d\n",
            items[i].vehicleId, reg, type,
            items[i].capacityKg, items[i].currentLoadKg,
            items[i].utilizationPercentage, (int)items[i].status,
            inspDate, (int)items[i].lastInspectionStatus);
        if (written < 0 || offset + written >= maxBufferLen) break;
        offset += written;
    }
    return offset;
}

int exportRouteReportCSV(const AnalyticsFilter* filter, char* outBuffer, int maxBufferLen) {
    if (!outBuffer || maxBufferLen <= 0) return -1;

    int offset = snprintf(outBuffer, maxBufferLen, "RouteId,RouteType,DriverId,VehicleId,OriginId,DestinationId,TotalWeightKg,Stops,CompletedStops,Status,DurationMin\n");
    if (offset >= maxBufferLen) return -1;

    RouteAnalyticsItem items[100];
    int count = getRouteAnalyticsList(filter, items, 100);

    for (int i = 0; i < count; i++) {
        char rtype[64];
        sanitizeCSV(rtype, sizeof(rtype), items[i].routeType);

        int written = snprintf(outBuffer + offset, maxBufferLen - offset,
            "%d,\"%s\",%d,%d,%d,%d,%.2f,%d,%d,%d,%.2f\n",
            items[i].routeId, rtype, items[i].driverId, items[i].vehicleId,
            items[i].originId, items[i].destinationId, items[i].totalWeightKg,
            items[i].stopCount, items[i].completedStopCount, (int)items[i].status,
            items[i].durationMinutes);
        if (written < 0 || offset + written >= maxBufferLen) break;
        offset += written;
    }
    return offset;
}

int exportRecyclingReportCSV(const AnalyticsFilter* filter, char* outBuffer, int maxBufferLen) {
    if (!outBuffer || maxBufferLen <= 0) return -1;

    int offset = snprintf(outBuffer, maxBufferLen, "BatchId,BatchCode,FacilityId,SourceTransferId,SourceHubId,InputKg,ProcessedKg,RecoveredKg,ResidualKg,Status,CreatedAt\n");
    if (offset >= maxBufferLen) return -1;

    FILE* fp = fopen(RECYCLING_BATCHES_FILE, "rb");
    if (!fp) return offset;

    RecyclingBatch b;
    while (fread(&b, sizeof(RecyclingBatch), 1, fp) == 1) {
        if (filter && filter->facilityId > 0 && b.facilityId != filter->facilityId) continue;
        if (!isDateInFilter(b.createdAt, filter)) continue;

        char code[64], cat[32];
        sanitizeCSV(code, sizeof(code), b.batchCode);
        sanitizeCSV(cat, sizeof(cat), b.createdAt);

        int written = snprintf(outBuffer + offset, maxBufferLen - offset,
            "%d,\"%s\",%d,%d,%d,%.2f,%.2f,%.2f,%.2f,%d,\"%s\"\n",
            b.batchId, code, b.facilityId, b.sourceTransferId, b.sourceHubId,
            b.inputWeightKg, b.processedWeightKg, b.recoveredWeightKg, b.residualWeightKg,
            (int)b.status, cat);
        if (written < 0 || offset + written >= maxBufferLen) break;
        offset += written;
    }
    fclose(fp);
    return offset;
}

int exportIncidentReportCSV(const AnalyticsFilter* filter, char* outBuffer, int maxBufferLen) {
    if (!outBuffer || maxBufferLen <= 0) return -1;

    int offset = snprintf(outBuffer, maxBufferLen, "IncidentId,Type,Severity,CollectionId,ReportedBy,Status,Description,CreatedAt,ResolvedAt\n");
    if (offset >= maxBufferLen) return -1;

    FILE* fp = fopen(INCIDENTS_FILE, "rb");
    if (!fp) return offset;

    Incident inc;
    while (fread(&inc, sizeof(Incident), 1, fp) == 1) {
        if (!isDateInFilter(inc.createdAt, filter)) continue;

        char type[64], sev[32], st[32], desc[256], cat[32], res[32];
        sanitizeCSV(type, sizeof(type), inc.type);
        sanitizeCSV(sev, sizeof(sev), inc.severity);
        sanitizeCSV(st, sizeof(st), inc.status);
        sanitizeCSV(desc, sizeof(desc), inc.description);
        sanitizeCSV(cat, sizeof(cat), inc.createdAt);
        sanitizeCSV(res, sizeof(res), inc.resolvedAt);

        int written = snprintf(outBuffer + offset, maxBufferLen - offset,
            "%d,\"%s\",\"%s\",%d,%d,\"%s\",\"%s\",\"%s\",\"%s\"\n",
            inc.incidentId, type, sev, inc.collectionId,
            inc.reportedBy, st, desc, cat, res);
        if (written < 0 || offset + written >= maxBufferLen) break;
        offset += written;
    }
    fclose(fp);
    return offset;
}

int exportWasteStreamReportCSV(const AnalyticsFilter* filter, char* outBuffer, int maxBufferLen) {
    if (!outBuffer || maxBufferLen <= 0) return -1;

    int offset = snprintf(outBuffer, maxBufferLen, "WasteType,CollectedKg,ProcessedKg,RecoveredKg,ResidualKg,PercentageOfTotal\n");
    if (offset >= maxBufferLen) return -1;

    WasteTypeAnalyticsItem items[20];
    int count = getWasteTypeAnalytics(filter, items, 20);

    for (int i = 0; i < count; i++) {
        char wt[64];
        sanitizeCSV(wt, sizeof(wt), items[i].wasteType);

        int written = snprintf(outBuffer + offset, maxBufferLen - offset,
            "\"%s\",%.2f,%.2f,%.2f,%.2f,%.2f\n",
            wt, items[i].collectedKg, items[i].processedKg,
            items[i].recoveredKg, items[i].residualKg, items[i].percentageOfTotal);
        if (written < 0 || offset + written >= maxBufferLen) break;
        offset += written;
    }
    return offset;
}
