#ifndef RECYCLING_H
#define RECYCLING_H

#include "types.h"
#include "config.h"

// Function prototypes
void initRecyclingData();
void processCollectionForRecycling(int collectionId, const char *wasteType, float quantity, int residentId);
void displayRecyclingStats();
// Phase 5 API
int initRecyclingPhase5();

int receiveTransferAtFacility(int transferId, int facilityId, int operatorId);
int recordReceivedWeight(int transferId, float receivedWeightKg, const char* measurementSource, int operatorId, float varianceThresholdPct);
int processTransferDecision(int transferId, const char* decision, const char* reason, int operatorId);

int createRecyclingBatch(RecyclingBatch *batch);
int getBatchById(int batchId, RecyclingBatch *batch);
int updateBatch(const RecyclingBatch *batch);
int getAllBatches(RecyclingBatch *list, int maxCount);
int getBatchesByFacility(int facilityId, RecyclingBatch *list, int maxCount);

int addWasteClassification(WasteClassification *wc);
int getBatchesClassifications(int batchId, WasteClassification *list, int maxCount);

int addSegregationRecord(SegregationRecord *sr);
int addProcessingRecord(ProcessingRecord *pr);
int addRecoveryRecord(RecoveryRecord *rr);
int addResidualRecord(ResidualRecord *rr);

int completeRecyclingBatch(int batchId, int operatorId);

#endif
