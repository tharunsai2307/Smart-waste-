#include <stdio.h>
#include <assert.h>
#include <string.h>
#include "qr.h"
#include "types.h"

void test_qr_parsing() {
    char type[30];
    int entityId;
    
    // Test Vehicle QR
    assert(parseQRCode("VEHICLE:V123:45", type, &entityId) == 1);
    assert(strcmp(type, "VEHICLE") == 0);
    assert(entityId == 45);
    
    // Test Stop QR
    assert(parseQRCode("STOP:10:55", type, &entityId) == 1);
    assert(strcmp(type, "STOP") == 0);
    assert(entityId == 55); // The logic in qr.c strips routeId correctly
    
    // Invalid
    assert(parseQRCode("INVALIDQR", type, &entityId) == 0);
}

void test_qr_validation() {
    char reason[150] = "";
    
    // Success Vehicle
    assert(validateQRCode("VEHICLE:V123:45", 1, 45, 10, 0, reason) == QR_SUCCESS);
    
    // Fail Vehicle (wrong vehicle)
    assert(validateQRCode("VEHICLE:V123:45", 1, 99, 10, 0, reason) == QR_FAILED);
    assert(strstr(reason, "Vehicle does not match") != NULL);
    
    // Success Hub
    assert(validateQRCode("HUB:H01:5", 1, 45, 10, 5, reason) == QR_SUCCESS);
    
    // Fail Hub
    assert(validateQRCode("HUB:H01:5", 1, 45, 10, 2, reason) == QR_FAILED);
    assert(strstr(reason, "location does not match") != NULL);
}

int main() {
    printf("Running Phase 8 Tests...\n");
    test_qr_parsing();
    test_qr_validation();
    printf("All Phase 8 tests passed!\n");
    return 0;
}
