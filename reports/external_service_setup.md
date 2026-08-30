# External Service Configuration Guide

**Date:** 2026-08-26

## Overview
Phase 13 introduces an optional abstraction layer for external services. By default, the system runs safely without any credentials by relying on internal modules (e.g. Haversine distance, internal AlertEngine).

## Environment Variables
To enable external providers, export the following variables in the runtime environment:

### Map/GIS Provider
```sh
export MAP_PROVIDER=mapbox
export MAPBOX_ACCESS_TOKEN=pk.YOUR_TOKEN
```

### Geocoding Provider
```sh
export GEOCODING_PROVIDER=mapbox
export GEOCODING_API_KEY=YOUR_TOKEN
```
*Note: If omitted, the system defaults to 13.0827, 80.2707 for "Chennai" lookups or 0.0, 0.0.*

### Routing Provider
```sh
export ROUTING_PROVIDER=osrm
export ROUTING_API_KEY=YOUR_KEY
```
*Note: If omitted, the system falls back to calculating Haversine distance and applying an estimated average city speed (25 km/h).*

### Notification Provider
```sh
export EMAIL_PROVIDER=sendgrid
export EMAIL_API_KEY=YOUR_TOKEN
```
*Note: If omitted, notifications remain internal to the system's Alert Engine.*

## Fallback Guarantees
The external services are guaranteed **NOT** to block the application's functionality. If an API key is missing or the external service HTTP request fails, the fallback mechanism gracefully handles it and logs an error to Observability.
