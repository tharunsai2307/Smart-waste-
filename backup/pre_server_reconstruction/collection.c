#include "collection.h"
#include "hub.h"
#include "user.h"
#include "incident.h"
#include "alert.h"
#include "utils.h"
#include "config.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <time.h>

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

void initCollectionsData() {
    FILE *fp = fopen(COLLECTIONS_FILE, "rb");
    if (fp == NULL) {
        fp = fopen(COLLECTIONS_FILE, "wb");
        if (fp != NULL) fclose(fp);
    } else {
        fclose(fp);
    }
}

// getCurrentTimestamp is now in utils.c

const char* collectionStatusToStr(CollectionStatus s) {
    switch (s) {
        case COLLECTION_REQUESTED:        return "REQUESTED";
        case COLLECTION_UNDER_REVIEW:     return "UNDER_REVIEW";
        case COLLECTION_ASSIGNED:         return "ASSIGNED";
        case COLLECTION_EN_ROUTE:         return "EN_ROUTE";
        case COLLECTION_ARRIVED:          return "ARRIVED";
        case COLLECTION_COLLECTING:       return "COLLECTING";
        case COLLECTION_COLLECTED:        return "COLLECTED";
        case COLLECTION_DEPOSIT_PENDING:  return "DEPOSIT_PENDING";
        case COLLECTION_DEPOSITED_AT_HUB: return "DEPOSITED_AT_HUB";
        case COLLECTION_COMPLETED:        return "COMPLETED";
        case COLLECTION_CANCELLED:        return "CANCELLED";
        case COLLECTION_MISSED:           return "MISSED";
        case COLLECTION_REJECTED:         return "REJECTED";
        case COLLECTION_RESCHEDULED:      return "RESCHEDULED";
        default:                          return "UNKNOWN";
    }
}

CollectionStatus strToCollectionStatus(const char* str) {
    if (strcmp(str, "REQUESTED") == 0)        return COLLECTION_REQUESTED;
    if (strcmp(str, "UNDER_REVIEW") == 0)     return COLLECTION_UNDER_REVIEW;
    if (strcmp(str, "ASSIGNED") == 0)         return COLLECTION_ASSIGNED;
    if (strcmp(str, "EN_ROUTE") == 0)         return COLLECTION_EN_ROUTE;
    if (strcmp(str, "ARRIVED") == 0)          return COLLECTION_ARRIVED;
    if (strcmp(str, "COLLECTING") == 0)       return COLLECTION_COLLECTING;
    if (strcmp(str, "COLLECTED") == 0)        return COLLECTION_COLLECTED;
    if (strcmp(str, "DEPOSIT_PENDING") == 0)  return COLLECTION_DEPOSIT_PENDING;
    if (strcmp(str, "DEPOSITED_AT_HUB") == 0) return COLLECTION_DEPOSITED_AT_HUB;
    if (strcmp(str, "COMPLETED") == 0)        return COLLECTION_COMPLETED;
    if (strcmp(str, "CANCELLED") == 0)        return COLLECTION_CANCELLED;
    if (strcmp(str, "MISSED") == 0)           return COLLECTION_MISSED;
    if (strcmp(str, "REJECTED") == 0)         return COLLECTION_REJECTED;
    if (strcmp(str, "RESCHEDULED") == 0)      return COLLECTION_RESCHEDULED;
    return COLLECTION_REQUESTED;
}

