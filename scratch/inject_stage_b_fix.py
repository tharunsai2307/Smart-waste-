import os

file_path = r"C:\Users\Hp\.gemini\antigravity-ide\scratch\smart-waste-management\src\server.c"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

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
        float currentLoad = calculateHubCurrentLoad(hubs[i].hubId);
        snprintf(buf, sizeof(buf),
            "{\\"hubId\\":%d,\\"name\\":\\"%s\\",\\"address\\":\\"%s\\",\\"managerId\\":%d,\\"currentLoadKg\\":%.2f,\\"maximumCapacityKg\\":%.2f,\\"status\\":\\"%s\\"}",
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
        sendJsonResponse(c, 400, "{\\"success\\":false,\\"message\\":\\"Missing managerId\\"}");
        return;
    }
    int managerId = atoi(mgrStr);
    LocalHub hub;
    if (getHubByManagerId(managerId, &hub) == 1) {
        char buf[512];
        float currentLoad = calculateHubCurrentLoad(hub.hubId);
        snprintf(buf, sizeof(buf),
            "{\\"success\\":true,\\"hub\\":{\\"hubId\\":%d,\\"name\\":\\"%s\\",\\"status\\":\\"%s\\",\\"currentLoadKg\\":%.2f,\\"maximumCapacityKg\\":%.2f}}",
            hub.hubId, hub.name, hubStatusToStr(hub.status), currentLoad, hub.maximumCapacityKg);
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
            "{\\"transactionId\\":%d,\\"quantityKg\\":%.2f,\\"timestamp\\":\\"%s\\"}",
            trans[i].transactionId, trans[i].quantityKg, trans[i].timestamp);
        strcat(body, buf);
        if (i < count - 1) strcat(body, ",");
    }
    strcat(body, "]}");
    sendJsonResponse(c, 200, body);
}

"""

if "handleGetAllHubs" not in content:
    # Remove previous failed injection if any
    if "static void handleGetAllHubs" in content:
        import re
        content = re.sub(r'// ─────────────────────────────────────────────────────────────\n// STAGE B.*?static void eventHandler\(', 'static void eventHandler(', content, flags=re.DOTALL)
    
    # Insert right before eventHandler
    content = content.replace("static void eventHandler(", hub_handlers + "static void eventHandler(")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Injected Stage B Hub APIs.")
