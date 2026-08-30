#include "observability.h"
#include <stdio.h>
#include <string.h>
#include <time.h>

static ObservabilityMetrics g_metrics = {0};
static FILE *g_logFile = NULL;

void initObservability(void) {
    g_logFile = fopen("data/system.log", "a");
    obsLog(LOG_INFO, "SYSTEM", "Observability engine initialized");
}

static const char* levelToStr(LogLevel level) {
    switch (level) {
        case LOG_INFO: return "INFO";
        case LOG_WARN: return "WARN";
        case LOG_ERROR: return "ERROR";
        case LOG_CRITICAL: return "CRITICAL";
        default: return "UNKNOWN";
    }
}

void obsLog(LogLevel level, const char *category, const char *message) {
    if (!g_logFile) return;
    
    time_t now;
    time(&now);
    struct tm *tm_info = localtime(&now);
    char timeBuffer[26];
    strftime(timeBuffer, 26, "%Y-%m-%d %H:%M:%S", tm_info);

    fprintf(g_logFile, "[%s] [%s] [%s]: %s\n", timeBuffer, levelToStr(level), category, message);
    fflush(g_logFile);
}

void obsLogApiRequest(const char *method, const char *path, int status) {
    g_metrics.totalRequests++;
    if (status >= 400) g_metrics.errorRequests++;
    
    char buf[256];
    snprintf(buf, sizeof(buf), "%s %s -> %d", method, path, status);
    obsLog(LOG_INFO, "API", buf);
}

void obsLogAuthFailure(const char *ip, const char *reason) {
    g_metrics.authFailures++;
    char buf[256];
    snprintf(buf, sizeof(buf), "IP: %s, Reason: %s", ip, reason);
    obsLog(LOG_WARN, "AUTH", buf);
}

void obsLogWorkspaceViolation(const char *userId, const char *attemptedWorkspace) {
    g_metrics.workspaceViolations++;
    char buf[256];
    snprintf(buf, sizeof(buf), "User: %s attempted access to Workspace: %s", userId, attemptedWorkspace);
    obsLog(LOG_CRITICAL, "SECURITY", buf);
}

void obsLogExternalFailure(const char *provider, const char *reason) {
    g_metrics.externalFailures++;
    char buf[256];
    snprintf(buf, sizeof(buf), "Provider: %s, Reason: %s", provider, reason);
    obsLog(LOG_ERROR, "EXTERNAL", buf);
}

void getObservabilityMetrics(ObservabilityMetrics *outMetrics) {
    if (outMetrics) {
        *outMetrics = g_metrics;
    }
}
