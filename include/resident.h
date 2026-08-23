#ifndef RESIDENT_H
#define RESIDENT_H

#include "types.h"
#include "config.h"

// Function prototypes
void initResidentsData();
int addResident(const Resident *res);
int getResidentById(int resId, Resident *res);
int getResidentByUserId(int userId, Resident *res);
int updateResident(const Resident *res);
int deleteResident(int resId);
void displayAllResidents();

#endif
