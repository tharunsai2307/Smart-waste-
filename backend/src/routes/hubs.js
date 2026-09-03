const express = require('express');
const { z } = require('zod');
const { query, one } = require('../db');
const { authRequired, requireRole } = require('../middleware/auth');
const { genCode, genQrPayload } = require('../utils/codes');

const router = express.Router();

// ═══════════════════════ LOCAL HUBS ═══════════════════════

const createLocalHubSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  area: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  capacityKg: z.number().positive().default(1000),
  managerId: z.number().optional(),
});

router.post('/local', authRequired, requireRole('ADMIN'), async (req, res) => {
  const parsed = createLocalHubSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const p = parsed.data;
  const code = genCode('LHUB');
  const qr = genQrPayload('LOCAL_HUB', code);

  const hub = await one(
    `INSERT INTO local_hubs (code, name, address, area, latitude, longitude, capacity_kg, manager_id, qr_code)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [code, p.name, p.address || null, p.area || null, p.latitude || null, p.longitude || null, p.capacityKg, p.managerId || null, qr]
  );

  if (p.managerId) {
    // Sync both directions: the hub points to the manager, and the manager's
    // local_hub_id points back to this hub.
    await query(`UPDATE users SET local_hub_id = $1 WHERE id = $2 AND role = 'LOCAL_HUB_MANAGER'`, [hub.id, p.managerId]);
  }
  res.status(201).json({ hub });
});

router.get('/local', authRequired, async (req, res) => {
  // Admin sees all; hub manager/cleaner sees their own hub only.
  let rows;
  if (req.user.role === 'ADMIN' || req.user.role === 'RECYCLING_MANAGER') {
    rows = await query(
      `SELECT h.*, u.name AS manager_name,
        (SELECT COUNT(*) FROM users c WHERE c.local_hub_id = h.id AND c.role = 'CLEANER') AS cleaner_count
       FROM local_hubs h LEFT JOIN users u ON u.id = h.manager_id ORDER BY h.id`
    );
  } else if (req.user.localHubId) {
    rows = await query(
      `SELECT h.*, u.name AS manager_name,
        (SELECT COUNT(*) FROM users c WHERE c.local_hub_id = h.id AND c.role = 'CLEANER') AS cleaner_count
       FROM local_hubs h LEFT JOIN users u ON u.id = h.manager_id WHERE h.id = $1`,
      [req.user.localHubId]
    );
  } else {
    rows = await query(`SELECT id, code, name, area FROM local_hubs WHERE status='ACTIVE' ORDER BY name`);
  }
  res.json({ hubs: rows });
});

router.get('/local/:id', authRequired, async (req, res) => {
  const hub = await one(
    `SELECT h.*, u.name AS manager_name FROM local_hubs h LEFT JOIN users u ON u.id = h.manager_id WHERE h.id = $1`,
    [req.params.id]
  );
  if (!hub) return res.status(404).json({ error: 'Hub not found' });
  res.json({ hub });
});

/** Local hub manager updates capacity / assigns a manager (admin only for manager reassignment). */
const VEHICLE_STATUSES = ['IDLE', 'ASSIGNED', 'EN_ROUTE', 'MAINTENANCE', 'OUT_OF_SERVICE'];

router.patch('/local/:id', authRequired, requireRole('ADMIN', 'LOCAL_HUB_MANAGER'), async (req, res) => {
  const hubId = Number(req.params.id);
  if (req.user.role === 'LOCAL_HUB_MANAGER' && req.user.localHubId !== hubId) {
    return res.status(403).json({ error: 'Not your hub' });
  }
  const fields = [];
  const values = [];
  let idx = 1;
  if (req.body.capacityKg !== undefined) {
    const v = Number(req.body.capacityKg);
    if (!v || v <= 0) return res.status(400).json({ error: 'capacityKg must be positive' });
    fields.push(`capacity_kg = $${idx++}`); values.push(v);
  }
  if (req.body.warningPct !== undefined) {
    const v = Number(req.body.warningPct);
    if (v < 0 || v > 100) return res.status(400).json({ error: 'warningPct must be 0-100' });
    fields.push(`warning_pct = $${idx++}`); values.push(v);
  }
  if (req.body.criticalPct !== undefined) {
    const v = Number(req.body.criticalPct);
    if (v < 0 || v > 100) return res.status(400).json({ error: 'criticalPct must be 0-100' });
    fields.push(`critical_pct = $${idx++}`); values.push(v);
  }
  if (req.user.role === 'ADMIN' && req.body.managerId !== undefined) { fields.push(`manager_id = $${idx++}`); values.push(req.body.managerId); }
  if (!fields.length) return res.status(400).json({ error: 'No updatable fields provided' });
  values.push(hubId);
  const hub = await one(`UPDATE local_hubs SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, values);
  if (!hub) return res.status(404).json({ error: 'Hub not found' });
  res.json({ hub });
});

// ═══════════════════════ RECYCLING HUBS ═══════════════════════

const createRecyclingHubSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  dailyCapacityKg: z.number().positive().default(5000),
  managerId: z.number().optional(),
});

router.post('/recycling', authRequired, requireRole('ADMIN'), async (req, res) => {
  const parsed = createRecyclingHubSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const p = parsed.data;
  const code = genCode('RHUB');
  const qr = genQrPayload('RECYCLING_HUB', code);

  const hub = await one(
    `INSERT INTO recycling_hubs (code, name, address, latitude, longitude, daily_capacity_kg, manager_id, qr_code)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [code, p.name, p.address || null, p.latitude || null, p.longitude || null, p.dailyCapacityKg, p.managerId || null, qr]
  );
  if (p.managerId) {
    // Sync both directions for recycling hub manager assignment.
    await query(`UPDATE users SET recycling_hub_id = $1 WHERE id = $2 AND role = 'RECYCLING_MANAGER'`, [hub.id, p.managerId]);
  }
  res.status(201).json({ hub });
});

router.get('/recycling', authRequired, async (req, res) => {
  const rows = await query(
    `SELECT h.*, u.name AS manager_name FROM recycling_hubs h LEFT JOIN users u ON u.id = h.manager_id ORDER BY h.id`
  );
  res.json({ hubs: rows });
});

router.get('/recycling/:id', authRequired, async (req, res) => {
  const hub = await one(
    `SELECT h.*, u.name AS manager_name FROM recycling_hubs h LEFT JOIN users u ON u.id = h.manager_id WHERE h.id = $1`,
    [req.params.id]
  );
  if (!hub) return res.status(404).json({ error: 'Hub not found' });
  res.json({ hub });
});

module.exports = router;
