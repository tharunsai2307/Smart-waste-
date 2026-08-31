const express = require('express');
const { z } = require('zod');
const { query, one } = require('../db');
const { authRequired, requireRole } = require('../middleware/auth');
const { computeSlaDueAt, computePriorityScore, rankCleaners } = require('../services/dispatch');

const router = express.Router();

const WASTE_TYPES = ['PLASTIC', 'PAPER', 'METAL', 'E_WASTE', 'BIODEGRADABLE', 'HAZARDOUS', 'MIXED'];

/**
 * Resident creates a pickup request.
 *  - SCHEDULED: routine request, 24h SLA.
 *  - ON_DEMAND: "call for a cleaner now", 4h SLA.
 *  - MISSED_REPORT: resident reporting an already-missed scheduled pickup, 2h SLA + high priority.
 */
const createPickupSchema = z.object({
  requestType: z.enum(['SCHEDULED', 'ON_DEMAND', 'MISSED_REPORT']).default('SCHEDULED'),
  wasteType: z.enum(WASTE_TYPES).default('MIXED'),
  estimatedKg: z.number().positive().default(5),
  notes: z.string().optional(),
  addressLine: z.string().min(1),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  localHubId: z.number().optional(),
  originalRequestId: z.number().optional(), // for MISSED_REPORT referencing the missed one
});

