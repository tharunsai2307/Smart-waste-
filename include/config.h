#ifndef CONFIG_H
#define CONFIG_H

// Graph Config
#define MAX_LOCATIONS 20
#define INF 999999

// Bin Thresholds
#define WARNING_THRESHOLD 70.0f
#define CRITICAL_THRESHOLD 90.0f

// Recycling Rates (Rs/kg)
#define RATE_PLASTIC 20.0f
#define RATE_PAPER 12.0f
#define RATE_METAL 40.0f
#define RATE_EWASTE 60.0f

// File Paths
#define USERS_FILE "data/users.dat"
#define RESIDENTS_FILE "data/residents.dat"
#define WASTE_FILE "data/waste.dat"
#define BINS_FILE "data/bins.dat"
#define VEHICLES_FILE "data/vehicles.dat"
#define COLLECTIONS_FILE "data/collections.dat"
#define RECYCLING_FILE "data/recycling.dat"
#define ALERTS_FILE "data/alerts.dat"

#define MAX_USERS 100

#endif
