#ifndef VEHICLE_H
#define VEHICLE_H

#include "types.h"
#include "config.h"
#include <stddef.h>

// Function prototypes
void initVehiclesData();
int addVehicle(Vehicle *v);
int getVehicleById(int vehicleId, Vehicle *v);
int updateVehicle(const Vehicle *v);
int deleteVehicle(int vehicleId);
int getAllVehicles(Vehicle *arr, int maxCount);
int getVehiclesByHub(int hubId, Vehicle *arr, int maxCount);
int getAvailableVehicles(int hubId, Vehicle *arr, int maxCount);
int isVehicleCompliant(const Vehicle *v, char *errMsg, size_t errLen);

// Status string helpers
const char* vehicleStatusToStrV2(VehicleStatus s);
VehicleStatus vehicleStatusFromStr(const char *s);

void displayAllVehicles();

#endif
