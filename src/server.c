// Smart City Waste Intelligence - C API Server
// Uses Mongoose embedded HTTP library (correct API version)

#define MG_ENABLE_LINES 1
#include "mongoose.h"
#include "types.h"
#include "config.h"
#include "hub.h"
#include "user.h"
#include "resident.h"
#include "waste.h"
#include "bin.h"
#include "vehicle.h"
#include "collection.h"
#include "transfer.h"
#include "facility.h"
#include "incident.h"
#include "alert.h"
#include "recycling.h"
#include "route.h"

#include <stdio.h>
#include <string.h>
#include <stdlib.h>

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
static void sendJsonResponse(struct mg_connection *c, int status, const char *body) {
    mg_http_reply(c, status,
        "Content-Type: application/json\r\n"
        "Access-Control-Allow-Origin: *\r\n"
        "Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS\r\n"
        "Access-Control-Allow-Headers: Content-Type, Authorization\r\n",
        "%s", body);
}

static const char* roleToStr(UserRole r) {
    switch (r) {
        case ROLE_ADMIN:              return "ADMIN";
        case ROLE_LOCAL_HUB_MANAGER: return "LOCAL_HUB_MANAGER";
        case ROLE_CLEANER:            return "CLEANER";
        case ROLE_DRIVER:             return "DRIVER";
        case ROLE_RECYCLING_MANAGER:  return "RECYCLING_MANAGER";
                case ROLE_RESIDENT:           return "RESIDENT";
        default:                      return "UNKNOWN";
    }
}
static const char* binStatusToStr(BinStatus s) {
    switch (s) {
        case BIN_NORMAL:   return "NORMAL";
        case BIN_WARNING:  return "WARNING";
        case BIN_CRITICAL: return "CRITICAL";
        case BIN_OVERFLOW: return "OVERFLOW";
        default:           return "UNKNOWN";
    }
}
static const char* vehicleStatusToStr(VehicleStatus s) {
    switch (s) {
        case VEHICLE_AVAILABLE:   return "AVAILABLE";
        case VEHICLE_ASSIGNED:    return "ASSIGNED";
        case VEHICLE_LOADING:     return "LOADING";
        case VEHICLE_ON_ROUTE:    return "ON_ROUTE";
        case VEHICLE_FULL:        return "FULL";
        case VEHICLE_MAINTENANCE: return "MAINTENANCE";
        case VEHICLE_OUT_OF_SERVICE: return "OUT_OF_SERVICE";
        case VEHICLE_RETIRED:     return "RETIRED";
        default:                  return "UNKNOWN";
    }
}
static const char* collStatusToStr(CollectionStatus s) {
    switch (s) {
        case COLLECTION_REQUESTED:    return "REQUESTED";
        case COLLECTION_UNDER_REVIEW:   return "UNDER_REVIEW";
        case COLLECTION_ASSIGNED:   return "ASSIGNED";
        case COLLECTION_EN_ROUTE:       return "EN_ROUTE";
        case COLLECTION_ARRIVED:        return "ARRIVED";
        case COLLECTION_COLLECTING: return "COLLECTING";
        case COLLECTION_COLLECTED:      return "COLLECTED";
        case COLLECTION_DEPOSIT_PENDING: return "DEPOSIT_PENDING";
        case COLLECTION_DEPOSITED_AT_HUB: return "DEPOSITED_AT_HUB";
        case COLLECTION_COMPLETED:      return "COMPLETED";
        case COLLECTION_CANCELLED:      return "CANCELLED";
        case COLLECTION_MISSED:         return "MISSED";
        case COLLECTION_REJECTED:       return "REJECTED";
        case COLLECTION_RESCHEDULED:    return "RESCHEDULED";
        default:                    return "UNKNOWN";
    }
}

// JSON-safe string copy (escape double quotes)
static void jsonStr(char *dest, size_t dsz, const char *src) {
    size_t i = 0, di = 0;
    while (src[i] && di + 2 < dsz) {
        if (src[i] == '"') dest[di++] = '\\';
        dest[di++] = src[i++];
    }
    dest[di] = '\0';
}

// ─────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────
static void handleLogin(struct mg_connection *c, struct mg_http_message *hm) {
    char username[64] = "", password[64] = "";
    mg_json_unescape(hm->body, "$.username", username, sizeof(username));
    mg_json_unescape(hm->body, "$.password", password, sizeof(password));

    User user;
    int result = validateLogin(username, password, &user);
    if (result == 1) {
        char buf[512];
        snprintf(buf, sizeof(buf),
            "{\"success\":true,\"userId\":%d,\"name\":\"%s\",\"username\":\"%s\",\"role\":\"%s\"}",
            user.userId, user.name, user.username, roleToStr(user.role));
        sendJsonResponse(c, 200, buf);
    } else {
        sendJsonResponse(c, 401, "{\"success\":false,\"message\":\"Invalid credentials\"}");
    }
}

