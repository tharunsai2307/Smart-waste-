import os

file_path = r"C:\Users\Hp\.gemini\antigravity-ide\scratch\smart-waste-management\src\server.c"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Fix handleGetCollections errors
content = content.replace('req.requestedAt', 'req.createdAt')
content = content.replace('req.weightKg', 'req.estimatedWeightKg')

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated server.c for Phase 1 compilation.")
