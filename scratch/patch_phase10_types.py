with open("include/config.h", "r", encoding="utf-8") as f:
    cfg = f.read()

if "INCIDENT_TIMELINE_FILE" not in cfg:
    cfg = cfg.replace("#endif", "\n// Phase 10: Incident Timeline & Notifications\n#define INCIDENT_TIMELINE_FILE \"data/incident_timeline.dat\"\n#define NOTIFICATION_PREFS_FILE \"data/notification_preferences.dat\"\n\n#endif")
    with open("include/config.h", "w", encoding="utf-8") as f:
        f.write(cfg)

with open("include/types.h", "r", encoding="utf-8") as f:
    types = f.read()

# Update Incident struct
old_incident = """typedef struct {
    int incidentId;
    char type[40];
    char severity[20];
    int collectionId;
    int reportedBy;
    int assignedTo;
    char status[20];
    char description[250];
    char createdAt[30];
    char resolvedAt[30];
} Incident;"""

new_incident = """typedef struct {
    int incidentId;
    char type[40];
    char severity[20];
    int collectionId;
    int reportedBy;
    int assignedTo;
    char status[20];
    char description[250];
    char createdAt[30];
    char resolvedAt[30];
    char entityType[30];
    int entityId;
    int hubId;
    int vehicleId;
    int routeId;
    int facilityId;
    char assignedRole[30];
    char acknowledgedAt[30];
    char closedAt[30];
    int escalationLevel;
} Incident;

typedef struct {
    int timelineId;
    int incidentId;
    char timestamp[32];
    int actorId;
    char actorRole[32];
    char action[40];
    char previousStatus[20];
    char newStatus[20];
    char comment[256];
    char evidenceRef[64];
} IncidentTimelineEntry;

typedef struct {
    int userId;
    int criticalAlerts;
    int highSeverityAlerts;
    int assignedIncidentsOnly;
    int hubAlerts;
    int vehicleAlerts;
    int collectionExceptions;
    int recyclingExceptions;
} NotificationPreference;"""

if "IncidentTimelineEntry" not in types:
    types = types.replace(old_incident, new_incident)
    with open("include/types.h", "w", encoding="utf-8") as f:
        f.write(types)

print("Patched include/config.h and include/types.h for Phase 10")
