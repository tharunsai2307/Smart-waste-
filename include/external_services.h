#ifndef EXTERNAL_SERVICES_H
#define EXTERNAL_SERVICES_H

#include <stdbool.h>

// Provider Status Enums
typedef enum {
    PROVIDER_NOT_CONFIGURED = 0,
    PROVIDER_AVAILABLE = 1,
    PROVIDER_DEGRADED = 2,
    PROVIDER_UNAVAILABLE = 3
} ProviderStatus;

typedef struct {
    ProviderStatus mapProvider;
    ProviderStatus geocodingProvider;
    ProviderStatus routingProvider;
    ProviderStatus emailProvider;
} ExternalServicesHealth;

// Initialization
void initExternalServices(void);

// Provider Keys
const char* getMapProvider(void);
const char* getMapboxToken(void);
const char* getGeocodingProvider(void);
const char* getGeocodingApiKey(void);
const char* getRoutingProvider(void);
const char* getRoutingApiKey(void);
const char* getEmailProvider(void);
const char* getEmailApiKey(void);

// Health
void getExternalServicesHealth(ExternalServicesHealth *healthOut);

#endif
