#ifndef TRANSFER_H
#define TRANSFER_H

#include "types.h"
#include "config.h"
#include <stddef.h>

// ─────────────────────────────────────────────────────────
// Init & CRUD
// ─────────────────────────────────────────────────────────
void initTransferData();
int addTransfer(WasteTransfer *t);
int getTransferById(int transferId, WasteTransfer *t);
int updateTransfer(const WasteTransfer *t);
int getAllTransfers(WasteTransfer *arr, int maxCount);
int getTransfersByHub(int hubId, WasteTransfer *arr, int maxCount);
int getTransfersByDriver(int driverId, WasteTransfer *arr, int maxCount);
int getActiveTransferForDriver(int driverId, WasteTransfer *out);

// ─────────────────────────────────────────────────────────
// State Machine
// ─────────────────────────────────────────────────────────
int isValidTransferTransition(TransferStatus from, TransferStatus to);
const char* transferStatusToStr(TransferStatus s);
TransferStatus transferStatusFromStr(const char *s);

// ─────────────────────────────────────────────────────────
// Driver Profiles
// ─────────────────────────────────────────────────────────
void initDriverProfileData();
int addOrUpdateDriverProfile(DriverProfile *dp);
int getDriverProfile(int userId, DriverProfile *dp);
int getAllDriverProfiles(DriverProfile *arr, int maxCount);
int getAvailableDriverProfiles(DriverProfile *arr, int maxCount);
int setDriverAvailability(int userId, const char *availability, int transferId);

// ─────────────────────────────────────────────────────────
// Business Logic (C Algorithms)
// ─────────────────────────────────────────────────────────
float calculateLoadVariancePct(float planned, float actual);
float calculateDeliveryVarianceKg(float loaded, float delivered);
int validateTransferForCreation(const WasteTransfer *t, float hubCurrentLoad, float vehicleCapacity, char *errMsg, size_t errLen);

// Merge sort transfers by priority + scheduled date
void sortTransfersByPriority(WasteTransfer *arr, int count);

#endif
