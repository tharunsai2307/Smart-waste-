#ifndef TYPES_H
#define TYPES_H

#include "config.h"

// Enums
typedef enum {
    ROLE_ADMIN,
    ROLE_COLLECTION_MANAGER,
    ROLE_OPERATOR,
    ROLE_RESIDENT
} UserRole;

typedef enum {
    BIN_NORMAL,
    BIN_WARNING,
    BIN_CRITICAL,
    BIN_OVERFLOW
} BinStatus;

typedef enum {
    VEHICLE_AVAILABLE,
    VEHICLE_ASSIGNED,
    VEHICLE_ON_ROUTE,
    VEHICLE_FULL,
    VEHICLE_MAINTENANCE
} VehicleStatus;

typedef enum {
    COLLECTION_PENDING,
    COLLECTION_ASSIGNED,
    COLLECTION_ON_ROUTE,
    COLLECTION_COLLECTING,
    COLLECTION_COMPLETED,
    COLLECTION_CANCELLED
} CollectionStatus;

// Structs
typedef struct {
    int userId;
    char username[30];
    char password[50];
    char name[50];
    char phone[15];
    UserRole role;
    int status; // 1 for Active, 0 for Locked
    int failedAttempts;
} User;

typedef struct {
    int loggedIn;
    User currentUser;
} AppContext;

typedef struct {
    int residentId;
    int userId;
    char address[100];
    char area[50];
    int ecoPoints;
} Resident;

typedef struct {
    int wasteId;
    int residentId;
    int binId;
    char wasteType[30];
    float quantity;
    char date[20];
    int recyclable;
    int collected;
} Waste;

typedef struct {
    int binId;
    char location[60];
    float capacity;
    float currentLevel;
    char wasteType[30];
    BinStatus status;
} Bin;

typedef struct {
    int vehicleId;
    char vehicleNumber[20];
    char driverName[50];
    float capacity;
    float currentLoad;
    VehicleStatus status;
} Vehicle;

typedef struct {
    int collectionId;
    int requestId;
    int binId;
    int residentId;
    int operatorId;
    int vehicleId;
    float quantity;
    int priorityScore;
    char priorityLevel[20];
    CollectionStatus status;
    char requestDate[20];
    char completionDate[20];
} CollectionRequest;

typedef struct {
    int recyclingId;
    int collectionId;
    char wasteType[30];
    float recyclableQuantity;
    float recycledQuantity;
    float rejectedQuantity;
    float value;
} RecyclingRecord;

typedef struct {
    int alertId;
    char type[30];
    int referenceId;
    char message[200];
    char date[20];
    int resolved; // 0 for active, 1 for resolved
} Alert;

typedef struct {
    int id;
    char name[50];
} Location;

#endif
