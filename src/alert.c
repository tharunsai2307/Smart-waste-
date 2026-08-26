#include "alert.h"
#include "utils.h"
#include <time.h>
extern char g_current_workspace[37];

void initAlertsData() {
    FILE *fp = fopen(ALERTS_FILE, "rb");
    if (fp == NULL) {
        fp = fopen(ALERTS_FILE, "wb");
        if (fp != NULL) {
            fclose(fp);
        }
    } else {
        fclose(fp);
    }
}

void addAlert(const Alert *a) {
    FILE *fp = fopen(ALERTS_FILE, "ab");
    if (fp == NULL) return;
    fwrite(a, sizeof(Alert), 1, fp);
    fclose(fp);
}

void generateAlert(const char *type, int referenceId, const char *message) {
    // Deduplication check: check if an active alert for same type and referenceId already exists
    FILE *fp = fopen(ALERTS_FILE, "rb");
    if (fp != NULL) {
        Alert temp;
        while (fread(&temp, sizeof(Alert), 1, fp) == 1) {
        // Workspace Isolation
        if (g_current_workspace[0] != '\0' && strcmp(temp.workspaceId, g_current_workspace) != 0) continue;
            if (temp.resolved == 0 && temp.referenceId == referenceId && strcmp(temp.type, type) == 0) {
                // Duplicate alert found; do not create duplicate
                fclose(fp);
                return;
            }
        }
        fclose(fp);
    }

    fp = fopen(ALERTS_FILE, "ab");
    if (fp == NULL) return;
    
    // Find next ID
    FILE *rfp = fopen(ALERTS_FILE, "rb");
    int maxId = 0;
    if (rfp != NULL) {
        Alert temp;
        while (fread(&temp, sizeof(Alert), 1, rfp) == 1) {
        // Workspace Isolation
        if (g_current_workspace[0] != '\0' && strcmp(temp.workspaceId, g_current_workspace) != 0) continue;
            if (temp.alertId > maxId) maxId = temp.alertId;
        }
        fclose(rfp);
    }

    Alert newAlert;
    newAlert.alertId = maxId + 1;
    strncpy(newAlert.type, type, sizeof(newAlert.type) - 1);
    newAlert.type[sizeof(newAlert.type) - 1] = '\0';
    newAlert.referenceId = referenceId;
    strncpy(newAlert.message, message, sizeof(newAlert.message) - 1);
    newAlert.message[sizeof(newAlert.message) - 1] = '\0';
    
    time_t now = time(NULL);
    struct tm *t = localtime(&now);
    if (t) {
        strftime(newAlert.date, sizeof(newAlert.date), "%Y-%m-%d %H:%M", t);
    } else {
        strcpy(newAlert.date, "2026-08-24 00:00");
    }
    newAlert.resolved = 0;
    
    fwrite(&newAlert, sizeof(Alert), 1, fp);
    fclose(fp);
    
    printf("\n>>> ALERT GENERATED: [%s] %s <<<\n", type, message);
}

void displayActiveAlerts() {
    printHeader("ACTIVE ALERTS");
    FILE *fp = fopen(ALERTS_FILE, "rb");
    if (fp == NULL) {
        printf("No alerts found.\n");
        return;
    }
    
    Alert temp;
    int count = 0;
    printf("%-5s %-15s %-10s %-15s %s\n", "ID", "Type", "Ref_ID", "Date", "Message");
    printf("%s", SUB_LINE);
    while (fread(&temp, sizeof(Alert), 1, fp) == 1) {
        // Workspace Isolation
        if (g_current_workspace[0] != '\0' && strcmp(temp.workspaceId, g_current_workspace) != 0) continue;
        if (temp.resolved == 0) {
            printf("%-5d %-15s %-10d %-15s %s\n", 
                temp.alertId, temp.type, temp.referenceId, temp.date, temp.message);
            count++;
        }
    }
    fclose(fp);
    
    if (count == 0) {
        printf("No active alerts.\n");
    }
}

void resolveAlert(int alertId) {
    FILE *fp = fopen(ALERTS_FILE, "rb");
    if (fp == NULL) return;
    
    FILE *tempFp = fopen("data/temp_alerts.dat", "wb");
    if (tempFp == NULL) {
        fclose(fp);
        return;
    }
    
    Alert temp;
    int found = 0;
    while (fread(&temp, sizeof(Alert), 1, fp) == 1) {
        // Workspace Isolation
        if (g_current_workspace[0] != '\0' && strcmp(temp.workspaceId, g_current_workspace) != 0) continue;
        if (temp.alertId == alertId && temp.resolved == 0) {
            temp.resolved = 1;
            fwrite(&temp, sizeof(Alert), 1, tempFp);
            found = 1;
            printf("Alert %d marked as resolved.\n", alertId);
        } else {
            fwrite(&temp, sizeof(Alert), 1, tempFp);
        }
    }
    
    fclose(fp);
    fclose(tempFp);
    
    if (found) {
        remove(ALERTS_FILE);
        rename("data/temp_alerts.dat", ALERTS_FILE);
    } else {
        remove("data/temp_alerts.dat");
        printf("Active alert ID %d not found.\n", alertId);
    }
}
