#include <stdio.h>
#include <assert.h>
#include <string.h>
#include "permissions.h"
#include "types.h"

void test_workspace_isolation() {
    User userA = {
        .userId = 1,
        .role = ROLE_MUNICIPAL_ADMIN,
    };
    strcpy(userA.workspaceId, "WS-A");

    User userB = {
        .userId = 2,
        .role = ROLE_LOCAL_HUB_MANAGER,
    };
    strcpy(userB.workspaceId, "WS-B");

    User globalAdmin = {
        .userId = 3,
        .role = ROLE_ADMIN,
    };
    strcpy(globalAdmin.workspaceId, "global");

    printf("Testing Workspace Isolation...\n");

    // Test: User A accessing Workspace A -> ALLOW
    assert(has_permission(&userA, PERM_VIEW_DASHBOARD, "WS-A") == true);
    
    // Test: User A accessing Workspace B -> DENY
    assert(has_permission(&userA, PERM_VIEW_DASHBOARD, "WS-B") == false);
    
    // Test: User B accessing Workspace A -> DENY
    assert(has_permission(&userB, PERM_MANAGE_COLLECTIONS, "WS-A") == false);

    // Test: Global Admin accessing Workspace A -> ALLOW
    assert(has_permission(&globalAdmin, PERM_VIEW_DASHBOARD, "WS-A") == true);

    // Test: Global Admin accessing Workspace B -> ALLOW
    assert(has_permission(&globalAdmin, PERM_MANAGE_WORKSPACES, "WS-B") == true);

    printf("All Workspace Security tests passed!\n");
}

int main() {
    test_workspace_isolation();
    return 0;
}
