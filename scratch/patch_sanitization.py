with open("src/server.c", "r", encoding="utf-8") as f:
    s = f.read()

old_json_str = """static void jsonStr(char *dest, size_t dsz, const char *src) {
    size_t i = 0, di = 0;
    while (src[i] && di + 2 < dsz) {
        if (src[i] == '"') dest[di++] = '\\\\';
        dest[di++] = src[i++];
    }
    dest[di] = '\\0';
}"""

new_json_str = """static void jsonStr(char *dest, size_t dsz, const char *src) {
    size_t i = 0, di = 0;
    if (!src || !dest || dsz == 0) return;
    while (src[i] && di + 2 < dsz) {
        unsigned char c = (unsigned char)src[i];
        if (c == '"' || c == '\\\\') {
            if (di + 2 < dsz) { dest[di++] = '\\\\'; dest[di++] = c; }
        } else if (c >= 32 && c <= 126) {
            dest[di++] = (char)c;
        } else if (c == '\\n' || c == '\\r' || c == '\\t') {
            dest[di++] = ' ';
        }
        i++;
    }
    dest[di] = 0;
}"""

s = s.replace(old_json_str, new_json_str)
with open("src/server.c", "w", encoding="utf-8") as f:
    f.write(s)

# Also sanitize in report_export.c
with open("src/report_export.c", "r", encoding="utf-8") as f:
    r = f.read()

r_helper = """
static void sanitizeCSV(char *dest, size_t dsz, const char *src) {
    size_t i = 0, di = 0;
    if (!src || !dest || dsz == 0) return;
    while (src[i] && di + 1 < dsz) {
        unsigned char c = (unsigned char)src[i];
        if (c >= 32 && c <= 126 && c != '"') {
            dest[di++] = (char)c;
        } else if (c == '"') {
            dest[di++] = '\'';
        }
        i++;
    }
    dest[di] = 0;
}
"""

if "sanitizeCSV" not in r:
    r = "#include \"report_export.h\"\n#include <stdio.h>\n#include <string.h>\n" + r_helper + r[r.find("int exportCollectionReportCSV"):]
    r = r.replace("items[i].name", "cleanName").replace("items[i].hubCode", "cleanCode")
    # Add clean buffers in exportHubInventoryReportCSV
    old_loop = """for (int i = 0; i < count; i++) {
        int written = snprintf(outBuffer + offset, maxBufferLen - offset,"""
    new_loop = """for (int i = 0; i < count; i++) {
        char cleanName[128], cleanCode[64];
        sanitizeCSV(cleanName, sizeof(cleanName), items[i].name);
        sanitizeCSV(cleanCode, sizeof(cleanCode), items[i].hubCode);
        int written = snprintf(outBuffer + offset, maxBufferLen - offset,"""
    r = r.replace(old_loop, new_loop)

with open("src/report_export.c", "w", encoding="utf-8") as f:
    f.write(r)

print("Sanitization added to server.c and report_export.c")
