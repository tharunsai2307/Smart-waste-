# Update frontend/src/types/index.ts
with open("frontend/src/types/index.ts", "r", encoding="utf-8") as f:
    fe_types = f.read()

phase10_fe_types = """
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
  resolvedAt: string;
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

export interface Alert {
  alertId: number;
  type: string;
  referenceId: number;
  message: string;
  date: string;
  resolved: number;
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
"""

if "IncidentTimelineEntry" not in fe_types:
    fe_types += "\n" + phase10_fe_types
    with open("frontend/src/types/index.ts", "w", encoding="utf-8") as f:
        f.write(fe_types)

# Update frontend/src/services/api.ts
with open("frontend/src/services/api.ts", "r", encoding="utf-8") as f:
    fe_api = f.read()

phase10_api_methods = """
  // Phase 10: Municipal Incident & Response Center APIs
  getIncidents: (params?: Record<string, string | number>): Promise<Incident[]> => {
    let q = '';
    if (params) {
      const parts = Object.entries(params)
        .filter(([_, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
      if (parts.length > 0) q = `?${parts.join('&')}`;
    }
    return request<Incident[]>(`/incidents${q}`);
  },

  getIncidentById: (id: number): Promise<Incident> =>
    request<Incident>(`/incidents/${id}`),

  createIncident: (data: Partial<Incident>): Promise<{ success: boolean; incidentId: number }> =>
    request<{ success: boolean; incidentId: number }>('/incidents', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  acknowledgeIncident: (id: number, data: { actorId?: number; actorRole?: string; note?: string }): Promise<{ success: boolean }> =>
    request<{ success: boolean }>(`/incidents/${id}/acknowledge`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  assignIncident: (id: number, data: { actorId?: number; actorRole?: string; assignToUserId: number; targetRole?: string; note?: string }): Promise<{ success: boolean }> =>
    request<{ success: boolean }>(`/incidents/${id}/assign`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  investigateIncident: (id: number, data: { actorId?: number; actorRole?: string; note?: string }): Promise<{ success: boolean }> =>
    request<{ success: boolean }>(`/incidents/${id}/investigate`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  actionIncident: (id: number, data: { actorId?: number; actorRole?: string; actionTaken: string; note?: string }): Promise<{ success: boolean }> =>
    request<{ success: boolean }>(`/incidents/${id}/action`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  resolveIncident: (id: number, data: { actorId?: number; actorRole?: string; note?: string }): Promise<{ success: boolean }> =>
    request<{ success: boolean }>(`/incidents/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  closeIncident: (id: number, data: { actorId?: number; actorRole?: string; note?: string }): Promise<{ success: boolean }> =>
    request<{ success: boolean }>(`/incidents/${id}/close`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  reopenIncident: (id: number, data: { actorId?: number; actorRole?: string; note?: string }): Promise<{ success: boolean }> =>
    request<{ success: boolean }>(`/incidents/${id}/reopen`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getIncidentTimeline: (id: number): Promise<IncidentTimelineEntry[]> =>
    request<IncidentTimelineEntry[]>(`/incidents/${id}/timeline`),

  addIncidentComment: (id: number, data: { actorId?: number; actorRole?: string; comment: string }): Promise<{ success: boolean }> =>
    request<{ success: boolean }>(`/incidents/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getUnreadAlerts: (): Promise<Alert[]> =>
    request<Alert[]>('/alerts/unread'),

  acknowledgeAlert: (id: number): Promise<{ success: boolean }> =>
    request<{ success: boolean }>(`/alerts/${id}/acknowledge`, {
      method: 'POST',
    }),

  getNotificationPreferences: (userId?: number): Promise<NotificationPreference> =>
    request<NotificationPreference>(`/notifications/preferences${userId ? `?userId=${userId}` : ''}`),

  saveNotificationPreferences: (prefs: NotificationPreference): Promise<{ success: boolean }> =>
    request<{ success: boolean }>('/notifications/preferences', {
      method: 'POST',
      body: JSON.stringify(prefs),
    }),
"""

if "getIncidentTimeline" not in fe_api:
    # Add imports to top if needed
    if "IncidentTimelineEntry" not in fe_api:
        fe_api = fe_api.replace("import type {", "import type {\n  Incident,\n  IncidentTimelineEntry,\n  Alert,\n  NotificationPreference,")
    # Insert methods before closing brace of api object
    last_brace = fe_api.rfind("};")
    fe_api = fe_api[:last_brace] + phase10_api_methods + "\n" + fe_api[last_brace:]
    with open("frontend/src/services/api.ts", "w", encoding="utf-8") as f:
        f.write(fe_api)

print("Updated frontend/src/types/index.ts and frontend/src/services/api.ts for Phase 10")
