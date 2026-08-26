export interface Bin {
  binId: number;
  location: string;
  capacity: number;
  currentLevel: number;
  fillPercent: number;
  wasteType: string;
  status: 'NORMAL' | 'WARNING' | 'CRITICAL' | 'OVERFLOW';
  dataSource?: string;
}

export interface Vehicle {
  vehicleId: number;
  vehicleNumber: string;
  registrationNumber: string;
  vehicleCode: string;
  vehicleType: string;
  make: string;
  model: string;
  manufactureYear: number;
  capacityKg: number;
  capacity?: number; // legacy
  currentLoad: number;
  loadPercent?: number; // legacy
  assignedHubId: number;
  odometerKm: number;
  insuranceExpiry: string;
  inspectionExpiry: string;
  lastServiceDate: string;
  status: 'AVAILABLE' | 'ASSIGNED' | 'LOADING' | 'ON_ROUTE' | 'MAINTENANCE' | 'OUT_OF_SERVICE';
  compliant: boolean;
  complianceNote: string;
  createdAt?: string;
  updatedAt?: string;
}

export type CollectionStatus =
  | 'REQUESTED'
  | 'UNDER_REVIEW'
  | 'ASSIGNED'
  | 'EN_ROUTE'
  | 'ARRIVED'
  | 'COLLECTING'
  | 'COLLECTED'
  | 'DEPOSIT_PENDING'
  | 'DEPOSITED_AT_HUB'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'MISSED'
  | 'REJECTED'
  | 'RESCHEDULED';

export interface CollectionRequest {
  collectionId: number;
  residentId: number;
  residentName?: string;
  hubId: number;
  hubName?: string;
  cleanerId: number;
  cleanerName?: string;
  vehicleId?: number;
  binId?: number;
  address: string;
  latitude: number;
  longitude: number;
  wasteType: string;
  estimatedWeightKg: number;
  actualWeightKg: number;
  depositedWeightKg: number;
  preferredDate: string;
  preferredTime: string;
  description: string;
  priorityScore: number;
  priorityLevel: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  status: CollectionStatus;
  measurementSource?: string;
  varianceReason?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}



export interface Resident {
  residentId: number;
  userId: number;
  address: string;
  area: string;
  ecoPoints: number;
}

export interface WasteRecord {
  wasteId: number;
  residentId: number;
  binId: number;
  wasteType: string;
  quantity: number;
  date: string;
  recyclable: boolean;
  collected: boolean;
  dataSource?: string;
}

export interface Alert {
  alertId: number;
  type: string;
  referenceId: number;
  message: string;
  date: string;
  resolved: boolean;
}

export interface RecyclingRecord {
  recyclingId: number;
  collectionId: number;
  wasteType: string;
  recyclableQuantity: number;
  recycledQuantity: number;
  rejectedQuantity: number;
  value: number;
}

export interface DashboardStats {
  residents: number;
  bins: number;
  vehicles: number;
  normalBins: number;
  warningBins: number;
  criticalBins: number;
  overflowBins: number;
  pendingCollections: number;
  activeCollections: number;
  completedCollections: number;
  availableVehicles: number;
  onRouteVehicles: number;
  activeAlerts: number;
  totalWaste: number;
  totalRecyclable: number;
  totalRecycled: number;
  recyclingRate: number;
  recyclingValue: number;
  co2Saved: number;
  landfillAvoided: number;
}

export interface RouteNode {
  nodeId: number;
  name: string;
}

export interface RouteResult {
  from: number;
  to: number;
  distance: number;
  path: RouteNode[];
}

export interface AuthUser {
  userId: number;
  name: string;
  username: string;
  role: 'ADMIN' | 'LOCAL_HUB_MANAGER' | 'CLEANER' | 'DRIVER' | 'RECYCLING_MANAGER' | 'RESIDENT';
  requiresPasswordChange?: boolean;
  profileComplete?: boolean;
  assignedHub?: number;
  workspaceId?: string;
}

export interface Workspace {
  workspaceId: string;
  name: string;
  description: string;
  createdAt?: string;
}

export interface LocalHub {
  hubId: number;
  hubCode: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  maximumCapacityKg: number;
  warningThresholdPercent: number;
  criticalThresholdPercent: number;
  managerId: number;
  managerName?: string;
  currentLoadKg: number;
  availableCapacityKg: number;
  utilizationPercent: number;
  status: 'NORMAL' | 'WARNING' | 'CRITICAL' | 'AT_CAPACITY' | 'TEMPORARILY_CLOSED';
  createdAt: string;
  updatedAt: string;
}

export interface HubInventoryTransaction {
  transactionId: number;
  hubId: number;
  transactionType: 'INBOUND_COLLECTION' | 'OUTBOUND_TRANSFER' | 'ADJUSTMENT' | 'CORRECTION';
  quantityKg: number;
  wasteType: string;
  sourceType: string;
  sourceId: number;
  destinationType: string;
  destinationId: number;
  recordedBy: number;
  measurementSource: string;
  timestamp: string;
}

export interface HubDashboardStats {
  hubId: number;
  hubCode: string;
  name: string;
  currentCapacity: number;
  currentLoad: number;
  availableCapacity: number;
  utilizationPercent: number;
  warningThresholdPercent: number;
  criticalThresholdPercent: number;
  inboundToday: number;
  outboundToday: number;
  activeCleaners: number;
  pendingCollections: number;
  pendingTransferRequests: number;
  status: 'NORMAL' | 'WARNING' | 'CRITICAL' | 'AT_CAPACITY' | 'TEMPORARILY_CLOSED';
}

export interface HubCleaner {
  userId: number;
  username: string;
  name: string;
  phone: string;
  email: string;
  assignedHub: number;
  employmentStatus: string;
  status: number;
}

