import re

config_path = r"C:\Users\Hp\.gemini\antigravity-ide\scratch\smart-waste-management\include\config.h"

with open(config_path, "r", encoding="utf-8") as f:
    content = f.read()

# Fix duplicates
lines = content.split('\n')
seen_defines = set()
new_lines = []
for line in lines:
    if line.startswith("#define"):
        parts = line.split()
        if len(parts) >= 2:
            define_name = parts[1]
            if define_name in seen_defines:
                continue
            seen_defines.add(define_name)
    new_lines.append(line)

with open(config_path, "w", encoding="utf-8") as f:
    f.write('\n'.join(new_lines))
print("Cleaned config.h")
