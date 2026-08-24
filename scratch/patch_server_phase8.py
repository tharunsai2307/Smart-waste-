import re

filepath = r"C:\Users\Hp\.gemini\antigravity-ide\scratch\smart-waste-management\src\server.c"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# Make sure we don't inject multiple times
if "handleQRScan" not in content:
    handlers = """
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
        sendJsonResponse(c, 200, "{\\"message\\":\\"Valid QR code\\"}");
    } else {
        char buf[256];
        snprintf(buf, sizeof(buf), "{\\"error\\":\\"%s\\"}", reason);
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
        sendJsonResponse(c, 200, "{\\"message\\":\\"Check-in successful\\"}");
    } else {
        sendJsonResponse(c, 400, "{\\"error\\":\\"Invalid vehicle or route state\\"}");
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
        sendJsonResponse(c, 200, "{\\"message\\":\\"Inspection submitted successfully\\"}");
    } else {
        sendJsonResponse(c, 400, "{\\"error\\":\\"Inspection failed, route aborted\\"}");
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
        sendJsonResponse(c, 200, "{\\"message\\":\\"Arrived at Hub\\"}");
    } else {
        sendJsonResponse(c, 400, "{\\"error\\":\\"Wrong hub scanned\\"}");
    }
}
"""
    
    # Insert Handlers
    start_idx = content.find("static void handleDemoReset")
    content = content[:start_idx] + handlers + "\n" + content[start_idx:]
    
    # Insert routing in eventHandler
    routes = """
    else if (isPost && mg_match(hm->uri, mg_str("/api/qr/scan"), NULL))              handleQRScan(c, hm);
    else if (isPost && mg_match(hm->uri, mg_str("/api/driver/vehicle-checkin"), NULL)) handleDriverCheckin(c, hm);
    else if (isPost && mg_match(hm->uri, mg_str("/api/driver/inspection"), NULL))      handleDriverInspection(c, hm);
    else if (isPost && mg_match(hm->uri, mg_str("/api/hubs/*/arrival"), NULL))         handleHubArrival(c, hm);
"""
    handler_idx = content.find("else if (isPost && mg_match(hm->uri, mg_str(\"/api/demo/reset\")")
    content = content[:handler_idx] + routes + "\n    " + content[handler_idx:]
    
    # Add qr.h include
    if '#include "qr.h"' not in content:
        content = content.replace('#include "route_engine.h"', '#include "route_engine.h"\n#include "qr.h"')
        
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
print("Updated server.c for Phase 8 endpoints")
