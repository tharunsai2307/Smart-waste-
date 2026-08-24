#include "alert_engine.h"
#include "alert.h"
#include "incident.h"
#include "utils.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <math.h>

void initAlertEngine() {
    initAlertsData();
    initIncidentsData();

    FILE *fp = fopen(INCIDENT_TIMELINE_FILE, "rb");
    if (!fp) {
        fp = fopen(INCIDENT_TIMELINE_FILE, "wb");
        if (fp) fclose(fp);
    } else {
        fclose(fp);
    }

    fp = fopen(NOTIFICATION_PREFS_FILE, "rb");
    if (!fp) {
        fp = fopen(NOTIFICATION_PREFS_FILE, "wb");
        if (fp) fclose(fp);
    } else {
        fclose(fp);
    }
}

static void logIncidentTimeline(int incId, int actorId, const char* actorRole, 
                                const char* action, const char* prevStatus, 
                                const char* newStatus, const char* comment, 
                                const char* evidenceRef) {
    FILE *fp = fopen(INCIDENT_TIMELINE_FILE, "rb");
    int maxId = 0;
    if (fp) {
        IncidentTimelineEntry temp;
        while (fread(&temp, sizeof(IncidentTimelineEntry), 1, fp) == 1) {
            if (temp.timelineId > maxId) maxId = temp.timelineId;
        }
        fclose(fp);
    }

    IncidentTimelineEntry entry;
    memset(&entry, 0, sizeof(IncidentTimelineEntry));
    entry.timelineId = maxId + 1;
    entry.incidentId = incId;
    getCurrentTimestamp(entry.timestamp, sizeof(entry.timestamp));
    entry.actorId = actorId;
    strncpy(entry.actorRole, actorRole ? actorRole : "SYSTEM", sizeof(entry.actorRole) - 1);
    strncpy(entry.action, action ? action : "ACTION", sizeof(entry.action) - 1);
    strncpy(entry.previousStatus, prevStatus ? prevStatus : "", sizeof(entry.previousStatus) - 1);
    strncpy(entry.newStatus, newStatus ? newStatus : "", sizeof(entry.newStatus) - 1);
    strncpy(entry.comment, comment ? comment : "", sizeof(entry.comment) - 1);
    strncpy(entry.evidenceRef, evidenceRef ? evidenceRef : "", sizeof(entry.evidenceRef) - 1);

    fp = fopen(INCIDENT_TIMELINE_FILE, "ab");
    if (fp) {
        fwrite(&entry, sizeof(IncidentTimelineEntry), 1, fp);
        fclose(fp);
    }

    // Log to system Audit Log
    char auditAction[50];
    snprintf(auditAction, sizeof(auditAction), "INCIDENT_%s", action ? action : "UPDATE");
    logAudit(actorId > 0 ? actorId : 1, auditAction, incId);
}

static int isAlertActive(const char* type, int referenceId) {
    FILE *fp = fopen(ALERTS_FILE, "rb");
    if (!fp) return 0;
    Alert temp;
    int active = 0;
    while (fread(&temp, sizeof(Alert), 1, fp) == 1) {
        if (temp.resolved == 0 && temp.referenceId == referenceId && strcmp(temp.type, type) == 0) {
            active = 1;
            break;
        }
    }
    fclose(fp);
    return active;
}

static int isIncidentActive(const char* type, int entityId) {
    FILE *fp = fopen(INCIDENTS_FILE, "rb");
    if (!fp) return 0;
    Incident temp;
    int active = 0;
    while (fread(&temp, sizeof(Incident), 1, fp) == 1) {
        if (temp.entityId == entityId && strcmp(temp.type, type) == 0 &&
            strcmp(temp.status, "RESOLVED") != 0 && strcmp(temp.status, "CLOSED") != 0 &&
            strcmp(temp.status, "REJECTED") != 0 && strcmp(temp.status, "CANCELLED") != 0) {
            active = 1;
            break;
        }
    }
    fclose(fp);
    return active;
}

