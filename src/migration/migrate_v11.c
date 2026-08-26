#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "types_v10.h"
#include "types.h"

// Macro to migrate a file
#define MIGRATE_FILE(filename, OldType, NewType) \
    do { \
        FILE *fp_in = fopen(filename, "rb"); \
        if (!fp_in) { \
            printf("File %s not found, skipping.\n", filename); \
            break; \
        } \
        char temp_filename[256]; \
        snprintf(temp_filename, sizeof(temp_filename), "%s.new", filename); \
        FILE *fp_out = fopen(temp_filename, "wb"); \
        if (!fp_out) { \
            printf("Could not create %s\n", temp_filename); \
            fclose(fp_in); \
            break; \
        } \
        OldType old_obj; \
        NewType new_obj; \
        int count = 0; \
        while (fread(&old_obj, sizeof(OldType), 1, fp_in) == 1) { \
            memset(&new_obj, 0, sizeof(NewType)); \
            memcpy(&new_obj, &old_obj, sizeof(OldType)); \
            strncpy(new_obj.workspaceId, "global", sizeof(new_obj.workspaceId) - 1); \
            fwrite(&new_obj, sizeof(NewType), 1, fp_out); \
            count++; \
        } \
        fclose(fp_in); \
        fclose(fp_out); \
        remove(filename); \
        rename(temp_filename, filename); \
        printf("Migrated %d records in %s\n", count, filename); \
    } while (0)

int main() {
    printf("Starting data migration to V11 (Workspace Scoping)...\n");

    MIGRATE_FILE("data/users.dat", User_v10, User);
    MIGRATE_FILE("data/residents.dat", Resident_v10, Resident);
    MIGRATE_FILE("data/waste.dat", Waste_v10, Waste);
    MIGRATE_FILE("data/bins.dat", Bin_v10, Bin);
    MIGRATE_FILE("data/vehicles.dat", Vehicle_v10, Vehicle);
    MIGRATE_FILE("data/collections.dat", CollectionRequest_v10, CollectionRequest);
    MIGRATE_FILE("data/incidents.dat", Incident_v10, Incident);
    MIGRATE_FILE("data/local_hubs.dat", LocalHub_v10, LocalHub);
    MIGRATE_FILE("data/transfers.dat", WasteTransfer_v10, WasteTransfer);
    MIGRATE_FILE("data/transport_facilities.dat", TransportFacility_v10, TransportFacility);
    MIGRATE_FILE("data/recycling_batches.dat", RecyclingBatch_v10, RecyclingBatch);
    MIGRATE_FILE("data/geo_locations.dat", GeoLocation_v10, GeoLocation);
    MIGRATE_FILE("data/service_areas.dat", ServiceArea_v10, ServiceArea);
    MIGRATE_FILE("data/vehicle_locations.dat", VehicleLocation_v10, VehicleLocation);
    MIGRATE_FILE("data/route_requests.dat", RouteRequest_v10, RouteRequest);
    MIGRATE_FILE("data/routes.dat", Route_v10, Route);
    MIGRATE_FILE("data/vehicle_inspections.dat", VehicleInspection_v10, VehicleInspection);
    MIGRATE_FILE("data/qr_events.dat", QREvent_v10, QREvent);
    MIGRATE_FILE("data/alerts.dat", Alert_v10, Alert);
    MIGRATE_FILE("data/audit.dat", AuditLog_v10, AuditLog);

    printf("Migration complete.\n");
    return 0;
}
