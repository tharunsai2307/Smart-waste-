#ifndef CONFIG_H
#define CONFIG_H

// Graph Config
#define MAX_LOCATIONS 20
#define INF 999999

// Bin Thresholds
#define WARNING_THRESHOLD 70.0f
#define CRITICAL_THRESHOLD 90.0f

// Recycling Rates (Rs/kg)
#define RATE_PLASTIC 20.0f
#define RATE_PAPER 12.0f
#define RATE_METAL 40.0f
#define RATE_EWASTE 60.0f

// File Paths
#define USERS_FILE "data/users.dat"
#define RESIDENTS_FILE "data/residents.dat"
#define WASTE_FILE "data/waste.dat"
#define BINS_FILE "data/bins.dat"
#define VEHICLES_FILE "data/vehicles.dat"
#define COLLECTIONS_FILE "data/collections.dat"
#define RECYCLING_FILE "data/recycling.dat"
#define ALERTS_FILE "data/alerts.dat"
#define AUDIT_FILE "data/audit.dat"
#define HUBS_FILE "data/hubs.dat"
#define HUB_TRANSACTIONS_FILE "data/hub_transactions.dat"
#define INCIDENTS_FILE "data/incidents.dat"
#define TRANSFERS_FILE "data/transfers.dat"
#define FACILITIES_FILE "data/facilities.dat"
#define DRIVER_PROFILES_FILE "data/driver_profiles.dat"

// Phase 3 Thresholds
#define PROXIMITY_THRESHOLD_METERS 200.0f
#define MAX_CLEANER_DAILY_WORKLOAD_KG 1000.0f

// Phase 4 Thresholds
#define LOAD_VARIANCE_THRESHOLD_PCT 10.0f
#define DELIVERY_VARIANCE_THRESHOLD_KG 25.0f

// Phase 5 File Paths
#define RECYCLING_BATCHES_FILE "data/recycling_batches.dat"
#define WASTE_CLASSIFICATIONS_FILE "data/waste_classifications.dat"
#define SEGREGATION_RECORDS_FILE "data/segregation_records.dat"
#define PROCESSING_RECORDS_FILE "data/processing_records.dat"
#define RECOVERY_RECORDS_FILE "data/recovery_records.dat"
#define RESIDUAL_RECORDS_FILE "data/residual_records.dat"

// Phase 5 Thresholds
#define RECEIVING_VARIANCE_THRESHOLD_PCT 5.0f

// Phase 6
#define ROUTES_FILE "data/routes.dat"
#define GEOFENCE_RADIUS_METERS 200.0f

#define MAX_USERS 100

#endif