int createOperationalIncident(const char* type, const char* severity, 
                              const char* entityType, int entityId,
                              int hubId, int vehicleId, int routeId, int facilityId,
                              int reportedBy, const char* assignedRole, const char* description) {
    if (isIncidentActive(type, entityId)) {
        return 0; // Prevent duplicate active incident
    }

    FILE *fp = fopen(INCIDENTS_FILE, "rb");
    int maxId = 0;
    if (fp) {
        Incident temp;
        while (fread(&temp, sizeof(Incident), 1, fp) == 1) {
            if (temp.incidentId > maxId) maxId = temp.incidentId;
        }
        fclose(fp);
    }

    Incident inc;
    memset(&inc, 0, sizeof(Incident));
    inc.incidentId = maxId + 1;
    strncpy(inc.type, type ? type : "OTHER", sizeof(inc.type) - 1);
    strncpy(inc.severity, severity ? severity : "MEDIUM", sizeof(inc.severity) - 1);
    strncpy(inc.status, "OPEN", sizeof(inc.status) - 1);
    strncpy(inc.description, description ? description : "", sizeof(inc.description) - 1);
    getCurrentTimestamp(inc.createdAt, sizeof(inc.createdAt));
    inc.reportedBy = reportedBy > 0 ? reportedBy : 1;
    
    strncpy(inc.entityType, entityType ? entityType : "ENTITY", sizeof(inc.entityType) - 1);
    inc.entityId = entityId;
    inc.hubId = hubId;
    inc.vehicleId = vehicleId;
    inc.routeId = routeId;
    inc.facilityId = facilityId;
    strncpy(inc.assignedRole, assignedRole ? assignedRole : "ADMIN", sizeof(inc.assignedRole) - 1);
    inc.escalationLevel = 0;

    fp = fopen(INCIDENTS_FILE, "ab");
    if (!fp) return 0;
    int res = fwrite(&inc, sizeof(Incident), 1, fp) == 1;
    fclose(fp);

    if (res) {
        char refBuf[64];
        snprintf(refBuf, sizeof(refBuf), "%s:%d", entityType ? entityType : "REF", entityId);
        logIncidentTimeline(inc.incidentId, reportedBy > 0 ? reportedBy : 1, "SYSTEM", "CREATED", "", "OPEN", description, refBuf);
    }

    return inc.incidentId;
}

// ─────────────────────────────────────────────────────────
// STATE MACHINE TRANSITIONS
// ─────────────────────────────────────────────────────────

int acknowledgeIncident(int incId, int actorId, const char* actorRole, const char* note) {
    FILE *fp = fopen(INCIDENTS_FILE, "rb");
    if (!fp) return 0;
    FILE *tfp = fopen("data/temp_inc_ack.dat", "wb");
    if (!tfp) { fclose(fp); return 0; }

    Incident inc;
    int found = 0;
    while (fread(&inc, sizeof(Incident), 1, fp) == 1) {
        if (inc.incidentId == incId && (strcmp(inc.status, "OPEN") == 0 || strcmp(inc.status, "DETECTED") == 0)) {
            char prev[20];
            strcpy(prev, inc.status);
            strcpy(inc.status, "ACKNOWLEDGED");
            getCurrentTimestamp(inc.acknowledgedAt, sizeof(inc.acknowledgedAt));
            fwrite(&inc, sizeof(Incident), 1, tfp);
            found = 1;
            logIncidentTimeline(incId, actorId, actorRole, "ACKNOWLEDGED", prev, "ACKNOWLEDGED", note, "");
        } else {
            fwrite(&inc, sizeof(Incident), 1, tfp);
        }
    }
    fclose(fp);
    fclose(tfp);

    if (found) {
        remove(INCIDENTS_FILE);
        rename("data/temp_inc_ack.dat", INCIDENTS_FILE);
    } else {
        remove("data/temp_inc_ack.dat");
    }
    return found;
}

