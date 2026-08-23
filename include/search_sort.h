#ifndef SEARCH_SORT_H
#define SEARCH_SORT_H

#include "types.h"
#include "config.h"

// Prototypes for specific search/sort algorithms requested
void sortWasteByQuantityDesc();
void sortBinsByFillLevelDesc();
int binarySearchUserById(int userId); // Returns 1 if found, prints details

#endif