int isValidStateTransition(CollectionStatus from, CollectionStatus to) {
    if (from == to) return 1; // Idempotent

    switch (from) {
        case COLLECTION_REQUESTED:
            return (to == COLLECTION_UNDER_REVIEW || to == COLLECTION_ASSIGNED ||
                    to == COLLECTION_CANCELLED || to == COLLECTION_REJECTED);
        case COLLECTION_UNDER_REVIEW:
            return (to == COLLECTION_ASSIGNED || to == COLLECTION_CANCELLED || to == COLLECTION_REJECTED);
        case COLLECTION_ASSIGNED:
            return (to == COLLECTION_EN_ROUTE || to == COLLECTION_CANCELLED ||
                    to == COLLECTION_RESCHEDULED || to == COLLECTION_MISSED);
        case COLLECTION_EN_ROUTE:
            return (to == COLLECTION_ARRIVED || to == COLLECTION_MISSED || to == COLLECTION_CANCELLED);
        case COLLECTION_ARRIVED:
            return (to == COLLECTION_COLLECTING || to == COLLECTION_MISSED);
        case COLLECTION_COLLECTING:
            return (to == COLLECTION_COLLECTED || to == COLLECTION_MISSED);
        case COLLECTION_COLLECTED:
            return (to == COLLECTION_DEPOSIT_PENDING || to == COLLECTION_DEPOSITED_AT_HUB || to == COLLECTION_COMPLETED);
        case COLLECTION_DEPOSIT_PENDING:
            return (to == COLLECTION_DEPOSITED_AT_HUB || to == COLLECTION_COMPLETED);
        case COLLECTION_DEPOSITED_AT_HUB:
            return (to == COLLECTION_COMPLETED);
        case COLLECTION_MISSED:
            return (to == COLLECTION_RESCHEDULED || to == COLLECTION_CANCELLED);
        case COLLECTION_RESCHEDULED:
            return (to == COLLECTION_ASSIGNED || to == COLLECTION_CANCELLED);
        case COLLECTION_COMPLETED:
        case COLLECTION_CANCELLED:
        case COLLECTION_REJECTED:
            return 0; // Terminal states
        default:
            return 0;
    }
}

int calculateCollectionPriorityScore(const char *urgency, const char *wasteType, float estimatedWeightKg, int waitingDays, int missedHistoryCount, char *outLevel, size_t levelLen) {
    int urgencyScore = 0;
    if (strcasecmp(urgency, "URGENT") == 0) urgencyScore = 40;
    else if (strcasecmp(urgency, "HIGH") == 0) urgencyScore = 25;
    else if (strcasecmp(urgency, "NORMAL") == 0) urgencyScore = 10;
    else urgencyScore = 0;

    int typeScore = 10;
    if (strcasecmp(wasteType, "E_WASTE") == 0 || strcasecmp(wasteType, "HAZARDOUS") == 0) typeScore = 30;
    else if (strcasecmp(wasteType, "ORGANIC") == 0) typeScore = 20;
    else if (strcasecmp(wasteType, "PLASTIC") == 0 || strcasecmp(wasteType, "METAL") == 0) typeScore = 15;

    int weightScore = (int)((estimatedWeightKg / 10.0f) * 5.0f);
    if (weightScore > 30) weightScore = 30;

    int waitScore = waitingDays * 10;
    if (waitScore > 40) waitScore = 40;

    int missedScore = missedHistoryCount * 25;
    if (missedScore > 50) missedScore = 50;

    int totalScore = urgencyScore + typeScore + weightScore + waitScore + missedScore;

    const char *lvl = "LOW";
    if (totalScore >= 80) lvl = "URGENT";
    else if (totalScore >= 50) lvl = "HIGH";
    else if (totalScore >= 25) lvl = "NORMAL";

    if (outLevel && levelLen > 0) {
        strncpy(outLevel, lvl, levelLen - 1);
        outLevel[levelLen - 1] = '\0';
    }
    return totalScore;
}

