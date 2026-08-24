#ifndef REWARD_H
#define REWARD_H

#include "types.h"
#include "config.h"

void addEcoPoints(int residentId, int points);
void deductEcoPoints(int residentId, int points);
void viewEcoLeaderboard();
int calculateRewardPoints(const char *wasteType);

#endif
