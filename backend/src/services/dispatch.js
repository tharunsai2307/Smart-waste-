/**
 * Real-world dispatch/escalation logic for pickup requests.
 *
 * Priority score model (higher = more urgent):
 *   base = 10
 *   + 25 if request_type === 'MISSED_REPORT' (resident explicitly reporting a miss)
 *   + 15 if request_type === 'ON_DEMAND'
 *   + escalation_level * 20        (grows every time SLA is breached and it re-escalates)
 *   + waiting time bonus: +1 per 10 minutes waited (caps at +30)
 *   + hazardous/e-waste bonus: +10 (safety/compliance sensitive)
 *
 * SLA:
 *   SCHEDULED   -> due in 24h
 *   ON_DEMAND   -> due in 4h
 *   MISSED_REPORT -> due in 2h (resident already waited once, treat as urgent)
 *
 * Escalation sweep (called periodically or on-demand via /pickups/escalate):
 *   For every PENDING/ASSIGNED request past its sla_due_at:
 *     - mark status MISSED (if it was PENDING) and spawn a fresh MISSED_REPORT
 *       request cloned from it with escalation_level + 1, new SLA, higher priority,
 *       and fire a CRITICAL alert to the local hub manager + admin.
 *     - if it was ASSIGNED but the cleaner never completed it in time, unassign it,
 *       flag the cleaner (audit log), and re-queue with escalation.
 */

const SLA_HOURS = {
  SCHEDULED: 24,
  ON_DEMAND: 4,
  MISSED_REPORT: 2,
};

function computeSlaDueAt(requestType, fromDate = new Date()) {
  const hours = SLA_HOURS[requestType] ?? 24;
  return new Date(fromDate.getTime() + hours * 3600 * 1000);
}

function computePriorityScore(req, now = new Date()) {
  let score = 10;
  if (req.request_type === 'MISSED_REPORT') score += 25;
  if (req.request_type === 'ON_DEMAND') score += 15;
  score += (req.escalation_level || 0) * 20;

  const waitedMs = now - new Date(req.created_at);
  const waitedMinutes = Math.max(0, waitedMs / 60000);
  score += Math.min(30, Math.floor(waitedMinutes / 10));

  if (['E_WASTE', 'HAZARDOUS'].includes(req.waste_type)) score += 10;

  return score;
}

/**
 * Finds the best available cleaner for a pickup request within a local hub,
 * ranked by: currently has fewer active assignments, then closest by geo
 * distance to the pickup address (if coordinates are known).
 */
function rankCleaners(cleaners, activeCountByCleaner, request) {
  const { distanceKm } = require('../utils/geo');
  return [...cleaners].sort((a, b) => {
    const loadA = activeCountByCleaner.get(a.id) || 0;
    const loadB = activeCountByCleaner.get(b.id) || 0;
    if (loadA !== loadB) return loadA - loadB;

    const dA = distanceKm(request.latitude, request.longitude, a.latitude, a.longitude);
    const dB = distanceKm(request.latitude, request.longitude, b.latitude, b.longitude);
    if (dA === null && dB === null) return 0;
    if (dA === null) return 1;
    if (dB === null) return -1;
    return dA - dB;
  });
}

module.exports = { SLA_HOURS, computeSlaDueAt, computePriorityScore, rankCleaners };
