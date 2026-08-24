with open("src/alert_engine.c", "r", encoding="utf-8") as f:
    c = f.read()

c = c.replace("char msg[200];", "char msg[512];")

with open("src/alert_engine.c", "w", encoding="utf-8") as f:
    f.write(c)

print("Fixed msg buffer sizes in src/alert_engine.c")