int assignIncident(int incId, int actorId, const char* actorRole, int assignToUserId, const char* targetRole, const char* note) {
    FILE *fp = fopen(INCIDENTS_FILE, "rb");
    if (!fp) return 0;
    FILE *tfp = fopen("data/temp_inc_ass.dat", "wb");
    if (!tfp) { fclose(fp); return 0; }

    Incident inc;
    int found = 0;
    while (fread(&inc, sizeof(Incident), 1, fp) == 1) {
        if (inc.incidentId == incId && strcmp(inc.status, "CLOSED") != 0 && strcmp(inc.status, "RESOLVED") != 0) {
            char prev[20];
            strcpy(prev, inc.status);
            strcpy(inc.status, "ASSIGNED");
            inc.assignedTo = assignToUserId;
            if (targetRole && strlen(targetRole) > 0) {
                strncpy(inc.assignedRole, targetRole, sizeof(inc.assignedRole) - 1);
            }
            fwrite(&inc, sizeof(Incident), 1, tfp);
            found = 1;
            char commentBuf[256];
            snprintf(commentBuf, sizeof(commentBuf), "Assigned to User %d (%s). %s", assignToUserId, inc.assignedRole, note ? note : "");
            logIncidentTimeline(incId, actorId, actorRole, "ASSIGNED", prev, "ASSIGNED", commentBuf, "");
        } else {
            fwrite(&inc, sizeof(Incident), 1, tfp);
        }
    }
    fclose(fp);
    fclose(tfp);

    if (found) {
        remove(INCIDENTS_FILE);
        rename("data/temp_inc_ass.dat", INCIDENTS_FILE);
    } else {
        remove("data/temp_inc_ass.dat");
    }
    return found;
}

int investigateIncident(int incId, int actorId, const char* actorRole, const char* note) {
    FILE *fp = fopen(INCIDENTS_FILE, "rb");
    if (!fp) return 0;
    FILE *tfp = fopen("data/temp_inc_inv.dat", "wb");
    if (!tfp) { fclose(fp); return 0; }

    Incident inc;
    int found = 0;
    while (fread(&inc, sizeof(Incident), 1, fp) == 1) {
        if (inc.incidentId == incId && (strcmp(inc.status, "ASSIGNED") == 0 || strcmp(inc.status, "ACKNOWLEDGED") == 0 || strcmp(inc.status, "OPEN") == 0)) {
            char prev[20];
            strcpy(prev, inc.status);
            strcpy(inc.status, "INVESTIGATING");
            fwrite(&inc, sizeof(Incident), 1, tfp);
            found = 1;
            logIncidentTimeline(incId, actorId, actorRole, "INVESTIGATING", prev, "INVESTIGATING", note, "");
        } else {
            fwrite(&inc, sizeof(Incident), 1, tfp);
        }
    }
    fclose(fp);
    fclose(tfp);

    if (found) {
        remove(INCIDENTS_FILE);
        rename("data/temp_inc_inv.dat", INCIDENTS_FILE);
    } else {
        remove("data/temp_inc_inv.dat");
    }
    return found;
}

