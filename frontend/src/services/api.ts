import { useAppStore } from '../store';

const BASE_URL = '/api';

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const userId = useAppStore.getState().user?.userId;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (userId) {
    headers['Authorization'] = userId.toString();
  }
  
  const res = await fetch(BASE_URL + url, {
    headers: { ...headers, ...options?.headers },
    ...options,
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${url}`);
  return res.json() as Promise<T>;
}

export const api = {
  // Health
  health: () => fetchJSON<{ status: string }>('/health'),

  // Auth
  login: (username: string, password: string) =>
    fetchJSON<{ success: boolean; userId?: number; name?: string; username?: string; role?: string; message?: string; requiresPasswordChange?: boolean; profileComplete?: boolean }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ username, password }) }
    ),
  googleLogin: (email: string, name: string) =>
    fetchJSON<{ success: boolean; userId?: number; name?: string; username?: string; role?: string; profileComplete?: boolean; message?: string }>(
      '/auth/google',
      { method: 'POST', body: JSON.stringify({ email, name }) }
    ),
  completeResidentProfile: (data: any) =>
    fetchJSON<{ success: boolean; message?: string }>('/residents/profile', { method: 'POST', body: JSON.stringify(data) }),
  completeStaffProfile: (data: any) =>
    fetchJSON<{ success: boolean; message?: string }>('/staff/profile', { method: 'POST', body: JSON.stringify(data) }),
  changePassword: (oldPassword: string, newPassword: string) =>
    fetchJSON<{ success: boolean; message?: string }>('/auth/change_password', { method: 'POST', body: JSON.stringify({ oldPassword, newPassword }) }),
  createStaff: (data: any) =>
    fetchJSON<{ success: boolean; message?: string }>('/admin/staff', { method: 'POST', body: JSON.stringify(data) }),

  // Local Hubs
  getHubs: () => fetchJSON<import('../types').LocalHub[]>('/hubs'),
  getMyHub: () => fetchJSON<import('../types').LocalHub>('/hubs/my-hub'),
  createHub: (data: Partial<import('../types').LocalHub>) =>
    fetchJSON<{ success: boolean; hubId?: number; message?: string }>('/hubs', { method: 'POST', body: JSON.stringify(data) }),
  updateHub: (data: Partial<import('../types').LocalHub>) =>
    fetchJSON<{ success: boolean; message?: string }>('/hubs/update', { method: 'POST', body: JSON.stringify(data) }),
  getHubTransactions: (hubId?: number) =>
    fetchJSON<import('../types').HubInventoryTransaction[]>(hubId ? `/hubs/transactions?hubId=${hubId}` : '/hubs/transactions'),
  recordHubTransaction: (data: {
    hubId: number;
    transactionType: string;
    quantityKg: number;
    wasteType: string;
    sourceType: string;
    sourceId?: number;
    destinationType?: string;
    destinationId?: number;
    measurementSource: string;
    emergencyOverride?: boolean;
  }) => fetchJSON<{ success: boolean; transactionId?: number; message?: string }>('/hubs/transactions', { method: 'POST', body: JSON.stringify(data) }),
  getHubCleaners: (hubId?: number) =>
    fetchJSON<import('../types').HubCleaner[]>(hubId ? `/hubs/cleaners?hubId=${hubId}` : '/hubs/cleaners'),
  getHubDashboard: (hubId?: number) =>
    fetchJSON<import('../types').HubDashboardStats>(hubId ? `/hubs/dashboard?hubId=${hubId}` : '/hubs/dashboard'),

  // Bins
  getBins: () => fetchJSON<import('../types').Bin[]>('/bins'),

  // Vehicles (extended Phase 4)
  getVehicles: () => fetchJSON<import('../types').Vehicle[]>('/vehicles'),
  getAvailableVehicles: (hubId?: number) =>
    fetchJSON<import('../types').Vehicle[]>(hubId ? `/vehicles/available?hubId=${hubId}` : '/vehicles/available'),
  getHubVehicles: (hubId?: number) =>
    fetchJSON<import('../types').Vehicle[]>(hubId ? `/vehicles/hub?hubId=${hubId}` : '/vehicles/hub'),
  createVehicle: (data: Partial<import('../types').Vehicle>) =>
    fetchJSON<{ success: boolean; vehicleId?: number; message?: string }>('/vehicles', { method: 'POST', body: JSON.stringify(data) }),
  updateVehicle: (data: { vehicleId: number } & Partial<import('../types').Vehicle>) =>
    fetchJSON<{ success: boolean; message?: string }>('/vehicles/update', { method: 'POST', body: JSON.stringify(data) }),
  setVehicleStatus: (vehicleId: number, status: string) =>
    fetchJSON<{ success: boolean; message?: string }>('/vehicles/setstatus', { method: 'POST', body: JSON.stringify({ vehicleId, status }) }),

  // Drivers (Phase 4)
  getDrivers: () => fetchJSON<import('../types').DriverExtended[]>('/drivers'),
  getAvailableDrivers: () => fetchJSON<import('../types').DriverExtended[]>('/drivers/available'),
  getMyDriverAssignment: () => fetchJSON<{ driverProfile: import('../types').DriverProfile; activeTransfer: import('../types').WasteTransfer | null }>('/drivers/my-assignment'),
  updateDriverProfile: (data: { employeeCode: string; licenseCategory: string }) =>
    fetchJSON<{ success: boolean; message?: string }>('/drivers/profile', { method: 'POST', body: JSON.stringify(data) }),

  // Facilities (Phase 4)
  getFacilities: () => fetchJSON<import('../types').TransportFacility[]>('/facilities'),
  createFacility: (data: Partial<import('../types').TransportFacility>) =>
    fetchJSON<{ success: boolean; facilityId?: number; message?: string }>('/facilities', { method: 'POST', body: JSON.stringify(data) }),

  // Waste Transfers (Phase 4)
  getTransfers: () => fetchJSON<import('../types').WasteTransfer[]>('/transfers'),
  getMyTransfers: () => fetchJSON<import('../types').WasteTransfer[]>('/transfers/my'),
  createTransfer: (data: {
    destinationFacilityId: number;
    destinationType: string;
    wasteType: string;
    plannedWeightKg: number;
    priority: string;
    scheduledDate: string;
    scheduledTime: string;
    transferCode: string;
    sourceHubId?: number;
  }) => fetchJSON<{ success: boolean; transferId?: number; transferCode?: string; message?: string }>('/transfers', { method: 'POST', body: JSON.stringify(data) }),
  approveTransfer: (transferId: number) =>
    fetchJSON<{ success: boolean; status?: string; message?: string }>('/transfers/approve', { method: 'POST', body: JSON.stringify({ transferId }) }),
  assignDriver: (transferId: number, driverId: number) =>
    fetchJSON<{ success: boolean; status?: string; message?: string }>('/transfers/assign-driver', { method: 'POST', body: JSON.stringify({ transferId, driverId }) }),
  assignVehicle: (transferId: number, vehicleId: number) =>
    fetchJSON<{ success: boolean; status?: string; message?: string }>('/transfers/assign-vehicle', { method: 'POST', body: JSON.stringify({ transferId, vehicleId }) }),
  cancelTransfer: (transferId: number) =>
    fetchJSON<{ success: boolean; status?: string; message?: string }>('/transfers/cancel', { method: 'POST', body: JSON.stringify({ transferId }) }),
  driverCheckin: (transferId: number, scannedQr: string) =>
    fetchJSON<{ success: boolean; status?: string; message?: string }>('/transfers/checkin', { method: 'POST', body: JSON.stringify({ transferId, scannedQr }) }),
  startLoading: (transferId: number) =>
    fetchJSON<{ success: boolean; status?: string; message?: string }>('/transfers/load', { method: 'POST', body: JSON.stringify({ transferId }) }),
  recordLoad: (data: { transferId: number; actualLoadedWeightKg: number; measurementSource: string; varianceReason?: string }) =>
    fetchJSON<{ success: boolean; status?: string; outboundTransactionId?: number; loadVariancePct?: number; message?: string }>('/transfers/record-load', { method: 'POST', body: JSON.stringify(data) }),
  depart: (transferId: number) =>
    fetchJSON<{ success: boolean; status?: string; message?: string }>('/transfers/depart', { method: 'POST', body: JSON.stringify({ transferId }) }),
  arrive: (transferId: number) =>
    fetchJSON<{ success: boolean; status?: string; message?: string }>('/transfers/arrive', { method: 'POST', body: JSON.stringify({ transferId }) }),
  recordDelivery: (data: { transferId: number; actualDeliveredWeightKg: number; varianceExplanation?: string }) =>
    fetchJSON<{ success: boolean; status?: string; deliveryVarianceKg?: number; message?: string }>('/transfers/record-delivery', { method: 'POST', body: JSON.stringify(data) }),
  completeTransfer: (transferId: number) =>
    fetchJSON<{ success: boolean; status?: string; message?: string }>('/transfers/complete', { method: 'POST', body: JSON.stringify({ transferId }) }),
  delayTransfer: (transferId: number, reason: string) =>
    fetchJSON<{ success: boolean; status?: string; message?: string }>('/transfers/delay', { method: 'POST', body: JSON.stringify({ transferId, reason }) }),
  getTransferChain: (transferId: number) =>
    fetchJSON<any>(`/transfers/chain?transferId=${transferId}`),
  getTransportAnalytics: () =>
    fetchJSON<{
      totalTransfers: number;
      completed: number;
      inProgress: number;
      cancelled: number;
      failed: number;
      totalWeightPlannedKg: number;
      totalWeightDeliveredKg: number;
      avgLoadVariancePct: number;
    }>('/transfers/analytics'),

  // Collections & Field Ops (Phase 3)
  getCollections: () => fetchJSON<import('../types').CollectionRequest[]>('/collections'),
  getResidentCollections: () => fetchJSON<import('../types').CollectionRequest[]>('/collections/resident'),
  getHubCollections: (hubId?: number) =>
    fetchJSON<import('../types').CollectionRequest[]>(hubId ? `/collections/hub?hubId=${hubId}` : '/collections/hub'),
  createCollectionRequest: (data: {
    wasteType: string;
    estimatedWeightKg: number;
    preferredDate: string;
    preferredTime: string;
    description: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    hubId?: number;
    urgency?: string;
  }) => fetchJSON<{ success: boolean; collectionId?: number; message?: string }>('/collections/request', { method: 'POST', body: JSON.stringify(data) }),
  assignCleaner: (collectionId: number, cleanerId: number) =>
    fetchJSON<{ success: boolean; message?: string }>('/collections/assign', { method: 'POST', body: JSON.stringify({ collectionId, cleanerId }) }),
  getCleanerJobs: () => fetchJSON<import('../types').CollectionRequest[]>('/collections/cleaner'),
  updateCollectionStatus: (collectionId: number, status: string) =>
    fetchJSON<{ success: boolean; message?: string }>('/collections/status', { method: 'POST', body: JSON.stringify({ collectionId, status }) }),
  recordCollectionWeight: (data: {
    collectionId: number;
    actualWeightKg: number;
    measurementSource?: string;
    wasteType?: string;
  }) => fetchJSON<{ success: boolean; message?: string }>('/collections/record-weight', { method: 'POST', body: JSON.stringify(data) }),
  depositWasteAtHub: (data: {
    collectionId: number;
    scannedQr: string;
    depositedWeightKg: number;
    varianceReason?: string;
    emergencyOverride?: boolean;
  }) => fetchJSON<{ success: boolean; message?: string }>('/collections/deposit-hub', { method: 'POST', body: JSON.stringify(data) }),
  reportMissedCollection: (collectionId: number, reason: string) =>
    fetchJSON<{ success: boolean; incidentId?: number; message?: string }>('/collections/report-missed', { method: 'POST', body: JSON.stringify({ collectionId, reason }) }),
  rescheduleCollection: (data: {
    collectionId: number;
    preferredDate: string;
    preferredTime: string;
    cleanerId?: number;
  }) => fetchJSON<{ success: boolean; message?: string }>('/collections/reschedule', { method: 'POST', body: JSON.stringify(data) }),
  getIncidents: () => fetchJSON<import('../types').Incident[]>('/incidents'),
  resolveIncident: (incidentId: number, resolutionNote: string) =>
    fetchJSON<{ success: boolean; message?: string }>('/incidents/resolve', { method: 'POST', body: JSON.stringify({ incidentId, resolutionNote }) }),
  processCollection: () => fetchJSON<{ success: boolean; message: string }>('/collections/process', { method: 'POST' }),

  // Residents
  getResidents: () => fetchJSON<import('../types').Resident[]>('/residents'),

  // Waste
  getWaste: () => fetchJSON<import('../types').WasteRecord[]>('/waste'),
  addWaste: (data: {
    residentId: number; binId: number; wasteType: string;
    quantity: number; recyclable: number; date: string;
  }) => fetchJSON<{ success: boolean; wasteId: number }>('/waste', { method: 'POST', body: JSON.stringify(data) }),

  // Alerts
  getAlerts: () => fetchJSON<import('../types').Alert[]>('/alerts'),

  // Recycling (Phase 5)
  getRecycling: () => fetchJSON<import('../types').RecyclingRecord[]>('/recycling'),
  getRecyclingFacilities: () => fetchJSON<import('../types').TransportFacility[]>('/recycling/facilities'),
  getRecyclingArrivals: () => fetchJSON<{ arrivals: import('../types').WasteTransfer[] }>('/recycling/arrivals'),
  receiveTransfer: (transferId: number, facilityId: number) =>
    fetchJSON<{ success: boolean; message?: string }>('/recycling/receive', { method: 'POST', body: JSON.stringify({ transferId, facilityId }) }),
  recordTransferWeight: (data: { transferId: number; receivedWeightKg: number; measurementSource: string }) =>
    fetchJSON<{ success: boolean; message?: string }>('/recycling/weight', { method: 'POST', body: JSON.stringify(data) }),
  acceptTransfer: (transferId: number) =>
    fetchJSON<{ success: boolean; message?: string }>('/recycling/accept', { method: 'POST', body: JSON.stringify({ transferId }) }),
  rejectTransfer: (transferId: number, reason: string) =>
    fetchJSON<{ success: boolean; message?: string }>('/recycling/reject', { method: 'POST', body: JSON.stringify({ transferId, reason }) }),
  quarantineTransfer: (transferId: number, reason: string) =>
    fetchJSON<{ success: boolean; message?: string }>('/recycling/quarantine', { method: 'POST', body: JSON.stringify({ transferId, reason }) }),
  getRecyclingBatches: () => fetchJSON<{ batches: import('../types').RecyclingBatch[] }>('/recycling/batches'),
  createRecyclingBatch: (data: { transferId: number; facilityId: number; inputWeightKg: number }) =>
    fetchJSON<{ success: boolean; message?: string }>('/recycling/batches', { method: 'POST', body: JSON.stringify(data) }),
  classifyWaste: (data: { batchId: number; wasteType: string; weightKg: number }) =>
    fetchJSON<{ success: boolean; message?: string }>('/recycling/classify', { method: 'POST', body: JSON.stringify(data) }),
  segregateWaste: (data: { batchId: number; inputWeightKg: number; outputWeightKg: number; wasteType: string }) =>
    fetchJSON<{ success: boolean; message?: string }>('/recycling/segregate', { method: 'POST', body: JSON.stringify(data) }),
  processWaste: (data: { batchId: number; processingMethod: string; inputWeightKg: number; outputWeightKg: number }) =>
    fetchJSON<{ success: boolean; message?: string }>('/recycling/process', { method: 'POST', body: JSON.stringify(data) }),
  recordRecovery: (data: { batchId: number; materialType: string; weightKg: number; qualityGrade: string; destination: string }) =>
    fetchJSON<{ success: boolean; message?: string }>('/recycling/recovery', { method: 'POST', body: JSON.stringify(data) }),
  recordResidual: (data: { batchId: number; weightKg: number; category: string; reason: string; destination: string; disposalMethod: string }) =>
    fetchJSON<{ success: boolean; message?: string }>('/recycling/residual', { method: 'POST', body: JSON.stringify(data) }),
  completeBatch: (batchId: number) =>
    fetchJSON<{ success: boolean; message?: string }>('/recycling/batches/complete', { method: 'POST', body: JSON.stringify({ batchId }) }),
  getRecyclingAnalytics: () => fetchJSON<any>('/recycling/analytics'),

  // Analytics
  getDashboard: () => fetchJSON<import('../types').DashboardStats>('/analytics/dashboard'),

  // Route
  getRoute: (from: number, to: number) => fetchJSON<import('../types').RouteResult>(`/route/${from}/${to}`),

  // Demo
  resetDemo: () => fetchJSON<{ success: boolean; message: string }>('/demo/reset', { method: 'POST' }),

  // Phase 9: Municipal Analytics & Intelligence
  getAnalyticsSummary: (params?: Record<string, string | number>) => {
    const q = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
    return fetchJSON<import('../types').AnalyticsSummary>(`/analytics/summary${q}`);
  },
  getAnalyticsCollections: (params?: Record<string, string | number>) => {
    const q = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
    return fetchJSON<import('../types').CollectionAnalytics>(`/analytics/collections${q}`);
  },
  getAnalyticsHubs: (params?: Record<string, string | number>) => {
    const q = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
    return fetchJSON<import('../types').HubAnalyticsItem[]>(`/analytics/hubs${q}`);
  },
  getAnalyticsFleet: (params?: Record<string, string | number>) => {
    const q = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
    return fetchJSON<import('../types').FleetAnalytics>(`/analytics/fleet${q}`);
  },
  getAnalyticsRoutes: (params?: Record<string, string | number>) => {
    const q = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
    return fetchJSON<import('../types').RouteAnalytics>(`/analytics/routes${q}`);
  },
  getAnalyticsRecycling: (params?: Record<string, string | number>) => {
    const q = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
    return fetchJSON<import('../types').RecyclingAnalytics>(`/analytics/recycling${q}`);
  },
  getAnalyticsWasteTypes: (params?: Record<string, string | number>) => {
    const q = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
    return fetchJSON<import('../types').WasteTypeAnalyticsItem[]>(`/analytics/waste-types${q}`);
  },
  getAnalyticsIncidents: (params?: Record<string, string | number>) => {
    const q = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
    return fetchJSON<import('../types').IncidentAnalytics>(`/analytics/incidents${q}`);
  },
  getAnalyticsQR: (params?: Record<string, string | number>) => {
    const q = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
    return fetchJSON<import('../types').QRAnalytics>(`/analytics/qr${q}`);
  },
  getAnalyticsDrivers: (params?: Record<string, string | number>) => {
    const q = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
    return fetchJSON<import('../types').DriverPerformanceItem[]>(`/analytics/drivers${q}`);
  },
  getAnalyticsCleaners: (params?: Record<string, string | number>) => {
    const q = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
    return fetchJSON<import('../types').CleanerPerformanceItem[]>(`/analytics/cleaners${q}`);
  },
  getAnalyticsFacilities: (params?: Record<string, string | number>) => {
    const q = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
    return fetchJSON<import('../types').FacilityAnalyticsItem[]>(`/analytics/facilities${q}`);
  },
  getAnalyticsTrends: (params?: Record<string, string | number>) => {
    const q = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
    return fetchJSON<import('../types').OperationalTrendItem[]>(`/analytics/trends${q}`);
  },
  getAnalyticsLiveFeed: (params?: Record<string, string | number>) => {
    const q = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
    return fetchJSON<import('../types').LiveFeedEvent[]>(`/analytics/live-feed${q}`);
  },
  exportReportCSVUrl: (type: string, params?: Record<string, string | number>) => {
    const queryObj = { type, ...(params || {}) };
    return `/api/reports/export?` + new URLSearchParams(queryObj as Record<string, string>).toString();
  },
};
