const express = require('express');
const { z } = require('zod');
const { query, one } = require('../db');
const { authRequired, requireRole } = require('../middleware/auth');

const router = express.Router();

/**
 * TRANSFER LIFECYCLE (local hub -> recycling hub), fully QR-gated:
 *
 *  REQUESTED         local hub manager (or admin, or auto on hub-critical alert) requests a truck
 *  DRIVER_ASSIGNED   recycling manager/admin assigns a driver + vehicle
 *  ON_THE_JOB        driver scans their "start job" QR (personal/vehicle QR) -> marked active
 *  ARRIVED_AT_HUB    driver scans the QR posted at the local hub gate
 *  LOADED            driver scans the second hub QR (loading complete) -> prompted for loaded_weight_kg
 *  EN_ROUTE          system flips automatically after LOADED (driver departing)
 *  ARRIVED_AT_RECYCLING  driver scans the QR at the recycling hub gate
 *  RECEIVED          recycling staff confirms received_weight_kg (manual entry, reconciled vs loaded)
 *  COMPLETED         batch created, hub load reduced, driver/vehicle freed up
 */

// 1. Local hub manager (or admin) requests a transfer when hub is nearing/at capacity.
const requestTransferSchema = z.object({
  localHubId: z.number(),
  recyclingHubId: z.number().optional(),
});

