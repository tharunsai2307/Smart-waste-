import os
for f in ['include/route_engine.h', 'src/route_engine.c', 'src/server.c']:
    with open(f, "r", encoding="utf-8") as file:
        c = file.read()
    c = c.replace("getRouteStops", "getRouteEngineStops")
    with open(f, "w", encoding="utf-8") as file:
        file.write(c)
print("Renamed getRouteStops to getRouteEngineStops")
