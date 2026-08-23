#include "reward.h"
#include "resident.h"
#include "utils.h"

void addEcoPoints(int residentId, int points) {
    Resident r;
    if (getResidentById(residentId, &r)) {
        r.ecoPoints += points;
        updateResident(&r);
    }
}

void deductEcoPoints(int residentId, int points) {
    Resident r;
    if (getResidentById(residentId, &r)) {
        r.ecoPoints -= points;
        if (r.ecoPoints < 0) r.ecoPoints = 0;
        updateResident(&r);
    }
}

void determineEcoLevel(int points, char *levelOut) {
    if (points >= 200) strcpy(levelOut, "ECO HERO");
    else if (points >= 100) strcpy(levelOut, "ECO CHAMPION");
    else if (points >= 50) strcpy(levelOut, "ECO MEMBER");
    else strcpy(levelOut, "ECO BEGINNER");
}

int calculateRewardPoints(const char *wasteType) {
    if (strcmp(wasteType, "E-Waste") == 0) return 20;
    if (strcmp(wasteType, "Metal") == 0) return 15;
    if (strcmp(wasteType, "Plastic") == 0) return 10;
    if (strcmp(wasteType, "Paper") == 0) return 5;
    if (strcmp(wasteType, "Mixed") == 0) return -10; // Penalty
    return 0;
}

int compareResidentsDesc(const void *a, const void *b) {
    Resident *rA = (Resident *)a;
    Resident *rB = (Resident *)b;
    return rB->ecoPoints - rA->ecoPoints;
}

void displayEcoLeaderboard() {
    FILE *fp = fopen(RESIDENTS_FILE, "rb");
    if (fp == NULL) {
        printf("Error opening residents file.\n");
        return;
    }
    
    Resident r[100];
    int count = 0;
    while (fread(&r[count], sizeof(Resident), 1, fp) == 1) {
        count++;
    }
    fclose(fp);
    
    qsort(r, count, sizeof(Resident), compareResidentsDesc);
    
    printf("\n====================================================\n");
    printf("                  ECO LEADERBOARD\n");
    printf("====================================================\n");
    printf("%-5s %-10s %-20s %-15s\n", "Rank", "Res_ID", "Level", "Points");
    printf("%s", SUB_LINE);
    
    for (int i = 0; i < count; i++) {
        char level[30];
        determineEcoLevel(r[i].ecoPoints, level);
        printf("%-5d %-10d %-20s %-15d\n", i + 1, r[i].residentId, level, r[i].ecoPoints);
    }
}
