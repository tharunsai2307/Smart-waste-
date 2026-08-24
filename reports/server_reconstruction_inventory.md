# Server Reconstruction Inventory

## Existing Phase 1 server.c Implementation Details

- HTTP Framework: Mongoose embedded HTTP library (eventHandler, mg_mgr_poll)
- Request Parsing: mg_match for URI matching, mg_json_get_str for body parsing
- Response Generation: sendJsonResponse helper
- Auth Handling: getUserIdFromHeader to parse Authorization Bearer tokens, token verification
- Routing: if/else if chain in eventHandler matching methods (isGet, isPost) and paths
- CORS: Handled in sendJsonResponse headers and an explicit OPTIONS handler
- Static Serving: mg_http_serve_dir serving frontend/dist
- Error Handling: 404 fallback, explicit 401s, 400s

## 3. Surviving Modules Audit

### alert.h
**Function:** `initAlertsData`
- **Parameters:** ``
- **Return Value:** `void`
- **Purpose:** Business logic for initAlertsData
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `generateAlert`
- **Parameters:** `const char *type, int referenceId, const char *message`
- **Return Value:** `void`
- **Purpose:** Business logic for generateAlert
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `displayActiveAlerts`
- **Parameters:** ``
- **Return Value:** `void`
- **Purpose:** Business logic for displayActiveAlerts
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `resolveAlert`
- **Parameters:** `int alertId`
- **Return Value:** `void`
- **Purpose:** Business logic for resolveAlert
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

### auth.h
**Function:** `loginMenu`
- **Parameters:** ``
- **Return Value:** `void`
- **Purpose:** Business logic for loginMenu
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `handleAdminMenu`
- **Parameters:** ``
- **Return Value:** `void`
- **Purpose:** Business logic for handleAdminMenu
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `handleManagerMenu`
- **Parameters:** ``
- **Return Value:** `void`
- **Purpose:** Business logic for handleManagerMenu
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `handleOperatorMenu`
- **Parameters:** ``
- **Return Value:** `void`
- **Purpose:** Business logic for handleOperatorMenu
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `handleResidentMenu`
- **Parameters:** ``
- **Return Value:** `void`
- **Purpose:** Business logic for handleResidentMenu
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `logout`
- **Parameters:** ``
- **Return Value:** `void`
- **Purpose:** Business logic for logout
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

### bin.h
**Function:** `initBinsData`
- **Parameters:** ``
- **Return Value:** `void`
- **Purpose:** Business logic for initBinsData
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `addBin`
- **Parameters:** `const Bin *b`
- **Return Value:** `int`
- **Purpose:** Business logic for addBin
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `getBinById`
- **Parameters:** `int binId, Bin *b`
- **Return Value:** `int`
- **Purpose:** Business logic for retrieving BinById
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `updateBin`
- **Parameters:** `const Bin *b`
- **Return Value:** `int`
- **Purpose:** Business logic for updating Bin
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `deleteBin`
- **Parameters:** `int binId`
- **Return Value:** `int`
- **Purpose:** Business logic for deleteBin
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `displayAllBins`
- **Parameters:** ``
- **Return Value:** `void`
- **Purpose:** Business logic for displayAllBins
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `addWasteToBin`
- **Parameters:** `int binId, float quantity, const char *wasteType`
- **Return Value:** `void`
- **Purpose:** Business logic for addWasteToBin
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

