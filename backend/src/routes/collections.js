const express = require('express');
const { z } = require('zod');
const { query, one } = require('../db');
const { authRequired, requireRole } = require('../middleware/auth');
const { computeEcoPoints } = require('../services/ecoPoints');

const router = express.Router();

const WASTE_TYPES = ['PLASTIC', 'PAPER', 'METAL', 'E_WASTE', 'BIODEGRADABLE', 'HAZARDOUS', 'MIXED'];

/**
 * Cleaner logs a completed collection at a resident's address, dropped at
 * their local hub. This is the single source of truth for "real" collected
 * weight — no estimates get treated as facts anywhere downstream.
 */
const logCollectionSchema = z.object({
  pickupRequestId: z.number().optional(),
  residentId: z.number().optional(),
  wasteType: z.enum(WASTE_TYPES),
  weightKg: z.number().positive(),
});

router.post('/', authRequired, requireRole('CLEANER'), async (req, res) => {
  const parsed = logCollectionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const p = parsed.data;

  const cleaner = await one(`SELECT * FROM users WHERE id = $1`, [req.user.id]);
  if (!cleaner.local_hub_id) return res.status(400).json({ error: 'You are not assigned to a local hub' });

  const collection = await one(
    `INSERT INTO collections (pickup_request_id, cleaner_id, resident_id, local_hub_id, waste_type, weight_kg, eco_points_awarded)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [p.pickupRequestId || null, req.user.id, p.residentId || null, cleaner.local_hub_id, p.wasteType, p.weightKg, p.residentId ? computeEcoPoints(p.weightKg, p.wasteType) : 0]
  );

  // Update hub fill level with REAL logged weight.
  const hub = await one(
    `UPDATE local_hubs SET current_load_kg = current_load_kg + $1 WHERE id = $2 RETURNING *`,
    [p.weightKg, cleaner.local_hub_id]
  );

  // Award eco points to resident if identified.
  if (p.residentId) {
    const pts = computeEcoPoints(p.weightKg, p.wasteType);
    await query(`UPDATE resident_profiles SET eco_points = eco_points + $1, total_kg_recycled = total_kg_recycled + $2 WHERE user_id = $3`, [pts, p.weightKg, p.residentId]);
    await query(`INSERT INTO eco_points_ledger (resident_id, points, reason, ref_type, ref_id) VALUES ($1,$2,'Waste collected',  'collection', $3)`, [p.residentId, pts, collection.id]);
  }

  // Mark pickup request collected if this was tied to one.
  if (p.pickupRequestId) {
    await query(
      `UPDATE pickup_requests SET status='COLLECTED', collected_at=now(), actual_kg=$1 WHERE id=$2`,
      [p.weightKg, p.pickupRequestId]
    );
  }

  // Real-world hub capacity alerting.
  const fillPct = (hub.current_load_kg / hub.capacity_kg) * 100;
  if (fillPct >= hub.critical_pct) {
    await maybeRaiseHubAlert(hub, 'HUB_CRITICAL', 'CRITICAL', `${hub.name} is at ${fillPct.toFixed(0)}% capacity — dispatch a truck now.`);
  } else if (fillPct >= hub.warning_pct) {
    await maybeRaiseHubAlert(hub, 'HUB_WARNING', 'MEDIUM', `${hub.name} is at ${fillPct.toFixed(0)}% capacity — plan a transfer soon.`);
  }

  res.status(201).json({ collection, hub, fillPct: Number(fillPct.toFixed(1)) });
});

async function maybeRaiseHubAlert(hub, type, severity, message) {
  const existing = await one(
    `SELECT id FROM alerts WHERE type=$1 AND entity_type='local_hub' AND entity_id=$2 AND status='ACTIVE'`,
    [type, hub.id]
  );
  if (existing) return; // avoid duplicate spam alerts
  await query(
    `INSERT INTO alerts (type, severity, message, entity_type, entity_id) VALUES ($1,$2,$3,'local_hub',$4)`,
    [type, severity, message, hub.id]
  );
}

router.get('/', authRequired, async (req, res) => {
  let rows;
  if (req.user.role === 'CLEANER') {
    rows = await query(`SELECT * FROM collections WHERE cleaner_id = $1 ORDER BY collected_at DESC LIMIT 200`, [req.user.id]);
  } else if (req.user.role === 'LOCAL_HUB_MANAGER' && req.user.localHubId) {
    rows = await query(`SELECT * FROM collections WHERE local_hub_id = $1 ORDER BY collected_at DESC LIMIT 200`, [req.user.localHubId]);
  } else if (req.user.role === 'RESIDENT') {
    rows = await query(`SELECT * FROM collections WHERE resident_id = $1 ORDER BY collected_at DESC LIMIT 200`, [req.user.id]);
  } else {
    rows = await query(`SELECT * FROM collections ORDER BY collected_at DESC LIMIT 200`);
  }
  res.json({ collections: rows });
});

module.exports = router;
module.exports.maybeRaiseHubAlert = maybeRaiseHubAlert;
