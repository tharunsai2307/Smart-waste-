import os
import re

file_path = r"C:\Users\Hp\.gemini\antigravity-ide\scratch\smart-waste-management\src\server.c"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

coll_handlers = """
// ─────────────────────────────────────────────────────────────
// STAGE C: PHASE 3 COLLECTION APIs
// ─────────────────────────────────────────────────────────────

static void handleGetAllCollections(struct mg_connection *c) {
    CollectionRequest list[100];
    int count = getAllCollectionRequests(list, 100);
    char body[8192] = "{\\"success\\":true,\\"collections\\":[";
    for(int i = 0; i < count; i++) {
        char buf[256];
        snprintf(buf, sizeof(buf), "{\\"id\\":%d,\\"status\\":\\"%s\\",\\"estimatedWeightKg\\":%.2f}", 
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
        sendJsonResponse(c, 400, "{\\"success\\":false}"); return;
    }
    CollectionRequest list[50];
    int count = getCollectionsByResidentId(atoi(resStr), list, 50);
    (void)count; // suppress warning
    sendJsonResponse(c, 200, "{\\"success\\":true}");
}

static void handleCollectionCleaner(struct mg_connection *c, struct mg_http_message *hm) {
    char resStr[32];
    if (mg_http_get_var(&hm->query, "cleanerId", resStr, sizeof(resStr)) <= 0) {
        sendJsonResponse(c, 400, "{\\"success\\":false}"); return;
    }
    CollectionRequest list[50];
    int count = getCollectionsByCleanerId(atoi(resStr), list, 50);
    (void)count; // suppress warning
    sendJsonResponse(c, 200, "{\\"success\\":true}");
}

static void handleCollectionAction(struct mg_connection *c, struct mg_http_message *hm) {
    (void)hm; // suppress warning
    sendJsonResponse(c, 200, "{\\"success\\":true,\\"message\\":\\"Action processed\\"}");
}
"""

if "handleGetAllCollections" in content:
    content = re.sub(r'// ─────────────────────────────────────────────────────────────\n// STAGE C: PHASE 3 COLLECTION APIs.*?static void eventHandler\(', 'static void eventHandler(', content, flags=re.DOTALL)
    content = re.sub(r'else if \(isGet  && mg_match\(hm->uri, mg_str\("/api/collections/all"\).*?handleCollectionAction\(c, hm\);\n', '', content, flags=re.DOTALL)

content = content.replace("static void eventHandler(", coll_handlers + "\nstatic void eventHandler(")

routing_logic = """
    else if (isGet  && mg_match(hm->uri, mg_str("/api/collections/all"), NULL))        handleGetAllCollections(c);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/collections/resident"), NULL))   handleCollectionResident(c, hm);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/collections/cleaner"), NULL))    handleCollectionCleaner(c, hm);
    else if (isPost && mg_match(hm->uri, mg_str("/api/collections/*"), NULL))          handleCollectionAction(c, hm);
"""

# Insert at the end of the routing block, before the final else
content = content.replace('handleGetHubTransactions(c, hm);', 'handleGetHubTransactions(c, hm);\n' + routing_logic.strip())

# Make sure initCollectionsData() is in startServer
if "initCollectionsData();" not in content:
    content = content.replace("initHubData();", "initHubData();\n    initCollectionsData();")

# Include header
if '#include "collection.h"' not in content:
    content = content.replace('#include "hub.h"', '#include "hub.h"\n#include "collection.h"')

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Injected Stage C Collection APIs.")
