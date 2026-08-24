#ifndef TYPES_H
#define TYPES_H

#include "config.h"

// ─────────────────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────────────────

typedef enum {
    ROLE_ADMIN,
    ROLE_LOCAL_HUB_MANAGER,
    ROLE_CLEANER,
    ROLE_DRIVER,
    ROLE_RECYCLING_MANAGER,
    ROLE_RESIDENT
} UserRole;

typedef enum {
    BIN_NORMAL,
    BIN_WARNING,
    BIN_CRITICAL,
    BIN_OVERFLOW
} BinStatus;

typedef enum {
    VEHICLE_AVAILABLE,
    VEHICLE_ASSIGNED,
    VEHICLE_LOADING,
    VEHICLE_ON_ROUTE,
    VEHICLE_FULL,
    VEHICLE_MAINTENANCE,
    VEHICLE_OUT_OF_SERVICE,
    VEHICLE_RETIRED
} VehicleStatus;

typedef enum {
    COLLECTION_REQUESTED,
    COLLECTION_UNDER_REVIEW,
    COLLECTION_ASSIGNED,
    COLLECTION_EN_ROUTE,
    COLLECTION_ARRIVED,
    COLLECTION_COLLECTING,
    COLLECTION_COLLECTED,
    COLLECTION_DEPOSIT_PENDING,
    COLLECTION_DEPOSITED_AT_HUB,
    COLLECTION_COMPLETED,
    COLLECTION_CANCELLED,
    COLLECTION_MISSED,
    COLLECTION_REJECTED,
    COLLECTION_RESCHEDULED
} CollectionStatus;

typedef enum {
    HUB_NORMAL,
    HUB_WARNING,
    HUB_CRITICAL,
    HUB_AT_CAPACITY,
    HUB_TEMPORARILY_CLOSED
} HubStatus;

typedef enum {
    TRANS_INBOUND_COLLECTION,
    TRANS_OUTBOUND_TRANSFER,
    TRANS_ADJUSTMENT,
    TRANS_CORRECTION
} HubTransactionType;

// Phase 4: Transfer States
typedef enum {
    TRANSFER_REQUESTED,
    TRANSFER_APPROVED,
    TRANSFER_DRIVER_ASSIGNED,
    TRANSFER_VEHICLE_ASSIGNED,
    TRANSFER_DRIVER_CHECKED_IN,
    TRANSFER_LOADING,
    TRANSFER_LOADED,
    TRANSFER_DEPARTED,
    TRANSFER_EN_ROUTE,
    TRANSFER_ARRIVED,
    TRANSFER_RECEIVING,
    TRANSFER_WEIGHT_VERIFICATION,
    TRANSFER_ACCEPTED,
    TRANSFER_PARTIALLY_ACCEPTED,
    TRANSFER_QUARANTINED,
    TRANSFER_UNLOADING,
    TRANSFER_DELIVERED,
    TRANSFER_COMPLETED,
    TRANSFER_CANCELLED,
    TRANSFER_REJECTED,
    TRANSFER_FAILED,
    TRANSFER_DELAYED
} TransferStatus;

// Phase 5: Batch Status
typedef enum {
    BATCH_CREATED,
    BATCH_RECEIVED,
    BATCH_CLASSIFYING,
    BATCH_CLASSIFIED,
    BATCH_PROCESSING,
    BATCH_PROCESSED,
    BATCH_RECOVERED,
    BATCH_COMPLETED,
    BATCH_QUARANTINED,
    BATCH_REJECTED,
    BATCH_CANCELLED
} BatchStatus;

// ─────────────────────────────────────────────────────────
// STRUCTS
// ─────────────────────────────────────────────────────────

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
    UserRole role;
    int status; // 1=Active, 0=Locked
    int failedAttempts;
    int requiresPasswordChange;
} User;

typedef struct {
    int loggedIn;
    User currentUser;
} AppContext;

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
} Resident;

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
} Waste;

typedef struct {
    int binId;
    char location[60];
    float capacity;
    float currentLevel;
    char wasteType[30];
    BinStatus status;
    char dataSource[10];
} Bin;

// Phase 4: Extended Vehicle struct
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
    VehicleStatus status;
    char createdAt[30];
    char updatedAt[30];
} Vehicle;

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
    CollectionStatus status;
    char measurementSource[30];
    char varianceReason[150];
    char createdAt[30];
    char updatedAt[30];
    char completedAt[30];
} CollectionRequest;

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
} Incident;

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
} IncidentTimelineEntry;

typedef struct {
    int userId;
    int criticalAlerts;
    int highSeverityAlerts;
    int assignedIncidentsOnly;
    int hubAlerts;
    int vehicleAlerts;
    int collectionExceptions;
    int recyclingExceptions;
} NotificationPreference;

