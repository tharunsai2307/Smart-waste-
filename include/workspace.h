#ifndef WORKSPACE_H
#define WORKSPACE_H

#include "types.h"

// Workspace operations
int createWorkspace(const char *name, const char *description, char *outId);
int getWorkspace(const char *id, Workspace *outWorkspace);
int updateWorkspace(const char *id, const char *name, const char *description);
int deleteWorkspace(const char *id);

// Ensure the workspaces table exists and contains the default global workspace
void initWorkspaces();

#endif