int actionIncident(int incId, int actorId, const char* actorRole, const char* actionTaken, const char* note) {
    FILE *fp = fopen(INCIDENTS_FILE, "rb");
    if (!fp) return 0;
    FILE *tfp = fopen("data/temp_inc_act.dat", "wb");
    if (!tfp) { fclose(fp); return 0; }

    Incident inc;
    int found = 0;
    while (fread(&inc, sizeof(Incident), 1, fp) == 1) {
        if (inc.incidentId == incId && strcmp(inc.status, "CLOSED") != 0 && strcmp(inc.status, "RESOLVED") != 0) {
            char prev[20];
            strcpy(prev, inc.status);
            strcpy(inc.status, "ACTION_REQUIRED");
            fwrite(&inc, sizeof(Incident), 1, tfp);
            found = 1;
            char commentBuf[256];
            snprintf(commentBuf, sizeof(commentBuf), "Action: %s. %s", actionTaken ? actionTaken : "Required", note ? note : "");
            logIncidentTimeline(incId, actorId, actorRole, "ACTION_TAKEN", prev, "ACTION_REQUIRED", commentBuf, "");
        } else {
            fwrite(&inc, sizeof(Incident), 1, tfp);
        }
    }
    fclose(fp);
    fclose(tfp);

    if (found) {
        remove(INCIDENTS_FILE);
        rename("data/temp_inc_act.dat", INCIDENTS_FILE);
    } else {
        remove("data/temp_inc_act.dat");
    }
    return found;
}

int resolveIncidentWithAudit(int incId, int actorId, const char* actorRole, const char* note) {
    FILE *fp = fopen(INCIDENTS_FILE, "rb");
    if (!fp) return 0;
    FILE *tfp = fopen("data/temp_inc_res.dat", "wb");
    if (!tfp) { fclose(fp); return 0; }

    Incident inc;
    int found = 0;
    while (fread(&inc, sizeof(Incident), 1, fp) == 1) {
        if (inc.incidentId == incId && strcmp(inc.status, "CLOSED") != 0) {
            char prev[20];
            strcpy(prev, inc.status);
            strcpy(inc.status, "RESOLVED");
            getCurrentTimestamp(inc.resolvedAt, sizeof(inc.resolvedAt));
            fwrite(&inc, sizeof(Incident), 1, tfp);
            found = 1;
            logIncidentTimeline(incId, actorId, actorRole, "RESOLVED", prev, "RESOLVED", note ? note : "Incident marked as resolved", "");
        } else {
            fwrite(&inc, sizeof(Incident), 1, tfp);
        }
    }
    fclose(fp);
    fclose(tfp);

    if (found) {
        remove(INCIDENTS_FILE);
        rename("data/temp_inc_res.dat", INCIDENTS_FILE);
    } else {
        remove("data/temp_inc_res.dat");
    }
    return found;
}

int closeIncident(int incId, int actorId, const char* actorRole, const char* note) {
    FILE *fp = fopen(INCIDENTS_FILE, "rb");
    if (!fp) return 0;
    FILE *tfp = fopen("data/temp_inc_cls.dat", "wb");
    if (!tfp) { fclose(fp); return 0; }

    Incident inc;
    int found = 0;
    while (fread(&inc, sizeof(Incident), 1, fp) == 1) {
        if (inc.incidentId == incId && strcmp(inc.status, "RESOLVED") == 0) {
            char prev[20];
            strcpy(prev, inc.status);
            strcpy(inc.status, "CLOSED");
            getCurrentTimestamp(inc.closedAt, sizeof(inc.closedAt));
            fwrite(&inc, sizeof(Incident), 1, tfp);
            found = 1;
            logIncidentTimeline(incId, actorId, actorRole, "CLOSED", prev, "CLOSED", note ? note : "Incident closed after resolution verification", "");
        } else {
            fwrite(&inc, sizeof(Incident), 1, tfp);
        }
    }
    fclose(fp);
    fclose(tfp);

    if (found) {
        remove(INCIDENTS_FILE);
        rename("data/temp_inc_cls.dat", INCIDENTS_FILE);
    } else {
        remove("data/temp_inc_cls.dat");
    }
    return found;
}

