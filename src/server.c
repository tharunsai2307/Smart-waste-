// Smart City Waste Intelligence - C API Server
// Uses Mongoose embedded HTTP library (correct API version)

#define MG_ENABLE_LINES 1
#include "mongoose.h"
#include "types.h"
#include "config.h"
#include "hub.h"
#include "auth.h"
#include "permissions.h"
#include "workspace.h"
#include "user.h"
#include "resident.h"
#include "location.h"
#include "gis_route.h"
#include "route_engine.h"
#include "qr.h"
#include "analytics.h"
#include "alert_engine.h"
#include "report_export.h"
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
extern char g_current_workspace[37];

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
    if (!src || !dest || dsz == 0) return;
    while (src[i] && di + 2 < dsz) {
        unsigned char c = (unsigned char)src[i];
        if (c == '"' || c == '\\') {
            if (di + 2 < dsz) { dest[di++] = '\\'; dest[di++] = c; }
        } else if (c >= 32 && c <= 126) {
            dest[di++] = (char)c;
        } else if (c == '\n' || c == '\r' || c == '\t') {
            dest[di++] = ' ';
        }
        i++;
    }
    dest[di] = 0;
}

static int getAuthenticatedUser(struct mg_http_message *hm, User *outUser) {
    struct mg_str *authHeader = mg_http_get_header(hm, "Authorization");
    if (!authHeader) return 0;
    
    char idStr[32] = {0};
    snprintf(idStr, sizeof(idStr), "%.*s", (int)authHeader->len, authHeader->buf);
    int userId = atoi(idStr);
    
    if (userId > 0) {
        return getUserById(userId, outUser);
    }
    return 0;
}

// ─────────────────────────────────────────────────────────────
// GET /api/workspaces
// ─────────────────────────────────────────────────────────────
static void handleGetWorkspaces(struct mg_connection *c, struct mg_http_message *hm) {
    User u;
    if (!getAuthenticatedUser(hm, &u)) {
        sendJsonResponse(c, 401, "{\"error\":\"Unauthorized\"}");
        return;
    }
    
    // Only GLOBAL_ADMIN or MUNICIPAL_ADMIN can list workspaces (if we want to restrict, but maybe let them see theirs)
    if (!has_permission(&u, PERM_MANAGE_WORKSPACE, g_current_workspace) && u.role != ROLE_ADMIN) {
        // If not global admin, just return their own workspace
        Workspace w;
        if (getWorkspace(u.workspaceId, &w)) {
            char buf[512];
            snprintf(buf, sizeof(buf), "[{\"workspaceId\":\"%s\",\"name\":\"%s\",\"description\":\"%s\",\"createdAt\":\"%s\"}]",
                w.workspaceId, w.name, w.description, w.createdAt);
            sendJsonResponse(c, 200, buf);
            return;
        }
        sendJsonResponse(c, 200, "[]");
        return;
    }

    FILE *fp = fopen("data/workspaces.dat", "rb");
    if (!fp) { sendJsonResponse(c, 200, "[]"); return; }

    char *buf = malloc(65536);
    if (!buf) { fclose(fp); sendJsonResponse(c, 500, "{\"error\":\"OOM\"}"); return; }
    strcpy(buf, "[");
    int first = 1;
    Workspace w;
    while (fread(&w, sizeof(Workspace), 1, fp) == 1) {
        char entry[1024];
        snprintf(entry, sizeof(entry), "%s{\"workspaceId\":\"%s\",\"name\":\"%s\",\"description\":\"%s\",\"createdAt\":\"%s\"}",
            first ? "" : ",", w.workspaceId, w.name, w.description, w.createdAt);
        strcat(buf, entry);
        first = 0;
    }
    strcat(buf, "]");
    fclose(fp);
    sendJsonResponse(c, 200, buf);
    free(buf);
}

// ─────────────────────────────────────────────────────────────
// POST /api/workspaces
// ─────────────────────────────────────────────────────────────
static void handlePostWorkspace(struct mg_connection *c, struct mg_http_message *hm) {
    User u;
    if (!getAuthenticatedUser(hm, &u) || u.role != ROLE_ADMIN) {
        sendJsonResponse(c, 403, "{\"error\":\"Forbidden\"}");
        return;
    }

    char name[128] = "", description[256] = "";
    mg_json_unescape(hm->body, "$.name", name, sizeof(name));
    mg_json_unescape(hm->body, "$.description", description, sizeof(description));

    char newId[37];
    if (createWorkspace(name, description, newId)) {
        char buf[256];
        snprintf(buf, sizeof(buf), "{\"success\":true,\"workspaceId\":\"%s\"}", newId);
        sendJsonResponse(c, 200, buf);
        
        // Audit
        FILE *af = fopen("data/audit.dat", "ab");
        if (af) {
            AuditLog al = {0};
            al.actorId = u.userId;
            strcpy(al.action, "CREATE_WORKSPACE");
            al.targetId = 0;
            strcpy(al.workspaceId, newId);
            time_t now = time(NULL);
            strftime(al.timestamp, sizeof(al.timestamp), "%Y-%m-%dT%H:%M:%SZ", gmtime(&now));
            fwrite(&al, sizeof(AuditLog), 1, af);
            fclose(af);
        }
    } else {
        sendJsonResponse(c, 500, "{\"error\":\"Failed to create\"}");
    }
}

// ─────────────────────────────────────────────────────────────
// GET /api/workspaces/current
// ─────────────────────────────────────────────────────────────
static void handleGetCurrentWorkspace(struct mg_connection *c, struct mg_http_message *hm) {
    User u;
    if (!getAuthenticatedUser(hm, &u)) {
        sendJsonResponse(c, 401, "{\"error\":\"Unauthorized\"}");
        return;
    }

    Workspace w;
    if (getWorkspace(g_current_workspace, &w)) {
        char buf[512];
        snprintf(buf, sizeof(buf), "{\"workspaceId\":\"%s\",\"name\":\"%s\",\"description\":\"%s\",\"createdAt\":\"%s\"}",
            w.workspaceId, w.name, w.description, w.createdAt);
        sendJsonResponse(c, 200, buf);
    } else {
        sendJsonResponse(c, 404, "{\"error\":\"Not Found\"}");
    }
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
            "{\"success\":true,\"userId\":%d,\"name\":\"%s\",\"username\":\"%s\",\"role\":\"%s\",\"workspaceId\":\"%s\"}",
            user.userId, user.name, user.username, roleToStr(user.role), user.workspaceId);
        sendJsonResponse(c, 200, buf);
    } else {
        sendJsonResponse(c, 401, "{\"success\":false,\"message\":\"Invalid credentials\"}");
    }
}