int addCollectionRequest(CollectionRequest *req) {
    FILE *fp = fopen(COLLECTIONS_FILE, "rb");
    int maxId = 0;
    if (fp != NULL) {
        CollectionRequest temp;
        while (fread(&temp, sizeof(CollectionRequest), 1, fp) == 1) {
            if (temp.collectionId > maxId) maxId = temp.collectionId;
        }
        fclose(fp);
    }

    req->collectionId = maxId + 1;
    char now[30];
    getCurrentTimestamp(now, sizeof(now));
    strncpy(req->createdAt, now, sizeof(req->createdAt) - 1);
    req->createdAt[sizeof(req->createdAt) - 1] = '\0';
    strncpy(req->updatedAt, now, sizeof(req->updatedAt) - 1);
    req->updatedAt[sizeof(req->updatedAt) - 1] = '\0';
    req->completedAt[0] = '\0';

    char lvl[20];
    req->priorityScore = calculateCollectionPriorityScore("NORMAL", req->wasteType, req->estimatedWeightKg, 0, 0, lvl, sizeof(lvl));
    strncpy(req->priorityLevel, lvl, sizeof(req->priorityLevel) - 1);
    req->priorityLevel[sizeof(req->priorityLevel) - 1] = '\0';

    req->status = COLLECTION_REQUESTED;

    fp = fopen(COLLECTIONS_FILE, "ab");
    if (fp == NULL) return 0;
    int res = fwrite(req, sizeof(CollectionRequest), 1, fp) == 1;
    fclose(fp);
    return res;
}

int getCollectionRequestById(int reqId, CollectionRequest *req) {
    FILE *fp = fopen(COLLECTIONS_FILE, "rb");
    if (fp == NULL) return 0;
    CollectionRequest temp;
    int found = 0;
    while (fread(&temp, sizeof(CollectionRequest), 1, fp) == 1) {
        if (temp.collectionId == reqId) {
            *req = temp;
            found = 1;
            break;
        }
    }
    fclose(fp);
    return found;
}

int updateCollectionRequest(const CollectionRequest *req) {
    FILE *fp = fopen(COLLECTIONS_FILE, "rb");
    if (fp == NULL) return 0;

    FILE *tempFp = fopen("data/temp_collections.dat", "wb");
    if (tempFp == NULL) {
        fclose(fp);
        return 0;
    }

    CollectionRequest temp;
    int found = 0;
    char now[30];
    getCurrentTimestamp(now, sizeof(now));

    while (fread(&temp, sizeof(CollectionRequest), 1, fp) == 1) {
        if (temp.collectionId == req->collectionId) {
            temp = *req;
            strncpy(temp.updatedAt, now, sizeof(temp.updatedAt) - 1);
            temp.updatedAt[sizeof(temp.updatedAt) - 1] = '\0';
            fwrite(&temp, sizeof(CollectionRequest), 1, tempFp);
            found = 1;
        } else {
            fwrite(&temp, sizeof(CollectionRequest), 1, tempFp);
        }
    }

    fclose(fp);
    fclose(tempFp);

    if (found) {
        remove(COLLECTIONS_FILE);
        rename("data/temp_collections.dat", COLLECTIONS_FILE);
    } else {
        remove("data/temp_collections.dat");
    }
    return found;
}

int getCollectionsByResidentId(int residentId, CollectionRequest *list, int maxCount) {
    FILE *fp = fopen(COLLECTIONS_FILE, "rb");
    if (fp == NULL) return 0;
    int count = 0;
    CollectionRequest temp;
    while (count < maxCount && fread(&temp, sizeof(CollectionRequest), 1, fp) == 1) {
        if (temp.residentId == residentId) {
            list[count++] = temp;
        }
    }
    fclose(fp);
    return count;
}

int getCollectionsByHubId(int hubId, CollectionRequest *list, int maxCount) {
    FILE *fp = fopen(COLLECTIONS_FILE, "rb");
    if (fp == NULL) return 0;
    int count = 0;
    CollectionRequest temp;
    while (count < maxCount && fread(&temp, sizeof(CollectionRequest), 1, fp) == 1) {
        if (hubId == 0 || temp.hubId == hubId) {
            list[count++] = temp;
        }
    }
    fclose(fp);
    return count;
}

int getCollectionsByCleanerId(int cleanerId, CollectionRequest *list, int maxCount) {
    FILE *fp = fopen(COLLECTIONS_FILE, "rb");
    if (fp == NULL) return 0;
    int count = 0;
    CollectionRequest temp;
    while (count < maxCount && fread(&temp, sizeof(CollectionRequest), 1, fp) == 1) {
        if (temp.cleanerId == cleanerId) {
            list[count++] = temp;
        }
    }
    fclose(fp);
    return count;
}

