#include "permissions.h"
#include <string.h>

bool has_permission(const User *user, Permission perm, const char *resource_workspace_id) {
    if (!user) return false;
    
    // Global admin has access to everything
    if (user->role == ROLE_ADMIN) {
        return true;
    }
    
    // Municipal Admin has access to everything in their workspace, except creating workspaces
    if (user->role == ROLE_MUNICIPAL_ADMIN) {
        if (perm == PERM_MANAGE_WORKSPACE) return false;
        if (!resource_workspace_id || strcmp(user->workspaceId, resource_workspace_id) != 0) {
            return false;
        }
        return true;
    }

    // For non-admins, workspace ID must match exactly
    if (!resource_workspace_id || strcmp(user->workspaceId, resource_workspace_id) != 0) {
        return false;
    }

    // Check specific role-based permissions within the workspace
    switch (perm) {
        case PERM_READ_HUB:
        case PERM_READ_VEHICLE:
        case PERM_READ_COLLECTION:
        case PERM_READ_TRANSFER:
        case PERM_READ_ANALYTICS:
        case PERM_READ_USER:
            // All scoped roles can read within their workspace
            return true;
            
        case PERM_EDIT_HUB:
        case PERM_ASSIGN_VEHICLE:
        case PERM_EDIT_VEHICLE:
        case PERM_EDIT_USER:
            // Only Hub Managers (or equivalent municipal admins) can edit entities
            return (user->role == ROLE_LOCAL_HUB_MANAGER || user->role == ROLE_RECYCLING_MANAGER);
            
        case PERM_CREATE_HUB:
        case PERM_DELETE_HUB:
        case PERM_DELETE_VEHICLE:
        case PERM_MANAGE_WORKSPACE:
            // Only admins should create/delete top-level hubs/vehicles
            // We already handled GLOBAL_ADMIN above. If MUNICIPAL_ADMIN is added later, allow here.
            return false;
            
        case PERM_EDIT_COLLECTION:
            // Managers, Cleaners, Drivers can edit their collections
            return (user->role == ROLE_LOCAL_HUB_MANAGER || 
                    user->role == ROLE_CLEANER || 
                    user->role == ROLE_DRIVER);
                    
        case PERM_EDIT_TRANSFER:
            // Managers, Drivers can edit transfers
            return (user->role == ROLE_LOCAL_HUB_MANAGER || 
                    user->role == ROLE_RECYCLING_MANAGER || 
                    user->role == ROLE_DRIVER);
                    
        default:
            return false;
    }
}
