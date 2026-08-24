#ifndef ALERT_ENGINE_H
#define ALERT_ENGINE_H

#include "types.h"
#include "config.h"

// ─────────────────────────────────────────────────────────
// EVALUATION ENGINE
// ─────────────────────────────────────────────────────────

void initAlertEngine();
void evaluateHubAlerts();
void evaluateCollectionAlerts();
void evaluateVehicleAlerts();
void evaluateRouteAlerts();
void evaluateTransferAlerts();
void evaluateRecyclingAlerts();
void evaluateQRAlerts();
void evaluateIncidentEscalation();
void runAlertEvaluationCycle();

// ─────────────────────────────────────────────────────────
// INCIDENT LIFECYCLE STATE MACHINE & AUDIT
// ─────────────────────────────────────────────────────────

int createOperationalIncident(const char* type, const char* severity, 
                              const char* entityType, int entityId,
                              int hubId, int vehicleId, int routeId, int facilityId,
                              int reportedBy, const char* assignedRole, const char* description);

int acknowledgeIncident(int incId, int actorId, const char* actorRole, const char* note);
int assignIncident(int incId, int actorId, const char* actorRole, int assignToUserId, const char* targetRole, const char* note);
int investigateIncident(int incId, int actorId, const char* actorRole, const char* note);
int actionIncident(int incId, int actorId, const char* actorRole, const char* actionTaken, const char* note);
int resolveIncidentWithAudit(int incId, int actorId, const char* actorRole, const char* note);
int closeIncident(int incId, int actorId, const char* actorRole, const char* note);
int reopenIncident(int incId, int actorId, const char* actorRole, const char* note);

int addIncidentComment(int incId, int actorId, const char* actorRole, const char* comment);
int getIncidentTimeline(int incId, IncidentTimelineEntry* list, int maxCount);

// ─────────────────────────────────────────────────────────
// NOTIFICATION PREFERENCES
// ─────────────────────────────────────────────────────────

int getNotificationPreferences(int userId, NotificationPreference* prefs);
int saveNotificationPreferences(const NotificationPreference* prefs);

#endif // ALERT_ENGINE_H
