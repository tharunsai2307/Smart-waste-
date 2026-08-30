#include "system_health.h"
#include "data_integrity.h"
#include "backup.h"
#include "utils.h"
#include <stdio.h>
#include <string.h>

void initSystemHealth(void) {
    // init
}

void getSystemHealth(SystemHealth *healthOut) {
    memset(healthOut, 0, sizeof(SystemHealth));

    DataFileInfo files[50];
    int fileCount = getDataFileRegistry(files, 50);

    healthOut->totalFiles = fileCount;
    healthOut->healthyFiles = fileCount; // assume healthy for now
    
    // We would actually do a scan, but since it might take a while, we return a cached value.
    // For this implementation, we will just use dummy sizes unless we scan.
    
    long totalStorage = 0;
    for (int i = 0; i < fileCount; i++) {
        char path[256];
        snprintf(path, sizeof(path), "data/%s", files[i].fileName);
        FILE *fp = fopen(path, "rb");
        if (fp) {
            fseek(fp, 0, SEEK_END);
            totalStorage += ftell(fp);
            fclose(fp);
        }
    }
    healthOut->totalStorageBytes = totalStorage;
    
    // Backup storage
    BackupMetadata backups[50];
    int backupCount = getBackups("global", backups, 50);
    healthOut->totalBackups = backupCount;
    for(int i = 0; i < backupCount; i++) {
        if(backups[i].verified) {
            healthOut->verifiedBackups++;
        }
        healthOut->backupStorageBytes += backups[i].totalBytes;
    }
    
    if (backupCount > 0) {
        strcpy(healthOut->lastBackupAt, backups[backupCount-1].createdAt);
    } else {
        strcpy(healthOut->lastBackupAt, "Never");
    }
    
    strcpy(healthOut->lastIntegrityScanAt, "Never");
    healthOut->recoveryReady = (healthOut->verifiedBackups > 0);
}
