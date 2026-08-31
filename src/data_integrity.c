#include "data_integrity.h"
#include "types.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>

// ─────────────────────────────────────────────────────────────
// Self-contained SHA-256 implementation.
// This mirrors mongoose's mg_sha256 routines but is kept local so
// data_integrity.c (used by both the CLI and server targets) does not
// require linking the entire mongoose.c translation unit.
// ─────────────────────────────────────────────────────────────
typedef struct {
    uint32_t state[8];
    uint64_t bits;
    unsigned char buffer[64];
    uint32_t len;
} DiSha256Ctx;

#define DI_ROR(x, n) (((x) >> (n)) | ((x) << (32 - (n))))
#define DI_CH(x, y, z) (((x) & (y)) ^ (~(x) & (z)))
#define DI_MAJ(x, y, z) (((x) & (y)) ^ ((x) & (z)) ^ ((y) & (z)))
#define DI_EP0(x) (DI_ROR(x, 2) ^ DI_ROR(x, 13) ^ DI_ROR(x, 22))
#define DI_EP1(x) (DI_ROR(x, 6) ^ DI_ROR(x, 11) ^ DI_ROR(x, 25))
#define DI_SIG0(x) (DI_ROR(x, 7) ^ DI_ROR(x, 18) ^ ((x) >> 3))
#define DI_SIG1(x) (DI_ROR(x, 17) ^ DI_ROR(x, 19) ^ ((x) >> 10))

static const uint32_t di_sha256_k[64] = {
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
    0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
    0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
    0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
    0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
    0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2};

static void diSha256Init(DiSha256Ctx *ctx) {
    ctx->len = 0;
    ctx->bits = 0;
    ctx->state[0] = 0x6a09e667;
    ctx->state[1] = 0xbb67ae85;
    ctx->state[2] = 0x3c6ef372;
    ctx->state[3] = 0xa54ff53a;
    ctx->state[4] = 0x510e527f;
    ctx->state[5] = 0x9b05688c;
    ctx->state[6] = 0x1f83d9ab;
    ctx->state[7] = 0x5be0cd19;
}

static void diSha256Chunk(DiSha256Ctx *ctx) {
    int i, j;
    uint32_t a, b, c, d, e, f, g, h;
    uint32_t m[64];
    for (i = 0, j = 0; i < 16; ++i, j += 4)
        m[i] = (uint32_t)(((uint32_t)ctx->buffer[j] << 24) |
                           ((uint32_t)ctx->buffer[j + 1] << 16) |
                           ((uint32_t)ctx->buffer[j + 2] << 8) |
                           ((uint32_t)ctx->buffer[j + 3]));
    for (; i < 64; ++i)
        m[i] = DI_SIG1(m[i - 2]) + m[i - 7] + DI_SIG0(m[i - 15]) + m[i - 16];

    a = ctx->state[0]; b = ctx->state[1]; c = ctx->state[2]; d = ctx->state[3];
    e = ctx->state[4]; f = ctx->state[5]; g = ctx->state[6]; h = ctx->state[7];

    for (i = 0; i < 64; ++i) {
        uint32_t t1 = h + DI_EP1(e) + DI_CH(e, f, g) + di_sha256_k[i] + m[i];
        uint32_t t2 = DI_EP0(a) + DI_MAJ(a, b, c);
        h = g; g = f; f = e; e = d + t1;
        d = c; c = b; b = a; a = t1 + t2;
    }

    ctx->state[0] += a; ctx->state[1] += b; ctx->state[2] += c; ctx->state[3] += d;
    ctx->state[4] += e; ctx->state[5] += f; ctx->state[6] += g; ctx->state[7] += h;
}

static void diSha256Update(DiSha256Ctx *ctx, const unsigned char *data, size_t len) {
    size_t i;
    for (i = 0; i < len; i++) {
        ctx->buffer[ctx->len] = data[i];
        if ((++ctx->len) == 64) {
            diSha256Chunk(ctx);
            ctx->bits += 512;
            ctx->len = 0;
        }
    }
}

static void diSha256Final(unsigned char digest[32], DiSha256Ctx *ctx) {
    uint32_t i = ctx->len;
    if (i < 56) {
        ctx->buffer[i++] = 0x80;
        while (i < 56) ctx->buffer[i++] = 0x00;
    } else {
        ctx->buffer[i++] = 0x80;
        while (i < 64) ctx->buffer[i++] = 0x00;
        diSha256Chunk(ctx);
        memset(ctx->buffer, 0, 56);
    }

    ctx->bits += (uint64_t)ctx->len * 8;
    ctx->buffer[63] = (unsigned char)((ctx->bits) & 0xff);
    ctx->buffer[62] = (unsigned char)((ctx->bits >> 8) & 0xff);
    ctx->buffer[61] = (unsigned char)((ctx->bits >> 16) & 0xff);
    ctx->buffer[60] = (unsigned char)((ctx->bits >> 24) & 0xff);
    ctx->buffer[59] = (unsigned char)((ctx->bits >> 32) & 0xff);
    ctx->buffer[58] = (unsigned char)((ctx->bits >> 40) & 0xff);
    ctx->buffer[57] = (unsigned char)((ctx->bits >> 48) & 0xff);
    ctx->buffer[56] = (unsigned char)((ctx->bits >> 56) & 0xff);
    diSha256Chunk(ctx);

    for (i = 0; i < 4; ++i) {
        digest[i]      = (unsigned char)((ctx->state[0] >> (24 - i * 8)) & 0xff);
        digest[i + 4]  = (unsigned char)((ctx->state[1] >> (24 - i * 8)) & 0xff);
        digest[i + 8]  = (unsigned char)((ctx->state[2] >> (24 - i * 8)) & 0xff);
        digest[i + 12] = (unsigned char)((ctx->state[3] >> (24 - i * 8)) & 0xff);
        digest[i + 16] = (unsigned char)((ctx->state[4] >> (24 - i * 8)) & 0xff);
        digest[i + 20] = (unsigned char)((ctx->state[5] >> (24 - i * 8)) & 0xff);
        digest[i + 24] = (unsigned char)((ctx->state[6] >> (24 - i * 8)) & 0xff);
        digest[i + 28] = (unsigned char)((ctx->state[7] >> (24 - i * 8)) & 0xff);
    }
}

