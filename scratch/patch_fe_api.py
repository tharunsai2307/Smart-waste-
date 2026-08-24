import re

api_path = r"C:\Users\Hp\.gemini\antigravity-ide\scratch\smart-waste-management\frontend\src\services\api.ts"
with open(api_path, "r", encoding="utf-8") as f:
    content = f.read()

phase9_api_methods = """
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
"""

if "getAnalyticsSummary" not in content:
    # Insert right before closing of export const api = { ... }
    last_brace_index = content.rfind("};")
    if last_brace_index != -1:
        content = content[:last_brace_index] + phase9_api_methods + content[last_brace_index:]
        with open(api_path, "w", encoding="utf-8") as f:
            f.write(content)

print("Updated api.ts with Phase 9 endpoints")
