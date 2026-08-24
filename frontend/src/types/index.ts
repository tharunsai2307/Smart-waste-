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

export interface Incident {
  incidentId: number;
  type: 'MISSED_COLLECTION' | 'ADDRESS_INACCESSIBLE' | 'WEIGHT_VARIANCE' | 'HUB_CAPACITY_ISSUE' | 'RESIDENT_UNAVAILABLE' | 'SAFETY_ISSUE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  collectionId: number;
  reportedBy: number;
  assignedTo: number;
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'CLOSED';
  description: string;
  createdAt: string;
  resolvedAt?: string;
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

