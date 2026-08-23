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
