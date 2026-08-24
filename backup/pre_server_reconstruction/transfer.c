#include "transfer.h"
#include "utils.h"
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <math.h>

// ─────────────────────────────────────────────────────────
// Status String Conversions
// ─────────────────────────────────────────────────────────

const char* transferStatusToStr(TransferStatus s) {
    switch (s) {
        case TRANSFER_REQUESTED:         return "REQUESTED";
        case TRANSFER_APPROVED:          return "APPROVED";
        case TRANSFER_DRIVER_ASSIGNED:   return "DRIVER_ASSIGNED";
        case TRANSFER_VEHICLE_ASSIGNED:  return "VEHICLE_ASSIGNED";
        case TRANSFER_DRIVER_CHECKED_IN: return "DRIVER_CHECKED_IN";
        case TRANSFER_LOADING:           return "LOADING";
        case TRANSFER_LOADED:            return "LOADED";
        case TRANSFER_DEPARTED:          return "DEPARTED";
        case TRANSFER_EN_ROUTE:          return "EN_ROUTE";
        case TRANSFER_ARRIVED:           return "ARRIVED";
        case TRANSFER_UNLOADING:         return "UNLOADING";
        case TRANSFER_DELIVERED:         return "DELIVERED";
        case TRANSFER_COMPLETED:         return "COMPLETED";
        case TRANSFER_CANCELLED:         return "CANCELLED";
        case TRANSFER_REJECTED:          return "REJECTED";
        case TRANSFER_FAILED:            return "FAILED";
        case TRANSFER_DELAYED:           return "DELAYED";
        default:                         return "REQUESTED";
    }
}

TransferStatus transferStatusFromStr(const char *s) {
    if (strcmp(s, "REQUESTED")         == 0) return TRANSFER_REQUESTED;
    if (strcmp(s, "APPROVED")          == 0) return TRANSFER_APPROVED;
    if (strcmp(s, "DRIVER_ASSIGNED")   == 0) return TRANSFER_DRIVER_ASSIGNED;
    if (strcmp(s, "VEHICLE_ASSIGNED")  == 0) return TRANSFER_VEHICLE_ASSIGNED;
    if (strcmp(s, "DRIVER_CHECKED_IN") == 0) return TRANSFER_DRIVER_CHECKED_IN;
    if (strcmp(s, "LOADING")           == 0) return TRANSFER_LOADING;
    if (strcmp(s, "LOADED")            == 0) return TRANSFER_LOADED;
    if (strcmp(s, "DEPARTED")          == 0) return TRANSFER_DEPARTED;
    if (strcmp(s, "EN_ROUTE")          == 0) return TRANSFER_EN_ROUTE;
    if (strcmp(s, "ARRIVED")           == 0) return TRANSFER_ARRIVED;
    if (strcmp(s, "UNLOADING")         == 0) return TRANSFER_UNLOADING;
    if (strcmp(s, "DELIVERED")         == 0) return TRANSFER_DELIVERED;
    if (strcmp(s, "COMPLETED")         == 0) return TRANSFER_COMPLETED;
    if (strcmp(s, "CANCELLED")         == 0) return TRANSFER_CANCELLED;
    if (strcmp(s, "REJECTED")          == 0) return TRANSFER_REJECTED;
    if (strcmp(s, "FAILED")            == 0) return TRANSFER_FAILED;
    if (strcmp(s, "DELAYED")           == 0) return TRANSFER_DELAYED;
    return TRANSFER_REQUESTED;
}

// ─────────────────────────────────────────────────────────
// C State Machine — Strict Transition Table
// ─────────────────────────────────────────────────────────

