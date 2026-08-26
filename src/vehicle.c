#include "vehicle.h"
#include "utils.h"
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <time.h>
extern char g_current_workspace[37];

// ─────────────────────────────────────────────────────────
// Status conversions
// ─────────────────────────────────────────────────────────

const char* vehicleStatusToStrV2(VehicleStatus s) {
    switch (s) {
        case VEHICLE_AVAILABLE:      return "AVAILABLE";
        case VEHICLE_ASSIGNED:       return "ASSIGNED";
        case VEHICLE_LOADING:        return "LOADING";
        case VEHICLE_ON_ROUTE:       return "ON_ROUTE";
        case VEHICLE_FULL:           return "FULL";
        case VEHICLE_MAINTENANCE:    return "MAINTENANCE";
        case VEHICLE_OUT_OF_SERVICE: return "OUT_OF_SERVICE";
        case VEHICLE_RETIRED:        return "RETIRED";
        default:                     return "UNKNOWN";
    }
}

VehicleStatus vehicleStatusFromStr(const char *s) {
    if (strcmp(s, "AVAILABLE")      == 0) return VEHICLE_AVAILABLE;
    if (strcmp(s, "ASSIGNED")       == 0) return VEHICLE_ASSIGNED;
    if (strcmp(s, "LOADING")        == 0) return VEHICLE_LOADING;
    if (strcmp(s, "ON_ROUTE")       == 0) return VEHICLE_ON_ROUTE;
    if (strcmp(s, "FULL")           == 0) return VEHICLE_FULL;
    if (strcmp(s, "MAINTENANCE")    == 0) return VEHICLE_MAINTENANCE;
    if (strcmp(s, "OUT_OF_SERVICE") == 0) return VEHICLE_OUT_OF_SERVICE;
    if (strcmp(s, "RETIRED")        == 0) return VEHICLE_RETIRED;
    return VEHICLE_AVAILABLE;
}

// ─────────────────────────────────────────────────────────
// Vehicle compliance check (insurance, inspection, status)
// ─────────────────────────────────────────────────────────

// Compare a date string "YYYY-MM-DD" against today, returns 1 if still valid
static int isDateValid(const char *dateStr) {
    if (!dateStr || strlen(dateStr) < 10) return 0; // missing = invalid
    int y, m, d;
    if (sscanf(dateStr, "%d-%d-%d", &y, &m, &d) != 3) return 0;

    time_t now = time(NULL);
    struct tm *tm_now = localtime(&now);
    int todayY = tm_now->tm_year + 1900;
    int todayM = tm_now->tm_mon + 1;
    int todayD = tm_now->tm_mday;

    if (y > todayY) return 1;
    if (y == todayY && m > todayM) return 1;
    if (y == todayY && m == todayM && d >= todayD) return 1;
    return 0;
}

int isVehicleCompliant(const Vehicle *v, char *errMsg, size_t errLen) {
    if (v->status == VEHICLE_MAINTENANCE) {
        if (errMsg) snprintf(errMsg, errLen, "Vehicle %s is under maintenance.", v->vehicleCode);
        return 0;
    }
    if (v->status == VEHICLE_OUT_OF_SERVICE) {
        if (errMsg) snprintf(errMsg, errLen, "Vehicle %s is out of service.", v->vehicleCode);
        return 0;
    }
    if (v->status == VEHICLE_RETIRED) {
        if (errMsg) snprintf(errMsg, errLen, "Vehicle %s is retired.", v->vehicleCode);
        return 0;
    }
    if (v->status == VEHICLE_ON_ROUTE || v->status == VEHICLE_ASSIGNED || v->status == VEHICLE_LOADING) {
        if (errMsg) snprintf(errMsg, errLen, "Vehicle %s is currently in use (%s).",
                             v->vehicleCode, vehicleStatusToStrV2(v->status));
        return 0;
    }
    if (!isDateValid(v->insuranceExpiry)) {
        if (errMsg) snprintf(errMsg, errLen, "Vehicle %s insurance expired: %s.",
                             v->vehicleCode, v->insuranceExpiry[0] ? v->insuranceExpiry : "not set");
        return 0;
    }
    if (!isDateValid(v->inspectionExpiry)) {
        if (errMsg) snprintf(errMsg, errLen, "Vehicle %s inspection expired: %s.",
                             v->vehicleCode, v->inspectionExpiry[0] ? v->inspectionExpiry : "not set");
        return 0;
    }
    return 1;
}

