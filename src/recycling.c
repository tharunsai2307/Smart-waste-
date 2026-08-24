#include "recycling.h"
#include "reward.h"
#include "utils.h"

void initRecyclingData() {
    FILE *fp = fopen(RECYCLING_FILE, "rb");
    if (fp != NULL) {
        fclose(fp);
        return;
    }
}

int addRecyclingRecord(const RecyclingRecord *r) {
    FILE *fp = fopen(RECYCLING_FILE, "ab");
    if (fp == NULL) return 0;
    fwrite(r, sizeof(RecyclingRecord), 1, fp);
    fclose(fp);
    return 1;
}

float getEstimatedValue(const char *wasteType, float quantity) {
    if (strcmp(wasteType, "Plastic") == 0) return quantity * 20.0f;
    if (strcmp(wasteType, "Paper") == 0) return quantity * 12.0f;
    if (strcmp(wasteType, "Metal") == 0) return quantity * 40.0f;
    if (strcmp(wasteType, "E-Waste") == 0) return quantity * 60.0f;
    return 0.0f;
}

void processCollectionForRecycling(int collectionId, const char *wasteType, float quantity, int residentId) {
    RecyclingRecord rec;
    
    // Auto-generate ID
    FILE *fp = fopen(RECYCLING_FILE, "rb");
    int maxId = 600;
    if (fp != NULL) {
        RecyclingRecord temp;
        while (fread(&temp, sizeof(RecyclingRecord), 1, fp) == 1) {
            if (temp.recyclingId > maxId) maxId = temp.recyclingId;
        }
        fclose(fp);
    }
    
    rec.recyclingId = maxId + 1;
    rec.collectionId = collectionId;
    strcpy(rec.wasteType, wasteType);
    
    if (strcmp(wasteType, "Biodegradable") == 0 || strcmp(wasteType, "Mixed") == 0 || strcmp(wasteType, "Hazardous") == 0) {
        rec.recyclableQuantity = 0;
        rec.recycledQuantity = 0;
        rec.rejectedQuantity = quantity;
        rec.value = 0;
    } else {
        rec.recyclableQuantity = quantity;
        // Simulate a rejection rate (e.g., 10% rejected due to contamination)
        rec.recycledQuantity = quantity * 0.90f; 
        rec.rejectedQuantity = quantity * 0.10f;
        rec.value = getEstimatedValue(wasteType, rec.recycledQuantity);
    }
    
    addRecyclingRecord(&rec);
    
    // Add Eco Points
    int pts = calculateRewardPoints(wasteType);
    if (pts > 0) {
        addEcoPoints(residentId, pts);
    } else if (pts < 0) {
        deductEcoPoints(residentId, -pts);
    }
}

void displayRecyclingReport() {
    FILE *fp = fopen(RECYCLING_FILE, "rb");
    if (fp == NULL) {
        printf("Error opening recycling file.\n");
        return;
    }
    
    float totalCollected = 0, totalRecyclable = 0, totalRecycled = 0, totalValue = 0;
    
    printf("\n%-5s %-8s %-15s %-10s %-10s %-10s %-10s\n", 
           "ID", "Coll_ID", "Type", "Recyclable", "Recycled", "Rejected", "Value(Rs)");
    printf("%s", SUB_LINE);
    
    RecyclingRecord temp;
    while (fread(&temp, sizeof(RecyclingRecord), 1, fp) == 1) {
        printf("%-5d %-8d %-15s %-10.2f %-10.2f %-10.2f %-10.2f\n", 
               temp.recyclingId, temp.collectionId, temp.wasteType, 
               temp.recyclableQuantity, temp.recycledQuantity, 
               temp.rejectedQuantity, temp.value);
               
        totalRecyclable += temp.recyclableQuantity;
        totalRecycled += temp.recycledQuantity;
        totalCollected += (temp.recyclableQuantity + temp.rejectedQuantity);
        totalValue += temp.value;
    }
    fclose(fp);
    
    float efficiency = 0.0f;
    if (totalRecyclable > 0) {
        efficiency = (totalRecycled / totalRecyclable) * 100.0f;
    }
    
    printf("\n%s", SUB_LINE);
    printf("Total Collected Waste : %.2f kg\n", totalCollected);
    printf("Total Recyclable      : %.2f kg\n", totalRecyclable);
    printf("Total Recycled        : %.2f kg\n", totalRecycled);
    printf("Recycling Efficiency  : %.2f %%\n", efficiency);
    printf("Total Value           : Rs. %.2f\n", totalValue);
}

