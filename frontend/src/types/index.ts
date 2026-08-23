export interface Bin {
  binId: number;
  location: string;
  capacity: number;
  currentLevel: number;
  fillPercent: number;
  wasteType: string;
  status: 'NORMAL' | 'WARNING' | 'CRITICAL' | 'OVERFLOW';
}

export interface Vehicle {
  vehicleId: number;
  vehicleNumber: string;
  driverName: string;
  capacity: number;
  currentLoad: number;
  loadPercent: number;
  status: 'AVAILABLE' | 'ASSIGNED' | 'ON_ROUTE' | 'FULL' | 'MAINTENANCE';
}

export interface CollectionRequest {
  collectionId: number;
  binId: number;
  residentId: number;
  vehicleId: number;
  operatorId: number;
  quantity: number;
  priorityScore: number;
  priorityLevel: string;
  status: 'PENDING' | 'ASSIGNED' | 'ON_ROUTE' | 'COLLECTING' | 'COMPLETED' | 'CANCELLED';
  requestDate: string;
  completionDate: string;
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
  role: 'ADMIN' | 'COLLECTION_MANAGER' | 'OPERATOR' | 'RESIDENT';
}
