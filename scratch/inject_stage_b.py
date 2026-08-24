import os

file_path = r"C:\Users\Hp\.gemini\antigravity-ide\scratch\smart-waste-management\src\server.c"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add initHubData() to the startup block
if "initHubData();" not in content:
    content = content.replace("initUsersData();", "initUsersData();\n    initHubData();")

# 2. Define the new C handlers
hub_handlers = """
// ─────────────────────────────────────────────────────────────
// STAGE B: PHASE 2 HUB APIs
// ─────────────────────────────────────────────────────────────

static void handleGetAllHubs(struct mg_connection *c) {
    LocalHub hubs[50];
    int count = getAllHubs(hubs, 50);
    
    char body[8192] = "{\\"success\\":true,\\"hubs\\":[";
    for(int i = 0; i < count; i++) {
        char buf[256];
        snprintf(buf, sizeof(buf),
            "{\\"hubId\\":%d,\\"name\\":\\"%s\\",\\"location\\":\\"%s\\",\\"managerId\\":%d,\\"currentLoadKg\\":%.2f,\\"maxCapacityKg\\":%.2f,\\"status\\":\\"%s\\"}",
            hubs[i].hubId, hubs[i].name, hubs[i].location, hubs[i].managerId, 
            hubs[i].currentLoadKg, hubs[i].maxCapacityKg, hubStatusToStr(hubs[i].status));
        strcat(body, buf);
        if (i < count - 1) strcat(body, ",");
    }
    strcat(body, "]}");
    sendJsonResponse(c, 200, body);
}

static void handleGetMyHub(struct mg_connection *c, struct mg_http_message *hm) {
    // Basic implementation: parse managerId from query or use token
    // For now we assume a query parameter ?managerId=X
    char mgrStr[32];
    if (mg_http_get_var(&hm->query, "managerId", mgrStr, sizeof(mgrStr)) <= 0) {
        sendJsonResponse(c, 400, "{\\"success\\":false,\\"message\\":\\"Missing managerId\\"}");
        return;
    }
    int managerId = atoi(mgrStr);
    LocalHub hub;
    if (getHubByManagerId(managerId, &hub) == 1) {
        char buf[512];
        snprintf(buf, sizeof(buf),
            "{\\"success\\":true,\\"hub\\":{\\"hubId\\":%d,\\"name\\":\\"%s\\",\\"status\\":\\"%s\\",\\"currentLoadKg\\":%.2f,\\"maxCapacityKg\\":%.2f}}",
            hub.hubId, hub.name, hubStatusToStr(hub.status), hub.currentLoadKg, hub.maxCapacityKg);
        sendJsonResponse(c, 200, buf);
    } else {
        sendJsonResponse(c, 404, "{\\"success\\":false,\\"message\\":\\"Hub not found for manager\\"}");
    }
}

static void handleGetHubTransactions(struct mg_connection *c, struct mg_http_message *hm) {
    char hubStr[32];
    if (mg_http_get_var(&hm->query, "hubId", hubStr, sizeof(hubStr)) <= 0) {
        sendJsonResponse(c, 400, "{\\"success\\":false,\\"message\\":\\"Missing hubId\\"}");
        return;
    }
    int hubId = atoi(hubStr);
    
    HubInventoryTransaction trans[50];
    int count = getHubTransactions(hubId, trans, 50);
    
    char body[8192] = "{\\"success\\":true,\\"transactions\\":[";
    for(int i = 0; i < count; i++) {
        char buf[256];
        snprintf(buf, sizeof(buf),
            "{\\"transactionId\\":%d,\\"weightKg\\":%.2f,\\"timestamp\\":\\"%s\\"}",
            trans[i].transactionId, trans[i].weightKg, trans[i].timestamp);
        strcat(body, buf);
        if (i < count - 1) strcat(body, ",");
    }
    strcat(body, "]}");
    sendJsonResponse(c, 200, body);
}

"""

if "handleGetAllHubs" not in content:
    # Insert right before eventHandler
    content = content.replace("static void eventHandler(", hub_handlers + "static void eventHandler(")

# 3. Add routing logic inside eventHandler
routing_logic = """
    else if (isGet  && mg_match(hm->uri, mg_str("/api/hubs"), NULL))                   handleGetAllHubs(c);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/hubs/my-hub"), NULL))            handleGetMyHub(c, hm);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/hubs/transactions"), NULL))      handleGetHubTransactions(c, hm);
"""

if "/api/hubs/my-hub" not in content:
    # Insert routing logic
    content = content.replace("else if (isGet  && mg_match(hm->uri, mg_str(\"/api/bins\"), NULL))", routing_logic.strip() + "\n    else if (isGet  && mg_match(hm->uri, mg_str(\"/api/bins\"), NULL))")

# Also fix the #include "hub.h" if it's missing
if '#include "hub.h"' not in content:
    content = content.replace('#include "config.h"', '#include "config.h"\n#include "hub.h"')

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Injected Stage B Hub APIs.")
