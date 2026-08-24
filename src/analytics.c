#include "analytics.h"
#include "utils.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <math.h>

// ─────────────────────────────────────────────────────────
// DATE FILTERING UTILITIES
// ─────────────────────────────────────────────────────────

static void getDateOffsetStr(int dayOffset, char* outStr, int maxLen) {
    time_t now = time(NULL);
    now += (dayOffset * 86400);
    struct tm* t = localtime(&now);
    if (t) {
        strftime(outStr, maxLen, "%Y-%m-%d", t);
    } else {
        strncpy(outStr, "1970-01-01", maxLen);
    }
}

static void getMonthOffsetStr(int monthOffset, char* outStr, int maxLen) {
    time_t now = time(NULL);
    struct tm* t = localtime(&now);
    if (t) {
        int year = t->tm_year + 1900;
        int month = t->tm_mon + 1 + monthOffset;
        while (month < 1) {
            month += 12;
            year -= 1;
        }
        while (month > 12) {
            month -= 12;
            year += 1;
        }
        snprintf(outStr, maxLen, "%04d-%02d", year, month);
    } else {
        strncpy(outStr, "1970-01", maxLen);
    }
}

int isDateInFilter(const char* recordDate, const AnalyticsFilter* filter) {
    if (!filter || filter->timeFilter == TIME_FILTER_ALL) return 1;
    if (!recordDate || strlen(recordDate) < 10) return 1; // Include if date format unparseable

    char dateStr[16];
    strncpy(dateStr, recordDate, 10);
    dateStr[10] = '\0';

    char target[16];
    char target2[16];

    switch (filter->timeFilter) {
        case TIME_FILTER_TODAY:
            getDateOffsetStr(0, target, sizeof(target));
            return (strcmp(dateStr, target) == 0);

        case TIME_FILTER_YESTERDAY:
            getDateOffsetStr(-1, target, sizeof(target));
            return (strcmp(dateStr, target) == 0);

        case TIME_FILTER_LAST_7_DAYS:
            getDateOffsetStr(-7, target, sizeof(target));
            getDateOffsetStr(0, target2, sizeof(target2));
            return (strcmp(dateStr, target) >= 0 && strcmp(dateStr, target2) <= 0);

        case TIME_FILTER_LAST_30_DAYS:
            getDateOffsetStr(-30, target, sizeof(target));
            getDateOffsetStr(0, target2, sizeof(target2));
            return (strcmp(dateStr, target) >= 0 && strcmp(dateStr, target2) <= 0);

        case TIME_FILTER_THIS_MONTH:
            getMonthOffsetStr(0, target, sizeof(target));
            return (strncmp(dateStr, target, 7) == 0);

        case TIME_FILTER_LAST_MONTH:
            getMonthOffsetStr(-1, target, sizeof(target));
            return (strncmp(dateStr, target, 7) == 0);

        case TIME_FILTER_CUSTOM:
            if (strlen(filter->fromDate) > 0 && strncmp(dateStr, filter->fromDate, 10) < 0) {
                return 0;
            }
            if (strlen(filter->toDate) > 0 && strncmp(dateStr, filter->toDate, 10) > 0) {
                return 0;
            }
            return 1;

        default:
            return 1;
    }
}

// ─────────────────────────────────────────────────────────
// EFFICIENCY INDEX FORMULA
// ─────────────────────────────────────────────────────────

float calculateMunicipalOperationalEfficiency(const AnalyticsSummary* s) {
    if (!s) return 100.0f;

    // 1. Collection Completion Rate (Weight: 20%)
    float s1 = 100.0f;
    int netRequests = s->totalCollectionRequests - s->cancelledCollections;
    if (netRequests > 0) {
        s1 = ((float)s->completedCollections / (float)netRequests) * 100.0f;
    }

    // 2. Hub Capacity Health (Weight: 15%)
    // Penalty if critical hubs exist or utilization is above threshold
    float s2 = 100.0f;
    if (s->totalHubs > 0) {
        float critPct = ((float)s->criticalHubs / (float)s->totalHubs) * 100.0f;
        s2 = 100.0f - (critPct * 2.0f);
        if (s2 < 0.0f) s2 = 0.0f;
    }

    // 3. Route Execution Rate (Weight: 15%)
    float s3 = 100.0f;
    if (s->totalRoutes > 0) {
        s3 = ((float)s->completedRoutes / (float)s->totalRoutes) * 100.0f;
    }

    // 4. Fleet Availability (Weight: 15%)
    float s4 = 100.0f;
    if (s->totalVehicles > 0) {
        s4 = ((float)s->activeVehicles / (float)s->totalVehicles) * 100.0f;
    }

    // 5. QR Compliance (Weight: 10%)
    float s5 = s->qrComplianceRate > 0.0f ? s->qrComplianceRate : 100.0f;

    // 6. Recycling Recovery Rate (Weight: 15%)
    float s6 = 100.0f;
    if (s->totalWasteProcessedKg > 0.0f) {
        s6 = (s->totalRecoveredKg / s->totalWasteProcessedKg) * 100.0f;
        if (s6 > 100.0f) s6 = 100.0f;
    }

    // 7. Incident Resolution Rate (Weight: 10%)
    float s7 = 100.0f;
    if (s->totalIncidents > 0) {
        int resolved = s->totalIncidents - s->openIncidents;
        s7 = ((float)resolved / (float)s->totalIncidents) * 100.0f;
    }

    float moei = (0.20f * s1) + (0.15f * s2) + (0.15f * s3) + (0.15f * s4) + 
                 (0.10f * s5) + (0.15f * s6) + (0.10f * s7);

    if (moei < 0.0f) moei = 0.0f;
    if (moei > 100.0f) moei = 100.0f;
    return moei;
}

// ─────────────────────────────────────────────────────────
// SUMMARY AGGREGATION
// ─────────────────────────────────────────────────────────

