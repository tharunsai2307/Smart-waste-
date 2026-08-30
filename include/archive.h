#ifndef ARCHIVE_H
#define ARCHIVE_H

#include <stdbool.h>
#include <stddef.h>

typedef struct {
    char archiveId[64];
    char workspaceId[37];
    char sourceFile[128];
    char archivePath[256];
    char createdAt[32];
    long recordCount;
    long totalBytes;
    char checksum[65];
} ArchiveMetadata;

void initArchiveEngine(void);

// List archives
int getArchives(const char *workspaceId, ArchiveMetadata *archives, int maxArchives);

// Evaluate retention policies and generate a report
void evaluateRetentionPolicies(char *reportOut, size_t reportSize);

// Archive eligible records based on retention policies
bool archiveEligibleRecords(const char *actorId, char *messageOut, size_t msgSize);

#endif