### collection.h
**Function:** `initCollectionsData`
- **Parameters:** ``
- **Return Value:** `void`
- **Purpose:** Business logic for initCollectionsData
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `addCollectionRequest`
- **Parameters:** `CollectionRequest *req`
- **Return Value:** `int`
- **Purpose:** Business logic for addCollectionRequest
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `getCollectionRequestById`
- **Parameters:** `int reqId, CollectionRequest *req`
- **Return Value:** `int`
- **Purpose:** Business logic for retrieving CollectionRequestById
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `updateCollectionRequest`
- **Parameters:** `const CollectionRequest *req`
- **Return Value:** `int`
- **Purpose:** Business logic for updating CollectionRequest
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `getCollectionsByResidentId`
- **Parameters:** `int residentId, CollectionRequest *list, int maxCount`
- **Return Value:** `int`
- **Purpose:** Business logic for retrieving CollectionsByResidentId
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `getCollectionsByHubId`
- **Parameters:** `int hubId, CollectionRequest *list, int maxCount`
- **Return Value:** `int`
- **Purpose:** Business logic for retrieving CollectionsByHubId
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `getCollectionsByCleanerId`
- **Parameters:** `int cleanerId, CollectionRequest *list, int maxCount`
- **Return Value:** `int`
- **Purpose:** Business logic for retrieving CollectionsByCleanerId
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `getAllCollectionRequests`
- **Parameters:** `CollectionRequest *list, int maxCount`
- **Return Value:** `int`
- **Purpose:** Business logic for retrieving AllCollectionRequests
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `isValidStateTransition`
- **Parameters:** `CollectionStatus from, CollectionStatus to`
- **Return Value:** `int`
- **Purpose:** Business logic for isValidStateTransition
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `collectionStatusToStr`
- **Parameters:** `CollectionStatus s`
- **Return Value:** `const char*`
- **Purpose:** Business logic for collectionStatusToStr
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `strToCollectionStatus`
- **Parameters:** `const char* str`
- **Return Value:** `CollectionStatus`
- **Purpose:** Business logic for strToCollectionStatus
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `calculateCollectionPriorityScore`
- **Parameters:** `const char *urgency, const char *wasteType, float estimatedWeightKg, int waitingDays, int missedHistoryCount, char *outLevel, size_t levelLen`
- **Return Value:** `int`
- **Purpose:** Business logic for calculateCollectionPriorityScore
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `calculateDistanceMeters`
- **Parameters:** `double lat1, double lon1, double lat2, double lon2`
- **Return Value:** `double`
- **Purpose:** Business logic for calculateDistanceMeters
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `isCleanerWithinProximity`
- **Parameters:** `double cleanerLat, double cleanerLng, double reqLat, double reqLng, double thresholdMeters`
- **Return Value:** `int`
- **Purpose:** Business logic for isCleanerWithinProximity
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `canAssignCleanerToCollection`
- **Parameters:** `int cleanerId, int hubId, float *currentWorkloadKg, char *errMsg, size_t errLen`
- **Return Value:** `int`
- **Purpose:** Business logic for canAssignCleanerToCollection
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `processHubDeposit`
- **Parameters:** `int collectionId, int cleanerId, const char *scannedQr, float depositedWeightKg, const char *varianceReason, int emergencyOverride, char *errMsg, size_t errLen`
- **Return Value:** `int`
- **Purpose:** Business logic for processHubDeposit
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

### config.h
### facility.h
**Function:** `initFacilityData`
- **Parameters:** ``
- **Return Value:** `void`
- **Purpose:** Business logic for initFacilityData
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `addFacility`
- **Parameters:** `TransportFacility *f`
- **Return Value:** `int`
- **Purpose:** Business logic for addFacility
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `getFacilityById`
- **Parameters:** `int facilityId, TransportFacility *f`
- **Return Value:** `int`
- **Purpose:** Business logic for retrieving FacilityById
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `updateFacility`
- **Parameters:** `const TransportFacility *f`
- **Return Value:** `int`
- **Purpose:** Business logic for updating Facility
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `getAllFacilities`
- **Parameters:** `TransportFacility *arr, int maxCount`
- **Return Value:** `int`
- **Purpose:** Business logic for retrieving AllFacilities
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `getActiveFacilities`
- **Parameters:** `TransportFacility *arr, int maxCount`
- **Return Value:** `int`
- **Purpose:** Business logic for retrieving ActiveFacilities
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

