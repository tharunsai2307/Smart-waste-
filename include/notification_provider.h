#ifndef NOTIFICATION_PROVIDER_H
#define NOTIFICATION_PROVIDER_H

#include <stdbool.h>

// Send a notification (internal system + optional email)
// Returns true if successfully handled (even if email fallback occurred)
bool sendNotification(int userId, const char *subject, const char *message);

#endif
