#ifndef HUB_H
#define HUB_H

#include "types.h"
#include <stddef.h>

void initHubData();
int addHub(LocalHub *hub);
int updateHub(const LocalHub *hub);
int getHubById(int hubId, LocalHub *hub);
int getHubByManagerId(int managerId, LocalHub *hub);
int getAllHubs(LocalHub *hubs, int maxCount);

float calculateHubCurrentLoad(int hubId);
HubStatus deriveHubStatus(float currentLoad, float maxCapacity, float warningPercent, float criticalPercent);
const char* hubStatusToStr(HubStatus status);

int recordHubTransaction(HubInventoryTransaction *trans, int emergencyOverride, int actorUserId, char *errorMsg, size_t errLen);
int getHubTransactions(int hubId, HubInventoryTransaction *trans, int maxCount);
void getHubPerformance(int hubId, float *todayInbound, float *todayOutbound, int *activeCleaners);

#endif