// ─────────────────────────────────────────────────────────
// Init — no dummy seed data
// ─────────────────────────────────────────────────────────

void initVehiclesData() {
    // Phase 4: No dummy/seed vehicles. Vehicles are created by Admin via API.
    // Just ensure the file is accessible (create empty if not exists).
    FILE *fp = fopen(VEHICLES_FILE, "rb");
    if (fp == NULL) {
        fp = fopen(VEHICLES_FILE, "wb");
        if (fp != NULL) fclose(fp);
    } else {
        fclose(fp);
    }
}

// ─────────────────────────────────────────────────────────
// CRUD
// ─────────────────────────────────────────────────────────

int addVehicle(Vehicle *v) {
    FILE *fp = fopen(VEHICLES_FILE, "rb");
    int maxId = 0;
    if (fp) {
        Vehicle temp;
        while (fread(&temp, sizeof(Vehicle), 1, fp) == 1) {
        // Workspace Isolation
        if (g_current_workspace[0] != '\0' && strcmp(temp.workspaceId, g_current_workspace) != 0) continue;
            if (temp.vehicleId > maxId) maxId = temp.vehicleId;
        }
        fclose(fp);
    }
    v->vehicleId = maxId + 1;

    // Auto-generate vehicle code if empty
    if (v->vehicleCode[0] == '\0') {
        snprintf(v->vehicleCode, sizeof(v->vehicleCode), "VEH-%04d", v->vehicleId);
    }
    // Copy vehicleNumber from registrationNumber if not set
    if (v->vehicleNumber[0] == '\0') {
        strncpy(v->vehicleNumber, v->registrationNumber, sizeof(v->vehicleNumber) - 1);
    }

    char now[30];
    getCurrentTimestamp(now, sizeof(now));
    strncpy(v->createdAt, now, sizeof(v->createdAt) - 1);
    strncpy(v->updatedAt, now, sizeof(v->updatedAt) - 1);
    v->status = VEHICLE_AVAILABLE;

    fp = fopen(VEHICLES_FILE, "ab");
    if (fp == NULL) return 0;
    fwrite(v, sizeof(Vehicle), 1, fp);
    fclose(fp);
    return 1;
}

int getVehicleById(int vehicleId, Vehicle *v) {
    FILE *fp = fopen(VEHICLES_FILE, "rb");
    if (fp == NULL) return 0;
    while (fread(v, sizeof(Vehicle), 1, fp) == 1) {
        if (v->vehicleId == vehicleId) {
            fclose(fp);
            return 1;
        }
    }
    fclose(fp);
    return 0;
}

int updateVehicle(const Vehicle *v) {
    FILE *fp = fopen(VEHICLES_FILE, "rb");
    if (fp == NULL) return 0;

    FILE *tempFp = fopen("data/temp_vehicles.dat", "wb");
    if (tempFp == NULL) { fclose(fp); return 0; }

    Vehicle temp;
    int found = 0;
    char now[30];
    getCurrentTimestamp(now, sizeof(now));

    while (fread(&temp, sizeof(Vehicle), 1, fp) == 1) {
        // Workspace Isolation
        if (g_current_workspace[0] != '\0' && strcmp(temp.workspaceId, g_current_workspace) != 0) continue;
        if (temp.vehicleId == v->vehicleId) {
            Vehicle updated = *v;
            strncpy(updated.updatedAt, now, sizeof(updated.updatedAt) - 1);
            fwrite(&updated, sizeof(Vehicle), 1, tempFp);
            found = 1;
        } else {
            fwrite(&temp, sizeof(Vehicle), 1, tempFp);
        }
    }

    fclose(fp);
    fclose(tempFp);

    if (found) {
        remove(VEHICLES_FILE);
        rename("data/temp_vehicles.dat", VEHICLES_FILE);
    } else {
        remove("data/temp_vehicles.dat");
    }
    return found;
}

