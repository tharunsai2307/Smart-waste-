import re

types_path = r"C:\Users\Hp\.gemini\antigravity-ide\scratch\smart-waste-management\frontend\src\types\index.ts"
with open(types_path, "r", encoding="utf-8") as f:
    content = f.read()

phase9_types = """
// ─────────────────────────────────────────────────────────────
// PHASE 9: MUNICIPAL ANALYTICS & INTELLIGENCE TYPES
// ─────────────────────────────────────────────────────────────

export interface AnalyticsSummary {
  totalResidents: number;
  activeResidents: number;
  totalCollectionRequests: number;
  completedCollections: number;
  pendingCollections: number;
  missedCollections: number;
  cancelledCollections: number;
  totalWasteCollectedKg: number;
  totalWasteTransferredKg: number;
  totalWasteProcessedKg: number;
  totalRecoveredKg: number;
  totalResidualKg: number;
  recyclingRecoveryRate: number;
  totalVehicles: number;
  activeVehicles: number;
  totalRoutes: number;
  activeRoutes: number;
  completedRoutes: number;
  totalHubs: number;
  activeHubs: number;
  criticalHubs: number;
  totalIncidents: number;
  openIncidents: number;
  totalQrScans: number;
  successfulQrScans: number;
  qrComplianceRate: number;
  operationalEfficiencyIndex: number;
}

export interface CollectionAnalytics {
  totalRequests: number;
  completedRequests: number;
  pendingRequests: number;
  assignedRequests: number;
  enRouteRequests: number;
  collectingRequests: number;
  missedRequests: number;
  cancelledRequests: number;
  rescheduledRequests: number;
  totalCollectedKg: number;
  averageCollectionWeightKg: number;
  averageCompletionTimeMin: number;
  collectionSuccessRate: number;
  missedCollectionRate: number;
  priorities: {
    low: number;
    normal: number;
    high: number;
    urgent: number;
  };
}

export interface HubAnalyticsItem {
  hubId: number;
  hubCode: string;
  name: string;
  maximumCapacityKg: number;
  currentInventoryKg: number;
  availableCapacityKg: number;
  utilizationPercentage: number;
  inboundKg: number;
  outboundKg: number;
  activeCleaners: number;
  pendingCollections: number;
  pendingTransfers: number;
  status: number;
  alertCount: number;
}

export interface FleetAnalytics {
  totalVehicles: number;
  activeVehicles: number;
  inactiveVehicles: number;
  underMaintenance: number;
  availableVehicles: number;
  assignedVehicles: number;
  onRouteVehicles: number;
  atCapacityVehicles: number;
  totalFleetCapacityKg: number;
  currentFleetLoadKg: number;
  fleetUtilizationPercentage: number;
  inspectionPasses: number;
  inspectionFailures: number;
  vehicles: VehicleAnalyticsItem[];
}

export interface VehicleAnalyticsItem {
  vehicleId: number;
  registrationNumber: string;
  vehicleType: string;
  capacityKg: number;
  currentLoadKg: number;
  utilizationPercentage: number;
  driverId: number;
  status: number;
  lastInspectionDate: string;
  lastInspectionStatus: number;
}

export interface RouteAnalytics {
  totalRoutes: number;
  plannedRoutes: number;
  dispatchedRoutes: number;
  acceptedRoutes: number;
  activeRoutes: number;
  completedRoutes: number;
  cancelledRoutes: number;
  averageRouteDurationMin: number;
  averageStopsPerRoute: number;
  totalStops: number;
  completedStops: number;
  pendingStops: number;
  routeUtilizationPercentage: number;
  routes: RouteAnalyticsItem[];
}

export interface RouteAnalyticsItem {
  routeId: number;
  routeType: string;
  driverId: number;
  vehicleId: number;
  originId: number;
  destinationId: number;
  stopCount: number;
  completedStopCount: number;
  totalWeightKg: number;
  status: number;
  durationMinutes: number;
}

export interface RecyclingAnalytics {
  totalInputKg: number;
  totalClassifiedKg: number;
  totalSegregatedKg: number;
  totalProcessedKg: number;
  totalRecoveredKg: number;
  totalResidualKg: number;
  recoveryRate: number;
  residualRate: number;
  processingLossKg: number;
  processingLossRate: number;
  totalBatches: number;
  activeBatches: number;
  completedBatches: number;
}

export interface WasteTypeAnalyticsItem {
  wasteType: string;
  collectedKg: number;
  processedKg: number;
  recoveredKg: number;
  residualKg: number;
  percentageOfTotal: number;
}

export interface DriverPerformanceItem {
  driverId: number;
  name: string;
  employeeCode: string;
  assignedRoutes: number;
  acceptedRoutes: number;
  completedRoutes: number;
  cancelledRoutes: number;
  completedStops: number;
  missedStops: number;
  totalCollectedKg: number;
  averageRouteCompletionTimeMin: number;
  weightVarianceIncidents: number;
  qrScanFailures: number;
  inspectionFailures: number;
  performanceScore: number;
}

export interface CleanerPerformanceItem {
  cleanerId: number;
  name: string;
  assignedHubId: number;
  assignedCollections: number;
  completedCollections: number;
  missedCollections: number;
  totalCollectedKg: number;
  averageCollectionWeightKg: number;
  weightVarianceIncidents: number;
  successfulDeposits: number;
  performanceScore: number;
}

export interface FacilityAnalyticsItem {
  facilityId: number;
  facilityCode: string;
  name: string;
  facilityType: string;
  receivedKg: number;
  acceptedLoads: number;
  rejectedLoads: number;
  quarantinedLoads: number;
  activeBatches: number;
  completedBatches: number;
  recoveredKg: number;
  residualKg: number;
  recoveryRate: number;
  maximumDailyCapacityKg: number;
  currentOperationalStatus: string;
}

export interface IncidentAnalytics {
  totalIncidents: number;
  openIncidents: number;
  resolvedIncidents: number;
  severity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  types: {
    missedCollection: number;
    weightVariance: number;
    vehicleFailure: number;
    qrFailure: number;
    capacityOverflow: number;
    routeException: number;
    facilityRejection: number;
    safety: number;
    other: number;
  };
}

export interface QRAnalytics {
  totalScans: number;
  successfulScans: number;
  failedScans: number;
  complianceRate: number;
  byType: {
    vehicle: number;
    hub: number;
    route: number;
    stop: number;
    facility: number;
  };
}

export interface OperationalTrendItem {
  date: string;
  requests: number;
  completed: number;
  missed: number;
  wasteKg: number;
  recoveredKg: number;
  incidentCount: number;
}

export interface LiveFeedEvent {
  eventId: number;
  timestamp: string;
  eventType: string;
  title: string;
  description: string;
  severity: string;
  actorId: number;
}
"""

if "AnalyticsSummary" not in content:
    content = content + "\n" + phase9_types
    with open(types_path, "w", encoding="utf-8") as f:
        f.write(content)

print("Appended Phase 9 types to frontend/src/types/index.ts")
