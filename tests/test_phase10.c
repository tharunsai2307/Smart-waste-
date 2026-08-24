#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <assert.h>
#include "alert_engine.h"
#include "alert.h"
#include "incident.h"
#include "utils.h"

static void cleanPhase10Files() {
    remove("data/alerts.dat");
    remove("data/incidents.dat");
    remove("data/incident_timeline.dat");
    remove("data/notification_preferences.dat");
    initAlertEngine();
}

void test_incident_lifecycle_state_machine() {
    printf("Testing Incident Lifecycle State Machine...\n");

    // 1. Create Incident
    int incId = createOperationalIncident("HUB_OVERFLOW", "CRITICAL", "HUB", 1, 1, 0, 0, 0, 1, "LOCAL_HUB_MANAGER", "Hub 1 at 95% capacity");
    assert(incId > 0);

    Incident inc;
    assert(getIncidentById(incId, &inc) == 1);
    assert(strcmp(inc.status, "OPEN") == 0);
    assert(strcmp(inc.severity, "CRITICAL") == 0);
    assert(inc.hubId == 1);

    // 2. Acknowledge Incident
    assert(acknowledgeIncident(incId, 2, "LOCAL_HUB_MANAGER", "Acknowledged, reviewing outbound trucks") == 1);
    assert(getIncidentById(incId, &inc) == 1);
    assert(strcmp(inc.status, "ACKNOWLEDGED") == 0);
    assert(strlen(inc.acknowledgedAt) > 0);

    // 3. Assign Incident
    assert(assignIncident(incId, 1, "ADMIN", 5, "DRIVER", "Assigned Driver 5 for emergency dispatch") == 1);
    assert(getIncidentById(incId, &inc) == 1);
    assert(strcmp(inc.status, "ASSIGNED") == 0);
    assert(inc.assignedTo == 5);
    assert(strcmp(inc.assignedRole, "DRIVER") == 0);

    // 4. Investigate Incident
    assert(investigateIncident(incId, 5, "DRIVER", "Driver 5 en route to hub") == 1);
    assert(getIncidentById(incId, &inc) == 1);
    assert(strcmp(inc.status, "INVESTIGATING") == 0);

    // 5. Action Taken
    assert(actionIncident(incId, 5, "DRIVER", "Loaded 1200kg waste to vehicle VEH-002", "Transfer TX-001 started") == 1);
    assert(getIncidentById(incId, &inc) == 1);
    assert(strcmp(inc.status, "ACTION_REQUIRED") == 0);

    // 6. Resolve Incident
    assert(resolveIncidentWithAudit(incId, 2, "LOCAL_HUB_MANAGER", "Hub load reduced to 55%. Operational normal.") == 1);
    assert(getIncidentById(incId, &inc) == 1);
    assert(strcmp(inc.status, "RESOLVED") == 0);
    assert(strlen(inc.resolvedAt) > 0);

    // 7. Close Incident
    assert(closeIncident(incId, 1, "ADMIN", "Verified by dispatch command. Closed.") == 1);
    assert(getIncidentById(incId, &inc) == 1);
    assert(strcmp(inc.status, "CLOSED") == 0);
    assert(strlen(inc.closedAt) > 0);

    // 8. Test Invalid Transition: Cannot acknowledge or investigate a CLOSED incident
    assert(acknowledgeIncident(incId, 2, "LOCAL_HUB_MANAGER", "Invalid ack") == 0);
    assert(investigateIncident(incId, 5, "DRIVER", "Invalid inv") == 0);

    // 9. Reopen Incident
    assert(reopenIncident(incId, 1, "ADMIN", "Hub inventory jumped back to 92%") == 1);
    assert(getIncidentById(incId, &inc) == 1);
    assert(strcmp(inc.status, "OPEN") == 0);
    assert(inc.escalationLevel > 0);

    // 10. Check Timeline Entries
    IncidentTimelineEntry timeline[20];
    int count = getIncidentTimeline(incId, timeline, 20);
    assert(count >= 7); // CREATED, ACKNOWLEDGED, ASSIGNED, INVESTIGATING, ACTION_TAKEN, RESOLVED, CLOSED, REOPENED
    printf("-> Incident State Machine tests passed! (%d timeline events recorded)\n", count);
}

void test_alert_deduplication() {
    printf("Testing Alert & Incident Deduplication...\n");

    generateAlert("HUB_CAPACITY", 10, "Hub 10 capacity warning");
    // Duplicate call should be ignored
    generateAlert("HUB_CAPACITY", 10, "Hub 10 capacity warning duplicate");

    FILE *fp = fopen(ALERTS_FILE, "rb");
    assert(fp != NULL);
    Alert a;
    int alertCount = 0;
    while (fread(&a, sizeof(Alert), 1, fp) == 1) {
        if (a.referenceId == 10 && strcmp(a.type, "HUB_CAPACITY") == 0) {
            alertCount++;
        }
    }
    fclose(fp);
    assert(alertCount == 1);

    // Incident deduplication
    int id1 = createOperationalIncident("HUB_CAPACITY", "MEDIUM", "HUB", 10, 10, 0, 0, 0, 1, "LOCAL_HUB_MANAGER", "Hub 10 warning");
    int id2 = createOperationalIncident("HUB_CAPACITY", "MEDIUM", "HUB", 10, 10, 0, 0, 0, 1, "LOCAL_HUB_MANAGER", "Hub 10 duplicate");
    assert(id1 > 0);
    assert(id2 == 0); // Blocked duplicate
    printf("-> Alert & Incident Deduplication tests passed!\n");
}

void test_notification_preferences() {
    printf("Testing Notification Preferences...\n");
    NotificationPreference prefs;
    assert(getNotificationPreferences(42, &prefs) == 1);
    assert(prefs.userId == 42);
    assert(prefs.criticalAlerts == 1);

    prefs.hubAlerts = 0;
    prefs.vehicleAlerts = 1;
    assert(saveNotificationPreferences(&prefs) == 1);

    NotificationPreference loaded;
    assert(getNotificationPreferences(42, &loaded) == 1);
    assert(loaded.userId == 42);
    assert(loaded.hubAlerts == 0);
    assert(loaded.vehicleAlerts == 1);
    printf("-> Notification Preferences tests passed!\n");
}

void test_operational_evaluation_rules() {
    printf("Testing Operational Rule Evaluation Cycle...\n");
    // Evaluation cycle runs without crashing
    runAlertEvaluationCycle();
    printf("-> Operational Evaluation Cycle executed cleanly!\n");
}

int main() {
    printf("============================================================\n");
    printf("RUNNING PHASE 10 INCIDENT RESPONSE & ALERT ENGINE TESTS\n");
    printf("============================================================\n");

    cleanPhase10Files();
    test_incident_lifecycle_state_machine();
    test_alert_deduplication();
    test_notification_preferences();
    test_operational_evaluation_rules();

    printf("============================================================\n");
    printf("ALL PHASE 10 TESTS PASSED SUCCESSFULLY!\n");
    printf("============================================================\n");
    return 0;
}
