# Smart Waste Collection and Recycling Monitoring System

## Overview
A comprehensive C console-based simulation for a smart waste management system. It manages the complete lifecycle from waste reporting and smart-bin overflow alerts to collection route optimization (using Dijkstra's Algorithm) and recycling rewards (Eco Points).

## Features
- **Authentication**: Role-based access control (Admin, Collection Manager, Operator, Resident).
- **Resident Management**: Track addresses and Eco Points.
- **Waste Management**: Record different types of waste (Plastic, Paper, Metal, E-Waste, Biodegradable, Hazardous, Mixed).
- **Smart Bins**: Simulated capacity and fill-level monitoring with auto-status updates (Normal, Warning, Critical, Overflow).
- **Alert System**: Auto-generation of alerts for critical bin levels or full vehicles.
- **Priority Engine & Queue**: Calculates collection priority based on fill level, waste type, waiting days, and area density.
- **Vehicle Assignment**: Auto-selects the smallest suitable available vehicle.
- **Route Optimization**: Uses Dijkstra's Shortest Path Algorithm to calculate the optimal route from the depot to the bin.
- **Collection Workflow**: Tracks status from Pending -> Assigned -> Collecting -> Completed.
- **Recycling & Rewards**: Calculates recycling efficiency and recovery value. Awards Eco Points to residents.
- **Dashboard & Reports**: Live statistics and waste category breakdowns.
- **Data Persistence**: Binary file handling with built-in backup and restore functionality.

## System Architecture & Data Structures
- **Binary Persistence**: `.dat` files for Users, Residents, Waste, Bins, Vehicles, Collections, Recycling, and Alerts.
- **Priority Queue**: Implemented via descending sorts on collection scores.
- **Graph**: Adjacency matrix for locations to simulate GPS routing.
- **Search & Sort**: Linear/Binary search and Quick/Selection sorts.

## Installation & Compilation
This project uses standard C libraries and is compatible with GCC. 

```bash
# Compile using the provided Makefile
make all

# Or compile manually via GCC
gcc -fno-lto src/*.c -Iinclude -Wall -Wextra -o smart_waste.exe
```

## Execution
```bash
./smart_waste.exe
```
Upon the first launch, the system automatically initializes all binary data files with default sample data.

## Default Credentials
| Role               | Username     | Password |
|--------------------|--------------|----------|
| Admin              | `admin01`    | `pass123`|
| Collection Manager | `manager01`  | `pass123`|
| Operator           | `operator01` | `pass123`|
| Resident           | `resident01` | `pass123`|

## Demo Workflow
1. Log in as `admin01` -> View Overall Dashboard and Backup Data.
2. The initial data contains simulated Bins and Waste, causing auto-alerts.
3. (Additional menus for Manager and Operator can be wired up for full step-by-step simulations).

## Limitations (Academic Simulation)
- **Sensors**: Smart-bin fill levels are simulated via manual waste additions.
- **GPS**: Route optimization uses a fixed graph distance rather than real-time traffic APIs.
- **Storage**: Uses binary flat-files instead of an SQL database.
- **Security**: Passwords are in plain-text suitable for academic demonstration, not production.

## Future Enhancements
- Integration with real IoT ultrasonic sensors (e.g., via Arduino/Raspberry Pi).
- Live Google Maps API integration for real-time fleet tracking.
- Web-based municipal dashboard.
