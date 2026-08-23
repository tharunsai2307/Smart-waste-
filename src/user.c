#include "user.h"
#include "utils.h"

// Initialize demo users if file doesn't exist
void initUsersData() {
    FILE *fp = fopen(USERS_FILE, "rb");
    if (fp == NULL) {
        fp = fopen(USERS_FILE, "wb");
        if (fp != NULL) {
            User users[] = {
                {1, "admin01", "pass123", "Admin User", "1234567890", ROLE_ADMIN, 1, 0},
                {2, "manager01", "pass123", "Collection Mgr", "0987654321", ROLE_COLLECTION_MANAGER, 1, 0},
                {3, "operator01", "pass123", "Operator User", "1122334455", ROLE_OPERATOR, 1, 0},
                {4, "resident01", "pass123", "Resident User", "5566778899", ROLE_RESIDENT, 1, 0}
            };
            fwrite(users, sizeof(User), 4, fp);
            fclose(fp);
        }
    } else {
        fclose(fp);
    }
}

// Add a new user to the binary file
int addUser(const User *newUser) {
    // Check if username already exists
    User temp;
    if (getUserByUsername(newUser->username, &temp)) {
        return 0; // Username exists
    }
    
    FILE *fp = fopen(USERS_FILE, "ab");
    if (fp == NULL) return 0;
    
    fwrite(newUser, sizeof(User), 1, fp);
    fclose(fp);
    return 1;
}

// Get user by username
int getUserByUsername(const char *username, User *foundUser) {
    FILE *fp = fopen(USERS_FILE, "rb");
    if (fp == NULL) return 0;
    
    while (fread(foundUser, sizeof(User), 1, fp) == 1) {
        if (strcmp(foundUser->username, username) == 0) {
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
    
    if (strcmp(loggedInUser->password, password) == 0) {
        resetFailedAttempts(username);
        return 1; // Success
    } else {
        loggedInUser->failedAttempts++;
        updateUser(loggedInUser);
        if (loggedInUser->failedAttempts >= 3) {
            lockAccount(username);
            return -2; // Locked due to 3 failed attempts
        }
        return 0; // Wrong password
    }
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
