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
                {101, "Anna Nagar Main", 500.0f, 0.0f, "Mixed", BIN_NORMAL, "IoT"},
                {102, "Ambattur OT", 1000.0f, 0.0f, "Plastic", BIN_NORMAL, "IoT"},
                {103, "Avadi Station", 300.0f, 0.0f, "Metal", BIN_NORMAL, "IoT"},
                {104, "Poonamallee Bypass", 800.0f, 0.0f, "E-Waste", BIN_NORMAL, "IoT"}
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
            memset(&req, 0, sizeof(CollectionRequest));
            req.binId = b.binId;
            req.residentId = 0; // System generated
            req.cleanerId = 0;
            req.vehicleId = 0;
            req.hubId = 1;
            strncpy(req.address, b.location, sizeof(req.address) - 1);
            strncpy(req.wasteType, b.wasteType, sizeof(req.wasteType) - 1);
            req.estimatedWeightKg = b.currentLevel;
            req.status = COLLECTION_REQUESTED;
            strcpy(req.preferredDate, "2026-08-24");
            strcpy(req.preferredTime, "Morning (09:00 - 12:00)");
            
            char lvl[20];
            req.priorityScore = calculateCollectionPriorityScore("HIGH", b.wasteType, b.currentLevel, 0, 0, lvl, sizeof(lvl));
            strncpy(req.priorityLevel, lvl, sizeof(req.priorityLevel) - 1);
            
            addCollectionRequest(&req);
            printf("Collection request auto-generated for Bin %d.\n", b.binId);
        }
    }
}
