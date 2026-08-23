const BASE_URL = '/api';

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(BASE_URL + url, {
    headers: { 'Content-Type': 'application/json' },
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
    fetchJSON<{ success: boolean; userId?: number; name?: string; username?: string; role?: string; message?: string }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ username, password }) }
    ),

  // Bins
  getBins: () => fetchJSON<import('../types').Bin[]>('/bins'),

  // Vehicles
  getVehicles: () => fetchJSON<import('../types').Vehicle[]>('/vehicles'),

  // Collections
  getCollections: () => fetchJSON<import('../types').CollectionRequest[]>('/collections'),
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

  // Recycling
  getRecycling: () => fetchJSON<import('../types').RecyclingRecord[]>('/recycling'),

  // Analytics
  getDashboard: () => fetchJSON<import('../types').DashboardStats>('/analytics/dashboard'),

  // Route
  getRoute: (from: number, to: number) => fetchJSON<import('../types').RouteResult>(`/route/${from}/${to}`),

  // Demo
  resetDemo: () => fetchJSON<{ success: boolean; message: string }>('/demo/reset', { method: 'POST' }),
};