int reopenIncident(int incId, int actorId, const char* actorRole, const char* note) {
    FILE *fp = fopen(INCIDENTS_FILE, "rb");
    if (!fp) return 0;
    FILE *tfp = fopen("data/temp_inc_reo.dat", "wb");
    if (!tfp) { fclose(fp); return 0; }

    Incident inc;
    int found = 0;
    while (fread(&inc, sizeof(Incident), 1, fp) == 1) {
        if (inc.incidentId == incId && (strcmp(inc.status, "CLOSED") == 0 || strcmp(inc.status, "RESOLVED") == 0)) {
            char prev[20];
            strcpy(prev, inc.status);
            strcpy(inc.status, "OPEN");
            inc.resolvedAt[0] = 0;
            inc.closedAt[0] = 0;
            inc.escalationLevel++;
            fwrite(&inc, sizeof(Incident), 1, tfp);
            found = 1;
            logIncidentTimeline(incId, actorId, actorRole, "REOPENED", prev, "OPEN", note ? note : "Incident reopened", "");
        } else {
            fwrite(&inc, sizeof(Incident), 1, tfp);
        }
    }
    fclose(fp);
    fclose(tfp);

    if (found) {
        remove(INCIDENTS_FILE);
        rename("data/temp_inc_reo.dat", INCIDENTS_FILE);
    } else {
        remove("data/temp_inc_reo.dat");
    }
    return found;
}

int addIncidentComment(int incId, int actorId, const char* actorRole, const char* comment) {
    if (!comment || strlen(comment) == 0) return 0;
    logIncidentTimeline(incId, actorId, actorRole, "COMMENT_ADDED", "", "", comment, "");
    return 1;
}

int getIncidentTimeline(int incId, IncidentTimelineEntry* list, int maxCount) {
    if (!list || maxCount <= 0) return 0;
    FILE *fp = fopen(INCIDENT_TIMELINE_FILE, "rb");
    if (!fp) return 0;

    int count = 0;
    IncidentTimelineEntry entry;
    while (fread(&entry, sizeof(IncidentTimelineEntry), 1, fp) == 1 && count < maxCount) {
        if (entry.incidentId == incId) {
            list[count++] = entry;
        }
    }
    fclose(fp);
    return count;
}

// ─────────────────────────────────────────────────────────
// OPERATIONAL EVALUATION RULES
// ─────────────────────────────────────────────────────────

void evaluateHubAlerts() {
    FILE *fp = fopen(HUBS_FILE, "rb");
    if (!fp) return;

    LocalHub hub;
    while (fread(&hub, sizeof(LocalHub), 1, fp) == 1) {
        float currentInv = 0.0f;
        FILE *tfp = fopen(HUB_TRANSACTIONS_FILE, "rb");
        if (tfp) {
            HubInventoryTransaction tx;
            while (fread(&tx, sizeof(HubInventoryTransaction), 1, tfp) == 1) {
                if (tx.hubId == hub.hubId) {
                    if (strstr(tx.transactionType, "INBOUND") != NULL) currentInv += tx.quantityKg;
                    else if (strstr(tx.transactionType, "OUTBOUND") != NULL) currentInv -= tx.quantityKg;
                }
            }
            fclose(tfp);
        }
        if (currentInv < 0.0f) currentInv = 0.0f;

        float utilPct = hub.maximumCapacityKg > 0.0f ? (currentInv / hub.maximumCapacityKg) * 100.0f : 0.0f;

        if (utilPct >= 90.0f) {
            if (!isAlertActive("HUB_OVERFLOW", hub.hubId)) {
                char msg[512];
                snprintf(msg, sizeof(msg), "Critical: Hub %s (%s) is at %.1f%% capacity (%.1f/%.1f kg)", 
                    hub.hubCode, hub.name, utilPct, currentInv, hub.maximumCapacityKg);
                generateAlert("HUB_OVERFLOW", hub.hubId, msg);
                createOperationalIncident("HUB_OVERFLOW", "CRITICAL", "HUB", hub.hubId, hub.hubId, 0, 0, 0, 1, "LOCAL_HUB_MANAGER", msg);
            }
        } else if (utilPct >= 75.0f) {
            if (!isAlertActive("HUB_CAPACITY", hub.hubId)) {
                char msg[512];
                snprintf(msg, sizeof(msg), "Warning: Hub %s is approaching capacity (%.1f%%, %.1f kg)", hub.hubCode, utilPct, currentInv);
                generateAlert("HUB_CAPACITY", hub.hubId, msg);
                createOperationalIncident("HUB_CAPACITY", "MEDIUM", "HUB", hub.hubId, hub.hubId, 0, 0, 0, 1, "LOCAL_HUB_MANAGER", msg);
            }
        }
    }
    fclose(fp);
}

