#ifndef AUTH_H
#define AUTH_H

#include "types.h"

extern AppContext app_context;

// Function prototypes
void loginMenu();
void handleAdminMenu();
void handleManagerMenu();
void handleOperatorMenu();
void handleResidentMenu();
void logout();

#endif
