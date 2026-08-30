# Smart City Waste Intelligence - Build
# Works on Windows (MinGW-W64) and POSIX (Linux/macOS).

CC ?= gcc

# Cross-platform link flags
ifeq ($(OS),Windows_NT)
  LDLIBS += -lws2_32
else
  LDLIBS += -pthread -lm
endif

# gnu11 (not strict c11) so POSIX extensions like struct ip_mreq / strcasecmp
# are visible when building the bundled Mongoose on Linux.
CFLAGS = -std=gnu11 -Wall -Wextra -Wno-unused-parameter -O2 -Iinclude

CORE_SOURCES = src/user.c src/auth.c src/workspace.c src/permissions.c src/analytics.c \
	src/report_export.c src/location.c src/report.c src/utils.c src/resident.c \
	src/waste.c src/bin.c src/vehicle.c src/collection.c src/alert.c src/recycling.c \
	src/route.c src/hub.c src/incident.c src/transfer.c src/facility.c src/alert_engine.c \
	src/geospatial.c src/gis_route.c src/qr.c src/route_engine.c src/search_sort.c \
	src/reward.c src/data_integrity.c src/backup.c src/archive.c src/system_health.c \
	src/external_services.c src/geocoding.c src/routing_provider.c src/notification_provider.c \
	src/observability.c src/security.c

all: server.exe smart_waste.exe

server.exe: $(CORE_SOURCES) src/mongoose.c src/server.c src/server_main.c
	$(CC) $(CFLAGS) -o $@ $^ $(LDLIBS)

smart_waste.exe: $(CORE_SOURCES) src/main.c
	$(CC) $(CFLAGS) -o $@ $^ $(LDLIBS)

# Build the server and run the API smoke tests
test: server.exe
	bash tests/api_smoke.sh

clean:
	rm -f server.exe smart_waste.exe

.PHONY: all clean test