int deleteVehicle(int vehicleId) {
    FILE *fp = fopen(VEHICLES_FILE, "rb");
    if (fp == NULL) return 0;

    FILE *tempFp = fopen("data/temp_vehicles.dat", "wb");
    if (tempFp == NULL) { fclose(fp); return 0; }

    Vehicle temp;
    int found = 0;
    while (fread(&temp, sizeof(Vehicle), 1, fp) == 1) {
        // Workspace Isolation
        if (g_current_workspace[0] != '\0' && strcmp(temp.workspaceId, g_current_workspace) != 0) continue;
        if (temp.vehicleId != vehicleId) {
            fwrite(&temp, sizeof(Vehicle), 1, tempFp);
        } else {
            found = 1;
        }
    }

    fclose(fp);
    fclose(tempFp);

    if (found) {
        remove(VEHICLES_FILE);
        rename("data/temp_vehicles.dat", VEHICLES_FILE);
    } else {
        remove("data/temp_vehicles.dat");
    }
    return found;
}

int getAllVehicles(Vehicle *arr, int maxCount) {
    FILE *fp = fopen(VEHICLES_FILE, "rb");
    if (fp == NULL) return 0;
    int count = 0;
    while (count < maxCount && fread(&arr[count], sizeof(Vehicle), 1, fp) == 1) {
        count++;
    }
    fclose(fp);
    return count;
}

int getVehiclesByHub(int hubId, Vehicle *arr, int maxCount) {
    FILE *fp = fopen(VEHICLES_FILE, "rb");
    if (fp == NULL) return 0;
    int count = 0;
    Vehicle temp;
    while (count < maxCount && fread(&temp, sizeof(Vehicle), 1, fp) == 1) {
        if (temp.assignedHubId == hubId) {
            arr[count++] = temp;
        }
    }
    fclose(fp);
    return count;
}

int getAvailableVehicles(int hubId, Vehicle *arr, int maxCount) {
    FILE *fp = fopen(VEHICLES_FILE, "rb");
    if (fp == NULL) return 0;
    int count = 0;
    Vehicle temp;
    while (count < maxCount && fread(&temp, sizeof(Vehicle), 1, fp) == 1) {
        if (temp.status == VEHICLE_AVAILABLE &&
            (hubId == 0 || temp.assignedHubId == hubId)) {
            arr[count++] = temp;
        }
    }
    fclose(fp);
    return count;
}

void displayAllVehicles() {
    FILE *fp = fopen(VEHICLES_FILE, "rb");
    if (fp == NULL) {
        printf("No vehicles found.\n");
        return;
    }
    Vehicle temp;
    printf("%-5s %-12s %-15s %-15s %-10s %-15s\n",
           "ID", "Code", "Reg No.", "Type", "Cap(kg)", "Status");
    while (fread(&temp, sizeof(Vehicle), 1, fp) == 1) {
        // Workspace Isolation
        if (g_current_workspace[0] != '\0' && strcmp(temp.workspaceId, g_current_workspace) != 0) continue;
        printf("%-5d %-12s %-15s %-15s %-10.1f %-15s\n",
               temp.vehicleId, temp.vehicleCode, temp.registrationNumber,
               temp.vehicleType, temp.capacityKg, vehicleStatusToStrV2(temp.status));
    }
    fclose(fp);
}
