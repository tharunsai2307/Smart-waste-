CC = gcc
CFLAGS = -Wall -Wextra -Iinclude -fno-lto

# Cross-platform link flags: Windows (MinGW) needs Winsock, while
# Linux/macOS need libm for the math functions used by the geospatial
# distance calculations and libpthread for mongoose's threaded helpers.
ifeq ($(OS),Windows_NT)
    LDFLAGS = -lws2_32
else
    LDFLAGS = -lm -lpthread
endif

CORE_SOURCES = src/user.c src/auth.c src/workspace.c src/permissions.c src/analytics.c src/report_export.c src/location.c src/report.c src/utils.c src/resident.c src/waste.c src/bin.c src/vehicle.c src/collection.c src/alert.c src/recycling.c src/route.c src/hub.c src/incident.c src/transfer.c src/facility.c src/alert_engine.c src/geospatial.c src/gis_route.c src/qr.c src/route_engine.c src/search_sort.c src/reward.c src/data_integrity.c src/backup.c src/archive.c src/system_health.c src/external_services.c src/geocoding.c src/routing_provider.c src/notification_provider.c src/observability.c

all: smart_waste.exe server.exe

smart_waste.exe: $(CORE_SOURCES) src/main.c
	$(CC) $(CFLAGS) -o $@ $^ $(LDFLAGS)

server.exe: $(CORE_SOURCES) src/mongoose.c src/server.c src/server_main.c
	$(CC) $(CFLAGS) -o $@ $^ $(LDFLAGS)

clean:
	rm -f smart_waste.exe server.exe

.PHONY: all clean
