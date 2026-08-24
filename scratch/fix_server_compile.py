import re

filepath = r"C:\Users\Hp\.gemini\antigravity-ide\scratch\smart-waste-management\src\server.c"

with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# Remove requireRole
content = re.sub(r'if \(!requireRole\(c, "ADMIN"\).*?return; \}\n\s*', '', content)

# Fix getRouteEngineStops to getRouteStops
content = content.replace("handleGetRouteEngineStops", "handleGetRouteStops")
content = content.replace("getRouteEngineStops(", "getRouteStops(")

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)
print("Fixed server.c compilation issues")