### hub.h
**Function:** `initHubData`
- **Parameters:** ``
- **Return Value:** `void`
- **Purpose:** Business logic for initHubData
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `addHub`
- **Parameters:** `LocalHub *hub`
- **Return Value:** `int`
- **Purpose:** Business logic for addHub
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `updateHub`
- **Parameters:** `const LocalHub *hub`
- **Return Value:** `int`
- **Purpose:** Business logic for updating Hub
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `getHubById`
- **Parameters:** `int hubId, LocalHub *hub`
- **Return Value:** `int`
- **Purpose:** Business logic for retrieving HubById
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `getHubByManagerId`
- **Parameters:** `int managerId, LocalHub *hub`
- **Return Value:** `int`
- **Purpose:** Business logic for retrieving HubByManagerId
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `getAllHubs`
- **Parameters:** `LocalHub *hubs, int maxCount`
- **Return Value:** `int`
- **Purpose:** Business logic for retrieving AllHubs
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `calculateHubCurrentLoad`
- **Parameters:** `int hubId`
- **Return Value:** `float`
- **Purpose:** Business logic for calculateHubCurrentLoad
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `deriveHubStatus`
- **Parameters:** `float currentLoad, float maxCapacity, float warningPercent, float criticalPercent`
- **Return Value:** `HubStatus`
- **Purpose:** Business logic for deriveHubStatus
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `hubStatusToStr`
- **Parameters:** `HubStatus status`
- **Return Value:** `const char*`
- **Purpose:** Business logic for hubStatusToStr
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `recordHubTransaction`
- **Parameters:** `HubInventoryTransaction *trans, int emergencyOverride, int actorUserId, char *errorMsg, size_t errLen`
- **Return Value:** `int`
- **Purpose:** Business logic for recordHubTransaction
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `getHubTransactions`
- **Parameters:** `int hubId, HubInventoryTransaction *trans, int maxCount`
- **Return Value:** `int`
- **Purpose:** Business logic for retrieving HubTransactions
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `getHubPerformance`
- **Parameters:** `int hubId, float *todayInbound, float *todayOutbound, int *activeCleaners`
- **Return Value:** `void`
- **Purpose:** Business logic for retrieving HubPerformance
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

### incident.h
**Function:** `initIncidentsData`
- **Parameters:** ``
- **Return Value:** `void`
- **Purpose:** Business logic for initIncidentsData
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `addIncident`
- **Parameters:** `Incident *inc`
- **Return Value:** `int`
- **Purpose:** Business logic for addIncident
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `getIncidentById`
- **Parameters:** `int incId, Incident *inc`
- **Return Value:** `int`
- **Purpose:** Business logic for retrieving IncidentById
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `getAllIncidents`
- **Parameters:** `Incident *list, int maxCount`
- **Return Value:** `int`
- **Purpose:** Business logic for retrieving AllIncidents
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `getIncidentsByCollectionId`
- **Parameters:** `int collectionId, Incident *list, int maxCount`
- **Return Value:** `int`
- **Purpose:** Business logic for retrieving IncidentsByCollectionId
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `resolveIncident`
- **Parameters:** `int incId, const char *resolutionNote`
- **Return Value:** `int`
- **Purpose:** Business logic for resolveIncident
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

### map_service.h
**Function:** `calculateDistanceKm`
- **Parameters:** `double lat1, double lon1, double lat2, double lon2`
- **Return Value:** `float`
- **Purpose:** Business logic for calculateDistanceKm
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `isWithinGeofence`
- **Parameters:** `double lat, double lon, double targetLat, double targetLon, float radiusMeters`
- **Return Value:** `int`
- **Purpose:** Business logic for isWithinGeofence
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `validateCoordinates`
- **Parameters:** `double lat, double lon`
- **Return Value:** `int`
- **Purpose:** Business logic for validateCoordinates
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `assignHubToCollection`
- **Parameters:** `double lat, double lon, const char* serviceZone`
- **Return Value:** `int`
- **Purpose:** Business logic for assignHubToCollection
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `findNearestHubs`
- **Parameters:** `double lat, double lon, LocalHub* outHubs, int maxCount`
- **Return Value:** `int`
- **Purpose:** Business logic for findNearestHubs
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `initMapService`
- **Parameters:** ``
- **Return Value:** `void`
- **Purpose:** Business logic for initMapService
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `createRoutePlan`
- **Parameters:** `RoutePlan *plan`
- **Return Value:** `int`
- **Purpose:** Business logic for creating RoutePlan
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `getRoutePlansByUser`
- **Parameters:** `int userId, RoutePlan *arr, int maxCount`
- **Return Value:** `int`
- **Purpose:** Business logic for retrieving RoutePlansByUser
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `getRoutePlanById`
- **Parameters:** `int routeId, RoutePlan *plan`
- **Return Value:** `int`
- **Purpose:** Business logic for retrieving RoutePlanById
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `optimizeCollectionRoute`
- **Parameters:** `int hubId, int cleanerId, int* collectionIds, int count`
- **Return Value:** `RoutePlan`
- **Purpose:** Business logic for optimizeCollectionRoute
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `createTransferRoute`
- **Parameters:** `int hubId, int facilityId, int driverId`
- **Return Value:** `RoutePlan`
- **Purpose:** Business logic for creating TransferRoute
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