// ─────────────────────────────────────────────────────────
// PHASE 5: Implementation
// ─────────────────────────────────────────────────────────

#include "transfer.h"
#include "facility.h"
#include "incident.h"
#include <math.h>

void touchFile(const char* filename) {
    FILE *fp = fopen(filename, "rb");
    if (!fp) {
        fp = fopen(filename, "wb");
        if (fp) fclose(fp);
    } else {
        fclose(fp);
    }
}

int initRecyclingPhase5() {
    touchFile(RECYCLING_BATCHES_FILE);
    touchFile(CLASSIFICATIONS_FILE);
    touchFile(SEGREGATIONS_FILE);
    touchFile(PROCESSING_RECORDS_FILE);
    touchFile(RECOVERY_RECORDS_FILE);
    touchFile(RESIDUAL_RECORDS_FILE);
    return 1;
}

int receiveTransferAtFacility(int transferId, int facilityId, int operatorId) {
    (void)operatorId;
    WasteTransfer t;
    if (!getTransferById(transferId, &t)) return 0;
    
    // Transfer must be in ARRIVED status
    if (t.status != TRANSFER_ARRIVED) return 0;
    
    // Validate facility ID
    if (t.destinationFacilityId != facilityId) return 0;
    
    // Change status to RECEIVING
    t.status = TRANSFER_RECEIVING;
    char now[30];
    getCurrentTimestamp(now, sizeof(now));
    strncpy(t.updatedAt, now, sizeof(t.updatedAt)-1);
    
    updateTransfer(&t);
    
    // Audit log
    // TODO: log action
    
    return 1;
}

int recordReceivedWeight(int transferId, float receivedWeightKg, const char* measurementSource, int operatorId, float varianceThresholdPct) {
    (void)measurementSource;
    WasteTransfer t;
    if (!getTransferById(transferId, &t)) return 0;
    
    if (t.status != TRANSFER_RECEIVING) return 0;
    
    t.actualDeliveredWeightKg = receivedWeightKg;
    t.status = TRANSFER_WEIGHT_VERIFICATION;
    
    char now[30];
    getCurrentTimestamp(now, sizeof(now));
    strncpy(t.updatedAt, now, sizeof(t.updatedAt)-1);
    
    updateTransfer(&t);
    
    // Check variance
    float loadedWeight = t.actualLoadedWeightKg > 0 ? t.actualLoadedWeightKg : t.plannedWeightKg;
    if (loadedWeight > 0) {
        float diff = receivedWeightKg - loadedWeight;
        float variancePct = (fabs(diff) / loadedWeight) * 100.0f;
        
        if (variancePct > varianceThresholdPct) {
            // Create incident
            Incident inc;
            memset(&inc, 0, sizeof(Incident));
            // inc.incidentId will be auto-generated
            strncpy(inc.type, "WEIGHT_VARIANCE", sizeof(inc.type)-1);
            strncpy(inc.severity, "HIGH", sizeof(inc.severity)-1);
            inc.collectionId = 0; // It's a transfer incident
            inc.reportedBy = operatorId;
            inc.assignedTo = 0;
            strncpy(inc.status, "OPEN", sizeof(inc.status)-1);
            snprintf(inc.description, sizeof(inc.description), "Transfer %d variance: %.2f%%", transferId, variancePct);
            addIncident(&inc);
        }
    }
    
    return 1;
}

int processTransferDecision(int transferId, const char* decision, const char* reason, int operatorId) {
    (void)operatorId;
    WasteTransfer t;
    if (!getTransferById(transferId, &t)) return 0;
    
    if (t.status != TRANSFER_WEIGHT_VERIFICATION && t.status != TRANSFER_RECEIVING) return 0;
    
    if (strcmp(decision, "ACCEPT") == 0) {
        t.status = TRANSFER_ACCEPTED;
    } else if (strcmp(decision, "PARTIALLY_ACCEPT") == 0) {
        t.status = TRANSFER_PARTIALLY_ACCEPTED;
    } else if (strcmp(decision, "REJECT") == 0) {
        t.status = TRANSFER_REJECTED;
    } else if (strcmp(decision, "QUARANTINE") == 0) {
        t.status = TRANSFER_QUARANTINED;
    } else {
        return 0;
    }
    
    if (reason && reason[0]) {
        strncpy(t.varianceReason, reason, sizeof(t.varianceReason)-1);
    }
    
    char now[30];
    getCurrentTimestamp(now, sizeof(now));
    strncpy(t.updatedAt, now, sizeof(t.updatedAt)-1);
    
    if (t.status == TRANSFER_ACCEPTED || t.status == TRANSFER_PARTIALLY_ACCEPTED || t.status == TRANSFER_REJECTED) {
        strncpy(t.completedAt, now, sizeof(t.completedAt)-1);
    }
    
    updateTransfer(&t);
    return 1;
}

