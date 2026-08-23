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