router.post('/request', authRequired, requireRole('ADMIN', 'LOCAL_HUB_MANAGER'), async (req, res) => {
  const parsed = requestTransferSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const { localHubId, recyclingHubId } = parsed.data;

  if (req.user.role === 'LOCAL_HUB_MANAGER' && req.user.localHubId !== localHubId) {
    return res.status(403).json({ error: 'Not your hub' });
  }
  const hub = await one(`SELECT * FROM local_hubs WHERE id = $1`, [localHubId]);
  if (!hub) return res.status(404).json({ error: 'Local hub not found' });

  const transfer = await one(
    `INSERT INTO transfers (local_hub_id, recycling_hub_id, requested_by, planned_weight_kg)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [localHubId, recyclingHubId || null, req.user.id, hub.current_load_kg]
  );
  await logEvent(transfer.id, 'REQUESTED', req.user.id, { fillPct: ((hub.current_load_kg / hub.capacity_kg) * 100).toFixed(1) });
  res.status(201).json({ transfer });
});

// 2. Recycling manager/admin assigns a driver + vehicle.
const assignSchema = z.object({
  driverId: z.number(),
  vehicleId: z.number(),
  recyclingHubId: z.number().optional(),
});

router.patch('/:id/assign', authRequired, requireRole('ADMIN', 'RECYCLING_MANAGER'), async (req, res) => {
  const parsed = assignSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const { driverId, vehicleId, recyclingHubId } = parsed.data;

  const driver = await one(`SELECT d.*, u.name FROM driver_profiles d JOIN users u ON u.id=d.user_id WHERE d.user_id=$1`, [driverId]);
  if (!driver) return res.status(404).json({ error: 'Driver not found' });
  if (driver.availability !== 'AVAILABLE') return res.status(409).json({ error: `Driver is currently ${driver.availability}` });

  const vehicle = await one(`SELECT * FROM vehicles WHERE id=$1`, [vehicleId]);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
  if (vehicle.status !== 'IDLE') return res.status(409).json({ error: `Vehicle is currently ${vehicle.status}` });

  const transfer = await one(
    `UPDATE transfers SET driver_id=$1, vehicle_id=$2, assigned_by=$3, recycling_hub_id=COALESCE($4, recycling_hub_id),
       status='DRIVER_ASSIGNED', assigned_at=now() WHERE id=$5 AND status='REQUESTED' RETURNING *`,
    [driverId, vehicleId, req.user.id, recyclingHubId || null, req.params.id]
  );
  if (!transfer) return res.status(409).json({ error: 'Transfer not in a state that can be assigned' });

  await query(`UPDATE driver_profiles SET availability='ON_JOB', current_vehicle_id=$1 WHERE user_id=$2`, [vehicleId, driverId]);
  await query(`UPDATE vehicles SET status='ASSIGNED' WHERE id=$1`, [vehicleId]);
  await logEvent(transfer.id, 'DRIVER_ASSIGNED', req.user.id, { driverId, vehicleId });

  res.json({ transfer });
});

// ── QR SCAN ENDPOINTS ──────────────────────────────────────────────

/** 3. Driver scans their job-start QR (their own driver QR / vehicle QR) to go active. */
router.post('/:id/scan/start-job', authRequired, requireRole('DRIVER'), async (req, res) => {
  const { qrPayload } = req.body;
  const transfer = await one(`SELECT * FROM transfers WHERE id=$1`, [req.params.id]);
  if (!transfer) return res.status(404).json({ error: 'Transfer not found' });
  if (transfer.driver_id !== req.user.id) return res.status(403).json({ error: 'This job is not assigned to you' });
  if (transfer.status !== 'DRIVER_ASSIGNED') return res.status(409).json({ error: `Cannot start job from status ${transfer.status}` });

  const vehicle = await one(`SELECT * FROM vehicles WHERE id=$1`, [transfer.vehicle_id]);
  if (!qrPayload || qrPayload !== vehicle.qr_code) {
    return res.status(400).json({ error: 'QR code does not match your assigned vehicle. Scan the correct code.' });
  }

  const updated = await one(`UPDATE transfers SET status='ON_THE_JOB', on_job_at=now() WHERE id=$1 RETURNING *`, [transfer.id]);
  await query(`UPDATE vehicles SET status='EN_ROUTE' WHERE id=$1`, [vehicle.id]);
  await logEvent(transfer.id, 'DRIVER_ON_JOB', req.user.id, { qrPayload });
  res.json({ transfer: updated });
});

/** 4. Driver scans QR posted at the local hub gate on arrival. */
router.post('/:id/scan/arrive-hub', authRequired, requireRole('DRIVER'), async (req, res) => {
  const { qrPayload } = req.body;
  const transfer = await one(`SELECT * FROM transfers WHERE id=$1`, [req.params.id]);
  if (!transfer) return res.status(404).json({ error: 'Transfer not found' });
  if (transfer.driver_id !== req.user.id) return res.status(403).json({ error: 'This job is not assigned to you' });
  if (transfer.status !== 'ON_THE_JOB') return res.status(409).json({ error: `Cannot arrive-at-hub from status ${transfer.status}` });

  const hub = await one(`SELECT * FROM local_hubs WHERE id=$1`, [transfer.local_hub_id]);
  if (!qrPayload || qrPayload !== hub.qr_code) {
    return res.status(400).json({ error: 'QR code does not match this local hub.' });
  }

  const updated = await one(`UPDATE transfers SET status='ARRIVED_AT_HUB', arrived_hub_at=now() WHERE id=$1 RETURNING *`, [transfer.id]);
  await logEvent(transfer.id, 'ARRIVED_AT_HUB', req.user.id, { qrPayload });
  res.json({ transfer: updated });
});

/** 5. Driver scans the second hub QR after loading, then enters the loaded weight. */
const loadedSchema = z.object({ qrPayload: z.string(), loadedWeightKg: z.number().positive() });

router.post('/:id/scan/loaded', authRequired, requireRole('DRIVER'), async (req, res) => {
  const parsed = loadedSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'qrPayload and loadedWeightKg (>0) are required' });
  const { qrPayload, loadedWeightKg } = parsed.data;

  const transfer = await one(`SELECT * FROM transfers WHERE id=$1`, [req.params.id]);
  if (!transfer) return res.status(404).json({ error: 'Transfer not found' });
  if (transfer.driver_id !== req.user.id) return res.status(403).json({ error: 'This job is not assigned to you' });
  if (transfer.status !== 'ARRIVED_AT_HUB') return res.status(409).json({ error: `Cannot confirm load from status ${transfer.status}` });

  const hub = await one(`SELECT * FROM local_hubs WHERE id=$1`, [transfer.local_hub_id]);
  if (!qrPayload || qrPayload !== hub.qr_code) {
    return res.status(400).json({ error: 'QR code does not match this local hub.' });
  }

  const vehicle = await one(`SELECT * FROM vehicles WHERE id=$1`, [transfer.vehicle_id]);
  if (loadedWeightKg > vehicle.capacity_kg) {
    return res.status(400).json({ error: `Loaded weight (${loadedWeightKg}kg) exceeds vehicle capacity (${vehicle.capacity_kg}kg)` });
  }

  const updated = await one(
    `UPDATE transfers SET status='EN_ROUTE', loaded_weight_kg=$1, loaded_at=now(), en_route_at=now() WHERE id=$2 RETURNING *`,
    [loadedWeightKg, transfer.id]
  );

  // Reduce the local hub's fill level by the REAL amount just picked up (never below 0).
  await query(`UPDATE local_hubs SET current_load_kg = GREATEST(0, current_load_kg - $1) WHERE id = $2`, [loadedWeightKg, hub.id]);
  await query(`UPDATE vehicles SET current_load_kg = $1 WHERE id = $2`, [loadedWeightKg, vehicle.id]);

  // Auto-resolve hub capacity alerts now that it's been emptied.
  await query(`UPDATE alerts SET status='RESOLVED', resolved_at=now() WHERE entity_type='local_hub' AND entity_id=$1 AND status='ACTIVE'`, [hub.id]);

  await logEvent(transfer.id, 'LOADED', req.user.id, { loadedWeightKg, qrPayload });
  res.json({ transfer: updated });
});

/** 6. Driver scans QR at the recycling hub gate on arrival. */
router.post('/:id/scan/arrive-recycling', authRequired, requireRole('DRIVER'), async (req, res) => {
  const { qrPayload } = req.body;
  const transfer = await one(`SELECT * FROM transfers WHERE id=$1`, [req.params.id]);
  if (!transfer) return res.status(404).json({ error: 'Transfer not found' });
  if (transfer.driver_id !== req.user.id) return res.status(403).json({ error: 'This job is not assigned to you' });
  if (transfer.status !== 'EN_ROUTE') return res.status(409).json({ error: `Cannot arrive-at-recycling from status ${transfer.status}` });

  const rhub = await one(`SELECT * FROM recycling_hubs WHERE id=$1`, [transfer.recycling_hub_id]);
  if (!rhub) return res.status(400).json({ error: 'No recycling hub set on this transfer' });
  if (!qrPayload || qrPayload !== rhub.qr_code) {
    return res.status(400).json({ error: 'QR code does not match this recycling hub.' });
  }

  const updated = await one(`UPDATE transfers SET status='ARRIVED_AT_RECYCLING', arrived_recycling_at=now() WHERE id=$1 RETURNING *`, [transfer.id]);
  await logEvent(transfer.id, 'ARRIVED_AT_RECYCLING', req.user.id, { qrPayload });
  res.json({ transfer: updated });
});

/** 7. Recycling staff confirms received weight (manual entry — no IoT scale assumed), completing the job. */
const receiveSchema = z.object({ receivedWeightKg: z.number().positive() });

router.post('/:id/receive', authRequired, requireRole('ADMIN', 'RECYCLING_MANAGER'), async (req, res) => {
  const parsed = receiveSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'receivedWeightKg (>0) is required' });
  const { receivedWeightKg } = parsed.data;

  const transfer = await one(`SELECT * FROM transfers WHERE id=$1`, [req.params.id]);
  if (!transfer) return res.status(404).json({ error: 'Transfer not found' });
  if (transfer.status !== 'ARRIVED_AT_RECYCLING') return res.status(409).json({ error: `Cannot receive from status ${transfer.status}` });

  const variance = transfer.loaded_weight_kg
    ? ((receivedWeightKg - transfer.loaded_weight_kg) / transfer.loaded_weight_kg) * 100
    : null;

  const updated = await one(
    `UPDATE transfers SET status='COMPLETED', received_weight_kg=$1, variance_pct=$2, completed_at=now() WHERE id=$3 RETURNING *`,
    [receivedWeightKg, variance, transfer.id]
  );

  // Free the driver + vehicle, credit their stats with REAL hauled weight.
  await query(`UPDATE driver_profiles SET availability='AVAILABLE', total_trips = total_trips + 1, total_kg_hauled = total_kg_hauled + $1 WHERE user_id = $2`, [receivedWeightKg, transfer.driver_id]);
  await query(`UPDATE vehicles SET status='IDLE', current_load_kg = 0, total_trips = total_trips + 1, total_kg_hauled = total_kg_hauled + $1 WHERE id = $2`, [receivedWeightKg, transfer.vehicle_id]);

  if (variance !== null && Math.abs(variance) > 10) {
    await query(
      `INSERT INTO alerts (type, severity, message, entity_type, entity_id) VALUES ('WEIGHT_VARIANCE','MEDIUM',$1,'transfer',$2)`,
      [`Transfer #${transfer.id}: loaded ${transfer.loaded_weight_kg}kg vs received ${receivedWeightKg}kg (${variance.toFixed(1)}% variance).`, transfer.id]
    );
  }

  await logEvent(transfer.id, 'RECEIVED_COMPLETED', req.user.id, { receivedWeightKg, variance });
  res.json({ transfer: updated });
});

