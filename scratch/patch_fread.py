import os
import re

src_dir = "src"

# Global workspace check snippet
snippet = """        // Workspace Isolation
        extern char g_current_workspace[37];
        if (g_current_workspace[0] != '\\0' && strcmp(\\1.workspaceId, g_current_workspace) != 0) continue;
"""

def patch_file(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # Find while (fread(&obj, sizeof(Type), 1, fp) == 1)
    # or while(fread(&obj,...))
    # We will use regex to find this and insert the snippet right after the opening brace.
    
    # Regex:
    # while\s*\(\s*fread\s*\(\s*&([a-zA-Z0-9_]+)\s*,.*?\)\s*==\s*1\s*\)\s*\{
    pattern = re.compile(r'(while\s*\(\s*fread\s*\(\s*&([a-zA-Z0-9_]+)\s*,.*?\)\s*==\s*1\s*\)\s*\{)')
    
    new_content = pattern.sub(r'\1\n        // Workspace Isolation\n        extern char g_current_workspace[37];\n        if (g_current_workspace[0] != \'\\0\' && strcmp(\2.workspaceId, g_current_workspace) != 0) continue;\n', content)

    # Some might not have braces? All our C code usually uses braces for while.
    
    if new_content != content:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(new_content)
        print(f"Patched {filepath}")

for filename in os.listdir(src_dir):
    if filename.endswith(".c") and filename not in ["mongoose.c", "migrate_v11.c"]:
        patch_file(os.path.join(src_dir, filename))
