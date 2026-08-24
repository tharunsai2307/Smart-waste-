import re

filepath = r"C:\Users\Hp\.gemini\antigravity-ide\scratch\smart-waste-management\src\route_engine.c"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# Modify startRoute
startRoute_old = """int startRoute(int routeId, int actorId) {
    for(int i=0; i<numRoutes; i++) {
        if(routes[i].routeId == routeId && routes[i].driverId == actorId && 
           (routes[i].status == ROUTE_ACCEPTED || routes[i].status == ROUTE_ASSIGNED)) {"""
           
startRoute_new = """int startRoute(int routeId, int actorId) {
    for(int i=0; i<numRoutes; i++) {
        if(routes[i].routeId == routeId && routes[i].driverId == actorId && 
           routes[i].status == ROUTE_READY) {"""
content = content.replace(startRoute_old, startRoute_new)

# Add arriveAtStop with QR scan
arriveAtStop_old = """int arriveAtStop(int routeId, int stopId, int actorId) {
    for(int i=0; i<numStops; i++) {
        if(stops[i].routeId == routeId && stops[i].routeStopId == stopId) {
            stops[i].status = STOP_ARRIVED;"""

arriveAtStop_new = """// Updated with QR scan validation
int arriveAtStopQR(int routeId, int stopId, int actorId, const char* stopQrCode) {
    for(int i=0; i<numStops; i++) {
        if(stops[i].routeId == routeId && stops[i].routeStopId == stopId) {
            
            char reason[128] = "";
            if (validateQRCode(stopQrCode, routeId, 0, actorId, stopId, reason) != QR_SUCCESS) {
                logQREvent("STOP", stopId, actorId, routeId, 0, 0, QR_FAILED, reason);
                return 0;
            }
            logQREvent("STOP", stopId, actorId, routeId, 0, 0, QR_SUCCESS, "");
            
            stops[i].status = STOP_ARRIVED;"""
            
content = content.replace(arriveAtStop_old, arriveAtStop_new)

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)
print("Patched startRoute and arriveAtStop in route_engine.c")