int createRecyclingBatch(RecyclingBatch *batch) {
    FILE *fp = fopen(RECYCLING_BATCHES_FILE, "rb");
    int maxId = 0;
    if (fp) {
        RecyclingBatch temp;
        while (fread(&temp, sizeof(RecyclingBatch), 1, fp) == 1) {
            if (temp.batchId > maxId) maxId = temp.batchId;
        }
        fclose(fp);
    }
    batch->batchId = maxId + 1;
    snprintf(batch->batchCode, sizeof(batch->batchCode), "RB-%05d", batch->batchId);
    
    char now[30];
    getCurrentTimestamp(now, sizeof(now));
    strncpy(batch->createdAt, now, sizeof(batch->createdAt)-1);
    batch->status = BATCH_CREATED;
    
    fp = fopen(RECYCLING_BATCHES_FILE, "ab");
    if (!fp) return 0;
    fwrite(batch, sizeof(RecyclingBatch), 1, fp);
    fclose(fp);
    return 1;
}

int getBatchById(int batchId, RecyclingBatch *batch) {
    FILE *fp = fopen(RECYCLING_BATCHES_FILE, "rb");
    if (!fp) return 0;
    while (fread(batch, sizeof(RecyclingBatch), 1, fp) == 1) {
        if (batch->batchId == batchId) {
            fclose(fp);
            return 1;
        }
    }
    fclose(fp);
    return 0;
}

int updateBatch(const RecyclingBatch *batch) {
    FILE *fp = fopen(RECYCLING_BATCHES_FILE, "rb");
    if (!fp) return 0;
    FILE *tempFp = fopen("data/temp_batches.dat", "wb");
    if (!tempFp) { fclose(fp); return 0; }
    
    RecyclingBatch temp;
    int found = 0;
    while (fread(&temp, sizeof(RecyclingBatch), 1, fp) == 1) {
        if (temp.batchId == batch->batchId) {
            fwrite(batch, sizeof(RecyclingBatch), 1, tempFp);
            found = 1;
        } else {
            fwrite(&temp, sizeof(RecyclingBatch), 1, tempFp);
        }
    }
    fclose(fp);
    fclose(tempFp);
    
    if (found) {
        remove(RECYCLING_BATCHES_FILE);
        rename("data/temp_batches.dat", RECYCLING_BATCHES_FILE);
    } else {
        remove("data/temp_batches.dat");
    }
    return found;
}

int getAllBatches(RecyclingBatch *list, int maxCount) {
    FILE *fp = fopen(RECYCLING_BATCHES_FILE, "rb");
    if (!fp) return 0;
    int count = 0;
    while (count < maxCount && fread(&list[count], sizeof(RecyclingBatch), 1, fp) == 1) {
        count++;
    }
    fclose(fp);
    return count;
}

int getBatchesByFacility(int facilityId, RecyclingBatch *list, int maxCount) {
    FILE *fp = fopen(RECYCLING_BATCHES_FILE, "rb");
    if (!fp) return 0;
    int count = 0;
    RecyclingBatch temp;
    while (count < maxCount && fread(&temp, sizeof(RecyclingBatch), 1, fp) == 1) {
        if (temp.facilityId == facilityId) list[count++] = temp;
    }
    fclose(fp);
    return count;
}

int addWasteClassification(WasteClassification *wc) {
    FILE *fp = fopen(CLASSIFICATIONS_FILE, "rb");
    int maxId = 0;
    if (fp) {
        WasteClassification temp;
        while (fread(&temp, sizeof(WasteClassification), 1, fp) == 1) {
            if (temp.classificationId > maxId) maxId = temp.classificationId;
        }
        fclose(fp);
    }
    wc->classificationId = maxId + 1;
    char now[30];
    getCurrentTimestamp(now, sizeof(now));
    strncpy(wc->timestamp, now, sizeof(wc->timestamp)-1);
    
    fp = fopen(CLASSIFICATIONS_FILE, "ab");
    if (!fp) return 0;
    fwrite(wc, sizeof(WasteClassification), 1, fp);
    fclose(fp);
    return 1;
}

