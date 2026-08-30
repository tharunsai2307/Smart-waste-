#ifndef DATA_INTEGRITY_H
#define DATA_INTEGRITY_H

#include <stdbool.h>
#include <stddef.h>

typedef struct {
    char fileName[128];
    bool exists;
    bool readable;
    bool valid;
    long fileSize;
    long recordCount;
    long invalidRecords;
    long duplicateRecords;
    char checksum[65];
    char message[256];
} DataIntegrityResult;

typedef struct {
    char fileName[128];
    size_t recordSize; // Size of the struct. 0 for unstructured.
} DataFileInfo;

// Initialize the data integrity engine
void initDataIntegrity(void);

// Gets the central list of tracked files
int getDataFileRegistry(DataFileInfo *items, int maxItems);

// Verifies a single file by name
void verifyDataFile(const char *fileName, DataIntegrityResult *result);

// Verifies all files in the registry
int verifyAllDataFiles(DataIntegrityResult *results, int maxResults);

// Calculates SHA-256 for a file (returns 64 char hex string + null)
bool calculateFileSHA256(const char *filePath, char *checksumOut);

#endif
