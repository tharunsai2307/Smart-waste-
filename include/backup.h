#ifndef BACKUP_H
#define BACKUP_H

#include <stdbool.h>
#include <stddef.h>

typedef struct {
    char backupId[64];
    char createdAt[32];
    char createdBy[64];
    char workspaceId[37];
    char backupPath[256];
    int fileCount;
    long totalBytes;
    bool verified;
    char status[32];
} BackupMetadata;

void initBackupEngine(void);

// Create a new backup
// If workspaceId is "global", it backs up everything. 
// Otherwise it filters to the workspace (logical backup).
bool createBackup(const char *actorId, const char *workspaceId, BackupMetadata *metaOut);

// Verify an existing backup
bool verifyBackup(const char *backupId, char *messageOut, size_t msgSize);

// Restore a backup
// Involves preview, safety snapshot, and then the actual restore
bool previewRestore(const char *backupId, char *previewOut, size_t previewSize);
bool restoreBackup(const char *backupId, const char *actorId, char *messageOut, size_t msgSize);

// List backups
int getBackups(const char *workspaceId, BackupMetadata *backups, int maxBackups);

#endif
