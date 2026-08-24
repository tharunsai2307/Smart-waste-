# Fix recycling.c warnings
with open("src/recycling.c", "r", encoding="utf-8") as f:
    r_content = f.read()

r_content = r_content.replace("int processTransferDecision(int transferId, const char* decision, const char* reason, int operatorId) {",
                              "int processTransferDecision(int transferId, const char* decision, const char* reason, int operatorId) {\n    (void)operatorId;")

r_content = r_content.replace("int completeRecyclingBatch(int batchId, int operatorId) {",
                              "int completeRecyclingBatch(int batchId, int operatorId) {\n    (void)operatorId;")

with open("src/recycling.c", "w", encoding="utf-8") as f:
    f.write(r_content)

# Fix server.c warning
with open("src/server.c", "r", encoding="utf-8") as f:
    s_content = f.read()

s_content = s_content.replace("csvBuf[0] = '\\0';", "csvBuf[0] = 0;")
s_content = s_content.replace("csvBuf[0] = '\0';", "csvBuf[0] = 0;")

with open("src/server.c", "w", encoding="utf-8") as f:
    f.write(s_content)

print("Warnings patched cleanly.")