static DataFileInfo registry[] = {
    {"alerts.dat", sizeof(Alert)},
    {"audit.dat", sizeof(AuditLog)},
    {"bins.dat", sizeof(Bin)},
    {"collections.dat", sizeof(CollectionRequest)},
    {"driver_profiles.dat", sizeof(DriverProfile)},
    {"facilities.dat", 0}, // Facility
    {"hubs.dat", 0}, // Hub
    {"hub_transactions.dat", 0},
    {"incidents.dat", sizeof(Incident)},
    {"incident_timeline.dat", 0}, // IncidentTimelineEntry
    {"locations.dat", 0},
    {"notification_preferences.dat", 0},
    {"processing_records.dat", 0},
    {"recovery_records.dat", 0},
    {"recycling_batches.dat", 0},
    {"residents.dat", sizeof(Resident)},
    {"residual_records.dat", 0},
    {"routes.dat", 0},
    {"route_events.dat", 0},
    {"route_stops.dat", 0},
    {"segregation_records.dat", 0},
    {"service_areas.dat", 0},
    {"transfers.dat", 0},
    {"users.dat", sizeof(User)},
    {"vehicles.dat", sizeof(Vehicle)},
    {"vehicle_locations.dat", sizeof(VehicleLocation)},
    {"waste.dat", sizeof(Waste)},
    {"waste_classifications.dat", sizeof(WasteClassification)},
    {"workspaces.dat", sizeof(Workspace)}
};
static int registrySize = sizeof(registry) / sizeof(registry[0]);

void initDataIntegrity(void) {
    // Initialization if required
}

int getDataFileRegistry(DataFileInfo *items, int maxItems) {
    int count = (registrySize < maxItems) ? registrySize : maxItems;
    for (int i = 0; i < count; i++) {
        items[i] = registry[i];
    }
    return count;
}

bool calculateFileSHA256(const char *filePath, char *checksumOut) {
    FILE *fp = fopen(filePath, "rb");
    if (!fp) {
        strcpy(checksumOut, "");
        return false;
    }

    DiSha256Ctx ctx;
    diSha256Init(&ctx);

    unsigned char buffer[4096];
    size_t bytesRead;
    while ((bytesRead = fread(buffer, 1, sizeof(buffer), fp)) > 0) {
        diSha256Update(&ctx, buffer, bytesRead);
    }
    fclose(fp);

    unsigned char digest[32];
    diSha256Final(digest, &ctx);

    for (int i = 0; i < 32; i++) {
        sprintf(checksumOut + (i * 2), "%02x", digest[i]);
    }
    checksumOut[64] = '\0';
    return true;
}

void verifyDataFile(const char *fileName, DataIntegrityResult *result) {
    memset(result, 0, sizeof(DataIntegrityResult));
    strncpy(result->fileName, fileName, sizeof(result->fileName) - 1);
    
    char filePath[256];
    snprintf(filePath, sizeof(filePath), "data/%s", fileName);

    FILE *fp = fopen(filePath, "rb");
    if (!fp) {
        result->exists = false;
        result->readable = false;
        result->valid = false;
        strcpy(result->message, "File not found or unreadable");
        return;
    }

    result->exists = true;
    result->readable = true;

    // Get file size
    fseek(fp, 0, SEEK_END);
    result->fileSize = ftell(fp);
    fseek(fp, 0, SEEK_SET);

    size_t recordSize = 0;
    for (int i = 0; i < registrySize; i++) {
        if (strcmp(registry[i].fileName, fileName) == 0) {
            recordSize = registry[i].recordSize;
            break;
        }
    }

    if (recordSize > 0) {
        result->recordCount = result->fileSize / recordSize;
        if (result->fileSize % recordSize != 0) {
            result->invalidRecords++;
            result->valid = false;
            strcpy(result->message, "Corrupted structure: partial record detected");
        } else {
            result->valid = true;
            strcpy(result->message, "OK");
        }
    } else {
        result->recordCount = 0;
        result->valid = true;
        strcpy(result->message, "OK (unstructured)");
    }
    fclose(fp);

    calculateFileSHA256(filePath, result->checksum);
}

int verifyAllDataFiles(DataIntegrityResult *results, int maxResults) {
    int count = (registrySize < maxResults) ? registrySize : maxResults;
    for (int i = 0; i < count; i++) {
        verifyDataFile(registry[i].fileName, &results[i]);
    }
    return count;
}
