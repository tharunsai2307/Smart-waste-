#ifndef TYPES_V10_H
#define TYPES_V10_H

#include "config.h"

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ENUMS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

typedef enum {
    ROLE_ADMIN_V10,
    ROLE_LOCAL_HUB_MANAGER_V10,
    ROLE_CLEANER_V10,
    ROLE_DRIVER_V10,
    ROLE_RECYCLING_MANAGER_V10,
    ROLE_RESIDENT_V10
} UserRole_v10;

typedef enum {
    BIN_NORMAL_V10,
    BIN_WARNING_V10,
    BIN_CRITICAL_V10,
    BIN_OVERFLOW_V10
} BinStatus_v10;

typedef enum {
    VEHICLE_AVAILABLE_V10,
    VEHICLE_ASSIGNED_V10,
    VEHICLE_LOADING_V10,
    VEHICLE_ON_ROUTE_V10,
    VEHICLE_FULL_V10,
    VEHICLE_MAINTENANCE_V10,
    VEHICLE_OUT_OF_SERVICE_V10,
    VEHICLE_RETIRED_V10
} VehicleStatus_v10;

typedef enum {
    COLLECTION_REQUESTED_V10,
    COLLECTION_UNDER_REVIEW_V10,
    COLLECTION_ASSIGNED_V10,
    COLLECTION_EN_ROUTE_V10,
    COLLECTION_ARRIVED_V10,
    COLLECTION_COLLECTING_V10,
    COLLECTION_COLLECTED_V10,
    COLLECTION_DEPOSIT_PENDING_V10,
    COLLECTION_DEPOSITED_AT_HUB_V10,
    COLLECTION_COMPLETED_V10,
    COLLECTION_CANCELLED_V10,
    COLLECTION_MISSED_V10,
    COLLECTION_REJECTED_V10,
    COLLECTION_RESCHEDULED_V10
} CollectionStatus_v10;

typedef enum {
    HUB_NORMAL_V10,
    HUB_WARNING_V10,
    HUB_CRITICAL_V10,
    HUB_AT_CAPACITY_V10,
    HUB_TEMPORARILY_CLOSED_V10
} HubStatus_v10;

typedef enum {
    TRANS_INBOUND_COLLECTION_V10,
    TRANS_OUTBOUND_TRANSFER_V10,
    TRANS_ADJUSTMENT_V10,
    TRANS_CORRECTION_V10
} HubTransactionType_v10;

// Phase 4: Transfer States
typedef enum {
    TRANSFER_REQUESTED_V10,
    TRANSFER_APPROVED_V10,
    TRANSFER_DRIVER_ASSIGNED_V10,
    TRANSFER_VEHICLE_ASSIGNED_V10,
    TRANSFER_DRIVER_CHECKED_IN_V10,
    TRANSFER_LOADING_V10,
    TRANSFER_LOADED_V10,
    TRANSFER_DEPARTED_V10,
    TRANSFER_EN_ROUTE_V10,
    TRANSFER_ARRIVED_V10,
    TRANSFER_RECEIVING_V10,
    TRANSFER_WEIGHT_VERIFICATION_V10,
    TRANSFER_ACCEPTED_V10,
    TRANSFER_PARTIALLY_ACCEPTED_V10,
    TRANSFER_QUARANTINED_V10,
    TRANSFER_UNLOADING_V10,
    TRANSFER_DELIVERED_V10,
    TRANSFER_COMPLETED_V10,
    TRANSFER_CANCELLED_V10,
    TRANSFER_REJECTED_V10,
    TRANSFER_FAILED_V10,
    TRANSFER_DELAYED_V10
} TransferStatus_v10;

// Phase 5: Batch Status
typedef enum {
    BATCH_CREATED_V10,
    BATCH_RECEIVED_V10,
    BATCH_CLASSIFYING_V10,
    BATCH_CLASSIFIED_V10,
    BATCH_PROCESSING_V10,
    BATCH_PROCESSED_V10,
    BATCH_RECOVERED_V10,
    BATCH_COMPLETED_V10,
    BATCH_QUARANTINED_V10,
    BATCH_REJECTED_V10,
    BATCH_CANCELLED_V10
} BatchStatus_v10;

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// STRUCTS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

typedef struct {
    int userId;
    char username[50];
    char password[100];
    char name[50];
    char phone[20];
    char email[50];
    int assignedHub;
    char employmentStatus[20];
    char licenseNumber[30];
    char licenseExpiry[20];
    UserRole_v10 role;
    int status; // 1=Active, 0=Locked
    int failedAttempts;
    int requiresPasswordChange;
} User_v10;

typedef struct {
    int loggedIn;
    User_v10 currentUser;
} AppContext_v10;

