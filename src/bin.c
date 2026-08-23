#include "bin.h"
#include "collection.h"
#include "alert.h"
#include "utils.h"

void initBinsData() {
    FILE *fp = fopen(BINS_FILE, "rb");
    if (fp == NULL) {
        fp = fopen(BINS_FILE, "wb");
        if (fp != NULL) {
            Bin dummyBins[] = {
                {101, "Anna Nagar Main", 500.0f, 100.0f, "Mixed", BIN_NORMAL},
                {102, "Ambattur OT", 1000.0f, 850.0f, "Plastic", BIN_WARNING},
                {103, "Avadi Station", 300.0f, 290.0f, "Metal", BIN_CRITICAL},
                {104, "Poonamallee Bypass", 800.0f, 850.0f, "E-Waste", BIN_OVERFLOW}
            };
            fwrite(dummyBins, sizeof(Bin), 4, fp);
            fclose(fp);
        }
    } else {
        fclose(fp);
    }
}

int addBin(const Bin *b) {
    FILE *fp = fopen(BINS_FILE, "ab");
    if (fp == NULL) return 0;
    fwrite(b, sizeof(Bin), 1, fp);
    fclose(fp);
    return 1;
}

int getBinById(int binId, Bin *b) {
    FILE *fp = fopen(BINS_FILE, "rb");
    if (fp == NULL) return 0;
    while (fread(b, sizeof(Bin), 1, fp) == 1) {
        if (b->binId == binId) {
            fclose(fp);
            return 1;
        }
    }
    fclose(fp);
    return 0;
}

int updateBin(const Bin *b) {
    FILE *fp = fopen(BINS_FILE, "rb");
    if (fp == NULL) return 0;
    
    FILE *tempFp = fopen("data/temp_bins.dat", "wb");
    if (tempFp == NULL) {
        fclose(fp);
        return 0;
    }
    
    Bin temp;
    int found = 0;
    while (fread(&temp, sizeof(Bin), 1, fp) == 1) {
        if (temp.binId == b->binId) {
            fwrite(b, sizeof(Bin), 1, tempFp);
            found = 1;
        } else {
            fwrite(&temp, sizeof(Bin), 1, tempFp);
        }
    }
    
    fclose(fp);
    fclose(tempFp);
    
    if (found) {
        remove(BINS_FILE);
        rename("data/temp_bins.dat", BINS_FILE);
    } else {
        remove("data/temp_bins.dat");
    }
    
    return found;
}

int deleteBin(int binId) {
    FILE *fp = fopen(BINS_FILE, "rb");
    if (fp == NULL) return 0;
    
    FILE *tempFp = fopen("data/temp_bins.dat", "wb");
    if (tempFp == NULL) {
        fclose(fp);
        return 0;
    }
    
    Bin temp;
    int found = 0;
    while (fread(&temp, sizeof(Bin), 1, fp) == 1) {
        if (temp.binId != binId) {
            fwrite(&temp, sizeof(Bin), 1, tempFp);
        } else {
            found = 1;
        }
    }
    
    fclose(fp);
    fclose(tempFp);
    
    if (found) {
        remove(BINS_FILE);
        rename("data/temp_bins.dat", BINS_FILE);
    } else {
        remove("data/temp_bins.dat");
    }
    return found;
}

void displayAllBins() {
    printHeader("ALL SMART BINS");
    FILE *fp = fopen(BINS_FILE, "rb");
    if (fp == NULL) {
        printf("No bins found.\n");
        return;
    }
    
    Bin temp;
    printf("%-5s %-20s %-10s %-10s %-15s %-10s\n", "ID", "Location", "Capacity", "Level", "Type", "Status(ID)");
    printf("%s", SUB_LINE);
    while (fread(&temp, sizeof(Bin), 1, fp) == 1) {
        printf("%-5d %-20s %-10.2f %-10.2f %-15s %-10d\n",
               temp.binId, temp.location, temp.capacity, 
               temp.currentLevel, temp.wasteType, temp.status);
    }
    fclose(fp);
}

void addWasteToBin(int binId, float quantity, const char *wasteType) {
    (void)wasteType; // Suppress unused parameter warning
    Bin b;
    if (getBinById(binId, &b)) {
        b.currentLevel += quantity;
        float fillPercentage = (b.currentLevel / b.capacity) * 100.0f;
        
        if (fillPercentage >= 100.0f) {
            b.status = BIN_OVERFLOW;
            generateAlert("BIN_OVERFLOW", b.binId, "Bin is overflowing!");
        } else if (fillPercentage >= CRITICAL_THRESHOLD) {
            b.status = BIN_CRITICAL;
            generateAlert("BIN_CRITICAL", b.binId, "Bin reached critical capacity.");
        } else if (fillPercentage >= WARNING_THRESHOLD) {
            b.status = BIN_WARNING;
        } else {
            b.status = BIN_NORMAL;
        }
        
        updateBin(&b);
        
        if (fillPercentage >= CRITICAL_THRESHOLD) {
            CollectionRequest req;
            req.collectionId = rand() % 10000; 
            req.requestId = rand() % 10000;
            req.binId = b.binId;
            req.residentId = 0; // System generated
            req.operatorId = 0;
            req.vehicleId = 0;
            req.quantity = b.currentLevel;
            req.status = COLLECTION_PENDING;
            strcpy(req.requestDate, "2023-10-31");
            strcpy(req.priorityLevel, "HIGH");
            req.priorityScore = calculatePriorityScore(fillPercentage, b.wasteType, 0, 5000);
            
            addCollectionRequest(&req);
            printf("Collection request auto-generated for Bin %d.\n", b.binId);
        }
    }
}
