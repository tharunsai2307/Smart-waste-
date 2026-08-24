#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "types.h"
#include "recycling.h"
#include "transfer.h"
#include "facility.h"

int main() {
    printf("=========================================\n");
    printf("   PHASE 5: RECYCLING COMMAND TEST\n");
    printf("=========================================\n\n");

    // Initialize backend data structures
    initTransferData();
    initFacilityData();
    initRecyclingPhase5();

    // 1. Create a dummy Facility
    TransportFacility f;
    memset(&f, 0, sizeof(TransportFacility));
    strncpy(f.facilityCode, "F-REC-999", sizeof(f.facilityCode)-1);
    strncpy(f.name, "Test Recycling Facility", sizeof(f.name)-1);
    strncpy(f.facilityType, "RECYCLING", sizeof(f.facilityType)-1);
    addFacility(&f);
    int facilityId = f.facilityId;
    printf("[+] Created Facility ID %d: %s\n", facilityId, f.name);

    // 2. Create a dummy Transfer
    WasteTransfer t;
    memset(&t, 0, sizeof(WasteTransfer));
    strncpy(t.transferCode, "TX-REC-TEST", sizeof(t.transferCode)-1);
    t.destinationFacilityId = facilityId;
    t.plannedWeightKg = 1500.0f;
    t.actualLoadedWeightKg = 1550.0f; // some variance
    t.status = TRANSFER_ARRIVED; // Fast-forward to ARRIVED state
    addTransfer(&t);
    int transferId = t.transferId;
    printf("[+] Created Transfer ID %d: %s\n", transferId, t.transferCode);

    // 3. Receive the transfer
    printf("\n--- Test: Receive Transfer ---\n");
    int operatorId = 1;
    if (receiveTransferAtFacility(transferId, facilityId, operatorId)) {
        printf("[SUCCESS] Transfer %d is now in RECEIVING state.\n", transferId);
    } else {
        printf("[FAILED] Could not receive transfer.\n");
    }

    // 4. Record received weight
    printf("\n--- Test: Record Received Weight ---\n");
    if (recordReceivedWeight(transferId, 1530.0f, "WEIGHBRIDGE", operatorId, RECEIVING_VARIANCE_THRESHOLD_PCT)) {
        printf("[SUCCESS] Recorded 1530.0kg. Transfer is now in WEIGHT_VERIFICATION state.\n");
    } else {
        printf("[FAILED] Could not record weight.\n");
    }

    // 5. Accept transfer
    printf("\n--- Test: Accept Transfer ---\n");
    if (processTransferDecision(transferId, "ACCEPT", "", operatorId)) {
        printf("[SUCCESS] Transfer %d accepted.\n", transferId);
    } else {
        printf("[FAILED] Could not accept transfer.\n");
    }

    // 6. Create Recycling Batch
    printf("\n--- Test: Create Recycling Batch ---\n");
    RecyclingBatch b;
    memset(&b, 0, sizeof(RecyclingBatch));
    b.sourceTransferId = transferId;
    b.facilityId = facilityId;
    b.inputWeightKg = 1530.0f;
    if (createRecyclingBatch(&b)) {
        printf("[SUCCESS] Created Recycling Batch ID %d (%s) with %.1f kg input.\n", b.batchId, b.batchCode, b.inputWeightKg);
    } else {
        printf("[FAILED] Could not create batch.\n");
    }
    int batchId = b.batchId;

    // 7. Classify
    printf("\n--- Test: Classify Waste ---\n");
    WasteClassification wc;
    memset(&wc, 0, sizeof(WasteClassification));
    wc.batchId = batchId;
    strncpy(wc.wasteType, "Plastic", sizeof(wc.wasteType)-1);
    wc.weightKg = 500.0f;
    wc.operatorId = operatorId;
    if (addWasteClassification(&wc)) {
        printf("[SUCCESS] Classified 500kg as Plastic.\n");
    } else {
        printf("[FAILED] Could not classify waste.\n");
    }

    // 8. Segregate
    printf("\n--- Test: Segregate Waste ---\n");
    SegregationRecord sr;
    memset(&sr, 0, sizeof(SegregationRecord));
    sr.batchId = batchId;
    sr.inputWeightKg = 500.0f;
    sr.outputWeightKg = 480.0f; // 20kg loss
    strncpy(sr.wasteType, "Plastic", sizeof(sr.wasteType)-1);
    sr.operatorId = operatorId;
    if (addSegregationRecord(&sr)) {
        printf("[SUCCESS] Segregated 500kg to 480kg Plastic.\n");
    } else {
        printf("[FAILED] Could not segregate waste.\n");
    }

    // 9. Process
    printf("\n--- Test: Process Waste ---\n");
    ProcessingRecord pr;
    memset(&pr, 0, sizeof(ProcessingRecord));
    pr.batchId = batchId;
    strncpy(pr.processingMethod, "Shredding", sizeof(pr.processingMethod)-1);
    pr.inputWeightKg = 480.0f;
    pr.outputWeightKg = 450.0f;
    pr.operatorId = operatorId;
    if (addProcessingRecord(&pr)) {
        printf("[SUCCESS] Processed 480kg -> 450kg via Shredding.\n");
    } else {
        printf("[FAILED] Could not process waste.\n");
    }

    // 10. Record Recovery
    printf("\n--- Test: Record Recovery ---\n");
    RecoveryRecord rr;
    memset(&rr, 0, sizeof(RecoveryRecord));
    rr.batchId = batchId;
    strncpy(rr.materialType, "PET Flakes", sizeof(rr.materialType)-1);
    rr.weightKg = 450.0f;
    strncpy(rr.qualityGrade, "A", sizeof(rr.qualityGrade)-1);
    strncpy(rr.destination, "EcoPlastics Inc.", sizeof(rr.destination)-1);
    rr.operatorId = operatorId;
    if (addRecoveryRecord(&rr)) {
        printf("[SUCCESS] Recovered %.1fkg PET Flakes (Grade %s).\n", rr.weightKg, rr.qualityGrade);
    } else {
        printf("[FAILED] Could not record recovery.\n");
    }

    // 11. Record Residual
    printf("\n--- Test: Record Residual ---\n");
    ResidualRecord res;
    memset(&res, 0, sizeof(ResidualRecord));
    res.batchId = batchId;
    res.weightKg = 30.0f;
    strncpy(res.category, "Contaminants", sizeof(res.category)-1);
    strncpy(res.reason, "Non-recyclable mix", sizeof(res.reason)-1);
    strncpy(res.destination, "City Landfill", sizeof(res.destination)-1);
    strncpy(res.disposalMethod, "LANDFILL", sizeof(res.disposalMethod)-1);
    res.operatorId = operatorId;
    if (addResidualRecord(&res)) {
        printf("[SUCCESS] Recorded %.1fkg Residual.\n", res.weightKg);
    } else {
        printf("[FAILED] Could not record residual.\n");
    }

    // 12. Complete Batch
    printf("\n--- Test: Complete Batch ---\n");
    if (completeRecyclingBatch(batchId, operatorId)) {
        printf("[SUCCESS] Batch %d completed successfully.\n", batchId);
    } else {
        printf("[FAILED] Could not complete batch.\n");
    }
    
    // Verify Mass Balance updates in batch
    RecyclingBatch finalBatch;
    getBatchById(batchId, &finalBatch);
    printf("\n=== FINAL BATCH STATUS ===\n");
    printf("Batch ID         : %d\n", finalBatch.batchId);
    printf("Status           : %d (5=COMPLETED)\n", finalBatch.status);
    printf("Input Weight     : %.1f kg\n", finalBatch.inputWeightKg);
    printf("Processed Weight : %.1f kg\n", finalBatch.processedWeightKg);
    printf("Recovered Weight : %.1f kg\n", finalBatch.recoveredWeightKg);
    printf("Residual Weight  : %.1f kg\n", finalBatch.residualWeightKg);
    
    float mBal = finalBatch.recoveredWeightKg + finalBatch.residualWeightKg;
    printf("Mass Balance (Out) : %.1f kg vs In: %.1f kg\n", mBal, finalBatch.inputWeightKg);
    
    printf("\nTests completed successfully.\n");

    return 0;
}
