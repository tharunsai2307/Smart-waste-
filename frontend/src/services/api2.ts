// Full API surface for the new backend. Named api2 to avoid clashing with
// the legacy services/api.ts while the old pages are removed/migrated.
import { apiClient } from './apiClient';
import type {
  AuthUser, LocalHub, RecyclingHub, Vehicle, PickupRequest, Collection,
  Transfer, TransferEvent, RecyclingBatch, WasteClassification, AlertItem,
  StaffUser, DriverListItem, ResidentProfile, Role, WasteType, PickupType,
  UserDetail, AuditEntry,
} from '../types/api';

export const authApi = {
  loginStaff: (username: string, password: string) =>
    apiClient.post<{ token: string; user: AuthUser }>('/auth/login/staff', { username, password }),
  loginGoogle: (payload: { googleUid: string; email: string; name: string; avatarUrl?: string }) =>
    apiClient.post<{ token: string; user: AuthUser }>('/auth/login/google', payload),
  completeResidentProfile: (payload: {
    addressLine: string; area: string; city: string; postalCode?: string;
    latitude?: number; longitude?: number; preferredLocalHubId?: number;
  }) => apiClient.post<{ success: boolean }>('/auth/profile/resident', payload),
  changePassword: (payload: { currentPassword?: string; newPassword: string }) =>
    apiClient.post<{ success: boolean }>('/auth/change-password', payload),
  me: () => apiClient.get<{ user: AuthUser }>('/auth/me'),
};

export const usersApi = {
  createStaff: (payload: {
    role: Role; name: string; username: string; password: string;
    email?: string; phone?: string; localHubId?: number; recyclingHubId?: number;
    licenseNumber?: string; licenseExpiry?: string;
  }) => apiClient.post<{ user: StaffUser }>('/users', payload),
  list: (role?: Role) => apiClient.get<{ users: StaffUser[] }>(role ? `/users?role=${role}` : '/users'),
  hubCleaners: (hubId: number) => apiClient.get<{ cleaners: StaffUser[] }>(`/users/hub/${hubId}/cleaners`),
  drivers: () => apiClient.get<{ drivers: DriverListItem[] }>('/users/drivers'),
  setStatus: (id: number, status: 'ACTIVE' | 'SUSPENDED') => apiClient.patch<{ user: StaffUser }>(`/users/${id}/status`, { status }),
  resetPassword: (id: number, newPassword?: string) =>
    apiClient.post<{ user: StaffUser; password: string; mustChangePassword: boolean }>(
      `/users/${id}/reset-password`,
      newPassword ? { newPassword } : {}
    ),
  detail: (id: number) => apiClient.get<UserDetail>(`/users/${id}`),
  deleteUser: (id: number) =>
    apiClient.del<{ success: boolean; deleted: { id: number; name: string; username?: string; role: string } }>(`/users/${id}`),
};

export const hubsApi = {
  createLocal: (payload: { name: string; address?: string; area?: string; latitude?: number; longitude?: number; capacityKg?: number; managerId?: number }) =>
    apiClient.post<{ hub: LocalHub }>('/hubs/local', payload),
  listLocal: () => apiClient.get<{ hubs: LocalHub[] }>('/hubs/local'),
  getLocal: (id: number) => apiClient.get<{ hub: LocalHub }>(`/hubs/local/${id}`),
  updateLocal: (id: number, payload: Partial<{ capacityKg: number; warningPct: number; criticalPct: number; managerId: number }>) =>
    apiClient.patch<{ hub: LocalHub }>(`/hubs/local/${id}`, payload),
  createRecycling: (payload: { name: string; address?: string; latitude?: number; longitude?: number; dailyCapacityKg?: number; managerId?: number }) =>
    apiClient.post<{ hub: RecyclingHub }>('/hubs/recycling', payload),
  listRecycling: () => apiClient.get<{ hubs: RecyclingHub[] }>('/hubs/recycling'),
  getRecycling: (id: number) => apiClient.get<{ hub: RecyclingHub }>(`/hubs/recycling/${id}`),
};

export const collectionsApi = {
  log: (payload: { pickupRequestId?: number; residentId?: number; wasteType: WasteType; weightKg: number }) =>
    apiClient.post<{ collection: Collection; hub: LocalHub; fillPct: number }>('/collections', payload),
  list: () => apiClient.get<{ collections: Collection[] }>('/collections'),
};

export const pickupsApi = {
  create: (payload: {
    requestType?: PickupType; wasteType?: WasteType; estimatedKg?: number; notes?: string;
    addressLine: string; latitude?: number; longitude?: number; localHubId?: number; originalRequestId?: number;
  }) => apiClient.post<{ request: PickupRequest }>('/pickups', payload),
  assign: (id: number, cleanerId: number) => apiClient.patch<{ request: PickupRequest }>(`/pickups/${id}/assign`, { cleanerId }),
  cancel: (id: number) => apiClient.patch<{ request: PickupRequest }>(`/pickups/${id}/cancel`, {}),
  escalate: () => apiClient.post<{ escalatedCount: number; escalated: any[] }>('/pickups/escalate'),
  list: (status?: string) => apiClient.get<{ requests: PickupRequest[] }>(status ? `/pickups?status=${status}` : '/pickups'),
};

