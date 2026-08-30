#ifndef SECURITY_H
#define SECURITY_H

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

/*
 * Security primitives for the Smart Waste platform.
 *
 * - Cryptographically secure random bytes (OS RNG: BCrypt/rand_s on Windows,
 *   getrandom() or /dev/urandom on POSIX).
 * - Iterated salted SHA-256 password hashes (self-contained, no OpenSSL).
 *   Stored format: S$<iterations>$<salt_hex>$<hash_hex>
 * - Legacy compatibility: the old single-pass "smart_waste_salt_2026$<plain>"
 *   SHA-256 scheme and plaintext passwords are still verified so existing
 *   data files can be migrated transparently, but verify never ACCEPTS a
 *   plaintext field by itself moving forward (legacy upgrade re-hashes it).
 */

// Password policy
#define SW_PW_MIN_LEN 8
#define SW_PW_MAX_LEN 96
#define SW_PW_ITERATIONS 10000
#define SW_PW_SALT_BYTES 12
#define SW_PW_HASH_BYTES 32
#define SW_PW_SALT_HEX (SW_PW_SALT_BYTES * 2)
#define SW_PW_HASH_HEX (SW_PW_HASH_BYTES * 2)
#define SW_PW_MAX_STR 128

// SHA-256 helpers
void sw_sha256_buf(const uint8_t *data, size_t len, uint8_t out[32]);
void sw_sha256_hex(const uint8_t *data, size_t len, char hex[65]);
bool sw_sha256_file(const char *filePath, char checksumOut[65]);

// Secure random
bool sw_random_bytes(void *buf, size_t len);

// UUID v4 string (36 chars + NUL)
void sw_uuid_v4(char out[37]);

// 64-char hex token (256 bits) + NUL
void sw_token_hex(char out[65]);

// Password hashing / verification
void sw_hash_password(const char *plain, char *out, size_t outsz);
bool sw_verify_password(const char *plain, const char *stored);
bool sw_password_needs_upgrade(const char *stored);
bool sw_password_meets_policy(const char *plain);

// Constant-time string compare (returns 0 when equal, nonzero otherwise)
int sw_constant_time_equal(const char *a, const char *b);

#endif
