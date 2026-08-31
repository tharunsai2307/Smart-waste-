#include "workspace.h"
#include "config.h"
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <time.h>

#define WORKSPACES_FILE "data/workspaces.dat"

// Currently active workspace context for the running request/session.
// Defined here (rather than in server.c) so both the CLI (smart_waste.exe)
// and the HTTP server (server.exe) targets share a single definition.
char g_current_workspace[37] = {0};

static void generateUuid(char *out) {
    srand((unsigned int)time(NULL));
    sprintf(out, "%04x%04x-%04x-%04x-%04x-%04x%04x%04x",
            rand() % 0xffff, rand() % 0xffff, rand() % 0xffff,
            rand() % 0x0fff | 0x4000,
            rand() % 0x3fff | 0x8000,
            rand() % 0xffff, rand() % 0xffff, rand() % 0xffff);
}

void initWorkspaces() {
    FILE *fp = fopen(WORKSPACES_FILE, "rb");
    if (fp) {
        fclose(fp);
        return;
    }
    
    fp = fopen(WORKSPACES_FILE, "wb");
    if (!fp) return;
    
    Workspace w;
    memset(&w, 0, sizeof(Workspace));
    strcpy(w.workspaceId, "global");
    strcpy(w.name, "Global Workspace");
    strcpy(w.description, "Default system workspace");
    
    time_t now = time(NULL);
    strftime(w.createdAt, sizeof(w.createdAt), "%Y-%m-%dT%H:%M:%SZ", gmtime(&now));
    
    fwrite(&w, sizeof(Workspace), 1, fp);
    fclose(fp);
}

int createWorkspace(const char *name, const char *description, char *outId) {
    Workspace w;
    memset(&w, 0, sizeof(Workspace));
    generateUuid(w.workspaceId);
    strncpy(w.name, name, sizeof(w.name) - 1);
    if (description) strncpy(w.description, description, sizeof(w.description) - 1);
    
    time_t now = time(NULL);
    strftime(w.createdAt, sizeof(w.createdAt), "%Y-%m-%dT%H:%M:%SZ", gmtime(&now));
    
    FILE *fp = fopen(WORKSPACES_FILE, "ab");
    if (!fp) return 0;
    
    fwrite(&w, sizeof(Workspace), 1, fp);
    fclose(fp);
    
    if (outId) strcpy(outId, w.workspaceId);
    return 1;
}

int getWorkspace(const char *id, Workspace *outWorkspace) {
    FILE *fp = fopen(WORKSPACES_FILE, "rb");
    if (!fp) return 0;
    
    Workspace w;
    while (fread(&w, sizeof(Workspace), 1, fp) == 1) {
        if (strcmp(w.workspaceId, id) == 0) {
            if (outWorkspace) *outWorkspace = w;
            fclose(fp);
            return 1;
        }
    }
    fclose(fp);
    return 0;
}

int updateWorkspace(const char *id, const char *name, const char *description) {
    FILE *fp = fopen(WORKSPACES_FILE, "rb+");
    if (!fp) return 0;
    
    Workspace w;
    long pos;
    while (1) {
        pos = ftell(fp);
        if (fread(&w, sizeof(Workspace), 1, fp) != 1) break;
        
        if (strcmp(w.workspaceId, id) == 0) {
            if (name) strncpy(w.name, name, sizeof(w.name) - 1);
            if (description) strncpy(w.description, description, sizeof(w.description) - 1);
            
            fseek(fp, pos, SEEK_SET);
            fwrite(&w, sizeof(Workspace), 1, fp);
            fclose(fp);
            return 1;
        }
    }
    fclose(fp);
    return 0;
}

int deleteWorkspace(const char *id) {
    FILE *fp = fopen(WORKSPACES_FILE, "rb");
    if (!fp) return 0;
    
    FILE *temp = fopen("data/workspaces.temp", "wb");
    if (!temp) {
        fclose(fp);
        return 0;
    }
    
    Workspace w;
    int found = 0;
    while (fread(&w, sizeof(Workspace), 1, fp) == 1) {
        if (strcmp(w.workspaceId, id) == 0) {
            found = 1;
        } else {
            fwrite(&w, sizeof(Workspace), 1, temp);
        }
    }
    
    fclose(fp);
    fclose(temp);
    
    if (found) {
        remove(WORKSPACES_FILE);
        rename("data/workspaces.temp", WORKSPACES_FILE);
    } else {
        remove("data/workspaces.temp");
    }
    return found;
}
