#ifndef OBSERVABILITY_H
#define OBSERVABILITY_H

#include <stdbool.h>

typedef enum {
    LOG_INFO,
    LOG_WARN,
    LOG_ERROR,
    LOG_CRITICAL
} LogLevel;

void initObservability(void);

// Core structured logging
void obsLog(LogLevel level, const char *category, const char *message);

// Convenience macros/functions
void obsLogApiRequest(const char *method, const char *path, int status);
void obsLogAuthFailure(const char *ip, const char *reason);
void obsLogWorkspaceViolation(const char *userId, const char *attemptedWorkspace);
void obsLogExternalFailure(const char *provider, const char *reason);

// Metrics
typedef struct {
    int totalRequests;
    int errorRequests;
    int authFailures;
    int workspaceViolations;
    int externalFailures;
} ObservabilityMetrics;

void getObservabilityMetrics(ObservabilityMetrics *outMetrics);

#endif