int getAllCollectionRequests(CollectionRequest *list, int maxCount) {
    FILE *fp = fopen(COLLECTIONS_FILE, "rb");
    if (fp == NULL) return 0;
    int count = 0;
    while (count < maxCount && fread(&list[count], sizeof(CollectionRequest), 1, fp) == 1) {
        count++;
    }
    fclose(fp);
    return count;
}

double calculateDistanceMeters(double lat1, double lon1, double lat2, double lon2) {
    double R = 6371000.0; // Earth radius in meters
    double dLat = (lat2 - lat1) * M_PI / 180.0;
    double dLon = (lon2 - lon1) * M_PI / 180.0;
    double a = sin(dLat / 2.0) * sin(dLat / 2.0) +
               cos(lat1 * M_PI / 180.0) * cos(lat2 * M_PI / 180.0) *
               sin(dLon / 2.0) * sin(dLon / 2.0);
    double c = 2.0 * atan2(sqrt(a), sqrt(1.0 - a));
    return R * c;
}

int isCleanerWithinProximity(double cleanerLat, double cleanerLng, double reqLat, double reqLng, double thresholdMeters) {
    if (cleanerLat == 0.0 || reqLat == 0.0) return 1; // Bypass if location unavailable
    double dist = calculateDistanceMeters(cleanerLat, cleanerLng, reqLat, reqLng);
    return dist <= thresholdMeters;
}

int canAssignCleanerToCollection(int cleanerId, int hubId, float *currentWorkloadKg, char *errMsg, size_t errLen) {
    User cleaner;
    if (!getUserById(cleanerId, &cleaner)) {
        if (errMsg && errLen > 0) snprintf(errMsg, errLen, "Cleaner user ID %d not found.", cleanerId);
        return 0;
    }

    if (cleaner.role != ROLE_CLEANER) {
        if (errMsg && errLen > 0) snprintf(errMsg, errLen, "User is not a designated Cleaner.");
        return 0;
    }

    if (cleaner.status == 0) {
        if (errMsg && errLen > 0) snprintf(errMsg, errLen, "Cleaner account is inactive or suspended.");
        return 0;
    }

    if (hubId > 0 && cleaner.assignedHub != hubId) {
        if (errMsg && errLen > 0) snprintf(errMsg, errLen, "Cleaner belongs to Hub %d, not assigned Hub %d.", cleaner.assignedHub, hubId);
        return 0;
    }

    // Compute active workload
    float totalLoad = 0.0f;
    FILE *fp = fopen(COLLECTIONS_FILE, "rb");
    if (fp != NULL) {
        CollectionRequest req;
        while (fread(&req, sizeof(CollectionRequest), 1, fp) == 1) {
            if (req.cleanerId == cleanerId &&
               (req.status == COLLECTION_ASSIGNED || req.status == COLLECTION_EN_ROUTE ||
                req.status == COLLECTION_ARRIVED || req.status == COLLECTION_COLLECTING ||
                req.status == COLLECTION_COLLECTED || req.status == COLLECTION_DEPOSIT_PENDING)) {
                totalLoad += (req.actualWeightKg > 0.0f) ? req.actualWeightKg : req.estimatedWeightKg;
            }
        }
        fclose(fp);
    }

    if (currentWorkloadKg) *currentWorkloadKg = totalLoad;

    if (totalLoad >= MAX_CLEANER_DAILY_WORKLOAD_KG) {
        if (errMsg && errLen > 0) {
            snprintf(errMsg, errLen, "Cleaner is at maximum daily capacity (%.1fkg / %.1fkg).", totalLoad, MAX_CLEANER_DAILY_WORKLOAD_KG);
        }
        return 0;
    }

    return 1;
}

