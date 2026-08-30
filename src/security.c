#include "security.h"

#include <ctype.h>
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <time.h>

#if defined(_WIN32)
#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <bcrypt.h>
#pragma comment(lib, "bcrypt.lib")
#else
#include <errno.h>
#include <fcntl.h>
#include <unistd.h>
#if defined(__linux__)
#include <sys/random.h>
#endif
#endif

// ─────────────────────────────────────────────────────────────
// SHA-256 (FIPS 180-4), standalone implementation
// ─────────────────────────────────────────────────────────────
#define ROTRIGHT(a, b) (((a) >> (b)) | ((a) << (32 - (b))))
#define CH(x, y, z) (((x) & (y)) ^ (~(x) & (z)))
#define MAJ(x, y, z) (((x) & (y)) ^ ((x) & (z)) ^ ((y) & (z)))
#define EP0(x) (ROTRIGHT(x, 2) ^ ROTRIGHT(x, 13) ^ ROTRIGHT(x, 22))
#define EP1(x) (ROTRIGHT(x, 6) ^ ROTRIGHT(x, 11) ^ ROTRIGHT(x, 25))
#define SIG0(x) (ROTRIGHT(x, 7) ^ ROTRIGHT(x, 18) ^ ((x) >> 3))
#define SIG1(x) (ROTRIGHT(x, 17) ^ ROTRIGHT(x, 19) ^ ((x) >> 10))

static const uint32_t sw_k[64] = {
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2};

typedef struct {
    uint8_t data[64];
    uint32_t datalen;
    unsigned long long bitlen;
    uint32_t state[8];
} SW_SHA256_CTX;

static void sw_sha256_transform(SW_SHA256_CTX *ctx, const uint8_t data[]) {
    uint32_t a, b, c, d, e, f, g, h, i, j, t1, t2, m[64];
    for (i = 0, j = 0; i < 16; ++i, j += 4)
        m[i] = (data[j] << 24) | (data[j + 1] << 16) | (data[j + 2] << 8) | (data[j + 3]);
    for (; i < 64; ++i)
        m[i] = SIG1(m[i - 2]) + m[i - 7] + SIG0(m[i - 15]) + m[i - 16];
    a = ctx->state[0]; b = ctx->state[1]; c = ctx->state[2]; d = ctx->state[3];
    e = ctx->state[4]; f = ctx->state[5]; g = ctx->state[6]; h = ctx->state[7];
    for (i = 0; i < 64; ++i) {
        t1 = h + EP1(e) + CH(e, f, g) + sw_k[i] + m[i];
        t2 = EP0(a) + MAJ(a, b, c);
        h = g; g = f; f = e; e = d + t1;
        d = c; c = b; b = a; a = t1 + t2;
    }
    ctx->state[0] += a; ctx->state[1] += b; ctx->state[2] += c; ctx->state[3] += d;
    ctx->state[4] += e; ctx->state[5] += f; ctx->state[6] += g; ctx->state[7] += h;
}

static void sw_sha256_init(SW_SHA256_CTX *ctx) {
    ctx->datalen = 0; ctx->bitlen = 0;
    ctx->state[0] = 0x6a09e667; ctx->state[1] = 0xbb67ae85;
    ctx->state[2] = 0x3c6ef372; ctx->state[3] = 0xa54ff53a;
    ctx->state[4] = 0x510e527f; ctx->state[5] = 0x9b05688c;
    ctx->state[6] = 0x1f83d9ab; ctx->state[7] = 0x5be0cd19;
}

static void sw_sha256_update(SW_SHA256_CTX *ctx, const uint8_t data[], size_t len) {
    for (size_t i = 0; i < len; ++i) {
        ctx->data[ctx->datalen] = data[i];
        ctx->datalen++;
        if (ctx->datalen == 64) {
            sw_sha256_transform(ctx, ctx->data);
            ctx->bitlen += 512;
            ctx->datalen = 0;
        }
    }
}