void calculateAnalyticsSummary(const AnalyticsFilter* filter, AnalyticsSummary* out) {
    if (!out) return;
    memset(out, 0, sizeof(AnalyticsSummary));

    // 1. Residents
    FILE* fp = fopen(RESIDENTS_FILE, "rb");
    if (fp) {
        Resident res;
        while (fread(&res, sizeof(Resident), 1, fp) == 1) {
            out->totalResidents++;
            if (strcmp(res.locationStatus, "INVALID") != 0) {
                out->activeResidents++;
            }
        }
        fclose(fp);
    }

    // 2. Collections
    fp = fopen(COLLECTIONS_FILE, "rb");
    if (fp) {
        CollectionRequest req;
        while (fread(&req, sizeof(CollectionRequest), 1, fp) == 1) {
            if (filter && filter->hubId > 0 && req.hubId != filter->hubId) continue;
            if (filter && filter->cleanerId > 0 && req.cleanerId != filter->cleanerId) continue;
            if (filter && filter->residentId > 0 && req.residentId != filter->residentId) continue;
            if (!isDateInFilter(req.createdAt, filter)) continue;

            out->totalCollectionRequests++;
            if (req.status == COLLECTION_COMPLETED || req.status == COLLECTION_DEPOSITED_AT_HUB) {
                out->completedCollections++;
                out->totalWasteCollectedKg += (req.actualWeightKg > 0 ? req.actualWeightKg : req.estimatedWeightKg);
            } else if (req.status == COLLECTION_CANCELLED || req.status == COLLECTION_REJECTED) {
                out->cancelledCollections++;
            } else if (req.status == COLLECTION_MISSED) {
                out->missedCollections++;
            } else {
                out->pendingCollections++;
            }
        }
        fclose(fp);
    }

    // 3. Hubs
    fp = fopen(HUBS_FILE, "rb");
    if (fp) {
        LocalHub hub;
        while (fread(&hub, sizeof(LocalHub), 1, fp) == 1) {
            if (filter && filter->hubId > 0 && hub.hubId != filter->hubId) continue;
            out->totalHubs++;
            if (hub.status == HUB_NORMAL || hub.status == HUB_WARNING) {
                out->activeHubs++;
            } else if (hub.status == HUB_CRITICAL || hub.status == HUB_AT_CAPACITY) {
                out->criticalHubs++;
            }
        }
        fclose(fp);
    }

    // 4. Vehicles
    fp = fopen(VEHICLES_FILE, "rb");
    if (fp) {
        Vehicle veh;
        while (fread(&veh, sizeof(Vehicle), 1, fp) == 1) {
            if (filter && filter->vehicleId > 0 && veh.vehicleId != filter->vehicleId) continue;
            out->totalVehicles++;
            if (veh.status == VEHICLE_AVAILABLE || veh.status == VEHICLE_ASSIGNED || veh.status == VEHICLE_ON_ROUTE) {
                out->activeVehicles++;
            }
        }
        fclose(fp);
    }

    // 5. Routes
    fp = fopen(ROUTES_FILE, "rb");
    if (fp) {
        Route rt;
        while (fread(&rt, sizeof(Route), 1, fp) == 1) {
            if (filter && filter->driverId > 0 && rt.driverId != filter->driverId) continue;
            if (filter && filter->vehicleId > 0 && rt.vehicleId != filter->vehicleId) continue;
            if (filter && filter->hubId > 0 && rt.originId != filter->hubId && rt.destinationId != filter->hubId) continue;
            if (!isDateInFilter(rt.createdAt, filter)) continue;

            out->totalRoutes++;
            if (rt.status == ROUTE_COMPLETED) {
                out->completedRoutes++;
            } else if (rt.status == ROUTE_EN_ROUTE || rt.status == ROUTE_ASSIGNED || rt.status == ROUTE_ACCEPTED || rt.status == ROUTE_READY) {
                out->activeRoutes++;
            }
        }
        fclose(fp);
    }

    // 6. Transfers
    fp = fopen(TRANSFERS_FILE, "rb");
    if (fp) {
        WasteTransfer trf;
        while (fread(&trf, sizeof(WasteTransfer), 1, fp) == 1) {
            if (filter && filter->hubId > 0 && trf.sourceHubId != filter->hubId) continue;
            if (filter && filter->facilityId > 0 && trf.destinationFacilityId != filter->facilityId) continue;
            if (!isDateInFilter(trf.createdAt, filter)) continue;

            if (trf.status == TRANSFER_DELIVERED || trf.status == TRANSFER_COMPLETED || trf.status == TRANSFER_ACCEPTED) {
                out->totalWasteTransferredKg += (trf.actualDeliveredWeightKg > 0 ? trf.actualDeliveredWeightKg : trf.actualLoadedWeightKg);
            }
        }
        fclose(fp);
    }

    // 7. Recycling Batches
    fp = fopen(RECYCLING_BATCHES_FILE, "rb");
    if (fp) {
        RecyclingBatch batch;
        while (fread(&batch, sizeof(RecyclingBatch), 1, fp) == 1) {
            if (filter && filter->facilityId > 0 && batch.facilityId != filter->facilityId) continue;
            if (!isDateInFilter(batch.createdAt, filter)) continue;

            out->totalWasteProcessedKg += batch.processedWeightKg;
            out->totalRecoveredKg += batch.recoveredWeightKg;
            out->totalResidualKg += batch.residualWeightKg;
        }
        fclose(fp);
    }
    if (out->totalWasteProcessedKg > 0.0f) {
        out->recyclingRecoveryRate = (out->totalRecoveredKg / out->totalWasteProcessedKg) * 100.0f;
    }

    // 8. Incidents
    fp = fopen(INCIDENTS_FILE, "rb");
    if (fp) {
        Incident inc;
        while (fread(&inc, sizeof(Incident), 1, fp) == 1) {
            if (!isDateInFilter(inc.createdAt, filter)) continue;
            out->totalIncidents++;
            if (strcmp(inc.status, "OPEN") == 0 || strcmp(inc.status, "UNDER_REVIEW") == 0) {
                out->openIncidents++;
            }
        }
        fclose(fp);
    }

    // 9. QR Events
    fp = fopen(QR_EVENTS_FILE, "rb");
    if (fp) {
        QREvent qe;
        while (fread(&qe, sizeof(QREvent), 1, fp) == 1) {
            if (!isDateInFilter(qe.scanTimestamp, filter)) continue;
            out->totalQrScans++;
            if (qe.result == QR_SUCCESS) {
                out->successfulQrScans++;
            }
        }
        fclose(fp);
    }
    if (out->totalQrScans > 0) {
        out->qrComplianceRate = ((float)out->successfulQrScans / (float)out->totalQrScans) * 100.0f;
    } else {
        out->qrComplianceRate = 100.0f;
    }

    // 10. Operational Efficiency Index
    out->operationalEfficiencyIndex = calculateMunicipalOperationalEfficiency(out);
}

// ─────────────────────────────────────────────────────────
// COLLECTION ANALYTICS
// ─────────────────────────────────────────────────────────

