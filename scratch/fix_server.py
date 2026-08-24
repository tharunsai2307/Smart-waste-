import re

filepath = r"C:\Users\Hp\.gemini\antigravity-ide\scratch\smart-waste-management\src\server.c"

with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

handlers = """// Phase 7 Routing Handlers
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
    double h, cl, v;
    mg_json_get_num(hm->body, "$.hubId", &h);
    mg_json_get_num(hm->body, "$.cleanerId", &cl);
    mg_json_get_num(hm->body, "$.vehicleId", &v);
    
    int routeId = planCollectionRoute((int)h, (int)cl, (int)v);
    if(routeId > 0) {
        char buf[256];
        snprintf(buf, sizeof(buf), "{\\"message\\":\\"Route planned\\", \\"routeId\\":%d}", routeId);
        sendJsonResponse(c, 200, buf);
    } else {
        sendJsonResponse(c, 400, "{\\"error\\":\\"Failed to plan route.\\"}");
    }
}

static void handlePlanTransferRoute(struct mg_connection *c, struct mg_http_message *hm) {
    if (!requireRole(c, "ADMIN") && !requireRole(c, "LOCAL_HUB_MANAGER")) { sendJsonResponse(c, 403, "{\\"error\\":\\"Forbidden\\"}"); return; }
    double h, f, d, v;
    mg_json_get_num(hm->body, "$.hubId", &h);
    mg_json_get_num(hm->body, "$.facilityId", &f);
    mg_json_get_num(hm->body, "$.driverId", &d);
    mg_json_get_num(hm->body, "$.vehicleId", &v);
    
    int routeId = planTransferRoute((int)h, (int)f, (int)d, (int)v);
    if(routeId > 0) {
        char buf[256];
        snprintf(buf, sizeof(buf), "{\\"message\\":\\"Transfer route planned\\", \\"routeId\\":%d}", routeId);
        sendJsonResponse(c, 200, buf);
    } else {
        sendJsonResponse(c, 400, "{\\"error\\":\\"Failed to plan route.\\"}");
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
    
    if(res) sendJsonResponse(c, 200, "{\\"message\\":\\"Success\\"}");
    else sendJsonResponse(c, 400, "{\\"error\\":\\"Invalid state transition\\"}");
}

static void handleStopAction(struct mg_connection *c, struct mg_http_message *hm, const char* action) {
    int actorId = 1; // From JWT
    char uriStr[128];
    snprintf(uriStr, sizeof(uriStr), "%.*s", (int)hm->uri.len, hm->uri.buf);
    int routeId = 0, stopId = 0;
    sscanf(uriStr, "/api/routes/%d/stops/%d", &routeId, &stopId);
    
    int res = 0;
    if(strcmp(action, "arrive") == 0) res = arriveAtStop(routeId, stopId, actorId);
    else if(strcmp(action, "complete") == 0) {
        double w;
        mg_json_get_num(hm->body, "$.actualWeightKg", &w);
        res = completeStop(routeId, stopId, actorId, (float)w);
    }
    
    if(res) sendJsonResponse(c, 200, "{\\"message\\":\\"Success\\"}");
    else sendJsonResponse(c, 400, "{\\"error\\":\\"Invalid state transition\\"}");
}

static void handleGetRouteStops(struct mg_connection *c, struct mg_http_message *hm) {
    char uriStr[128];
    snprintf(uriStr, sizeof(uriStr), "%.*s", (int)hm->uri.len, hm->uri.buf);
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

start_idx = content.find("// Phase 7 Routing Handlers")
end_idx = content.find("static void handleDemoReset", start_idx)

new_content = content[:start_idx] + handlers + "\n" + content[end_idx:]

with open(filepath, "w", encoding="utf-8") as f:
    f.write(new_content)
print("Updated server.c handlers")