typedef struct {
    int recyclingId;
    int collectionId;
    char wasteType[30];
    float recyclableQuantity;
    float recycledQuantity;
    float rejectedQuantity;
    float value;
} RecyclingRecord;

typedef struct {
    int alertId;
    char type[30];
    int referenceId;
    char message[200];
    char date[20];
    int resolved;
} Alert;

typedef struct {
    int id;
    char name[50];
} Location;

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
    HubStatus status;
    char createdAt[30];
    char updatedAt[30];
} LocalHub;

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
} HubInventoryTransaction;

typedef struct {
    int logId;
    int actorId;
    char action[50];
    int targetId;
    char timestamp[30];
} AuditLog;

// Phase 4: Waste Transfer
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
    TransferStatus status;
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
} WasteTransfer;

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
} TransportFacility;

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
    BatchStatus status;
    char createdAt[30];
    char processedAt[30];
    char completedAt[30];
} RecyclingBatch;

// Phase 5: Waste Classification
typedef struct {
    int classificationId;
    int batchId;
    char wasteType[30];
    float weightKg;
    int operatorId;
    char timestamp[30];
} WasteClassification;

// Phase 5: Segregation Record
typedef struct {
    int segregationId;
    int batchId;
    float inputWeightKg;
    float outputWeightKg;
    char wasteType[30];
    int operatorId;
    char timestamp[30];
} SegregationRecord;

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
} ProcessingRecord;

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
} RecoveryRecord;

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
} ResidualRecord;

// Phase 4: Driver Extended Profile (beyond User struct)
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
} DriverProfile;

// Phase 6: Route Plan
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
} RoutePlan;


// Phase 6: GIS & Location Intelligence
typedef enum {
    LOCATION_RESIDENT,
    LOCATION_LOCAL_HUB,
    LOCATION_RECYCLING_FACILITY,
    LOCATION_DEPOT,
    LOCATION_VEHICLE,
    LOCATION_COLLECTION_POINT,
    LOCATION_SERVICE_AREA
} LocationType;

typedef struct {
    int locationId;
    LocationType type;
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
} GeoLocation;

typedef struct {
    int areaId;
    char name[100];
    char city[100];
    char postalCodes[200];
    int assignedHubId;
    int activeCleaners;
    float collectionCapacityKg;
    int active;
} ServiceArea;

typedef struct {
    int vehicleId;
    int driverId;
    double latitude;
    double longitude;
    char timestamp[32];
    float accuracy;
    char source[30]; // MANUAL, GPS_API, MOBILE_DEVICE
} VehicleLocation;

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
} RouteRequest;

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
} RouteStop;


// Phase 7: Intelligent Route
typedef enum {
    ROUTE_PLANNED, ROUTE_ASSIGNED, ROUTE_ACCEPTED, ROUTE_EN_ROUTE,
    ROUTE_ARRIVED, ROUTE_COLLECTING, ROUTE_COMPLETED, ROUTE_DECLINED,
    ROUTE_CANCELLED, ROUTE_FAILED, ROUTE_RESCHEDULED, ROUTE_PRE_TRIP_CHECK, ROUTE_READY, ROUTE_PAUSED, ROUTE_RETURNING, ROUTE_AT_DESTINATION, ROUTE_LOAD_VERIFIED, ROUTE_ABORTED, ROUTE_VEHICLE_BREAKDOWN, ROUTE_DRIVER_UNAVAILABLE, ROUTE_ACCESS_BLOCKED, ROUTE_EMERGENCY
} RouteStatus;

typedef enum {
    STOP_PLANNED, STOP_EN_ROUTE, STOP_ARRIVED, STOP_SERVICING,
    STOP_COMPLETED, STOP_SKIPPED, STOP_FAILED, STOP_RESCHEDULED
} StopStatus;

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
    RouteStatus status;
    char createdAt[32];
    char updatedAt[32];
} Route;

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
    StopStatus status;
    char notes[150];
} RouteEngineStop;

typedef struct {
    int eventId;
    int routeId;
    int actorId;
    char timestamp[32];
    double latitude;
    double longitude;
    char eventType[30];
    char notes[150];
} RouteEvent;



// Phase 8: Operations & QR Tracking
typedef enum { INSPECT_PASS, INSPECT_FAIL, INSPECT_REQUIRES_ATTENTION } VehicleInspectionStatus;
typedef enum { QR_SUCCESS, QR_FAILED } QREventResult;

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
    VehicleInspectionStatus inspectionStatus;
    char timestamp[32];
} VehicleInspection;

typedef struct {
    int eventId;
    char qrType[30];
    int entityId;
    int scannedBy;
    char scanTimestamp[32];
    int routeId;
    int vehicleId;
    int locationId;
    QREventResult result;
    char failureReason[150];
} QREvent;

#endif