int processHubDeposit(int collectionId, int cleanerId, const char *scannedQr, float depositedWeightKg, const char *varianceReason, int emergencyOverride, char *errMsg, size_t errLen) {
    CollectionRequest req;
    if (!getCollectionRequestById(collectionId, &req)) {
        if (errMsg && errLen > 0) snprintf(errMsg, errLen, "Collection #%d not found.", collectionId);
        return 0;
    }

    if (req.status != COLLECTION_COLLECTED && req.status != COLLECTION_DEPOSIT_PENDING) {
        if (errMsg && errLen > 0) snprintf(errMsg, errLen, "Collection is in '%s' state; must be 'COLLECTED' to deposit.", collectionStatusToStr(req.status));
        return 0;
    }

    if (req.cleanerId != cleanerId) {
        if (errMsg && errLen > 0) snprintf(errMsg, errLen, "Only assigned cleaner (#%d) can deposit this waste.", req.cleanerId);
        return 0;
    }

    if (depositedWeightKg <= 0.0f) {
        if (errMsg && errLen > 0) snprintf(errMsg, errLen, "Deposited weight must be greater than 0 kg.");
        return 0;
    }

    // Parse QR payload format: "HUB:<hubCode>:<hubId>" or match hubId directly
    int scannedHubId = 0;
    char scannedCode[64] = "";
    if (sscanf(scannedQr, "HUB:%63[^:]:%d", scannedCode, &scannedHubId) != 2) {
        scannedHubId = atoi(scannedQr);
    }

    if (scannedHubId != req.hubId) {
        LocalHub assignedHub;
        getHubById(req.hubId, &assignedHub);
        if (errMsg && errLen > 0) {
            snprintf(errMsg, errLen, "Invalid collection hub! This collection is assigned to %s (Hub #%d).", assignedHub.name, req.hubId);
        }
        return 0;
    }

    LocalHub targetHub;
    if (!getHubById(req.hubId, &targetHub)) {
        if (errMsg && errLen > 0) snprintf(errMsg, errLen, "Target Hub #%d not found.", req.hubId);
        return 0;
    }

    // Variance check
    float variance = (float)fabs((double)(depositedWeightKg - req.actualWeightKg));
    if (variance > 5.0f && (!varianceReason || strlen(varianceReason) == 0)) {
        // Create incident for weight variance
        Incident inc;
        memset(&inc, 0, sizeof(Incident));
        strcpy(inc.type, "WEIGHT_VARIANCE");
        strcpy(inc.severity, "MEDIUM");
        inc.collectionId = collectionId;
        inc.reportedBy = cleanerId;
        inc.assignedTo = targetHub.managerId;
        snprintf(inc.description, sizeof(inc.description),
                 "Weight variance of %.1fkg detected (Collected: %.1fkg vs Deposited: %.1fkg) at %s.",
                 variance, req.actualWeightKg, depositedWeightKg, targetHub.name);
        addIncident(&inc);
    }

    // Phase 2 Hub Inventory Integration
    HubInventoryTransaction trans;
    memset(&trans, 0, sizeof(HubInventoryTransaction));
    trans.hubId = req.hubId;
    strcpy(trans.transactionType, "INBOUND_COLLECTION");
    trans.quantityKg = depositedWeightKg;
    strncpy(trans.wasteType, req.wasteType, sizeof(trans.wasteType) - 1);
    strcpy(trans.sourceType, "CLEANER");
    trans.sourceId = cleanerId;
    strcpy(trans.destinationType, "LOCAL_HUB");
    trans.destinationId = req.hubId;
    trans.recordedBy = cleanerId;
    strcpy(trans.measurementSource, "HUB_DEPOSIT_SCALE");

    if (!recordHubTransaction(&trans, emergencyOverride, cleanerId, errMsg, errLen)) {
        return 0; // Capacity check failed or other hub error
    }

    // Mark collection complete
    req.depositedWeightKg = depositedWeightKg;
    if (varianceReason && strlen(varianceReason) > 0) {
        strncpy(req.varianceReason, varianceReason, sizeof(req.varianceReason) - 1);
        req.varianceReason[sizeof(req.varianceReason) - 1] = '\0';
    }
    req.status = COLLECTION_COMPLETED;
    getCurrentTimestamp(req.completedAt, sizeof(req.completedAt));

    updateCollectionRequest(&req);
    logAudit(cleanerId, "COLLECTION_COMPLETED_DEPOSIT", req.collectionId);

    return 1;
}
