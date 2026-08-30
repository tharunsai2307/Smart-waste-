#include "external_services.h"
#include <stdlib.h>
#include <string.h>

static char mapProvider[64] = "fallback";
static char mapboxToken[256] = "";
static char geocodingProvider[64] = "none";
static char geocodingApiKey[256] = "";
static char routingProvider[64] = "none";
static char routingApiKey[256] = "";
static char emailProvider[64] = "none";
static char emailApiKey[256] = "";

static ProviderStatus mapStatus = PROVIDER_NOT_CONFIGURED;
static ProviderStatus geoStatus = PROVIDER_NOT_CONFIGURED;
static ProviderStatus routeStatus = PROVIDER_NOT_CONFIGURED;
static ProviderStatus emailStatus = PROVIDER_NOT_CONFIGURED;

void initExternalServices(void) {
    const char *envMap = getenv("MAP_PROVIDER");
    const char *envMapbox = getenv("MAPBOX_ACCESS_TOKEN");
    const char *envGeo = getenv("GEOCODING_PROVIDER");
    const char *envGeoKey = getenv("GEOCODING_API_KEY");
    const char *envRoute = getenv("ROUTING_PROVIDER");
    const char *envRouteKey = getenv("ROUTING_API_KEY");
    const char *envEmail = getenv("EMAIL_PROVIDER");
    const char *envEmailKey = getenv("EMAIL_API_KEY");

    if (envMap) strncpy(mapProvider, envMap, sizeof(mapProvider) - 1);
    if (envMapbox) {
        strncpy(mapboxToken, envMapbox, sizeof(mapboxToken) - 1);
        mapStatus = PROVIDER_AVAILABLE;
    } else {
        if (strcmp(mapProvider, "mapbox") == 0) {
            mapStatus = PROVIDER_UNAVAILABLE; // Configured but missing token
        } else {
            mapStatus = PROVIDER_NOT_CONFIGURED; // Fallback mode
        }
    }

    if (envGeo) strncpy(geocodingProvider, envGeo, sizeof(geocodingProvider) - 1);
    if (envGeoKey) {
        strncpy(geocodingApiKey, envGeoKey, sizeof(geocodingApiKey) - 1);
        geoStatus = PROVIDER_AVAILABLE;
    }

    if (envRoute) strncpy(routingProvider, envRoute, sizeof(routingProvider) - 1);
    if (envRouteKey) {
        strncpy(routingApiKey, envRouteKey, sizeof(routingApiKey) - 1);
        routeStatus = PROVIDER_AVAILABLE;
    }

    if (envEmail) strncpy(emailProvider, envEmail, sizeof(emailProvider) - 1);
    if (envEmailKey) {
        strncpy(emailApiKey, envEmailKey, sizeof(emailApiKey) - 1);
        emailStatus = PROVIDER_AVAILABLE;
    }
}

const char* getMapProvider(void) { return mapProvider; }
const char* getMapboxToken(void) { return mapboxToken; }
const char* getGeocodingProvider(void) { return geocodingProvider; }
const char* getGeocodingApiKey(void) { return geocodingApiKey; }
const char* getRoutingProvider(void) { return routingProvider; }
const char* getRoutingApiKey(void) { return routingApiKey; }
const char* getEmailProvider(void) { return emailProvider; }
const char* getEmailApiKey(void) { return emailApiKey; }

void getExternalServicesHealth(ExternalServicesHealth *healthOut) {
    healthOut->mapProvider = mapStatus;
    healthOut->geocodingProvider = geoStatus;
    healthOut->routingProvider = routeStatus;
    healthOut->emailProvider = emailStatus;
}
