import re

filepath = r"C:\Users\Hp\.gemini\antigravity-ide\scratch\smart-waste-management\src\route_engine.c"

with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# Fix getCurrentTimestamp
content = re.sub(r"getCurrentTimestamp\((r\.createdAt|r\.updatedAt|ev\.timestamp|routes\[i\]\.updatedAt|stops\[i\]\.arrivalTime|stops\[i\]\.serviceCompletedTime)\);", r"getCurrentTimestamp(\1, sizeof(\1));", content)

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)
print("Fixed getCurrentTimestamp in route_engine.c")