router.post('/', authRequired, requireRole('RESIDENT'), async (req, res) => {
  const parsed = createPickupSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const p = parsed.data;

  let localHubId = p.localHubId;
  if (!localHubId) {
    const profile = await one(`SELECT preferred_local_hub_id FROM resident_profiles WHERE user_id = $1`, [req.user.id]);
    localHubId = profile?.preferred_local_hub_id || null;
  }

  const now = new Date();
  const slaDue = computeSlaDueAt(p.requestType, now);
  const draft = { request_type: p.requestType, waste_type: p.wasteType, escalation_level: 0, created_at: now };
  const priority = computePriorityScore(draft, now);

  const request = await one(
    `INSERT INTO pickup_requests
      (resident_id, request_type, waste_type, estimated_kg, notes, address_line, latitude, longitude, local_hub_id, priority_score, sla_due_at, original_request_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [req.user.id, p.requestType, p.wasteType, p.estimatedKg, p.notes || null, p.addressLine, p.latitude || null, p.longitude || null, localHubId, priority, slaDue, p.originalRequestId || null]
  );

  if (p.requestType === 'MISSED_REPORT') {
    await query(
      `INSERT INTO alerts (type, severity, message, entity_type, entity_id) VALUES ('MISSED_PICKUP','HIGH',$1,'pickup_request',$2)`,
      [`Resident reported a missed pickup at "${p.addressLine}". Needs urgent dispatch.`, request.id]
    );
  }

  await tryAutoAssign(request);
  const refreshed = await one(`SELECT * FROM pickup_requests WHERE id = $1`, [request.id]);
  res.status(201).json({ request: refreshed });
});

/**
 * Attempts to auto-assign the request to the least-loaded / nearest available
 * cleaner at its local hub. If no hub / no cleaners, it stays PENDING and
 * will be picked up by the escalation sweep or manual assignment by the hub manager.
 */
async function tryAutoAssign(request) {
  if (!request.local_hub_id) return null;
  const cleaners = await query(
    `SELECT id, name FROM users WHERE role = 'CLEANER' AND local_hub_id = $1 AND status = 'ACTIVE'`,
    [request.local_hub_id]
  );
  if (!cleaners.length) return null;

  const activeCounts = await query(
    `SELECT assigned_cleaner_id AS id, COUNT(*)::int AS cnt FROM pickup_requests
     WHERE status = 'ASSIGNED' AND assigned_cleaner_id IS NOT NULL GROUP BY assigned_cleaner_id`
  );
  const activeMap = new Map(activeCounts.map((r) => [r.id, r.cnt]));

  const ranked = rankCleaners(cleaners, activeMap, request);
  const chosen = ranked[0];
  await query(
    `UPDATE pickup_requests SET status='ASSIGNED', assigned_cleaner_id=$1, assigned_at=now() WHERE id=$2`,
    [chosen.id, request.id]
  );
  return chosen;
}

/** Manual assignment / reassignment by local hub manager or admin. */
router.patch('/:id/assign', authRequired, requireRole('ADMIN', 'LOCAL_HUB_MANAGER'), async (req, res) => {
  const { cleanerId } = req.body;
  if (!cleanerId) return res.status(400).json({ error: 'cleanerId is required' });
  const request = await one(
    `UPDATE pickup_requests SET status='ASSIGNED', assigned_cleaner_id=$1, assigned_at=now() WHERE id=$2 RETURNING *`,
    [cleanerId, req.params.id]
  );
  if (!request) return res.status(404).json({ error: 'Request not found' });
  res.json({ request });
});

/** Resident cancels their own pending/assigned request. */
router.patch('/:id/cancel', authRequired, requireRole('RESIDENT'), async (req, res) => {
  const request = await one(
    `UPDATE pickup_requests SET status='CANCELLED' WHERE id=$1 AND resident_id=$2 AND status IN ('PENDING','ASSIGNED') RETURNING *`,
    [req.params.id, req.user.id]
  );
  if (!request) return res.status(404).json({ error: 'Request not found or cannot be cancelled' });
  res.json({ request });
});

/**
 * Escalation sweep: finds requests past SLA and re-queues them with higher
 * priority + spawns MISSED_REPORT follow-ups. Real-world logic: nothing
 * silently disappears — every missed SLA becomes a tracked, escalated,
 * alerted event. Can be called by a scheduler or by any authenticated staff
 * hitting this endpoint (idempotent).
 */
router.post('/escalate', authRequired, requireRole('ADMIN', 'LOCAL_HUB_MANAGER', 'RECYCLING_MANAGER'), async (req, res) => {
  const now = new Date();
  const overdue = await query(
    `SELECT * FROM pickup_requests WHERE status IN ('PENDING','ASSIGNED') AND sla_due_at < $1`,
    [now]
  );

  const escalated = [];
  for (const reqRow of overdue) {
    await query(`UPDATE pickup_requests SET status='MISSED' WHERE id=$1`, [reqRow.id]);

    const nextLevel = (reqRow.escalation_level || 0) + 1;
    const newSla = computeSlaDueAt('MISSED_REPORT', now);
    const priority = computePriorityScore({ ...reqRow, request_type: 'MISSED_REPORT', escalation_level: nextLevel, created_at: now }, now);

    const respawned = await one(
      `INSERT INTO pickup_requests
        (resident_id, request_type, waste_type, estimated_kg, notes, address_line, latitude, longitude, local_hub_id, priority_score, sla_due_at, escalation_level, original_request_id)
       VALUES ($1,'MISSED_REPORT',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [reqRow.resident_id, reqRow.waste_type, reqRow.estimated_kg, `Auto-escalated (SLA missed, level ${nextLevel})`,
       reqRow.address_line, reqRow.latitude, reqRow.longitude, reqRow.local_hub_id, priority, newSla, nextLevel, reqRow.original_request_id || reqRow.id]
    );

    await query(
      `INSERT INTO alerts (type, severity, message, entity_type, entity_id) VALUES ('MISSED_PICKUP','CRITICAL',$1,'pickup_request',$2)`,
      [`Pickup #${reqRow.id} missed its SLA and was escalated (level ${nextLevel}). New urgent request #${respawned.id} created.`, respawned.id]
    );

    if (reqRow.status === 'ASSIGNED' && reqRow.assigned_cleaner_id) {
      await query(
        `INSERT INTO audit_log (actor_id, action, entity_type, entity_id, detail) VALUES (NULL,'CLEANER_MISSED_SLA','pickup_request',$1,$2)`,
        [reqRow.id, JSON.stringify({ cleanerId: reqRow.assigned_cleaner_id })]
      );
    }

    await tryAutoAssign(respawned);
    escalated.push({ original: reqRow.id, respawned: respawned.id, level: nextLevel });
  }

  res.json({ escalatedCount: escalated.length, escalated });
});

/** List pickups, scoped by role. Ordered by priority (dispatch-worthy first). */
router.get('/', authRequired, async (req, res) => {
  let rows;
  if (req.user.role === 'RESIDENT') {
    rows = await query(`SELECT * FROM pickup_requests WHERE resident_id = $1 ORDER BY created_at DESC`, [req.user.id]);
  } else if (req.user.role === 'CLEANER') {
    rows = await query(`SELECT * FROM pickup_requests WHERE assigned_cleaner_id = $1 AND status='ASSIGNED' ORDER BY priority_score DESC`, [req.user.id]);
  } else if (req.user.role === 'LOCAL_HUB_MANAGER' && req.user.localHubId) {
    rows = await query(`SELECT * FROM pickup_requests WHERE local_hub_id = $1 ORDER BY priority_score DESC, created_at ASC`, [req.user.localHubId]);
  } else {
    const status = req.query.status;
    rows = status
      ? await query(`SELECT * FROM pickup_requests WHERE status = $1 ORDER BY priority_score DESC`, [status])
      : await query(`SELECT * FROM pickup_requests ORDER BY priority_score DESC, created_at ASC LIMIT 500`);
  }
  res.json({ requests: rows });
});

module.exports = router;
