#ifndef BIN_H
#define BIN_H

#include "types.h"
#include "config.h"

// Function prototypes
void initBinsData();
int addBin(const Bin *b);
int getBinById(int binId, Bin *b);
int updateBin(const Bin *b);
int deleteBin(int binId);
void displayAllBins();
void addWasteToBin(int binId, float quantity, const char *wasteType);

#endif
