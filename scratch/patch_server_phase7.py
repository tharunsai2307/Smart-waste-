import re

filepath = r"C:\Users\Hp\.gemini\antigravity-ide\scratch\smart-waste-management\src\server.c"

with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# Add route_engine header
if '#include "route_engine.h"' not in content:
    content = content.replace('#include "geospatial.h"', '#include "geospatial.h"\n#include "route_engine.h"')

# Handlers code
handlers = """
// Phase 7 Routing Handlers
static void handleGetRoutes(struct mg_connection *c) {
    if (!requireRole(c, "ADMIN") && !requireRole(c, "LOCAL_HUB_MANAGER")) { sendJsonResponse(c, 403, "{\\"error\\":\\"Forbidden\\"}"); return; }
    Route arr[100];
    int count = getRoutes(arr, 100);
    char buf[8192];
    int pos = snprintf(buf, sizeof(buf), "[");
    for (int i=0; i<count; i++) {
        pos += snprintf(buf+pos, sizeof(buf)-pos, "%s{\\"routeId\\":%d,\\"type\\":\\"%s\\",\\"driverId\\":%d,\\"vehicleId\\":%d,\\"status\\":%d,\\"plannedLoad\\":%.2f,\\"distance\\":%.2f}",
                        (i>0?",":""), arr[i].routeId, arr[i].routeType, arr[i].driverId, arr[i].vehicleId, arr[i].status, arr[i].totalPlannedLoadKg, arr[i].totalDistanceKm);
    }
    snprintf(buf+pos, sizeof(buf)-pos, "]");
    sendJsonResponse(c, 200, buf);
}

static void handlePlanCollectionRoute(struct mg_connection *c, struct mg_http_message *hm) {
    if (!requireRole(c, "ADMIN") && !requireRole(c, "LOCAL_HUB_MANAGER")) { sendJsonResponse(c, 403, "{\\"error\\":\\"Forbidden\\"}"); return; }
    int hubId = extractInt(hm->body.ptr, "hubId");
    int cleanerId = extractInt(hm->body.ptr, "cleanerId");
    int vehicleId = extractInt(hm->body.ptr, "vehicleId");
    
    int routeId = planCollectionRoute(hubId, cleanerId, vehicleId);
    if(routeId > 0) {
        char buf[256];
        snprintf(buf, sizeof(buf), "{\\"message\\":\\"Route planned\\", \\"routeId\\":%d}", routeId);
        sendJsonResponse(c, 200, buf);
    } else {
        sendJsonResponse(c, 400, "{\\"error\\":\\"Failed to plan route. Ensure capacity/availability.\\"}");
    }
}

static void handlePlanTransferRoute(struct mg_connection *c, struct mg_http_message *hm) {
    if (!requireRole(c, "ADMIN") && !requireRole(c, "LOCAL_HUB_MANAGER")) { sendJsonResponse(c, 403, "{\\"error\\":\\"Forbidden\\"}"); return; }
    int hubId = extractInt(hm->body.ptr, "hubId");
    int facilityId = extractInt(hm->body.ptr, "facilityId");
    int driverId = extractInt(hm->body.ptr, "driverId");
    int vehicleId = extractInt(hm->body.ptr, "vehicleId");
    
    int routeId = planTransferRoute(hubId, facilityId, driverId, vehicleId);
    if(routeId > 0) {
        char buf[256];
        snprintf(buf, sizeof(buf), "{\\"message\\":\\"Transfer route planned\\", \\"routeId\\":%d}", routeId);
        sendJsonResponse(c, 200, buf);
    } else {
        sendJsonResponse(c, 400, "{\\"error\\":\\"Failed to plan route.\\"}");
    }
}

static void handleRouteAction(struct mg_connection *c, struct mg_http_message *hm, const char* action) {
    // Basic actor validation
    int actorId = 1; // Real implementation should extract from JWT
    
    // Extract routeId from URI e.g. /api/routes/123/start
    char uriStr[128];
    snprintf(uriStr, sizeof(uriStr), "%.*s", (int)hm->uri.len, hm->uri.ptr);
    int routeId = 0;
    sscanf(uriStr, "/api/routes/%d", &routeId);
    
    int res = 0;
    if(strcmp(action, "assign") == 0) res = dispatchRoute(routeId, actorId);
    else if(strcmp(action, "accept") == 0) res = driverAcceptRoute(routeId, actorId);
    else if(strcmp(action, "start") == 0) res = startRoute(routeId, actorId);
    else if(strcmp(action, "complete") == 0) res = completeRoute(routeId, actorId);
    else if(strcmp(action, "cancel") == 0) res = cancelRoute(routeId, actorId, "Cancelled via API");
    
    if(res) sendJsonResponse(c, 200, "{\\"message\\":\\"Success\\"}");
    else sendJsonResponse(c, 400, "{\\"error\\":\\"Invalid state transition or unauthorized\\"}");
}

static void handleStopAction(struct mg_connection *c, struct mg_http_message *hm, const char* action) {
    int actorId = 1; // From JWT
    char uriStr[128];
    snprintf(uriStr, sizeof(uriStr), "%.*s", (int)hm->uri.len, hm->uri.ptr);
    int routeId = 0, stopId = 0;
    sscanf(uriStr, "/api/routes/%d/stops/%d", &routeId, &stopId);
    
    int res = 0;
    if(strcmp(action, "arrive") == 0) res = arriveAtStop(routeId, stopId, actorId);
    else if(strcmp(action, "complete") == 0) {
        float weight = extractFloat(hm->body.ptr, "actualWeightKg");
        res = completeStop(routeId, stopId, actorId, weight);
    }
    
    if(res) sendJsonResponse(c, 200, "{\\"message\\":\\"Success\\"}");
    else sendJsonResponse(c, 400, "{\\"error\\":\\"Invalid state transition\\"}");
}

static void handleGetRouteStops(struct mg_connection *c, struct mg_http_message *hm) {
    char uriStr[128];
    snprintf(uriStr, sizeof(uriStr), "%.*s", (int)hm->uri.len, hm->uri.ptr);
    int routeId = 0;
    sscanf(uriStr, "/api/routes/%d/stops", &routeId);
    
    RouteStop arr[100];
    int count = getRouteStops(routeId, arr, 100);
    char buf[4096];
    int pos = snprintf(buf, sizeof(buf), "[");
    for(int i=0; i<count; i++) {
        pos += snprintf(buf+pos, sizeof(buf)-pos, "%s{\\"stopId\\":%d,\\"type\\":\\"%s\\",\\"refId\\":%d,\\"status\\":%d,\\"seq\\":%d,\\"estKg\\":%.2f}",
                        (i>0?",":""), arr[i].routeStopId, arr[i].stopType, arr[i].referenceId, arr[i].status, arr[i].sequenceNumber, arr[i].estimatedWeightKg);
    }
    snprintf(buf+pos, sizeof(buf)-pos, "]");
    sendJsonResponse(c, 200, buf);
}
"""

