// Types mirroring the new Node/Postgres backend (backend/src/db/schema.sql).
// These are the ONLY types the new pages should use — legacy types in
// types/index.ts belonged to the old C backend's mock/demo data model.

export type Role = 'ADMIN' | 'LOCAL_HUB_MANAGER' | 'CLEANER' | 'RECYCLING_MANAGER' | 'DRIVER' | 'RESIDENT';

export interface AuthUser {
  id: number;
  role: Role;
  name: string;
  username?: string;
  email?: string;
  avatarUrl?: string;
  localHubId?: number | null;
  recyclingHubId?: number | null;
  mustChangePassword?: boolean;
  profileComplete?: boolean;
}

export interface LocalHub {
  id: number;
  code: string;
  name: string;
  address?: string;
  area?: string;
  latitude?: number;
  longitude?: number;
  capacity_kg: number;
  current_load_kg: number;
  warning_pct: number;
  critical_pct: number;
  manager_id?: number;
  manager_name?: string;
  qr_code: string;
  status: 'ACTIVE' | 'INACTIVE';
  cleaner_count?: number;
  created_at: string;
}

export interface RecyclingHub {
  id: number;
  code: string;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  daily_capacity_kg: number;
  manager_id?: number;
  manager_name?: string;
  qr_code: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
}

export type VehicleStatus = 'IDLE' | 'ASSIGNED' | 'EN_ROUTE' | 'MAINTENANCE' | 'OUT_OF_SERVICE';

export interface Vehicle {
  id: number;
  plate_number: string;
  vehicle_type: 'MINI_TRUCK' | 'COMPACTOR' | 'TIPPER' | 'E_RICKSHAW';
  capacity_kg: number;
  current_load_kg: number;
  status: VehicleStatus;
  home_recycling_hub_id?: number;
  qr_code: string;
  total_trips: number;
  total_kg_hauled: number;
  created_at: string;
}

export type WasteType = 'PLASTIC' | 'PAPER' | 'METAL' | 'E_WASTE' | 'BIODEGRADABLE' | 'HAZARDOUS' | 'MIXED';

export type PickupStatus = 'PENDING' | 'ASSIGNED' | 'COLLECTED' | 'MISSED' | 'CANCELLED';
export type PickupType = 'SCHEDULED' | 'ON_DEMAND' | 'MISSED_REPORT';

export interface PickupRequest {
  id: number;
  resident_id: number;
  request_type: PickupType;
  waste_type: WasteType;
  estimated_kg: number;
  notes?: string;
  address_line: string;
  latitude?: number;
  longitude?: number;
  local_hub_id?: number;
  status: PickupStatus;
  priority_score: number;
  assigned_cleaner_id?: number;
  assigned_at?: string;
  collected_at?: string;
  actual_kg?: number;
  sla_due_at?: string;
  escalation_level: number;
  original_request_id?: number;
  created_at: string;
}

export interface Collection {
  id: number;
  pickup_request_id?: number;
  cleaner_id: number;
  resident_id?: number;
  local_hub_id: number;
  waste_type: WasteType;
  weight_kg: number;
  eco_points_awarded: number;
  collected_at: string;
  hub_name?: string;
  resident_name?: string;
}

export type TransferStatus =
  | 'REQUESTED' | 'DRIVER_ASSIGNED' | 'ON_THE_JOB' | 'ARRIVED_AT_HUB' | 'LOADED'
  | 'EN_ROUTE' | 'ARRIVED_AT_RECYCLING' | 'RECEIVED' | 'COMPLETED' | 'CANCELLED';

export interface Transfer {
  id: number;
  local_hub_id: number;
  recycling_hub_id?: number;
  requested_by?: number | null; // null when the requester's account was deleted (history anonymized)
  vehicle_id?: number;
  driver_id?: number;
  assigned_by?: number;
  status: TransferStatus;
  planned_weight_kg?: number;
  loaded_weight_kg?: number;
  received_weight_kg?: number;
  variance_pct?: number;
  requested_at: string;
  assigned_at?: string;
  on_job_at?: string;
  arrived_hub_at?: string;
  loaded_at?: string;
  en_route_at?: string;
  arrived_recycling_at?: string;
  completed_at?: string;
  // joined fields (detail endpoint)
  local_hub_name?: string;
  recycling_hub_name?: string;
  driver_name?: string;
  plate_number?: string;
}

export interface TransferEvent {
  id: number;
  transfer_id: number;
  event_type: string;
  actor_id?: number;
  detail: any;
  created_at: string;
}

export interface RecyclingBatch {
  id: number;
  batch_code: string;
  recycling_hub_id: number;
  transfer_id?: number;
  input_weight_kg: number;
  processed_weight_kg: number;
  recovered_weight_kg: number;
  residual_weight_kg: number;
  recovery_rate_pct?: number;
  status: 'RECEIVED' | 'CLASSIFIED' | 'PROCESSING' | 'COMPLETED';
  created_by?: number;
  created_at: string;
  completed_at?: string;
}

export interface WasteClassification {
  id: number;
  batch_id: number;
  category: WasteType;
  weight_kg: number;
  market_rate_per_kg: number;
  recovery_value: number;
}

export interface AlertItem {
  id: number;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  entity_type?: string;
  entity_id?: number;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
  acknowledged_by?: number;
  created_at: string;
  resolved_at?: string;
}

export interface StaffUser {
  id: number;
  role: Role;
  name: string;
  username?: string;
  email?: string;
  phone?: string;
  status: 'ACTIVE' | 'SUSPENDED';
  local_hub_id?: number;
  recycling_hub_id?: number;
  must_change_password?: boolean;
  failed_attempts?: number;
  created_at: string;
}

export interface AuditEntry {
  id: number;
  action: string;
  entity_type?: string | null;
  entity_id?: number | null;
  detail?: Record<string, unknown> | null;
  created_at: string;
  actor_id?: number | null;
  actor_name?: string | null;
  actor_role?: string | null;
}

export interface UserDetail {
  user: StaffUser & {
    profile_complete?: boolean;
    local_hub_name?: string | null;
    recycling_hub_name?: string | null;
    created_by_name?: string | null;
    updated_at?: string;
  };
  resident_profile?: ResidentProfile | null;
  driver_profile?: {
    license_number?: string | null;
    license_expiry?: string | null;
    employment_status?: string;
    availability?: string;
    total_trips?: number;
    total_kg_hauled?: number;
  } | null;
  stats: {
    collections_as_cleaner: number;
    kg_collected: number;
    pickups_requested: number;
    transfers_requested: number;
    transfers_driven: number;
    batches_created: number;
  };
  recent_collections?: Collection[];
  recent_pickups?: PickupRequest[];
  recent_ledger?: { id: number; points: number; reason: string; created_at: string }[];
  activity?: AuditEntry[];
}

export interface DriverListItem {
  id: number;
  name: string;
  username?: string;
  phone?: string;
  status: string;
  recycling_hub_id?: number;
  license_number?: string;
  employment_status: string;
  availability: 'AVAILABLE' | 'ON_JOB' | 'OFF_DUTY';
  current_vehicle_id?: number;
  total_trips: number;
  total_kg_hauled: number;
  plate_number?: string;
  vehicle_type?: string;
  capacity_kg?: number;
}

export interface ResidentProfile {
  user_id: number;
  address_line?: string;
  area?: string;
  city?: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
  eco_points: number;
  total_kg_recycled: number;
  preferred_local_hub_id?: number;
}
