#ifndef COLLECTION_H
#define COLLECTION_H

#include "types.h"
#include "config.h"
#include <stddef.h>

void initCollectionsData();
int addCollectionRequest(CollectionRequest *req);
int getCollectionRequestById(int reqId, CollectionRequest *req);
int updateCollectionRequest(const CollectionRequest *req);
int getCollectionsByResidentId(int residentId, CollectionRequest *list, int maxCount);
int getCollectionsByHubId(int hubId, CollectionRequest *list, int maxCount);
int getCollectionsByCleanerId(int cleanerId, CollectionRequest *list, int maxCount);
int getAllCollectionRequests(CollectionRequest *list, int maxCount);

// State Machine & Workflow Validation
int isValidStateTransition(CollectionStatus from, CollectionStatus to);
const char* collectionStatusToStr(CollectionStatus s);
CollectionStatus strToCollectionStatus(const char* str);

// Priority Engine
int calculateCollectionPriorityScore(const char *urgency, const char *wasteType, float estimatedWeightKg, int waitingDays, int missedHistoryCount, char *outLevel, size_t levelLen);

// Field Ops & Proximity
double calculateDistanceMeters(double lat1, double lon1, double lat2, double lon2);
int isCleanerWithinProximity(double cleanerLat, double cleanerLng, double reqLat, double reqLng, double thresholdMeters);

// Cleaner Assignment & Workload
int canAssignCleanerToCollection(int cleanerId, int hubId, float *currentWorkloadKg, char *errMsg, size_t errLen);

// Hub Deposit & QR Validation (Phase 2 Integration)
int processHubDeposit(int collectionId, int cleanerId, const char *scannedQr, float depositedWeightKg, const char *varianceReason, int emergencyOverride, char *errMsg, size_t errLen);

#endif