// Returns 1 if transition from -> to is valid
int isValidTransferTransition(TransferStatus from, TransferStatus to) {
    // Terminal states — no outbound transitions except by management reversal
    if (from == TRANSFER_COMPLETED || from == TRANSFER_FAILED) return 0;

    // Cancellation is allowed before LOADED (after LOADED, inventory transaction exists)
    if (to == TRANSFER_CANCELLED) {
        return (from == TRANSFER_REQUESTED   ||
                from == TRANSFER_APPROVED    ||
                from == TRANSFER_DRIVER_ASSIGNED ||
                from == TRANSFER_VEHICLE_ASSIGNED);
    }

    // Rejection allowed in REQUESTED or APPROVED only
    if (to == TRANSFER_REJECTED) {
        return (from == TRANSFER_REQUESTED || from == TRANSFER_APPROVED);
    }

    // DELAYED can be set from EN_ROUTE or DEPARTED
    if (to == TRANSFER_DELAYED) {
        return (from == TRANSFER_EN_ROUTE || from == TRANSFER_DEPARTED);
    }

    // Forward transitions
    switch (from) {
        case TRANSFER_REQUESTED:         return to == TRANSFER_APPROVED;
        case TRANSFER_APPROVED:          return to == TRANSFER_DRIVER_ASSIGNED;
        case TRANSFER_DRIVER_ASSIGNED:   return to == TRANSFER_VEHICLE_ASSIGNED;
        case TRANSFER_VEHICLE_ASSIGNED:  return to == TRANSFER_DRIVER_CHECKED_IN;
        case TRANSFER_DRIVER_CHECKED_IN: return to == TRANSFER_LOADING;
        case TRANSFER_LOADING:           return to == TRANSFER_LOADED;
        case TRANSFER_LOADED:            return to == TRANSFER_DEPARTED;
        case TRANSFER_DEPARTED:          return to == TRANSFER_EN_ROUTE;
        case TRANSFER_EN_ROUTE:          return to == TRANSFER_ARRIVED;
        case TRANSFER_DELAYED:           return to == TRANSFER_EN_ROUTE || to == TRANSFER_ARRIVED;
        case TRANSFER_ARRIVED:           return to == TRANSFER_UNLOADING;
        case TRANSFER_UNLOADING:         return to == TRANSFER_DELIVERED;
        case TRANSFER_DELIVERED:         return to == TRANSFER_COMPLETED;
        default:                         return 0;
    }
}

// ─────────────────────────────────────────────────────────
// C Algorithm: Load Variance %
// ─────────────────────────────────────────────────────────

float calculateLoadVariancePct(float planned, float actual) {
    if (planned <= 0.0f) return 0.0f;
    float diff = actual - planned;
    if (diff < 0.0f) diff = -diff;
    return (diff / planned) * 100.0f;
}

// ─────────────────────────────────────────────────────────
// C Algorithm: Delivery Variance Kg
// ─────────────────────────────────────────────────────────

float calculateDeliveryVarianceKg(float loaded, float delivered) {
    float diff = delivered - loaded;
    return diff < 0.0f ? -diff : diff;
}

// ─────────────────────────────────────────────────────────
// C Algorithm: Merge Sort by Priority + Date
// ─────────────────────────────────────────────────────────

static int priorityWeight(const char *priority) {
    if (strcmp(priority, "URGENT") == 0) return 4;
    if (strcmp(priority, "HIGH")   == 0) return 3;
    if (strcmp(priority, "NORMAL") == 0) return 2;
    if (strcmp(priority, "LOW")    == 0) return 1;
    return 2;
}

static int compareTransfers(const WasteTransfer *a, const WasteTransfer *b) {
    int pa = priorityWeight(a->priority);
    int pb = priorityWeight(b->priority);
    if (pa != pb) return pb - pa; // higher priority first
    // then by scheduled date ascending
    return strcmp(a->scheduledDate, b->scheduledDate);
}

static void mergeTransfers(WasteTransfer *arr, int l, int m, int r) {
    int n1 = m - l + 1;
    int n2 = r - m;
    WasteTransfer *L = (WasteTransfer *)malloc(n1 * sizeof(WasteTransfer));
    WasteTransfer *R = (WasteTransfer *)malloc(n2 * sizeof(WasteTransfer));
    if (!L || !R) { free(L); free(R); return; }

    for (int i = 0; i < n1; i++) L[i] = arr[l + i];
    for (int j = 0; j < n2; j++) R[j] = arr[m + 1 + j];

    int i = 0, j = 0, k = l;
    while (i < n1 && j < n2) {
        if (compareTransfers(&L[i], &R[j]) <= 0) arr[k++] = L[i++];
        else                                      arr[k++] = R[j++];
    }
    while (i < n1) arr[k++] = L[i++];
    while (j < n2) arr[k++] = R[j++];
    free(L);
    free(R);
}

