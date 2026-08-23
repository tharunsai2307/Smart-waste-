#include "auth.h"
#include "user.h"
#include "utils.h"
#include "report.h"
#include "search_sort.h"
#include "alert.h"
#include "collection.h"
#include "vehicle.h"
#include "bin.h"
#include "resident.h"
#include "waste.h"

AppContext app_context = {0, {0}};

void loginMenu() {
    char username[30];
    char password[50];
    User loggedInUser;
    
    while (1) {
        printHeader("LOGIN TO SYSTEM");
        printf("Enter Username (or 'exit' to quit): ");
        getSafeString(username, sizeof(username));
        
        if (strcmp(username, "exit") == 0) {
            exit(0);
        }
        
        printf("Enter Password: ");
        getSafeString(password, sizeof(password));
        
        int status = validateLogin(username, password, &loggedInUser);
        
        if (status == 1) {
            printf("\nLogin Successful! Welcome %s.\n", loggedInUser.name);
            pauseScreen();
            
            // Set global context
            app_context.loggedIn = 1;
            app_context.currentUser = loggedInUser;
            
            // Route based on role
            if (loggedInUser.role == ROLE_ADMIN) {
                handleAdminMenu();
            } else if (loggedInUser.role == ROLE_COLLECTION_MANAGER) {
                handleManagerMenu();
            } else if (loggedInUser.role == ROLE_OPERATOR) {
                handleOperatorMenu();
            } else if (loggedInUser.role == ROLE_RESIDENT) {
                handleResidentMenu();
            } else {
                printf("Unknown role. Contact Admin.\n");
                pauseScreen();
            }
            
            // After returning from menu, logout
            app_context.loggedIn = 0;
            
        } else if (status == -1) {
            printf("\nInvalid Username!\n");
            pauseScreen();
        } else if (status == -2) {
            printf("\nAccount is LOCKED. Please contact Admin.\n");
            pauseScreen();
        } else {
            printf("\nInvalid Password! Attempts remaining: %d\n", 3 - (loggedInUser.failedAttempts + 1));
            pauseScreen();
        }
    }
}

void logout() {
    app_context.loggedIn = 0;
    printf("\nLogging out...\n");
    pauseScreen();
}

void handleAdminMenu() {
    int choice;
    do {
        printHeader("ADMIN MENU");
        printf("Logged in as: %s\n\n", app_context.currentUser.name);
        printf("1. User Management\n");
        printf("2. Resident Management\n");
        printf("3. Dashboard\n");
        printf("4. Backup Data\n");
        printf("5. Restore Data\n");
        printf("6. Sort Waste by Quantity (DESC)\n");
        printf("7. Reset Demo Data\n");
        printf("0. Logout\n");
        printf("\nEnter choice: ");
        
        if (getSafeInt(&choice)) {
            switch (choice) {
                case 1:
                    printHeader("User Management");
                    displayAllUsers();
                    pauseScreen();
                    break;
                case 2:
                    printHeader("Resident Management");
                    displayAllResidents();
                    pauseScreen();
                    break;
                case 3:
                    displayOverallDashboard();
                    pauseScreen();
                    break;
                case 4:
                    backupData();
                    pauseScreen();
                    break;
                case 5:
                    restoreData();
                    pauseScreen();
                    break;
                case 6:
                    sortWasteByQuantityDesc();
                    pauseScreen();
                    break;
                case 7:
                    resetDemoData();
                    break;
                case 0:
                    logout();
                    break;
                default:
                    printf("\nFeature under development!\n");
                    pauseScreen();
                    break;
            }
        } else {
            printf("\nInvalid input.\n");
            pauseScreen();
            choice = -1;
        }
    } while (choice != 0);
}

void handleManagerMenu() {
    int choice;
    do {
        printHeader("COLLECTION MANAGER MENU");
        printf("Logged in as: %s\n\n", app_context.currentUser.name);
        printf("1. Dashboard\n");
        printf("2. Collection Requests\n");
        printf("3. Priority Queue\n");
        printf("4. Assign Vehicle\n");
        printf("5. Assign Operator\n");
        printf("6. Route Optimization\n");
        printf("7. Active Collections\n");
        printf("8. Collection History\n");
        printf("9. Reports\n");
        printf("0. Logout\n");
        printf("\nEnter choice: ");
        
        if (getSafeInt(&choice)) {
            switch (choice) {
                case 0:
                    logout();
                    break;
                default:
                    printf("\nFeature under development!\n");
                    pauseScreen();
                    break;
            }
        }
    } while (choice != 0);
}

void handleOperatorMenu() {
    int choice;
    do {
        printHeader("OPERATOR MENU");
        printf("Logged in as: %s\n\n", app_context.currentUser.name);
        printf("1. My Profile\n");
        printf("2. My Vehicle\n");
        printf("3. My Collection Tasks\n");
        printf("4. View Route\n");
        printf("5. Start Collection\n");
        printf("6. Complete Collection\n");
        printf("7. Report Problem\n");
        printf("8. Collection History\n");
        printf("0. Logout\n");
        printf("\nEnter choice: ");
        
        if (getSafeInt(&choice)) {
            switch (choice) {
                case 0:
                    logout();
                    break;
                default:
                    printf("\nFeature under development!\n");
                    pauseScreen();
                    break;
            }
        }
    } while (choice != 0);
}

void handleResidentMenu() {
    int choice;
    do {
        printHeader("RESIDENT MENU");
        printf("Logged in as: %s\n\n", app_context.currentUser.name);
        printf("1. My Profile\n");
        printf("2. Report Waste\n");
        printf("3. Request Collection\n");
        printf("4. Report Overflowing Bin\n");
        printf("5. Waste History\n");
        printf("6. Recycling Statistics\n");
        printf("7. Eco Points\n");
        printf("8. Eco Leaderboard\n");
        printf("0. Logout\n");
        printf("\nEnter choice: ");
        
        if (getSafeInt(&choice)) {
            switch (choice) {
                case 0:
                    logout();
                    break;
                default:
                    printf("\nFeature under development!\n");
                    pauseScreen();
                    break;
            }
        }
    } while (choice != 0);
}