void evaluateCollectionAlerts() {
    FILE *fp = fopen(COLLECTIONS_FILE, "rb");
    if (!fp) return;

    CollectionRequest req;
    while (fread(&req, sizeof(CollectionRequest), 1, fp) == 1) {
        if (req.status == COLLECTION_MISSED) {
            if (!isAlertActive("MISSED_COLLECTION", req.collectionId)) {
                char msg[512];
                snprintf(msg, sizeof(msg), "Missed collection request #%d at %s", req.collectionId, req.address);
                generateAlert("MISSED_COLLECTION", req.collectionId, msg);
                createOperationalIncident("MISSED_COLLECTION", "MEDIUM", "COLLECTION", req.collectionId, req.hubId, 0, 0, 0, req.cleanerId, "LOCAL_HUB_MANAGER", msg);
            }
        }

        if (req.actualWeightKg > 0.0f && req.estimatedWeightKg > 0.0f) {
            float diff = (float)fabs(req.actualWeightKg - req.estimatedWeightKg);
            float varPct = (diff / req.estimatedWeightKg) * 100.0f;
            if (varPct > 25.0f) {
                if (!isAlertActive("WEIGHT_VARIANCE", req.collectionId)) {
                    char msg[512];
                    snprintf(msg, sizeof(msg), "High weight variance on collection #%d: est %.1fkg vs actual %.1fkg (%.1f%%)",
                        req.collectionId, req.estimatedWeightKg, req.actualWeightKg, varPct);
                    generateAlert("WEIGHT_VARIANCE", req.collectionId, msg);
                    createOperationalIncident("WEIGHT_VARIANCE", "HIGH", "COLLECTION", req.collectionId, req.hubId, 0, 0, 0, req.cleanerId, "LOCAL_HUB_MANAGER", msg);
                }
            }
        }
    }
    fclose(fp);
}

void evaluateVehicleAlerts() {
    FILE *fp = fopen(VEHICLE_INSPECTIONS_FILE, "rb");
    if (fp) {
        VehicleInspection ins;
        while (fread(&ins, sizeof(VehicleInspection), 1, fp) == 1) {
            if (ins.inspectionStatus == INSPECT_FAIL) {
                if (!isAlertActive("VEHICLE_INSPECTION_FAILURE", ins.vehicleId)) {
                    char msg[512];
                    snprintf(msg, sizeof(msg), "Vehicle #%d failed safety inspection by Driver %d. Remarks: %s",
                        ins.vehicleId, ins.driverId, ins.remarks);
                    generateAlert("VEHICLE_INSPECTION_FAILURE", ins.vehicleId, msg);
                    createOperationalIncident("VEHICLE_INSPECTION_FAILURE", "CRITICAL", "VEHICLE", ins.vehicleId, 0, ins.vehicleId, ins.routeId, 0, ins.driverId, "LOCAL_HUB_MANAGER", msg);
                }
            }
        }
        fclose(fp);
    }
}

