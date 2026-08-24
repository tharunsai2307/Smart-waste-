#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <assert.h>
#include "types.h"
#include "config.h"
#include "user.h"
#include "hub.h"
#include "alert.h"

int main() {
    printf("==================================================\n");
    printf("   TESTING PHASE 2 LOCAL COLLECTION HUB & INVENTORY\n");
    printf("==================================================\n\n");

    initUsersData();
    initHubData();
    initAlertsData();

    // 1. Create a Master Admin
    User admin;
    memset(&admin, 0, sizeof(User));
    admin.userId = 1;
    strcpy(admin.username, "admin");
    strcpy(admin.name, "Master Admin");
    strcpy(admin.password, "admin123");
    admin.role = ROLE_ADMIN;
    admin.status = 1;
    addUser(&admin);

    // 2. Create a Local Hub Manager
    User manager;
    memset(&manager, 0, sizeof(User));
    manager.userId = 2;
    strcpy(manager.username, "hubmanager01");
    strcpy(manager.name, "Hub Manager One");
    strcpy(manager.password, "manager123");
    manager.role = ROLE_LOCAL_HUB_MANAGER;
    manager.status = 1;
    addUser(&manager);

    // 3. Create a Local Hub (1000kg capacity, 75% warning, 90% critical)
    LocalHub hub;
    memset(&hub, 0, sizeof(LocalHub));
    strcpy(hub.hubCode, "TEST-HUB-01");
    strcpy(hub.name, "Test Central Hub");
    strcpy(hub.address, "123 Eco Road");
    hub.latitude = 12.9716;
    hub.longitude = 77.5946;
    hub.maximumCapacityKg = 1000.0f;
    hub.warningThresholdPercent = 75.0f;
    hub.criticalThresholdPercent = 90.0f;
    hub.managerId = 2;

    int created = addHub(&hub);
    printf("[1] Hub Creation: %s (ID: %d, Capacity: %.1f kg)\n", created ? "SUCCESS" : "FAILED", hub.hubId, hub.maximumCapacityKg);
    assert(created == 1);

    // 4. Initial Capacity Check
    float initialLoad = calculateHubCurrentLoad(hub.hubId);
    printf("[2] Initial Hub Load: %.2f kg (Expected 0.00 kg)\n", initialLoad);
    assert(initialLoad == 0.0f);

    // 5. Inbound Collection of 600kg (60% -> NORMAL)
    HubInventoryTransaction t1;
    memset(&t1, 0, sizeof(HubInventoryTransaction));
    t1.hubId = hub.hubId;
    strcpy(t1.transactionType, "INBOUND_COLLECTION");
    t1.quantityKg = 600.0f;
    strcpy(t1.wasteType, "Organic Waste");
    strcpy(t1.sourceType, "CLEANER");
    t1.sourceId = 101;
    strcpy(t1.measurementSource, "DIGITAL_SCALE");

    char err[256] = "";
    int res1 = recordHubTransaction(&t1, 0, 2, err, sizeof(err));
    float load1 = calculateHubCurrentLoad(hub.hubId);
    HubStatus status1 = deriveHubStatus(load1, hub.maximumCapacityKg, hub.warningThresholdPercent, hub.criticalThresholdPercent);
    printf("[3] Inbound 600kg: %s -> Current Load: %.1f kg (%.1f%%) | Status: %s\n",
           res1 ? "ACCEPTED" : "REJECTED", load1, (load1 / hub.maximumCapacityKg) * 100.0f, hubStatusToStr(status1));
    assert(res1 == 1);
    assert(load1 == 600.0f);
    assert(status1 == HUB_NORMAL);

    // 6. Inbound Collection of 200kg (Total 800kg = 80% -> WARNING threshold >= 75%)
    HubInventoryTransaction t2;
    memset(&t2, 0, sizeof(HubInventoryTransaction));
    t2.hubId = hub.hubId;
    strcpy(t2.transactionType, "INBOUND_COLLECTION");
    t2.quantityKg = 200.0f;
    strcpy(t2.wasteType, "Plastic Recyclables");
    strcpy(t2.sourceType, "CLEANER");
    t2.sourceId = 102;
    strcpy(t2.measurementSource, "DIGITAL_SCALE");

    int res2 = recordHubTransaction(&t2, 0, 2, err, sizeof(err));
    float load2 = calculateHubCurrentLoad(hub.hubId);
    HubStatus status2 = deriveHubStatus(load2, hub.maximumCapacityKg, hub.warningThresholdPercent, hub.criticalThresholdPercent);
    printf("[4] Inbound 200kg: %s -> Current Load: %.1f kg (%.1f%%) | Status: %s (Triggered Warning!)\n",
           res2 ? "ACCEPTED" : "REJECTED", load2, (load2 / hub.maximumCapacityKg) * 100.0f, hubStatusToStr(status2));
    assert(res2 == 1);
    assert(load2 == 800.0f);
    assert(status2 == HUB_WARNING);

    // 7. Overflow Attempt: Inbound 300kg without override (800 + 300 = 1100kg > 1000kg) -> MUST BE REJECTED!
    HubInventoryTransaction t3;
    memset(&t3, 0, sizeof(HubInventoryTransaction));
    t3.hubId = hub.hubId;
    strcpy(t3.transactionType, "INBOUND_COLLECTION");
    t3.quantityKg = 300.0f;
    strcpy(t3.wasteType, "Mixed Solid Waste");
    strcpy(t3.sourceType, "CLEANER");
    t3.sourceId = 103;
    strcpy(t3.measurementSource, "DIGITAL_SCALE");

    int res3 = recordHubTransaction(&t3, 0, 2, err, sizeof(err));
    float load3 = calculateHubCurrentLoad(hub.hubId);
    printf("[5] Attempt Overflow (300kg without override): %s | Error Msg: '%s'\n",
           res3 ? "ACCEPTED (UNEXPECTED)" : "REJECTED (AS EXPECTED)", err);
    assert(res3 == 0); // Must be rejected
    assert(load3 == 800.0f); // Load must remain unchanged

    // 8. Emergency Override: Inbound 300kg with emergencyOverride = 1 -> ACCEPTED
    int res4 = recordHubTransaction(&t3, 1, 2, err, sizeof(err));
    float load4 = calculateHubCurrentLoad(hub.hubId);
    HubStatus status4 = deriveHubStatus(load4, hub.maximumCapacityKg, hub.warningThresholdPercent, hub.criticalThresholdPercent);
    printf("[6] Inbound 300kg WITH Emergency Override: %s -> Current Load: %.1f kg (%.1f%%) | Status: %s\n",
           res4 ? "ACCEPTED" : "REJECTED", load4, (load4 / hub.maximumCapacityKg) * 100.0f, hubStatusToStr(status4));
    assert(res4 == 1);
    assert(load4 == 1100.0f);
    assert(status4 == HUB_AT_CAPACITY);

    // 9. Outbound Transfer: 500kg transferred to Recycling Facility -> Inventory MUST decrease by 500kg
    HubInventoryTransaction tOut;
    memset(&tOut, 0, sizeof(HubInventoryTransaction));
    tOut.hubId = hub.hubId;
    strcpy(tOut.transactionType, "OUTBOUND_TRANSFER");
    tOut.quantityKg = 500.0f;
    strcpy(tOut.wasteType, "Mixed Solid Waste");
    strcpy(tOut.destinationType, "RECYCLING_FACILITY");
    tOut.destinationId = 1;
    strcpy(tOut.measurementSource, "SCALE_WEIGHBRIDGE");

    int resOut = recordHubTransaction(&tOut, 0, 2, err, sizeof(err));
    float loadFinal = calculateHubCurrentLoad(hub.hubId);
    HubStatus statusFinal = deriveHubStatus(loadFinal, hub.maximumCapacityKg, hub.warningThresholdPercent, hub.criticalThresholdPercent);
    printf("[7] Outbound Transfer 500kg: %s -> New Load: %.1f kg (%.1f%%) | Status: %s\n",
           resOut ? "ACCEPTED" : "REJECTED", loadFinal, (loadFinal / hub.maximumCapacityKg) * 100.0f, hubStatusToStr(statusFinal));
    assert(resOut == 1);
    assert(loadFinal == 600.0f); // 1100 - 500 = 600kg
    assert(statusFinal == HUB_NORMAL);

    printf("\n>>> ALL PHASE 2 C CORE INVENTORY & CAPACITY TESTS PASSED SUCCESSFULLY! <<<\n");
    return 0;
}