router.get('/', authRequired, async (req, res) => {
  let rows;
  if (req.user.role === 'DRIVER') {
    rows = await query(`SELECT * FROM transfers WHERE driver_id = $1 ORDER BY requested_at DESC`, [req.user.id]);
  } else if (req.user.role === 'LOCAL_HUB_MANAGER' && req.user.localHubId) {
    rows = await query(`SELECT * FROM transfers WHERE local_hub_id = $1 ORDER BY requested_at DESC`, [req.user.localHubId]);
  } else if (req.user.role === 'RECYCLING_MANAGER' && req.user.recyclingHubId) {
    rows = await query(`SELECT * FROM transfers WHERE recycling_hub_id = $1 OR recycling_hub_id IS NULL ORDER BY requested_at DESC`, [req.user.recyclingHubId]);
  } else {
    rows = await query(`SELECT * FROM transfers ORDER BY requested_at DESC LIMIT 300`);
  }
  res.json({ transfers: rows });
});

/** Full visibility: who is collecting from whom, current state, timeline. */
router.get('/:id', authRequired, async (req, res) => {
  const transfer = await one(
    `SELECT t.*, lh.name AS local_hub_name, rh.name AS recycling_hub_name,
            du.name AS driver_name, v.plate_number
     FROM transfers t
     LEFT JOIN local_hubs lh ON lh.id = t.local_hub_id
     LEFT JOIN recycling_hubs rh ON rh.id = t.recycling_hub_id
     LEFT JOIN users du ON du.id = t.driver_id
     LEFT JOIN vehicles v ON v.id = t.vehicle_id
     WHERE t.id = $1`,
    [req.params.id]
  );
  if (!transfer) return res.status(404).json({ error: 'Transfer not found' });
  const events = await query(`SELECT * FROM transfer_events WHERE transfer_id = $1 ORDER BY created_at ASC`, [req.params.id]);
  res.json({ transfer, events });
});

async function logEvent(transferId, eventType, actorId, detail) {
  await query(`INSERT INTO transfer_events (transfer_id, event_type, actor_id, detail) VALUES ($1,$2,$3,$4)`, [transferId, eventType, actorId, JSON.stringify(detail || {})]);
}

module.exports = router;
