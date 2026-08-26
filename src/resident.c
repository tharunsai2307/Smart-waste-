#include "resident.h"
#include "utils.h"
extern char g_current_workspace[37];

void initResidentsData() {
    FILE *fp = fopen(RESIDENTS_FILE, "rb");
    if (fp != NULL) {
        fclose(fp);
        return;
    }
    
    Resident residents[2];
    memset(residents, 0, sizeof(residents));
    residents[0].residentId = 101;
    residents[0].userId = 4;
    strcpy(residents[0].address, "12 Main St");
    strcpy(residents[0].area, "Anna Nagar");
    strcpy(residents[0].city, "Chennai");
    strcpy(residents[0].postalCode, "600040");
    residents[0].ecoPoints = 50;

    residents[1].residentId = 102;
    residents[1].userId = 5;
    strcpy(residents[1].address, "45 Elm St");
    strcpy(residents[1].area, "T Nagar");
    strcpy(residents[1].city, "Chennai");
    strcpy(residents[1].postalCode, "600017");
    residents[1].ecoPoints = 20;
    
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
        // Workspace Isolation
        if (g_current_workspace[0] != '\0' && strcmp(temp.workspaceId, g_current_workspace) != 0) continue;
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
        // Workspace Isolation
        if (g_current_workspace[0] != '\0' && strcmp(temp.workspaceId, g_current_workspace) != 0) continue;
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
        // Workspace Isolation
        if (g_current_workspace[0] != '\0' && strcmp(temp.workspaceId, g_current_workspace) != 0) continue;
        printf("%-5d %-10d %-30s %-20s %-10d\n", 
               temp.residentId, temp.userId, temp.address, temp.area, temp.ecoPoints);
    }
    fclose(fp);
}
