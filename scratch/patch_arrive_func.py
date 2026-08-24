import re

filepath = r"C:\Users\Hp\.gemini\antigravity-ide\scratch\smart-waste-management\src\server.c"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

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
}
"""

if "handleArriveStop(struct mg_connection" not in content:
    idx = content.find("static void handleStopAction")
    content = content[:idx] + new_func + "\n" + content[idx:]
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
print("Added handleArriveStop to server.c")
