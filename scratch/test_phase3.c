#include "types.h"
#include "user.h"
#include "collection.h"
#include "hub.h"
#include "incident.h"
#include "alert.h"
#include "utils.h"
#include "config.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <assert.h>

void test_security_and_hashing() {
    printf("[TEST 1] Testing Salted SHA-256 Password Hashing...\n");
    char hash1[100] = {0};
    char hash2[100] = {0};
    hashPassword("SecretPass123!", hash1);
    hashPassword("SecretPass123!", hash2);
    assert(strcmp(hash1, hash2) == 0);
    assert(strlen(hash1) == 64); // SHA-256 produces 64 hex characters

    char diffHash[100] = {0};
    hashPassword("DifferentPass!", diffHash);
    assert(strcmp(hash1, diffHash) != 0);

    // Verify user login validation
    User testU;
    memset(&testU, 0, sizeof(User));
    testU.userId = 999;
    strcpy(testU.username, "test_cleaner_p3");
    strcpy(testU.password, "Pass456!");
    strcpy(testU.name, "Test Cleaner");
    testU.role = ROLE_CLEANER;
    testU.status = 1; // Active
    testU.assignedHub = 1;
    addUser(&testU);

    User logged;
    int res = validateLogin("test_cleaner_p3", "Pass456!", &logged);
    assert(res == 1);
    assert(logged.userId == 999);

    // Locked user test
    testU.status = 0;
    updateUser(&testU);
    res = validateLogin("test_cleaner_p3", "Pass456!", &logged);
    assert(res == -2); // Locked account rejected
    testU.status = 1;
    updateUser(&testU);

    printf("  \xe2\x9c\x93 Password hashing and account locking verified.\n");
}

void test_priority_engine() {
    printf("[TEST 2] Testing C Priority Engine...\n");
    char level[20] = {0};
    int normalScore = calculateCollectionPriorityScore("NORMAL", "PLASTIC", 10.0f, 0, 0, level, sizeof(level));
    assert(strcmp(level, "NORMAL") == 0 || strcmp(level, "HIGH") == 0);

    int urgentScore = calculateCollectionPriorityScore("URGENT", "E_WASTE", 50.0f, 3, 1, level, sizeof(level));
    assert(urgentScore >= 80);
    assert(strcmp(level, "URGENT") == 0);

    printf("  \xe2\x9c\x93 Priority engine computed scores: Normal=%d, Urgent=%d (%s).\n", normalScore, urgentScore, level);
}

void test_state_machine() {
    printf("[TEST 3] Testing Strict State Machine Transitions...\n");
    // Invalid transitions
    assert(!isValidStateTransition(COLLECTION_REQUESTED, COLLECTION_COMPLETED));
    assert(!isValidStateTransition(COLLECTION_REQUESTED, COLLECTION_ARRIVED));
    assert(!isValidStateTransition(COLLECTION_ASSIGNED, COLLECTION_COMPLETED));
    assert(!isValidStateTransition(COLLECTION_COMPLETED, COLLECTION_REQUESTED));

    // Valid progression
    assert(isValidStateTransition(COLLECTION_REQUESTED, COLLECTION_ASSIGNED));
    assert(isValidStateTransition(COLLECTION_ASSIGNED, COLLECTION_EN_ROUTE));
    assert(isValidStateTransition(COLLECTION_EN_ROUTE, COLLECTION_ARRIVED));
    assert(isValidStateTransition(COLLECTION_ARRIVED, COLLECTION_COLLECTING));
    assert(isValidStateTransition(COLLECTION_COLLECTING, COLLECTION_COLLECTED));
    assert(isValidStateTransition(COLLECTION_COLLECTED, COLLECTION_COMPLETED));

    printf("  \xe2\x9c\x93 Strict state machine successfully blocks invalid leaps.\n");
}