void evaluateRouteAlerts() {
    FILE *fp = fopen(ROUTES_FILE, "rb");
    if (!fp) return;

    Route rt;
    while (fread(&rt, sizeof(Route), 1, fp) == 1) {
        if (rt.status == ROUTE_ABORTED || rt.status == ROUTE_VEHICLE_BREAKDOWN || rt.status == ROUTE_EMERGENCY) {
            if (!isAlertActive("ROUTE_EXCEPTION", rt.routeId)) {
                char msg[512];
                snprintf(msg, sizeof(msg), "Route #%d encountered critical exception (Status: %d, Driver: %d)",
                    rt.routeId, (int)rt.status, rt.driverId);
                generateAlert("ROUTE_EXCEPTION", rt.routeId, msg);
                createOperationalIncident("ROUTE_EXCEPTION", "CRITICAL", "ROUTE", rt.routeId, rt.originId, rt.vehicleId, rt.routeId, rt.destinationId, rt.driverId, "ADMIN", msg);
            }
        }
    }
    fclose(fp);
}

void evaluateTransferAlerts() {
    FILE *fp = fopen(TRANSFERS_FILE, "rb");
    if (!fp) return;

    WasteTransfer trf;
    while (fread(&trf, sizeof(WasteTransfer), 1, fp) == 1) {
        if (trf.status == TRANSFER_REJECTED) {
            if (!isAlertActive("FACILITY_REJECTION", trf.transferId)) {
                char msg[512];
                snprintf(msg, sizeof(msg), "Transfer %s rejected by facility %d", trf.transferCode, trf.destinationFacilityId);
                generateAlert("FACILITY_REJECTION", trf.transferId, msg);
                createOperationalIncident("FACILITY_REJECTION", "HIGH", "TRANSFER", trf.transferId, trf.sourceHubId, trf.vehicleId, 0, trf.destinationFacilityId, trf.driverId, "RECYCLING_MANAGER", msg);
            }
        } else if (trf.status == TRANSFER_QUARANTINED) {
            if (!isAlertActive("FACILITY_QUARANTINE", trf.transferId)) {
                char msg[512];
                snprintf(msg, sizeof(msg), "Transfer %s quarantined at facility %d", trf.transferCode, trf.destinationFacilityId);
                generateAlert("FACILITY_QUARANTINE", trf.transferId, msg);
                createOperationalIncident("FACILITY_QUARANTINE", "HIGH", "TRANSFER", trf.transferId, trf.sourceHubId, trf.vehicleId, 0, trf.destinationFacilityId, trf.driverId, "RECYCLING_MANAGER", msg);
            }
        }
    }
    fclose(fp);
}

void evaluateRecyclingAlerts() {
    FILE *fp = fopen(RECYCLING_BATCHES_FILE, "rb");
    if (!fp) return;

    RecyclingBatch b;
    while (fread(&b, sizeof(RecyclingBatch), 1, fp) == 1) {
        if (b.status == BATCH_COMPLETED && b.inputWeightKg > 0.0f) {
            float outTotal = b.recoveredWeightKg + b.residualWeightKg;
            if (outTotal > b.inputWeightKg + 0.1f) {
                if (!isAlertActive("MASS_BALANCE_EXCEPTION", b.batchId)) {
                    char msg[512];
                    snprintf(msg, sizeof(msg), "Mass balance violation in Batch %s: Input %.1fkg < Out %.1fkg",
                        b.batchCode, b.inputWeightKg, outTotal);
                    generateAlert("MASS_BALANCE_EXCEPTION", b.batchId, msg);
                    createOperationalIncident("MASS_BALANCE_EXCEPTION", "CRITICAL", "BATCH", b.batchId, 0, 0, 0, b.facilityId, 1, "RECYCLING_MANAGER", msg);
                }
            }
        }
    }
    fclose(fp);
}

void evaluateQRAlerts() {
    FILE *fp = fopen(QR_EVENTS_FILE, "rb");
    if (!fp) return;

    QREvent qe;
    while (fread(&qe, sizeof(QREvent), 1, fp) == 1) {
        if (qe.result == QR_FAILED) {
            if (!isAlertActive("QR_FAILURE", qe.eventId)) {
                char msg[512];
                snprintf(msg, sizeof(msg), "QR verification failure [%s] for Entity %d by Actor %d: %s",
                    qe.qrType, qe.entityId, qe.scannedBy, qe.failureReason);
                generateAlert("QR_FAILURE", qe.eventId, msg);
                createOperationalIncident("QR_FAILURE", "LOW", "QR", qe.eventId, 0, qe.vehicleId, qe.routeId, 0, qe.scannedBy, "ADMIN", msg);
            }
        }
    }
    fclose(fp);
}

