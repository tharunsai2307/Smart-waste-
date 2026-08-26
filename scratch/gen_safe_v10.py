import re
import subprocess

result = subprocess.run(["git", "show", "HEAD:include/types.h"], capture_output=True, text=True)
original_types = result.stdout

content = original_types

# Rename structs
targets = [
    "User", "Resident", "Waste", "Bin", "Vehicle", "CollectionRequest", "Incident",
    "LocalHub", "WasteTransfer", "TransportFacility", "RecyclingBatch",
    "GeoLocation", "ServiceArea", "VehicleLocation", "RouteRequest", "Route",
    "VehicleInspection", "QREvent", "Alert", "RoutePlan", "AuditLog",
    "AppContext", "IncidentTimelineEntry", "NotificationPreference", "RecyclingRecord",
    "HubInventoryTransaction", "WasteClassification", "SegregationRecord", 
    "ProcessingRecord", "RecoveryRecord", "ResidualRecord", "DriverProfile",
    "RouteStop", "RouteEngineStop", "RouteEvent", "Location"
]

for target in targets:
    content = re.sub(r'\b' + target + r'\b', target + '_v10', content)

# Rename enums
enums = [
    "UserRole", "BinStatus", "VehicleStatus", "CollectionStatus", "HubStatus",
    "HubTransactionType", "TransferStatus", "BatchStatus", "LocationType",
    "RouteStatus", "StopStatus", "VehicleInspectionStatus", "QREventResult"
]
for e in enums:
    content = re.sub(r'\b' + e + r'\b', e + '_v10', content)

# Rename enum values
enum_values = [
    "ROLE_ADMIN", "ROLE_LOCAL_HUB_MANAGER", "ROLE_CLEANER", "ROLE_DRIVER", "ROLE_RECYCLING_MANAGER", "ROLE_RESIDENT",
    "BIN_NORMAL", "BIN_WARNING", "BIN_CRITICAL", "BIN_OVERFLOW",
    "VEHICLE_AVAILABLE", "VEHICLE_ASSIGNED", "VEHICLE_LOADING", "VEHICLE_ON_ROUTE", "VEHICLE_FULL", "VEHICLE_MAINTENANCE", "VEHICLE_OUT_OF_SERVICE", "VEHICLE_RETIRED",
    "COLLECTION_REQUESTED", "COLLECTION_UNDER_REVIEW", "COLLECTION_ASSIGNED", "COLLECTION_EN_ROUTE", "COLLECTION_ARRIVED", "COLLECTION_COLLECTING", "COLLECTION_COLLECTED", "COLLECTION_DEPOSIT_PENDING", "COLLECTION_DEPOSITED_AT_HUB", "COLLECTION_COMPLETED", "COLLECTION_CANCELLED", "COLLECTION_MISSED", "COLLECTION_REJECTED", "COLLECTION_RESCHEDULED",
    "HUB_NORMAL", "HUB_WARNING", "HUB_CRITICAL", "HUB_AT_CAPACITY", "HUB_TEMPORARILY_CLOSED",
    "TRANS_INBOUND_COLLECTION", "TRANS_OUTBOUND_TRANSFER", "TRANS_ADJUSTMENT", "TRANS_CORRECTION",
    "TRANSFER_REQUESTED", "TRANSFER_APPROVED", "TRANSFER_DRIVER_ASSIGNED", "TRANSFER_VEHICLE_ASSIGNED", "TRANSFER_DRIVER_CHECKED_IN", "TRANSFER_LOADING", "TRANSFER_LOADED", "TRANSFER_DEPARTED", "TRANSFER_EN_ROUTE", "TRANSFER_ARRIVED", "TRANSFER_RECEIVING", "TRANSFER_WEIGHT_VERIFICATION", "TRANSFER_ACCEPTED", "TRANSFER_PARTIALLY_ACCEPTED", "TRANSFER_QUARANTINED", "TRANSFER_UNLOADING", "TRANSFER_DELIVERED", "TRANSFER_COMPLETED", "TRANSFER_CANCELLED", "TRANSFER_REJECTED", "TRANSFER_FAILED", "TRANSFER_DELAYED",
    "BATCH_CREATED", "BATCH_RECEIVED", "BATCH_CLASSIFYING", "BATCH_CLASSIFIED", "BATCH_PROCESSING", "BATCH_PROCESSED", "BATCH_RECOVERED", "BATCH_COMPLETED", "BATCH_QUARANTINED", "BATCH_REJECTED", "BATCH_CANCELLED",
    "LOCATION_RESIDENT", "LOCATION_LOCAL_HUB", "LOCATION_RECYCLING_FACILITY", "LOCATION_DEPOT", "LOCATION_VEHICLE", "LOCATION_COLLECTION_POINT", "LOCATION_SERVICE_AREA",
    "ROUTE_PLANNED", "ROUTE_ASSIGNED", "ROUTE_ACCEPTED", "ROUTE_EN_ROUTE", "ROUTE_ARRIVED", "ROUTE_COLLECTING", "ROUTE_COMPLETED", "ROUTE_DECLINED", "ROUTE_CANCELLED", "ROUTE_FAILED", "ROUTE_RESCHEDULED", "ROUTE_PRE_TRIP_CHECK", "ROUTE_READY", "ROUTE_PAUSED", "ROUTE_RETURNING", "ROUTE_AT_DESTINATION", "ROUTE_LOAD_VERIFIED", "ROUTE_ABORTED", "ROUTE_VEHICLE_BREAKDOWN", "ROUTE_DRIVER_UNAVAILABLE", "ROUTE_ACCESS_BLOCKED", "ROUTE_EMERGENCY",
    "STOP_PLANNED", "STOP_EN_ROUTE", "STOP_ARRIVED", "STOP_SERVICING", "STOP_COMPLETED", "STOP_SKIPPED", "STOP_FAILED", "STOP_RESCHEDULED",
    "INSPECT_PASS", "INSPECT_FAIL", "INSPECT_REQUIRES_ATTENTION",
    "QR_SUCCESS", "QR_FAILED"
]
for ev in enum_values:
    content = re.sub(r'\b' + ev + r'\b', ev + '_V10', content)

content = content.replace("TYPES_H", "TYPES_V10_H")
with open("include/types_v10.h", "w", encoding="utf-8") as f:
    f.write(content)
print("Safe types_v10.h generated.")
