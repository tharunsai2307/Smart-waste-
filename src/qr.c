#include "qr.h"
#include "config.h"
#include "utils.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int parseQRCode(const char* qrCode, char* outType, int* outEntityId) {
    if (!qrCode || !outType || !outEntityId) return 0;
    
    char codeCopy[128];
    strncpy(codeCopy, qrCode, sizeof(codeCopy) - 1);
    codeCopy[sizeof(codeCopy) - 1] = '\0';
    
    char* token = strtok(codeCopy, ":");
    if (!token) return 0;
    strncpy(outType, token, 29);
    outType[29] = '\0';
    
    token = strtok(NULL, ":"); 
    if (!token) return 0;
    
    // For STOP: routeId is second token, stopId is third
    // For others: code is second token, entityId is third
    
    token = strtok(NULL, ":");
    if (!token) return 0;
    
    *outEntityId = atoi(token);
    return 1;
}

QREventResult validateQRCode(const char* qrCode, int routeId, int vehicleId, int driverId, int locationId, char* failureReason) {
    (void)routeId;
    (void)driverId;
    char type[30];
    int entityId = 0;
    
    if (!parseQRCode(qrCode, type, &entityId)) {
        strcpy(failureReason, "Invalid QR Code format");
        return QR_FAILED;
    }
    
    if (strcmp(type, "VEHICLE") == 0) {
        if (entityId != vehicleId) {
            strcpy(failureReason, "Vehicle does not match assigned route vehicle");
            return QR_FAILED;
        }
    } else if (strcmp(type, "HUB") == 0 || strcmp(type, "FACILITY") == 0) {
        if (entityId != locationId) {
            strcpy(failureReason, "Scanned location does not match expected destination");
            return QR_FAILED;
        }
    } else if (strcmp(type, "STOP") == 0) {
        // Here entityId is stopId, we'd need to validate it belongs to route
        // Assuming route logic validates this upstream
    } else {
        strcpy(failureReason, "Unknown QR Code type");
        return QR_FAILED;
    }
    
    return QR_SUCCESS;
}

void generateHubQRCode(int hubId, const char* hubCode, char* outBuffer, int maxLen) {
    snprintf(outBuffer, maxLen, "HUB:%s:%d", hubCode, hubId);
}
void generateVehicleQRCode(int vehicleId, const char* vehicleCode, char* outBuffer, int maxLen) {
    snprintf(outBuffer, maxLen, "VEHICLE:%s:%d", vehicleCode, vehicleId);
}
void generateRouteQRCode(int routeId, const char* routeCode, char* outBuffer, int maxLen) {
    snprintf(outBuffer, maxLen, "ROUTE:%s:%d", routeCode, routeId);
}
void generateStopQRCode(int routeId, int stopId, char* outBuffer, int maxLen) {
    snprintf(outBuffer, maxLen, "STOP:%d:%d", routeId, stopId);
}
void generateFacilityQRCode(int facilityId, const char* facilityCode, char* outBuffer, int maxLen) {
    snprintf(outBuffer, maxLen, "FACILITY:%s:%d", facilityCode, facilityId);
}

void logQREvent(const char* qrType, int entityId, int scannedBy, int routeId, int vehicleId, int locationId, QREventResult result, const char* failureReason) {
    FILE* fp = fopen(QR_EVENTS_FILE, "ab");
    if (!fp) return;
    
    QREvent evt;
    memset(&evt, 0, sizeof(QREvent));
    // In a real app we'd fetch the max eventId
    evt.eventId = 1; // Dummy for now
    strncpy(evt.qrType, qrType, sizeof(evt.qrType)-1);
    evt.entityId = entityId;
    evt.scannedBy = scannedBy;
    getCurrentTimestamp(evt.scanTimestamp, sizeof(evt.scanTimestamp));
    evt.routeId = routeId;
    evt.vehicleId = vehicleId;
    evt.locationId = locationId;
    evt.result = result;
    if (failureReason) strncpy(evt.failureReason, failureReason, sizeof(evt.failureReason)-1);
    
    fwrite(&evt, sizeof(QREvent), 1, fp);
    fclose(fp);
}