void evaluateIncidentEscalation() {
    FILE *fp = fopen(INCIDENTS_FILE, "rb");
    if (!fp) return;
    FILE *tfp = fopen("data/temp_inc_esc.dat", "wb");
    if (!tfp) { fclose(fp); return; }

    Incident inc;
    while (fread(&inc, sizeof(Incident), 1, fp) == 1) {
        if (strcmp(inc.status, "OPEN") == 0 || strcmp(inc.status, "DETECTED") == 0) {
            if (strcmp(inc.severity, "CRITICAL") == 0 && inc.escalationLevel == 0) {
                inc.escalationLevel = 1;
                logIncidentTimeline(inc.incidentId, 1, "SYSTEM", "ESCALATED", inc.status, inc.status, "Critical incident automatically escalated to Admin", "");
            }
        }
        fwrite(&inc, sizeof(Incident), 1, tfp);
    }
    fclose(fp);
    fclose(tfp);

    remove(INCIDENTS_FILE);
    rename("data/temp_inc_esc.dat", INCIDENTS_FILE);
}

void runAlertEvaluationCycle() {
    evaluateHubAlerts();
    evaluateCollectionAlerts();
    evaluateVehicleAlerts();
    evaluateRouteAlerts();
    evaluateTransferAlerts();
    evaluateRecyclingAlerts();
    evaluateQRAlerts();
    evaluateIncidentEscalation();
}

// ─────────────────────────────────────────────────────────
// NOTIFICATION PREFERENCES
// ─────────────────────────────────────────────────────────

int getNotificationPreferences(int userId, NotificationPreference* prefs) {
    if (!prefs) return 0;
    memset(prefs, 0, sizeof(NotificationPreference));
    prefs->userId = userId;
    // Defaults
    prefs->criticalAlerts = 1;
    prefs->highSeverityAlerts = 1;
    prefs->assignedIncidentsOnly = 0;
    prefs->hubAlerts = 1;
    prefs->vehicleAlerts = 1;
    prefs->collectionExceptions = 1;
    prefs->recyclingExceptions = 1;

    FILE *fp = fopen(NOTIFICATION_PREFS_FILE, "rb");
    if (!fp) return 1;

    NotificationPreference temp;
    while (fread(&temp, sizeof(NotificationPreference), 1, fp) == 1) {
        if (temp.userId == userId) {
            *prefs = temp;
            break;
        }
    }
    fclose(fp);
    return 1;
}

int saveNotificationPreferences(const NotificationPreference* prefs) {
    if (!prefs) return 0;

    FILE *fp = fopen(NOTIFICATION_PREFS_FILE, "rb");
    FILE *tfp = fopen("data/temp_prefs.dat", "wb");
    if (!tfp) { if (fp) fclose(fp); return 0; }

    int found = 0;
    if (fp) {
        NotificationPreference temp;
        while (fread(&temp, sizeof(NotificationPreference), 1, fp) == 1) {
            if (temp.userId == prefs->userId) {
                fwrite(prefs, sizeof(NotificationPreference), 1, tfp);
                found = 1;
            } else {
                fwrite(&temp, sizeof(NotificationPreference), 1, tfp);
            }
        }
        fclose(fp);
    }

    if (!found) {
        fwrite(prefs, sizeof(NotificationPreference), 1, tfp);
    }
    fclose(tfp);

    remove(NOTIFICATION_PREFS_FILE);
    rename("data/temp_prefs.dat", NOTIFICATION_PREFS_FILE);
    return 1;
}