### recycling.h
**Function:** `initRecyclingData`
- **Parameters:** ``
- **Return Value:** `void`
- **Purpose:** Business logic for initRecyclingData
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `processCollectionForRecycling`
- **Parameters:** `int collectionId, const char *wasteType, float quantity, int residentId`
- **Return Value:** `void`
- **Purpose:** Business logic for processCollectionForRecycling
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `displayRecyclingStats`
- **Parameters:** ``
- **Return Value:** `void`
- **Purpose:** Business logic for displayRecyclingStats
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `initRecyclingPhase5`
- **Parameters:** ``
- **Return Value:** `int`
- **Purpose:** Business logic for initRecyclingPhase5
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `receiveTransferAtFacility`
- **Parameters:** `int transferId, int facilityId, int operatorId`
- **Return Value:** `int`
- **Purpose:** Business logic for receiveTransferAtFacility
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `recordReceivedWeight`
- **Parameters:** `int transferId, float receivedWeightKg, const char* measurementSource, int operatorId, float varianceThresholdPct`
- **Return Value:** `int`
- **Purpose:** Business logic for recordReceivedWeight
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `processTransferDecision`
- **Parameters:** `int transferId, const char* decision, const char* reason, int operatorId`
- **Return Value:** `int`
- **Purpose:** Business logic for processTransferDecision
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `createRecyclingBatch`
- **Parameters:** `RecyclingBatch *batch`
- **Return Value:** `int`
- **Purpose:** Business logic for creating RecyclingBatch
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `getBatchById`
- **Parameters:** `int batchId, RecyclingBatch *batch`
- **Return Value:** `int`
- **Purpose:** Business logic for retrieving BatchById
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `updateBatch`
- **Parameters:** `const RecyclingBatch *batch`
- **Return Value:** `int`
- **Purpose:** Business logic for updating Batch
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `getAllBatches`
- **Parameters:** `RecyclingBatch *list, int maxCount`
- **Return Value:** `int`
- **Purpose:** Business logic for retrieving AllBatches
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `getBatchesByFacility`
- **Parameters:** `int facilityId, RecyclingBatch *list, int maxCount`
- **Return Value:** `int`
- **Purpose:** Business logic for retrieving BatchesByFacility
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `addWasteClassification`
- **Parameters:** `WasteClassification *wc`
- **Return Value:** `int`
- **Purpose:** Business logic for addWasteClassification
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `getBatchesClassifications`
- **Parameters:** `int batchId, WasteClassification *list, int maxCount`
- **Return Value:** `int`
- **Purpose:** Business logic for retrieving BatchesClassifications
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `addSegregationRecord`
- **Parameters:** `SegregationRecord *sr`
- **Return Value:** `int`
- **Purpose:** Business logic for addSegregationRecord
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `addProcessingRecord`
- **Parameters:** `ProcessingRecord *pr`
- **Return Value:** `int`
- **Purpose:** Business logic for addProcessingRecord
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `addRecoveryRecord`
- **Parameters:** `RecoveryRecord *rr`
- **Return Value:** `int`
- **Purpose:** Business logic for addRecoveryRecord
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `addResidualRecord`
- **Parameters:** `ResidualRecord *rr`
- **Return Value:** `int`
- **Purpose:** Business logic for addResidualRecord
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `completeRecyclingBatch`
- **Parameters:** `int batchId, int operatorId`
- **Return Value:** `int`
- **Purpose:** Business logic for completeRecyclingBatch
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

### report.h
**Function:** `displayOverallDashboard`
- **Parameters:** ``
- **Return Value:** `void`
- **Purpose:** Business logic for displayOverallDashboard
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `generateWasteReport`
- **Parameters:** ``
- **Return Value:** `void`
- **Purpose:** Business logic for generateWasteReport
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `backupData`
- **Parameters:** ``
- **Return Value:** `void`
- **Purpose:** Business logic for backupData
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `restoreData`
- **Parameters:** ``
- **Return Value:** `void`
- **Purpose:** Business logic for restoreData
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

