#include "report.h"
#include "user.h"
#include "resident.h"
#include "waste.h"
#include "bin.h"
#include "vehicle.h"
#include "collection.h"
#include "recycling.h"
#include "alert.h"
#include "utils.h"

void displayOverallDashboard() {
    printHeader("SMART WASTE MANAGEMENT DASHBOARD");
    
    // Counters
    int numResidents = 0;
    float totalWaste = 0, totalRecyclable = 0, totalRecycled = 0;
    int normalBins = 0, warningBins = 0, criticalBins = 0, overflowBins = 0;
    int pendingReqs = 0, activeReqs = 0;
    int availVehicles = 0, onRouteVehicles = 0;
    float totalValue = 0;
    
    // Read Residents
    FILE *fp = fopen(RESIDENTS_FILE, "rb");
    if (fp) {
        Resident r;
        while (fread(&r, sizeof(Resident), 1, fp)) numResidents++;
        fclose(fp);
    }
    
    // Read Waste
    fp = fopen(WASTE_FILE, "rb");
    if (fp) {
        Waste w;
        while (fread(&w, sizeof(Waste), 1, fp)) {
            totalWaste += w.quantity;
            if (w.recyclable) totalRecyclable += w.quantity;
        }
        fclose(fp);
    }
    
    // Read Recycling
    fp = fopen(RECYCLING_FILE, "rb");
    if (fp) {
        RecyclingRecord rr;
        while (fread(&rr, sizeof(RecyclingRecord), 1, fp)) {
            totalRecycled += rr.recycledQuantity;
            totalValue += rr.value;
        }
        fclose(fp);
    }
    
    // Read Bins
    fp = fopen(BINS_FILE, "rb");
    if (fp) {
        Bin b;
        while (fread(&b, sizeof(Bin), 1, fp)) {
            if (b.status == BIN_NORMAL) normalBins++;
            else if (b.status == BIN_WARNING) warningBins++;
            else if (b.status == BIN_CRITICAL) criticalBins++;
            else if (b.status == BIN_OVERFLOW) overflowBins++;
        }
        fclose(fp);
    }
    
    // Read Collections
    fp = fopen(COLLECTIONS_FILE, "rb");
    if (fp) {
        CollectionRequest c;
        while (fread(&c, sizeof(CollectionRequest), 1, fp)) {
            if (c.status == COLLECTION_PENDING) pendingReqs++;
            else if (c.status != COLLECTION_COMPLETED) activeReqs++;
        }
        fclose(fp);
    }
    
    // Read Vehicles
    fp = fopen(VEHICLES_FILE, "rb");
    if (fp) {
        Vehicle v;
        while (fread(&v, sizeof(Vehicle), 1, fp)) {
            if (v.status == VEHICLE_AVAILABLE) availVehicles++;
            else if (v.status == VEHICLE_ASSIGNED || v.status == VEHICLE_ON_ROUTE) onRouteVehicles++;
        }
        fclose(fp);
    }
    
    float efficiency = 0.0f;
    if (totalRecyclable > 0) efficiency = (totalRecycled / totalRecyclable) * 100.0f;
    
    printf("Residents                  : %d\n", numResidents);
    printf("Total Waste                : %.2f kg\n", totalWaste);
    printf("Recyclable Waste           : %.2f kg\n", totalRecyclable);
    printf("Recycled Waste             : %.2f kg\n\n", totalRecycled);
    
    printf("Recycling Efficiency       : %.2f %%\n\n", efficiency);
    
    printf("Normal Bins                : %d\n", normalBins);
    printf("Warning Bins               : %d\n", warningBins);
    printf("Critical Bins              : %d\n", criticalBins);
    printf("Overflow Bins              : %d\n\n", overflowBins);
    
    printf("Pending Collections        : %d\n", pendingReqs);
    printf("Active Collections         : %d\n\n", activeReqs);
    
    printf("Available Vehicles         : %d\n", availVehicles);
    printf("Vehicles On Route          : %d\n\n", onRouteVehicles);
    
    printf("Estimated Recycling Value  : Rs. %.2f\n", totalValue);
    printf("%s", TITLE_LINE);
}