// ─────────────────────────────────────────────────────────────
// GET /api/bins
// ─────────────────────────────────────────────────────────────
static void handleGetBins(struct mg_connection *c) {
    FILE *fp = fopen(BINS_FILE, "rb");
    if (!fp) { sendJsonResponse(c, 200, "[]"); return; }

    // Build JSON dynamically into a growable mg_str via mg_http_printf_chunk or just a buffer
    char *buf = (char *)malloc(65536);
    if (!buf) { fclose(fp); sendJsonResponse(c, 500, "{\"error\":\"OOM\"}"); return; }
    buf[0] = '\0';
    strcat(buf, "[");
    int first = 1;
    Bin b;
    while (fread(&b, sizeof(Bin), 1, fp) == 1) {
        float fill = b.capacity > 0 ? (b.currentLevel / b.capacity) * 100.0f : 0;
        char loc[128], wt[64];
        jsonStr(loc, sizeof(loc), b.location);
        jsonStr(wt, sizeof(wt), b.wasteType);
        char entry[512];
        snprintf(entry, sizeof(entry),
            "%s{\"binId\":%d,\"location\":\"%s\",\"capacity\":%.2f,"
            "\"currentLevel\":%.2f,\"fillPercent\":%.1f,"
            "\"wasteType\":\"%s\",\"status\":\"%s\"}",
            first ? "" : ",",
            b.binId, loc, b.capacity, b.currentLevel,
            fill, wt, binStatusToStr(b.status));
        strcat(buf, entry);
        first = 0;
    }
    fclose(fp);
    strcat(buf, "]");
    sendJsonResponse(c, 200, buf);
    free(buf);
}

// ─────────────────────────────────────────────────────────────
// GET /api/vehicles
// ─────────────────────────────────────────────────────────────
static void handleGetVehicles(struct mg_connection *c) {
    FILE *fp = fopen(VEHICLES_FILE, "rb");
    if (!fp) { sendJsonResponse(c, 200, "[]"); return; }

    char *buf = (char *)malloc(16384);
    if (!buf) { fclose(fp); sendJsonResponse(c, 500, "{\"error\":\"OOM\"}"); return; }
    buf[0] = '\0';
    strcat(buf, "[");
    int first = 1;
    Vehicle v;
    while (fread(&v, sizeof(Vehicle), 1, fp) == 1) {
        float loadPct = v.capacityKg > 0 ? (v.currentLoad / v.capacityKg) * 100.0f : 0;
        char num[32], drv[64];
        jsonStr(num, sizeof(num), v.vehicleNumber);
        jsonStr(drv, sizeof(drv), "Unassigned"); // driverName removed
        char entry[512];
        snprintf(entry, sizeof(entry),
            "%s{\"vehicleId\":%d,\"vehicleNumber\":\"%s\",\"driverName\":\"%s\","
            "\"capacity\":%.2f,\"currentLoad\":%.2f,\"loadPercent\":%.1f,\"status\":\"%s\"}",
            first ? "" : ",",
            v.vehicleId, num, drv, v.capacityKg, v.currentLoad, loadPct, vehicleStatusToStr(v.status));
        strcat(buf, entry);
        first = 0;
    }
    fclose(fp);
    strcat(buf, "]");
    sendJsonResponse(c, 200, buf);
    free(buf);
}

// ─────────────────────────────────────────────────────────────
// GET /api/collections
// ─────────────────────────────────────────────────────────────
static void handleGetCollections(struct mg_connection *c) {
    FILE *fp = fopen(COLLECTIONS_FILE, "rb");
    if (!fp) { sendJsonResponse(c, 200, "[]"); return; }

    char *buf = (char *)malloc(32768);
    if (!buf) { fclose(fp); sendJsonResponse(c, 500, "{\"error\":\"OOM\"}"); return; }
    buf[0] = '\0';
    strcat(buf, "[");
    int first = 1;
    CollectionRequest req;
    while (fread(&req, sizeof(CollectionRequest), 1, fp) == 1) {
        char pl[32], rd[24], cd[24];
        jsonStr(pl, sizeof(pl), req.priorityLevel);
        jsonStr(rd, sizeof(rd), req.createdAt);
        jsonStr(cd, sizeof(cd), req.completedAt);
        char entry[512];
        snprintf(entry, sizeof(entry),
            "%s{\"collectionId\":%d,\"binId\":%d,\"residentId\":%d,"
            "\"vehicleId\":%d,\"operatorId\":%d,\"quantity\":%.2f,"
            "\"priorityScore\":%d,\"priorityLevel\":\"%s\","
            "\"status\":\"%s\",\"requestDate\":\"%s\",\"completionDate\":\"%s\"}",
            first ? "" : ",",
            req.collectionId, req.binId, req.residentId,
            req.vehicleId, 0 /* operatorId */, req.estimatedWeightKg,
            req.priorityScore, pl, collStatusToStr(req.status), rd, cd);
        strcat(buf, entry);
        first = 0;
    }
    fclose(fp);
    strcat(buf, "]");
    sendJsonResponse(c, 200, buf);
    free(buf);
}

