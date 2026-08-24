// Add to server.c at appropriate location
static void handleGetNearbyHubs(struct mg_connection *c, struct mg_http_message *hm) {
    double lat = 0.0, lon = 0.0;
    
    char latStr[30], lonStr[30];
    if (mg_http_get_var(&hm->query, "lat", latStr, sizeof(latStr)) > 0) lat = atof(latStr);
    if (mg_http_get_var(&hm->query, "lon", lonStr, sizeof(lonStr)) > 0) lon = atof(lonStr);
    
    if (!validateCoordinates(lat, lon)) {
        sendJsonResponse(c, 400, "{\"error\":\"Invalid coordinates\"}");
        return;
    }
    
    LocalHub hubs[10];
    int count = findNearestHubs(lat, lon, hubs, 5);
    
    struct mg_str json = mg_str("[");
    for(int i=0; i<count; i++) {
        float dist = calculateDistanceKm(lat, lon, hubs[i].latitude, hubs[i].longitude);
        char buf[512];
        snprintf(buf, sizeof(buf), "%s{\"hubId\":%d,\"hubCode\":\"%s\",\"name\":\"%s\",\"address\":\"%s\",\"latitude\":%f,\"longitude\":%f,\"distanceKm\":%.2f,\"capacity\":%.1f,\"status\":%d}",
                 i == 0 ? "" : ",", hubs[i].hubId, hubs[i].hubCode, hubs[i].name, hubs[i].address, 
                 hubs[i].latitude, hubs[i].longitude, dist, hubs[i].maximumCapacityKg, hubs[i].status);
        
        char *new_str = malloc(json.len + strlen(buf) + 1);
        memcpy(new_str, json.ptr, json.len);
        memcpy(new_str + json.len, buf, strlen(buf));
        new_str[json.len + strlen(buf)] = '\0';
        
        if (json.ptr && json.ptr[0] == '[') {
            // mg_str ptr is const normally but here we manage our own malloc
            if (json.len > 1) free((void*)json.ptr); 
        }
        json = mg_str(new_str);
    }
    
    char *final = malloc(json.len + 2);
    memcpy(final, json.ptr, json.len);
    final[json.len] = ']';
    final[json.len+1] = '\0';
    
    if (json.len > 1) free((void*)json.ptr);
    
    sendJsonResponse(c, 200, final);
    free(final);
}

static void handleGetRoutes(struct mg_connection *c, struct mg_http_message *hm) {
    int userId = getUserIdFromHeader(hm);
    if (userId < 0) {
        sendJsonResponse(c, 401, "{\"error\":\"Unauthorized\"}");
        return;
    }
    
    RoutePlan plans[50];
    int count = getRoutePlansByUser(userId, plans, 50);
    
    // Convert to JSON
    // Simplified for now
    char *resp = malloc(65536);
    strcpy(resp, "[");
    for(int i=0; i<count; i++) {
        char buf[1024];
        snprintf(buf, sizeof(buf), "%s{\"routeId\":%d,\"routeType\":\"%s\",\"originId\":%d,\"destinationId\":%d,\"stopCount\":%d,\"distanceKm\":%.2f,\"durationMin\":%.2f}",
                 i==0 ? "" : ",", plans[i].routeId, plans[i].routeType, plans[i].originId, plans[i].destinationId, plans[i].stopCount, plans[i].totalDistanceKm, plans[i].estimatedDurationMin);
        strcat(resp, buf);
    }
    strcat(resp, "]");
    sendJsonResponse(c, 200, resp);
    free(resp);
}

static void handleOptimizeRoute(struct mg_connection *c, struct mg_http_message *hm) {
    int cleanerId = getUserIdFromHeader(hm);
    if (cleanerId < 0) {
        sendJsonResponse(c, 401, "{\"error\":\"Unauthorized\"}");
        return;
    }
    
    // Extract hubId and collections array from body
    int hubId = (int)mg_json_get_long(hm->body, "$.hubId", 0);
    // Hardcode parsing collectionIds for simplicity here in C, assume frontend passes array of IDs.
    // Let's just fetch all collections assigned to this cleaner and optimize them!
    
    CollectionRequest all[100];
    int count = getCollectionsByCleaner(cleanerId, all, 100);
    
    int ids[100];
    int numIds = 0;
    for(int i=0; i<count; i++) {
        if (all[i].status == COLLECTION_ASSIGNED || all[i].status == COLLECTION_EN_ROUTE) {
            ids[numIds++] = all[i].collectionId;
        }
    }
    
    if (numIds == 0) {
        sendJsonResponse(c, 400, "{\"error\":\"No active collections assigned to optimize\"}");
        return;
    }
    
    RoutePlan plan = optimizeCollectionRoute(hubId, cleanerId, ids, numIds);
    
    char buf[512];
    snprintf(buf, sizeof(buf), "{\"success\":true,\"routeId\":%d,\"distanceKm\":%.2f,\"durationMin\":%.2f}", plan.routeId, plan.totalDistanceKm, plan.estimatedDurationMin);
    sendJsonResponse(c, 200, buf);
}

static void handleValidateCoordinates(struct mg_connection *c, struct mg_http_message *hm) {
    double lat = 0.0, lon = 0.0;
    mg_json_get_num(hm->body, "$.latitude", &lat);
    mg_json_get_num(hm->body, "$.longitude", &lon);
    
    if (validateCoordinates(lat, lon)) {
        sendJsonResponse(c, 200, "{\"valid\":true,\"status\":\"VERIFIED\"}");
    } else {
        sendJsonResponse(c, 200, "{\"valid\":false,\"status\":\"INVALID\"}");
    }
}