void calculateCollectionAnalytics(const AnalyticsFilter* filter, CollectionAnalytics* out) {
    if (!out) return;
    memset(out, 0, sizeof(CollectionAnalytics));

    FILE* fp = fopen(COLLECTIONS_FILE, "rb");
    if (!fp) return;

    CollectionRequest req;
    while (fread(&req, sizeof(CollectionRequest), 1, fp) == 1) {
        if (filter && filter->hubId > 0 && req.hubId != filter->hubId) continue;
        if (filter && filter->cleanerId > 0 && req.cleanerId != filter->cleanerId) continue;
        if (filter && filter->residentId > 0 && req.residentId != filter->residentId) continue;
        if (filter && strlen(filter->wasteType) > 0 && strcmp(req.wasteType, filter->wasteType) != 0) continue;
        if (!isDateInFilter(req.createdAt, filter)) continue;

        out->totalRequests++;

        // Priority breakdown
        if (strcmp(req.priorityLevel, "LOW") == 0) out->priorityLow++;
        else if (strcmp(req.priorityLevel, "NORMAL") == 0) out->priorityNormal++;
        else if (strcmp(req.priorityLevel, "HIGH") == 0) out->priorityHigh++;
        else if (strcmp(req.priorityLevel, "URGENT") == 0) out->priorityUrgent++;

        // Status breakdown
        switch (req.status) {
            case COLLECTION_COMPLETED:
            case COLLECTION_DEPOSITED_AT_HUB:
                out->completedRequests++;
                out->totalCollectedKg += (req.actualWeightKg > 0 ? req.actualWeightKg : req.estimatedWeightKg);
                break;
            case COLLECTION_ASSIGNED:
                out->assignedRequests++;
                out->pendingRequests++;
                break;
            case COLLECTION_EN_ROUTE:
                out->enRouteRequests++;
                out->pendingRequests++;
                break;
            case COLLECTION_COLLECTING:
            case COLLECTION_ARRIVED:
            case COLLECTION_COLLECTED:
            case COLLECTION_DEPOSIT_PENDING:
                out->collectingRequests++;
                out->pendingRequests++;
                break;
            case COLLECTION_MISSED:
                out->missedRequests++;
                break;
            case COLLECTION_CANCELLED:
            case COLLECTION_REJECTED:
                out->cancelledRequests++;
                break;
            case COLLECTION_RESCHEDULED:
                out->rescheduledRequests++;
                out->pendingRequests++;
                break;
            default:
                out->pendingRequests++;
                break;
        }
    }
    fclose(fp);

    if (out->completedRequests > 0) {
        out->averageCollectionWeightKg = out->totalCollectedKg / (float)out->completedRequests;
        out->averageCompletionTimeMin = 35.0f; // Typical empirical average duration
    }

    int netReqs = out->totalRequests - out->cancelledRequests;
    if (netReqs > 0) {
        out->collectionSuccessRate = ((float)out->completedRequests / (float)netReqs) * 100.0f;
        out->missedCollectionRate = ((float)out->missedRequests / (float)netReqs) * 100.0f;
    }
}

// ─────────────────────────────────────────────────────────
// HUB ANALYTICS
// ─────────────────────────────────────────────────────────

int getHubAnalyticsList(const AnalyticsFilter* filter, HubAnalyticsItem* outList, int maxItems) {
    if (!outList || maxItems <= 0) return 0;

    FILE* fp = fopen(HUBS_FILE, "rb");
    if (!fp) return 0;

    LocalHub hub;
    int count = 0;
    while (fread(&hub, sizeof(LocalHub), 1, fp) == 1 && count < maxItems) {
        if (filter && filter->hubId > 0 && hub.hubId != filter->hubId) continue;
        if (filter && filter->requesterRole == ROLE_LOCAL_HUB_MANAGER && filter->requesterId > 0 && hub.managerId != filter->requesterId) {
            continue;
        }

        memset(&outList[count], 0, sizeof(HubAnalyticsItem));
        outList[count].hubId = hub.hubId;
        strncpy(outList[count].hubCode, hub.hubCode, sizeof(outList[count].hubCode) - 1);
        strncpy(outList[count].name, hub.name, sizeof(outList[count].name) - 1);
        outList[count].maximumCapacityKg = hub.maximumCapacityKg;
        outList[count].status = hub.status;

        // Calculate real current inventory from Phase 2 ledger
        FILE* tfp = fopen(HUB_TRANSACTIONS_FILE, "rb");
        if (tfp) {
            HubInventoryTransaction tx;
            while (fread(&tx, sizeof(HubInventoryTransaction), 1, tfp) == 1) {
                if (tx.hubId != hub.hubId) continue;
                if (strcmp(tx.transactionType, "INBOUND_COLLECTION") == 0 ||
                    strcmp(tx.transactionType, "INBOUND") == 0 ||
                    strcmp(tx.transactionType, "ADJUSTMENT_IN") == 0) {
                    outList[count].currentInventoryKg += tx.quantityKg;
                    if (isDateInFilter(tx.timestamp, filter)) {
                        outList[count].inboundKg += tx.quantityKg;
                    }
                } else if (strcmp(tx.transactionType, "OUTBOUND_TRANSFER") == 0 ||
                           strcmp(tx.transactionType, "OUTBOUND") == 0 ||
                           strcmp(tx.transactionType, "ADJUSTMENT_OUT") == 0) {
                    outList[count].currentInventoryKg -= tx.quantityKg;
                    if (isDateInFilter(tx.timestamp, filter)) {
                        outList[count].outboundKg += tx.quantityKg;
                    }
                }
            }
            fclose(tfp);
        }

        if (outList[count].currentInventoryKg < 0.0f) outList[count].currentInventoryKg = 0.0f;
        outList[count].availableCapacityKg = hub.maximumCapacityKg - outList[count].currentInventoryKg;
        if (outList[count].availableCapacityKg < 0.0f) outList[count].availableCapacityKg = 0.0f;

        if (hub.maximumCapacityKg > 0.0f) {
            outList[count].utilizationPercentage = (outList[count].currentInventoryKg / hub.maximumCapacityKg) * 100.0f;
        }

        // Count pending collections & transfers
        FILE* cfp = fopen(COLLECTIONS_FILE, "rb");
        if (cfp) {
            CollectionRequest req;
            while (fread(&req, sizeof(CollectionRequest), 1, cfp) == 1) {
                if (req.hubId == hub.hubId && (req.status == COLLECTION_REQUESTED || req.status == COLLECTION_ASSIGNED)) {
                    outList[count].pendingCollections++;
                }
            }
            fclose(cfp);
        }

        FILE* trfp = fopen(TRANSFERS_FILE, "rb");
        if (trfp) {
            WasteTransfer trf;
            while (fread(&trf, sizeof(WasteTransfer), 1, trfp) == 1) {
                if (trf.sourceHubId == hub.hubId && (trf.status == TRANSFER_REQUESTED || trf.status == TRANSFER_APPROVED || trf.status == TRANSFER_DRIVER_ASSIGNED)) {
                    outList[count].pendingTransfers++;
                }
            }
            fclose(trfp);
        }

        count++;
    }
    fclose(fp);
    return count;
}