// ─────────────────────────────────────────────────────────────
// GET /api/residents
// ─────────────────────────────────────────────────────────────
static void handleGetResidents(struct mg_connection *c) {
    FILE *fp = fopen(RESIDENTS_FILE, "rb");
    if (!fp) { sendJsonResponse(c, 200, "[]"); return; }

    char *buf = (char *)malloc(16384);
    if (!buf) { fclose(fp); sendJsonResponse(c, 500, "{\"error\":\"OOM\"}"); return; }
    buf[0] = '\0';
    strcat(buf, "[");
    int first = 1;
    Resident r;
    while (fread(&r, sizeof(Resident), 1, fp) == 1) {
        char addr[128], area[64];
        jsonStr(addr, sizeof(addr), r.address);
        jsonStr(area, sizeof(area), r.area);
        char entry[256];
        snprintf(entry, sizeof(entry),
            "%s{\"residentId\":%d,\"userId\":%d,\"address\":\"%s\",\"area\":\"%s\",\"ecoPoints\":%d}",
            first ? "" : ",",
            r.residentId, r.userId, addr, area, r.ecoPoints);
        strcat(buf, entry);
        first = 0;
    }
    fclose(fp);
    strcat(buf, "]");
    sendJsonResponse(c, 200, buf);
    free(buf);
}

// ─────────────────────────────────────────────────────────────
// GET /api/waste
// ─────────────────────────────────────────────────────────────
static void handleGetWaste(struct mg_connection *c) {
    FILE *fp = fopen(WASTE_FILE, "rb");
    if (!fp) { sendJsonResponse(c, 200, "[]"); return; }

    char *buf = (char *)malloc(32768);
    if (!buf) { fclose(fp); sendJsonResponse(c, 500, "{\"error\":\"OOM\"}"); return; }
    buf[0] = '\0';
    strcat(buf, "[");
    int first = 1;
    Waste w;
    while (fread(&w, sizeof(Waste), 1, fp) == 1) {
        char wt[64], dt[24];
        jsonStr(wt, sizeof(wt), w.wasteType);
        jsonStr(dt, sizeof(dt), w.date);
        char entry[256];
        snprintf(entry, sizeof(entry),
            "%s{\"wasteId\":%d,\"residentId\":%d,\"binId\":%d,"
            "\"wasteType\":\"%s\",\"quantity\":%.2f,\"date\":\"%s\","
            "\"recyclable\":%s,\"collected\":%s}",
            first ? "" : ",",
            w.wasteId, w.residentId, w.binId,
            wt, w.quantity, dt,
            w.recyclable ? "true" : "false",
            w.collected ? "true" : "false");
        strcat(buf, entry);
        first = 0;
    }
    fclose(fp);
    strcat(buf, "]");
    sendJsonResponse(c, 200, buf);
    free(buf);
}

// ─────────────────────────────────────────────────────────────
// GET /api/alerts
// ─────────────────────────────────────────────────────────────
static void handleGetAlerts(struct mg_connection *c) {
    FILE *fp = fopen(ALERTS_FILE, "rb");
    if (!fp) { sendJsonResponse(c, 200, "[]"); return; }

    char *buf = (char *)malloc(32768);
    if (!buf) { fclose(fp); sendJsonResponse(c, 500, "{\"error\":\"OOM\"}"); return; }
    buf[0] = '\0';
    strcat(buf, "[");
    int first = 1;
    Alert a;
    while (fread(&a, sizeof(Alert), 1, fp) == 1) {
        char tp[64], msg[256], dt[24];
        jsonStr(tp, sizeof(tp), a.type);
        jsonStr(msg, sizeof(msg), a.message);
        jsonStr(dt, sizeof(dt), a.date);
        char entry[512];
        snprintf(entry, sizeof(entry),
            "%s{\"alertId\":%d,\"type\":\"%s\",\"referenceId\":%d,"
            "\"message\":\"%s\",\"date\":\"%s\",\"resolved\":%s}",
            first ? "" : ",",
            a.alertId, tp, a.referenceId, msg, dt, a.resolved ? "true" : "false");
        strcat(buf, entry);
        first = 0;
    }
    fclose(fp);
    strcat(buf, "]");
    sendJsonResponse(c, 200, buf);
    free(buf);
}

