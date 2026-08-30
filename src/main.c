#include "utils.h"
#include "user.h"
#include "auth.h"
#include "resident.h"
#include "waste.h"
#include "bin.h"
#include "alert.h"
#include "vehicle.h"
#include "collection.h"
#include "route.h"
#include "recycling.h"

// Defined by server.c in the HTTP build; define it here for the CLI build.
char g_current_workspace[37] = {0};

int main(int argc, char *argv[]) {
    // Initialize data files if they don't exist
    initUsersData();
    initResidentsData();
    initWasteData();
    initBinsData();
    initAlertsData();
    initVehiclesData();
    initCollectionsData();
    initRouteData();
    initRecyclingData();
    
    if (argc > 1 && strcmp(argv[1], "--create-admin") == 0) {
        printf("Creating initial master admin...\n");
        User admin;
        
        FILE *fp = fopen(USERS_FILE, "rb");
        int exists = 0;
        if (fp) {
            User temp;
            while (fread(&temp, sizeof(User), 1, fp) == 1) {
                if (strcmp(temp.username, "admin") == 0) {
                    exists = 1;
                    break;
                }
            }
            fclose(fp);
        }
        
        if (exists) {
            printf("Master admin already exists.\n");
            return 0;
        }
        
        admin.userId = 1;
        strncpy(admin.username, "admin", sizeof(admin.username)-1);
        admin.username[sizeof(admin.username)-1] = '\0';
        strncpy(admin.name, "Master Admin", sizeof(admin.name)-1);
        admin.name[sizeof(admin.name)-1] = '\0';
        admin.role = ROLE_ADMIN;
        admin.status = 1;
        admin.failedAttempts = 0;
        admin.requiresPasswordChange = 1;
        
        strncpy(admin.password, "admin123", sizeof(admin.password) - 1);
        admin.password[sizeof(admin.password) - 1] = '\0';
        
        if (addUser(&admin)) {
            printf("Master admin created! Username: admin, Password: admin123\n");
            printf("Please login and change your password immediately.\n");
        } else {
            printf("Failed to create master admin.\n");
        }
        return 0;
    }

    
    // Start login menu
    loginMenu();
    
    return 0;
}
