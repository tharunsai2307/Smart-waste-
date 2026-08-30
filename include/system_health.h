#ifndef SYSTEM_HEALTH_H
#define SYSTEM_HEALTH_H

#include <stdbool.h>

typedef struct {
    int totalFiles;
    int healthyFiles;
    int corruptedFiles;
    int missingFiles;

    long totalStorageBytes;
    long backupStorageBytes;
    long archiveStorageBytes;

    int totalBackups;
    int verifiedBackups;

    char lastBackupAt[32];
    char lastIntegrityScanAt[32];

    bool recoveryReady;
} SystemHealth;

void initSystemHealth(void);

// Fetch system health stats
void getSystemHealth(SystemHealth *healthOut);

#endif
