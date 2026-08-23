#ifndef WASTE_H
#define WASTE_H

#include "types.h"
#include "config.h"

// Function prototypes
void initWasteData();
int addWaste(const Waste *w);
int getWasteById(int wasteId, Waste *w);
int updateWaste(const Waste *w);
int deleteWaste(int wasteId);
void displayAllWaste();
void displayWasteByResident(int residentId);

#endif
