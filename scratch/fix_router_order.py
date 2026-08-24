with open("src/server.c", "r", encoding="utf-8") as f:
    content = f.read()

# Remove the early wildcard
early_wildcard = '    else if (isPost && mg_match(hm->uri, mg_str("/api/*"), NULL))                      handlePostAction(c, hm);\n'
content = content.replace(early_wildcard, "")

# Place handlePostAction before 404
fallback_404 = '    else sendJsonResponse(c, 404, "{\\"error\\":\\"Not found\\"}");'
new_fallback = '    else if (isPost && mg_match(hm->uri, mg_str("/api/*"), NULL))                      handlePostAction(c, hm);\n    else sendJsonResponse(c, 404, "{\\"error\\":\\"Not found\\"}");'

content = content.replace(fallback_404, new_fallback)

with open("src/server.c", "w", encoding="utf-8") as f:
    f.write(content)

print("Fixed wildcard routing order in src/server.c")