static void mergeSortTransfers(WasteTransfer *arr, int l, int r) {
    if (l < r) {
        int m = l + (r - l) / 2;
        mergeSortTransfers(arr, l, m);
        mergeSortTransfers(arr, m + 1, r);
        mergeTransfers(arr, l, m, r);
    }
}

void sortTransfersByPriority(WasteTransfer *arr, int count) {
    if (count > 1) mergeSortTransfers(arr, 0, count - 1);
}

// ─────────────────────────────────────────────────────────
// Validation: Transfer Creation
// ─────────────────────────────────────────────────────────

int validateTransferForCreation(const WasteTransfer *t, float hubCurrentLoad, float vehicleCapacity, char *errMsg, size_t errLen) {
    if (t->plannedWeightKg <= 0.0f) {
        if (errMsg) snprintf(errMsg, errLen, "Planned weight must be greater than 0 kg.");
        return 0;
    }
    if (vehicleCapacity > 0.0f && t->plannedWeightKg > vehicleCapacity) {
        if (errMsg) snprintf(errMsg, errLen,
            "Planned weight (%.1f kg) exceeds vehicle capacity (%.1f kg).",
            t->plannedWeightKg, vehicleCapacity);
        return 0;
    }
    if (hubCurrentLoad >= 0.0f && t->plannedWeightKg > hubCurrentLoad) {
        if (errMsg) snprintf(errMsg, errLen,
            "Planned weight (%.1f kg) exceeds available hub inventory (%.1f kg).",
            t->plannedWeightKg, hubCurrentLoad);
        return 0;
    }
    if (t->sourceHubId <= 0) {
        if (errMsg) snprintf(errMsg, errLen, "Source hub must be specified.");
        return 0;
    }
    if (t->destinationFacilityId <= 0) {
        if (errMsg) snprintf(errMsg, errLen, "Destination facility must be specified.");
        return 0;
    }
    return 1;
}

// ─────────────────────────────────────────────────────────
// Init
// ─────────────────────────────────────────────────────────

void initTransferData() {
    FILE *fp = fopen(TRANSFERS_FILE, "rb");
    if (fp == NULL) {
        fp = fopen(TRANSFERS_FILE, "wb");
        if (fp != NULL) fclose(fp);
    } else {
        fclose(fp);
    }
}

// ─────────────────────────────────────────────────────────
// CRUD
// ─────────────────────────────────────────────────────────

int addTransfer(WasteTransfer *t) {
    FILE *fp = fopen(TRANSFERS_FILE, "rb");
    int maxId = 0;
    if (fp) {
        WasteTransfer temp;
        while (fread(&temp, sizeof(WasteTransfer), 1, fp) == 1) {
            if (temp.transferId > maxId) maxId = temp.transferId;
        }
        fclose(fp);
    }
    t->transferId = maxId + 1;

    if (t->transferCode[0] == '\0') {
        snprintf(t->transferCode, sizeof(t->transferCode), "TRF-%05d", t->transferId);
    }

    char now[30];
    getCurrentTimestamp(now, sizeof(now));
    strncpy(t->createdAt, now, sizeof(t->createdAt) - 1);
    strncpy(t->updatedAt, now, sizeof(t->updatedAt) - 1);
    t->status = TRANSFER_REQUESTED;
    t->outboundTransactionId = 0; // Not yet created

    fp = fopen(TRANSFERS_FILE, "ab");
    if (fp == NULL) return 0;
    fwrite(t, sizeof(WasteTransfer), 1, fp);
    fclose(fp);
    return 1;
}

int getTransferById(int transferId, WasteTransfer *t) {
    FILE *fp = fopen(TRANSFERS_FILE, "rb");
    if (fp == NULL) return 0;
    while (fread(t, sizeof(WasteTransfer), 1, fp) == 1) {
        if (t->transferId == transferId) {
            fclose(fp);
            return 1;
        }
    }
    fclose(fp);
    return 0;
}

