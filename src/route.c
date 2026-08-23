#include "route.h"
#include "utils.h"

Location locations[MAX_LOCATIONS];
int graph[MAX_LOCATIONS][MAX_LOCATIONS];

void initRouteData() {
    // Basic initialization of 20 nodes
    for (int i = 0; i < MAX_LOCATIONS; i++) {
        locations[i].id = i;
        sprintf(locations[i].name, "Location_%d", i);
        
        for (int j = 0; j < MAX_LOCATIONS; j++) {
            if (i == j) graph[i][j] = 0;
            else graph[i][j] = INF;
        }
    }
    
    // Naming some specific nodes for demo
    strcpy(locations[0].name, "Depot");
    strcpy(locations[1].name, "Anna Nagar");
    strcpy(locations[2].name, "Ambattur");
    strcpy(locations[3].name, "Avadi");
    strcpy(locations[4].name, "Poonamallee");
    strcpy(locations[5].name, "Mogappair");
    
    // Add edges for demo (symmetric)
    graph[0][1] = 5; graph[1][0] = 5;
    graph[0][2] = 10; graph[2][0] = 10;
    graph[1][3] = 6; graph[3][1] = 6;
    graph[1][5] = 4; graph[5][1] = 4;
    graph[2][3] = 7; graph[3][2] = 7;
    graph[3][4] = 8; graph[4][3] = 8;
    graph[4][5] = 9; graph[5][4] = 9;
}

int minDistance(int dist[], int sptSet[]) {
    int min = INF, min_index = -1;
    for (int v = 0; v < MAX_LOCATIONS; v++) {
        if (sptSet[v] == 0 && dist[v] <= min) {
            min = dist[v];
            min_index = v;
        }
    }
    return min_index;
}

void printPath(int parent[], int j) {
    if (parent[j] == -1) return;
    printPath(parent, parent[j]);
    printf(" -> %s", locations[j].name);
}

void findShortestPath(int startNode, int endNode) {
    if (startNode < 0 || startNode >= MAX_LOCATIONS || endNode < 0 || endNode >= MAX_LOCATIONS) {
        printf("Invalid nodes for routing.\n");
        return;
    }
    
    int dist[MAX_LOCATIONS];
    int sptSet[MAX_LOCATIONS];
    int parent[MAX_LOCATIONS];
    
    for (int i = 0; i < MAX_LOCATIONS; i++) {
        parent[i] = -1;
        dist[i] = INF;
        sptSet[i] = 0;
    }
    
    dist[startNode] = 0;
    
    for (int count = 0; count < MAX_LOCATIONS - 1; count++) {
        int u = minDistance(dist, sptSet);
        if (u == -1) break;
        sptSet[u] = 1;
        
        for (int v = 0; v < MAX_LOCATIONS; v++) {
            if (!sptSet[v] && graph[u][v] != INF && dist[u] != INF && dist[u] + graph[u][v] < dist[v]) {
                parent[v] = u;
                dist[v] = dist[u] + graph[u][v];
            }
        }
    }
    
    printf("\nROUTE OPTIMIZATION (DIJKSTRA)\n");
    printf("%s", SUB_LINE);
    if (dist[endNode] == INF) {
        printf("No path exists from %s to %s.\n", locations[startNode].name, locations[endNode].name);
    } else {
        printf("Shortest path from %s to %s: %d km\n", locations[startNode].name, locations[endNode].name, dist[endNode]);
        printf("Route: %s", locations[startNode].name);
        printPath(parent, endNode);
        printf("\n");
    }
}
