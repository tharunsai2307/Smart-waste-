#ifndef UTILS_H
#define UTILS_H

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

// UI constants
#define TITLE_LINE "====================================================\n"
#define SUB_LINE   "----------------------------------------------------\n"

// Function prototypes
void clearScreen();
void pauseScreen();
void printHeader(const char *title);
void flushInputBuffer();
void getSafeString(char *buffer, int size);
int getSafeInt(int *value);
int getSafeFloat(float *value);

#endif