typedef struct {
    int residentId;
    int userId;
    char address[150];
    char area[50];
    char city[50];
    char postalCode[20];
    char location[50];
    double latitude;
    double longitude;
    char locationStatus[30]; // VERIFIED, UNVERIFIED, INVALID
    char serviceZone[50];
    int ecoPoints;
} Resident_v10;

typedef struct {
    int wasteId;
    int residentId;
    int binId;
    char wasteType[30];
    float quantity;
    char date[20];
    int recyclable;
    int collected;
    char dataSource[10];
} Waste_v10;

typedef struct {
    int binId;
    char location[60];
    float capacity;
    float currentLevel;
    char wasteType[30];
    BinStatus_v10 status;
    char dataSource[10];
} Bin_v10;

// Phase 4: Extended Vehicle_v10 struct
typedef struct {
    int vehicleId;
    char vehicleNumber[20];    // Old field, kept for display/quick-ref
    char registrationNumber[30];
    char vehicleCode[20];      // e.g. VEH-001
    char vehicleType[20];      // TRUCK, COMPACT, TIPPER, CONTAINER
    char make[30];
    char model[30];
    int manufactureYear;
    float capacityKg;          // canonical capacity (replaces old capacity)
    float currentLoad;         // kept for legacy display only, not used for inventory
    int assignedHubId;
    float odometerKm;
    char insuranceExpiry[20];
    char inspectionExpiry[20];
    char lastServiceDate[20];
    VehicleStatus_v10 status;
    char createdAt[30];
    char updatedAt[30];
} Vehicle_v10;

typedef struct {
    int collectionId;
    int residentId;
    int hubId;
    int cleanerId;
    int vehicleId;
    int binId;
    char address[150];
    double latitude;
    double longitude;
    char wasteType[30];
    float estimatedWeightKg;
    float actualWeightKg;
    float depositedWeightKg;
    char preferredDate[30];
    char preferredTime[30];
    char description[200];
    int priorityScore;
    char priorityLevel[20];
    CollectionStatus_v10 status;
    char measurementSource[30];
    char varianceReason[150];
    char createdAt[30];
    char updatedAt[30];
    char completedAt[30];
} CollectionRequest_v10;

typedef struct {
    int incidentId;
    char type[40];
    char severity[20];
    int collectionId;
    int reportedBy;
    int assignedTo;
    char status[20];
    char description[250];
    char createdAt[30];
    char resolvedAt[30];
    char entityType[30];
    int entityId;
    int hubId;
    int vehicleId;
    int routeId;
    int facilityId;
    char assignedRole[30];
    char acknowledgedAt[30];
    char closedAt[30];
    int escalationLevel;
} Incident_v10;

typedef struct {
    int timelineId;
    int incidentId;
    char timestamp[32];
    int actorId;
    char actorRole[32];
    char action[40];
    char previousStatus[20];
    char newStatus[20];
    char comment[256];
    char evidenceRef[64];
} IncidentTimelineEntry_v10;

typedef struct {
    int userId;
    int criticalAlerts;
    int highSeverityAlerts;
    int assignedIncidentsOnly;
    int hubAlerts;
    int vehicleAlerts;
    int collectionExceptions;
    int recyclingExceptions;
} NotificationPreference_v10;

typedef struct {
    int recyclingId;
    int collectionId;
    char wasteType[30];
    float recyclableQuantity;
    float recycledQuantity;
    float rejectedQuantity;
    float value;
} RecyclingRecord_v10;

typedef struct {
    int alertId;
    char type[30];
    int referenceId;
    char message[200];
    char date[20];
    int resolved;
} Alert_v10;

typedef struct {
    int id;
    char name[50];
} Location_v10;

typedef struct {
    int hubId;
    char hubCode[30];
    char name[100];
    char address[150];
    double latitude;
    double longitude;
    char serviceZone[50];
    float maximumCapacityKg;
    float warningThresholdPercent;
    float criticalThresholdPercent;
    int managerId;
    HubStatus_v10 status;
    char createdAt[30];
    char updatedAt[30];
} LocalHub_v10;

typedef struct {
    int transactionId;
    int hubId;
    char transactionType[30];
    float quantityKg;
    char wasteType[30];
    char sourceType[30];
    int sourceId;
    char destinationType[30];
    int destinationId;
    int recordedBy;
    char measurementSource[30];
    char timestamp[30];
} HubInventoryTransaction_v10;

typedef struct {
    int logId;
    int actorId;
    char action[50];
    int targetId;
    char timestamp[30];
} AuditLog_v10;