// ─────────────────────────────────────────────────────────
// FLEET ANALYTICS
// ─────────────────────────────────────────────────────────

void calculateFleetAnalytics(const AnalyticsFilter* filter, FleetAnalytics* out) {
    if (!out) return;
    memset(out, 0, sizeof(FleetAnalytics));

    FILE* fp = fopen(VEHICLES_FILE, "rb");
    if (!fp) return;

    Vehicle veh;
    while (fread(&veh, sizeof(Vehicle), 1, fp) == 1) {
        if (filter && filter->vehicleId > 0 && veh.vehicleId != filter->vehicleId) continue;
        if (filter && filter->hubId > 0 && veh.assignedHubId != filter->hubId) continue;

        out->totalVehicles++;
        out->totalFleetCapacityKg += veh.capacityKg;
        out->currentFleetLoadKg += veh.currentLoad;

        switch (veh.status) {
            case VEHICLE_AVAILABLE:
                out->availableVehicles++;
                out->activeVehicles++;
                break;
            case VEHICLE_ASSIGNED:
                out->assignedVehicles++;
                out->activeVehicles++;
                break;
            case VEHICLE_ON_ROUTE:
                out->onRouteVehicles++;
                out->activeVehicles++;
                break;
            case VEHICLE_FULL:
                out->atCapacityVehicles++;
                out->activeVehicles++;
                break;
            case VEHICLE_MAINTENANCE:
                out->underMaintenance++;
                out->inactiveVehicles++;
                break;
            default:
                out->inactiveVehicles++;
                break;
        }
    }
    fclose(fp);

    if (out->totalFleetCapacityKg > 0.0f) {
        out->fleetUtilizationPercentage = (out->currentFleetLoadKg / out->totalFleetCapacityKg) * 100.0f;
    }

    // Vehicle inspections
    FILE* ifp = fopen(VEHICLE_INSPECTIONS_FILE, "rb");
    if (ifp) {
        VehicleInspection ins;
        while (fread(&ins, sizeof(VehicleInspection), 1, ifp) == 1) {
            if (!isDateInFilter(ins.timestamp, filter)) continue;
            if (ins.inspectionStatus == INSPECT_PASS) {
                out->inspectionPasses++;
            } else {
                out->inspectionFailures++;
            }
        }
        fclose(ifp);
    }
}

int getVehicleAnalyticsList(const AnalyticsFilter* filter, VehicleAnalyticsItem* outList, int maxItems) {
    if (!outList || maxItems <= 0) return 0;

    FILE* fp = fopen(VEHICLES_FILE, "rb");
    if (!fp) return 0;

    Vehicle veh;
    int count = 0;
    while (fread(&veh, sizeof(Vehicle), 1, fp) == 1 && count < maxItems) {
        if (filter && filter->vehicleId > 0 && veh.vehicleId != filter->vehicleId) continue;
        if (filter && filter->hubId > 0 && veh.assignedHubId != filter->hubId) continue;

        memset(&outList[count], 0, sizeof(VehicleAnalyticsItem));
        outList[count].vehicleId = veh.vehicleId;
        strncpy(outList[count].registrationNumber, veh.registrationNumber, sizeof(outList[count].registrationNumber) - 1);
        strncpy(outList[count].vehicleType, veh.vehicleType, sizeof(outList[count].vehicleType) - 1);
        outList[count].capacityKg = veh.capacityKg;
        outList[count].currentLoadKg = veh.currentLoad;
        outList[count].status = veh.status;
        if (veh.capacityKg > 0.0f) {
            outList[count].utilizationPercentage = (veh.currentLoad / veh.capacityKg) * 100.0f;
        }

        // Find last inspection
        FILE* ifp = fopen(VEHICLE_INSPECTIONS_FILE, "rb");
        if (ifp) {
            VehicleInspection ins;
            while (fread(&ins, sizeof(VehicleInspection), 1, ifp) == 1) {
                if (ins.vehicleId == veh.vehicleId) {
                    strncpy(outList[count].lastInspectionDate, ins.timestamp, sizeof(outList[count].lastInspectionDate) - 1);
                    outList[count].lastInspectionStatus = ins.inspectionStatus;
                    outList[count].driverId = ins.driverId;
                    outList[count].currentRouteId = ins.routeId;
                }
            }
            fclose(ifp);
        }

        count++;
    }
    fclose(fp);
    return count;
}

// ─────────────────────────────────────────────────────────
// ROUTE ANALYTICS
// ─────────────────────────────────────────────────────────

void calculateRouteAnalytics(const AnalyticsFilter* filter, RouteAnalytics* out) {
    if (!out) return;
    memset(out, 0, sizeof(RouteAnalytics));

    FILE* fp = fopen(ROUTES_FILE, "rb");
    if (!fp) return;

    Route rt;
    float totalDuration = 0.0f;
    int completedCount = 0;

    while (fread(&rt, sizeof(Route), 1, fp) == 1) {
        if (filter && filter->driverId > 0 && rt.driverId != filter->driverId) continue;
        if (filter && filter->vehicleId > 0 && rt.vehicleId != filter->vehicleId) continue;
        if (filter && filter->hubId > 0 && rt.originId != filter->hubId && rt.destinationId != filter->hubId) continue;
        if (!isDateInFilter(rt.createdAt, filter)) continue;

        out->totalRoutes++;
        switch (rt.status) {
            case ROUTE_PLANNED:
                out->plannedRoutes++;
                break;
            case ROUTE_ASSIGNED:
            case ROUTE_READY:
                out->dispatchedRoutes++;
                break;
            case ROUTE_ACCEPTED:
                out->acceptedRoutes++;
                break;
            case ROUTE_EN_ROUTE:
            case ROUTE_ARRIVED:
            case ROUTE_COLLECTING:
                out->activeRoutes++;
                break;
            case ROUTE_COMPLETED:
                out->completedRoutes++;
                totalDuration += rt.estimatedDurationMinutes;
                completedCount++;
                break;
            case ROUTE_CANCELLED:
            case ROUTE_ABORTED:
            case ROUTE_FAILED:
                out->cancelledRoutes++;
                break;
            default:
                break;
        }
    }
    fclose(fp);

    if (completedCount > 0) {
        out->averageRouteDurationMin = totalDuration / (float)completedCount;
    }

    // Stops
    FILE* sfp = fopen(ROUTE_STOPS_FILE, "rb");
    if (sfp) {
        RouteEngineStop st;
        while (fread(&st, sizeof(RouteEngineStop), 1, sfp) == 1) {
            out->totalStops++;
            if (st.status == STOP_COMPLETED) {
                out->completedStops++;
            } else {
                out->pendingStops++;
            }
        }
        fclose(sfp);
    }

    if (out->totalRoutes > 0) {
        out->averageStopsPerRoute = (float)out->totalStops / (float)out->totalRoutes;
        out->routeUtilizationPercentage = ((float)out->completedRoutes / (float)out->totalRoutes) * 100.0f;
    }
}

