import re

filepath = r"C:\Users\Hp\.gemini\antigravity-ide\scratch\smart-waste-management\include\route_engine.h"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

if "submitVehicleInspection" not in content:
    content = content.replace("int dispatchRoute", "int submitVehicleInspection(int vehicleId, int driverId, int routeId, int passed);\nint driverCheckInVehicle(int routeId, int driverId, const char* vehicleQrCode);\nint dispatchRoute")
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
print("Updated route_engine.h")
