import re

with open("src/server.c", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update signatures
content = re.sub(r'(static\s+void\s+handle[A-Za-z0-9_]+)\(struct\s+mg_connection\s*\*\s*c\)\s*\{', r'\1(struct mg_connection *c, struct mg_http_message *hm) {', content)

# 2. Update calls in eventHandler
# Find the eventHandler function block
match = re.search(r'static void eventHandler.*?^}', content, re.MULTILINE | re.DOTALL)
if match:
    ev_block = match.group(0)
    # replace handleXXX(c) with handleXXX(c, hm)
    new_ev_block = re.sub(r'(handle[A-Za-z0-9_]+)\(c\)', r'\1(c, hm)', ev_block)
    content = content.replace(ev_block, new_ev_block)

# 3. Inject getAuthenticatedUser at the start of all handlers if not present
handlers = re.findall(r'static void handle[A-Za-z0-9_]+\(struct mg_connection \*c, struct mg_http_message \*hm\) \{', content)
for handler in handlers:
    if handler == "static void handleLogin(struct mg_connection *c, struct mg_http_message *hm) {":
        continue
    if handler == "static void handlePostAction(struct mg_connection *c, struct mg_http_message *hm) {":
        continue
    
    # We want to inject user auth at the beginning of the handler.
    # We can just replace the handler signature with signature + auth check
    auth_check = """
    User user;
    int auth_ok = getAuthenticatedUser(hm, &user);
    if (!auth_ok) { sendJsonResponse(c, 401, "{\\"error\\":\\"Unauthorized\\"}"); return; }
"""
    # actually let's only do it for endpoints that need it to avoid messing up things like OPTIONS or health.
    # Wait, all these handleXXX are the actual endpoints.
    # I'll just use a more targeted approach for the main list endpoints for now, to ensure safety.

with open("src/server.c", "w", encoding="utf-8") as f:
    f.write(content)

print("Signatures patched")
