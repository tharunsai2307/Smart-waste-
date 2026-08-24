CC = gcc
CFLAGS = -Wall -Wextra -Iinclude -fno-lto
LDFLAGS = -lws2_32

CORE_SOURCES = src/user.c src/auth.c src/report.c src/utils.c src/resident.c src/waste.c src/bin.c src/vehicle.c src/collection.c src/alert.c src/recycling.c src/search_sort.c src/route.c src/reward.c src/hub.c src/incident.c src/transfer.c src/facility.c src/map_service.c

all: smart_waste.exe server.exe

smart_waste.exe: $(CORE_SOURCES) src/main.c
	$(CC) $(CFLAGS) -o $@ $^ $(LDFLAGS)

server.exe: $(CORE_SOURCES) src/mongoose.c src/server.c src/server_main.c
	$(CC) $(CFLAGS) -o $@ $^ $(LDFLAGS)

clean:
	rm -f smart_waste.exe server.exe

.PHONY: all clean