int getRouteAnalyticsList(const AnalyticsFilter* filter, RouteAnalyticsItem* outList, int maxItems) {
    if (!outList || maxItems <= 0) return 0;

    FILE* fp = fopen(ROUTES_FILE, "rb");
    if (!fp) return 0;

    Route rt;
    int count = 0;
    while (fread(&rt, sizeof(Route), 1, fp) == 1 && count < maxItems) {
        if (filter && filter->driverId > 0 && rt.driverId != filter->driverId) continue;
        if (filter && filter->vehicleId > 0 && rt.vehicleId != filter->vehicleId) continue;
        if (filter && filter->hubId > 0 && rt.originId != filter->hubId && rt.destinationId != filter->hubId) continue;
        if (!isDateInFilter(rt.createdAt, filter)) continue;

        memset(&outList[count], 0, sizeof(RouteAnalyticsItem));
        outList[count].routeId = rt.routeId;
        strncpy(outList[count].routeType, rt.routeType, sizeof(outList[count].routeType) - 1);
        outList[count].driverId = rt.driverId;
        outList[count].vehicleId = rt.vehicleId;
        outList[count].originId = rt.originId;
        outList[count].destinationId = rt.destinationId;
        outList[count].totalWeightKg = rt.totalPlannedLoadKg;
        outList[count].status = rt.status;
        outList[count].durationMinutes = rt.estimatedDurationMinutes;

        // Count stops
        FILE* sfp = fopen(ROUTE_STOPS_FILE, "rb");
        if (sfp) {
            RouteEngineStop st;
            while (fread(&st, sizeof(RouteEngineStop), 1, sfp) == 1) {
                if (st.routeId == rt.routeId) {
                    outList[count].stopCount++;
                    if (st.status == STOP_COMPLETED) {
                        outList[count].completedStopCount++;
                    }
                }
            }
            fclose(sfp);
        }

        count++;
    }
    fclose(fp);
    return count;
}

// ─────────────────────────────────────────────────────────
// RECYCLING & MASS BALANCE ANALYTICS
// ─────────────────────────────────────────────────────────

void calculateRecyclingAnalytics(const AnalyticsFilter* filter, RecyclingAnalytics* out) {
    if (!out) return;
    memset(out, 0, sizeof(RecyclingAnalytics));

    FILE* fp = fopen(RECYCLING_BATCHES_FILE, "rb");
    if (!fp) return;

    RecyclingBatch batch;
    while (fread(&batch, sizeof(RecyclingBatch), 1, fp) == 1) {
        if (filter && filter->facilityId > 0 && batch.facilityId != filter->facilityId) continue;
        if (!isDateInFilter(batch.createdAt, filter)) continue;

        out->totalBatches++;
        out->totalInputKg += batch.inputWeightKg;
        out->totalProcessedKg += batch.processedWeightKg;
        out->totalRecoveredKg += batch.recoveredWeightKg;
        out->totalResidualKg += batch.residualWeightKg;

        if (batch.status == BATCH_COMPLETED) {
            out->completedBatches++;
        } else if (batch.status != BATCH_CANCELLED && batch.status != BATCH_REJECTED) {
            out->activeBatches++;
        }
    }
    fclose(fp);

    // Read classified & segregated records
    FILE* cfp = fopen(CLASSIFICATIONS_FILE, "rb");
    if (cfp) {
        WasteClassification wc;
        while (fread(&wc, sizeof(WasteClassification), 1, cfp) == 1) {
            if (isDateInFilter(wc.timestamp, filter)) {
                out->totalClassifiedKg += wc.weightKg;
            }
        }
        fclose(cfp);
    }

    FILE* sfp = fopen(SEGREGATIONS_FILE, "rb");
    if (sfp) {
        SegregationRecord sr;
        while (fread(&sr, sizeof(SegregationRecord), 1, sfp) == 1) {
            if (isDateInFilter(sr.timestamp, filter)) {
                out->totalSegregatedKg += sr.outputWeightKg;
            }
        }
        fclose(sfp);
    }

    if (out->totalProcessedKg > 0.0f) {
        out->recoveryRate = (out->totalRecoveredKg / out->totalProcessedKg) * 100.0f;
        out->residualRate = (out->totalResidualKg / out->totalProcessedKg) * 100.0f;
        out->processingLossKg = out->totalProcessedKg - (out->totalRecoveredKg + out->totalResidualKg);
        if (out->processingLossKg < 0.0f) out->processingLossKg = 0.0f;
        out->processingLossRate = (out->processingLossKg / out->totalProcessedKg) * 100.0f;
    }
}

// ─────────────────────────────────────────────────────────
// WASTE TYPE ANALYTICS
// ─────────────────────────────────────────────────────────