static void sw_sha256_final(SW_SHA256_CTX *ctx, uint8_t hash[]) {
    uint32_t i = ctx->datalen;
    if (ctx->datalen < 56) {
        ctx->data[i++] = 0x80;
        while (i < 56) ctx->data[i++] = 0x00;
    } else {
        ctx->data[i++] = 0x80;
        while (i < 64) ctx->data[i++] = 0x00;
        sw_sha256_transform(ctx, ctx->data);
        memset(ctx->data, 0, 56);
    }
    ctx->bitlen += ctx->datalen * 8;
    ctx->data[63] = (uint8_t)ctx->bitlen;
    ctx->data[62] = (uint8_t)(ctx->bitlen >> 8);
    ctx->data[61] = (uint8_t)(ctx->bitlen >> 16);
    ctx->data[60] = (uint8_t)(ctx->bitlen >> 24);
    ctx->data[59] = (uint8_t)(ctx->bitlen >> 32);
    ctx->data[58] = (uint8_t)(ctx->bitlen >> 40);
    ctx->data[57] = (uint8_t)(ctx->bitlen >> 48);
    ctx->data[56] = (uint8_t)(ctx->bitlen >> 56);
    sw_sha256_transform(ctx, ctx->data);
    for (i = 0; i < 4; ++i) {
        hash[i]      = (uint8_t)((ctx->state[0] >> (24 - i * 8)) & 0x000000ff);
        hash[i + 4]  = (uint8_t)((ctx->state[1] >> (24 - i * 8)) & 0x000000ff);
        hash[i + 8]  = (uint8_t)((ctx->state[2] >> (24 - i * 8)) & 0x000000ff);
        hash[i + 12] = (uint8_t)((ctx->state[3] >> (24 - i * 8)) & 0x000000ff);
        hash[i + 16] = (uint8_t)((ctx->state[4] >> (24 - i * 8)) & 0x000000ff);
        hash[i + 20] = (uint8_t)((ctx->state[5] >> (24 - i * 8)) & 0x000000ff);
        hash[i + 24] = (uint8_t)((ctx->state[6] >> (24 - i * 8)) & 0x000000ff);
        hash[i + 28] = (uint8_t)((ctx->state[7] >> (24 - i * 8)) & 0x000000ff);
    }
}

void sw_sha256_buf(const uint8_t *data, size_t len, uint8_t out[32]) {
    SW_SHA256_CTX ctx;
    sw_sha256_init(&ctx);
    sw_sha256_update(&ctx, data, len);
    sw_sha256_final(&ctx, out);
}

void sw_sha256_hex(const uint8_t *data, size_t len, char hex[65]) {
    uint8_t digest[32];
    sw_sha256_buf(data, len, digest);
    for (int i = 0; i < 32; i++) sprintf(hex + (i * 2), "%02x", digest[i]);
    hex[64] = '\0';
}

bool sw_sha256_file(const char *filePath, char checksumOut[65]) {
    FILE *fp = fopen(filePath, "rb");
    if (!fp || !checksumOut) {
        if (checksumOut) checksumOut[0] = '\0';
        if (fp) fclose(fp);
        return false;
    }

    SW_SHA256_CTX ctx;
    sw_sha256_init(&ctx);
    uint8_t buffer[4096];
    size_t bytesRead;
    while ((bytesRead = fread(buffer, 1, sizeof(buffer), fp)) > 0) {
        sw_sha256_update(&ctx, buffer, bytesRead);
    }
    bool ok = !ferror(fp);
    fclose(fp);

    uint8_t digest[32];
    sw_sha256_final(&ctx, digest);
    for (int i = 0; i < 32; i++) sprintf(checksumOut + (i * 2), "%02x", digest[i]);
    checksumOut[64] = '\0';
    return ok;
}

// ─────────────────────────────────────────────────────────────
// Secure random bytes
// ─────────────────────────────────────────────────────────────
bool sw_random_bytes(void *buf, size_t len) {
    if (!buf || len == 0) return false;
#if defined(_WIN32)
    return BCryptGenRandom(NULL, (PUCHAR)buf, (ULONG)len, BCRYPT_USE_SYSTEM_PREFERRED_RNG) == 0;
#else
    uint8_t *p = (uint8_t *)buf;
    size_t off = 0;
#if defined(__linux__)
    while (off < len) {
        ssize_t n = getrandom(p + off, len - off, 0);
        if (n < 0) {
            if (errno == EINTR) continue;
            break;
        }
        off += (size_t)n;
    }
    if (off == len) return true;
#endif
    int fd = open("/dev/urandom", O_RDONLY);
    if (fd >= 0) {
        off = 0;
        while (off < len) {
            ssize_t n = read(fd, p + off, len - off);
            if (n < 0) {
                if (errno == EINTR) continue;
                break;
            }
            if (n == 0) break;
            off += (size_t)n;
        }
        close(fd);
        if (off == len) return true;
    }
    return false;
#endif
}

