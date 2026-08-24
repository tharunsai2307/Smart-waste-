import re

filepath = r"C:\Users\Hp\.gemini\antigravity-ide\scratch\smart-waste-management\src\server.c"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

old_func = """static void handleArriveStop(struct mg_connection *c, struct mg_http_message *hm) {
    char uriStr[128];
    snprintf(uriStr, sizeof(uriStr), "%.*s", (int)hm->uri.len, hm->uri.buf);
    
    int routeId, stopId;
    if(sscanf(uriStr, "/api/routes/%d/stops/%d/arrive", &routeId, &stopId) == 2) {
        // Assume actorId=1 (DRIVER) from JWT for demo
        int actorId = 1; 
        if(arriveAtStop(routeId, stopId, actorId)) {
            sendJsonResponse(c, 200, "{\\"message\\":\\"Arrived at stop\\"}");
        } else {
            sendJsonResponse(c, 400, "{\\"error\\":\\"Failed to update stop status. Route may not be started.\\"}");
        }
    } else {
        sendJsonResponse(c, 400, "{\\"error\\":\\"Invalid URL format\\"}");
    }
}"""

new_func = """static void handleArriveStop(struct mg_connection *c, struct mg_http_message *hm) {
    char uriStr[128];
    snprintf(uriStr, sizeof(uriStr), "%.*s", (int)hm->uri.len, hm->uri.buf);
    
    int routeId, stopId;
    if(sscanf(uriStr, "/api/routes/%d/stops/%d/arrive", &routeId, &stopId) == 2) {
        int actorId = 1; 
        char stopQr[128] = "";
        mg_json_unescape(hm->body, "$.stopQrCode", stopQr, sizeof(stopQr));
        
        if(arriveAtStopQR(routeId, stopId, actorId, stopQr)) {
            sendJsonResponse(c, 200, "{\\"message\\":\\"Arrived at stop\\"}");
        } else {
            sendJsonResponse(c, 400, "{\\"error\\":\\"Failed to arrive. Invalid QR or state.\\"}");
        }
    } else {
        sendJsonResponse(c, 400, "{\\"error\\":\\"Invalid URL format\\"}");
    }
}"""

content = content.replace(old_func, new_func)

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)
print("Patched handleArriveStop in server.c")