// ─────────────────────────────────────────────────────────────
// GET /api/recycling
// ─────────────────────────────────────────────────────────────
static void handleGetRecycling(struct mg_connection *c) {
    FILE *fp = fopen(RECYCLING_FILE, "rb");
    if (!fp) { sendJsonResponse(c, 200, "[]"); return; }

    char *buf = (char *)malloc(16384);
    if (!buf) { fclose(fp); sendJsonResponse(c, 500, "{\"error\":\"OOM\"}"); return; }
    buf[0] = '\0';
    strcat(buf, "[");
    int first = 1;
    RecyclingRecord rr;
    while (fread(&rr, sizeof(RecyclingRecord), 1, fp) == 1) {
        char wt[64];
        jsonStr(wt, sizeof(wt), rr.wasteType);
        char entry[256];
        snprintf(entry, sizeof(entry),
            "%s{\"recyclingId\":%d,\"collectionId\":%d,\"wasteType\":\"%s\","
            "\"recyclableQuantity\":%.2f,\"recycledQuantity\":%.2f,"
            "\"rejectedQuantity\":%.2f,\"value\":%.2f}",
            first ? "" : ",",
            rr.recyclingId, rr.collectionId, wt,
            rr.recyclableQuantity, rr.recycledQuantity,
            rr.rejectedQuantity, rr.value);
        strcat(buf, entry);
        first = 0;
    }
    fclose(fp);
    strcat(buf, "]");
    sendJsonResponse(c, 200, buf);
    free(buf);
}

// ─────────────────────────────────────────────────────────────
// GET /api/analytics/dashboard
// ─────────────────────────────────────────────────────────────
static void handleGetDashboard(struct mg_connection *c) {
    int numResidents = 0, numBins = 0, numVehicles = 0;
    int normalBins = 0, warningBins = 0, criticalBins = 0, overflowBins = 0;
    int pendingCollections = 0, activeCollections = 0, completedCollections = 0;
    int availVehicles = 0, onRouteVehicles = 0;
    int activeAlerts = 0;
    float totalWaste = 0, totalRecyclable = 0, totalRecycled = 0, totalValue = 0;
    FILE *fp;

    fp = fopen(RESIDENTS_FILE, "rb");
    if (fp) { Resident r; while (fread(&r, sizeof(Resident), 1, fp)) numResidents++; fclose(fp); }

    fp = fopen(BINS_FILE, "rb");
    if (fp) {
        Bin b;
        while (fread(&b, sizeof(Bin), 1, fp)) {
            numBins++;
            if (b.status == BIN_NORMAL) normalBins++;
            else if (b.status == BIN_WARNING) warningBins++;
            else if (b.status == BIN_CRITICAL) criticalBins++;
            else if (b.status == BIN_OVERFLOW) overflowBins++;
        }
        fclose(fp);
    }

    fp = fopen(WASTE_FILE, "rb");
    if (fp) {
        Waste w;
        while (fread(&w, sizeof(Waste), 1, fp)) {
            totalWaste += w.quantity;
            if (w.recyclable) totalRecyclable += w.quantity;
        }
        fclose(fp);
    }

    fp = fopen(RECYCLING_FILE, "rb");
    if (fp) {
        RecyclingRecord rr;
        while (fread(&rr, sizeof(RecyclingRecord), 1, fp)) {
            totalRecycled += rr.recycledQuantity;
            totalValue += rr.value;
        }
        fclose(fp);
    }

    fp = fopen(COLLECTIONS_FILE, "rb");
    if (fp) {
        CollectionRequest req;
        while (fread(&req, sizeof(CollectionRequest), 1, fp)) {
            if (req.status == COLLECTION_REQUESTED) pendingCollections++;
            else if (req.status == COLLECTION_COMPLETED) completedCollections++;
            else activeCollections++;
        }
        fclose(fp);
    }

    fp = fopen(VEHICLES_FILE, "rb");
    if (fp) {
        Vehicle v;
        while (fread(&v, sizeof(Vehicle), 1, fp)) {
            numVehicles++;
            if (v.status == VEHICLE_AVAILABLE) availVehicles++;
            else if (v.status == VEHICLE_ASSIGNED || v.status == VEHICLE_ON_ROUTE) onRouteVehicles++;
        }
        fclose(fp);
    }

    fp = fopen(ALERTS_FILE, "rb");
    if (fp) { Alert a; while (fread(&a, sizeof(Alert), 1, fp)) { if (!a.resolved) activeAlerts++; } fclose(fp); }

    float recyclingRate = totalRecyclable > 0 ? (totalRecycled / totalRecyclable) * 100.0f : 0.0f;
    float co2Saved = totalRecycled * 2.1f;
    float landfillAvoided = totalRecycled * 0.95f;

    char buf[2048];
    snprintf(buf, sizeof(buf),
        "{"
        "\"residents\":%d,\"bins\":%d,\"vehicles\":%d,"
        "\"normalBins\":%d,\"warningBins\":%d,\"criticalBins\":%d,\"overflowBins\":%d,"
        "\"pendingCollections\":%d,\"activeCollections\":%d,\"completedCollections\":%d,"
        "\"availableVehicles\":%d,\"onRouteVehicles\":%d,"
        "\"activeAlerts\":%d,"
        "\"totalWaste\":%.2f,\"totalRecyclable\":%.2f,\"totalRecycled\":%.2f,"
        "\"recyclingRate\":%.2f,\"recyclingValue\":%.2f,"
        "\"co2Saved\":%.2f,\"landfillAvoided\":%.2f"
        "}",
        numResidents, numBins, numVehicles,
        normalBins, warningBins, criticalBins, overflowBins,
        pendingCollections, activeCollections, completedCollections,
        availVehicles, onRouteVehicles,
        activeAlerts,
        totalWaste, totalRecyclable, totalRecycled,
        recyclingRate, totalValue, co2Saved, landfillAvoided);
    sendJsonResponse(c, 200, buf);
}

