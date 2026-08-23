#include "vehicle.h"
#include "utils.h"

void initVehiclesData() {
    FILE *fp = fopen(VEHICLES_FILE, "rb");
    if (fp == NULL) {
        fp = fopen(VEHICLES_FILE, "wb");
        if (fp != NULL) {
            Vehicle dummyVehicles[] = {
                {401, "TN-01-AB-1234", "Ramesh", 1000.0f, 0.0f, VEHICLE_AVAILABLE},
                {402, "TN-02-XY-9876", "Suresh", 2000.0f, 0.0f, VEHICLE_AVAILABLE},
                {403, "TN-03-CD-5678", "Murugan", 5000.0f, 0.0f, VEHICLE_AVAILABLE},
                {404, "TN-04-EF-1122", "Kannan", 2000.0f, 1950.0f, VEHICLE_FULL},
                {405, "TN-05-GH-3344", "Kumar", 3000.0f, 0.0f, VEHICLE_MAINTENANCE}
            };
            fwrite(dummyVehicles, sizeof(Vehicle), 5, fp);
            fclose(fp);
        }
    } else {
        fclose(fp);
    }
}

int addVehicle(const Vehicle *v) {
    FILE *fp = fopen(VEHICLES_FILE, "ab");
    if (fp == NULL) return 0;
    fwrite(v, sizeof(Vehicle), 1, fp);
    fclose(fp);
    return 1;
}

int getVehicleById(int vehicleId, Vehicle *v) {
    FILE *fp = fopen(VEHICLES_FILE, "rb");
    if (fp == NULL) return 0;
    while (fread(v, sizeof(Vehicle), 1, fp) == 1) {
        if (v->vehicleId == vehicleId) {
            fclose(fp);
            return 1;
        }
    }
    fclose(fp);
    return 0;
}

int updateVehicle(const Vehicle *v) {
    FILE *fp = fopen(VEHICLES_FILE, "rb");
    if (fp == NULL) return 0;
    
    FILE *tempFp = fopen("data/temp_vehicles.dat", "wb");
    if (tempFp == NULL) {
        fclose(fp);
        return 0;
    }
    
    Vehicle temp;
    int found = 0;
    while (fread(&temp, sizeof(Vehicle), 1, fp) == 1) {
        if (temp.vehicleId == v->vehicleId) {
            fwrite(v, sizeof(Vehicle), 1, tempFp);
            found = 1;
        } else {
            fwrite(&temp, sizeof(Vehicle), 1, tempFp);
        }
    }
    
    fclose(fp);
    fclose(tempFp);
    
    if (found) {
        remove(VEHICLES_FILE);
        rename("data/temp_vehicles.dat", VEHICLES_FILE);
    } else {
        remove("data/temp_vehicles.dat");
    }
    
    return found;
}

int deleteVehicle(int vehicleId) {
    FILE *fp = fopen(VEHICLES_FILE, "rb");
    if (fp == NULL) return 0;
    
    FILE *tempFp = fopen("data/temp_vehicles.dat", "wb");
    if (tempFp == NULL) {
        fclose(fp);
        return 0;
    }
    
    Vehicle temp;
    int found = 0;
    while (fread(&temp, sizeof(Vehicle), 1, fp) == 1) {
        if (temp.vehicleId != vehicleId) {
            fwrite(&temp, sizeof(Vehicle), 1, tempFp);
        } else {
            found = 1;
        }
    }
    
    fclose(fp);
    fclose(tempFp);
    
    if (found) {
        remove(VEHICLES_FILE);
        rename("data/temp_vehicles.dat", VEHICLES_FILE);
    } else {
        remove("data/temp_vehicles.dat");
    }
    return found;
}

void displayAllVehicles() {
    printHeader("ALL VEHICLES");
    FILE *fp = fopen(VEHICLES_FILE, "rb");
    if (fp == NULL) {
        printf("No vehicles found.\n");
        return;
    }
    
    Vehicle temp;
    printf("%-5s %-15s %-20s %-10s %-10s %-15s\n", "ID", "Number", "Driver", "Capacity", "Load", "Status(ID)");
    printf("%s", SUB_LINE);
    while (fread(&temp, sizeof(Vehicle), 1, fp) == 1) {
        printf("%-5d %-15s %-20s %-10.2f %-10.2f %-15d\n",
               temp.vehicleId, temp.vehicleNumber, temp.driverName,
               temp.capacity, temp.currentLoad, temp.status);
    }
    fclose(fp);
}
