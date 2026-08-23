#ifndef ROUTE_H
#define ROUTE_H

#include "types.h"

// Global graph (adjacency matrix) and location names — defined in route.c
extern Location locations[MAX_LOCATIONS];
extern int graph[MAX_LOCATIONS][MAX_LOCATIONS];

// Function prototypes
void initRouteData();
void addRoad(int fromId, int toId, int distance);
void displayMap();
void findShortestPath(int sourceId, int destId);

#endif
