const express = require('express');
const { z } = require('zod');
const { query, one, getDb } = require('../db');
const { authRequired, requireRole } = require('../middleware/auth');
const { computeEcoPoints } = require('../services/ecoPoints');

const router = express.Router();

const WASTE_TYPES = ['PLASTIC', 'PAPER', 'METAL', 'E_WASTE', 'BIODEGRADABLE', 'HAZARDOUS', 'MIXED'];

/**
 * Cleaner logs a completed collection at a resident's address, dropped at
 * their local hub. This is the single source of truth for "real" collected
 * weight — no estimates get treated as facts anywhere downstream.
 *
 * The logged weight updates the cleaner's local hub ENTIRELY in one atomic
 * transaction: collection row + hub current_load_kg + resident eco points +
 * ledger entry + pickup close-out all land together or not at all.
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
  if (!cleaner) return res.status(404).json({ error: 'Cleaner account not found' });
  if (!cleaner.local_hub_id) {
    return res.status(400).json({ error: 'You are not assigned to a local hub. Ask an admin to assign you to one, then log your collections.' });
  }
  const hub = await one(`SELECT * FROM local_hubs WHERE id = $1`, [cleaner.local_hub_id]);
  if (!hub) return res.status(400).json({ error: 'Your assigned local hub no longer exists. Contact an admin.' });

  // Resolve and validate the linked pickup request (if any). The pickup's
  // resident is the authoritative resident for this collection — the cleaner
  // never has to (and cannot) pick one manually.
  let pickup = null;
  let residentId = p.residentId || null;
  if (p.pickupRequestId) {
    pickup = await one(`SELECT * FROM pickup_requests WHERE id = $1`, [p.pickupRequestId]);
    if (!pickup) return res.status(404).json({ error: 'Pickup request not found' });
    if (pickup.assigned_cleaner_id && pickup.assigned_cleaner_id !== req.user.id) {
      return res.status(403).json({ error: 'This pickup request is assigned to another cleaner' });
    }
    if (!['PENDING', 'ASSIGNED'].includes(pickup.status)) {
      return res.status(409).json({ error: `Pickup request #${pickup.id} is already ${pickup.status.toLowerCase()} and cannot be collected again` });
    }
    residentId = pickup.resident_id;
  }

  const points = residentId ? computeEcoPoints(p.weightKg, p.wasteType) : 0;

  const db = await getDb();
  const { collection, hub: updatedHub } = await db.transaction(async (tx) => {
    const inserted = await tx.query(
      `INSERT INTO collections (pickup_request_id, cleaner_id, resident_id, local_hub_id, waste_type, weight_kg, eco_points_awarded)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [p.pickupRequestId || null, req.user.id, residentId, cleaner.local_hub_id, p.wasteType, p.weightKg, points]
    );
    const collection = inserted.rows[0];

    // Update hub fill level with the REAL logged weight — same transaction.
    const hubRes = await tx.query(
      `UPDATE local_hubs SET current_load_kg = current_load_kg + $1 WHERE id = $2 RETURNING *`,
      [p.weightKg, cleaner.local_hub_id]
    );

    // Award eco points to the resident if identified, with a ledger trail.
    if (residentId) {
      await tx.query(
        `UPDATE resident_profiles SET eco_points = eco_points + $1, total_kg_recycled = total_kg_recycled + $2 WHERE user_id = $3`,
        [points, p.weightKg, residentId]
      );
      await tx.query(
        `INSERT INTO eco_points_ledger (resident_id, points, reason, ref_type, ref_id) VALUES ($1,$2,'Waste collected','collection',$3)`,
        [residentId, points, collection.id]
      );
    }

    // Mark the pickup request collected with the real weight, attributed to
    // this cleaner (covers a PENDING request collected without assignment).
    if (p.pickupRequestId) {
      await tx.query(
        `UPDATE pickup_requests SET status='COLLECTED', collected_at=now(), actual_kg=$1, assigned_cleaner_id=COALESCE(assigned_cleaner_id,$2) WHERE id=$3`,
        [p.weightKg, req.user.id, p.pickupRequestId]
      );
    }

    return { collection, hub: hubRes.rows[0] };
  });

  // Real-world hub capacity alerting (advisory — never blocks the write).
  const fillPct = (updatedHub.current_load_kg / (updatedHub.capacity_kg || 1)) * 100;
  if (fillPct >= updatedHub.critical_pct) {
    await maybeRaiseHubAlert(updatedHub, 'HUB_CRITICAL', 'CRITICAL', `${updatedHub.name} is at ${fillPct.toFixed(0)}% capacity — dispatch a truck now.`);
  } else if (fillPct >= updatedHub.warning_pct) {
    await maybeRaiseHubAlert(updatedHub, 'HUB_WARNING', 'MEDIUM', `${updatedHub.name} is at ${fillPct.toFixed(0)}% capacity — plan a transfer soon.`);
  }

  res.status(201).json({ collection, hub: updatedHub, fillPct: Number(fillPct.toFixed(1)) });
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
  const baseSelect = `
    SELECT c.*, h.name AS hub_name, r.name AS resident_name
    FROM collections c
    LEFT JOIN local_hubs h ON h.id = c.local_hub_id
    LEFT JOIN users r ON r.id = c.resident_id`;
  let rows;
  if (req.user.role === 'CLEANER') {
    rows = await query(`${baseSelect} WHERE c.cleaner_id = $1 ORDER BY c.collected_at DESC LIMIT 200`, [req.user.id]);
  } else if (req.user.role === 'LOCAL_HUB_MANAGER' && req.user.localHubId) {
    rows = await query(`${baseSelect} WHERE c.local_hub_id = $1 ORDER BY c.collected_at DESC LIMIT 200`, [req.user.localHubId]);
  } else if (req.user.role === 'RESIDENT') {
    rows = await query(`${baseSelect} WHERE c.resident_id = $1 ORDER BY c.collected_at DESC LIMIT 200`, [req.user.id]);
  } else {
    rows = await query(`${baseSelect} ORDER BY c.collected_at DESC LIMIT 200`);
  }
  res.json({ collections: rows });
});

module.exports = router;
module.exports.maybeRaiseHubAlert = maybeRaiseHubAlert;