void test_end_to_end_field_ops_and_hub_deposit() {
    printf("[TEST 4] Testing End-to-End Collection, Weight, QR Scan & Hub Deposit...\n");
    
    // Create test hub
    LocalHub hub;
    memset(&hub, 0, sizeof(LocalHub));
    strcpy(hub.hubCode, "HUB-TEST-3");
    strcpy(hub.name, "Phase 3 Central Hub");
    hub.maximumCapacityKg = 500.0f;
    hub.warningThresholdPercent = 75.0f;
    hub.criticalThresholdPercent = 90.0f;
    hub.status = HUB_NORMAL;
    hub.managerId = 2;
    addHub(&hub);
    int targetHubId = hub.hubId;

    // Create cleaner assigned to this hub
    deleteUser(888);
    User cleaner;
    memset(&cleaner, 0, sizeof(User));
    cleaner.userId = 888;
    strcpy(cleaner.username, "cleaner_bob_p3");
    strcpy(cleaner.name, "Bob Cleaner");
    strcpy(cleaner.password, "PassBob123!");
    cleaner.role = ROLE_CLEANER;
    cleaner.status = 1;
    cleaner.assignedHub = targetHubId;
    addUser(&cleaner);
    int cleanerId = 888;

    // 1. Resident creates collection request
    CollectionRequest req;
    memset(&req, 0, sizeof(CollectionRequest));
    req.residentId = 101;
    req.hubId = targetHubId;
    strcpy(req.address, "77 Palm Grove Road");
    req.latitude = 13.0827;
    req.longitude = 80.2707;
    strcpy(req.wasteType, "MIXED");
    req.estimatedWeightKg = 40.0f;
    strcpy(req.preferredDate, "2026-08-25");
    strcpy(req.preferredTime, "Morning");
    addCollectionRequest(&req);
    int collId = req.collectionId;
    assert(collId > 0);
    assert(req.status == COLLECTION_REQUESTED);

    // 2. Manager assigns cleaner
    char errMsg[256] = "";
    float workload = 0.0f;
    int canAssign = canAssignCleanerToCollection(cleanerId, targetHubId, &workload, errMsg, sizeof(errMsg));
    if (!canAssign) {
        printf("[DEBUG] canAssignCleanerToCollection failed: '%s'\n", errMsg);
        fflush(stdout);
    }
    assert(canAssign);
    req.cleanerId = cleanerId;
    req.status = COLLECTION_ASSIGNED;
    updateCollectionRequest(&req);

    // 3. Cleaner progresses states
    req.status = COLLECTION_EN_ROUTE;
    updateCollectionRequest(&req);
    req.status = COLLECTION_ARRIVED;
    updateCollectionRequest(&req);
    req.status = COLLECTION_COLLECTING;
    updateCollectionRequest(&req);

    // 4. Cleaner records actual weight & confirms waste type
    req.actualWeightKg = 42.0f;
    strcpy(req.measurementSource, "MANUAL_SCALE");
    strcpy(req.wasteType, "ORGANIC"); // Correction
    req.status = COLLECTION_COLLECTED;
    updateCollectionRequest(&req);

    // 5. Test Deposit Failure Cases
    // Wrong Hub QR
    int depRes = processHubDeposit(collId, cleanerId, "HUB:HUB-WRONG:999", 42.0f, "", 0, errMsg, sizeof(errMsg));
    assert(!depRes);
    printf("  \xe2\x9c\x93 Wrong Hub QR rejected correctly: '%s'\n", errMsg);

    // Wrong Cleaner
    char validQr[64];
    snprintf(validQr, sizeof(validQr), "HUB:%s:%d", hub.hubCode, targetHubId);
    depRes = processHubDeposit(collId, 777, validQr, 42.0f, "", 0, errMsg, sizeof(errMsg));
    assert(!depRes);
    printf("  \xe2\x9c\x93 Wrong cleaner deposit rejected correctly: '%s'\n", errMsg);

    // Zero / Negative weight
    depRes = processHubDeposit(collId, cleanerId, validQr, 0.0f, "", 0, errMsg, sizeof(errMsg));
    assert(!depRes);

    // 6. Valid Hub Deposit with QR
    float initialLoad = calculateHubCurrentLoad(targetHubId);
    depRes = processHubDeposit(collId, cleanerId, validQr, 42.0f, "Slight variance", 0, errMsg, sizeof(errMsg));
    if (!depRes) {
        printf("[DEBUG] processHubDeposit failed: '%s'\n", errMsg);
        fflush(stdout);
    }
    assert(depRes);

    // Verify Collection is COMPLETED
    CollectionRequest verified;
    getCollectionRequestById(collId, &verified);
    assert(verified.status == COLLECTION_COMPLETED);
    assert(verified.depositedWeightKg == 42.0f);
    assert(strlen(verified.completedAt) > 0);

    // Verify Phase 2 Hub Inventory increased
    float newLoad = calculateHubCurrentLoad(targetHubId);
    assert(newLoad == initialLoad + 42.0f);

    printf("  \xe2\x9c\x93 Valid QR deposit completed, Phase 2 Hub Inventory increased by 42kg (New Load: %.1fkg).\n", newLoad);
}

void test_missed_collection_and_incidents() {
    printf("[TEST 5] Testing Missed Collection & Incident Reporting...\n");
    
    CollectionRequest req;
    memset(&req, 0, sizeof(CollectionRequest));
    req.residentId = 101;
    req.hubId = 1001;
    strcpy(req.address, "12 Riverbank St");
    req.estimatedWeightKg = 15.0f;
    strcpy(req.wasteType, "PLASTIC");
    addCollectionRequest(&req);

    // Report missed
    req.status = COLLECTION_MISSED;
    updateCollectionRequest(&req);

    Incident inc;
    memset(&inc, 0, sizeof(Incident));
    strcpy(inc.type, "MISSED_COLLECTION");
    strcpy(inc.severity, "HIGH");
    inc.collectionId = req.collectionId;
    inc.reportedBy = 101;
    inc.assignedTo = 2;
    strcpy(inc.description, "Cleaner did not arrive at scheduled window");
    int incRes = addIncident(&inc);
    assert(incRes);
    assert(inc.incidentId > 0);

    // Query incidents
    Incident list[10];
    int count = getAllIncidents(list, 10);
    assert(count > 0);

    // Resolve incident
    int resRes = resolveIncident(inc.incidentId, "Rescheduled for tomorrow morning");
    assert(resRes);

    Incident resolvedInc;
    getIncidentById(inc.incidentId, &resolvedInc);
    assert(strcmp(resolvedInc.status, "RESOLVED") == 0);
    assert(strlen(resolvedInc.resolvedAt) > 0);

    printf("  \xe2\x9c\x93 Missed collection incident created, queried, and resolved successfully.\n");
}

int main() {
    printf("\n======================================================\n");
    printf("   SMART WASTE MANAGEMENT — PHASE 3 TEST SUITE        \n");
    printf("======================================================\n\n");

    test_security_and_hashing();
    test_priority_engine();
    test_state_machine();
    test_end_to_end_field_ops_and_hub_deposit();
    test_missed_collection_and_incidents();

    printf("\n======================================================\n");
    printf("  \xe2\x9c\x94 ALL PHASE 1 & 3 TESTS PASSED SUCCESSFULLY!       \n");
    printf("======================================================\n\n");
    return 0;
}
