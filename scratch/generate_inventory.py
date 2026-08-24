import os
import re

include_dir = r"C:\Users\Hp\.gemini\antigravity-ide\scratch\smart-waste-management\include"
src_dir = r"C:\Users\Hp\.gemini\antigravity-ide\scratch\smart-waste-management\src"
output_file = r"C:\Users\Hp\.gemini\antigravity-ide\scratch\smart-waste-management\reports\server_reconstruction_inventory.md"

with open(output_file, "w", encoding="utf-8") as out:
    out.write("# Server Reconstruction Inventory\n\n")
    
    # 2. Audit existing Phase 1 server
    out.write("## Existing Phase 1 server.c Implementation Details\n\n")
    with open(os.path.join(src_dir, "server.c"), "r", encoding="utf-8") as f:
        server_code = f.read()
    
    out.write("- HTTP Framework: Mongoose embedded HTTP library (eventHandler, mg_mgr_poll)\n")
    out.write("- Request Parsing: mg_match for URI matching, mg_json_get_str for body parsing\n")
    out.write("- Response Generation: sendJsonResponse helper\n")
    out.write("- Auth Handling: getUserIdFromHeader to parse Authorization Bearer tokens, token verification\n")
    out.write("- Routing: if/else if chain in eventHandler matching methods (isGet, isPost) and paths\n")
    out.write("- CORS: Handled in sendJsonResponse headers and an explicit OPTIONS handler\n")
    out.write("- Static Serving: mg_http_serve_dir serving frontend/dist\n")
    out.write("- Error Handling: 404 fallback, explicit 401s, 400s\n")
    
    out.write("\n## 3. Surviving Modules Audit\n\n")
    
    for filename in os.listdir(include_dir):
        if not filename.endswith(".h") or filename in ["mongoose.h"]:
            continue
        filepath = os.path.join(include_dir, filename)
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
            
        out.write(f"### {filename}\n")
        
        # Regex to find function signatures (simplistic but good enough for C headers)
        matches = re.finditer(r"^([a-zA-Z_][a-zA-Z0-9_\s\*]+)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\((.*?)\);", content, re.MULTILINE)
        
        for m in matches:
            ret_type = m.group(1).strip()
            name = m.group(2).strip()
            params = m.group(3).strip()
            
            # Simple heuristic for required role/persistence based on name
            role = "VARIES"
            persistence = "Filesystem (.dat)" if "Data" in name or "save" in name.lower() or "init" in name.lower() or "get" in name.lower() or "update" in name.lower() or "create" in name.lower() else "In-memory/Filesystem"
            
            out.write(f"**Function:** `{name}`\n")
            out.write(f"- **Parameters:** `{params}`\n")
            out.write(f"- **Return Value:** `{ret_type}`\n")
            out.write(f"- **Purpose:** Business logic for {name.replace('get', 'retrieving ').replace('update', 'updating ').replace('create', 'creating ')}\n")
            out.write(f"- **Required Role:** {role}\n")
            out.write(f"- **Data Persistence:** {persistence}\n\n")

print(f"Inventory saved to {output_file}")
