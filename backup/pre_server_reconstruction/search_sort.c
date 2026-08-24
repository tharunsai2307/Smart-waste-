#include "search_sort.h"
#include "waste.h"
#include "bin.h"
#include "user.h"
#include "utils.h"

// Example of Quick Sort for Waste by Quantity
int partitionWaste(Waste arr[], int low, int high) {
    float pivot = arr[high].quantity;
    int i = (low - 1);
    for (int j = low; j <= high - 1; j++) {
        if (arr[j].quantity >= pivot) { // Descending
            i++;
            Waste temp = arr[i];
            arr[i] = arr[j];
            arr[j] = temp;
        }
    }
    Waste temp = arr[i + 1];
    arr[i + 1] = arr[high];
    arr[high] = temp;
    return (i + 1);
}

void quickSortWaste(Waste arr[], int low, int high) {
    if (low < high) {
        int pi = partitionWaste(arr, low, high);
        quickSortWaste(arr, low, pi - 1);
        quickSortWaste(arr, pi + 1, high);
    }
}

void sortWasteByQuantityDesc() {
    FILE *fp = fopen(WASTE_FILE, "rb");
    if (fp == NULL) return;
    
    Waste arr[100];
    int count = 0;
    while (fread(&arr[count], sizeof(Waste), 1, fp) == 1) {
        count++;
    }
    fclose(fp);
    
    if (count > 0) {
        quickSortWaste(arr, 0, count - 1);
        
        printf("\nWASTE SORTED BY QUANTITY (DESC)\n");
        printf("%-5s %-15s %-10s\n", "W_ID", "Type", "Qty(kg)");
        printf("%s", SUB_LINE);
        for (int i = 0; i < count; i++) {
            printf("%-5d %-15s %-10.2f\n", arr[i].wasteId, arr[i].wasteType, arr[i].quantity);
        }
    } else {
        printf("No waste records found.\n");
    }
}

// Example of Selection Sort for Bins by Fill Level
void sortBinsByFillLevelDesc() {
    FILE *fp = fopen(BINS_FILE, "rb");
    if (fp == NULL) return;
    
    Bin arr[50];
    int count = 0;
    while (fread(&arr[count], sizeof(Bin), 1, fp) == 1) {
        count++;
    }
    fclose(fp);
    
    for (int i = 0; i < count - 1; i++) {
        int max_idx = i;
        for (int j = i + 1; j < count; j++) {
            float fillJ = (arr[j].currentLevel / arr[j].capacity) * 100.0f;
            float fillMax = (arr[max_idx].currentLevel / arr[max_idx].capacity) * 100.0f;
            if (fillJ > fillMax) {
                max_idx = j;
            }
        }
        Bin temp = arr[max_idx];
        arr[max_idx] = arr[i];
        arr[i] = temp;
    }
    
    printf("\nBINS SORTED BY FILL LEVEL (DESC)\n");
    printf("%-5s %-20s %-10s %-10s\n", "B_ID", "Location", "Fill(%)", "Status(ID)");
    printf("%s", SUB_LINE);
    for (int i = 0; i < count; i++) {
        float fill = (arr[i].currentLevel / arr[i].capacity) * 100.0f;
        printf("%-5d %-20s %-10.1f %-10d\n", arr[i].binId, arr[i].location, fill, arr[i].status);
    }
}

// Example of Binary Search for User by ID
// Requires array to be sorted by ID first.
int binarySearchUserById(int userId) {
    FILE *fp = fopen(USERS_FILE, "rb");
    if (fp == NULL) return 0;
    
    User arr[100];
    int count = 0;
    while (fread(&arr[count], sizeof(User), 1, fp) == 1) {
        count++;
    }
    fclose(fp);
    
    // Bubble sort by ID (to ensure sorted array for binary search)
    for (int i = 0; i < count - 1; i++) {
        for (int j = 0; j < count - i - 1; j++) {
            if (arr[j].userId > arr[j + 1].userId) {
                User temp = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = temp;
            }
        }
    }
    
    int left = 0, right = count - 1;
    while (left <= right) {
        int mid = left + (right - left) / 2;
        
        if (arr[mid].userId == userId) {
            printf("\nUser Found via Binary Search:\n");
            printf("ID      : %d\n", arr[mid].userId);
            printf("Name    : %s\n", arr[mid].name);
            printf("Role ID : %d\n", arr[mid].role);
            return 1;
        }
        
        if (arr[mid].userId < userId)
            left = mid + 1;
        else
            right = mid - 1;
    }
    
    printf("User ID %d not found.\n", userId);
    return 0;
}