int getBatchesClassifications(int batchId, WasteClassification *list, int maxCount) {
    FILE *fp = fopen(CLASSIFICATIONS_FILE, "rb");
    if (!fp) return 0;
    int count = 0;
    WasteClassification temp;
    while (count < maxCount && fread(&temp, sizeof(WasteClassification), 1, fp) == 1) {
        if (temp.batchId == batchId) list[count++] = temp;
    }
    fclose(fp);
    return count;
}

int addSegregationRecord(SegregationRecord *sr) {
    FILE *fp = fopen(SEGREGATIONS_FILE, "rb");
    int maxId = 0;
    if (fp) {
        SegregationRecord temp;
        while (fread(&temp, sizeof(SegregationRecord), 1, fp) == 1) {
            if (temp.segregationId > maxId) maxId = temp.segregationId;
        }
        fclose(fp);
    }
    sr->segregationId = maxId + 1;
    char now[30];
    getCurrentTimestamp(now, sizeof(now));
    strncpy(sr->timestamp, now, sizeof(sr->timestamp)-1);
    
    fp = fopen(SEGREGATIONS_FILE, "ab");
    if (!fp) return 0;
    fwrite(sr, sizeof(SegregationRecord), 1, fp);
    fclose(fp);
    return 1;
}

int addProcessingRecord(ProcessingRecord *pr) {
    FILE *fp = fopen(PROCESSING_RECORDS_FILE, "rb");
    int maxId = 0;
    if (fp) {
        ProcessingRecord temp;
        while (fread(&temp, sizeof(ProcessingRecord), 1, fp) == 1) {
            if (temp.processingId > maxId) maxId = temp.processingId;
        }
        fclose(fp);
    }
    pr->processingId = maxId + 1;
    
    fp = fopen(PROCESSING_RECORDS_FILE, "ab");
    if (!fp) return 0;
    fwrite(pr, sizeof(ProcessingRecord), 1, fp);
    fclose(fp);
    
    RecyclingBatch batch;
    if (getBatchById(pr->batchId, &batch)) {
        batch.processedWeightKg += pr->inputWeightKg;
        batch.status = BATCH_PROCESSING;
        updateBatch(&batch);
    }
    
    return 1;
}

int addRecoveryRecord(RecoveryRecord *rr) {
    FILE *fp = fopen(RECOVERY_RECORDS_FILE, "rb");
    int maxId = 0;
    if (fp) {
        RecoveryRecord temp;
        while (fread(&temp, sizeof(RecoveryRecord), 1, fp) == 1) {
            if (temp.recoveryId > maxId) maxId = temp.recoveryId;
        }
        fclose(fp);
    }
    rr->recoveryId = maxId + 1;
    char now[30];
    getCurrentTimestamp(now, sizeof(now));
    strncpy(rr->processedAt, now, sizeof(rr->processedAt)-1);
    
    fp = fopen(RECOVERY_RECORDS_FILE, "ab");
    if (!fp) return 0;
    fwrite(rr, sizeof(RecoveryRecord), 1, fp);
    fclose(fp);
    
    RecyclingBatch batch;
    if (getBatchById(rr->batchId, &batch)) {
        batch.recoveredWeightKg += rr->weightKg;
        updateBatch(&batch);
    }
    
    return 1;
}

int addResidualRecord(ResidualRecord *rr) {
    FILE *fp = fopen(RESIDUAL_RECORDS_FILE, "rb");
    int maxId = 0;
    if (fp) {
        ResidualRecord temp;
        while (fread(&temp, sizeof(ResidualRecord), 1, fp) == 1) {
            if (temp.residualId > maxId) maxId = temp.residualId;
        }
        fclose(fp);
    }
    rr->residualId = maxId + 1;
    char now[30];
    getCurrentTimestamp(now, sizeof(now));
    strncpy(rr->timestamp, now, sizeof(rr->timestamp)-1);
    
    fp = fopen(RESIDUAL_RECORDS_FILE, "ab");
    if (!fp) return 0;
    fwrite(rr, sizeof(ResidualRecord), 1, fp);
    fclose(fp);
    
    RecyclingBatch batch;
    if (getBatchById(rr->batchId, &batch)) {
        batch.residualWeightKg += rr->weightKg;
        updateBatch(&batch);
    }
    
    return 1;
}

int completeRecyclingBatch(int batchId, int operatorId) {
    (void)operatorId;
    RecyclingBatch batch;
    if (!getBatchById(batchId, &batch)) return 0;
    
    batch.status = BATCH_COMPLETED;
    char now[30];
    getCurrentTimestamp(now, sizeof(now));
    strncpy(batch.completedAt, now, sizeof(batch.completedAt)-1);
    
    return updateBatch(&batch);
}