if "handleGetRoutes(" not in content:
    content = content.replace("static void handleDemoReset", handlers + "\nstatic void handleDemoReset")

# Add the URI matchers to eventHandler
matchers = """
    else if (isGet  && mg_match(hm->uri, mg_str("/api/routes"), NULL))               handleGetRoutes(c);
    else if (isPost && mg_match(hm->uri, mg_str("/api/routes/plan"), NULL))          handlePlanCollectionRoute(c, hm);
    else if (isPost && mg_match(hm->uri, mg_str("/api/routes/transfer/plan"), NULL)) handlePlanTransferRoute(c, hm);
    
    else if (isPost && mg_match(hm->uri, mg_str("/api/routes/*/assign"), NULL))      handleRouteAction(c, hm, "assign");
    else if (isPost && mg_match(hm->uri, mg_str("/api/routes/*/accept"), NULL))      handleRouteAction(c, hm, "accept");
    else if (isPost && mg_match(hm->uri, mg_str("/api/routes/*/start"), NULL))       handleRouteAction(c, hm, "start");
    else if (isPost && mg_match(hm->uri, mg_str("/api/routes/*/complete"), NULL))    handleRouteAction(c, hm, "complete");
    else if (isPost && mg_match(hm->uri, mg_str("/api/routes/*/cancel"), NULL))      handleRouteAction(c, hm, "cancel");
    
    else if (isPost && mg_match(hm->uri, mg_str("/api/routes/*/stops/*/arrive"), NULL))   handleStopAction(c, hm, "arrive");
    else if (isPost && mg_match(hm->uri, mg_str("/api/routes/*/stops/*/complete"), NULL)) handleStopAction(c, hm, "complete");
    
    else if (isGet  && mg_match(hm->uri, mg_str("/api/routes/*/stops"), NULL))       handleGetRouteStops(c, hm);
"""

if "/api/routes/plan" not in content:
    content = content.replace("else if (isGet  && mg_match(hm->uri, mg_str(\"/api/locations\"), NULL))              handleGetLocations(c);",
                              "else if (isGet  && mg_match(hm->uri, mg_str(\"/api/locations\"), NULL))              handleGetLocations(c);\n" + matchers)

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated server.c")