export type TransferStatus =
  | 'REQUESTED'
  | 'APPROVED'
  | 'DRIVER_ASSIGNED'
  | 'VEHICLE_ASSIGNED'
  | 'DRIVER_CHECKED_IN'
  | 'LOADING'
  | 'LOADED'
  | 'DEPARTED'
  | 'EN_ROUTE'
  | 'ARRIVED'
  | 'RECEIVING'
  | 'WEIGHT_VERIFICATION'
  | 'ACCEPTED'
  | 'PARTIALLY_ACCEPTED'
  | 'QUARANTINED'
  | 'UNLOADING'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'DELAYED'
  | 'FAILED'
  | 'REJECTED';

export interface WasteTransfer {
  transferId: number;
  transferCode: string;
  sourceHubId: number;
  destinationFacilityId: number;
  destinationType: string;
  driverId: number;
  vehicleId: number;
  plannedWeightKg: number;
  actualLoadedWeightKg: number;
  actualDeliveredWeightKg: number;
  loadVariancePct: number;
  deliveryVarianceKg: number;
  wasteType: string;
  status: TransferStatus;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  scheduledDate: string;
  scheduledTime: string;
  varianceReason?: string;
  varianceExplanation?: string;
  outboundTransactionId?: number;
  startedAt?: string;
  loadedAt?: string;
  departedAt?: string;
  arrivedAt?: string;
  completedAt?: string;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

export interface TransportFacility {
  facilityId: number;
  facilityCode: string;
  name: string;
  facilityType: string;
  address: string;
  latitude: number;
  longitude: number;
  maximumDailyCapacityKg?: number;
  currentOperationalStatus?: 'OPERATIONAL' | 'LIMITED' | 'TEMPORARILY_CLOSED' | 'MAINTENANCE' | 'FULL';
  managerId?: number;
  contactName: string;
  contactPhone: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  createdAt?: string;
  updatedAt?: string;
}

export type BatchStatus = 
  | 'CREATED'
  | 'RECEIVED'
  | 'CLASSIFYING'
  | 'CLASSIFIED'
  | 'PROCESSING'
  | 'PROCESSED'
  | 'RECOVERED'
  | 'COMPLETED'
  | 'QUARANTINED'
  | 'REJECTED'
  | 'CANCELLED';

export interface RecyclingBatch {
  batchId: number;
  batchCode: string;
  facilityId: number;
  sourceTransferId: number;
  sourceHubId: number;
  inputWeightKg: number;
  processedWeightKg: number;
  recoveredWeightKg: number;
  residualWeightKg: number;
  status: BatchStatus;
  createdAt: string;
  processedAt?: string;
  completedAt?: string;
}

export interface WasteClassification {
  classificationId: number;
  batchId: number;
  wasteType: string;
  weightKg: number;
  operatorId: number;
  timestamp: string;
}

export interface SegregationRecord {
  segregationId: number;
  batchId: number;
  inputWeightKg: number;
  outputWeightKg: number;
  wasteType: string;
  operatorId: number;
  timestamp: string;
}

export interface ProcessingRecord {
  processingId: number;
  batchId: number;
  processingMethod: string;
  operatorId: number;
  startTime: string;
  endTime: string;
  inputWeightKg: number;
  outputWeightKg: number;
}

export interface RecoveryRecord {
  recoveryId: number;
  batchId: number;
  materialType: string;
  weightKg: number;
  qualityGrade: string;
  destination: string;
  operatorId: number;
  processedAt: string;
}

export interface ResidualRecord {
  residualId: number;
  batchId: number;
  weightKg: number;
  category: string;
  reason: string;
  destination: string;
  disposalMethod: string;
  operatorId: number;
  timestamp: string;
}

export interface DriverProfile {
  profileId?: number;
  userId: number;
  employeeCode: string;
  licenseCategory: string;
  availability: 'AVAILABLE' | 'ASSIGNED' | 'ON_DUTY' | 'ON_ROUTE' | 'OFF_DUTY' | 'UNAVAILABLE' | 'SUSPENDED';
  currentTransferId: number;
  totalKmDriven: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface DriverExtended {
  userId: number;
  name: string;
  username: string;
  phone: string;
  licenseNumber: string;
  licenseExpiry: string;
  assignedHub: number;
  status: number;
  driverProfile: DriverProfile;
}



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


// ─────────────────────────────────────────────────────────────
// Phase 10 Types: Incidents, Alerts & Notifications
// ─────────────────────────────────────────────────────────────

export interface Incident {
  incidentId: number;
  type: string;
  severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  status: 'DETECTED' | 'OPEN' | 'ACKNOWLEDGED' | 'ASSIGNED' | 'INVESTIGATING' | 'ACTION_REQUIRED' | 'RESOLVED' | 'CLOSED' | 'REJECTED' | 'CANCELLED' | string;
  description: string;
  collectionId: number;
  reportedBy: number;
  assignedTo: number;
  createdAt: string;
  resolvedAt?: string;
  acknowledgedAt?: string;
  closedAt?: string;
  entityType?: string;
  entityId?: number;
  hubId?: number;
  vehicleId?: number;
  routeId?: number;
  facilityId?: number;
  assignedRole?: string;
  escalationLevel?: number;
}

export interface IncidentTimelineEntry {
  timelineId: number;
  incidentId: number;
  timestamp: string;
  actorId: number;
  actorRole: string;
  action: string;
  previousStatus: string;
  newStatus: string;
  comment: string;
  evidenceRef: string;
}


export interface NotificationPreference {
  userId: number;
  criticalAlerts: number;
  highSeverityAlerts: number;
  assignedIncidentsOnly: number;
  hubAlerts: number;
  vehicleAlerts: number;
  collectionExceptions: number;
  recyclingExceptions: number;
}