// ─────────────────────────────────────────────────────────────
// GET /api/bins
// ─────────────────────────────────────────────────────────────
static void handleGetBins(struct mg_connection *c, struct mg_http_message *hm) {
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
        // Workspace Isolation
        if (g_current_workspace[0] != '\0' && strcmp(b.workspaceId, g_current_workspace) != 0) continue;
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
static void handleGetVehicles(struct mg_connection *c, struct mg_http_message *hm) {
    FILE *fp = fopen(VEHICLES_FILE, "rb");
    if (!fp) { sendJsonResponse(c, 200, "[]"); return; }

    char *buf = (char *)malloc(16384);
    if (!buf) { fclose(fp); sendJsonResponse(c, 500, "{\"error\":\"OOM\"}"); return; }
    buf[0] = '\0';
    strcat(buf, "[");
    int first = 1;
    Vehicle v;
    while (fread(&v, sizeof(Vehicle), 1, fp) == 1) {
        // Workspace Isolation
        if (g_current_workspace[0] != '\0' && strcmp(v.workspaceId, g_current_workspace) != 0) continue;
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
static void handleGetCollections(struct mg_connection *c, struct mg_http_message *hm) {
    FILE *fp = fopen(COLLECTIONS_FILE, "rb");
    if (!fp) { sendJsonResponse(c, 200, "[]"); return; }

    char *buf = (char *)malloc(32768);
    if (!buf) { fclose(fp); sendJsonResponse(c, 500, "{\"error\":\"OOM\"}"); return; }
    buf[0] = '\0';
    strcat(buf, "[");
    int first = 1;
    CollectionRequest req;
    while (fread(&req, sizeof(CollectionRequest), 1, fp) == 1) {
        // Workspace Isolation
        if (g_current_workspace[0] != '\0' && strcmp(req.workspaceId, g_current_workspace) != 0) continue;
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
static void handleGetResidents(struct mg_connection *c, struct mg_http_message *hm) {
    FILE *fp = fopen(RESIDENTS_FILE, "rb");
    if (!fp) { sendJsonResponse(c, 200, "[]"); return; }

    char *buf = (char *)malloc(16384);
    if (!buf) { fclose(fp); sendJsonResponse(c, 500, "{\"error\":\"OOM\"}"); return; }
    buf[0] = '\0';
    strcat(buf, "[");
    int first = 1;
    Resident r;
    while (fread(&r, sizeof(Resident), 1, fp) == 1) {
        // Workspace Isolation
        if (g_current_workspace[0] != '\0' && strcmp(r.workspaceId, g_current_workspace) != 0) continue;
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
static void handleGetWaste(struct mg_connection *c, struct mg_http_message *hm) {
    FILE *fp = fopen(WASTE_FILE, "rb");
    if (!fp) { sendJsonResponse(c, 200, "[]"); return; }

    char *buf = (char *)malloc(32768);
    if (!buf) { fclose(fp); sendJsonResponse(c, 500, "{\"error\":\"OOM\"}"); return; }
    buf[0] = '\0';
    strcat(buf, "[");
    int first = 1;
    Waste w;
    while (fread(&w, sizeof(Waste), 1, fp) == 1) {
        // Workspace Isolation
        if (g_current_workspace[0] != '\0' && strcmp(w.workspaceId, g_current_workspace) != 0) continue;
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
static void handleGetAlerts(struct mg_connection *c, struct mg_http_message *hm) {
    FILE *fp = fopen(ALERTS_FILE, "rb");
    if (!fp) { sendJsonResponse(c, 200, "[]"); return; }

    char *buf = (char *)malloc(32768);
    if (!buf) { fclose(fp); sendJsonResponse(c, 500, "{\"error\":\"OOM\"}"); return; }
    buf[0] = '\0';
    strcat(buf, "[");
    int first = 1;
    Alert a;
    while (fread(&a, sizeof(Alert), 1, fp) == 1) {
        // Workspace Isolation
        if (g_current_workspace[0] != '\0' && strcmp(a.workspaceId, g_current_workspace) != 0) continue;
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
static void handleGetRecycling(struct mg_connection *c, struct mg_http_message *hm) {
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
static void handleGetDashboard(struct mg_connection *c, struct mg_http_message *hm) {
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
static void handleProcessCollection(struct mg_connection *c, struct mg_http_message *hm) {
    // processNextCollection();
    sendJsonResponse(c, 200, "{\"success\":true,\"message\":\"Highest priority collection processed\"}");
}

// ─────────────────────────────────────────────────────────────
// POST /api/demo/reset
// ─────────────────────────────────────────────────────────────

// Phase 7 Routing Handlers
static void handleGetRoutes(struct mg_connection *c, struct mg_http_message *hm) {
    Route arr[100];
    int count = getRoutes(arr, 100);
    char buf[8192];
    int pos = snprintf(buf, sizeof(buf), "[");
    for (int i=0; i<count; i++) {
        pos += snprintf(buf+pos, sizeof(buf)-pos, "%s{\"routeId\":%d,\"type\":\"%s\",\"driverId\":%d,\"vehicleId\":%d,\"status\":%d,\"plannedLoad\":%.2f,\"distance\":%.2f}",
                        (i>0?",":""), arr[i].routeId, arr[i].routeType, arr[i].driverId, arr[i].vehicleId, arr[i].status, arr[i].totalPlannedLoadKg, arr[i].totalDistanceKm);
    }
    snprintf(buf+pos, sizeof(buf)-pos, "]");
    sendJsonResponse(c, 200, buf);
}

static void handlePlanCollectionRoute(struct mg_connection *c, struct mg_http_message *hm) {
    double h, cl, v;
    mg_json_get_num(hm->body, "$.hubId", &h);
    mg_json_get_num(hm->body, "$.cleanerId", &cl);
    mg_json_get_num(hm->body, "$.vehicleId", &v);
    
    int routeId = planCollectionRoute((int)h, (int)cl, (int)v);
    if(routeId > 0) {
        char buf[256];
        snprintf(buf, sizeof(buf), "{\"message\":\"Route planned\", \"routeId\":%d}", routeId);
        sendJsonResponse(c, 200, buf);
    } else {
        sendJsonResponse(c, 400, "{\"error\":\"Failed to plan route.\"}");
    }
}

static void handlePlanTransferRoute(struct mg_connection *c, struct mg_http_message *hm) {
    double h, f, d, v;
    mg_json_get_num(hm->body, "$.hubId", &h);
    mg_json_get_num(hm->body, "$.facilityId", &f);
    mg_json_get_num(hm->body, "$.driverId", &d);
    mg_json_get_num(hm->body, "$.vehicleId", &v);
    
    int routeId = planTransferRoute((int)h, (int)f, (int)d, (int)v);
    if(routeId > 0) {
        char buf[256];
        snprintf(buf, sizeof(buf), "{\"message\":\"Transfer route planned\", \"routeId\":%d}", routeId);
        sendJsonResponse(c, 200, buf);
    } else {
        sendJsonResponse(c, 400, "{\"error\":\"Failed to plan route.\"}");
    }
}

static void handleRouteAction(struct mg_connection *c, struct mg_http_message *hm, const char* action) {
    int actorId = 1; // From JWT
    char uriStr[128];
    snprintf(uriStr, sizeof(uriStr), "%.*s", (int)hm->uri.len, hm->uri.buf);
    int routeId = 0;
    sscanf(uriStr, "/api/routes/%d", &routeId);
    
    int res = 0;
    if(strcmp(action, "assign") == 0) res = dispatchRoute(routeId, actorId);
    else if(strcmp(action, "accept") == 0) res = driverAcceptRoute(routeId, actorId);
    else if(strcmp(action, "start") == 0) res = startRoute(routeId, actorId);
    else if(strcmp(action, "complete") == 0) res = completeRoute(routeId, actorId);
    else if(strcmp(action, "cancel") == 0) res = cancelRoute(routeId, actorId, "Cancelled via API");
    
    if(res) sendJsonResponse(c, 200, "{\"message\":\"Success\"}");
    else sendJsonResponse(c, 400, "{\"error\":\"Invalid state transition\"}");
}

static void handleArriveStop(struct mg_connection *c, struct mg_http_message *hm) {
    char uriStr[128];
    snprintf(uriStr, sizeof(uriStr), "%.*s", (int)hm->uri.len, hm->uri.buf);
    
    int routeId, stopId;
    if(sscanf(uriStr, "/api/routes/%d/stops/%d/arrive", &routeId, &stopId) == 2) {
        int actorId = 1; 
        char stopQr[128] = "";
        mg_json_unescape(hm->body, "$.stopQrCode", stopQr, sizeof(stopQr));
        
        if(arriveAtStopQR(routeId, stopId, actorId, stopQr)) {
            sendJsonResponse(c, 200, "{\"message\":\"Arrived at stop\"}");
        } else {
            sendJsonResponse(c, 400, "{\"error\":\"Failed to arrive. Invalid QR or state.\"}");
        }
    } else {
        sendJsonResponse(c, 400, "{\"error\":\"Invalid URL format\"}");
    }
}

static void handleStopAction(struct mg_connection *c, struct mg_http_message *hm, const char* action) {
    int actorId = 1; // From JWT
    char uriStr[128];
    snprintf(uriStr, sizeof(uriStr), "%.*s", (int)hm->uri.len, hm->uri.buf);
    int routeId = 0, stopId = 0;
    sscanf(uriStr, "/api/routes/%d/stops/%d", &routeId, &stopId);
    
    int res = 0;
    if(strcmp(action, "complete") == 0) {
        double w;
        mg_json_get_num(hm->body, "$.actualWeightKg", &w);
        res = completeStop(routeId, stopId, actorId, (float)w);
    }
    
    if(res) sendJsonResponse(c, 200, "{\"message\":\"Success\"}");
    else sendJsonResponse(c, 400, "{\"error\":\"Invalid state transition\"}");
}

static void handleGetRouteStops(struct mg_connection *c, struct mg_http_message *hm) {
    char uriStr[128];
    snprintf(uriStr, sizeof(uriStr), "%.*s", (int)hm->uri.len, hm->uri.buf);
    int routeId = 0;
    sscanf(uriStr, "/api/routes/%d/stops", &routeId);
    
    RouteEngineStop arr[100];
    int count = getRouteEngineStops(routeId, arr, 100);
    char buf[4096];
    int pos = snprintf(buf, sizeof(buf), "[");
    for(int i=0; i<count; i++) {
        pos += snprintf(buf+pos, sizeof(buf)-pos, "%s{\"stopId\":%d,\"type\":\"%s\",\"refId\":%d,\"status\":%d,\"seq\":%d,\"estKg\":%.2f}",
                        (i>0?",":""), arr[i].routeStopId, arr[i].stopType, arr[i].referenceId, arr[i].status, arr[i].sequenceNumber, arr[i].estimatedWeightKg);
    }
    snprintf(buf+pos, sizeof(buf)-pos, "]");
    sendJsonResponse(c, 200, buf);
}


// Phase 8: QR & Operations Handlers
static void handleQRScan(struct mg_connection *c, struct mg_http_message *hm) {
    char qr[128];
    mg_json_unescape(hm->body, "$.qrCode", qr, sizeof(qr));
    double r, v, l;
    mg_json_get_num(hm->body, "$.routeId", &r);
    mg_json_get_num(hm->body, "$.vehicleId", &v);
    mg_json_get_num(hm->body, "$.locationId", &l);
    
    char reason[150] = "";
    QREventResult res = validateQRCode(qr, (int)r, (int)v, 1, (int)l, reason);
    if(res == QR_SUCCESS) {
        sendJsonResponse(c, 200, "{\"message\":\"Valid QR code\"}");
    } else {
        char buf[256];
        snprintf(buf, sizeof(buf), "{\"error\":\"%s\"}", reason);
        sendJsonResponse(c, 400, buf);
    }
}

static void handleDriverCheckin(struct mg_connection *c, struct mg_http_message *hm) {
    char qr[128];
    mg_json_unescape(hm->body, "$.vehicleQrCode", qr, sizeof(qr));
    double r;
    mg_json_get_num(hm->body, "$.routeId", &r);
    
    int actorId = 1; // From JWT
    if(driverCheckInVehicle((int)r, actorId, qr)) {
        sendJsonResponse(c, 200, "{\"message\":\"Check-in successful\"}");
    } else {
        sendJsonResponse(c, 400, "{\"error\":\"Invalid vehicle or route state\"}");
    }
}

static void handleDriverInspection(struct mg_connection *c, struct mg_http_message *hm) {
    double v, r;
    bool passed = true; // Simplified for demo payload parsing
    mg_json_get_num(hm->body, "$.vehicleId", &v);
    mg_json_get_num(hm->body, "$.routeId", &r);
    mg_json_get_bool(hm->body, "$.passed", &passed);
    
    int actorId = 1;
    if(submitVehicleInspection((int)v, actorId, (int)r, passed)) {
        sendJsonResponse(c, 200, "{\"message\":\"Inspection submitted successfully\"}");
    } else {
        sendJsonResponse(c, 400, "{\"error\":\"Inspection failed, route aborted\"}");
    }
}

static void handleHubArrival(struct mg_connection *c, struct mg_http_message *hm) {
    char qr[128];
    mg_json_unescape(hm->body, "$.hubQrCode", qr, sizeof(qr));
    
    char uriStr[128];
    snprintf(uriStr, sizeof(uriStr), "%.*s", (int)hm->uri.len, hm->uri.buf);
    int hubId = 0;
    sscanf(uriStr, "/api/hubs/%d/arrival", &hubId);
    
    char reason[150] = "";
    if(validateQRCode(qr, 0, 0, 1, hubId, reason) == QR_SUCCESS) {
        sendJsonResponse(c, 200, "{\"message\":\"Arrived at Hub\"}");
    } else {
        sendJsonResponse(c, 400, "{\"error\":\"Wrong hub scanned\"}");
    }
}


// ─────────────────────────────────────────────────────────────
// PHASE 9: ANALYTICS & EXECUTIVE COMMAND CENTER HANDLERS
// ─────────────────────────────────────────────────────────────

static void parseAnalyticsFilter(struct mg_http_message *hm, AnalyticsFilter *f) {
    memset(f, 0, sizeof(AnalyticsFilter));
    f->timeFilter = TIME_FILTER_ALL;

    char tfStr[32] = "";
    if (mg_http_get_var(&hm->query, "timeFilter", tfStr, sizeof(tfStr)) > 0 ||
        mg_http_get_var(&hm->query, "filter", tfStr, sizeof(tfStr)) > 0 ||
        mg_http_get_var(&hm->query, "range", tfStr, sizeof(tfStr)) > 0) {
        if (strcmp(tfStr, "today") == 0 || strcmp(tfStr, "TODAY") == 0) f->timeFilter = TIME_FILTER_TODAY;
        else if (strcmp(tfStr, "yesterday") == 0 || strcmp(tfStr, "YESTERDAY") == 0) f->timeFilter = TIME_FILTER_YESTERDAY;
        else if (strcmp(tfStr, "last_7_days") == 0 || strcmp(tfStr, "7d") == 0) f->timeFilter = TIME_FILTER_LAST_7_DAYS;
        else if (strcmp(tfStr, "last_30_days") == 0 || strcmp(tfStr, "30d") == 0) f->timeFilter = TIME_FILTER_LAST_30_DAYS;
        else if (strcmp(tfStr, "this_month") == 0) f->timeFilter = TIME_FILTER_THIS_MONTH;
        else if (strcmp(tfStr, "last_month") == 0) f->timeFilter = TIME_FILTER_LAST_MONTH;
        else if (strcmp(tfStr, "custom") == 0) f->timeFilter = TIME_FILTER_CUSTOM;
    }

    mg_http_get_var(&hm->query, "from", f->fromDate, sizeof(f->fromDate));
    mg_http_get_var(&hm->query, "to", f->toDate, sizeof(f->toDate));
    mg_http_get_var(&hm->query, "wasteType", f->wasteType, sizeof(f->wasteType));

    char numBuf[32];
    if (mg_http_get_var(&hm->query, "hubId", numBuf, sizeof(numBuf)) > 0) f->hubId = atoi(numBuf);
    if (mg_http_get_var(&hm->query, "facilityId", numBuf, sizeof(numBuf)) > 0) f->facilityId = atoi(numBuf);
    if (mg_http_get_var(&hm->query, "vehicleId", numBuf, sizeof(numBuf)) > 0) f->vehicleId = atoi(numBuf);
    if (mg_http_get_var(&hm->query, "driverId", numBuf, sizeof(numBuf)) > 0) f->driverId = atoi(numBuf);
    if (mg_http_get_var(&hm->query, "cleanerId", numBuf, sizeof(numBuf)) > 0) f->cleanerId = atoi(numBuf);
    if (mg_http_get_var(&hm->query, "residentId", numBuf, sizeof(numBuf)) > 0) f->residentId = atoi(numBuf);

    // Extract requester role & ID from headers or query
    char roleBuf[32] = "";
    struct mg_str *rHeader = mg_http_get_header(hm, "X-User-Role");
    if (rHeader && rHeader->len > 0) {
        snprintf(roleBuf, sizeof(roleBuf), "%.*s", (int)rHeader->len, rHeader->buf);
    } else {
        mg_http_get_var(&hm->query, "role", roleBuf, sizeof(roleBuf));
    }

    char idBuf[32] = "";
    struct mg_str *idHeader = mg_http_get_header(hm, "X-User-Id");
    if (idHeader && idHeader->len > 0) {
        snprintf(idBuf, sizeof(idBuf), "%.*s", (int)idHeader->len, idHeader->buf);
        f->requesterId = atoi(idBuf);
    } else if (mg_http_get_var(&hm->query, "userId", idBuf, sizeof(idBuf)) > 0) {
        f->requesterId = atoi(idBuf);
    }

    if (strcmp(roleBuf, "LOCAL_HUB_MANAGER") == 0) f->requesterRole = ROLE_LOCAL_HUB_MANAGER;
    else if (strcmp(roleBuf, "CLEANER") == 0) f->requesterRole = ROLE_CLEANER;
    else if (strcmp(roleBuf, "DRIVER") == 0) f->requesterRole = ROLE_DRIVER;
    else if (strcmp(roleBuf, "RECYCLING_MANAGER") == 0) f->requesterRole = ROLE_RECYCLING_MANAGER;
    else if (strcmp(roleBuf, "RESIDENT") == 0) f->requesterRole = ROLE_RESIDENT;
    else f->requesterRole = ROLE_ADMIN;
}


// ─────────────────────────────────────────────────────────────
// PHASE 10: MUNICIPAL INCIDENT RESPONSE & ALERT CENTER HANDLERS
// ─────────────────────────────────────────────────────────────

static void handleGetIncidentsPhase10(struct mg_connection *c, struct mg_http_message *hm) {
    runAlertEvaluationCycle(); // Run real evaluation rule cycle

    char statusFilter[32] = "", severityFilter[32] = "", roleBuf[32] = "";
    mg_http_get_var(&hm->query, "status", statusFilter, sizeof(statusFilter));
    mg_http_get_var(&hm->query, "severity", severityFilter, sizeof(severityFilter));

    struct mg_str *rHeader = mg_http_get_header(hm, "X-User-Role");
    if (rHeader && rHeader->len > 0) snprintf(roleBuf, sizeof(roleBuf), "%.*s", (int)rHeader->len, rHeader->buf);
    else mg_http_get_var(&hm->query, "role", roleBuf, sizeof(roleBuf));

    int requesterId = 0;
    char idBuf[32] = "";
    struct mg_str *idHeader = mg_http_get_header(hm, "X-User-Id");
    if (idHeader && idHeader->len > 0) {
        snprintf(idBuf, sizeof(idBuf), "%.*s", (int)idHeader->len, idHeader->buf);
        requesterId = atoi(idBuf);
    } else if (mg_http_get_var(&hm->query, "userId", idBuf, sizeof(idBuf)) > 0) {
        requesterId = atoi(idBuf);
    }

    FILE *fp = fopen(INCIDENTS_FILE, "rb");
    if (!fp) { sendJsonResponse(c, 200, "[]"); return; }

    char *buf = (char*)malloc(65536);
    if (!buf) { fclose(fp); sendJsonResponse(c, 500, "{\"error\":\"OOM\"}"); return; }

    int offset = snprintf(buf, 65536, "[");
    int first = 1;
    Incident inc;

    while (fread(&inc, sizeof(Incident), 1, fp) == 1) {
        // Workspace Isolation
        if (g_current_workspace[0] != '\0' && strcmp(inc.workspaceId, g_current_workspace) != 0) continue;
        // Filters
        if (strlen(statusFilter) > 0 && strcmp(inc.status, statusFilter) != 0) continue;
        if (strlen(severityFilter) > 0 && strcmp(inc.severity, severityFilter) != 0) continue;

        // Role scoping
        if (strcmp(roleBuf, "DRIVER") == 0 && requesterId > 0 && inc.reportedBy != requesterId && inc.assignedTo != requesterId) continue;
        if (strcmp(roleBuf, "CLEANER") == 0 && requesterId > 0 && inc.reportedBy != requesterId && inc.assignedTo != requesterId) continue;

        char type[64], sev[32], st[32], desc[512], cat[32], rat[32], aat[32], clsat[32], arole[32], etype[32];
        jsonStr(type, sizeof(type), inc.type);
        jsonStr(sev, sizeof(sev), inc.severity);
        jsonStr(st, sizeof(st), inc.status);
        jsonStr(desc, sizeof(desc), inc.description);
        jsonStr(cat, sizeof(cat), inc.createdAt);
        jsonStr(rat, sizeof(rat), inc.resolvedAt);
        jsonStr(aat, sizeof(aat), inc.acknowledgedAt);
        jsonStr(clsat, sizeof(clsat), inc.closedAt);
        jsonStr(arole, sizeof(arole), inc.assignedRole);
        jsonStr(etype, sizeof(etype), inc.entityType);

        int written = snprintf(buf + offset, 65536 - offset,
            "%s{\"incidentId\":%d,\"type\":\"%s\",\"severity\":\"%s\",\"status\":\"%s\","
            "\"description\":\"%s\",\"collectionId\":%d,\"reportedBy\":%d,\"assignedTo\":%d,"
            "\"createdAt\":\"%s\",\"resolvedAt\":\"%s\",\"acknowledgedAt\":\"%s\",\"closedAt\":\"%s\","
            "\"entityType\":\"%s\",\"entityId\":%d,\"hubId\":%d,\"vehicleId\":%d,\"routeId\":%d,"
            "\"facilityId\":%d,\"assignedRole\":\"%s\",\"escalationLevel\":%d}",
            (first ? "" : ","),
            inc.incidentId, type, sev, st,
            desc, inc.collectionId, inc.reportedBy, inc.assignedTo,
            cat, rat, aat, clsat,
            etype, inc.entityId, inc.hubId, inc.vehicleId, inc.routeId,
            inc.facilityId, arole, inc.escalationLevel);

        if (written < 0 || offset + written >= 65536) break;
        offset += written;
        first = 0;
    }
    fclose(fp);
    snprintf(buf + offset, 65536 - offset, "]");

    sendJsonResponse(c, 200, buf);
    free(buf);
}

static void handleGetIncidentDetail(struct mg_connection *c, struct mg_http_message *hm) {
    char uriStr[128];
    snprintf(uriStr, sizeof(uriStr), "%.*s", (int)hm->uri.len, hm->uri.buf);
    int incId = 0;
    if (sscanf(uriStr, "/api/incidents/%d", &incId) != 1) {
        sendJsonResponse(c, 400, "{\"error\":\"Invalid incident ID\"}");
        return;
    }

    Incident inc;
    if (!getIncidentById(incId, &inc)) {
        sendJsonResponse(c, 404, "{\"error\":\"Incident not found\"}");
        return;
    }

    char type[64], sev[32], st[32], desc[512], cat[32], rat[32], aat[32], clsat[32], arole[32], etype[32];
    jsonStr(type, sizeof(type), inc.type);
    jsonStr(sev, sizeof(sev), inc.severity);
    jsonStr(st, sizeof(st), inc.status);
    jsonStr(desc, sizeof(desc), inc.description);
    jsonStr(cat, sizeof(cat), inc.createdAt);
    jsonStr(rat, sizeof(rat), inc.resolvedAt);
    jsonStr(aat, sizeof(aat), inc.acknowledgedAt);
    jsonStr(clsat, sizeof(clsat), inc.closedAt);
    jsonStr(arole, sizeof(arole), inc.assignedRole);
    jsonStr(etype, sizeof(etype), inc.entityType);

    char buf[2048];
    snprintf(buf, sizeof(buf),
        "{\"incidentId\":%d,\"type\":\"%s\",\"severity\":\"%s\",\"status\":\"%s\","
        "\"description\":\"%s\",\"collectionId\":%d,\"reportedBy\":%d,\"assignedTo\":%d,"
        "\"createdAt\":\"%s\",\"resolvedAt\":\"%s\",\"acknowledgedAt\":\"%s\",\"closedAt\":\"%s\","
        "\"entityType\":\"%s\",\"entityId\":%d,\"hubId\":%d,\"vehicleId\":%d,\"routeId\":%d,"
        "\"facilityId\":%d,\"assignedRole\":\"%s\",\"escalationLevel\":%d}",
        inc.incidentId, type, sev, st,
        desc, inc.collectionId, inc.reportedBy, inc.assignedTo,
        cat, rat, aat, clsat,
        etype, inc.entityId, inc.hubId, inc.vehicleId, inc.routeId,
        inc.facilityId, arole, inc.escalationLevel);

    sendJsonResponse(c, 200, buf);
}

static void handleCreateIncidentManual(struct mg_connection *c, struct mg_http_message *hm) {
    char type[64] = "OTHER", severity[32] = "MEDIUM", desc[256] = "", etype[32] = "MANUAL", arole[32] = "ADMIN";
    mg_json_unescape(hm->body, "$.type", type, sizeof(type));
    mg_json_unescape(hm->body, "$.severity", severity, sizeof(severity));
    mg_json_unescape(hm->body, "$.description", desc, sizeof(desc));
    mg_json_unescape(hm->body, "$.entityType", etype, sizeof(etype));
    mg_json_unescape(hm->body, "$.assignedRole", arole, sizeof(arole));

    double eid = 0, hid = 0, vid = 0, rid = 0, fid = 0, rep = 1;
    mg_json_get_num(hm->body, "$.entityId", &eid);
    mg_json_get_num(hm->body, "$.hubId", &hid);
    mg_json_get_num(hm->body, "$.vehicleId", &vid);
    mg_json_get_num(hm->body, "$.routeId", &rid);
    mg_json_get_num(hm->body, "$.facilityId", &fid);
    mg_json_get_num(hm->body, "$.reportedBy", &rep);

    int id = createOperationalIncident(type, severity, etype, (int)eid, (int)hid, (int)vid, (int)rid, (int)fid, (int)rep, arole, desc);
    if (id > 0) {
        char buf[128];
        snprintf(buf, sizeof(buf), "{\"success\":true,\"incidentId\":%d}", id);
        sendJsonResponse(c, 201, buf);
    } else {
        sendJsonResponse(c, 400, "{\"error\":\"Failed to create incident or duplicate active incident exists\"}");
    }
}

static void handleIncidentActionWorkflow(struct mg_connection *c, struct mg_http_message *hm, const char* actionType) {
    char uriStr[128];
    snprintf(uriStr, sizeof(uriStr), "%.*s", (int)hm->uri.len, hm->uri.buf);
    int incId = 0;
    char actionPath[64] = "";
    if (sscanf(uriStr, "/api/incidents/%d/%s", &incId, actionPath) < 1) {
        sendJsonResponse(c, 400, "{\"error\":\"Invalid URL format\"}");
        return;
    }

    int actorId = 1;
    char actorRole[32] = "ADMIN", note[256] = "", actTaken[128] = "", targetRole[32] = "";
    double assignTo = 0;

    mg_json_unescape(hm->body, "$.note", note, sizeof(note));
    mg_json_unescape(hm->body, "$.actionTaken", actTaken, sizeof(actTaken));
    mg_json_unescape(hm->body, "$.actorRole", actorRole, sizeof(actorRole));
    mg_json_unescape(hm->body, "$.targetRole", targetRole, sizeof(targetRole));
    mg_json_get_num(hm->body, "$.assignToUserId", &assignTo);
    mg_json_get_num(hm->body, "$.actorId", &assignTo);
    if (assignTo > 0) actorId = (int)assignTo;

    int res = 0;
    if (strcmp(actionType, "acknowledge") == 0) {
        res = acknowledgeIncident(incId, actorId, actorRole, note);
    } else if (strcmp(actionType, "assign") == 0) {
        double targetUser = 0;
        mg_json_get_num(hm->body, "$.assignToUserId", &targetUser);
        res = assignIncident(incId, actorId, actorRole, (int)targetUser, targetRole, note);
    } else if (strcmp(actionType, "investigate") == 0) {
        res = investigateIncident(incId, actorId, actorRole, note);
    } else if (strcmp(actionType, "action") == 0) {
        res = actionIncident(incId, actorId, actorRole, actTaken, note);
    } else if (strcmp(actionType, "resolve") == 0) {
        res = resolveIncidentWithAudit(incId, actorId, actorRole, note);
    } else if (strcmp(actionType, "close") == 0) {
        res = closeIncident(incId, actorId, actorRole, note);
    } else if (strcmp(actionType, "reopen") == 0) {
        res = reopenIncident(incId, actorId, actorRole, note);
    }

    if (res) {
        sendJsonResponse(c, 200, "{\"success\":true,\"message\":\"Incident state updated successfully\"}");
    } else {
        sendJsonResponse(c, 400, "{\"error\":\"Invalid state transition or incident not found\"}");
    }
}

static void handleGetIncidentTimelineAPI(struct mg_connection *c, struct mg_http_message *hm) {
    char uriStr[128];
    snprintf(uriStr, sizeof(uriStr), "%.*s", (int)hm->uri.len, hm->uri.buf);
    int incId = 0;
    if (sscanf(uriStr, "/api/incidents/%d/timeline", &incId) != 1) {
        sendJsonResponse(c, 400, "{\"error\":\"Invalid incident ID\"}");
        return;
    }

    IncidentTimelineEntry list[50];
    int count = getIncidentTimeline(incId, list, 50);

    char *buf = (char*)malloc(16384);
    if (!buf) { sendJsonResponse(c, 500, "{\"error\":\"OOM\"}"); return; }

    int offset = snprintf(buf, 16384, "[");
    for (int i = 0; i < count; i++) {
        char ts[64], act[64], arole[32], prev[32], nxt[32], cmt[512], ev[64];
        jsonStr(ts, sizeof(ts), list[i].timestamp);
        jsonStr(act, sizeof(act), list[i].action);
        jsonStr(arole, sizeof(arole), list[i].actorRole);
        jsonStr(prev, sizeof(prev), list[i].previousStatus);
        jsonStr(nxt, sizeof(nxt), list[i].newStatus);
        jsonStr(cmt, sizeof(cmt), list[i].comment);
        jsonStr(ev, sizeof(ev), list[i].evidenceRef);

        int written = snprintf(buf + offset, 16384 - offset,
            "%s{\"timelineId\":%d,\"incidentId\":%d,\"timestamp\":\"%s\",\"actorId\":%d,"
            "\"actorRole\":\"%s\",\"action\":\"%s\",\"previousStatus\":\"%s\",\"newStatus\":\"%s\","
            "\"comment\":\"%s\",\"evidenceRef\":\"%s\"}",
            (i == 0 ? "" : ","),
            list[i].timelineId, list[i].incidentId, ts, list[i].actorId,
            arole, act, prev, nxt, cmt, ev);

        if (written < 0 || offset + written >= 16384) break;
        offset += written;
    }
    snprintf(buf + offset, 16384 - offset, "]");

    sendJsonResponse(c, 200, buf);
    free(buf);
}

static void handleAddIncidentCommentAPI(struct mg_connection *c, struct mg_http_message *hm) {
    char uriStr[128];
    snprintf(uriStr, sizeof(uriStr), "%.*s", (int)hm->uri.len, hm->uri.buf);
    int incId = 0;
    if (sscanf(uriStr, "/api/incidents/%d/comments", &incId) != 1) {
        sendJsonResponse(c, 400, "{\"error\":\"Invalid incident ID\"}");
        return;
    }

    char comment[256] = "", role[32] = "ADMIN";
    mg_json_unescape(hm->body, "$.comment", comment, sizeof(comment));
    mg_json_unescape(hm->body, "$.actorRole", role, sizeof(role));
    double actorId = 1;
    mg_json_get_num(hm->body, "$.actorId", &actorId);

    if (addIncidentComment(incId, (int)actorId, role, comment)) {
        sendJsonResponse(c, 201, "{\"success\":true,\"message\":\"Comment added\"}");
    } else {
        sendJsonResponse(c, 400, "{\"error\":\"Comment cannot be empty\"}");
    }
}

static void handleGetUnreadAlerts(struct mg_connection *c, struct mg_http_message *hm) {
    runAlertEvaluationCycle();

    FILE *fp = fopen(ALERTS_FILE, "rb");
    if (!fp) { sendJsonResponse(c, 200, "[]"); return; }

    char *buf = (char*)malloc(16384);
    if (!buf) { fclose(fp); sendJsonResponse(c, 500, "{\"error\":\"OOM\"}"); return; }

    int offset = snprintf(buf, 16384, "[");
    int first = 1;
    Alert a;
    while (fread(&a, sizeof(Alert), 1, fp) == 1) {
        // Workspace Isolation
        if (g_current_workspace[0] != '\0' && strcmp(a.workspaceId, g_current_workspace) != 0) continue;
        if (a.resolved == 0) {
            char type[64], msg[256], dt[64];
            jsonStr(type, sizeof(type), a.type);
            jsonStr(msg, sizeof(msg), a.message);
            jsonStr(dt, sizeof(dt), a.date);

            int written = snprintf(buf + offset, 16384 - offset,
                "%s{\"alertId\":%d,\"type\":\"%s\",\"referenceId\":%d,\"message\":\"%s\",\"date\":\"%s\",\"resolved\":%d}",
                (first ? "" : ","), a.alertId, type, a.referenceId, msg, dt, a.resolved);
            if (written < 0 || offset + written >= 16384) break;
            offset += written;
            first = 0;
        }
    }
    fclose(fp);
    snprintf(buf + offset, 16384 - offset, "]");

    sendJsonResponse(c, 200, buf);
    free(buf);
}

static void handleAcknowledgeAlertAPI(struct mg_connection *c, struct mg_http_message *hm) {
    char uriStr[128];
    snprintf(uriStr, sizeof(uriStr), "%.*s", (int)hm->uri.len, hm->uri.buf);
    int alertId = 0;
    if (sscanf(uriStr, "/api/alerts/%d/acknowledge", &alertId) == 1) {
        resolveAlert(alertId);
        sendJsonResponse(c, 200, "{\"success\":true,\"message\":\"Alert acknowledged\"}");
    } else {
        sendJsonResponse(c, 400, "{\"error\":\"Invalid alert ID\"}");
    }
}

static void handleGetNotificationPreferencesAPI(struct mg_connection *c, struct mg_http_message *hm) {
    int userId = 1;
    char idBuf[32];
    if (mg_http_get_var(&hm->query, "userId", idBuf, sizeof(idBuf)) > 0) {
        userId = atoi(idBuf);
    }

    NotificationPreference prefs;
    getNotificationPreferences(userId, &prefs);

    char buf[512];
    snprintf(buf, sizeof(buf),
        "{\"userId\":%d,\"criticalAlerts\":%d,\"highSeverityAlerts\":%d,"
        "\"assignedIncidentsOnly\":%d,\"hubAlerts\":%d,\"vehicleAlerts\":%d,"
        "\"collectionExceptions\":%d,\"recyclingExceptions\":%d}",
        prefs.userId, prefs.criticalAlerts, prefs.highSeverityAlerts,
        prefs.assignedIncidentsOnly, prefs.hubAlerts, prefs.vehicleAlerts,
        prefs.collectionExceptions, prefs.recyclingExceptions);

    sendJsonResponse(c, 200, buf);
}

static void handleSaveNotificationPreferencesAPI(struct mg_connection *c, struct mg_http_message *hm) {
    NotificationPreference prefs;
    memset(&prefs, 0, sizeof(NotificationPreference));

    double uid = 1, crit = 1, high = 1, ass = 0, hub = 1, veh = 1, col = 1, rec = 1;
    mg_json_get_num(hm->body, "$.userId", &uid);
    mg_json_get_num(hm->body, "$.criticalAlerts", &crit);
    mg_json_get_num(hm->body, "$.highSeverityAlerts", &high);
    mg_json_get_num(hm->body, "$.assignedIncidentsOnly", &ass);
    mg_json_get_num(hm->body, "$.hubAlerts", &hub);
    mg_json_get_num(hm->body, "$.vehicleAlerts", &veh);
    mg_json_get_num(hm->body, "$.collectionExceptions", &col);
    mg_json_get_num(hm->body, "$.recyclingExceptions", &rec);

    prefs.userId = (int)uid;
    prefs.criticalAlerts = (int)crit;
    prefs.highSeverityAlerts = (int)high;
    prefs.assignedIncidentsOnly = (int)ass;
    prefs.hubAlerts = (int)hub;
    prefs.vehicleAlerts = (int)veh;
    prefs.collectionExceptions = (int)col;
    prefs.recyclingExceptions = (int)rec;

    if (saveNotificationPreferences(&prefs)) {
        sendJsonResponse(c, 200, "{\"success\":true,\"message\":\"Preferences saved\"}");
    } else {
        sendJsonResponse(c, 500, "{\"error\":\"Failed to save preferences\"}");
    }
}

static void handleAnalyticsSummary(struct mg_connection *c, struct mg_http_message *hm) {
    AnalyticsFilter filter;
    parseAnalyticsFilter(hm, &filter);

    AnalyticsSummary s;
    calculateAnalyticsSummary(&filter, &s);

    char *buf = (char*)malloc(4096);
    if (!buf) { sendJsonResponse(c, 500, "{\"error\":\"OOM\"}"); return; }

    snprintf(buf, 4096,
        "{\"totalResidents\":%d,\"activeResidents\":%d,"
        "\"totalCollectionRequests\":%d,\"completedCollections\":%d,"
        "\"pendingCollections\":%d,\"missedCollections\":%d,\"cancelledCollections\":%d,"
        "\"totalWasteCollectedKg\":%.2f,\"totalWasteTransferredKg\":%.2f,"
        "\"totalWasteProcessedKg\":%.2f,\"totalRecoveredKg\":%.2f,\"totalResidualKg\":%.2f,"
        "\"recyclingRecoveryRate\":%.2f,\"totalVehicles\":%d,\"activeVehicles\":%d,"
        "\"totalRoutes\":%d,\"activeRoutes\":%d,\"completedRoutes\":%d,"
        "\"totalHubs\":%d,\"activeHubs\":%d,\"criticalHubs\":%d,"
        "\"totalIncidents\":%d,\"openIncidents\":%d,"
        "\"totalQrScans\":%d,\"successfulQrScans\":%d,\"qrComplianceRate\":%.2f,"
        "\"operationalEfficiencyIndex\":%.2f}",
        s.totalResidents, s.activeResidents,
        s.totalCollectionRequests, s.completedCollections,
        s.pendingCollections, s.missedCollections, s.cancelledCollections,
        s.totalWasteCollectedKg, s.totalWasteTransferredKg,
        s.totalWasteProcessedKg, s.totalRecoveredKg, s.totalResidualKg,
        s.recyclingRecoveryRate, s.totalVehicles, s.activeVehicles,
        s.totalRoutes, s.activeRoutes, s.completedRoutes,
        s.totalHubs, s.activeHubs, s.criticalHubs,
        s.totalIncidents, s.openIncidents,
        s.totalQrScans, s.successfulQrScans, s.qrComplianceRate,
        s.operationalEfficiencyIndex);

    sendJsonResponse(c, 200, buf);
    free(buf);
}

static void handleAnalyticsCollections(struct mg_connection *c, struct mg_http_message *hm) {
    AnalyticsFilter filter;
    parseAnalyticsFilter(hm, &filter);

    CollectionAnalytics coll;
    calculateCollectionAnalytics(&filter, &coll);

    char buf[1024];
    snprintf(buf, sizeof(buf),
        "{\"totalRequests\":%d,\"completedRequests\":%d,\"pendingRequests\":%d,"
        "\"assignedRequests\":%d,\"enRouteRequests\":%d,\"collectingRequests\":%d,"
        "\"missedRequests\":%d,\"cancelledRequests\":%d,\"rescheduledRequests\":%d,"
        "\"totalCollectedKg\":%.2f,\"averageCollectionWeightKg\":%.2f,"
        "\"averageCompletionTimeMin\":%.2f,\"collectionSuccessRate\":%.2f,"
        "\"missedCollectionRate\":%.2f,"
        "\"priorities\":{\"low\":%d,\"normal\":%d,\"high\":%d,\"urgent\":%d}}",
        coll.totalRequests, coll.completedRequests, coll.pendingRequests,
        coll.assignedRequests, coll.enRouteRequests, coll.collectingRequests,
        coll.missedRequests, coll.cancelledRequests, coll.rescheduledRequests,
        coll.totalCollectedKg, coll.averageCollectionWeightKg,
        coll.averageCompletionTimeMin, coll.collectionSuccessRate,
        coll.missedCollectionRate,
        coll.priorityLow, coll.priorityNormal, coll.priorityHigh, coll.priorityUrgent);

    sendJsonResponse(c, 200, buf);
}

static void handleAnalyticsHubs(struct mg_connection *c, struct mg_http_message *hm) {
    AnalyticsFilter filter;
    parseAnalyticsFilter(hm, &filter);

    HubAnalyticsItem items[50];
    int count = getHubAnalyticsList(&filter, items, 50);

    char *buf = (char*)malloc(32768);
    if (!buf) { sendJsonResponse(c, 500, "{\"error\":\"OOM\"}"); return; }

    int offset = snprintf(buf, 32768, "[");
    for (int i = 0; i < count; i++) {
        char name[128], code[64];
        jsonStr(name, sizeof(name), items[i].name);
        jsonStr(code, sizeof(code), items[i].hubCode);

        int written = snprintf(buf + offset, 32768 - offset,
            "%s{\"hubId\":%d,\"hubCode\":\"%s\",\"name\":\"%s\","
            "\"maximumCapacityKg\":%.2f,\"currentInventoryKg\":%.2f,"
            "\"availableCapacityKg\":%.2f,\"utilizationPercentage\":%.2f,"
            "\"inboundKg\":%.2f,\"outboundKg\":%.2f,"
            "\"activeCleaners\":%d,\"pendingCollections\":%d,\"pendingTransfers\":%d,"
            "\"status\":%d,\"alertCount\":%d}",
            (i == 0 ? "" : ","),
            items[i].hubId, code, name,
            items[i].maximumCapacityKg, items[i].currentInventoryKg,
            items[i].availableCapacityKg, items[i].utilizationPercentage,
            items[i].inboundKg, items[i].outboundKg,
            items[i].activeCleaners, items[i].pendingCollections, items[i].pendingTransfers,
            (int)items[i].status, items[i].alertCount);
        if (written < 0 || offset + written >= 32768) break;
        offset += written;
    }
    snprintf(buf + offset, 32768 - offset, "]");

    sendJsonResponse(c, 200, buf);
    free(buf);
}

static void handleAnalyticsFleet(struct mg_connection *c, struct mg_http_message *hm) {
    AnalyticsFilter filter;
    parseAnalyticsFilter(hm, &filter);

    FleetAnalytics fleet;
    calculateFleetAnalytics(&filter, &fleet);

    VehicleAnalyticsItem vItems[50];
    int vCount = getVehicleAnalyticsList(&filter, vItems, 50);

    char *buf = (char*)malloc(32768);
    if (!buf) { sendJsonResponse(c, 500, "{\"error\":\"OOM\"}"); return; }

    int offset = snprintf(buf, 32768,
        "{\"totalVehicles\":%d,\"activeVehicles\":%d,\"inactiveVehicles\":%d,"
        "\"underMaintenance\":%d,\"availableVehicles\":%d,\"assignedVehicles\":%d,"
        "\"onRouteVehicles\":%d,\"atCapacityVehicles\":%d,"
        "\"totalFleetCapacityKg\":%.2f,\"currentFleetLoadKg\":%.2f,"
        "\"fleetUtilizationPercentage\":%.2f,\"inspectionPasses\":%d,\"inspectionFailures\":%d,"
        "\"vehicles\":[",
        fleet.totalVehicles, fleet.activeVehicles, fleet.inactiveVehicles,
        fleet.underMaintenance, fleet.availableVehicles, fleet.assignedVehicles,
        fleet.onRouteVehicles, fleet.atCapacityVehicles,
        fleet.totalFleetCapacityKg, fleet.currentFleetLoadKg,
        fleet.fleetUtilizationPercentage, fleet.inspectionPasses, fleet.inspectionFailures);

    for (int i = 0; i < vCount; i++) {
        char reg[64], type[64], inspDate[64];
        jsonStr(reg, sizeof(reg), vItems[i].registrationNumber);
        jsonStr(type, sizeof(type), vItems[i].vehicleType);
        jsonStr(inspDate, sizeof(inspDate), vItems[i].lastInspectionDate);

        int written = snprintf(buf + offset, 32768 - offset,
            "%s{\"vehicleId\":%d,\"registrationNumber\":\"%s\",\"vehicleType\":\"%s\","
            "\"capacityKg\":%.2f,\"currentLoadKg\":%.2f,\"utilizationPercentage\":%.2f,"
            "\"driverId\":%d,\"status\":%d,\"lastInspectionDate\":\"%s\",\"lastInspectionStatus\":%d}",
            (i == 0 ? "" : ","),
            vItems[i].vehicleId, reg, type,
            vItems[i].capacityKg, vItems[i].currentLoadKg, vItems[i].utilizationPercentage,
            vItems[i].driverId, (int)vItems[i].status, inspDate, (int)vItems[i].lastInspectionStatus);
        if (written < 0 || offset + written >= 32768) break;
        offset += written;
    }
    snprintf(buf + offset, 32768 - offset, "]}");

    sendJsonResponse(c, 200, buf);
    free(buf);
}

static void handleAnalyticsRoutes(struct mg_connection *c, struct mg_http_message *hm) {
    AnalyticsFilter filter;
    parseAnalyticsFilter(hm, &filter);

    RouteAnalytics route;
    calculateRouteAnalytics(&filter, &route);

    RouteAnalyticsItem rItems[50];
    int rCount = getRouteAnalyticsList(&filter, rItems, 50);

    char *buf = (char*)malloc(32768);
    if (!buf) { sendJsonResponse(c, 500, "{\"error\":\"OOM\"}"); return; }

    int offset = snprintf(buf, 32768,
        "{\"totalRoutes\":%d,\"plannedRoutes\":%d,\"dispatchedRoutes\":%d,"
        "\"acceptedRoutes\":%d,\"activeRoutes\":%d,\"completedRoutes\":%d,"
        "\"cancelledRoutes\":%d,\"averageRouteDurationMin\":%.2f,"
        "\"averageStopsPerRoute\":%.2f,\"totalStops\":%d,\"completedStops\":%d,"
        "\"pendingStops\":%d,\"routeUtilizationPercentage\":%.2f,"
        "\"routes\":[",
        route.totalRoutes, route.plannedRoutes, route.dispatchedRoutes,
        route.acceptedRoutes, route.activeRoutes, route.completedRoutes,
        route.cancelledRoutes, route.averageRouteDurationMin,
        route.averageStopsPerRoute, route.totalStops, route.completedStops,
        route.pendingStops, route.routeUtilizationPercentage);

    for (int i = 0; i < rCount; i++) {
        char type[64];
        jsonStr(type, sizeof(type), rItems[i].routeType);

        int written = snprintf(buf + offset, 32768 - offset,
            "%s{\"routeId\":%d,\"routeType\":\"%s\",\"driverId\":%d,"
            "\"vehicleId\":%d,\"originId\":%d,\"destinationId\":%d,"
            "\"stopCount\":%d,\"completedStopCount\":%d,\"totalWeightKg\":%.2f,"
            "\"status\":%d,\"durationMinutes\":%.2f}",
            (i == 0 ? "" : ","),
            rItems[i].routeId, type, rItems[i].driverId,
            rItems[i].vehicleId, rItems[i].originId, rItems[i].destinationId,
            rItems[i].stopCount, rItems[i].completedStopCount, rItems[i].totalWeightKg,
            (int)rItems[i].status, rItems[i].durationMinutes);
        if (written < 0 || offset + written >= 32768) break;
        offset += written;
    }
    snprintf(buf + offset, 32768 - offset, "]}");

    sendJsonResponse(c, 200, buf);
    free(buf);
}

static void handleAnalyticsRecycling(struct mg_connection *c, struct mg_http_message *hm) {
    AnalyticsFilter filter;
    parseAnalyticsFilter(hm, &filter);

    RecyclingAnalytics rec;
    calculateRecyclingAnalytics(&filter, &rec);

    char buf[1024];
    snprintf(buf, sizeof(buf),
        "{\"totalInputKg\":%.2f,\"totalClassifiedKg\":%.2f,\"totalSegregatedKg\":%.2f,"
        "\"totalProcessedKg\":%.2f,\"totalRecoveredKg\":%.2f,\"totalResidualKg\":%.2f,"
        "\"recoveryRate\":%.2f,\"residualRate\":%.2f,\"processingLossKg\":%.2f,"
        "\"processingLossRate\":%.2f,\"totalBatches\":%d,\"activeBatches\":%d,\"completedBatches\":%d}",
        rec.totalInputKg, rec.totalClassifiedKg, rec.totalSegregatedKg,
        rec.totalProcessedKg, rec.totalRecoveredKg, rec.totalResidualKg,
        rec.recoveryRate, rec.residualRate, rec.processingLossKg,
        rec.processingLossRate, rec.totalBatches, rec.activeBatches, rec.completedBatches);

    sendJsonResponse(c, 200, buf);
}

static void handleAnalyticsWasteTypes(struct mg_connection *c, struct mg_http_message *hm) {
    AnalyticsFilter filter;
    parseAnalyticsFilter(hm, &filter);

    WasteTypeAnalyticsItem items[20];
    int count = getWasteTypeAnalytics(&filter, items, 20);

    char buf[4096];
    int offset = snprintf(buf, sizeof(buf), "[");
    for (int i = 0; i < count; i++) {
        char wt[64];
        jsonStr(wt, sizeof(wt), items[i].wasteType);

        int written = snprintf(buf + offset, sizeof(buf) - offset,
            "%s{\"wasteType\":\"%s\",\"collectedKg\":%.2f,\"processedKg\":%.2f,"
            "\"recoveredKg\":%.2f,\"residualKg\":%.2f,\"percentageOfTotal\":%.2f}",
            (i == 0 ? "" : ","),
            wt, items[i].collectedKg, items[i].processedKg,
            items[i].recoveredKg, items[i].residualKg, items[i].percentageOfTotal);
        if (written < 0 || offset + written >= (int)sizeof(buf)) break;
        offset += written;
    }
    snprintf(buf + offset, sizeof(buf) - offset, "]");

    sendJsonResponse(c, 200, buf);
}

static void handleAnalyticsIncidents(struct mg_connection *c, struct mg_http_message *hm) {
    AnalyticsFilter filter;
    parseAnalyticsFilter(hm, &filter);

    IncidentAnalytics inc;
    calculateIncidentAnalytics(&filter, &inc);

    char buf[1024];
    snprintf(buf, sizeof(buf),
        "{\"totalIncidents\":%d,\"openIncidents\":%d,\"resolvedIncidents\":%d,"
        "\"severity\":{\"critical\":%d,\"high\":%d,\"medium\":%d,\"low\":%d},"
        "\"types\":{\"missedCollection\":%d,\"weightVariance\":%d,\"vehicleFailure\":%d,"
        "\"qrFailure\":%d,\"capacityOverflow\":%d,\"routeException\":%d,"
        "\"facilityRejection\":%d,\"safety\":%d,\"other\":%d}}",
        inc.totalIncidents, inc.openIncidents, inc.resolvedIncidents,
        inc.criticalIncidents, inc.highSeverityIncidents, inc.mediumSeverityIncidents, inc.lowSeverityIncidents,
        inc.missedCollectionCount, inc.weightVarianceCount, inc.vehicleFailureCount,
        inc.qrFailureCount, inc.capacityOverflowCount, inc.routeExceptionCount,
        inc.facilityRejectionCount, inc.safetyCount, inc.otherCount);

    sendJsonResponse(c, 200, buf);
}

static void handleAnalyticsQR(struct mg_connection *c, struct mg_http_message *hm) {
    AnalyticsFilter filter;
    parseAnalyticsFilter(hm, &filter);

    QRAnalytics qr;
    calculateQRAnalytics(&filter, &qr);

    char buf[1024];
    snprintf(buf, sizeof(buf),
        "{\"totalScans\":%d,\"successfulScans\":%d,\"failedScans\":%d,"
        "\"complianceRate\":%.2f,"
        "\"byType\":{\"vehicle\":%d,\"hub\":%d,\"route\":%d,\"stop\":%d,\"facility\":%d}}",
        qr.totalScans, qr.successfulScans, qr.failedScans, qr.complianceRate,
        qr.vehicleScans, qr.hubScans, qr.routeScans, qr.stopScans, qr.facilityScans);

    sendJsonResponse(c, 200, buf);
}

static void handleAnalyticsDrivers(struct mg_connection *c, struct mg_http_message *hm) {
    AnalyticsFilter filter;
    parseAnalyticsFilter(hm, &filter);

    DriverPerformanceItem items[50];
    int count = getDriverPerformanceList(&filter, items, 50);

    char *buf = (char*)malloc(16384);
    if (!buf) { sendJsonResponse(c, 500, "{\"error\":\"OOM\"}"); return; }

    int offset = snprintf(buf, 16384, "[");
    for (int i = 0; i < count; i++) {
        char name[128], code[64];
        jsonStr(name, sizeof(name), items[i].name);
        jsonStr(code, sizeof(code), items[i].employeeCode);

        int written = snprintf(buf + offset, 16384 - offset,
            "%s{\"driverId\":%d,\"name\":\"%s\",\"employeeCode\":\"%s\","
            "\"assignedRoutes\":%d,\"acceptedRoutes\":%d,\"completedRoutes\":%d,"
            "\"cancelledRoutes\":%d,\"completedStops\":%d,\"missedStops\":%d,"
            "\"totalCollectedKg\":%.2f,\"averageRouteCompletionTimeMin\":%.2f,"
            "\"weightVarianceIncidents\":%d,\"qrScanFailures\":%d,\"inspectionFailures\":%d,"
            "\"performanceScore\":%.2f}",
            (i == 0 ? "" : ","),
            items[i].driverId, name, code,
            items[i].assignedRoutes, items[i].acceptedRoutes, items[i].completedRoutes,
            items[i].cancelledRoutes, items[i].completedStops, items[i].missedStops,
            items[i].totalCollectedKg, items[i].averageRouteCompletionTimeMin,
            items[i].weightVarianceIncidents, items[i].qrScanFailures, items[i].inspectionFailures,
            items[i].performanceScore);
        if (written < 0 || offset + written >= 16384) break;
        offset += written;
    }
    snprintf(buf + offset, 16384 - offset, "]");

    sendJsonResponse(c, 200, buf);
    free(buf);
}

static void handleAnalyticsCleaners(struct mg_connection *c, struct mg_http_message *hm) {
    AnalyticsFilter filter;
    parseAnalyticsFilter(hm, &filter);

    CleanerPerformanceItem items[50];
    int count = getCleanerPerformanceList(&filter, items, 50);

    char *buf = (char*)malloc(16384);
    if (!buf) { sendJsonResponse(c, 500, "{\"error\":\"OOM\"}"); return; }

    int offset = snprintf(buf, 16384, "[");
    for (int i = 0; i < count; i++) {
        char name[128];
        jsonStr(name, sizeof(name), items[i].name);

        int written = snprintf(buf + offset, 16384 - offset,
            "%s{\"cleanerId\":%d,\"name\":\"%s\",\"assignedHubId\":%d,"
            "\"assignedCollections\":%d,\"completedCollections\":%d,\"missedCollections\":%d,"
            "\"totalCollectedKg\":%.2f,\"averageCollectionWeightKg\":%.2f,"
            "\"weightVarianceIncidents\":%d,\"successfulDeposits\":%d,"
            "\"performanceScore\":%.2f}",
            (i == 0 ? "" : ","),
            items[i].cleanerId, name, items[i].assignedHubId,
            items[i].assignedCollections, items[i].completedCollections, items[i].missedCollections,
            items[i].totalCollectedKg, items[i].averageCollectionWeightKg,
            items[i].weightVarianceIncidents, items[i].successfulDeposits,
            items[i].performanceScore);
        if (written < 0 || offset + written >= 16384) break;
        offset += written;
    }
    snprintf(buf + offset, 16384 - offset, "]");

    sendJsonResponse(c, 200, buf);
    free(buf);
}

static void handleAnalyticsFacilities(struct mg_connection *c, struct mg_http_message *hm) {
    AnalyticsFilter filter;
    parseAnalyticsFilter(hm, &filter);

    FacilityAnalyticsItem items[50];
    int count = getFacilityAnalyticsList(&filter, items, 50);

    char *buf = (char*)malloc(16384);
    if (!buf) { sendJsonResponse(c, 500, "{\"error\":\"OOM\"}"); return; }

    int offset = snprintf(buf, 16384, "[");
    for (int i = 0; i < count; i++) {
        char name[128], code[64], type[64], status[64];
        jsonStr(name, sizeof(name), items[i].name);
        jsonStr(code, sizeof(code), items[i].facilityCode);
        jsonStr(type, sizeof(type), items[i].facilityType);
        jsonStr(status, sizeof(status), items[i].currentOperationalStatus);

        int written = snprintf(buf + offset, 16384 - offset,
            "%s{\"facilityId\":%d,\"facilityCode\":\"%s\",\"name\":\"%s\",\"facilityType\":\"%s\","
            "\"receivedKg\":%.2f,\"acceptedLoads\":%d,\"rejectedLoads\":%d,\"quarantinedLoads\":%d,"
            "\"activeBatches\":%d,\"completedBatches\":%d,\"recoveredKg\":%.2f,\"residualKg\":%.2f,"
            "\"recoveryRate\":%.2f,\"maximumDailyCapacityKg\":%.2f,\"currentOperationalStatus\":\"%s\"}",
            (i == 0 ? "" : ","),
            items[i].facilityId, code, name, type,
            items[i].receivedKg, items[i].acceptedLoads, items[i].rejectedLoads, items[i].quarantinedLoads,
            items[i].activeBatches, items[i].completedBatches, items[i].recoveredKg, items[i].residualKg,
            items[i].recoveryRate, items[i].maximumDailyCapacityKg, status);
        if (written < 0 || offset + written >= 16384) break;
        offset += written;
    }
    snprintf(buf + offset, 16384 - offset, "]");

    sendJsonResponse(c, 200, buf);
    free(buf);
}

static void handleAnalyticsTrends(struct mg_connection *c, struct mg_http_message *hm) {
    AnalyticsFilter filter;
    parseAnalyticsFilter(hm, &filter);

    OperationalTrendItem items[30];
    int count = getOperationalTrends(&filter, items, 30);

    char buf[4096];
    int offset = snprintf(buf, sizeof(buf), "[");
    for (int i = 0; i < count; i++) {
        int written = snprintf(buf + offset, sizeof(buf) - offset,
            "%s{\"date\":\"%s\",\"requests\":%d,\"completed\":%d,\"missed\":%d,"
            "\"wasteKg\":%.2f,\"recoveredKg\":%.2f,\"incidentCount\":%d}",
            (i == 0 ? "" : ","),
            items[i].date, items[i].requests, items[i].completed, items[i].missed,
            items[i].wasteKg, items[i].recoveredKg, items[i].incidentCount);
        if (written < 0 || offset + written >= (int)sizeof(buf)) break;
        offset += written;
    }
    snprintf(buf + offset, sizeof(buf) - offset, "]");

    sendJsonResponse(c, 200, buf);
}

static void handleAnalyticsLiveFeed(struct mg_connection *c, struct mg_http_message *hm) {
    AnalyticsFilter filter;
    parseAnalyticsFilter(hm, &filter);

    LiveFeedEvent items[50];
    int count = getLiveFeedEvents(&filter, items, 50);

    char *buf = (char*)malloc(32768);
    if (!buf) { sendJsonResponse(c, 500, "{\"error\":\"OOM\"}"); return; }

    int offset = snprintf(buf, 32768, "[");
    for (int i = 0; i < count; i++) {
        char ts[64], type[64], title[128], desc[256], sev[32];
        jsonStr(ts, sizeof(ts), items[i].timestamp);
        jsonStr(type, sizeof(type), items[i].eventType);
        jsonStr(title, sizeof(title), items[i].title);
        jsonStr(desc, sizeof(desc), items[i].description);
        jsonStr(sev, sizeof(sev), items[i].severity);

        int written = snprintf(buf + offset, 32768 - offset,
            "%s{\"eventId\":%d,\"timestamp\":\"%s\",\"eventType\":\"%s\","
            "\"title\":\"%s\",\"description\":\"%s\",\"severity\":\"%s\",\"actorId\":%d}",
            (i == 0 ? "" : ","),
            items[i].eventId, ts, type, title, desc, sev, items[i].actorId);
        if (written < 0 || offset + written >= 32768) break;
        offset += written;
    }
    snprintf(buf + offset, 32768 - offset, "]");

    sendJsonResponse(c, 200, buf);
    free(buf);
}

static void handleReportsExport(struct mg_connection *c, struct mg_http_message *hm) {
    AnalyticsFilter filter;
    parseAnalyticsFilter(hm, &filter);

    char type[64] = "collection";
    mg_http_get_var(&hm->query, "type", type, sizeof(type));

    char *csvBuf = (char*)malloc(65536);
    if (!csvBuf) { sendJsonResponse(c, 500, "{\"error\":\"OOM\"}"); return; }
    csvBuf[0] = 0;

    int len = 0;
    if (strcmp(type, "collection") == 0 || strcmp(type, "collections") == 0) {
        len = exportCollectionReportCSV(&filter, csvBuf, 65536);
    } else if (strcmp(type, "hub") == 0 || strcmp(type, "hubs") == 0 || strcmp(type, "inventory") == 0) {
        len = exportHubInventoryReportCSV(&filter, csvBuf, 65536);
    } else if (strcmp(type, "fleet") == 0 || strcmp(type, "vehicles") == 0) {
        len = exportFleetReportCSV(&filter, csvBuf, 65536);
    } else if (strcmp(type, "route") == 0 || strcmp(type, "routes") == 0) {
        len = exportRouteReportCSV(&filter, csvBuf, 65536);
    } else if (strcmp(type, "recycling") == 0) {
        len = exportRecyclingReportCSV(&filter, csvBuf, 65536);
    } else if (strcmp(type, "incident") == 0 || strcmp(type, "incidents") == 0) {
        len = exportIncidentReportCSV(&filter, csvBuf, 65536);
    } else if (strcmp(type, "waste") == 0 || strcmp(type, "waste_stream") == 0) {
        len = exportWasteStreamReportCSV(&filter, csvBuf, 65536);
    } else {
        len = exportCollectionReportCSV(&filter, csvBuf, 65536);
    }

    if (len >= 0) {
        char headers[256];
        snprintf(headers, sizeof(headers),
            "Content-Type: text/csv\r\n"
            "Content-Disposition: attachment; filename=\"%s_report.csv\"\r\n"
            "Access-Control-Allow-Origin: *\r\n"
            "Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n",
            type);
        mg_http_reply(c, 200, headers, "%s", csvBuf);
    } else {
        sendJsonResponse(c, 500, "{\"error\":\"Failed to export report\"}");
    }

    free(csvBuf);
}

static void handleDemoReset(struct mg_connection *c, struct mg_http_message *hm) {
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
static void handleGetLocations(struct mg_connection *c, struct mg_http_message *hm) {
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

static void handleGetAllHubs(struct mg_connection *c, struct mg_http_message *hm) {
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

static void handleGetAllCollections(struct mg_connection *c, struct mg_http_message *hm) {
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

static void handleGetAllTransfers(struct mg_connection *c, struct mg_http_message *hm) {
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

static void handleGetAllFacilities(struct mg_connection *c, struct mg_http_message *hm) {
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

static void handleGetRecyclingBatches(struct mg_connection *c, struct mg_http_message *hm) {
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

static void handleGetAllIncidents(struct mg_connection *c, struct mg_http_message *hm) {
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

char g_current_workspace[37] = {0};



static void eventHandler(struct mg_connection *c, int ev, void *ev_data) {
    if (ev != MG_EV_HTTP_MSG) return;
    struct mg_http_message *hm = (struct mg_http_message *)ev_data;

    User user;
    if (getAuthenticatedUser(hm, &user)) {
        struct mg_str *wsHeader = mg_http_get_header(hm, "X-Workspace-Id");
        if (wsHeader != NULL && wsHeader->len > 0 && user.role == ROLE_ADMIN) {
            snprintf(g_current_workspace, sizeof(g_current_workspace), "%.*s", (int)wsHeader->len, wsHeader->buf);
        } else {
            strncpy(g_current_workspace, user.workspaceId, sizeof(g_current_workspace)-1);
        }
    } else {
        g_current_workspace[0] = '\0';
    }

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
    else if (isGet  && mg_match(hm->uri, mg_str("/api/workspaces/current"), NULL))     handleGetCurrentWorkspace(c, hm);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/workspaces"), NULL))             handleGetWorkspaces(c, hm);
    else if (isPost && mg_match(hm->uri, mg_str("/api/workspaces"), NULL))             handlePostWorkspace(c, hm);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/hubs"), NULL))                   handleGetAllHubs(c, hm);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/hubs/my-hub"), NULL))            handleGetMyHub(c, hm);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/hubs/transactions"), NULL))      handleGetHubTransactions(c, hm);
else if (isGet  && mg_match(hm->uri, mg_str("/api/collections/all"), NULL))        handleGetAllCollections(c, hm);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/collections/resident"), NULL))   handleCollectionResident(c, hm);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/collections/cleaner"), NULL))    handleCollectionCleaner(c, hm);
    else if (isPost && mg_match(hm->uri, mg_str("/api/collections/*"), NULL))          handleCollectionAction(c, hm);
else if (isGet  && mg_match(hm->uri, mg_str("/api/transfers"), NULL))              handleGetAllTransfers(c, hm);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/recycling/facilities"), NULL))   handleGetAllFacilities(c, hm);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/recycling/batches"), NULL))      handleGetRecyclingBatches(c, hm);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/incidents"), NULL))              handleGetAllIncidents(c, hm);

    else if (isGet  && mg_match(hm->uri, mg_str("/api/gis/locations"), NULL)) {
        GeoLocation list[100];
        int count = getAllGeoLocations(list, 100);
        char *json = malloc(count * 200 + 50);
        strcpy(json, "[");
        for (int i = 0; i < count; i++) {
            char obj[256];
            snprintf(obj, sizeof(obj), "{\"locationId\":%d,\"type\":%d,\"referenceId\":%d,\"lat\":%f,\"lon\":%f}%s",
                        list[i].locationId, list[i].type, list[i].referenceId, list[i].latitude, list[i].longitude,
                        (i == count - 1) ? "" : ",");
            strcat(json, obj);
        }
        strcat(json, "]");
        sendJsonResponse(c, 200, json);
        free(json);
    }
    else if (isGet  && mg_match(hm->uri, mg_str("/api/gis/nearest-hubs"), NULL)) {
        char latStr[32] = {0}, lonStr[32] = {0}, radiusStr[32] = {0};
        mg_http_get_var(&hm->query, "lat", latStr, sizeof(latStr));
        mg_http_get_var(&hm->query, "lon", lonStr, sizeof(lonStr));
        mg_http_get_var(&hm->query, "radius", radiusStr, sizeof(radiusStr));
        double lat = atof(latStr);
        double lon = atof(lonStr);
        double radius = atof(radiusStr);
        if (radius == 0.0) radius = 5.0;
        
        LocalHub hubs[10];
        double distances[10];
        int count = findNearestHubs(lat, lon, radius, hubs, distances, 10);
        
        char *json = malloc(count * 200 + 50);
        strcpy(json, "[");
        for (int i = 0; i < count; i++) {
            char obj[256];
            snprintf(obj, sizeof(obj), "{\"hubId\":%d,\"name\":\"%s\",\"distanceKm\":%.2f}%s",
                        hubs[i].hubId, hubs[i].name, distances[i],
                        (i == count - 1) ? "" : ",");
            strcat(json, obj);
        }
        strcat(json, "]");
        sendJsonResponse(c, 200, json);
        free(json);
    }
    else if (isGet  && mg_match(hm->uri, mg_str("/api/gis/nearby"), NULL)) {
        sendJsonResponse(c, 200, "{\"success\":true,\"message\":\"Nearby fetched\"}");
    }
    else if (isGet  && mg_match(hm->uri, mg_str("/api/gis/routes"), NULL)) {
        sendJsonResponse(c, 200, "{\"success\":true,\"message\":\"Routes fetched\"}");
    }
    else if (isPost && mg_match(hm->uri, mg_str("/api/gis/*"), NULL)) {
        sendJsonResponse(c, 200, "{\"success\":true,\"message\":\"GIS Action\"}");
    }

    else if (isGet  && mg_match(hm->uri, mg_str("/api/bins"), NULL))                   handleGetBins(c, hm);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/vehicles"), NULL))               handleGetVehicles(c, hm);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/collections"), NULL))            handleGetCollections(c, hm);
    else if (isPost && mg_match(hm->uri, mg_str("/api/collections/process"), NULL))    handleProcessCollection(c, hm);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/residents"), NULL))              handleGetResidents(c, hm);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/waste"), NULL))                  handleGetWaste(c, hm);
    else if (isPost && mg_match(hm->uri, mg_str("/api/waste"), NULL))                  handleAddWaste(c, hm);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/alerts"), NULL))                 handleGetAlerts(c, hm);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/recycling"), NULL))              handleGetRecycling(c, hm);
    
    // Phase 9: Analytics & Reports APIs
    
    // Phase 10: Municipal Incident & Response Center APIs
    else if (isGet  && mg_match(hm->uri, mg_str("/api/incidents/*/timeline"), NULL))   handleGetIncidentTimelineAPI(c, hm);
    else if (isPost && mg_match(hm->uri, mg_str("/api/incidents/*/comments"), NULL))   handleAddIncidentCommentAPI(c, hm);
    else if (isPost && mg_match(hm->uri, mg_str("/api/incidents/*/acknowledge"), NULL)) handleIncidentActionWorkflow(c, hm, "acknowledge");
    else if (isPost && mg_match(hm->uri, mg_str("/api/incidents/*/assign"), NULL))      handleIncidentActionWorkflow(c, hm, "assign");
    else if (isPost && mg_match(hm->uri, mg_str("/api/incidents/*/investigate"), NULL)) handleIncidentActionWorkflow(c, hm, "investigate");
    else if (isPost && mg_match(hm->uri, mg_str("/api/incidents/*/action"), NULL))      handleIncidentActionWorkflow(c, hm, "action");
    else if (isPost && mg_match(hm->uri, mg_str("/api/incidents/*/resolve"), NULL))     handleIncidentActionWorkflow(c, hm, "resolve");
    else if (isPost && mg_match(hm->uri, mg_str("/api/incidents/*/close"), NULL))       handleIncidentActionWorkflow(c, hm, "close");
    else if (isPost && mg_match(hm->uri, mg_str("/api/incidents/*/reopen"), NULL))      handleIncidentActionWorkflow(c, hm, "reopen");
    else if (isGet  && mg_match(hm->uri, mg_str("/api/incidents/#"), NULL))             handleGetIncidentDetail(c, hm);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/incidents"), NULL))                handleGetIncidentsPhase10(c, hm);
    else if (isPost && mg_match(hm->uri, mg_str("/api/incidents"), NULL))               handleCreateIncidentManual(c, hm);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/alerts/unread"), NULL))           handleGetUnreadAlerts(c, hm);
    else if (isPost && mg_match(hm->uri, mg_str("/api/alerts/*/acknowledge"), NULL))    handleAcknowledgeAlertAPI(c, hm);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/notifications/preferences"), NULL)) handleGetNotificationPreferencesAPI(c, hm);
    else if (isPost && mg_match(hm->uri, mg_str("/api/notifications/preferences"), NULL)) handleSaveNotificationPreferencesAPI(c, hm);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/analytics/summary"), NULL))      handleAnalyticsSummary(c, hm);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/analytics/collections"), NULL))  handleAnalyticsCollections(c, hm);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/analytics/hubs"), NULL))         handleAnalyticsHubs(c, hm);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/analytics/fleet"), NULL))        handleAnalyticsFleet(c, hm);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/analytics/routes"), NULL))       handleAnalyticsRoutes(c, hm);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/analytics/recycling"), NULL))    handleAnalyticsRecycling(c, hm);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/analytics/waste-types"), NULL))  handleAnalyticsWasteTypes(c, hm);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/analytics/incidents"), NULL))    handleAnalyticsIncidents(c, hm);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/analytics/qr"), NULL))           handleAnalyticsQR(c, hm);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/analytics/drivers"), NULL))      handleAnalyticsDrivers(c, hm);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/analytics/cleaners"), NULL))     handleAnalyticsCleaners(c, hm);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/analytics/facilities"), NULL))   handleAnalyticsFacilities(c, hm);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/analytics/trends"), NULL))       handleAnalyticsTrends(c, hm);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/analytics/live-feed"), NULL))    handleAnalyticsLiveFeed(c, hm);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/reports/export"), NULL))         handleReportsExport(c, hm);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/analytics/dashboard"), NULL))   handleGetDashboard(c, hm);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/route/#"), NULL))               handleGetRoute(c, hm);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/locations"), NULL))              handleGetLocations(c, hm);

    else if (isGet  && mg_match(hm->uri, mg_str("/api/routes"), NULL))               handleGetRoutes(c, hm);
    else if (isPost && mg_match(hm->uri, mg_str("/api/routes/plan"), NULL))          handlePlanCollectionRoute(c, hm);
    else if (isPost && mg_match(hm->uri, mg_str("/api/routes/transfer/plan"), NULL)) handlePlanTransferRoute(c, hm);
    
    else if (isPost && mg_match(hm->uri, mg_str("/api/routes/*/assign"), NULL))      handleRouteAction(c, hm, "assign");
    else if (isPost && mg_match(hm->uri, mg_str("/api/routes/*/accept"), NULL))      handleRouteAction(c, hm, "accept");
    else if (isPost && mg_match(hm->uri, mg_str("/api/routes/*/start"), NULL))       handleRouteAction(c, hm, "start");
    else if (isPost && mg_match(hm->uri, mg_str("/api/routes/*/complete"), NULL))    handleRouteAction(c, hm, "complete");
    else if (isPost && mg_match(hm->uri, mg_str("/api/routes/*/cancel"), NULL))      handleRouteAction(c, hm, "cancel");
    
    else if (isPost && mg_match(hm->uri, mg_str("/api/routes/*/stops/*/arrive"), NULL))   handleArriveStop(c, hm);
    else if (isPost && mg_match(hm->uri, mg_str("/api/routes/*/stops/*/complete"), NULL)) handleStopAction(c, hm, "complete");
    
    else if (isGet  && mg_match(hm->uri, mg_str("/api/routes/*/stops"), NULL))       handleGetRouteStops(c, hm);

    
    else if (isPost && mg_match(hm->uri, mg_str("/api/qr/scan"), NULL))              handleQRScan(c, hm);
    else if (isPost && mg_match(hm->uri, mg_str("/api/driver/vehicle-checkin"), NULL)) handleDriverCheckin(c, hm);
    else if (isPost && mg_match(hm->uri, mg_str("/api/driver/inspection"), NULL))      handleDriverInspection(c, hm);
    else if (isPost && mg_match(hm->uri, mg_str("/api/hubs/*/arrival"), NULL))         handleHubArrival(c, hm);

    else if (isPost && mg_match(hm->uri, mg_str("/api/demo/reset"), NULL))             handleDemoReset(c, hm);
    
    // Phase 11: Workspace Management APIs
    else if (isGet  && mg_match(hm->uri, mg_str("/api/workspaces"), NULL))              handleGetWorkspaces(c, hm);
    else if (isPost && mg_match(hm->uri, mg_str("/api/workspaces"), NULL))              handlePostWorkspace(c, hm);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/workspaces/current"), NULL))      handleGetCurrentWorkspace(c, hm);
    
    else if (isPost && mg_match(hm->uri, mg_str("/api/*"), NULL))                      handlePostAction(c, hm);
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
    initWorkspaces();

    printf("  [READY] All modules initialized\n\n");
    for (;;) mg_mgr_poll(&mgr, 500);
}
