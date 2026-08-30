#include "data_integrity.h"
#include "mongoose.h"
#include "types.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static DataFileInfo registry[] = {
    {"alerts.dat", sizeof(Alert)},
    {"audit.dat", sizeof(AuditLog)},
    {"bins.dat", sizeof(Bin)},
    {"collections.dat", sizeof(CollectionRequest)},
    {"driver_profiles.dat", sizeof(DriverProfile)},
    {"facilities.dat", 0}, // Facility
    {"hubs.dat", 0}, // Hub
    {"hub_transactions.dat", 0},
    {"incidents.dat", sizeof(Incident)},
    {"incident_timeline.dat", 0}, // IncidentTimelineEntry
    {"locations.dat", 0},
    {"notification_preferences.dat", 0},
    {"processing_records.dat", 0},
    {"recovery_records.dat", 0},
    {"recycling_batches.dat", 0},
    {"residents.dat", sizeof(Resident)},
    {"residual_records.dat", 0},
    {"routes.dat", 0},
    {"route_events.dat", 0},
    {"route_stops.dat", 0},
    {"segregation_records.dat", 0},
    {"service_areas.dat", 0},
    {"transfers.dat", 0},
    {"users.dat", sizeof(User)},
    {"vehicles.dat", sizeof(Vehicle)},
    {"vehicle_locations.dat", sizeof(VehicleLocation)},
    {"waste.dat", sizeof(Waste)},
    {"waste_classifications.dat", sizeof(WasteClassification)},
    {"workspaces.dat", sizeof(Workspace)}
};
static int registrySize = sizeof(registry) / sizeof(registry[0]);

void initDataIntegrity(void) {
    // Initialization if required
}

int getDataFileRegistry(DataFileInfo *items, int maxItems) {
    int count = (registrySize < maxItems) ? registrySize : maxItems;
    for (int i = 0; i < count; i++) {
        items[i] = registry[i];
    }
    return count;
}

bool calculateFileSHA256(const char *filePath, char *checksumOut) {
    FILE *fp = fopen(filePath, "rb");
    if (!fp) {
        strcpy(checksumOut, "");
        return false;
    }

    mg_sha256_ctx ctx;
    mg_sha256_init(&ctx);

    unsigned char buffer[4096];
    size_t bytesRead;
    while ((bytesRead = fread(buffer, 1, sizeof(buffer), fp)) > 0) {
        mg_sha256_update(&ctx, buffer, bytesRead);
    }
    fclose(fp);

    unsigned char digest[32];
    mg_sha256_final(digest, &ctx);

    for (int i = 0; i < 32; i++) {
        sprintf(checksumOut + (i * 2), "%02x", digest[i]);
    }
    checksumOut[64] = '\0';
    return true;
}

void verifyDataFile(const char *fileName, DataIntegrityResult *result) {
    memset(result, 0, sizeof(DataIntegrityResult));
    strncpy(result->fileName, fileName, sizeof(result->fileName) - 1);
    
    char filePath[256];
    snprintf(filePath, sizeof(filePath), "data/%s", fileName);

    FILE *fp = fopen(filePath, "rb");
    if (!fp) {
        result->exists = false;
        result->readable = false;
        result->valid = false;
        strcpy(result->message, "File not found or unreadable");
        return;
    }

    result->exists = true;
    result->readable = true;

    // Get file size
    fseek(fp, 0, SEEK_END);
    result->fileSize = ftell(fp);
    fseek(fp, 0, SEEK_SET);

    size_t recordSize = 0;
    for (int i = 0; i < registrySize; i++) {
        if (strcmp(registry[i].fileName, fileName) == 0) {
            recordSize = registry[i].recordSize;
            break;
        }
    }

    if (recordSize > 0) {
        result->recordCount = result->fileSize / recordSize;
        if (result->fileSize % recordSize != 0) {
            result->invalidRecords++;
            result->valid = false;
            strcpy(result->message, "Corrupted structure: partial record detected");
        } else {
            result->valid = true;
            strcpy(result->message, "OK");
        }
    } else {
        result->recordCount = 0;
        result->valid = true;
        strcpy(result->message, "OK (unstructured)");
    }
    fclose(fp);

    calculateFileSHA256(filePath, result->checksum);
}

int verifyAllDataFiles(DataIntegrityResult *results, int maxResults) {
    int count = (registrySize < maxResults) ? registrySize : maxResults;
    for (int i = 0; i < count; i++) {
        verifyDataFile(registry[i].fileName, &results[i]);
    }
    return count;
}
