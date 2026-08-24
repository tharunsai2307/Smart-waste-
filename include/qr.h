#ifndef QR_H
#define QR_H

#include "types.h"

// Parse a QR code string and extract its type and entity ID
// Returns 1 if successful, 0 if invalid format
int parseQRCode(const char* qrCode, char* outType, int* outEntityId);

// Validates a QR code against the given route, vehicle, and driver
// Returns QR_SUCCESS or QR_FAILED, and populates failureReason if failed
QREventResult validateQRCode(const char* qrCode, int routeId, int vehicleId, int driverId, int locationId, char* failureReason);

// Generate QR code strings
void generateHubQRCode(int hubId, const char* hubCode, char* outBuffer, int maxLen);
void generateVehicleQRCode(int vehicleId, const char* vehicleCode, char* outBuffer, int maxLen);
void generateRouteQRCode(int routeId, const char* routeCode, char* outBuffer, int maxLen);
void generateStopQRCode(int routeId, int stopId, char* outBuffer, int maxLen);
void generateFacilityQRCode(int facilityId, const char* facilityCode, char* outBuffer, int maxLen);

// Log a QR scan event
void logQREvent(const char* qrType, int entityId, int scannedBy, int routeId, int vehicleId, int locationId, QREventResult result, const char* failureReason);

#endif