// Phase 4: Waste_v10 Transfer
typedef struct {
    int transferId;
    char transferCode[30];      // e.g. TRF-00042
    int sourceHubId;
    int destinationFacilityId;
    char destinationType[40];   // RECYCLING_HUB, COMPOSTING_FACILITY, etc.
    int driverId;
    int vehicleId;
    float plannedWeightKg;
    float actualLoadedWeightKg;
    float actualDeliveredWeightKg;
    char wasteType[30];
    TransferStatus_v10 status;
    char priority[20];          // LOW, NORMAL, HIGH, URGENT
    char scheduledDate[30];
    char scheduledTime[30];
    char varianceReason[150];
    char varianceExplanation[200];
    int outboundTransactionId;  // Phase 2 ledger reference (idempotency guard)
    char startedAt[30];
    char loadedAt[30];
    char departedAt[30];
    char arrivedAt[30];
    char completedAt[30];
    int createdBy;
    char createdAt[30];
    char updatedAt[30];
} WasteTransfer_v10;

// Phase 4: Registered Transport Facility (Destination)
typedef struct {
    int facilityId;
    char facilityCode[20];
    char name[100];
    char facilityType[40];     // RECYCLING_HUB, COMPOSTING_FACILITY, WASTE_TO_ENERGY, etc.
    char address[150];
    double latitude;
    double longitude;
    float maximumDailyCapacityKg;
    char currentOperationalStatus[30]; // OPERATIONAL, LIMITED, TEMPORARILY_CLOSED, MAINTENANCE, FULL
    int managerId;
    char contactName[50];
    char contactPhone[20];
    char status[20];           // ACTIVE, INACTIVE, SUSPENDED
    char createdAt[30];
    char updatedAt[30];
} TransportFacility_v10;

// Phase 5: Recycling Batch
typedef struct {
    int batchId;
    char batchCode[30];
    int facilityId;
    int sourceTransferId;
    int sourceHubId;
    float inputWeightKg;
    float processedWeightKg;
    float recoveredWeightKg;
    float residualWeightKg;
    BatchStatus_v10 status;
    char createdAt[30];
    char processedAt[30];
    char completedAt[30];
} RecyclingBatch_v10;

// Phase 5: Waste_v10 Classification
typedef struct {
    int classificationId;
    int batchId;
    char wasteType[30];
    float weightKg;
    int operatorId;
    char timestamp[30];
} WasteClassification_v10;

// Phase 5: Segregation Record
typedef struct {
    int segregationId;
    int batchId;
    float inputWeightKg;
    float outputWeightKg;
    char wasteType[30];
    int operatorId;
    char timestamp[30];
} SegregationRecord_v10;

// Phase 5: Processing Record
typedef struct {
    int processingId;
    int batchId;
    char processingMethod[50];
    int operatorId;
    char startTime[30];
    char endTime[30];
    float inputWeightKg;
    float outputWeightKg;
} ProcessingRecord_v10;

// Phase 5: Recovery Record
typedef struct {
    int recoveryId;
    int batchId;
    char materialType[30];
    float weightKg;
    char qualityGrade[10];
    char destination[100];
    int operatorId;
    char processedAt[30];
} RecoveryRecord_v10;

// Phase 5: Residual Record
typedef struct {
    int residualId;
    int batchId;
    float weightKg;
    char category[50];
    char reason[150];
    char destination[100];
    char disposalMethod[50];
    int operatorId;
    char timestamp[30];
} ResidualRecord_v10;

// Phase 4: Driver Extended Profile (beyond User_v10 struct)
typedef struct {
    int profileId;
    int userId;
    char employeeCode[20];
    char licenseCategory[20];  // LMV, HMV, TRANSPORT
    char availability[20];     // AVAILABLE, ASSIGNED, ON_DUTY, ON_ROUTE, OFF_DUTY, UNAVAILABLE, SUSPENDED
    int currentTransferId;     // 0 = none
    float totalKmDriven;
    char createdAt[30];
    char updatedAt[30];
} DriverProfile_v10;

// Phase 6: Route_v10 Plan
typedef struct {
    int routeId;
    char routeType[20]; // COLLECTION, TRANSFER
    int assignedToId;   // cleanerId or driverId
    int originId;       // hubId
    int destinationId;  // hubId or facilityId
    int stops[20];      // collectionIds
    int stopCount;
    float totalDistanceKm;
    float estimatedDurationMin;
    char createdAt[30];
} RoutePlan_v10;


// Phase 6: GIS & Location_v10 Intelligence
typedef enum {
    LOCATION_RESIDENT_V10,
    LOCATION_LOCAL_HUB_V10,
    LOCATION_RECYCLING_FACILITY_V10,
    LOCATION_DEPOT_V10,
    LOCATION_VEHICLE_V10,
    LOCATION_COLLECTION_POINT_V10,
    LOCATION_SERVICE_AREA_V10
} LocationType_v10;

typedef struct {
    int locationId;
    LocationType_v10 type;
    int referenceId; // e.g. residentId, hubId, vehicleId

    double latitude;
    double longitude;

    char address[256];
    char area[100];
    char city[100];
    char postalCode[20];

    int verified;
    int active;

    char createdAt[32];
    char updatedAt[32];
} GeoLocation_v10;