int updateTransfer(const WasteTransfer *t) {
    FILE *fp = fopen(TRANSFERS_FILE, "rb");
    if (fp == NULL) return 0;

    FILE *tempFp = fopen("data/temp_transfers.dat", "wb");
    if (tempFp == NULL) { fclose(fp); return 0; }

    WasteTransfer temp;
    int found = 0;
    char now[30];
    getCurrentTimestamp(now, sizeof(now));

    while (fread(&temp, sizeof(WasteTransfer), 1, fp) == 1) {
        if (temp.transferId == t->transferId) {
            WasteTransfer updated = *t;
            strncpy(updated.updatedAt, now, sizeof(updated.updatedAt) - 1);
            fwrite(&updated, sizeof(WasteTransfer), 1, tempFp);
            found = 1;
        } else {
            fwrite(&temp, sizeof(WasteTransfer), 1, tempFp);
        }
    }

    fclose(fp);
    fclose(tempFp);

    if (found) {
        remove(TRANSFERS_FILE);
        rename("data/temp_transfers.dat", TRANSFERS_FILE);
    } else {
        remove("data/temp_transfers.dat");
    }
    return found;
}

int getAllTransfers(WasteTransfer *arr, int maxCount) {
    FILE *fp = fopen(TRANSFERS_FILE, "rb");
    if (fp == NULL) return 0;
    int count = 0;
    while (count < maxCount && fread(&arr[count], sizeof(WasteTransfer), 1, fp) == 1) {
        count++;
    }
    fclose(fp);
    return count;
}

int getTransfersByHub(int hubId, WasteTransfer *arr, int maxCount) {
    FILE *fp = fopen(TRANSFERS_FILE, "rb");
    if (fp == NULL) return 0;
    int count = 0;
    WasteTransfer temp;
    while (count < maxCount && fread(&temp, sizeof(WasteTransfer), 1, fp) == 1) {
        if (temp.sourceHubId == hubId) arr[count++] = temp;
    }
    fclose(fp);
    return count;
}

int getTransfersByDriver(int driverId, WasteTransfer *arr, int maxCount) {
    FILE *fp = fopen(TRANSFERS_FILE, "rb");
    if (fp == NULL) return 0;
    int count = 0;
    WasteTransfer temp;
    while (count < maxCount && fread(&temp, sizeof(WasteTransfer), 1, fp) == 1) {
        if (temp.driverId == driverId) arr[count++] = temp;
    }
    fclose(fp);
    return count;
}

int getActiveTransferForDriver(int driverId, WasteTransfer *out) {
    FILE *fp = fopen(TRANSFERS_FILE, "rb");
    if (fp == NULL) return 0;
    WasteTransfer temp;
    while (fread(&temp, sizeof(WasteTransfer), 1, fp) == 1) {
        if (temp.driverId == driverId &&
            temp.status != TRANSFER_COMPLETED &&
            temp.status != TRANSFER_CANCELLED &&
            temp.status != TRANSFER_REJECTED  &&
            temp.status != TRANSFER_FAILED) {
            *out = temp;
            fclose(fp);
            return 1;
        }
    }
    fclose(fp);
    return 0;
}

// ─────────────────────────────────────────────────────────
// Driver Profile CRUD
// ─────────────────────────────────────────────────────────

void initDriverProfileData() {
    FILE *fp = fopen(DRIVER_PROFILES_FILE, "rb");
    if (fp == NULL) {
        fp = fopen(DRIVER_PROFILES_FILE, "wb");
        if (fp != NULL) fclose(fp);
    } else {
        fclose(fp);
    }
}

int getDriverProfile(int userId, DriverProfile *dp) {
    FILE *fp = fopen(DRIVER_PROFILES_FILE, "rb");
    if (fp == NULL) return 0;
    while (fread(dp, sizeof(DriverProfile), 1, fp) == 1) {
        if (dp->userId == userId) {
            fclose(fp);
            return 1;
        }
    }
    fclose(fp);
    return 0;
}