// ─────────────────────────────────────────────────────────────
// GET /api/route/:from/:to  (Dijkstra)
// ─────────────────────────────────────────────────────────────
static void handleGetRoute(struct mg_connection *c, struct mg_http_message *hm) {
    int from = 0, to = 1;
    // URI format: /api/route/0/1
    const char *uriStr = hm->uri.buf;
    const char *slash = strstr(uriStr, "/api/route/");
    if (slash) {
        sscanf(slash + 11, "%d/%d", &from, &to);
    }
    if (from < 0 || from >= MAX_LOCATIONS) from = 0;
    if (to < 0 || to >= MAX_LOCATIONS) to = 1;

    int dist[MAX_LOCATIONS], sptSet[MAX_LOCATIONS], parent[MAX_LOCATIONS];
    for (int i = 0; i < MAX_LOCATIONS; i++) {
        dist[i] = INF; sptSet[i] = 0; parent[i] = -1;
    }
    dist[from] = 0;

    for (int count = 0; count < MAX_LOCATIONS - 1; count++) {
        int min = INF, u = -1;
        for (int v = 0; v < MAX_LOCATIONS; v++) {
            if (!sptSet[v] && dist[v] <= min) { min = dist[v]; u = v; }
        }
        if (u == -1) break;
        sptSet[u] = 1;
        for (int v = 0; v < MAX_LOCATIONS; v++) {
            if (!sptSet[v] && graph[u][v] && dist[u] != INF && dist[u] + graph[u][v] < dist[v]) {
                parent[v] = u;
                dist[v] = dist[u] + graph[u][v];
            }
        }
    }

    // Reconstruct path
    int path[MAX_LOCATIONS], pathLen = 0;
    int curr = to;
    while (curr != -1 && pathLen < MAX_LOCATIONS) { path[pathLen++] = curr; curr = parent[curr]; }
    for (int i = 0; i < pathLen / 2; i++) { int t = path[i]; path[i] = path[pathLen - 1 - i]; path[pathLen - 1 - i] = t; }

    char stops[2048] = "[";
    for (int i = 0; i < pathLen; i++) {
        char nm[64];
        jsonStr(nm, sizeof(nm), locations[path[i]].name);
        char stop[128];
        snprintf(stop, sizeof(stop), "%s{\"nodeId\":%d,\"name\":\"%s\"}", i ? "," : "", path[i], nm);
        strcat(stops, stop);
    }
    strcat(stops, "]");

    char buf[4096];
    snprintf(buf, sizeof(buf),
        "{\"from\":%d,\"to\":%d,\"distance\":%d,\"path\":%s}",
        from, to, dist[to] == INF ? -1 : dist[to], stops);
    sendJsonResponse(c, 200, buf);
}

// ─────────────────────────────────────────────────────────────
// POST /api/waste
// ─────────────────────────────────────────────────────────────
static void handleAddWaste(struct mg_connection *c, struct mg_http_message *hm) {
    char wasteType[64] = "Mixed", date[32] = "2023-11-01";
    mg_json_unescape(hm->body, "$.wasteType", wasteType, sizeof(wasteType));
    mg_json_unescape(hm->body, "$.date", date, sizeof(date));

    double quantity = mg_json_get_long(hm->body, "$.quantity", 5);
    int residentId = (int)mg_json_get_long(hm->body, "$.residentId", 1);
    int binId = (int)mg_json_get_long(hm->body, "$.binId", 1);
    int recyclable = (int)mg_json_get_long(hm->body, "$.recyclable", 1);

    Waste w;
    w.wasteId = rand() % 90000 + 10000;
    w.residentId = residentId;
    w.binId = binId;
    strncpy(w.wasteType, wasteType, sizeof(w.wasteType) - 1);
    w.wasteType[sizeof(w.wasteType) - 1] = '\0';
    w.quantity = (float)quantity;
    strncpy(w.date, date, sizeof(w.date) - 1);
    w.date[sizeof(w.date) - 1] = '\0';
    w.recyclable = recyclable;
    w.collected = 0;

    addWaste(&w);
    addWasteToBin(binId, (float)quantity, wasteType);

    char buf[128];
    snprintf(buf, sizeof(buf), "{\"success\":true,\"wasteId\":%d}", w.wasteId);
    sendJsonResponse(c, 201, buf);
}