// ─────────────────────────────────────────────────────────────
// UUID v4
// ─────────────────────────────────────────────────────────────
void sw_uuid_v4(char out[37]) {
    uint8_t raw[16];
    if (!sw_random_bytes(raw, sizeof(raw))) {
        srand((unsigned int)time(NULL) ^ (unsigned int)(uintptr_t)raw);
        for (int i = 0; i < 16; i++) raw[i] = (uint8_t)(rand() & 0xff);
    }
    raw[6] = (uint8_t)((raw[6] & 0x0f) | 0x40); // version 4
    raw[8] = (uint8_t)((raw[8] & 0x3f) | 0x80); // variant 10
    snprintf(out, 37, "%02x%02x%02x%02x-%02x%02x-%02x%02x-%02x%02x-%02x%02x%02x%02x%02x%02x",
             raw[0], raw[1], raw[2], raw[3], raw[4], raw[5], raw[6], raw[7],
             raw[8], raw[9], raw[10], raw[11], raw[12], raw[13], raw[14], raw[15]);
}

void sw_token_hex(char out[65]) {
    uint8_t raw[32];
    if (!sw_random_bytes(raw, sizeof(raw))) {
        srand((unsigned int)time(NULL) ^ (unsigned int)(uintptr_t)raw);
        for (int i = 0; i < 32; i++) raw[i] = (uint8_t)(rand() & 0xff);
    }
    for (int i = 0; i < 32; i++) sprintf(out + (i * 2), "%02x", raw[i]);
    out[64] = '\0';
}

// ─────────────────────────────────────────────────────────────
// Passwords
// ─────────────────────────────────────────────────────────────
static void to_hex(const uint8_t *in, size_t n, char *out) {
    for (size_t i = 0; i < n; i++) sprintf(out + (i * 2), "%02x", in[i]);
    out[n * 2] = '\0';
}

static int hex_nibble(char c) {
    if (c >= '0' && c <= '9') return c - '0';
    if (c >= 'a' && c <= 'f') return c - 'a' + 10;
    if (c >= 'A' && c <= 'F') return c - 'A' + 10;
    return -1;
}

static size_t from_hex(const char *in, size_t n, uint8_t *out, size_t outsz) {
    if ((n & 1) != 0) return 0;
    size_t bytes = n / 2;
    if (bytes > outsz) return 0;
    for (size_t i = 0; i < bytes; i++) {
        int hi = hex_nibble(in[i * 2]);
        int lo = hex_nibble(in[i * 2 + 1]);
        if (hi < 0 || lo < 0) return 0;
        out[i] = (uint8_t)((hi << 4) | lo);
    }
    return bytes;
}

// h = SHA256(salt ++ plain); for i in 1..iters: h = SHA256(h ++ salt ++ i)
static void derive_with_salt(const char *plain, const uint8_t *salt, size_t saltLen,
                             int iters, char hexOut[65]) {
    size_t plen = strlen(plain);
    if (plen > SW_PW_MAX_LEN) plen = SW_PW_MAX_LEN;

    uint8_t first[SW_PW_SALT_BYTES + SW_PW_MAX_LEN];
    memcpy(first, salt, saltLen);
    memcpy(first + saltLen, plain, plen);

    uint8_t h[32];
    sw_sha256_buf(first, saltLen + plen, h);

    uint8_t block[32 + SW_PW_SALT_BYTES + 4];
    for (int i = 1; i < iters; i++) {
        memcpy(block, h, 32);
        memcpy(block + 32, salt, saltLen);
        block[32 + saltLen]     = (uint8_t)(i & 0xff);
        block[32 + saltLen + 1] = (uint8_t)((i >> 8) & 0xff);
        block[32 + saltLen + 2] = (uint8_t)((i >> 16) & 0xff);
        block[32 + saltLen + 3] = (uint8_t)((i >> 24) & 0xff);
        uint8_t next[32];
        sw_sha256_buf(block, 32 + saltLen + 4, next);
        memcpy(h, next, 32);
    }
    to_hex(h, 32, hexOut);
}