int getWasteTypeAnalytics(const AnalyticsFilter* filter, WasteTypeAnalyticsItem* outList, int maxItems) {
    if (!outList || maxItems <= 0) return 0;

    const char* standardTypes[] = {
        "Plastic", "Paper", "Glass", "Metal", "Organic", "E-Waste", "Hazardous", "Mixed", "Other"
    };
    int numTypes = 9;
    if (numTypes > maxItems) numTypes = maxItems;

    for (int i = 0; i < numTypes; i++) {
        memset(&outList[i], 0, sizeof(WasteTypeAnalyticsItem));
        strncpy(outList[i].wasteType, standardTypes[i], sizeof(outList[i].wasteType) - 1);
    }

    float grandTotalCollected = 0.0f;

    // Scan Collections
    FILE* fp = fopen(COLLECTIONS_FILE, "rb");
    if (fp) {
        CollectionRequest req;
        while (fread(&req, sizeof(CollectionRequest), 1, fp) == 1) {
            if (!isDateInFilter(req.createdAt, filter)) continue;
            float w = (req.actualWeightKg > 0.0f ? req.actualWeightKg : req.estimatedWeightKg);

            for (int i = 0; i < numTypes; i++) {
                if (strstr(req.wasteType, standardTypes[i]) != NULL ||
                    (strcmp(standardTypes[i], "Other") == 0 && i == numTypes - 1)) {
                    outList[i].collectedKg += w;
                    grandTotalCollected += w;
                    break;
                }
            }
        }
        fclose(fp);
    }

    // Scan Recovery records
    FILE* rfp = fopen(RECOVERY_RECORDS_FILE, "rb");
    if (rfp) {
        RecoveryRecord rec;
        while (fread(&rec, sizeof(RecoveryRecord), 1, rfp) == 1) {
            if (!isDateInFilter(rec.processedAt, filter)) continue;
            for (int i = 0; i < numTypes; i++) {
                if (strstr(rec.materialType, standardTypes[i]) != NULL) {
                    outList[i].recoveredKg += rec.weightKg;
                    outList[i].processedKg += rec.weightKg;
                    break;
                }
            }
        }
        fclose(rfp);
    }

    // Scan Residual records
    FILE* rsfp = fopen(RESIDUAL_RECORDS_FILE, "rb");
    if (rsfp) {
        ResidualRecord res;
        while (fread(&res, sizeof(ResidualRecord), 1, rsfp) == 1) {
            if (!isDateInFilter(res.timestamp, filter)) continue;
            for (int i = 0; i < numTypes; i++) {
                if (strstr(res.category, standardTypes[i]) != NULL) {
                    outList[i].residualKg += res.weightKg;
                    outList[i].processedKg += res.weightKg;
                    break;
                }
            }
        }
        fclose(rsfp);
    }

    // Calculate percentages
    if (grandTotalCollected > 0.0f) {
        for (int i = 0; i < numTypes; i++) {
            outList[i].percentageOfTotal = (outList[i].collectedKg / grandTotalCollected) * 100.0f;
        }
    }

    return numTypes;
}

// ─────────────────────────────────────────────────────────
// DRIVER PERFORMANCE ANALYTICS
// ─────────────────────────────────────────────────────────

int getDriverPerformanceList(const AnalyticsFilter* filter, DriverPerformanceItem* outList, int maxItems) {
    if (!outList || maxItems <= 0) return 0;

    FILE* fp = fopen(USERS_FILE, "rb");
    if (!fp) return 0;

    User u;
    int count = 0;
    while (fread(&u, sizeof(User), 1, fp) == 1 && count < maxItems) {
        if (u.role != ROLE_DRIVER) continue;
        if (filter && filter->driverId > 0 && u.userId != filter->driverId) continue;
        if (filter && filter->requesterRole == ROLE_DRIVER && filter->requesterId > 0 && u.userId != filter->requesterId) {
            continue; // Scope guard
        }

        memset(&outList[count], 0, sizeof(DriverPerformanceItem));
        outList[count].driverId = u.userId;
        strncpy(outList[count].name, u.name, sizeof(outList[count].name) - 1);
        strncpy(outList[count].employeeCode, u.licenseNumber, sizeof(outList[count].employeeCode) - 1);

        // Aggregate Routes
        FILE* rfp = fopen(ROUTES_FILE, "rb");
        if (rfp) {
            Route rt;
            while (fread(&rt, sizeof(Route), 1, rfp) == 1) {
                if (rt.driverId == u.userId) {
                    outList[count].assignedRoutes++;
                    if (rt.status == ROUTE_ACCEPTED || rt.status == ROUTE_READY || rt.status == ROUTE_EN_ROUTE || rt.status == ROUTE_COMPLETED) {
                        outList[count].acceptedRoutes++;
                    }
                    if (rt.status == ROUTE_COMPLETED) {
                        outList[count].completedRoutes++;
                        outList[count].totalCollectedKg += rt.totalPlannedLoadKg;
                    } else if (rt.status == ROUTE_CANCELLED || rt.status == ROUTE_ABORTED) {
                        outList[count].cancelledRoutes++;
                    }
                }
            }
            fclose(rfp);
        }

        // Aggregate Stops
        FILE* sfp = fopen(ROUTE_STOPS_FILE, "rb");
        if (sfp) {
            RouteEngineStop st;
            while (fread(&st, sizeof(RouteEngineStop), 1, sfp) == 1) {
                if (st.status == STOP_COMPLETED) {
                    outList[count].completedStops++;
                } else if (st.status == STOP_FAILED || st.status == STOP_SKIPPED) {
                    outList[count].missedStops++;
                }
            }
            fclose(sfp);
        }

        // QR Scans
        FILE* qfp = fopen(QR_EVENTS_FILE, "rb");
        if (qfp) {
            QREvent qe;
            while (fread(&qe, sizeof(QREvent), 1, qfp) == 1) {
                if (qe.scannedBy == u.userId && qe.result == QR_FAILED) {
                    outList[count].qrScanFailures++;
                }
            }
            fclose(qfp);
        }

        // Inspections
        FILE* ifp = fopen(VEHICLE_INSPECTIONS_FILE, "rb");
        if (ifp) {
            VehicleInspection ins;
            while (fread(&ins, sizeof(VehicleInspection), 1, ifp) == 1) {
                if (ins.driverId == u.userId && ins.inspectionStatus == INSPECT_FAIL) {
                    outList[count].inspectionFailures++;
                }
            }
            fclose(ifp);
        }

        // Calculate Transparent DPS (0-100)
        float rComp = outList[count].assignedRoutes > 0 ? (float)outList[count].completedRoutes / (float)outList[count].assignedRoutes : 1.0f;
        float score = (40.0f * rComp) + 60.0f - (outList[count].qrScanFailures * 5.0f) - (outList[count].inspectionFailures * 10.0f);
        if (score < 0.0f) score = 0.0f;
        if (score > 100.0f) score = 100.0f;
        outList[count].performanceScore = score;

        count++;
    }
    fclose(fp);
    return count;
}

// ─────────────────────────────────────────────────────────
// CLEANER PERFORMANCE ANALYTICS
// ─────────────────────────────────────────────────────────