void generateWasteReport() {
    printHeader("WASTE CATEGORY REPORT");
    
    float plastic = 0, paper = 0, metal = 0, ewaste = 0, bio = 0, mixed = 0, haz = 0;
    FILE *fp = fopen(WASTE_FILE, "rb");
    if (fp == NULL) return;
    
    Waste w;
    while (fread(&w, sizeof(Waste), 1, fp)) {
        if (strcmp(w.wasteType, "Plastic") == 0) plastic += w.quantity;
        else if (strcmp(w.wasteType, "Paper") == 0) paper += w.quantity;
        else if (strcmp(w.wasteType, "Metal") == 0) metal += w.quantity;
        else if (strcmp(w.wasteType, "E-Waste") == 0) ewaste += w.quantity;
        else if (strcmp(w.wasteType, "Biodegradable") == 0) bio += w.quantity;
        else if (strcmp(w.wasteType, "Mixed") == 0) mixed += w.quantity;
        else if (strcmp(w.wasteType, "Hazardous") == 0) haz += w.quantity;
    }
    fclose(fp);
    
    printf("%-20s %-10s\n", "Category", "Qty (kg)");
    printf("%s", SUB_LINE);
    printf("%-20s %-10.2f\n", "Plastic", plastic);
    printf("%-20s %-10.2f\n", "Paper", paper);
    printf("%-20s %-10.2f\n", "Metal", metal);
    printf("%-20s %-10.2f\n", "E-Waste", ewaste);
    printf("%-20s %-10.2f\n", "Biodegradable", bio);
    printf("%-20s %-10.2f\n", "Hazardous", haz);
    printf("%-20s %-10.2f\n", "Mixed Waste", mixed);
}

void backupFile(const char *src, const char *dest) {
    FILE *fSrc = fopen(src, "rb");
    if (fSrc == NULL) return; // File might not exist yet
    
    FILE *fDest = fopen(dest, "wb");
    if (fDest == NULL) {
        fclose(fSrc);
        return;
    }
    
    char buffer[1024];
    size_t bytes;
    while ((bytes = fread(buffer, 1, sizeof(buffer), fSrc)) > 0) {
        fwrite(buffer, 1, bytes, fDest);
    }
    
    fclose(fSrc);
    fclose(fDest);
    printf("Backed up %s to %s\n", src, dest);
}

void backupData() {
    printHeader("BACKUP DATA");
    backupFile(USERS_FILE, "backup/users_backup.dat");
    backupFile(RESIDENTS_FILE, "backup/residents_backup.dat");
    backupFile(WASTE_FILE, "backup/waste_backup.dat");
    backupFile(BINS_FILE, "backup/bins_backup.dat");
    backupFile(VEHICLES_FILE, "backup/vehicles_backup.dat");
    backupFile(COLLECTIONS_FILE, "backup/collections_backup.dat");
    backupFile(RECYCLING_FILE, "backup/recycling_backup.dat");
    backupFile(ALERTS_FILE, "backup/alerts_backup.dat");
    printf("\nBackup Completed Successfully.\n");
}

void restoreData() {
    printHeader("RESTORE DATA");
    printf("WARNING: This will overwrite current data with the backup.\n");
    printf("Proceed? (1 for Yes, 0 for No): ");
    
    int choice;
    if (getSafeInt(&choice) && choice == 1) {
        backupFile("backup/users_backup.dat", USERS_FILE);
        backupFile("backup/residents_backup.dat", RESIDENTS_FILE);
        backupFile("backup/waste_backup.dat", WASTE_FILE);
        backupFile("backup/bins_backup.dat", BINS_FILE);
        backupFile("backup/vehicles_backup.dat", VEHICLES_FILE);
        backupFile("backup/collections_backup.dat", COLLECTIONS_FILE);
        backupFile("backup/recycling_backup.dat", RECYCLING_FILE);
        backupFile("backup/alerts_backup.dat", ALERTS_FILE);
        printf("\nRestore Completed Successfully.\n");
    } else {
        printf("\nRestore Aborted.\n");
    }
}

void resetDemoData() {
    printHeader("RESET DEMO DATA");
    printf("WARNING: This will delete ALL current data and restart the system.\n");
    printf("Proceed? (1 for Yes, 0 for No): ");
    
    int choice;
    if (getSafeInt(&choice) && choice == 1) {
        remove(USERS_FILE);
        remove(RESIDENTS_FILE);
        remove(WASTE_FILE);
        remove(BINS_FILE);
        remove(VEHICLES_FILE);
        remove(COLLECTIONS_FILE);
        remove(RECYCLING_FILE);
        remove(ALERTS_FILE);
        printf("\nData wiped successfully. Restart the application to regenerate demo data.\n");
        pauseScreen();
        exit(0);
    } else {
        printf("\nReset Aborted.\n");
    }
}
