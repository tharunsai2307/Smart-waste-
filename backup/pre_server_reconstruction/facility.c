#include "facility.h"
#include "utils.h"
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

void initFacilityData() {
    FILE *fp = fopen(FACILITIES_FILE, "rb");
    if (fp == NULL) {
        fp = fopen(FACILITIES_FILE, "wb");
        if (fp != NULL) fclose(fp);
    } else {
        fclose(fp);
    }
}

int addFacility(TransportFacility *f) {
    FILE *fp = fopen(FACILITIES_FILE, "rb");
    int maxId = 0;
    if (fp) {
        TransportFacility temp;
        while (fread(&temp, sizeof(TransportFacility), 1, fp) == 1) {
            if (temp.facilityId > maxId) maxId = temp.facilityId;
        }
        fclose(fp);
    }
    f->facilityId = maxId + 1;

    if (f->facilityCode[0] == '\0') {
        snprintf(f->facilityCode, sizeof(f->facilityCode), "FAC-%03d", f->facilityId);
    }
    if (f->status[0] == '\0') {
        strncpy(f->status, "ACTIVE", sizeof(f->status) - 1);
    }

    char now[30];
    getCurrentTimestamp(now, sizeof(now));
    strncpy(f->createdAt, now, sizeof(f->createdAt) - 1);

    fp = fopen(FACILITIES_FILE, "ab");
    if (fp == NULL) return 0;
    fwrite(f, sizeof(TransportFacility), 1, fp);
    fclose(fp);
    return 1;
}

int getFacilityById(int facilityId, TransportFacility *f) {
    FILE *fp = fopen(FACILITIES_FILE, "rb");
    if (fp == NULL) return 0;
    while (fread(f, sizeof(TransportFacility), 1, fp) == 1) {
        if (f->facilityId == facilityId) {
            fclose(fp);
            return 1;
        }
    }
    fclose(fp);
    return 0;
}

int updateFacility(const TransportFacility *f) {
    FILE *fp = fopen(FACILITIES_FILE, "rb");
    if (fp == NULL) return 0;

    FILE *tempFp = fopen("data/temp_facilities.dat", "wb");
    if (tempFp == NULL) { fclose(fp); return 0; }

    TransportFacility temp;
    int found = 0;
    while (fread(&temp, sizeof(TransportFacility), 1, fp) == 1) {
        if (temp.facilityId == f->facilityId) {
            fwrite(f, sizeof(TransportFacility), 1, tempFp);
            found = 1;
        } else {
            fwrite(&temp, sizeof(TransportFacility), 1, tempFp);
        }
    }

    fclose(fp);
    fclose(tempFp);

    if (found) {
        remove(FACILITIES_FILE);
        rename("data/temp_facilities.dat", FACILITIES_FILE);
    } else {
        remove("data/temp_facilities.dat");
    }
    return found;
}

int getAllFacilities(TransportFacility *arr, int maxCount) {
    FILE *fp = fopen(FACILITIES_FILE, "rb");
    if (fp == NULL) return 0;
    int count = 0;
    while (count < maxCount && fread(&arr[count], sizeof(TransportFacility), 1, fp) == 1) {
        count++;
    }
    fclose(fp);
    return count;
}

int getActiveFacilities(TransportFacility *arr, int maxCount) {
    FILE *fp = fopen(FACILITIES_FILE, "rb");
    if (fp == NULL) return 0;
    int count = 0;
    TransportFacility temp;
    while (count < maxCount && fread(&temp, sizeof(TransportFacility), 1, fp) == 1) {
        if (strcmp(temp.status, "ACTIVE") == 0) {
            arr[count++] = temp;
        }
    }
    fclose(fp);
    return count;
}
