#include "alert.h"
#include "utils.h"

void initAlertsData() {
    FILE *fp = fopen(ALERTS_FILE, "rb");
    if (fp == NULL) {
        fp = fopen(ALERTS_FILE, "wb");
        if (fp != NULL) {
            Alert dummyAlerts[] = {
                {301, "BIN_CRITICAL", 103, "Bin reached critical capacity.", "2023-10-25", 0},
                {302, "BIN_OVERFLOW", 104, "Bin is overflowing!", "2023-10-26", 0}
            };
            fwrite(dummyAlerts, sizeof(Alert), 2, fp);
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
    FILE *fp = fopen(ALERTS_FILE, "ab");
    if (fp == NULL) return;
    
    Alert newAlert;
    newAlert.alertId = rand() % 10000; // Simulated ID
    strcpy(newAlert.type, type);
    newAlert.referenceId = referenceId;
    strcpy(newAlert.message, message);
    strcpy(newAlert.date, "2023-10-31"); // Simulated date
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
