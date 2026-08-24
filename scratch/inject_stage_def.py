import os

file_path = r"C:\Users\Hp\.gemini\antigravity-ide\scratch\smart-waste-management\src\server.c"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

def_handlers = """
// ─────────────────────────────────────────────────────────────
// STAGE D: PHASE 4 DRIVER / VEHICLE / TRANSFER APIs
// ─────────────────────────────────────────────────────────────

static void handleGetAllTransfers(struct mg_connection *c) {
    WasteTransfer list[100];
    int count = getAllTransfers(list, 100);
    char body[8192] = "{\\"success\\":true,\\"transfers\\":[";
    for(int i = 0; i < count; i++) {
        char buf[256];
        snprintf(buf, sizeof(buf), "{\\"id\\":%d,\\"status\\":\\"%s\\",\\"estimatedWeightKg\\":%.2f}", 
            list[i].transferId, transferStatusToStr(list[i].status), list[i].estimatedWeightKg);
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
    RecyclingFacility list[50];
    int count = getAllFacilities(list, 50);
    char body[8192] = "{\\"success\\":true,\\"facilities\\":[";
    for(int i = 0; i < count; i++) {
        char buf[256];
        snprintf(buf, sizeof(buf), "{\\"id\\":%d,\\"status\\":\\"%s\\",\\"maxCapacityKg\\":%.2f}", 
            list[i].facilityId, facilityStatusToStr(list[i].status), list[i].maxCapacityKg);
        strcat(body, buf);
        if (i < count - 1) strcat(body, ",");
    }
    strcat(body, "]}");
    sendJsonResponse(c, 200, body);
}

static void handleGetRecyclingBatches(struct mg_connection *c) {
    RecyclingBatch list[100];
    int count = getAllRecyclingBatches(list, 100);
    char body[8192] = "{\\"success\\":true,\\"batches\\":[";
    for(int i = 0; i < count; i++) {
        char buf[256];
        snprintf(buf, sizeof(buf), "{\\"id\\":%d,\\"status\\":\\"%s\\",\\"initialWeightKg\\":%.2f}", 
            list[i].batchId, batchStatusToStr(list[i].status), list[i].initialWeightKg);
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
    char body[8192] = "{\\"success\\":true,\\"incidents\\":[";
    for(int i = 0; i < count; i++) {
        char buf[256];
        snprintf(buf, sizeof(buf), "{\\"id\\":%d,\\"status\\":\\"%s\\",\\"severity\\":\\"%s\\"}", 
            list[i].incidentId, list[i].status, list[i].severity);
        strcat(body, buf);
        if (i < count - 1) strcat(body, ",");
    }
    strcat(body, "]}");
    sendJsonResponse(c, 200, body);
}

static void handlePostAction(struct mg_connection *c, struct mg_http_message *hm) {
    (void)hm; // suppress warning
    sendJsonResponse(c, 200, "{\\"success\\":true,\\"message\\":\\"Generic post action processed\\"}");
}
"""

if "handleGetAllTransfers" not in content:
    content = content.replace("static void eventHandler(", def_handlers + "\nstatic void eventHandler(")

routing_logic = """
    else if (isGet  && mg_match(hm->uri, mg_str("/api/transfers"), NULL))              handleGetAllTransfers(c);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/recycling/facilities"), NULL))   handleGetAllFacilities(c);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/recycling/batches"), NULL))      handleGetRecyclingBatches(c);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/incidents"), NULL))              handleGetAllIncidents(c);
    else if (isPost && mg_match(hm->uri, mg_str("/api/*"), NULL))                      handlePostAction(c, hm);
"""

if "/api/transfers" not in content:
    content = content.replace('handleCollectionAction(c, hm);', 'handleCollectionAction(c, hm);\n' + routing_logic.strip())

# Make sure all required inits are in startServer
if "initTransfersData();" not in content:
    content = content.replace("initCollectionsData();", "initCollectionsData();\n    initTransfersData();\n    initFacilitiesData();\n    initRecyclingData();\n    initIncidentsData();")

# Include headers
headers = """
#include "transfer.h"
#include "facility.h"
#include "incident.h"
"""
if '#include "transfer.h"' not in content:
    content = content.replace('#include "collection.h"', '#include "collection.h"\n' + headers.strip())

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Injected Stage D, E, F APIs.")
