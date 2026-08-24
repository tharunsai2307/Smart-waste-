#ifndef ANALYTICS_H
#define ANALYTICS_H

#include "types.h"
#include "config.h"

// ─────────────────────────────────────────────────────────
// TIME FILTER ENUMS & STRUCTURES
// ─────────────────────────────────────────────────────────

typedef enum {
    TIME_FILTER_ALL,
    TIME_FILTER_TODAY,
    TIME_FILTER_YESTERDAY,
    TIME_FILTER_LAST_7_DAYS,
    TIME_FILTER_LAST_30_DAYS,
    TIME_FILTER_THIS_MONTH,
    TIME_FILTER_LAST_MONTH,
    TIME_FILTER_CUSTOM
} AnalyticsTimeFilter;

typedef struct {
    AnalyticsTimeFilter timeFilter;
    char fromDate[32]; // "YYYY-MM-DD"
    char toDate[32];   // "YYYY-MM-DD"
    int hubId;         // 0 = all
    int facilityId;    // 0 = all
    int vehicleId;     // 0 = all
    int driverId;      // 0 = all
    int cleanerId;     // 0 = all
    int residentId;    // 0 = all
    char wasteType[32];
    UserRole requesterRole;
    int requesterId;
} AnalyticsFilter;

// ─────────────────────────────────────────────────────────
// ANALYTICS DATA STRUCTURES
// ─────────────────────────────────────────────────────────

typedef struct {
    int totalResidents;
    int activeResidents;
    int totalCollectionRequests;
    int completedCollections;
    int pendingCollections;
    int missedCollections;
    int cancelledCollections;
    float totalWasteCollectedKg;
    float totalWasteTransferredKg;
    float totalWasteProcessedKg;
    float totalRecoveredKg;
    float totalResidualKg;
    float recyclingRecoveryRate;
    int totalVehicles;
    int activeVehicles;
    int totalRoutes;
    int activeRoutes;
    int completedRoutes;
    int totalHubs;
    int activeHubs;
    int criticalHubs;
    int totalIncidents;
    int openIncidents;
    int totalQrScans;
    int successfulQrScans;
    float qrComplianceRate;
    float operationalEfficiencyIndex;
} AnalyticsSummary;

typedef struct {
    int totalRequests;
    int completedRequests;
    int pendingRequests;
    int assignedRequests;
    int enRouteRequests;
    int collectingRequests;
    int missedRequests;
    int cancelledRequests;
    int rescheduledRequests;
    float totalCollectedKg;
    float averageCollectionWeightKg;
    float averageCompletionTimeMin;
    float collectionSuccessRate;
    float missedCollectionRate;
    int priorityLow;
    int priorityNormal;
    int priorityHigh;
    int priorityUrgent;
} CollectionAnalytics;

typedef struct {
    int hubId;
    char hubCode[32];
    char name[100];
    float maximumCapacityKg;
    float currentInventoryKg;
    float availableCapacityKg;
    float utilizationPercentage;
    float inboundKg;
    float outboundKg;
    int activeCleaners;
    int pendingCollections;
    int pendingTransfers;
    HubStatus status;
    int alertCount;
} HubAnalyticsItem;

typedef struct {
    int totalVehicles;
    int activeVehicles;
    int inactiveVehicles;
    int underMaintenance;
    int availableVehicles;
    int assignedVehicles;
    int onRouteVehicles;
    int atCapacityVehicles;
    float totalFleetCapacityKg;
    float currentFleetLoadKg;
    float fleetUtilizationPercentage;
    int inspectionPasses;
    int inspectionFailures;
} FleetAnalytics;

typedef struct {
    int vehicleId;
    char registrationNumber[32];
    char vehicleType[32];
    float capacityKg;
    float currentLoadKg;
    float utilizationPercentage;
    int driverId;
    char driverName[50];
    int currentRouteId;
    VehicleStatus status;
    char lastInspectionDate[32];
    VehicleInspectionStatus lastInspectionStatus;
} VehicleAnalyticsItem;

typedef struct {
    int totalRoutes;
    int plannedRoutes;
    int dispatchedRoutes;
    int acceptedRoutes;
    int activeRoutes;
    int completedRoutes;
    int cancelledRoutes;
    float averageRouteDurationMin;
    float averageStopsPerRoute;
    int totalStops;
    int completedStops;
    int pendingStops;
    float routeUtilizationPercentage;
} RouteAnalytics;

typedef struct {
    int routeId;
    char routeType[30];
    int driverId;
    char driverName[50];
    int vehicleId;
    char vehicleReg[30];
    int originId;
    int destinationId;
    int stopCount;
    int completedStopCount;
    float totalWeightKg;
    RouteStatus status;
    float durationMinutes;
} RouteAnalyticsItem;

typedef struct {
    float totalInputKg;
    float totalClassifiedKg;
    float totalSegregatedKg;
    float totalProcessedKg;
    float totalRecoveredKg;
    float totalResidualKg;
    float recoveryRate;
    float residualRate;
    float processingLossKg;
    float processingLossRate;
    int totalBatches;
    int activeBatches;
    int completedBatches;
} RecyclingAnalytics;

