#include "resident.h"
#include "utils.h"

void initResidentsData() {
    FILE *fp = fopen(RESIDENTS_FILE, "rb");
    if (fp != NULL) {
        fclose(fp);
        return;
    }
    
    Resident residents[] = {
        {101, 4, "12 Main St", "Anna Nagar", 50},
        {102, 5, "45 Elm St", "T Nagar", 20}
    };
    
    fp = fopen(RESIDENTS_FILE, "wb");
    if (fp != NULL) {
        fwrite(residents, sizeof(Resident), 2, fp);
        fclose(fp);
    }
}

int addResident(const Resident *res) {
    FILE *fp = fopen(RESIDENTS_FILE, "ab");
    if (fp == NULL) return 0;
    fwrite(res, sizeof(Resident), 1, fp);
    fclose(fp);
    return 1;
}

int getResidentById(int resId, Resident *res) {
    FILE *fp = fopen(RESIDENTS_FILE, "rb");
    if (fp == NULL) return 0;
    while (fread(res, sizeof(Resident), 1, fp) == 1) {
        if (res->residentId == resId) {
            fclose(fp);
            return 1;
        }
    }
    fclose(fp);
    return 0;
}

int getResidentByUserId(int userId, Resident *res) {
    FILE *fp = fopen(RESIDENTS_FILE, "rb");
    if (fp == NULL) return 0;
    while (fread(res, sizeof(Resident), 1, fp) == 1) {
        if (res->userId == userId) {
            fclose(fp);
            return 1;
        }
    }
    fclose(fp);
    return 0;
}

int updateResident(const Resident *res) {
    FILE *fp = fopen(RESIDENTS_FILE, "rb");
    if (fp == NULL) return 0;
    
    FILE *tempFp = fopen("data/temp_residents.dat", "wb");
    if (tempFp == NULL) {
        fclose(fp);
        return 0;
    }
    
    Resident temp;
    int found = 0;
    while (fread(&temp, sizeof(Resident), 1, fp) == 1) {
        if (temp.residentId == res->residentId) {
            fwrite(res, sizeof(Resident), 1, tempFp);
            found = 1;
        } else {
            fwrite(&temp, sizeof(Resident), 1, tempFp);
        }
    }
    
    fclose(fp);
    fclose(tempFp);
    
    if (found) {
        remove(RESIDENTS_FILE);
        rename("data/temp_residents.dat", RESIDENTS_FILE);
    } else {
        remove("data/temp_residents.dat");
    }
    
    return found;
}

int deleteResident(int resId) {
    FILE *fp = fopen(RESIDENTS_FILE, "rb");
    if (fp == NULL) return 0;
    FILE *tempFp = fopen("data/temp_residents.dat", "wb");
    if (tempFp == NULL) {
        fclose(fp);
        return 0;
    }
    Resident temp;
    int found = 0;
    while (fread(&temp, sizeof(Resident), 1, fp) == 1) {
        if (temp.residentId == resId) {
            found = 1;
        } else {
            fwrite(&temp, sizeof(Resident), 1, tempFp);
        }
    }
    fclose(fp);
    fclose(tempFp);
    remove(RESIDENTS_FILE);
    rename("data/temp_residents.dat", RESIDENTS_FILE);
    return found;
}

void displayAllResidents() {
    FILE *fp = fopen(RESIDENTS_FILE, "rb");
    if (fp == NULL) {
        printf("Error opening residents file.\n");
        return;
    }
    printf("%-5s %-10s %-30s %-20s %-10s\n", "ID", "UserID", "Address", "Area", "EcoPts");
    printf("%s", SUB_LINE);
    Resident temp;
    while (fread(&temp, sizeof(Resident), 1, fp) == 1) {
        printf("%-5d %-10d %-30s %-20s %-10d\n", 
               temp.residentId, temp.userId, temp.address, temp.area, temp.ecoPoints);
    }
    fclose(fp);
}