typedef struct {
    int areaId;
    char name[100];
    char city[100];
    char postalCodes[200];
    int assignedHubId;
    int activeCleaners;
    float collectionCapacityKg;
    int active;
} ServiceArea_v10;

typedef struct {
    int vehicleId;
    int driverId;
    double latitude;
    double longitude;
    char timestamp[32];
    float accuracy;
    char source[30]; // MANUAL, GPS_API, MOBILE_DEVICE
} VehicleLocation_v10;

typedef struct {
    int routeId;
    char routeCode[30];
    int driverId;
    int vehicleId;
    double startLat;
    double startLon;
    double endLat;
    double endLon;
    float estimatedDistanceKm;
    float estimatedDurationMin;
    char status[20]; // PENDING, IN_PROGRESS, COMPLETED, CANCELLED
    char createdAt[32];
} RouteRequest_v10;

typedef struct {
    int stopId;
    int routeId;
    int stopOrder;
    char stopType[30]; // COLLECTION, DEPOSIT, TRANSFER
    int referenceId;   // collectionId, hubId, etc.
    double latitude;
    double longitude;
    char expectedTime[30];
    char status[20];
} RouteStop_v10;


// Phase 7: Intelligent Route_v10
typedef enum {
    ROUTE_PLANNED_V10, ROUTE_ASSIGNED_V10, ROUTE_ACCEPTED_V10, ROUTE_EN_ROUTE_V10,
    ROUTE_ARRIVED_V10, ROUTE_COLLECTING_V10, ROUTE_COMPLETED_V10, ROUTE_DECLINED_V10,
    ROUTE_CANCELLED_V10, ROUTE_FAILED_V10, ROUTE_RESCHEDULED_V10, ROUTE_PRE_TRIP_CHECK_V10, ROUTE_READY_V10, ROUTE_PAUSED_V10, ROUTE_RETURNING_V10, ROUTE_AT_DESTINATION_V10, ROUTE_LOAD_VERIFIED_V10, ROUTE_ABORTED_V10, ROUTE_VEHICLE_BREAKDOWN_V10, ROUTE_DRIVER_UNAVAILABLE_V10, ROUTE_ACCESS_BLOCKED_V10, ROUTE_EMERGENCY_V10
} RouteStatus_v10;

typedef enum {
    STOP_PLANNED_V10, STOP_EN_ROUTE_V10, STOP_ARRIVED_V10, STOP_SERVICING_V10,
    STOP_COMPLETED_V10, STOP_SKIPPED_V10, STOP_FAILED_V10, STOP_RESCHEDULED_V10
} StopStatus_v10;

typedef struct {
    int routeId;
    char routeType[30];
    int driverId;
    int vehicleId;
    int originId;
    int destinationId;
    float totalDistanceKm;
    float estimatedDurationMinutes;
    float totalPlannedLoadKg;
    float vehicleCapacityKg;
    float utilizationPercentage;
    RouteStatus_v10 status;
    char createdAt[32];
    char updatedAt[32];
} Route_v10;

typedef struct {
    int routeStopId;
    int routeId;
    int sequenceNumber;
    int locationId;
    int referenceId;
    char stopType[30];
    int priority;
    float estimatedWeightKg;
    float actualWeightKg;
    char arrivalTime[30];
    char serviceStartTime[30];
    char serviceCompletedTime[30];
    StopStatus_v10 status;
    char notes[150];
} RouteEngineStop_v10;

typedef struct {
    int eventId;
    int routeId;
    int actorId;
    char timestamp[32];
    double latitude;
    double longitude;
    char eventType[30];
    char notes[150];
} RouteEvent_v10;



// Phase 8: Operations & QR Tracking
typedef enum { INSPECT_PASS_V10, INSPECT_FAIL_V10, INSPECT_REQUIRES_ATTENTION_V10 } VehicleInspectionStatus_v10;
typedef enum { QR_SUCCESS_V10, QR_FAILED_V10 } QREventResult_v10;

typedef struct {
    int inspectionId;
    int vehicleId;
    int driverId;
    int routeId;
    char inspectionDate[32];
    int brakes;
    int tires;
    int lights;
    int mirrors;
    int horn;
    int hydraulicSystem;
    int bodyCondition;
    int fuelLevel;
    int odometer;
    char remarks[150];
    VehicleInspectionStatus_v10 inspectionStatus;
    char timestamp[32];
} VehicleInspection_v10;

typedef struct {
    int eventId;
    char qrType[30];
    int entityId;
    int scannedBy;
    char scanTimestamp[32];
    int routeId;
    int vehicleId;
    int locationId;
    QREventResult_v10 result;
    char failureReason[150];
} QREvent_v10;

#endif
