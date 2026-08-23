#include "collection.h"
#include "vehicle.h"
#include "bin.h"
#include "alert.h"
#include "utils.h"
#include "recycling.h"
#include "route.h"

// Max Heap for Priority Queue in memory
#define MAX_QUEUE 100
CollectionRequest priorityQueue[MAX_QUEUE];
int pqSize = 0;

void swap(CollectionRequest *a, CollectionRequest *b) {
    CollectionRequest temp = *a;
    *a = *b;
    *b = temp;
}

void heapifyUp(int index) {
    if (index && priorityQueue[(index - 1) / 2].priorityScore < priorityQueue[index].priorityScore) {
        swap(&priorityQueue[index], &priorityQueue[(index - 1) / 2]);
        heapifyUp((index - 1) / 2);
    }
}

void heapifyDown(int index) {
    int largest = index;
    int left = 2 * index + 1;
    int right = 2 * index + 2;
    
    if (left < pqSize && priorityQueue[left].priorityScore > priorityQueue[largest].priorityScore)
        largest = left;
    
    if (right < pqSize && priorityQueue[right].priorityScore > priorityQueue[largest].priorityScore)
        largest = right;
        
    if (largest != index) {
        swap(&priorityQueue[index], &priorityQueue[largest]);
        heapifyDown(largest);
    }
}

void insertCollectionRequest(CollectionRequest req) {
    if (pqSize == MAX_QUEUE) {
        printf("Priority Queue is full!\n");
        return;
    }
    priorityQueue[pqSize] = req;
    heapifyUp(pqSize);
    pqSize++;
}

int extractMaxCollectionRequest(CollectionRequest *outReq) {
    if (pqSize <= 0) return 0;
    
    *outReq = priorityQueue[0];
    priorityQueue[0] = priorityQueue[pqSize - 1];
    pqSize--;
    heapifyDown(0);
    return 1;
}

void loadPendingIntoQueue() {
    pqSize = 0;
    FILE *fp = fopen(COLLECTIONS_FILE, "rb");
    if (fp == NULL) return;
    
    CollectionRequest req;
    while (fread(&req, sizeof(CollectionRequest), 1, fp) == 1) {
        if (req.status == COLLECTION_PENDING) {
            insertCollectionRequest(req);
        }
    }
    fclose(fp);
}

void initCollectionsData() {
    FILE *fp = fopen(COLLECTIONS_FILE, "rb");
    if (fp == NULL) {
        fp = fopen(COLLECTIONS_FILE, "wb");
        // Create dummy data...
        CollectionRequest c1 = {1, 101, 1, 1, 0, 0, 45.5f, 95, "HIGH", COLLECTION_PENDING, "2023-10-25", ""};
        CollectionRequest c2 = {2, 102, 2, 2, 0, 0, 30.0f, 60, "LOW", COLLECTION_PENDING, "2023-10-26", ""};
        CollectionRequest c3 = {3, 103, 3, 3, 0, 0, 60.0f, 85, "MEDIUM", COLLECTION_PENDING, "2023-10-27", ""};
        
        fwrite(&c1, sizeof(CollectionRequest), 1, fp);
        fwrite(&c2, sizeof(CollectionRequest), 1, fp);
        fwrite(&c3, sizeof(CollectionRequest), 1, fp);
    }
    if (fp) fclose(fp);
}

int calculatePriorityScore(float fillLevel, const char *wasteType, int waitingDays, int areaDensity) {
    int fillScore = (int)((fillLevel > 100.0f ? 100.0f : fillLevel) * 0.5f);
    int typeScore = (strcmp(wasteType, "Hazardous") == 0) ? 30 : ((strcmp(wasteType, "E-Waste") == 0) ? 20 : 10);
    int waitScore = (waitingDays > 5 ? 5 : waitingDays) * 2;
    int areaScore = (areaDensity > 1000 ? 10 : 5);
    return fillScore + typeScore + waitScore + areaScore;
}

int addCollectionRequest(const CollectionRequest *req) {
    FILE *fp = fopen(COLLECTIONS_FILE, "ab");
    if (fp == NULL) return 0;
    fwrite(req, sizeof(CollectionRequest), 1, fp);
    fclose(fp);
    return 1;
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
    while (fread(&temp, sizeof(CollectionRequest), 1, fp) == 1) {
        if (temp.collectionId == req->collectionId) {
            fwrite(req, sizeof(CollectionRequest), 1, tempFp);
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

void processNextCollection() {
    loadPendingIntoQueue();
    
    CollectionRequest targetReq;
    if (!extractMaxCollectionRequest(&targetReq)) {
        printf("No pending collection requests.\n");
        return;
    }
    
    printf("Processing highest priority request (ID: %d, Score: %d)\n", targetReq.collectionId, targetReq.priorityScore);
    
    // Find Bin
    Bin b;
    if (!getBinById(targetReq.binId, &b)) {
        printf("Error finding associated bin.\n");
        return;
    }
    
    // Find Vehicle (simulated logic: first available)
    FILE *vfp = fopen(VEHICLES_FILE, "rb");
    Vehicle v;
    int vFound = 0;
    if (vfp) {
        while (fread(&v, sizeof(Vehicle), 1, vfp)) {
            if (v.status == VEHICLE_AVAILABLE && v.capacity >= targetReq.quantity) {
                vFound = 1;
                break;
            }
        }
        fclose(vfp);
    }
    
    if (!vFound) {
        printf("No suitable vehicle available for this collection.\n");
        return;
    }
    
    // Assign Vehicle
    targetReq.vehicleId = v.vehicleId;
    targetReq.status = COLLECTION_ASSIGNED;
    updateCollectionRequest(&targetReq);
    
    v.status = VEHICLE_ASSIGNED;
    updateVehicle(&v);
    
    printf("Assigned Vehicle %s to Collection %d\n", v.vehicleNumber, targetReq.collectionId);
    
    // Calculate Route (Simulated Depot=0 to Bin logic, mapped by binId for simplicity)
    int binNode = (b.binId % 5) + 1; // Map binId to 1-5 nodes
    findShortestPath(0, binNode);
    
    // Mark Complete
    targetReq.status = COLLECTION_COMPLETED;
    strcpy(targetReq.completionDate, "2023-10-30");
    updateCollectionRequest(&targetReq);
    
    v.status = VEHICLE_AVAILABLE;
    updateVehicle(&v);
    
    b.currentLevel = 0.0f;
    b.status = BIN_NORMAL;
    updateBin(&b);
    
    // Process Recycling
    processCollectionForRecycling(targetReq.requestId, b.wasteType, targetReq.quantity, targetReq.residentId);
    
    printf("Collection %d completed successfully.\n", targetReq.collectionId);
}
