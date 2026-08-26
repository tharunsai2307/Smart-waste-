#include "hub.h"
#include "alert.h"
#include "utils.h"
#include "config.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
extern char g_current_workspace[37];

void initHubData() {
    FILE *fp = fopen(HUBS_FILE, "rb");
    if (fp == NULL) {
        fp = fopen(HUBS_FILE, "wb");
        if (fp != NULL) fclose(fp);
    } else {
        fclose(fp);
    }

    fp = fopen(HUB_TRANSACTIONS_FILE, "rb");
    if (fp == NULL) {
        fp = fopen(HUB_TRANSACTIONS_FILE, "wb");
        if (fp != NULL) fclose(fp);
    } else {
        fclose(fp);
    }
}

// getCurrentTimestamp and getTodayDatePrefix are now in utils.c

int addHub(LocalHub *hub) {
    FILE *fp = fopen(HUBS_FILE, "rb");
    int maxId = 0;
    if (fp != NULL) {
        LocalHub temp;
        while (fread(&temp, sizeof(LocalHub), 1, fp) == 1) {
        // Workspace Isolation
        if (g_current_workspace[0] != '\0' && strcmp(temp.workspaceId, g_current_workspace) != 0) continue;
            if (temp.hubId > maxId) maxId = temp.hubId;
        }
        fclose(fp);
    }

    hub->hubId = maxId + 1;
    if (hub->warningThresholdPercent <= 0) hub->warningThresholdPercent = 75.0f;
    if (hub->criticalThresholdPercent <= 0) hub->criticalThresholdPercent = 90.0f;
    hub->status = HUB_NORMAL;
    
    char now[30];
    getCurrentTimestamp(now, sizeof(now));
    strncpy(hub->createdAt, now, sizeof(hub->createdAt) - 1);
    hub->createdAt[sizeof(hub->createdAt) - 1] = '\0';
    strncpy(hub->updatedAt, now, sizeof(hub->updatedAt) - 1);
    hub->updatedAt[sizeof(hub->updatedAt) - 1] = '\0';

    fp = fopen(HUBS_FILE, "ab");
    if (fp == NULL) return 0;
    int written = fwrite(hub, sizeof(LocalHub), 1, fp) == 1;
    fclose(fp);
    return written;
}

int updateHub(const LocalHub *hub) {
    FILE *fp = fopen(HUBS_FILE, "rb");
    if (fp == NULL) return 0;

    FILE *tempFp = fopen("data/temp_hubs.dat", "wb");
    if (tempFp == NULL) {
        fclose(fp);
        return 0;
    }

    LocalHub temp;
    int found = 0;
    char now[30];
    getCurrentTimestamp(now, sizeof(now));

    while (fread(&temp, sizeof(LocalHub), 1, fp) == 1) {
        // Workspace Isolation
        if (g_current_workspace[0] != '\0' && strcmp(temp.workspaceId, g_current_workspace) != 0) continue;
        if (temp.hubId == hub->hubId) {
            temp = *hub;
            strncpy(temp.updatedAt, now, sizeof(temp.updatedAt) - 1);
            temp.updatedAt[sizeof(temp.updatedAt) - 1] = '\0';
            fwrite(&temp, sizeof(LocalHub), 1, tempFp);
            found = 1;
        } else {
            fwrite(&temp, sizeof(LocalHub), 1, tempFp);
        }
    }

    fclose(fp);
    fclose(tempFp);

    if (found) {
        remove(HUBS_FILE);
        rename("data/temp_hubs.dat", HUBS_FILE);
    } else {
        remove("data/temp_hubs.dat");
    }
    return found;
}

int getHubById(int hubId, LocalHub *hub) {
    FILE *fp = fopen(HUBS_FILE, "rb");
    if (fp == NULL) return 0;

    LocalHub temp;
    int found = 0;
    while (fread(&temp, sizeof(LocalHub), 1, fp) == 1) {
        // Workspace Isolation
        if (g_current_workspace[0] != '\0' && strcmp(temp.workspaceId, g_current_workspace) != 0) continue;
        if (temp.hubId == hubId) {
            *hub = temp;
            found = 1;
            break;
        }
    }
    fclose(fp);
    return found;
}

