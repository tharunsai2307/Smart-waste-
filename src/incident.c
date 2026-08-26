#include "incident.h"
#include "config.h"
#include "utils.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
extern char g_current_workspace[37];

void initIncidentsData() {
    FILE *fp = fopen(INCIDENTS_FILE, "rb");
    if (fp == NULL) {
        fp = fopen(INCIDENTS_FILE, "wb");
        if (fp != NULL) fclose(fp);
    } else {
        fclose(fp);
    }
}

// getCurrentTimestamp is now in utils.c

int addIncident(Incident *inc) {
    FILE *fp = fopen(INCIDENTS_FILE, "rb");
    int maxId = 0;
    if (fp != NULL) {
        Incident temp;
        while (fread(&temp, sizeof(Incident), 1, fp) == 1) {
        // Workspace Isolation
        if (g_current_workspace[0] != '\0' && strcmp(temp.workspaceId, g_current_workspace) != 0) continue;
            if (temp.incidentId > maxId) maxId = temp.incidentId;
        }
        fclose(fp);
    }

    inc->incidentId = maxId + 1;
    char now[30];
    getCurrentTimestamp(now, sizeof(now));
    strncpy(inc->createdAt, now, sizeof(inc->createdAt) - 1);
    inc->createdAt[sizeof(inc->createdAt) - 1] = '\0';
    inc->resolvedAt[0] = '\0';
    if (strlen(inc->status) == 0) {
        strcpy(inc->status, "OPEN");
    }

    fp = fopen(INCIDENTS_FILE, "ab");
    if (fp == NULL) return 0;
    int res = fwrite(inc, sizeof(Incident), 1, fp) == 1;
    fclose(fp);
    return res;
}

int getIncidentById(int incId, Incident *inc) {
    FILE *fp = fopen(INCIDENTS_FILE, "rb");
    if (fp == NULL) return 0;
    Incident temp;
    int found = 0;
    while (fread(&temp, sizeof(Incident), 1, fp) == 1) {
        // Workspace Isolation
        if (g_current_workspace[0] != '\0' && strcmp(temp.workspaceId, g_current_workspace) != 0) continue;
        if (temp.incidentId == incId) {
            *inc = temp;
            found = 1;
            break;
        }
    }
    fclose(fp);
    return found;
}

int getAllIncidents(Incident *list, int maxCount) {
    FILE *fp = fopen(INCIDENTS_FILE, "rb");
    if (fp == NULL) return 0;
    int count = 0;
    while (count < maxCount && fread(&list[count], sizeof(Incident), 1, fp) == 1) {
        count++;
    }
    fclose(fp);
    return count;
}

int getIncidentsByCollectionId(int collectionId, Incident *list, int maxCount) {
    FILE *fp = fopen(INCIDENTS_FILE, "rb");
    if (fp == NULL) return 0;
    int count = 0;
    Incident temp;
    while (count < maxCount && fread(&temp, sizeof(Incident), 1, fp) == 1) {
        if (temp.collectionId == collectionId) {
            list[count++] = temp;
        }
    }
    fclose(fp);
    return count;
}

int resolveIncident(int incId, const char *resolutionNote) {
    FILE *fp = fopen(INCIDENTS_FILE, "rb");
    if (fp == NULL) return 0;
    FILE *tempFp = fopen("data/temp_incidents.dat", "wb");
    if (tempFp == NULL) {
        fclose(fp);
        return 0;
    }

    Incident temp;
    int found = 0;
    char now[30];
    getCurrentTimestamp(now, sizeof(now));

    while (fread(&temp, sizeof(Incident), 1, fp) == 1) {
        // Workspace Isolation
        if (g_current_workspace[0] != '\0' && strcmp(temp.workspaceId, g_current_workspace) != 0) continue;
        if (temp.incidentId == incId) {
            strcpy(temp.status, "RESOLVED");
            strncpy(temp.resolvedAt, now, sizeof(temp.resolvedAt) - 1);
            temp.resolvedAt[sizeof(temp.resolvedAt) - 1] = '\0';
            if (resolutionNote && strlen(resolutionNote) > 0) {
                strncat(temp.description, " [Resolution: ", sizeof(temp.description) - strlen(temp.description) - 1);
                strncat(temp.description, resolutionNote, sizeof(temp.description) - strlen(temp.description) - 1);
                strncat(temp.description, "]", sizeof(temp.description) - strlen(temp.description) - 1);
            }
            fwrite(&temp, sizeof(Incident), 1, tempFp);
            found = 1;
        } else {
            fwrite(&temp, sizeof(Incident), 1, tempFp);
        }
    }

    fclose(fp);
    fclose(tempFp);

    if (found) {
        remove(INCIDENTS_FILE);
        rename("data/temp_incidents.dat", INCIDENTS_FILE);
    } else {
        remove("data/temp_incidents.dat");
    }
    return found;
}
