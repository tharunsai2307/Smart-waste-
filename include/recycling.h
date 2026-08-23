#ifndef RECYCLING_H
#define RECYCLING_H

#include "types.h"
#include "config.h"

// Function prototypes
void initRecyclingData();
void processCollectionForRecycling(int collectionId, const char *wasteType, float quantity, int residentId);
void displayRecyclingStats();

#endif