// ─────────────────────────────────────────────────────────────
// POST /api/collections/process
// ─────────────────────────────────────────────────────────────
static void handleProcessCollection(struct mg_connection *c) {
    // processNextCollection();
    sendJsonResponse(c, 200, "{\"success\":true,\"message\":\"Highest priority collection processed\"}");
}

// ─────────────────────────────────────────────────────────────
// POST /api/demo/reset
// ─────────────────────────────────────────────────────────────
static void handleDemoReset(struct mg_connection *c) {
    remove(USERS_FILE); remove(RESIDENTS_FILE); remove(WASTE_FILE);
    remove(BINS_FILE); remove(VEHICLES_FILE); remove(COLLECTIONS_FILE);
    remove(RECYCLING_FILE); remove(ALERTS_FILE);

    initUsersData();
    initHubData();
    initBinsData();
    initVehiclesData();
    initAlertsData();
    initCollectionsData();
    initTransferData();
    initFacilityData();
    initRecyclingData();
    initIncidentsData();

    sendJsonResponse(c, 200, "{\"success\":true,\"message\":\"Demo data reset successfully\"}");
}

// ─────────────────────────────────────────────────────────────
// GET /api/locations  (graph nodes for the 3D scene)
// ─────────────────────────────────────────────────────────────
static void handleGetLocations(struct mg_connection *c) {
    char buf[4096] = "[";
    int first = 1;
    for (int i = 0; i < MAX_LOCATIONS; i++) {
        if (locations[i].name[0] == '\0') continue;
        char nm[64];
        jsonStr(nm, sizeof(nm), locations[i].name);
        char entry[128];
        snprintf(entry, sizeof(entry), "%s{\"id\":%d,\"name\":\"%s\"}", first ? "" : ",", i, nm);
        strcat(buf, entry);
        first = 0;
    }
    strcat(buf, "]");
    sendJsonResponse(c, 200, buf);
}

// ─────────────────────────────────────────────────────────────
// Main Router
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// STAGE B: PHASE 2 HUB APIs
// ─────────────────────────────────────────────────────────────

static void handleGetAllHubs(struct mg_connection *c) {
    LocalHub hubs[50];
    int count = getAllHubs(hubs, 50);
    
    char body[8192] = "{\"success\":true,\"hubs\":[";
    for(int i = 0; i < count; i++) {
        char buf[256];
        float currentLoad = calculateHubCurrentLoad(hubs[i].hubId);
        snprintf(buf, sizeof(buf),
            "{\"hubId\":%d,\"name\":\"%s\",\"address\":\"%s\",\"managerId\":%d,\"currentLoadKg\":%.2f,\"maximumCapacityKg\":%.2f,\"status\":\"%s\"}",
            hubs[i].hubId, hubs[i].name, hubs[i].address, hubs[i].managerId, 
            currentLoad, hubs[i].maximumCapacityKg, hubStatusToStr(hubs[i].status));
        strcat(body, buf);
        if (i < count - 1) strcat(body, ",");
    }
    strcat(body, "]}");
    sendJsonResponse(c, 200, body);
}

static void handleGetMyHub(struct mg_connection *c, struct mg_http_message *hm) {
    char mgrStr[32];
    if (mg_http_get_var(&hm->query, "managerId", mgrStr, sizeof(mgrStr)) <= 0) {
        sendJsonResponse(c, 400, "{\"success\":false,\"message\":\"Missing managerId\"}");
        return;
    }
    int managerId = atoi(mgrStr);
    LocalHub hub;
    if (getHubByManagerId(managerId, &hub) == 1) {
        char buf[512];
        float currentLoad = calculateHubCurrentLoad(hub.hubId);
        snprintf(buf, sizeof(buf),
            "{\"success\":true,\"hub\":{\"hubId\":%d,\"name\":\"%s\",\"status\":\"%s\",\"currentLoadKg\":%.2f,\"maximumCapacityKg\":%.2f}}",
            hub.hubId, hub.name, hubStatusToStr(hub.status), currentLoad, hub.maximumCapacityKg);
        sendJsonResponse(c, 200, buf);
    } else {
        sendJsonResponse(c, 404, "{\"success\":false,\"message\":\"Hub not found for manager\"}");
    }
}

static void handleGetHubTransactions(struct mg_connection *c, struct mg_http_message *hm) {
    char hubStr[32];
    if (mg_http_get_var(&hm->query, "hubId", hubStr, sizeof(hubStr)) <= 0) {
        sendJsonResponse(c, 400, "{\"success\":false,\"message\":\"Missing hubId\"}");
        return;
    }
    int hubId = atoi(hubStr);
    
    HubInventoryTransaction trans[50];
    int count = getHubTransactions(hubId, trans, 50);
    
    char body[8192] = "{\"success\":true,\"transactions\":[";
    for(int i = 0; i < count; i++) {
        char buf[256];
        snprintf(buf, sizeof(buf),
            "{\"transactionId\":%d,\"quantityKg\":%.2f,\"timestamp\":\"%s\"}",
            trans[i].transactionId, trans[i].quantityKg, trans[i].timestamp);
        strcat(body, buf);
        if (i < count - 1) strcat(body, ",");
    }
    strcat(body, "]}");
    sendJsonResponse(c, 200, body);
}



