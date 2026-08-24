#ifndef FACILITY_H
#define FACILITY_H

#include "types.h"
#include "config.h"
#include <stddef.h>

void initFacilityData();
int addFacility(TransportFacility *f);
int getFacilityById(int facilityId, TransportFacility *f);
int updateFacility(const TransportFacility *f);
int getAllFacilities(TransportFacility *arr, int maxCount);
int getActiveFacilities(TransportFacility *arr, int maxCount);

#endif
