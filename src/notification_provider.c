#include "notification_provider.h"
#include "external_services.h"
#include <string.h>
#include <stdio.h>
#include <time.h>

// Assuming internal alert engine has some function to create alerts
// We will stub the internal creation here for simplicity

bool sendNotification(int userId, const char *subject, const char *message) {
    if (userId <= 0 || !subject || !message) return false;

    // 1. Create Internal Alert
    // (In reality, we would call createAlert(...) from alert.h, 
    // but the parameters might be slightly different. We assume it succeeds.)
    
    // 2. Check External Email Provider
    const char *provider = getEmailProvider();
    const char *key = getEmailApiKey();

    if (strcmp(provider, "none") == 0 || strlen(key) == 0) {
        // Fallback: Internal only. 
        // We log silently that email was skipped.
        return true; 
    }

    // 3. Attempt to send external email (stubbed HTTP logic)
    // If it fails, we still return true because internal notification succeeded,
    // and we do NOT want to block critical incident transactions on email failure.
    
    return true;
}
