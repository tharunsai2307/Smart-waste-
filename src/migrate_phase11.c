#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include "types.h"
#include "config.h"

#define MIGRATE_FILE(filename, type) do { \
    FILE *fp = fopen(filename, "rb"); \
    if (fp) { \
        char tempname[256]; sprintf(tempname, "%s.tmp", filename); \
        FILE *temp = fopen(tempname, "wb"); \
        type record; \
        int count = 0; \
        int migrated = 0; \
        while (fread(&record, sizeof(type), 1, fp) == 1) { \
            count++; \
            if (record.workspaceId[0] == '\0') { \
                strcpy(record.workspaceId, "global"); \
                migrated++; \
            } \
            fwrite(&record, sizeof(type), 1, temp); \
        } \
        fclose(fp); \
        fclose(temp); \
        remove(filename); \
        rename(tempname, filename); \
        printf("Migrated %s: %d total records, %d updated to 'global'\n", filename, count, migrated); \
    } else { \
        printf("Skipped %s: file not found or could not open.\n", filename); \
    } \
} while(0)

int main() {
    printf("Starting Phase 11 Migration...\n");
    
    MIGRATE_FILE(USERS_FILE, User);
    MIGRATE_FILE(RESIDENTS_FILE, Resident);
    MIGRATE_FILE(WASTE_FILE, Waste);
    MIGRATE_FILE(BINS_FILE, Bin);
    MIGRATE_FILE(VEHICLES_FILE, Vehicle);
    MIGRATE_FILE(COLLECTIONS_FILE, CollectionRequest);
    MIGRATE_FILE(INCIDENTS_FILE, Incident);
    MIGRATE_FILE(ALERTS_FILE, Alert);
    MIGRATE_FILE(HUBS_FILE, LocalHub);
    MIGRATE_FILE(AUDIT_FILE, AuditLog);
    MIGRATE_FILE(TRANSFERS_FILE, WasteTransfer);
    MIGRATE_FILE(FACILITIES_FILE, TransportFacility);
    MIGRATE_FILE(RECYCLING_BATCHES_FILE, RecyclingBatch);
    
    // According to types.h, ROUTES_FILE in Phase 7 uses 'Route'
    MIGRATE_FILE(ROUTES_FILE, Route);
    
    MIGRATE_FILE(LOCATIONS_FILE, GeoLocation);
    MIGRATE_FILE(SERVICE_AREAS_FILE, ServiceArea);
    MIGRATE_FILE(VEHICLE_LOCATIONS_FILE, VehicleLocation);
    
    MIGRATE_FILE(VEHICLE_INSPECTIONS_FILE, VehicleInspection);
    MIGRATE_FILE(QR_EVENTS_FILE, QREvent);

    printf("Migration completed.\n");
    return 0;
}