### resident.h
**Function:** `initResidentsData`
- **Parameters:** ``
- **Return Value:** `void`
- **Purpose:** Business logic for initResidentsData
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `addResident`
- **Parameters:** `const Resident *res`
- **Return Value:** `int`
- **Purpose:** Business logic for addResident
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `getResidentById`
- **Parameters:** `int resId, Resident *res`
- **Return Value:** `int`
- **Purpose:** Business logic for retrieving ResidentById
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `getResidentByUserId`
- **Parameters:** `int userId, Resident *res`
- **Return Value:** `int`
- **Purpose:** Business logic for retrieving ResidentByUserId
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `updateResident`
- **Parameters:** `const Resident *res`
- **Return Value:** `int`
- **Purpose:** Business logic for updating Resident
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `deleteResident`
- **Parameters:** `int resId`
- **Return Value:** `int`
- **Purpose:** Business logic for deleteResident
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `displayAllResidents`
- **Parameters:** ``
- **Return Value:** `void`
- **Purpose:** Business logic for displayAllResidents
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

### reward.h
**Function:** `addEcoPoints`
- **Parameters:** `int residentId, int points`
- **Return Value:** `void`
- **Purpose:** Business logic for addEcoPoints
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `deductEcoPoints`
- **Parameters:** `int residentId, int points`
- **Return Value:** `void`
- **Purpose:** Business logic for deductEcoPoints
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `viewEcoLeaderboard`
- **Parameters:** ``
- **Return Value:** `void`
- **Purpose:** Business logic for viewEcoLeaderboard
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `calculateRewardPoints`
- **Parameters:** `const char *wasteType`
- **Return Value:** `int`
- **Purpose:** Business logic for calculateRewardPoints
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

### route.h
**Function:** `initRouteData`
- **Parameters:** ``
- **Return Value:** `void`
- **Purpose:** Business logic for initRouteData
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `addRoad`
- **Parameters:** `int fromId, int toId, int distance`
- **Return Value:** `void`
- **Purpose:** Business logic for addRoad
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `displayMap`
- **Parameters:** ``
- **Return Value:** `void`
- **Purpose:** Business logic for displayMap
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `findShortestPath`
- **Parameters:** `int sourceId, int destId`
- **Return Value:** `void`
- **Purpose:** Business logic for findShortestPath
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

### search_sort.h
**Function:** `sortWasteByQuantityDesc`
- **Parameters:** ``
- **Return Value:** `void`
- **Purpose:** Business logic for sortWasteByQuantityDesc
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `sortBinsByFillLevelDesc`
- **Parameters:** ``
- **Return Value:** `void`
- **Purpose:** Business logic for sortBinsByFillLevelDesc
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `binarySearchUserById`
- **Parameters:** `int userId`
- **Return Value:** `int`
- **Purpose:** Business logic for binarySearchUserById
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

### server.h
**Function:** `startServer`
- **Parameters:** `const char *port`
- **Return Value:** `void`
- **Purpose:** Business logic for startServer
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