typedef struct {
    char wasteType[32];
    float collectedKg;
    float processedKg;
    float recoveredKg;
    float residualKg;
    float percentageOfTotal;
} WasteTypeAnalyticsItem;

typedef struct {
    int driverId;
    char name[50];
    char employeeCode[20];
    int assignedRoutes;
    int acceptedRoutes;
    int completedRoutes;
    int cancelledRoutes;
    int completedStops;
    int missedStops;
    float totalCollectedKg;
    float averageRouteCompletionTimeMin;
    int weightVarianceIncidents;
    int qrScanFailures;
    int inspectionFailures;
    float performanceScore; // 0-100
} DriverPerformanceItem;

typedef struct {
    int cleanerId;
    char name[50];
    int assignedHubId;
    int assignedCollections;
    int completedCollections;
    int missedCollections;
    float totalCollectedKg;
    float averageCollectionWeightKg;
    int weightVarianceIncidents;
    int successfulDeposits;
    float performanceScore; // 0-100
} CleanerPerformanceItem;

typedef struct {
    int facilityId;
    char facilityCode[20];
    char name[100];
    char facilityType[40];
    float receivedKg;
    int acceptedLoads;
    int rejectedLoads;
    int quarantinedLoads;
    int activeBatches;
    int completedBatches;
    float recoveredKg;
    float residualKg;
    float recoveryRate;
    float maximumDailyCapacityKg;
    char currentOperationalStatus[30];
} FacilityAnalyticsItem;

typedef struct {
    int totalIncidents;
    int openIncidents;
    int resolvedIncidents;
    int criticalIncidents;
    int highSeverityIncidents;
    int mediumSeverityIncidents;
    int lowSeverityIncidents;
    int missedCollectionCount;
    int weightVarianceCount;
    int vehicleFailureCount;
    int qrFailureCount;
    int capacityOverflowCount;
    int routeExceptionCount;
    int facilityRejectionCount;
    int safetyCount;
    int otherCount;
} IncidentAnalytics;

typedef struct {
    int totalScans;
    int successfulScans;
    int failedScans;
    float complianceRate;
    int vehicleScans;
    int hubScans;
    int routeScans;
    int stopScans;
    int facilityScans;
} QRAnalytics;

typedef struct {
    char date[16]; // YYYY-MM-DD
    int requests;
    int completed;
    int missed;
    float wasteKg;
    float recoveredKg;
    int incidentCount;
} OperationalTrendItem;

typedef struct {
    int eventId;
    char timestamp[32];
    char eventType[40];
    char title[100];
    char description[200];
    char severity[20]; // INFO, SUCCESS, WARNING, CRITICAL
    int actorId;
    char actorName[50];
} LiveFeedEvent;

// ─────────────────────────────────────────────────────────
// CORE CALCULATION FUNCTIONS
// ─────────────────────────────────────────────────────────

// Date validation and filter matching
int isDateInFilter(const char* recordDate, const AnalyticsFilter* filter);

// Aggregations
void calculateAnalyticsSummary(const AnalyticsFilter* filter, AnalyticsSummary* out);
void calculateCollectionAnalytics(const AnalyticsFilter* filter, CollectionAnalytics* out);
int getHubAnalyticsList(const AnalyticsFilter* filter, HubAnalyticsItem* outList, int maxItems);
void calculateFleetAnalytics(const AnalyticsFilter* filter, FleetAnalytics* out);
int getVehicleAnalyticsList(const AnalyticsFilter* filter, VehicleAnalyticsItem* outList, int maxItems);
void calculateRouteAnalytics(const AnalyticsFilter* filter, RouteAnalytics* out);
int getRouteAnalyticsList(const AnalyticsFilter* filter, RouteAnalyticsItem* outList, int maxItems);
void calculateRecyclingAnalytics(const AnalyticsFilter* filter, RecyclingAnalytics* out);
int getWasteTypeAnalytics(const AnalyticsFilter* filter, WasteTypeAnalyticsItem* outList, int maxItems);
int getDriverPerformanceList(const AnalyticsFilter* filter, DriverPerformanceItem* outList, int maxItems);
int getCleanerPerformanceList(const AnalyticsFilter* filter, CleanerPerformanceItem* outList, int maxItems);
int getFacilityAnalyticsList(const AnalyticsFilter* filter, FacilityAnalyticsItem* outList, int maxItems);
void calculateIncidentAnalytics(const AnalyticsFilter* filter, IncidentAnalytics* out);
void calculateQRAnalytics(const AnalyticsFilter* filter, QRAnalytics* out);
int getOperationalTrends(const AnalyticsFilter* filter, OperationalTrendItem* outList, int maxItems);
int getLiveFeedEvents(const AnalyticsFilter* filter, LiveFeedEvent* outList, int maxItems);

// High-level index calculation
float calculateMunicipalOperationalEfficiency(const AnalyticsSummary* summary);

#endif // ANALYTICS_H
