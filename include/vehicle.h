#ifndef VEHICLE_H
#define VEHICLE_H

#include "types.h"
#include "config.h"

// Function prototypes
void initVehiclesData();
int addVehicle(const Vehicle *v);
int getVehicleById(int vehicleId, Vehicle *v);
int updateVehicle(const Vehicle *v);
int deleteVehicle(int vehicleId);
void displayAllVehicles();

#endif
