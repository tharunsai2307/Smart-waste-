import re

filepath = r"C:\Users\Hp\.gemini\antigravity-ide\scratch\smart-waste-management\include\route_engine.h"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

if "arriveAtStopQR" not in content:
    content = content.replace("int arriveAtStop(int routeId, int stopId, int actorId);", "int arriveAtStop(int routeId, int stopId, int actorId);\nint arriveAtStopQR(int routeId, int stopId, int actorId, const char* stopQrCode);")
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
print("Updated route_engine.h")
