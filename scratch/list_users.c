#include "types.h"
#include <stdio.h>
#include <stdlib.h>

int main() {
    FILE *fp = fopen("data/users.dat", "rb");
    if (!fp) {
        printf("Cannot open data/users.dat\n");
        return 1;
    }
    User u;
    printf("--- USERS ---\n");
    while (fread(&u, sizeof(User), 1, fp) == 1) {
        printf("ID: %d | Username: %s | Name: %s | Role: %d | Status: %d | AssignedHub: %d\n",
            u.userId, u.username, u.name, u.role, u.status, u.assignedHub);
    }
    fclose(fp);

    fp = fopen("data/hubs.dat", "rb");
    if (fp) {
        LocalHub h;
        printf("\n--- HUBS ---\n");
        while (fread(&h, sizeof(LocalHub), 1, fp) == 1) {
            printf("ID: %d | Code: %s | Name: %s | MaxCap: %.1f\n",
                h.hubId, h.hubCode, h.name, h.maximumCapacityKg);
        }
        fclose(fp);
    }
    return 0;
}
