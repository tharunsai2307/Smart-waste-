#ifndef PERMISSIONS_H
#define PERMISSIONS_H

#include "types.h"
#include <stdbool.h>

typedef enum {
    PERM_READ_HUB,
    PERM_EDIT_HUB,
    PERM_CREATE_HUB,
    PERM_DELETE_HUB,
    
    PERM_READ_VEHICLE,
    PERM_ASSIGN_VEHICLE,
    PERM_EDIT_VEHICLE,
    PERM_DELETE_VEHICLE,
    
    PERM_READ_COLLECTION,
    PERM_EDIT_COLLECTION,
    
    PERM_READ_TRANSFER,
    PERM_EDIT_TRANSFER,
    
    PERM_READ_ANALYTICS,
    
    PERM_READ_USER,
    PERM_EDIT_USER,
    
    PERM_MANAGE_WORKSPACE
} Permission;

bool has_permission(const User *user, Permission perm, const char *resource_workspace_id);

#endif
