#include "types.h"
#include "user.h"
#include "vehicle.h"
#include "facility.h"
#include "transfer.h"
#include "hub.h"
#include "utils.h"
#include "config.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <assert.h>

void test_vehicle_compliance() {
    printf("[TEST 1] Testing Vehicle Compliance Logic...\n");
    Vehicle v;
    memset(&v, 0, sizeof(Vehicle));
    v.vehicleId = 771;
    strcpy(v.vehicleCode, "VEH-TEST-001");
    strcpy(v.registrationNumber, "DL-01-AB-1234");
    v.capacityKg = 5000.0f;
    v.status = VEHICLE_AVAILABLE;
    
    // Set dates in future
    strcpy(v.insuranceExpiry, "2028-12-31");
    strcpy(v.inspectionExpiry, "2028-12-31");
    strcpy(v.lastServiceDate, "2026-01-01");
    
    char note[256] = {0};
    int compliant = isVehicleCompliant(&v, note, sizeof(note));
    assert(compliant == 1);
    
    // Expiry check - set insurance in past
    strcpy(v.insuranceExpiry, "2024-01-01");
    compliant = isVehicleCompliant(&v, note, sizeof(note));
    assert(compliant == 0);
    assert(strstr(note, "expired") != NULL || strstr(note, "Insurance") != NULL);
    
    // Reset insurance, set inspection in past
    strcpy(v.insuranceExpiry, "2028-12-31");
    strcpy(v.inspectionExpiry, "2024-01-01");
    compliant = isVehicleCompliant(&v, note, sizeof(note));
    assert(compliant == 0);
    assert(strstr(note, "expired") != NULL || strstr(note, "Inspection") != NULL);

    printf("  \xe2\x9c\x93 Vehicle compliance audit engine passed.\n");
}

void test_transfer_state_machine() {
    printf("[TEST 2] Testing Transfer State Machine Transitions...\n");
    
    // Valid progression
    assert(isValidTransferTransition(TRANSFER_REQUESTED, TRANSFER_APPROVED) == 1);
    assert(isValidTransferTransition(TRANSFER_APPROVED, TRANSFER_DRIVER_ASSIGNED) == 1);
    assert(isValidTransferTransition(TRANSFER_DRIVER_ASSIGNED, TRANSFER_VEHICLE_ASSIGNED) == 1);
    assert(isValidTransferTransition(TRANSFER_VEHICLE_ASSIGNED, TRANSFER_DRIVER_CHECKED_IN) == 1);
    assert(isValidTransferTransition(TRANSFER_DRIVER_CHECKED_IN, TRANSFER_LOADING) == 1);
    assert(isValidTransferTransition(TRANSFER_LOADING, TRANSFER_LOADED) == 1);
    assert(isValidTransferTransition(TRANSFER_LOADED, TRANSFER_DEPARTED) == 1);
    assert(isValidTransferTransition(TRANSFER_DEPARTED, TRANSFER_EN_ROUTE) == 1);
    assert(isValidTransferTransition(TRANSFER_EN_ROUTE, TRANSFER_ARRIVED) == 1);
    assert(isValidTransferTransition(TRANSFER_ARRIVED, TRANSFER_UNLOADING) == 1);
    assert(isValidTransferTransition(TRANSFER_UNLOADING, TRANSFER_DELIVERED) == 1);
    assert(isValidTransferTransition(TRANSFER_DELIVERED, TRANSFER_COMPLETED) == 1);

    // Cancel transitions
    assert(isValidTransferTransition(TRANSFER_REQUESTED, TRANSFER_CANCELLED) == 1);
    assert(isValidTransferTransition(TRANSFER_APPROVED, TRANSFER_CANCELLED) == 1);
    assert(isValidTransferTransition(TRANSFER_VEHICLE_ASSIGNED, TRANSFER_CANCELLED) == 1);
    assert(isValidTransferTransition(TRANSFER_LOADED, TRANSFER_CANCELLED) == 0); // Cannot cancel after inventory deduction

    // Invalid steps (e.g. Requested directly to loaded or completed)
    assert(isValidTransferTransition(TRANSFER_REQUESTED, TRANSFER_LOADED) == 0);
    assert(isValidTransferTransition(TRANSFER_REQUESTED, TRANSFER_COMPLETED) == 0);

    printf("  \xe2\x9c\x93 Strict state machine successfully guards transport transitions.\n");
}

void test_sorting_and_variance() {
    printf("[TEST 3] Testing Priority Sorting and Variance Calculations...\n");

    // Sorting test
    WasteTransfer arr[4];
    memset(arr, 0, sizeof(arr));
    
    strcpy(arr[0].priority, "LOW");
    arr[0].transferId = 1;
    
    strcpy(arr[1].priority, "URGENT");
    arr[1].transferId = 2;
    
    strcpy(arr[2].priority, "HIGH");
    arr[2].transferId = 3;
    
    strcpy(arr[3].priority, "NORMAL");
    arr[3].transferId = 4;

    sortTransfersByPriority(arr, 4);
    
    // Sort expectation: URGENT (2), HIGH (3), NORMAL (4), LOW (1)
    assert(arr[0].transferId == 2);
    assert(arr[1].transferId == 3);
    assert(arr[2].transferId == 4);
    assert(arr[3].transferId == 1);

    // Variance calculations
    float loadVar = calculateLoadVariancePct(100.0f, 105.0f);
    assert(loadVar == 5.0f);

    float loadVarNeg = calculateLoadVariancePct(100.0f, 90.0f);
    assert(loadVarNeg == 10.0f);

    float deliveryVar = calculateDeliveryVarianceKg(1000.0f, 995.0f);
    assert(deliveryVar == 5.0f);

    printf("  \xe2\x9c\x93 Sorting and variance calculations correct.\n");
}

int main() {
    printf("====================================================\n");
    printf("        SMART WASTE OPERATIONS - PHASE 4 UNIT TESTS \n");
    printf("====================================================\n");

    test_vehicle_compliance();
    test_transfer_state_machine();
    test_sorting_and_variance();

    printf("\n\xe2\x9c\x93 ALL Operations Unit Tests Passed successfully!\n");
    return 0;
}
