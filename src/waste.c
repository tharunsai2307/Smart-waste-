#include "waste.h"
#include "utils.h"

void initWasteData() {
    FILE *fp = fopen(WASTE_FILE, "rb");
    if (fp != NULL) {
        fclose(fp);
        return;
    }
    
    Waste waste[] = {
        {1001, 101, 201, "Plastic", 2.5f, "2023-10-01", 1, 0},
        {1002, 101, 201, "Biodegradable", 3.0f, "2023-10-02", 0, 0},
        {1003, 102, 202, "Metal", 1.5f, "2023-10-02", 1, 0}
    };
    
    fp = fopen(WASTE_FILE, "wb");
    if (fp != NULL) {
        fwrite(waste, sizeof(Waste), 3, fp);
        fclose(fp);
    }
}

int addWaste(const Waste *w) {
    FILE *fp = fopen(WASTE_FILE, "ab");
    if (fp == NULL) return 0;
    fwrite(w, sizeof(Waste), 1, fp);
    fclose(fp);
    return 1;
}

int getWasteById(int wasteId, Waste *w) {
    FILE *fp = fopen(WASTE_FILE, "rb");
    if (fp == NULL) return 0;
    while (fread(w, sizeof(Waste), 1, fp) == 1) {
        if (w->wasteId == wasteId) {
            fclose(fp);
            return 1;
        }
    }
    fclose(fp);
    return 0;
}

int updateWaste(const Waste *w) {
    FILE *fp = fopen(WASTE_FILE, "rb");
    if (fp == NULL) return 0;
    
    FILE *tempFp = fopen("data/temp_waste.dat", "wb");
    if (tempFp == NULL) {
        fclose(fp);
        return 0;
    }
    
    Waste temp;
    int found = 0;
    while (fread(&temp, sizeof(Waste), 1, fp) == 1) {
        if (temp.wasteId == w->wasteId) {
            fwrite(w, sizeof(Waste), 1, tempFp);
            found = 1;
        } else {
            fwrite(&temp, sizeof(Waste), 1, tempFp);
        }
    }
    
    fclose(fp);
    fclose(tempFp);
    
    if (found) {
        remove(WASTE_FILE);
        rename("data/temp_waste.dat", WASTE_FILE);
    } else {
        remove("data/temp_waste.dat");
    }
    
    return found;
}

int deleteWaste(int wasteId) {
    FILE *fp = fopen(WASTE_FILE, "rb");
    if (fp == NULL) return 0;
    FILE *tempFp = fopen("data/temp_waste.dat", "wb");
    if (tempFp == NULL) {
        fclose(fp);
        return 0;
    }
    Waste temp;
    int found = 0;
    while (fread(&temp, sizeof(Waste), 1, fp) == 1) {
        if (temp.wasteId == wasteId) {
            found = 1;
        } else {
            fwrite(&temp, sizeof(Waste), 1, tempFp);
        }
    }
    fclose(fp);
    fclose(tempFp);
    remove(WASTE_FILE);
    rename("data/temp_waste.dat", WASTE_FILE);
    return found;
}

void displayAllWaste() {
    FILE *fp = fopen(WASTE_FILE, "rb");
    if (fp == NULL) {
        printf("Error opening waste file.\n");
        return;
    }
    printf("%-5s %-10s %-10s %-15s %-10s %-12s %-10s %-10s\n", 
           "W_ID", "Res_ID", "Bin_ID", "Type", "Qty(kg)", "Date", "Recyclable", "Collected");
    printf("%s", SUB_LINE);
    Waste temp;
    while (fread(&temp, sizeof(Waste), 1, fp) == 1) {
        printf("%-5d %-10d %-10d %-15s %-10.2f %-12s %-10s %-10s\n", 
               temp.wasteId, temp.residentId, temp.binId, temp.wasteType, temp.quantity,
               temp.date, temp.recyclable ? "Yes" : "No", temp.collected ? "Yes" : "No");
    }
    fclose(fp);
}

void displayWasteByResident(int residentId) {
    FILE *fp = fopen(WASTE_FILE, "rb");
    if (fp == NULL) {
        printf("Error opening waste file.\n");
        return;
    }
    printf("%-5s %-10s %-10s %-15s %-10s %-12s %-10s %-10s\n", 
           "W_ID", "Res_ID", "Bin_ID", "Type", "Qty(kg)", "Date", "Recyclable", "Collected");
    printf("%s", SUB_LINE);
    Waste temp;
    while (fread(&temp, sizeof(Waste), 1, fp) == 1) {
        if(temp.residentId == residentId) {
            printf("%-5d %-10d %-10d %-15s %-10.2f %-12s %-10s %-10s\n", 
                   temp.wasteId, temp.residentId, temp.binId, temp.wasteType, temp.quantity,
                   temp.date, temp.recyclable ? "Yes" : "No", temp.collected ? "Yes" : "No");
        }
    }
    fclose(fp);
}