export const transfersApi = {
  request: (payload: { localHubId: number; recyclingHubId?: number }) =>
    apiClient.post<{ transfer: Transfer }>('/transfers/request', payload),
  assign: (id: number, payload: { driverId: number; vehicleId: number; recyclingHubId?: number }) =>
    apiClient.patch<{ transfer: Transfer }>(`/transfers/${id}/assign`, payload),
  scanStartJob: (id: number, qrPayload: string) => apiClient.post<{ transfer: Transfer }>(`/transfers/${id}/scan/start-job`, { qrPayload }),
  scanArriveHub: (id: number, qrPayload: string) => apiClient.post<{ transfer: Transfer }>(`/transfers/${id}/scan/arrive-hub`, { qrPayload }),
  scanLoaded: (id: number, qrPayload: string, loadedWeightKg: number) =>
    apiClient.post<{ transfer: Transfer }>(`/transfers/${id}/scan/loaded`, { qrPayload, loadedWeightKg }),
  scanArriveRecycling: (id: number, qrPayload: string) => apiClient.post<{ transfer: Transfer }>(`/transfers/${id}/scan/arrive-recycling`, { qrPayload }),
  receive: (id: number, receivedWeightKg: number) => apiClient.post<{ transfer: Transfer }>(`/transfers/${id}/receive`, { receivedWeightKg }),
  list: () => apiClient.get<{ transfers: Transfer[] }>('/transfers'),
  detail: (id: number) => apiClient.get<{ transfer: Transfer; events: TransferEvent[] }>(`/transfers/${id}`),
};

export const vehiclesApi = {
  create: (payload: { plateNumber: string; vehicleType?: string; capacityKg: number; homeRecyclingHubId?: number }) =>
    apiClient.post<{ vehicle: Vehicle }>('/vehicles', payload),
  list: () => apiClient.get<{ vehicles: Vehicle[] }>('/vehicles'),
  get: (id: number) => apiClient.get<{ vehicle: Vehicle }>(`/vehicles/${id}`),
  update: (id: number, payload: Partial<{ capacityKg: number; status: string }>) => apiClient.patch<{ vehicle: Vehicle }>(`/vehicles/${id}`, payload),
  routes: (driverId: number) => apiClient.get<{ route: any[] }>(`/vehicles/routes/${driverId}`),
};

export const recyclingApi = {
  createBatch: (payload: { recyclingHubId: number; transferId?: number; inputWeightKg?: number }) =>
    apiClient.post<{ batch: RecyclingBatch }>('/recycling/batches', payload),
  classify: (id: number, classifications: { category: WasteType; weightKg: number; marketRatePerKg?: number }[]) =>
    apiClient.post<{ batch: RecyclingBatch }>(`/recycling/batches/${id}/classify`, { classifications }),
  process: (id: number, payload: { processedWeightKg: number; recoveredWeightKg: number; residualWeightKg: number }) =>
    apiClient.post<{ batch: RecyclingBatch }>(`/recycling/batches/${id}/process`, payload),
  listBatches: () => apiClient.get<{ batches: RecyclingBatch[] }>('/recycling/batches'),
  batchDetail: (id: number) => apiClient.get<{ batch: RecyclingBatch; classifications: WasteClassification[] }>(`/recycling/batches/${id}`),
  hubStats: (hubId: number) => apiClient.get<{ totals: any; byCategory: any[] }>(`/recycling/hub/${hubId}/stats`),
};

export const alertsApi = {
  list: (status: string = 'ACTIVE') => apiClient.get<{ alerts: AlertItem[] }>(`/alerts?status=${status}`),
  acknowledge: (id: number) => apiClient.patch<{ alert: AlertItem }>(`/alerts/${id}/acknowledge`, {}),
  resolve: (id: number) => apiClient.patch<{ alert: AlertItem }>(`/alerts/${id}/resolve`, {}),
};

export const activityApi = {
  list: (params?: { action?: string; q?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.action) qs.set('action', params.action);
    if (params?.q) qs.set('q', params.q);
    if (params?.limit) qs.set('limit', String(params.limit));
    const s = qs.toString();
    return apiClient.get<{ activity: AuditEntry[]; counts: { action: string; n: number }[] }>(s ? `/activity?${s}` : '/activity');
  },
};

export const dashboardApi = {
  admin: () => apiClient.get<any>('/dashboard/admin'),
  resident: () => apiClient.get<{ profile: ResidentProfile; recentCollections: Collection[]; activeRequests: PickupRequest[] }>('/dashboard/resident'),
  localHub: (hubId?: number) => apiClient.get<any>(hubId ? `/dashboard/local-hub?hubId=${hubId}` : '/dashboard/local-hub'),
  recyclingHub: (hubId?: number) => apiClient.get<any>(hubId ? `/dashboard/recycling-hub?hubId=${hubId}` : '/dashboard/recycling-hub'),
};