void sw_hash_password(const char *plain, char *out, size_t outsz) {
    uint8_t salt[SW_PW_SALT_BYTES];
    if (!sw_random_bytes(salt, sizeof(salt))) {
        unsigned long seed = (unsigned long)time(NULL) ^ (unsigned long)(uintptr_t)plain;
        for (size_t i = 0; i < sizeof(salt); i++) {
            seed = seed * 1103515245UL + 12345UL;
            salt[i] = (uint8_t)(seed >> 24);
        }
    }
    char saltHex[SW_PW_SALT_HEX + 1];
    char hashHex[SW_PW_HASH_HEX + 1];
    to_hex(salt, sizeof(salt), saltHex);
    derive_with_salt(plain, salt, sizeof(salt), SW_PW_ITERATIONS, hashHex);
    snprintf(out, outsz, "S$%d$%s$%s", SW_PW_ITERATIONS, saltHex, hashHex);
}

int sw_constant_time_equal(const char *a, const char *b) {
    if (!a || !b) return 1;
    size_t la = strlen(a), lb = strlen(b);
    size_t maxLen = la > lb ? la : lb;
    int diff = (int)(la - lb);
    for (size_t i = 0; i < maxLen; i++) {
        unsigned char ca = i < la ? (unsigned char)a[i] : 0;
        unsigned char cb = i < lb ? (unsigned char)b[i] : 0;
        diff |= (ca ^ cb);
    }
    return diff;
}

bool sw_verify_password(const char *plain, const char *stored) {
    if (!plain || !stored || !*plain || !*stored) return false;

    if (strncmp(stored, "S$", 2) == 0) {
        int iters = 0;
        char saltHex[SW_PW_SALT_HEX + 1] = {0};
        char hashHex[SW_PW_HASH_HEX + 1] = {0};
        // %24s matches exactly the 24-char salt (larger widths would overflow).
        if (sscanf(stored, "S$%d$%24s$%64s", &iters, saltHex, hashHex) != 3) return false;
        if (iters < 1 || iters > 99999) return false;
        if (strlen(saltHex) != SW_PW_SALT_HEX || strlen(hashHex) != SW_PW_HASH_HEX) return false;

        uint8_t salt[SW_PW_SALT_BYTES];
        if (from_hex(saltHex, SW_PW_SALT_HEX, salt, sizeof(salt)) != SW_PW_SALT_BYTES) return false;

        char calc[65];
        derive_with_salt(plain, salt, sizeof(salt), iters, calc);
        return sw_constant_time_equal(calc, hashHex) == 0;
    }

    // Legacy scheme (Phase 1-13): single pass salted SHA-256 with a global salt.
    if (strlen(stored) == 64) {
        char salted[256];
        snprintf(salted, sizeof(salted), "smart_waste_salt_2026$%s", plain);
        char calc[65];
        sw_sha256_hex((const uint8_t *)salted, strlen(salted), calc);
        return sw_constant_time_equal(calc, stored) == 0;
    }

    // Very old data files: plaintext password field. Still accepted only so the
    // user can log in and be migrated to the new scheme (validateLogin re-hashes).
    return sw_constant_time_equal(stored, plain) == 0;
}

bool sw_password_needs_upgrade(const char *stored) {
    if (!stored) return false;
    if (strncmp(stored, "S$", 2) == 0) {
        int iters = 0;
        if (sscanf(stored, "S$%d", &iters) == 1 && iters >= 1 && iters <= 99999) return false;
    }
    return true;
}

bool sw_password_meets_policy(const char *plain) {
    if (!plain) return false;
    size_t n = strlen(plain);
    if (n < SW_PW_MIN_LEN || n > SW_PW_MAX_LEN) return false;
    bool letter = false, digit = false;
    for (size_t i = 0; i < n; i++) {
        unsigned char ch = (unsigned char)plain[i];
        if (isdigit(ch)) digit = true;
        else if (isalpha(ch)) letter = true;
    }
    return letter && digit;
}