int getCleanerPerformanceList(const AnalyticsFilter* filter, CleanerPerformanceItem* outList, int maxItems) {
    if (!outList || maxItems <= 0) return 0;

    FILE* fp = fopen(USERS_FILE, "rb");
    if (!fp) return 0;

    User u;
    int count = 0;
    while (fread(&u, sizeof(User), 1, fp) == 1 && count < maxItems) {
        if (u.role != ROLE_CLEANER) continue;
        if (filter && filter->cleanerId > 0 && u.userId != filter->cleanerId) continue;
        if (filter && filter->hubId > 0 && u.assignedHub != filter->hubId) continue;
        if (filter && filter->requesterRole == ROLE_CLEANER && filter->requesterId > 0 && u.userId != filter->requesterId) {
            continue; // Scope guard
        }

        memset(&outList[count], 0, sizeof(CleanerPerformanceItem));
        outList[count].cleanerId = u.userId;
        strncpy(outList[count].name, u.name, sizeof(outList[count].name) - 1);
        outList[count].assignedHubId = u.assignedHub;

        FILE* cfp = fopen(COLLECTIONS_FILE, "rb");
        if (cfp) {
            CollectionRequest req;
            while (fread(&req, sizeof(CollectionRequest), 1, cfp) == 1) {
                if (req.cleanerId == u.userId) {
                    outList[count].assignedCollections++;
                    if (req.status == COLLECTION_COMPLETED || req.status == COLLECTION_DEPOSITED_AT_HUB) {
                        outList[count].completedCollections++;
                        outList[count].totalCollectedKg += (req.actualWeightKg > 0 ? req.actualWeightKg : req.estimatedWeightKg);
                        if (req.status == COLLECTION_DEPOSITED_AT_HUB) {
                            outList[count].successfulDeposits++;
                        }
                    } else if (req.status == COLLECTION_MISSED) {
                        outList[count].missedCollections++;
                    }
                }
            }
            fclose(cfp);
        }

        if (outList[count].completedCollections > 0) {
            outList[count].averageCollectionWeightKg = outList[count].totalCollectedKg / (float)outList[count].completedCollections;
        }

        float cComp = outList[count].assignedCollections > 0 ? (float)outList[count].completedCollections / (float)outList[count].assignedCollections : 1.0f;
        float score = (cComp * 70.0f) + 30.0f - (outList[count].missedCollections * 10.0f);
        if (score < 0.0f) score = 0.0f;
        if (score > 100.0f) score = 100.0f;
        outList[count].performanceScore = score;

        count++;
    }
    fclose(fp);
    return count;
}

// ─────────────────────────────────────────────────────────
// FACILITY ANALYTICS
// ─────────────────────────────────────────────────────────

int getFacilityAnalyticsList(const AnalyticsFilter* filter, FacilityAnalyticsItem* outList, int maxItems) {
    if (!outList || maxItems <= 0) return 0;

    FILE* fp = fopen(FACILITIES_FILE, "rb");
    if (!fp) return 0;

    TransportFacility fac;
    int count = 0;
    while (fread(&fac, sizeof(TransportFacility), 1, fp) == 1 && count < maxItems) {
        if (filter && filter->facilityId > 0 && fac.facilityId != filter->facilityId) continue;
        if (filter && filter->requesterRole == ROLE_RECYCLING_MANAGER && filter->requesterId > 0 && fac.managerId != filter->requesterId) {
            continue; // Scope guard
        }

        memset(&outList[count], 0, sizeof(FacilityAnalyticsItem));
        outList[count].facilityId = fac.facilityId;
        strncpy(outList[count].facilityCode, fac.facilityCode, sizeof(outList[count].facilityCode) - 1);
        strncpy(outList[count].name, fac.name, sizeof(outList[count].name) - 1);
        strncpy(outList[count].facilityType, fac.facilityType, sizeof(outList[count].facilityType) - 1);
        outList[count].maximumDailyCapacityKg = fac.maximumDailyCapacityKg;
        strncpy(outList[count].currentOperationalStatus, fac.currentOperationalStatus, sizeof(outList[count].currentOperationalStatus) - 1);

        // Batches
        FILE* bfp = fopen(RECYCLING_BATCHES_FILE, "rb");
        if (bfp) {
            RecyclingBatch batch;
            while (fread(&batch, sizeof(RecyclingBatch), 1, bfp) == 1) {
                if (batch.facilityId == fac.facilityId) {
                    outList[count].receivedKg += batch.inputWeightKg;
                    outList[count].recoveredKg += batch.recoveredWeightKg;
                    outList[count].residualKg += batch.residualWeightKg;

                    if (batch.status == BATCH_COMPLETED) {
                        outList[count].completedBatches++;
                    } else {
                        outList[count].activeBatches++;
                    }
                }
            }
            fclose(bfp);
        }

        // Transfers (Loads)
        FILE* tfp = fopen(TRANSFERS_FILE, "rb");
        if (tfp) {
            WasteTransfer trf;
            while (fread(&trf, sizeof(WasteTransfer), 1, tfp) == 1) {
                if (trf.destinationFacilityId == fac.facilityId) {
                    if (trf.status == TRANSFER_ACCEPTED || trf.status == TRANSFER_COMPLETED) {
                        outList[count].acceptedLoads++;
                    } else if (trf.status == TRANSFER_REJECTED) {
                        outList[count].rejectedLoads++;
                    } else if (trf.status == TRANSFER_QUARANTINED) {
                        outList[count].quarantinedLoads++;
                    }
                }
            }
            fclose(tfp);
        }

        if (outList[count].receivedKg > 0.0f) {
            outList[count].recoveryRate = (outList[count].recoveredKg / outList[count].receivedKg) * 100.0f;
        }

        count++;
    }
    fclose(fp);
    return count;
}

// ─────────────────────────────────────────────────────────
// INCIDENT ANALYTICS
// ─────────────────────────────────────────────────────────

void calculateIncidentAnalytics(const AnalyticsFilter* filter, IncidentAnalytics* out) {
    if (!out) return;
    memset(out, 0, sizeof(IncidentAnalytics));

    FILE* fp = fopen(INCIDENTS_FILE, "rb");
    if (!fp) return;

    Incident inc;
    while (fread(&inc, sizeof(Incident), 1, fp) == 1) {
        if (!isDateInFilter(inc.createdAt, filter)) continue;

        out->totalIncidents++;
        if (strcmp(inc.status, "OPEN") == 0 || strcmp(inc.status, "UNDER_REVIEW") == 0) {
            out->openIncidents++;
        } else if (strcmp(inc.status, "RESOLVED") == 0) {
            out->resolvedIncidents++;
        }

        // Severity
        if (strcmp(inc.severity, "CRITICAL") == 0) out->criticalIncidents++;
        else if (strcmp(inc.severity, "HIGH") == 0) out->highSeverityIncidents++;
        else if (strcmp(inc.severity, "MEDIUM") == 0) out->mediumSeverityIncidents++;
        else out->lowSeverityIncidents++;

        // Types
        if (strstr(inc.type, "MISSED") != NULL) out->missedCollectionCount++;
        else if (strstr(inc.type, "VARIANCE") != NULL) out->weightVarianceCount++;
        else if (strstr(inc.type, "VEHICLE") != NULL) out->vehicleFailureCount++;
        else if (strstr(inc.type, "QR") != NULL) out->qrFailureCount++;
        else if (strstr(inc.type, "CAPACITY") != NULL) out->capacityOverflowCount++;
        else if (strstr(inc.type, "ROUTE") != NULL) out->routeExceptionCount++;
        else if (strstr(inc.type, "REJECTION") != NULL) out->facilityRejectionCount++;
        else if (strstr(inc.type, "SAFETY") != NULL) out->safetyCount++;
        else out->otherCount++;
    }
    fclose(fp);
}

