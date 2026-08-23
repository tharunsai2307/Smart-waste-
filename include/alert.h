#ifndef ALERT_H
#define ALERT_H

#include "types.h"
#include "config.h"

void initAlertsData();
void generateAlert(const char *type, int referenceId, const char *message);
void displayActiveAlerts();
void resolveAlert(int alertId);

#endif