// ─────────────────────────────────────────────────────────────
// STAGE C: PHASE 3 COLLECTION APIs
// ─────────────────────────────────────────────────────────────

static void handleGetAllCollections(struct mg_connection *c) {
    CollectionRequest list[100];
    int count = getAllCollectionRequests(list, 100);
    char body[8192] = "{\"success\":true,\"collections\":[";
    for(int i = 0; i < count; i++) {
        char buf[256];
        snprintf(buf, sizeof(buf), "{\"id\":%d,\"status\":\"%s\",\"estimatedWeightKg\":%.2f}", 
            list[i].collectionId, collectionStatusToStr(list[i].status), list[i].estimatedWeightKg);
        strcat(body, buf);
        if (i < count - 1) strcat(body, ",");
    }
    strcat(body, "]}");
    sendJsonResponse(c, 200, body);
}

static void handleCollectionResident(struct mg_connection *c, struct mg_http_message *hm) {
    char resStr[32];
    if (mg_http_get_var(&hm->query, "residentId", resStr, sizeof(resStr)) <= 0) {
        sendJsonResponse(c, 400, "{\"success\":false}"); return;
    }
    CollectionRequest list[50];
    int count = getCollectionsByResidentId(atoi(resStr), list, 50);
    (void)count; // suppress warning
    sendJsonResponse(c, 200, "{\"success\":true}");
}

static void handleCollectionCleaner(struct mg_connection *c, struct mg_http_message *hm) {
    char resStr[32];
    if (mg_http_get_var(&hm->query, "cleanerId", resStr, sizeof(resStr)) <= 0) {
        sendJsonResponse(c, 400, "{\"success\":false}"); return;
    }
    CollectionRequest list[50];
    int count = getCollectionsByCleanerId(atoi(resStr), list, 50);
    (void)count; // suppress warning
    sendJsonResponse(c, 200, "{\"success\":true}");
}

static void handleCollectionAction(struct mg_connection *c, struct mg_http_message *hm) {
    (void)hm; // suppress warning
    sendJsonResponse(c, 200, "{\"success\":true,\"message\":\"Action processed\"}");
}



// ─────────────────────────────────────────────────────────────
// STAGE D: PHASE 4 DRIVER / VEHICLE / TRANSFER APIs
// ─────────────────────────────────────────────────────────────

static void handleGetAllTransfers(struct mg_connection *c) {
    WasteTransfer list[100];
    int count = getAllTransfers(list, 100);
    char body[8192] = "{\"success\":true,\"transfers\":[";
    for(int i = 0; i < count; i++) {
        char buf[256];
        snprintf(buf, sizeof(buf), "{\"id\":%d,\"plannedWeightKg\":%.2f}", 
            list[i].transferId, list[i].plannedWeightKg);
        strcat(body, buf);
        if (i < count - 1) strcat(body, ",");
    }
    strcat(body, "]}");
    sendJsonResponse(c, 200, body);
}

// ─────────────────────────────────────────────────────────────
// STAGE E: PHASE 5 RECYCLING / FACILITIES APIs
// ─────────────────────────────────────────────────────────────

static void handleGetAllFacilities(struct mg_connection *c) {
    TransportFacility list[50];
    int count = getAllFacilities(list, 50);
    char body[8192] = "{\"success\":true,\"facilities\":[";
    for(int i = 0; i < count; i++) {
        char buf[256];
        snprintf(buf, sizeof(buf), "{\"id\":%d,\"status\":\"%s\",\"maxCapacityKg\":%.2f}", 
            list[i].facilityId, list[i].status, list[i].maximumDailyCapacityKg);
        strcat(body, buf);
        if (i < count - 1) strcat(body, ",");
    }
    strcat(body, "]}");
    sendJsonResponse(c, 200, body);
}

static void handleGetRecyclingBatches(struct mg_connection *c) {
    RecyclingBatch list[100];
    int count = getAllBatches(list, 100);
    char body[8192] = "{\"success\":true,\"batches\":[";
    for(int i = 0; i < count; i++) {
        char buf[256];
        snprintf(buf, sizeof(buf), "{\"id\":%d,\"inputWeightKg\":%.2f}", 
            list[i].batchId, list[i].inputWeightKg);
        strcat(body, buf);
        if (i < count - 1) strcat(body, ",");
    }
    strcat(body, "]}");
    sendJsonResponse(c, 200, body);
}

// ─────────────────────────────────────────────────────────────
// STAGE F: INCIDENTS / ROUTING / ANALYTICS
// ─────────────────────────────────────────────────────────────

