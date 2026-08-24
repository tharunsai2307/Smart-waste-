#ifndef INCIDENT_H
#define INCIDENT_H

#include "types.h"

void initIncidentsData();
int addIncident(Incident *inc);
int getIncidentById(int incId, Incident *inc);
int getAllIncidents(Incident *list, int maxCount);
int getIncidentsByCollectionId(int collectionId, Incident *list, int maxCount);
int resolveIncident(int incId, const char *resolutionNote);

#endif