### transfer.h
**Function:** `initTransferData`
- **Parameters:** ``
- **Return Value:** `void`
- **Purpose:** Business logic for initTransferData
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `addTransfer`
- **Parameters:** `WasteTransfer *t`
- **Return Value:** `int`
- **Purpose:** Business logic for addTransfer
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `getTransferById`
- **Parameters:** `int transferId, WasteTransfer *t`
- **Return Value:** `int`
- **Purpose:** Business logic for retrieving TransferById
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `updateTransfer`
- **Parameters:** `const WasteTransfer *t`
- **Return Value:** `int`
- **Purpose:** Business logic for updating Transfer
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `getAllTransfers`
- **Parameters:** `WasteTransfer *arr, int maxCount`
- **Return Value:** `int`
- **Purpose:** Business logic for retrieving AllTransfers
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `getTransfersByHub`
- **Parameters:** `int hubId, WasteTransfer *arr, int maxCount`
- **Return Value:** `int`
- **Purpose:** Business logic for retrieving TransfersByHub
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `getTransfersByDriver`
- **Parameters:** `int driverId, WasteTransfer *arr, int maxCount`
- **Return Value:** `int`
- **Purpose:** Business logic for retrieving TransfersByDriver
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `getActiveTransferForDriver`
- **Parameters:** `int driverId, WasteTransfer *out`
- **Return Value:** `int`
- **Purpose:** Business logic for retrieving ActiveTransferForDriver
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `isValidTransferTransition`
- **Parameters:** `TransferStatus from, TransferStatus to`
- **Return Value:** `int`
- **Purpose:** Business logic for isValidTransferTransition
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `transferStatusToStr`
- **Parameters:** `TransferStatus s`
- **Return Value:** `const char*`
- **Purpose:** Business logic for transferStatusToStr
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `transferStatusFromStr`
- **Parameters:** `const char *s`
- **Return Value:** `TransferStatus`
- **Purpose:** Business logic for transferStatusFromStr
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `initDriverProfileData`
- **Parameters:** ``
- **Return Value:** `void`
- **Purpose:** Business logic for initDriverProfileData
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `addOrUpdateDriverProfile`
- **Parameters:** `DriverProfile *dp`
- **Return Value:** `int`
- **Purpose:** Business logic for addOrUpdateDriverProfile
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `getDriverProfile`
- **Parameters:** `int userId, DriverProfile *dp`
- **Return Value:** `int`
- **Purpose:** Business logic for retrieving DriverProfile
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `getAllDriverProfiles`
- **Parameters:** `DriverProfile *arr, int maxCount`
- **Return Value:** `int`
- **Purpose:** Business logic for retrieving AllDriverProfiles
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `getAvailableDriverProfiles`
- **Parameters:** `DriverProfile *arr, int maxCount`
- **Return Value:** `int`
- **Purpose:** Business logic for retrieving AvailableDriverProfiles
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `setDriverAvailability`
- **Parameters:** `int userId, const char *availability, int transferId`
- **Return Value:** `int`
- **Purpose:** Business logic for setDriverAvailability
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `calculateLoadVariancePct`
- **Parameters:** `float planned, float actual`
- **Return Value:** `float`
- **Purpose:** Business logic for calculateLoadVariancePct
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `calculateDeliveryVarianceKg`
- **Parameters:** `float loaded, float delivered`
- **Return Value:** `float`
- **Purpose:** Business logic for calculateDeliveryVarianceKg
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `validateTransferForCreation`
- **Parameters:** `const WasteTransfer *t, float hubCurrentLoad, float vehicleCapacity, char *errMsg, size_t errLen`
- **Return Value:** `int`
- **Purpose:** Business logic for validateTransferForCreation
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `sortTransfersByPriority`
- **Parameters:** `WasteTransfer *arr, int count`
- **Return Value:** `void`
- **Purpose:** Business logic for sortTransfersByPriority
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

### types.h
### user.h
**Function:** `initUsersData`
- **Parameters:** ``
- **Return Value:** `void`
- **Purpose:** Business logic for initUsersData
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `hashPassword`
- **Parameters:** `const char* plain, char* hashed`
- **Return Value:** `void`
- **Purpose:** Business logic for hashPassword
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `addUser`
- **Parameters:** `const User *newUser`
- **Return Value:** `int`
- **Purpose:** Business logic for addUser
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `getUserByUsername`
- **Parameters:** `const char *username, User *foundUser`
- **Return Value:** `int`
- **Purpose:** Business logic for retrieving UserByUsername
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `getUserById`
- **Parameters:** `int userId, User *foundUser`
- **Return Value:** `int`
- **Purpose:** Business logic for retrieving UserById
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `updateUser`
- **Parameters:** `const User *updatedUser`
- **Return Value:** `int`
- **Purpose:** Business logic for updating User
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `deleteUser`
- **Parameters:** `int userId`
- **Return Value:** `int`
- **Purpose:** Business logic for deleteUser
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `displayAllUsers`
- **Parameters:** ``
- **Return Value:** `void`
- **Purpose:** Business logic for displayAllUsers
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `validateLogin`
- **Parameters:** `const char *username, const char *password, User *loggedInUser`
- **Return Value:** `int`
- **Purpose:** Business logic for validateLogin
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `lockAccount`
- **Parameters:** `const char *username`
- **Return Value:** `void`
- **Purpose:** Business logic for lockAccount
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `resetFailedAttempts`
- **Parameters:** `const char *username`
- **Return Value:** `void`
- **Purpose:** Business logic for resetFailedAttempts
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