int getHubByManagerId(int managerId, LocalHub *hub) {
    FILE *fp = fopen(HUBS_FILE, "rb");
    if (fp == NULL) return 0;

    LocalHub temp;
    int found = 0;
    while (fread(&temp, sizeof(LocalHub), 1, fp) == 1) {
        // Workspace Isolation
        if (g_current_workspace[0] != '\0' && strcmp(temp.workspaceId, g_current_workspace) != 0) continue;
        if (temp.managerId == managerId) {
            *hub = temp;
            found = 1;
            break;
        }
    }
    fclose(fp);
    return found;
}

int getAllHubs(LocalHub *hubs, int maxCount) {
    FILE *fp = fopen(HUBS_FILE, "rb");
    if (fp == NULL) return 0;

    int count = 0;
    while (count < maxCount && fread(&hubs[count], sizeof(LocalHub), 1, fp) == 1) {
        count++;
    }
    fclose(fp);
    return count;
}

float calculateHubCurrentLoad(int hubId) {
    FILE *fp = fopen(HUB_TRANSACTIONS_FILE, "rb");
    if (fp == NULL) return 0.0f;

    float currentLoad = 0.0f;
    HubInventoryTransaction trans;
    while (fread(&trans, sizeof(HubInventoryTransaction), 1, fp) == 1) {
if (trans.hubId == hubId) {
            if (strcmp(trans.transactionType, "INBOUND_COLLECTION") == 0) {
                currentLoad += trans.quantityKg;
            } else if (strcmp(trans.transactionType, "OUTBOUND_TRANSFER") == 0) {
                currentLoad -= trans.quantityKg;
            } else if (strcmp(trans.transactionType, "ADJUSTMENT") == 0 || strcmp(trans.transactionType, "CORRECTION") == 0) {
                currentLoad += trans.quantityKg;
            }
        }
    }
    fclose(fp);

    if (currentLoad < 0.0f) currentLoad = 0.0f;
    return currentLoad;
}

HubStatus deriveHubStatus(float currentLoad, float maxCapacity, float warningPercent, float criticalPercent) {
    if (maxCapacity <= 0.0f) return HUB_NORMAL;
    float util = (currentLoad / maxCapacity) * 100.0f;
    if (util >= 100.0f) return HUB_AT_CAPACITY;
    if (util >= criticalPercent) return HUB_CRITICAL;
    if (util >= warningPercent) return HUB_WARNING;
    return HUB_NORMAL;
}

const char* hubStatusToStr(HubStatus status) {
    switch (status) {
        case HUB_NORMAL: return "NORMAL";
        case HUB_WARNING: return "WARNING";
        case HUB_CRITICAL: return "CRITICAL";
        case HUB_AT_CAPACITY: return "AT_CAPACITY";
        case HUB_TEMPORARILY_CLOSED: return "TEMPORARILY_CLOSED";
        default: return "NORMAL";
    }
}