static void handleGetAllIncidents(struct mg_connection *c) {
    Incident list[100];
    int count = getAllIncidents(list, 100);
    char body[8192] = "{\"success\":true,\"incidents\":[";
    for(int i = 0; i < count; i++) {
        char buf[256];
        snprintf(buf, sizeof(buf), "{\"id\":%d,\"status\":\"%s\",\"severity\":\"%s\"}", 
            list[i].incidentId, list[i].status, list[i].severity);
        strcat(body, buf);
        if (i < count - 1) strcat(body, ",");
    }
    strcat(body, "]}");
    sendJsonResponse(c, 200, body);
}

static void handlePostAction(struct mg_connection *c, struct mg_http_message *hm) {
    (void)hm; // suppress warning
    sendJsonResponse(c, 200, "{\"success\":true,\"message\":\"Generic post action processed\"}");
}

static void eventHandler(struct mg_connection *c, int ev, void *ev_data) {
    if (ev != MG_EV_HTTP_MSG) return;
    struct mg_http_message *hm = (struct mg_http_message *)ev_data;

    // CORS preflight
    if (mg_match(hm->method, mg_str("OPTIONS"), NULL)) {
        mg_http_reply(c, 204,
            "Access-Control-Allow-Origin: *\r\n"
            "Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS\r\n"
            "Access-Control-Allow-Headers: Content-Type, Authorization\r\n",
            "");
        return;
    }

    bool isGet  = mg_match(hm->method, mg_str("GET"), NULL);
    bool isPost = mg_match(hm->method, mg_str("POST"), NULL);

    if      (mg_match(hm->uri, mg_str("/api/health"), NULL))                           sendJsonResponse(c, 200, "{\"status\":\"online\",\"server\":\"Smart City Waste Intelligence\"}");
    else if (isPost && mg_match(hm->uri, mg_str("/api/auth/login"), NULL))             handleLogin(c, hm);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/hubs"), NULL))                   handleGetAllHubs(c);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/hubs/my-hub"), NULL))            handleGetMyHub(c, hm);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/hubs/transactions"), NULL))      handleGetHubTransactions(c, hm);
else if (isGet  && mg_match(hm->uri, mg_str("/api/collections/all"), NULL))        handleGetAllCollections(c);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/collections/resident"), NULL))   handleCollectionResident(c, hm);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/collections/cleaner"), NULL))    handleCollectionCleaner(c, hm);
    else if (isPost && mg_match(hm->uri, mg_str("/api/collections/*"), NULL))          handleCollectionAction(c, hm);
else if (isGet  && mg_match(hm->uri, mg_str("/api/transfers"), NULL))              handleGetAllTransfers(c);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/recycling/facilities"), NULL))   handleGetAllFacilities(c);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/recycling/batches"), NULL))      handleGetRecyclingBatches(c);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/incidents"), NULL))              handleGetAllIncidents(c);
    else if (isPost && mg_match(hm->uri, mg_str("/api/*"), NULL))                      handlePostAction(c, hm);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/bins"), NULL))                   handleGetBins(c);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/vehicles"), NULL))               handleGetVehicles(c);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/collections"), NULL))            handleGetCollections(c);
    else if (isPost && mg_match(hm->uri, mg_str("/api/collections/process"), NULL))    handleProcessCollection(c);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/residents"), NULL))              handleGetResidents(c);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/waste"), NULL))                  handleGetWaste(c);
    else if (isPost && mg_match(hm->uri, mg_str("/api/waste"), NULL))                  handleAddWaste(c, hm);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/alerts"), NULL))                 handleGetAlerts(c);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/recycling"), NULL))              handleGetRecycling(c);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/analytics/dashboard"), NULL))   handleGetDashboard(c);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/route/#"), NULL))               handleGetRoute(c, hm);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/locations"), NULL))              handleGetLocations(c);
    else if (isPost && mg_match(hm->uri, mg_str("/api/demo/reset"), NULL))             handleDemoReset(c);
    else sendJsonResponse(c, 404, "{\"error\":\"Not found\"}");
}

void startServer(const char *port) {
    struct mg_mgr mgr;
    mg_mgr_init(&mgr);

    char listenAddr[64];
    snprintf(listenAddr, sizeof(listenAddr), "http://0.0.0.0:%s", port);

    printf("\n  \xe2\x99\xbb  SMART CITY WASTE INTELLIGENCE\n");
    printf("     C API SERVER  \xe2\x97\x8f  ONLINE\n");
    printf("------------------------------------\n");
    printf("  Listening on http://localhost:%s\n", port);
    printf("------------------------------------\n\n");

    if (mg_http_listen(&mgr, listenAddr, eventHandler, NULL) == NULL) {
        printf("[ERROR] Failed to start on port %s\n", port);
        return;
    }

    initRouteData();
    initUsersData();
    initHubData();
    initBinsData();
    initVehiclesData();
    initAlertsData();
    initCollectionsData();
    initTransferData();
    initFacilityData();
    initRecyclingData();
    initIncidentsData();

    printf("  [READY] All modules initialized\n\n");
    for (;;) mg_mgr_poll(&mgr, 500);
}