### utils.h
**Function:** `clearScreen`
- **Parameters:** ``
- **Return Value:** `void`
- **Purpose:** Business logic for clearScreen
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `pauseScreen`
- **Parameters:** ``
- **Return Value:** `void`
- **Purpose:** Business logic for pauseScreen
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `printHeader`
- **Parameters:** `const char *title`
- **Return Value:** `void`
- **Purpose:** Business logic for printHeader
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `flushInputBuffer`
- **Parameters:** ``
- **Return Value:** `void`
- **Purpose:** Business logic for flushInputBuffer
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `getSafeString`
- **Parameters:** `char *buffer, int size`
- **Return Value:** `void`
- **Purpose:** Business logic for retrieving SafeString
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `getSafeInt`
- **Parameters:** `int *value`
- **Return Value:** `int`
- **Purpose:** Business logic for retrieving SafeInt
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `getSafeFloat`
- **Parameters:** `float *value`
- **Return Value:** `int`
- **Purpose:** Business logic for retrieving SafeFloat
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `logAudit`
- **Parameters:** `int actorId, const char* action, int targetId`
- **Return Value:** `void`
- **Purpose:** Business logic for logAudit
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `getCurrentTimestamp`
- **Parameters:** `char *buf, size_t len`
- **Return Value:** `void`
- **Purpose:** Business logic for retrieving CurrentTimestamp
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `getTodayDatePrefix`
- **Parameters:** `char *buf, size_t len`
- **Return Value:** `void`
- **Purpose:** Business logic for retrieving TodayDatePrefix
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

### vehicle.h
**Function:** `initVehiclesData`
- **Parameters:** ``
- **Return Value:** `void`
- **Purpose:** Business logic for initVehiclesData
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `addVehicle`
- **Parameters:** `Vehicle *v`
- **Return Value:** `int`
- **Purpose:** Business logic for addVehicle
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `getVehicleById`
- **Parameters:** `int vehicleId, Vehicle *v`
- **Return Value:** `int`
- **Purpose:** Business logic for retrieving VehicleById
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `updateVehicle`
- **Parameters:** `const Vehicle *v`
- **Return Value:** `int`
- **Purpose:** Business logic for updating Vehicle
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `deleteVehicle`
- **Parameters:** `int vehicleId`
- **Return Value:** `int`
- **Purpose:** Business logic for deleteVehicle
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `getAllVehicles`
- **Parameters:** `Vehicle *arr, int maxCount`
- **Return Value:** `int`
- **Purpose:** Business logic for retrieving AllVehicles
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `getVehiclesByHub`
- **Parameters:** `int hubId, Vehicle *arr, int maxCount`
- **Return Value:** `int`
- **Purpose:** Business logic for retrieving VehiclesByHub
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `getAvailableVehicles`
- **Parameters:** `int hubId, Vehicle *arr, int maxCount`
- **Return Value:** `int`
- **Purpose:** Business logic for retrieving AvailableVehicles
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `isVehicleCompliant`
- **Parameters:** `const Vehicle *v, char *errMsg, size_t errLen`
- **Return Value:** `int`
- **Purpose:** Business logic for isVehicleCompliant
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `vehicleStatusToStrV2`
- **Parameters:** `VehicleStatus s`
- **Return Value:** `const char*`
- **Purpose:** Business logic for vehicleStatusToStrV2
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `vehicleStatusFromStr`
- **Parameters:** `const char *s`
- **Return Value:** `VehicleStatus`
- **Purpose:** Business logic for vehicleStatusFromStr
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `displayAllVehicles`
- **Parameters:** ``
- **Return Value:** `void`
- **Purpose:** Business logic for displayAllVehicles
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

### waste.h
**Function:** `initWasteData`
- **Parameters:** ``
- **Return Value:** `void`
- **Purpose:** Business logic for initWasteData
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `addWaste`
- **Parameters:** `const Waste *w`
- **Return Value:** `int`
- **Purpose:** Business logic for addWaste
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `getWasteById`
- **Parameters:** `int wasteId, Waste *w`
- **Return Value:** `int`
- **Purpose:** Business logic for retrieving WasteById
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `updateWaste`
- **Parameters:** `const Waste *w`
- **Return Value:** `int`
- **Purpose:** Business logic for updating Waste
- **Required Role:** VARIES
- **Data Persistence:** Filesystem (.dat)

**Function:** `deleteWaste`
- **Parameters:** `int wasteId`
- **Return Value:** `int`
- **Purpose:** Business logic for deleteWaste
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `displayAllWaste`
- **Parameters:** ``
- **Return Value:** `void`
- **Purpose:** Business logic for displayAllWaste
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

**Function:** `displayWasteByResident`
- **Parameters:** `int residentId`
- **Return Value:** `void`
- **Purpose:** Business logic for displayWasteByResident
- **Required Role:** VARIES
- **Data Persistence:** In-memory/Filesystem

