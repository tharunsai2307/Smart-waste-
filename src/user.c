#include "user.h"
#include "utils.h"
#include "security.h"

void initUsersData() {
    FILE *fp = fopen(USERS_FILE, "rb");
    if (fp == NULL) {
        fp = fopen(USERS_FILE, "wb");
        if (fp != NULL) {
            fclose(fp);
        }
    } else {
        fclose(fp);
    }

    // Ensure master admin exists
    User admin;
    int exists = 0;
    fp = fopen(USERS_FILE, "rb");
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
    
    if (!exists) {
        memset(&admin, 0, sizeof(User));
        admin.userId = 1;
        strncpy(admin.username, "admin", sizeof(admin.username)-1);
        strncpy(admin.name, "Master Admin", sizeof(admin.name)-1);
        admin.role = ROLE_ADMIN;
        admin.status = 1;
        admin.failedAttempts = 0;
        admin.requiresPasswordChange = 1;
        strncpy(admin.password, "admin123", sizeof(admin.password)-1);
        
        addUser(&admin);
        printf("Master admin created.\n");
    }
}

#include <stdint.h>
extern char g_current_workspace[37];

void hashPassword(const char* plain, char* hashed) {
    sw_hash_password(plain, hashed, 100);
}

// Add a new user to the binary file
int addUser(const User *newUser) {
    User temp;
    if (getUserByUsername(newUser->username, &temp)) {
        return 0; // Username exists
    }
    
    FILE *fp = fopen(USERS_FILE, "ab");
    if (fp == NULL) return 0;
    
    User u = *newUser;
    if (strlen(u.password) > 0) {
        char hashed[100] = {0};
        hashPassword(newUser->password, hashed);
        strncpy(u.password, hashed, sizeof(u.password) - 1);
    }
    
    fwrite(&u, sizeof(User), 1, fp);
    fclose(fp);
    return 1;
}

// Get user by username. foundUser may be NULL when only an existence check is
// needed.
int getUserByUsername(const char *username, User *foundUser) {
    FILE *fp = fopen(USERS_FILE, "rb");
    if (fp == NULL) return 0;
    
    User tmp;
    while (fread(&tmp, sizeof(User), 1, fp) == 1) {
        if (strcmp(tmp.username, username) == 0) {
            if (foundUser) *foundUser = tmp;
            fclose(fp);
            return 1; // Found
        }
    }
    
    fclose(fp);
    return 0; // Not found
}

// Get user by ID
int getUserById(int userId, User *foundUser) {
    FILE *fp = fopen(USERS_FILE, "rb");
    if (fp == NULL) return 0;
    
    while (fread(foundUser, sizeof(User), 1, fp) == 1) {
        if (foundUser->userId == userId) {
            fclose(fp);
            return 1; // Found
        }
    }
    
    fclose(fp);
    return 0; // Not found
}

// Update an existing user
int updateUser(const User *updatedUser) {
    FILE *fp = fopen(USERS_FILE, "rb");
    if (fp == NULL) return 0;
    
    FILE *tempFp = fopen("data/temp_users.dat", "wb");
    if (tempFp == NULL) {
        fclose(fp);
        return 0;
    }
    
    User temp;
    int found = 0;
    while (fread(&temp, sizeof(User), 1, fp) == 1) {
        // Workspace Isolation
        if (g_current_workspace[0] != '\0' && strcmp(temp.workspaceId, g_current_workspace) != 0) continue;
        if (temp.userId == updatedUser->userId) {
            fwrite(updatedUser, sizeof(User), 1, tempFp);
            found = 1;
        } else {
            fwrite(&temp, sizeof(User), 1, tempFp);
        }
    }
    
    fclose(fp);
    fclose(tempFp);
    
    if (found) {
        remove(USERS_FILE);
        rename("data/temp_users.dat", USERS_FILE);
    } else {
        remove("data/temp_users.dat");
    }
    
    return found;
}

// Delete user by ID
int deleteUser(int userId) {
    FILE *fp = fopen(USERS_FILE, "rb");
    if (fp == NULL) return 0;
    
    FILE *tempFp = fopen("data/temp_users.dat", "wb");
    if (tempFp == NULL) {
        fclose(fp);
        return 0;
    }
    
    User temp;
    int found = 0;
    while (fread(&temp, sizeof(User), 1, fp) == 1) {
        // Workspace Isolation
        if (g_current_workspace[0] != '\0' && strcmp(temp.workspaceId, g_current_workspace) != 0) continue;
        if (temp.userId == userId) {
            found = 1;
        } else {
            fwrite(&temp, sizeof(User), 1, tempFp);
        }
    }
    
    fclose(fp);
    fclose(tempFp);
    
    remove(USERS_FILE);
    rename("data/temp_users.dat", USERS_FILE);
    
    return found;
}

// Display all users
void displayAllUsers() {
    printHeader("ALL USERS");
    FILE *fp = fopen(USERS_FILE, "rb");
    if (fp == NULL) {
        printf("No users found.\n");
        return;
    }
    
    User temp;
    printf("%-5s %-15s %-20s %-20s %-10s\n", "ID", "Username", "Name", "Role (ID)", "Status");
    printf("%s", SUB_LINE);
    while (fread(&temp, sizeof(User), 1, fp) == 1) {
        // Workspace Isolation
        if (g_current_workspace[0] != '\0' && strcmp(temp.workspaceId, g_current_workspace) != 0) continue;
        printf("%-5d %-15s %-20s %-20d %-10s\n",
            temp.userId, temp.username, temp.name, temp.role,
            (temp.status == 1 ? "Active" : "Locked"));
    }
    fclose(fp);
}

// Validate Login
int validateLogin(const char *username, const char *password, User *loggedInUser) {
    if (!getUserByUsername(username, loggedInUser)) {
        return -1; // User not found
    }
    
    if (loggedInUser->status == 0) {
        return -2; // Account locked
    }
    
    // Verify against the current stored format (new iterated KDF, legacy
    // salted SHA-256, or legacy plaintext). Plaintext is never written again.
    if (!sw_verify_password(password, loggedInUser->password)) {
        User updated = *loggedInUser;
        updated.failedAttempts++;
        updateUser(&updated);
        if (updated.failedAttempts >= 5) {
            lockAccount(username);
            return -2; // Locked after repeated failures
        }
        return 0; // Wrong password
    }
    
    // Transparent migration of old password records to the iterated scheme.
    if (sw_password_needs_upgrade(loggedInUser->password)) {
        User migrated = *loggedInUser;
        char hashed[100] = {0};
        hashPassword(password, hashed);
        strncpy(migrated.password, hashed, sizeof(migrated.password) - 1);
        updateUser(&migrated);
    }
    
    resetFailedAttempts(username);
    return 1; // Success
}

// Lock account
void lockAccount(const char *username) {
    User temp;
    if (getUserByUsername(username, &temp)) {
        temp.status = 0;
        updateUser(&temp);
    }
}

// Reset failed attempts
void resetFailedAttempts(const char *username) {
    User temp;
    if (getUserByUsername(username, &temp)) {
        temp.failedAttempts = 0;
        updateUser(&temp);
    }
}