int addOrUpdateDriverProfile(DriverProfile *dp) {
    DriverProfile existing;
    if (getDriverProfile(dp->userId, &existing)) {
        // Update in-place
        FILE *fp = fopen(DRIVER_PROFILES_FILE, "rb");
        if (fp == NULL) return 0;
        FILE *tempFp = fopen("data/temp_dp.dat", "wb");
        if (tempFp == NULL) { fclose(fp); return 0; }

        DriverProfile temp;
        char now[30];
        getCurrentTimestamp(now, sizeof(now));
        while (fread(&temp, sizeof(DriverProfile), 1, fp) == 1) {
            if (temp.userId == dp->userId) {
                DriverProfile updated = *dp;
                updated.profileId = temp.profileId;
                strncpy(updated.updatedAt, now, sizeof(updated.updatedAt) - 1);
                fwrite(&updated, sizeof(DriverProfile), 1, tempFp);
            } else {
                fwrite(&temp, sizeof(DriverProfile), 1, tempFp);
            }
        }
        fclose(fp);
        fclose(tempFp);
        remove(DRIVER_PROFILES_FILE);
        rename("data/temp_dp.dat", DRIVER_PROFILES_FILE);
        return 1;
    }

    // New profile
    FILE *fp = fopen(DRIVER_PROFILES_FILE, "rb");
    int maxId = 0;
    if (fp) {
        DriverProfile temp;
        while (fread(&temp, sizeof(DriverProfile), 1, fp) == 1) {
            if (temp.profileId > maxId) maxId = temp.profileId;
        }
        fclose(fp);
    }
    dp->profileId = maxId + 1;
    if (dp->availability[0] == '\0') strncpy(dp->availability, "AVAILABLE", sizeof(dp->availability) - 1);

    char now[30];
    getCurrentTimestamp(now, sizeof(now));
    strncpy(dp->createdAt, now, sizeof(dp->createdAt) - 1);
    strncpy(dp->updatedAt, now, sizeof(dp->updatedAt) - 1);

    fp = fopen(DRIVER_PROFILES_FILE, "ab");
    if (fp == NULL) return 0;
    fwrite(dp, sizeof(DriverProfile), 1, fp);
    fclose(fp);
    return 1;
}

int getAllDriverProfiles(DriverProfile *arr, int maxCount) {
    FILE *fp = fopen(DRIVER_PROFILES_FILE, "rb");
    if (fp == NULL) return 0;
    int count = 0;
    while (count < maxCount && fread(&arr[count], sizeof(DriverProfile), 1, fp) == 1) {
        count++;
    }
    fclose(fp);
    return count;
}

int getAvailableDriverProfiles(DriverProfile *arr, int maxCount) {
    FILE *fp = fopen(DRIVER_PROFILES_FILE, "rb");
    if (fp == NULL) return 0;
    int count = 0;
    DriverProfile temp;
    while (count < maxCount && fread(&temp, sizeof(DriverProfile), 1, fp) == 1) {
        if (strcmp(temp.availability, "AVAILABLE") == 0) {
            arr[count++] = temp;
        }
    }
    fclose(fp);
    return count;
}

int setDriverAvailability(int userId, const char *availability, int transferId) {
    FILE *fp = fopen(DRIVER_PROFILES_FILE, "rb");
    if (fp == NULL) return 0;
    FILE *tempFp = fopen("data/temp_dp.dat", "wb");
    if (tempFp == NULL) { fclose(fp); return 0; }

    DriverProfile temp;
    int found = 0;
    char now[30];
    getCurrentTimestamp(now, sizeof(now));

    while (fread(&temp, sizeof(DriverProfile), 1, fp) == 1) {
        if (temp.userId == userId) {
            strncpy(temp.availability, availability, sizeof(temp.availability) - 1);
            temp.currentTransferId = transferId;
            strncpy(temp.updatedAt, now, sizeof(temp.updatedAt) - 1);
            found = 1;
        }
        fwrite(&temp, sizeof(DriverProfile), 1, tempFp);
    }

    fclose(fp);
    fclose(tempFp);

    if (found) {
        remove(DRIVER_PROFILES_FILE);
        rename("data/temp_dp.dat", DRIVER_PROFILES_FILE);
    } else {
        remove("data/temp_dp.dat");
    }
    return found;
}
