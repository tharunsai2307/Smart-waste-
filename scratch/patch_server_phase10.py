import re

# Update server_main.c
with open("src/server_main.c", "r", encoding="utf-8") as f:
    s_main = f.read()

if "initAlertEngine" not in s_main:
    s_main = s_main.replace("#include \"route_engine.h\"", "#include \"route_engine.h\"\n#include \"alert_engine.h\"")
    s_main = s_main.replace("initRouteEngineData();", "initRouteEngineData();\n    initAlertEngine();")
    with open("src/server_main.c", "w", encoding="utf-8") as f:
        f.write(s_main)

# Update server.c
with open("src/server.c", "r", encoding="utf-8") as f:
    content = f.read()

if '#include "alert_engine.h"' not in content:
    content = content.replace('#include "analytics.h"', '#include "analytics.h"\n#include "alert_engine.h"')

phase10_handlers = """
// ─────────────────────────────────────────────────────────────
// PHASE 10: MUNICIPAL INCIDENT RESPONSE & ALERT CENTER HANDLERS
// ─────────────────────────────────────────────────────────────

static void handleGetIncidentsPhase10(struct mg_connection *c, struct mg_http_message *hm) {
    runAlertEvaluationCycle(); // Run real evaluation rule cycle

    char statusFilter[32] = "", severityFilter[32] = "", roleBuf[32] = "";
    mg_http_get_var(&hm->query, "status", statusFilter, sizeof(statusFilter));
    mg_http_get_var(&hm->query, "severity", severityFilter, sizeof(severityFilter));

    struct mg_str *rHeader = mg_http_get_header(hm, "X-User-Role");
    if (rHeader && rHeader->len > 0) snprintf(roleBuf, sizeof(roleBuf), "%.*s", (int)rHeader->len, rHeader->buf);
    else mg_http_get_var(&hm->query, "role", roleBuf, sizeof(roleBuf));

    int requesterId = 0;
    char idBuf[32] = "";
    struct mg_str *idHeader = mg_http_get_header(hm, "X-User-Id");
    if (idHeader && idHeader->len > 0) {
        snprintf(idBuf, sizeof(idBuf), "%.*s", (int)idHeader->len, idHeader->buf);
        requesterId = atoi(idBuf);
    } else if (mg_http_get_var(&hm->query, "userId", idBuf, sizeof(idBuf)) > 0) {
        requesterId = atoi(idBuf);
    }

    FILE *fp = fopen(INCIDENTS_FILE, "rb");
    if (!fp) { sendJsonResponse(c, 200, "[]"); return; }

    char *buf = (char*)malloc(65536);
    if (!buf) { fclose(fp); sendJsonResponse(c, 500, "{\\"error\\":\\"OOM\\"}"); return; }

    int offset = snprintf(buf, 65536, "[");
    int first = 1;
    Incident inc;

    while (fread(&inc, sizeof(Incident), 1, fp) == 1) {
        // Filters
        if (strlen(statusFilter) > 0 && strcmp(inc.status, statusFilter) != 0) continue;
        if (strlen(severityFilter) > 0 && strcmp(inc.severity, severityFilter) != 0) continue;

        // Role scoping
        if (strcmp(roleBuf, "DRIVER") == 0 && requesterId > 0 && inc.reportedBy != requesterId && inc.assignedTo != requesterId) continue;
        if (strcmp(roleBuf, "CLEANER") == 0 && requesterId > 0 && inc.reportedBy != requesterId && inc.assignedTo != requesterId) continue;

        char type[64], sev[32], st[32], desc[512], cat[32], rat[32], aat[32], clsat[32], arole[32], etype[32];
        jsonStr(type, sizeof(type), inc.type);
        jsonStr(sev, sizeof(sev), inc.severity);
        jsonStr(st, sizeof(st), inc.status);
        jsonStr(desc, sizeof(desc), inc.description);
        jsonStr(cat, sizeof(cat), inc.createdAt);
        jsonStr(rat, sizeof(rat), inc.resolvedAt);
        jsonStr(aat, sizeof(aat), inc.acknowledgedAt);
        jsonStr(clsat, sizeof(clsat), inc.closedAt);
        jsonStr(arole, sizeof(arole), inc.assignedRole);
        jsonStr(etype, sizeof(etype), inc.entityType);

        int written = snprintf(buf + offset, 65536 - offset,
            "%s{\\"incidentId\\":%d,\\"type\\":\\"%s\\",\\"severity\\":\\"%s\\",\\"status\\":\\"%s\\","
            "\\"description\\":\\"%s\\",\\"collectionId\\":%d,\\"reportedBy\\":%d,\\"assignedTo\\":%d,"
            "\\"createdAt\\":\\"%s\\",\\"resolvedAt\\":\\"%s\\",\\"acknowledgedAt\\":\\"%s\\",\\"closedAt\\":\\"%s\\","
            "\\"entityType\\":\\"%s\\",\\"entityId\\":%d,\\"hubId\\":%d,\\"vehicleId\\":%d,\\"routeId\\":%d,"
            "\\"facilityId\\":%d,\\"assignedRole\\":\\"%s\\",\\"escalationLevel\\":%d}",
            (first ? "" : ","),
            inc.incidentId, type, sev, st,
            desc, inc.collectionId, inc.reportedBy, inc.assignedTo,
            cat, rat, aat, clsat,
            etype, inc.entityId, inc.hubId, inc.vehicleId, inc.routeId,
            inc.facilityId, arole, inc.escalationLevel);

        if (written < 0 || offset + written >= 65536) break;
        offset += written;
        first = 0;
    }
    fclose(fp);
    snprintf(buf + offset, 65536 - offset, "]");

    sendJsonResponse(c, 200, buf);
    free(buf);
}

static void handleGetIncidentDetail(struct mg_connection *c, struct mg_http_message *hm) {
    char uriStr[128];
    snprintf(uriStr, sizeof(uriStr), "%.*s", (int)hm->uri.len, hm->uri.buf);
    int incId = 0;
    if (sscanf(uriStr, "/api/incidents/%d", &incId) != 1) {
        sendJsonResponse(c, 400, "{\\"error\\":\\"Invalid incident ID\\"}");
        return;
    }

    Incident inc;
    if (!getIncidentById(incId, &inc)) {
        sendJsonResponse(c, 404, "{\\"error\\":\\"Incident not found\\"}");
        return;
    }

    char type[64], sev[32], st[32], desc[512], cat[32], rat[32], aat[32], clsat[32], arole[32], etype[32];
    jsonStr(type, sizeof(type), inc.type);
    jsonStr(sev, sizeof(sev), inc.severity);
    jsonStr(st, sizeof(st), inc.status);
    jsonStr(desc, sizeof(desc), inc.description);
    jsonStr(cat, sizeof(cat), inc.createdAt);
    jsonStr(rat, sizeof(rat), inc.resolvedAt);
    jsonStr(aat, sizeof(aat), inc.acknowledgedAt);
    jsonStr(clsat, sizeof(clsat), inc.closedAt);
    jsonStr(arole, sizeof(arole), inc.assignedRole);
    jsonStr(etype, sizeof(etype), inc.entityType);

    char buf[2048];
    snprintf(buf, sizeof(buf),
        "{\\"incidentId\\":%d,\\"type\\":\\"%s\\",\\"severity\\":\\"%s\\",\\"status\\":\\"%s\\","
        "\\"description\\":\\"%s\\",\\"collectionId\\":%d,\\"reportedBy\\":%d,\\"assignedTo\\":%d,"
        "\\"createdAt\\":\\"%s\\",\\"resolvedAt\\":\\"%s\\",\\"acknowledgedAt\\":\\"%s\\",\\"closedAt\\":\\"%s\\","
        "\\"entityType\\":\\"%s\\",\\"entityId\\":%d,\\"hubId\\":%d,\\"vehicleId\\":%d,\\"routeId\\":%d,"
        "\\"facilityId\\":%d,\\"assignedRole\\":\\"%s\\",\\"escalationLevel\\":%d}",
        inc.incidentId, type, sev, st,
        desc, inc.collectionId, inc.reportedBy, inc.assignedTo,
        cat, rat, aat, clsat,
        etype, inc.entityId, inc.hubId, inc.vehicleId, inc.routeId,
        inc.facilityId, arole, inc.escalationLevel);

    sendJsonResponse(c, 200, buf);
}

static void handleCreateIncidentManual(struct mg_connection *c, struct mg_http_message *hm) {
    char type[64] = "OTHER", severity[32] = "MEDIUM", desc[256] = "", etype[32] = "MANUAL", arole[32] = "ADMIN";
    mg_json_unescape(hm->body, "$.type", type, sizeof(type));
    mg_json_unescape(hm->body, "$.severity", severity, sizeof(severity));
    mg_json_unescape(hm->body, "$.description", desc, sizeof(desc));
    mg_json_unescape(hm->body, "$.entityType", etype, sizeof(etype));
    mg_json_unescape(hm->body, "$.assignedRole", arole, sizeof(arole));

    double eid = 0, hid = 0, vid = 0, rid = 0, fid = 0, rep = 1;
    mg_json_get_num(hm->body, "$.entityId", &eid);
    mg_json_get_num(hm->body, "$.hubId", &hid);
    mg_json_get_num(hm->body, "$.vehicleId", &vid);
    mg_json_get_num(hm->body, "$.routeId", &rid);
    mg_json_get_num(hm->body, "$.facilityId", &fid);
    mg_json_get_num(hm->body, "$.reportedBy", &rep);

    int id = createOperationalIncident(type, severity, etype, (int)eid, (int)hid, (int)vid, (int)rid, (int)fid, (int)rep, arole, desc);
    if (id > 0) {
        char buf[128];
        snprintf(buf, sizeof(buf), "{\\"success\\":true,\\"incidentId\\":%d}", id);
        sendJsonResponse(c, 201, buf);
    } else {
        sendJsonResponse(c, 400, "{\\"error\\":\\"Failed to create incident or duplicate active incident exists\\"}");
    }
}

static void handleIncidentActionWorkflow(struct mg_connection *c, struct mg_http_message *hm, const char* actionType) {
    char uriStr[128];
    snprintf(uriStr, sizeof(uriStr), "%.*s", (int)hm->uri.len, hm->uri.buf);
    int incId = 0;
    char actionPath[64] = "";
    if (sscanf(uriStr, "/api/incidents/%d/%s", &incId, actionPath) < 1) {
        sendJsonResponse(c, 400, "{\\"error\\":\\"Invalid URL format\\"}");
        return;
    }

    int actorId = 1;
    char actorRole[32] = "ADMIN", note[256] = "", actTaken[128] = "", targetRole[32] = "";
    double assignTo = 0;

    mg_json_unescape(hm->body, "$.note", note, sizeof(note));
    mg_json_unescape(hm->body, "$.actionTaken", actTaken, sizeof(actTaken));
    mg_json_unescape(hm->body, "$.actorRole", actorRole, sizeof(actorRole));
    mg_json_unescape(hm->body, "$.targetRole", targetRole, sizeof(targetRole));
    mg_json_get_num(hm->body, "$.assignToUserId", &assignTo);
    mg_json_get_num(hm->body, "$.actorId", &assignTo);
    if (assignTo > 0) actorId = (int)assignTo;

    int res = 0;
    if (strcmp(actionType, "acknowledge") == 0) {
        res = acknowledgeIncident(incId, actorId, actorRole, note);
    } else if (strcmp(actionType, "assign") == 0) {
        double targetUser = 0;
        mg_json_get_num(hm->body, "$.assignToUserId", &targetUser);
        res = assignIncident(incId, actorId, actorRole, (int)targetUser, targetRole, note);
    } else if (strcmp(actionType, "investigate") == 0) {
        res = investigateIncident(incId, actorId, actorRole, note);
    } else if (strcmp(actionType, "action") == 0) {
        res = actionIncident(incId, actorId, actorRole, actTaken, note);
    } else if (strcmp(actionType, "resolve") == 0) {
        res = resolveIncidentWithAudit(incId, actorId, actorRole, note);
    } else if (strcmp(actionType, "close") == 0) {
        res = closeIncident(incId, actorId, actorRole, note);
    } else if (strcmp(actionType, "reopen") == 0) {
        res = reopenIncident(incId, actorId, actorRole, note);
    }

    if (res) {
        sendJsonResponse(c, 200, "{\\"success\\":true,\\"message\\":\\"Incident state updated successfully\\"}");
    } else {
        sendJsonResponse(c, 400, "{\\"error\\":\\"Invalid state transition or incident not found\\"}");
    }
}

static void handleGetIncidentTimelineAPI(struct mg_connection *c, struct mg_http_message *hm) {
    char uriStr[128];
    snprintf(uriStr, sizeof(uriStr), "%.*s", (int)hm->uri.len, hm->uri.buf);
    int incId = 0;
    if (sscanf(uriStr, "/api/incidents/%d/timeline", &incId) != 1) {
        sendJsonResponse(c, 400, "{\\"error\\":\\"Invalid incident ID\\"}");
        return;
    }

    IncidentTimelineEntry list[50];
    int count = getIncidentTimeline(incId, list, 50);

    char *buf = (char*)malloc(16384);
    if (!buf) { sendJsonResponse(c, 500, "{\\"error\\":\\"OOM\\"}"); return; }

    int offset = snprintf(buf, 16384, "[");
    for (int i = 0; i < count; i++) {
        char ts[64], act[64], arole[32], prev[32], nxt[32], cmt[512], ev[64];
        jsonStr(ts, sizeof(ts), list[i].timestamp);
        jsonStr(act, sizeof(act), list[i].action);
        jsonStr(arole, sizeof(arole), list[i].actorRole);
        jsonStr(prev, sizeof(prev), list[i].previousStatus);
        jsonStr(nxt, sizeof(nxt), list[i].newStatus);
        jsonStr(cmt, sizeof(cmt), list[i].comment);
        jsonStr(ev, sizeof(ev), list[i].evidenceRef);

        int written = snprintf(buf + offset, 16384 - offset,
            "%s{\\"timelineId\\":%d,\\"incidentId\\":%d,\\"timestamp\\":\\"%s\\",\\"actorId\\":%d,"
            "\\"actorRole\\":\\"%s\\",\\"action\\":\\"%s\\",\\"previousStatus\\":\\"%s\\",\\"newStatus\\":\\"%s\\","
            "\\"comment\\":\\"%s\\",\\"evidenceRef\\":\\"%s\\"}",
            (i == 0 ? "" : ","),
            list[i].timelineId, list[i].incidentId, ts, list[i].actorId,
            arole, act, prev, nxt, cmt, ev);

        if (written < 0 || offset + written >= 16384) break;
        offset += written;
    }
    snprintf(buf + offset, 16384 - offset, "]");

    sendJsonResponse(c, 200, buf);
    free(buf);
}

static void handleAddIncidentCommentAPI(struct mg_connection *c, struct mg_http_message *hm) {
    char uriStr[128];
    snprintf(uriStr, sizeof(uriStr), "%.*s", (int)hm->uri.len, hm->uri.buf);
    int incId = 0;
    if (sscanf(uriStr, "/api/incidents/%d/comments", &incId) != 1) {
        sendJsonResponse(c, 400, "{\\"error\\":\\"Invalid incident ID\\"}");
        return;
    }

    char comment[256] = "", role[32] = "ADMIN";
    mg_json_unescape(hm->body, "$.comment", comment, sizeof(comment));
    mg_json_unescape(hm->body, "$.actorRole", role, sizeof(role));
    double actorId = 1;
    mg_json_get_num(hm->body, "$.actorId", &actorId);

    if (addIncidentComment(incId, (int)actorId, role, comment)) {
        sendJsonResponse(c, 201, "{\\"success\\":true,\\"message\\":\\"Comment added\\"}");
    } else {
        sendJsonResponse(c, 400, "{\\"error\\":\\"Comment cannot be empty\\"}");
    }
}

static void handleGetUnreadAlerts(struct mg_connection *c) {
    runAlertEvaluationCycle();

    FILE *fp = fopen(ALERTS_FILE, "rb");
    if (!fp) { sendJsonResponse(c, 200, "[]"); return; }

    char *buf = (char*)malloc(16384);
    if (!buf) { fclose(fp); sendJsonResponse(c, 500, "{\\"error\\":\\"OOM\\"}"); return; }

    int offset = snprintf(buf, 16384, "[");
    int first = 1;
    Alert a;
    while (fread(&a, sizeof(Alert), 1, fp) == 1) {
        if (a.resolved == 0) {
            char type[64], msg[256], dt[64];
            jsonStr(type, sizeof(type), a.type);
            jsonStr(msg, sizeof(msg), a.message);
            jsonStr(dt, sizeof(dt), a.date);

            int written = snprintf(buf + offset, 16384 - offset,
                "%s{\\"alertId\\":%d,\\"type\\":\\"%s\\",\\"referenceId\\":%d,\\"message\\":\\"%s\\",\\"date\\":\\"%s\\",\\"resolved\\":%d}",
                (first ? "" : ","), a.alertId, type, a.referenceId, msg, dt, a.resolved);
            if (written < 0 || offset + written >= 16384) break;
            offset += written;
            first = 0;
        }
    }
    fclose(fp);
    snprintf(buf + offset, 16384 - offset, "]");

    sendJsonResponse(c, 200, buf);
    free(buf);
}

static void handleAcknowledgeAlertAPI(struct mg_connection *c, struct mg_http_message *hm) {
    char uriStr[128];
    snprintf(uriStr, sizeof(uriStr), "%.*s", (int)hm->uri.len, hm->uri.buf);
    int alertId = 0;
    if (sscanf(uriStr, "/api/alerts/%d/acknowledge", &alertId) == 1) {
        resolveAlert(alertId);
        sendJsonResponse(c, 200, "{\\"success\\":true,\\"message\\":\\"Alert acknowledged\\"}");
    } else {
        sendJsonResponse(c, 400, "{\\"error\\":\\"Invalid alert ID\\"}");
    }
}

static void handleGetNotificationPreferencesAPI(struct mg_connection *c, struct mg_http_message *hm) {
    int userId = 1;
    char idBuf[32];
    if (mg_http_get_var(&hm->query, "userId", idBuf, sizeof(idBuf)) > 0) {
        userId = atoi(idBuf);
    }

    NotificationPreference prefs;
    getNotificationPreferences(userId, &prefs);

    char buf[512];
    snprintf(buf, sizeof(buf),
        "{\\"userId\\":%d,\\"criticalAlerts\\":%d,\\"highSeverityAlerts\\":%d,"
        "\\"assignedIncidentsOnly\\":%d,\\"hubAlerts\\":%d,\\"vehicleAlerts\\":%d,"
        "\\"collectionExceptions\\":%d,\\"recyclingExceptions\\":%d}",
        prefs.userId, prefs.criticalAlerts, prefs.highSeverityAlerts,
        prefs.assignedIncidentsOnly, prefs.hubAlerts, prefs.vehicleAlerts,
        prefs.collectionExceptions, prefs.recyclingExceptions);

    sendJsonResponse(c, 200, buf);
}

static void handleSaveNotificationPreferencesAPI(struct mg_connection *c, struct mg_http_message *hm) {
    NotificationPreference prefs;
    memset(&prefs, 0, sizeof(NotificationPreference));

    double uid = 1, crit = 1, high = 1, ass = 0, hub = 1, veh = 1, col = 1, rec = 1;
    mg_json_get_num(hm->body, "$.userId", &uid);
    mg_json_get_num(hm->body, "$.criticalAlerts", &crit);
    mg_json_get_num(hm->body, "$.highSeverityAlerts", &high);
    mg_json_get_num(hm->body, "$.assignedIncidentsOnly", &ass);
    mg_json_get_num(hm->body, "$.hubAlerts", &hub);
    mg_json_get_num(hm->body, "$.vehicleAlerts", &veh);
    mg_json_get_num(hm->body, "$.collectionExceptions", &col);
    mg_json_get_num(hm->body, "$.recyclingExceptions", &rec);

    prefs.userId = (int)uid;
    prefs.criticalAlerts = (int)crit;
    prefs.highSeverityAlerts = (int)high;
    prefs.assignedIncidentsOnly = (int)ass;
    prefs.hubAlerts = (int)hub;
    prefs.vehicleAlerts = (int)veh;
    prefs.collectionExceptions = (int)col;
    prefs.recyclingExceptions = (int)rec;

    if (saveNotificationPreferences(&prefs)) {
        sendJsonResponse(c, 200, "{\\"success\\":true,\\"message\\":\\"Preferences saved\\"}");
    } else {
        sendJsonResponse(c, 500, "{\\"error\\":\\"Failed to save preferences\\"}");
    }
}
"""

