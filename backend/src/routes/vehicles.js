const express = require('express');
const { z } = require('zod');
const { query, one } = require('../db');
const { authRequired, requireRole } = require('../middleware/auth');
const { genCode, genQrPayload } = require('../utils/codes');

const router = express.Router();

const createVehicleSchema = z.object({
  plateNumber: z.string().min(1),
  vehicleType: z.enum(['MINI_TRUCK', 'COMPACTOR', 'TIPPER', 'E_RICKSHAW']).default('MINI_TRUCK'),
  capacityKg: z.number().positive(),
  homeRecyclingHubId: z.number().optional(),
});

router.post('/', authRequired, requireRole('ADMIN', 'RECYCLING_MANAGER'), async (req, res) => {
  const parsed = createVehicleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const p = parsed.data;
  const code = genCode('VEH');
  const qr = genQrPayload('VEHICLE', code);

  const vehicle = await one(
    `INSERT INTO vehicles (plate_number, vehicle_type, capacity_kg, home_recycling_hub_id, qr_code)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [p.plateNumber, p.vehicleType, p.capacityKg, p.homeRecyclingHubId || null, qr]
  );
  res.status(201).json({ vehicle });
});

router.get('/', authRequired, async (req, res) => {
  const rows = await query(`SELECT * FROM vehicles ORDER BY id`);
  res.json({ vehicles: rows });
});

router.get('/:id', authRequired, async (req, res) => {
  const vehicle = await one(`SELECT * FROM vehicles WHERE id = $1`, [req.params.id]);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
  res.json({ vehicle });
});

/** Update load capacity — viewable/updatable from each local hub per requirements. */
router.patch('/:id', authRequired, requireRole('ADMIN', 'RECYCLING_MANAGER', 'LOCAL_HUB_MANAGER'), async (req, res) => {
  const fields = [];
  const values = [];
  let idx = 1;
  if (req.body.capacityKg !== undefined) { fields.push(`capacity_kg = $${idx++}`); values.push(req.body.capacityKg); }
  if (req.body.status !== undefined) { fields.push(`status = $${idx++}`); values.push(req.body.status); }
  if (!fields.length) return res.status(400).json({ error: 'No updatable fields provided' });
  values.push(req.params.id);
  const vehicle = await one(`UPDATE vehicles SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, values);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
  res.json({ vehicle });
});

/**
 * Driver routes: "where they need to go" — derived from real assigned jobs,
 * not a static list. Includes active transfer (hub -> recycling leg) plus
 * any pending pickup-request stops if the driver also does last-mile runs.
 */
router.get('/routes/:driverId', authRequired, async (req, res) => {
  const driverId = Number(req.params.driverId);
  if (req.user.role === 'DRIVER' && req.user.id !== driverId) {
    return res.status(403).json({ error: 'Not your route' });
  }
  const activeTransfers = await query(
    `SELECT t.*, lh.name AS local_hub_name, lh.address AS local_hub_address, lh.latitude AS local_hub_lat, lh.longitude AS local_hub_lng,
            rh.name AS recycling_hub_name, rh.address AS recycling_hub_address, rh.latitude AS recycling_hub_lat, rh.longitude AS recycling_hub_lng
     FROM transfers t
     LEFT JOIN local_hubs lh ON lh.id = t.local_hub_id
     LEFT JOIN recycling_hubs rh ON rh.id = t.recycling_hub_id
     WHERE t.driver_id = $1 AND t.status NOT IN ('COMPLETED','CANCELLED')
     ORDER BY t.requested_at ASC`,
    [driverId]
  );

  const route = activeTransfers.map((t) => {
    let nextStop = null;
    if (['DRIVER_ASSIGNED'].includes(t.status)) nextStop = { label: 'Start job (scan vehicle QR)', lat: null, lng: null };
    else if (['ON_THE_JOB'].includes(t.status)) nextStop = { label: `Go to ${t.local_hub_name}`, lat: t.local_hub_lat, lng: t.local_hub_lng, address: t.local_hub_address };
    else if (['ARRIVED_AT_HUB'].includes(t.status)) nextStop = { label: 'Load waste, scan hub QR again', lat: t.local_hub_lat, lng: t.local_hub_lng };
    else if (['EN_ROUTE'].includes(t.status)) nextStop = { label: `Go to ${t.recycling_hub_name || 'assigned recycling hub'}`, lat: t.recycling_hub_lat, lng: t.recycling_hub_lng, address: t.recycling_hub_address };
    else if (['ARRIVED_AT_RECYCLING'].includes(t.status)) nextStop = { label: 'Hand off load, await weigh-in', lat: t.recycling_hub_lat, lng: t.recycling_hub_lng };
    return { transferId: t.id, status: t.status, nextStop };
  });

  res.json({ route });
});

module.exports = router;
