// server_main.c — Entry point for the API server process
#include "server.h"
#include "route.h"

int main(void) {
    // Route graph must be initialized before serving
    initRouteData();
    startServer("8080");
    return 0;
}
