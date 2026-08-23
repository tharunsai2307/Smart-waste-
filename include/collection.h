#ifndef COLLECTION_H
#define COLLECTION_H

#include "types.h"
#include "config.h"

// Function prototypes
void initCollectionsData();
int addCollectionRequest(const CollectionRequest *req);
int getCollectionRequestById(int reqId, CollectionRequest *req);
int updateCollectionRequest(const CollectionRequest *req);
void displayAllCollections();

// Priority Queue / Workflow Engine
void manageCollectionWorkflow();
void insertCollectionRequest(CollectionRequest req);
int extractMaxCollectionRequest(CollectionRequest *outReq);
int calculatePriorityScore(float fillLevel, const char *wasteType, int waitingDays, int areaDensity);
void processNextCollection();

#endif