if "handleGetIncidentsPhase10" not in content:
    idx = content.find("static void handleAnalyticsSummary")
    content = content[:idx] + phase10_handlers + "\n" + content[idx:]

phase10_routes = """
    // Phase 10: Municipal Incident & Response Center APIs
    else if (isGet  && mg_match(hm->uri, mg_str("/api/incidents/*/timeline"), NULL))   handleGetIncidentTimelineAPI(c, hm);
    else if (isPost && mg_match(hm->uri, mg_str("/api/incidents/*/comments"), NULL))   handleAddIncidentCommentAPI(c, hm);
    else if (isPost && mg_match(hm->uri, mg_str("/api/incidents/*/acknowledge"), NULL)) handleIncidentActionWorkflow(c, hm, "acknowledge");
    else if (isPost && mg_match(hm->uri, mg_str("/api/incidents/*/assign"), NULL))      handleIncidentActionWorkflow(c, hm, "assign");
    else if (isPost && mg_match(hm->uri, mg_str("/api/incidents/*/investigate"), NULL)) handleIncidentActionWorkflow(c, hm, "investigate");
    else if (isPost && mg_match(hm->uri, mg_str("/api/incidents/*/action"), NULL))      handleIncidentActionWorkflow(c, hm, "action");
    else if (isPost && mg_match(hm->uri, mg_str("/api/incidents/*/resolve"), NULL))     handleIncidentActionWorkflow(c, hm, "resolve");
    else if (isPost && mg_match(hm->uri, mg_str("/api/incidents/*/close"), NULL))       handleIncidentActionWorkflow(c, hm, "close");
    else if (isPost && mg_match(hm->uri, mg_str("/api/incidents/*/reopen"), NULL))      handleIncidentActionWorkflow(c, hm, "reopen");
    else if (isGet  && mg_match(hm->uri, mg_str("/api/incidents/#"), NULL))             handleGetIncidentDetail(c, hm);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/incidents"), NULL))                handleGetIncidentsPhase10(c, hm);
    else if (isPost && mg_match(hm->uri, mg_str("/api/incidents"), NULL))               handleCreateIncidentManual(c, hm);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/alerts/unread"), NULL))           handleGetUnreadAlerts(c);
    else if (isPost && mg_match(hm->uri, mg_str("/api/alerts/*/acknowledge"), NULL))    handleAcknowledgeAlertAPI(c, hm);
    else if (isGet  && mg_match(hm->uri, mg_str("/api/notifications/preferences"), NULL)) handleGetNotificationPreferencesAPI(c, hm);
    else if (isPost && mg_match(hm->uri, mg_str("/api/notifications/preferences"), NULL)) handleSaveNotificationPreferencesAPI(c, hm);
"""

# Replace old handleGetAllIncidents route with phase 10 route handler
if "handleGetIncidentsPhase10" not in content:
    content = content.replace("else if (isGet  && mg_match(hm->uri, mg_str(\"/api/incidents\"), NULL))              handleGetAllIncidents(c);", "")

if "/api/incidents/*/acknowledge" not in content:
    target = "else if (isGet  && mg_match(hm->uri, mg_str(\"/api/analytics/summary\"), NULL))"
    pos = content.find(target)
    content = content[:pos] + phase10_routes + "    " + content[pos:]

with open("src/server.c", "w", encoding="utf-8") as f:
    f.write(content)

print("Updated server.c with Phase 10 Incident & Alert endpoints")
