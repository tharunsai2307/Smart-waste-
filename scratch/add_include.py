import re

filepath = r"C:\Users\Hp\.gemini\antigravity-ide\scratch\smart-waste-management\src\server.c"

with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

if '#include "route_engine.h"' not in content:
    content = content.replace('#include "gis_route.h"', '#include "gis_route.h"\n#include "route_engine.h"')
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    print("Added route_engine.h to server.c")
