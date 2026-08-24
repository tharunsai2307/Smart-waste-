#ifndef USER_H
#define USER_H

#include "types.h"
#include "config.h"

// Function prototypes
void initUsersData();
void hashPassword(const char* plain, char* hashed);
int addUser(const User *newUser);
int getUserByUsername(const char *username, User *foundUser);
int getUserById(int userId, User *foundUser);
int updateUser(const User *updatedUser);
int deleteUser(int userId);
void displayAllUsers();
int validateLogin(const char *username, const char *password, User *loggedInUser);
void lockAccount(const char *username);
void resetFailedAttempts(const char *username);

#endif
