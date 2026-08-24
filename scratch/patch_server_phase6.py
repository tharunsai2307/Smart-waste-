import re

server_path = r"C:\Users\Hp\.gemini\antigravity-ide\scratch\smart-waste-management\src\server.c"

with open(server_path, "r", encoding="utf-8") as f:
    content = f.read()

# Add includes
if '#include "location.h"' not in content:
    content = content.replace('#include "resident.h"', '#include "resident.h"\n#include "location.h"\n#include "gis_route.h"')

# Fix unescaped quotes in the GIS block
content = content.replace('"{"success":true,"message":"Nearby fetched"}"', '"{\\"success\\":true,\\"message\\":\\"Nearby fetched\\"}"')
content = content.replace('"{"success":true,"message":"Routes fetched"}"', '"{\\"success\\":true,\\"message\\":\\"Routes fetched\\"}"')
content = content.replace('"{"success":true,"message":"GIS Action"}"', '"{\\"success\\":true,\\"message\\":\\"GIS Action\\"}"')

with open(server_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Patched server.c successfully")
