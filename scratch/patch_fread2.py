import os
import re

src_dir = "src"

has_workspace = {
    'User', 'Resident', 'Waste', 'Bin', 'Vehicle', 'CollectionRequest', 'Incident', 'Alert',
    'LocalHub', 'AuditLog', 'WasteTransfer', 'TransportFacility', 'RecyclingBatch', 'RoutePlan',
    'GeoLocation', 'ServiceArea', 'VehicleLocation', 'RouteRequest', 'Route',
    'VehicleInspection', 'QREvent', 'Workspace'
}

def patch_file(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    original = content
    
    # Find all fread loops and inject workspace isolation for known types
    # Pattern: while (fread(&varname, sizeof(TypeName), 1, fp) == 1) {
    pattern = re.compile(
        r'(while\s*\(\s*fread\s*\(\s*&(\w+)\s*,\s*sizeof\s*\(\s*(\w+)\s*\)\s*,\s*1\s*,\s*\w+\s*\)\s*==\s*1\s*\)\s*\{)'
    )
    
    def inject(match):
        full = match.group(1)
        varname = match.group(2)
        typename = match.group(3)
        
        if typename in has_workspace:
            injection = (
                '\n        // Workspace Isolation\n'
                '        if (g_current_workspace[0] != \'\\0\' && strcmp(' + varname + '.workspaceId, g_current_workspace) != 0) continue;'
            )
            return full + injection
        return full
    
    new_content = pattern.sub(inject, content)
    
    # Also need to declare g_current_workspace as extern in each file that uses it
    if 'g_current_workspace' in new_content and 'extern char g_current_workspace' not in new_content and new_content != original:
        # Add extern declaration after the last #include
        includes_end = 0
        for m in re.finditer(r'^#include\s+[<"].*?[>"]', new_content, re.MULTILINE):
            includes_end = m.end()
        
        if includes_end > 0:
            new_content = (
                new_content[:includes_end] + 
                '\nextern char g_current_workspace[37];' + 
                new_content[includes_end:]
            )
    
    if new_content != original:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(new_content)
        print(f"Patched {filepath}")

for filename in os.listdir(src_dir):
    if filename.endswith(".c") and filename not in ["mongoose.c", "workspace.c", "permissions.c", "utils.c", "auth.c"]:
        patch_file(os.path.join(src_dir, filename))