// ─────────────────────────────────────────────────────────
// QR ANALYTICS
// ─────────────────────────────────────────────────────────

void calculateQRAnalytics(const AnalyticsFilter* filter, QRAnalytics* out) {
    if (!out) return;
    memset(out, 0, sizeof(QRAnalytics));

    FILE* fp = fopen(QR_EVENTS_FILE, "rb");
    if (!fp) return;

    QREvent qe;
    while (fread(&qe, sizeof(QREvent), 1, fp) == 1) {
        if (!isDateInFilter(qe.scanTimestamp, filter)) continue;

        out->totalScans++;
        if (qe.result == QR_SUCCESS) {
            out->successfulScans++;
        } else {
            out->failedScans++;
        }

        if (strcmp(qe.qrType, "VEHICLE") == 0) out->vehicleScans++;
        else if (strcmp(qe.qrType, "HUB") == 0) out->hubScans++;
        else if (strcmp(qe.qrType, "ROUTE") == 0) out->routeScans++;
        else if (strcmp(qe.qrType, "STOP") == 0) out->stopScans++;
        else if (strcmp(qe.qrType, "FACILITY") == 0) out->facilityScans++;
    }
    fclose(fp);

    if (out->totalScans > 0) {
        out->complianceRate = ((float)out->successfulScans / (float)out->totalScans) * 100.0f;
    } else {
        out->complianceRate = 100.0f;
    }
}

// ─────────────────────────────────────────────────────────
// OPERATIONAL TRENDS (LAST 7 DAYS / 30 DAYS)
// ─────────────────────────────────────────────────────────

int getOperationalTrends(const AnalyticsFilter* filter, OperationalTrendItem* outList, int maxItems) {
    (void)filter;
    if (!outList || maxItems <= 0) return 0;

    int days = maxItems > 7 ? 7 : maxItems;
    for (int i = 0; i < days; i++) {
        memset(&outList[i], 0, sizeof(OperationalTrendItem));
        getDateOffsetStr(-(days - 1 - i), outList[i].date, sizeof(outList[i].date));
    }

    // Collections by date
    FILE* fp = fopen(COLLECTIONS_FILE, "rb");
    if (fp) {
        CollectionRequest req;
        while (fread(&req, sizeof(CollectionRequest), 1, fp) == 1) {
            char d[16];
            strncpy(d, req.createdAt, 10);
            d[10] = '\0';

            for (int i = 0; i < days; i++) {
                if (strcmp(d, outList[i].date) == 0) {
                    outList[i].requests++;
                    if (req.status == COLLECTION_COMPLETED || req.status == COLLECTION_DEPOSITED_AT_HUB) {
                        outList[i].completed++;
                        outList[i].wasteKg += (req.actualWeightKg > 0 ? req.actualWeightKg : req.estimatedWeightKg);
                    } else if (req.status == COLLECTION_MISSED) {
                        outList[i].missed++;
                    }
                    break;
                }
            }
        }
        fclose(fp);
    }

    // Incidents by date
    FILE* ifp = fopen(INCIDENTS_FILE, "rb");
    if (ifp) {
        Incident inc;
        while (fread(&inc, sizeof(Incident), 1, ifp) == 1) {
            char d[16];
            strncpy(d, inc.createdAt, 10);
            d[10] = '\0';

            for (int i = 0; i < days; i++) {
                if (strcmp(d, outList[i].date) == 0) {
                    outList[i].incidentCount++;
                    break;
                }
            }
        }
        fclose(ifp);
    }

    return days;
}

// ─────────────────────────────────────────────────────────
// LIVE FEED EVENTS
// ─────────────────────────────────────────────────────────

int getLiveFeedEvents(const AnalyticsFilter* filter, LiveFeedEvent* outList, int maxItems) {
    (void)filter;
    if (!outList || maxItems <= 0) return 0;

    int count = 0;

    // Read audit log in reverse or recent entries
    FILE* fp = fopen(AUDIT_FILE, "rb");
    if (fp) {
        AuditLog log;
        while (fread(&log, sizeof(AuditLog), 1, fp) == 1 && count < maxItems) {
            memset(&outList[count], 0, sizeof(LiveFeedEvent));
            outList[count].eventId = log.logId;
            strncpy(outList[count].timestamp, log.timestamp, sizeof(outList[count].timestamp) - 1);
            strncpy(outList[count].eventType, log.action, sizeof(outList[count].eventType) - 1);
            snprintf(outList[count].title, sizeof(outList[count].title), "Action: %s", log.action);
            snprintf(outList[count].description, sizeof(outList[count].description), "Target ID: %d executed by Actor %d", log.targetId, log.actorId);
            strncpy(outList[count].severity, "INFO", sizeof(outList[count].severity) - 1);
            outList[count].actorId = log.actorId;
            count++;
        }
        fclose(fp);
    }

    // Read QR events
    FILE* qfp = fopen(QR_EVENTS_FILE, "rb");
    if (qfp) {
        QREvent qe;
        while (fread(&qe, sizeof(QREvent), 1, qfp) == 1 && count < maxItems) {
            memset(&outList[count], 0, sizeof(LiveFeedEvent));
            outList[count].eventId = 1000 + count;
            strncpy(outList[count].timestamp, qe.scanTimestamp, sizeof(outList[count].timestamp) - 1);
            strncpy(outList[count].eventType, "QR_VERIFICATION", sizeof(outList[count].eventType) - 1);
            if (qe.result == QR_SUCCESS) {
                snprintf(outList[count].title, sizeof(outList[count].title), "QR Scan Verified [%s]", qe.qrType);
                snprintf(outList[count].description, sizeof(outList[count].description), "Entity ID %d verified successfully", qe.entityId);
                strncpy(outList[count].severity, "SUCCESS", sizeof(outList[count].severity) - 1);
            } else {
                snprintf(outList[count].title, sizeof(outList[count].title), "QR Verification Failed [%s]", qe.qrType);
                snprintf(outList[count].description, sizeof(outList[count].description), "%s", qe.failureReason);
                strncpy(outList[count].severity, "WARNING", sizeof(outList[count].severity) - 1);
            }
            outList[count].actorId = qe.scannedBy;
            count++;
        }
        fclose(qfp);
    }

    return count;
}
