import os
import re

src_dir = "src"

# Types that do NOT have workspaceId field
no_workspace_types = [
    "HubInventoryTransaction", "NotificationPreference", "RouteEngineStop",
    "WasteClassification", "SegregationRecord", "ProcessingRecord",
    "RecoveryRecord", "ResidualRecord", "DriverProfile", "RecyclingRecord",
    "RouteStop", "IncidentTimelineEntry", "AuditLog", "RouteEvent", "RouteRequest",
    "WasteClassification"
]

def clean_file(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # Remove workspace isolation blocks for types that don't have workspaceId
    # The injection pattern is:
    #   // Workspace Isolation
    #   extern char g_current_workspace[37];
    #   if (g_current_workspace[0] != '\0' && strcmp(VAR.workspaceId, g_current_workspace) != 0) continue;
    
    pattern = re.compile(
        r'\s*// Workspace Isolation\s*\n'
        r'\s*extern char g_current_workspace\[37\];\s*\n'
        r'\s*if \(g_current_workspace\[0\] != \'\\0\' && strcmp\((\w+)\.workspaceId, g_current_workspace\) != 0\) continue;\s*\n',
        re.MULTILINE
    )
    
    def maybe_remove(match):
        varname = match.group(1)
        # We need to check if var is of a no-workspace type by looking at the fread context
        # For now, let's check if removing is safe by searching for the type name in surrounding context.
        # This is complex, so let's do it differently: 
        # Remove ALL workspace injections and then only add them back to known-good types.
        return '\n'  # Remove all
    
    new_content = pattern.sub(maybe_remove, content)
    
    if new_content != content:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(new_content)
        print(f"Cleaned all workspace injections from {filepath}")

for filename in os.listdir(src_dir):
    if filename.endswith(".c") and filename not in ["mongoose.c"]:
        clean_file(os.path.join(src_dir, filename))