int recordHubTransaction(HubInventoryTransaction *trans, int emergencyOverride, int actorUserId, char *errorMsg, size_t errLen) {
    LocalHub hub;
    if (!getHubById(trans->hubId, &hub)) {
        if (errorMsg && errLen > 0) snprintf(errorMsg, errLen, "Hub ID %d not found.", trans->hubId);
        return 0;
    }

    if (hub.status == HUB_TEMPORARILY_CLOSED) {
        if (errorMsg && errLen > 0) snprintf(errorMsg, errLen, "Hub '%s' is temporarily closed for operations.", hub.name);
        return 0;
    }

    float currentLoad = calculateHubCurrentLoad(trans->hubId);

    // Validate capacity for Inbound or positive Adjustments
    if (strcmp(trans->transactionType, "INBOUND_COLLECTION") == 0 ||
       ((strcmp(trans->transactionType, "ADJUSTMENT") == 0 || strcmp(trans->transactionType, "CORRECTION") == 0) && trans->quantityKg > 0)) {
        float newLoad = currentLoad + trans->quantityKg;
        if (newLoad > hub.maximumCapacityKg) {
            if (!emergencyOverride) {
                if (errorMsg && errLen > 0) {
                    snprintf(errorMsg, errLen, "Capacity exceeded! Current: %.1fkg + Inbound: %.1fkg = %.1fkg > Max: %.1fkg. Requires emergency override.",
                             currentLoad, trans->quantityKg, newLoad, hub.maximumCapacityKg);
                }
                return 0;
            } else {
                logAudit(actorUserId, "HUB_CAPACITY_OVERRIDE", trans->hubId);
            }
        }
    } else if (strcmp(trans->transactionType, "OUTBOUND_TRANSFER") == 0) {
        if (trans->quantityKg > currentLoad) {
            if (errorMsg && errLen > 0) {
                snprintf(errorMsg, errLen, "Outbound transfer quantity (%.1fkg) exceeds current inventory (%.1fkg).", trans->quantityKg, currentLoad);
            }
            return 0;
        }
    }

    // Determine next transaction ID
    FILE *fp = fopen(HUB_TRANSACTIONS_FILE, "rb");
    int maxId = 0;
    if (fp != NULL) {
        HubInventoryTransaction temp;
        while (fread(&temp, sizeof(HubInventoryTransaction), 1, fp) == 1) {
if (temp.transactionId > maxId) maxId = temp.transactionId;
        }
        fclose(fp);
    }

    trans->transactionId = maxId + 1;
    if (strlen(trans->timestamp) == 0) {
        getCurrentTimestamp(trans->timestamp, sizeof(trans->timestamp));
    }

    fp = fopen(HUB_TRANSACTIONS_FILE, "ab");
    if (fp == NULL) {
        if (errorMsg && errLen > 0) snprintf(errorMsg, errLen, "Failed to write transaction.");
        return 0;
    }

    fwrite(trans, sizeof(HubInventoryTransaction), 1, fp);
    fclose(fp);

    // Audit log transaction
    logAudit(actorUserId, trans->transactionType, trans->hubId);

    // Post-transaction capacity check & Alert triggers
    float updatedLoad = calculateHubCurrentLoad(trans->hubId);
    float utilPercent = (updatedLoad / hub.maximumCapacityKg) * 100.0f;

    if (utilPercent >= 100.0f) {
        generateAlert("HUB_AT_CAPACITY", hub.hubId, "Hub is AT FULL CAPACITY (100%+). No inbound waste allowed without override.");
    } else if (utilPercent >= hub.criticalThresholdPercent) {
        generateAlert("HUB_CRITICAL", hub.hubId, "Hub reached CRITICAL capacity threshold (>=90%). Immediate outbound transfer required.");
    } else if (utilPercent >= hub.warningThresholdPercent) {
        generateAlert("HUB_WARNING", hub.hubId, "Hub reached WARNING capacity threshold (>=75%). Plan outbound transfer soon.");
    }

    return 1;
}

int getHubTransactions(int hubId, HubInventoryTransaction *trans, int maxCount) {
    FILE *fp = fopen(HUB_TRANSACTIONS_FILE, "rb");
    if (fp == NULL) return 0;

    int count = 0;
    HubInventoryTransaction temp;
    // Read and filter
    while (count < maxCount && fread(&temp, sizeof(HubInventoryTransaction), 1, fp) == 1) {
        if (hubId == 0 || temp.hubId == hubId) {
            trans[count++] = temp;
        }
    }
    fclose(fp);
    return count;
}

void getHubPerformance(int hubId, float *todayInbound, float *todayOutbound, int *activeCleaners) {
    *todayInbound = 0.0f;
    *todayOutbound = 0.0f;
    *activeCleaners = 0;

    char todayPrefix[20];
    getTodayDatePrefix(todayPrefix, sizeof(todayPrefix));

    // Calculate Inbound and Outbound for today
    FILE *fp = fopen(HUB_TRANSACTIONS_FILE, "rb");
    if (fp != NULL) {
        HubInventoryTransaction trans;
        while (fread(&trans, sizeof(HubInventoryTransaction), 1, fp) == 1) {
if (trans.hubId == hubId && strncmp(trans.timestamp, todayPrefix, strlen(todayPrefix)) == 0) {
                if (strcmp(trans.transactionType, "INBOUND_COLLECTION") == 0) {
                    *todayInbound += trans.quantityKg;
                } else if (strcmp(trans.transactionType, "OUTBOUND_TRANSFER") == 0) {
                    *todayOutbound += trans.quantityKg;
                }
            }
        }
        fclose(fp);
    }

    // Count cleaners assigned to this hub
    fp = fopen(USERS_FILE, "rb");
    if (fp != NULL) {
        User u;
        while (fread(&u, sizeof(User), 1, fp) == 1) {
        // Workspace Isolation
        if (g_current_workspace[0] != '\0' && strcmp(u.workspaceId, g_current_workspace) != 0) continue;
            if (u.role == ROLE_CLEANER && u.assignedHub == hubId && u.status == 1) {
                (*activeCleaners)++;
            }
        }
        fclose(fp);
    }
}
