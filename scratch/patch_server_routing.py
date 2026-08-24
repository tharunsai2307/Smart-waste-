import re

filepath = r"C:\Users\Hp\.gemini\antigravity-ide\scratch\smart-waste-management\src\server.c"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update handleStopAction to remove 'arrive'
old_handle_stop = """static void handleStopAction(struct mg_connection *c, struct mg_http_message *hm, const char* action) {
    int actorId = 1; // From JWT
    char uriStr[128];
    snprintf(uriStr, sizeof(uriStr), "%.*s", (int)hm->uri.len, hm->uri.buf);
    int routeId = 0, stopId = 0;
    sscanf(uriStr, "/api/routes/%d/stops/%d", &routeId, &stopId);
    
    int res = 0;
    if(strcmp(action, "arrive") == 0) res = arriveAtStop(routeId, stopId, actorId);
    else if(strcmp(action, "complete") == 0) {"""

new_handle_stop = """static void handleStopAction(struct mg_connection *c, struct mg_http_message *hm, const char* action) {
    int actorId = 1; // From JWT
    char uriStr[128];
    snprintf(uriStr, sizeof(uriStr), "%.*s", (int)hm->uri.len, hm->uri.buf);
    int routeId = 0, stopId = 0;
    sscanf(uriStr, "/api/routes/%d/stops/%d", &routeId, &stopId);
    
    int res = 0;
    if(strcmp(action, "complete") == 0) {"""

content = content.replace(old_handle_stop, new_handle_stop)

# 2. Update routing logic
old_routing = """else if (isPost && mg_match(hm->uri, mg_str("/api/routes/*/stops/*/arrive"), NULL))   handleStopAction(c, hm, "arrive");
    else if (isPost && mg_match(hm->uri, mg_str("/api/routes/*/stops/*/complete"), NULL)) handleStopAction(c, hm, "complete");"""

new_routing = """else if (isPost && mg_match(hm->uri, mg_str("/api/routes/*/stops/*/arrive"), NULL))   handleArriveStop(c, hm);
    else if (isPost && mg_match(hm->uri, mg_str("/api/routes/*/stops/*/complete"), NULL)) handleStopAction(c, hm, "complete");"""

content = content.replace(old_routing, new_routing)

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)
print("Patched arrive routing in server.c")
