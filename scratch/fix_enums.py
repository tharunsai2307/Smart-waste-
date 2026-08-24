import re

filepath = r"C:\Users\Hp\.gemini\antigravity-ide\scratch\smart-waste-management\include\types.h"

with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

enums = """
typedef enum {
    ROUTE_PLANNED,
    ROUTE_ASSIGNED,
    ROUTE_ACCEPTED,
    ROUTE_EN_ROUTE,
    ROUTE_ARRIVED,
    ROUTE_COLLECTING,
    ROUTE_COMPLETED,
    ROUTE_DECLINED,
    ROUTE_CANCELLED,
    ROUTE_FAILED,
    ROUTE_RESCHEDULED
} RouteStatus;

typedef enum {
    STOP_PLANNED,
    STOP_EN_ROUTE,
    STOP_ARRIVED,
    STOP_SERVICING,
    STOP_COMPLETED,
    STOP_SKIPPED,
    STOP_FAILED,
    STOP_RESCHEDULED
} StopStatus;

"""

if "RouteStatus" not in content:
    content = content.replace("typedef struct {\n    int routeId;\n    char routeType[30];", enums + "typedef struct {\n    int routeId;\n    char routeType[30];")

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)
print("Added enums to types.h")
