#include "utils.h"

// Clear the terminal screen
void clearScreen() {
#ifdef _WIN32
    system("cls");
#else
    system("clear");
#endif
}

// Pause and wait for user input
void pauseScreen() {
    printf("\nPress Enter to continue...");
    flushInputBuffer();
    getchar();
}

// Print a formatted header
void printHeader(const char *title) {
    clearScreen();
    printf("%s", TITLE_LINE);
    printf("                    %s\n", title);
    printf("%s", TITLE_LINE);
}

// Flush the input buffer
void flushInputBuffer() {
    int c;
    while ((c = getchar()) != '\n' && c != EOF) { }
}

// Safely read a string, stripping the newline
void getSafeString(char *buffer, int size) {
    if (fgets(buffer, size, stdin) != NULL) {
        size_t len = strlen(buffer);
        if (len > 0 && buffer[len - 1] == '\n') {
            buffer[len - 1] = '\0';
        } else {
            // Buffer was full, flush remaining input
            flushInputBuffer();
        }
    }
}

// Safely read an integer
int getSafeInt(int *value) {
    char buffer[50];
    getSafeString(buffer, sizeof(buffer));
    if (sscanf(buffer, "%d", value) == 1) {
        return 1; // Success
    }
    return 0; // Failure
}

// Safely read a float
int getSafeFloat(float *value) {
    char buffer[50];
    getSafeString(buffer, sizeof(buffer));
    if (sscanf(buffer, "%f", value) == 1) {
        return 1; // Success
    }
    return 0; // Failure
}

#include <time.h>
#include "types.h"

// Log an audit event
void logAudit(int actorId, const char* action, int targetId) {
    FILE *fp = fopen(AUDIT_FILE, "ab");
    if (fp == NULL) return;
    
    AuditLog log;
    
    // Auto-generate ID based on file size, though simple way is just sequential or rand
    log.logId = rand() % 100000;
    log.actorId = actorId;
    strncpy(log.action, action, sizeof(log.action) - 1);
    log.action[sizeof(log.action) - 1] = '\0';
    log.targetId = targetId;
    
    time_t t = time(NULL);
    struct tm *tm = localtime(&t);
    strftime(log.timestamp, sizeof(log.timestamp), "%Y-%m-%d %H:%M:%S", tm);
    
    extern char g_current_workspace[37];
    if (g_current_workspace[0] != '\0') {
        strncpy(log.workspaceId, g_current_workspace, sizeof(log.workspaceId) - 1);
    } else {
        strcpy(log.workspaceId, "global");
    }
    
    fwrite(&log, sizeof(AuditLog), 1, fp);
    fclose(fp);
}

// Get ISO timestamp: YYYY-MM-DD HH:MM:SS
void getCurrentTimestamp(char *buf, size_t len) {
    time_t t = time(NULL);
    struct tm *tm_info = localtime(&t);
    strftime(buf, len, "%Y-%m-%d %H:%M:%S", tm_info);
}

// Get today date prefix for filtering: YYYY-MM-DD
void getTodayDatePrefix(char *buf, size_t len) {
    time_t t = time(NULL);
    struct tm *tm_info = localtime(&t);
    strftime(buf, len, "%Y-%m-%d", tm_info);
}
