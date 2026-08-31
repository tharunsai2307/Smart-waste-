const express = require('express');
const { query, one } = require('../db');
const { authRequired, requireRole } = require('../middleware/auth');

const router = express.Router();

/** Admin: system-wide real-time overview — every number here is a live query, nothing mocked. */
router.get('/admin', authRequired, requireRole('ADMIN'), async (req, res) => {
  const [userCounts, hubs, recyclingHubs, transfersActive, pickupsPending, alertsActive, vehicles] = await Promise.all([
    query(`SELECT role, COUNT(*)::int AS count FROM users GROUP BY role`),
    query(`SELECT id, name, capacity_kg, current_load_kg, status FROM local_hubs ORDER BY (current_load_kg / NULLIF(capacity_kg,0)) DESC`),
    query(`SELECT id, name, daily_capacity_kg FROM recycling_hubs`),
    one(`SELECT COUNT(*)::int AS count FROM transfers WHERE status NOT IN ('COMPLETED','CANCELLED')`),
    one(`SELECT COUNT(*)::int AS count FROM pickup_requests WHERE status IN ('PENDING','ASSIGNED')`),
    one(`SELECT COUNT(*)::int AS count FROM alerts WHERE status = 'ACTIVE'`),
    query(`SELECT status, COUNT(*)::int AS count FROM vehicles GROUP BY status`),
  ]);

  res.json({
    userCounts,
    hubs,
    recyclingHubs,
    activeTransfers: transfersActive.count,
    pendingPickups: pickupsPending.count,
    activeAlerts: alertsActive.count,
    vehicles,
  });
});

/** Resident: personal impact dashboard. */
router.get('/resident', authRequired, requireRole('RESIDENT'), async (req, res) => {
  const profile = await one(`SELECT * FROM resident_profiles WHERE user_id = $1`, [req.user.id]);
  const recentCollections = await query(`SELECT * FROM collections WHERE resident_id = $1 ORDER BY collected_at DESC LIMIT 10`, [req.user.id]);
  const activeRequests = await query(`SELECT * FROM pickup_requests WHERE resident_id = $1 AND status IN ('PENDING','ASSIGNED') ORDER BY created_at DESC`, [req.user.id]);
  res.json({ profile, recentCollections, activeRequests });
});

/** Local hub manager: hub health + cleaner workload + pending transfers. */
router.get('/local-hub', authRequired, requireRole('ADMIN', 'LOCAL_HUB_MANAGER'), async (req, res) => {
  const hubId = req.query.hubId || req.user.localHubId;
  if (!hubId) return res.status(400).json({ error: 'hubId required' });
  const hub = await one(`SELECT * FROM local_hubs WHERE id = $1`, [hubId]);
  if (!hub) return res.status(404).json({ error: 'Hub not found' });
  const cleaners = await query(
    `SELECT u.id, u.name, u.status, COUNT(pr.id) FILTER (WHERE pr.status='ASSIGNED')::int AS active_jobs
     FROM users u LEFT JOIN pickup_requests pr ON pr.assigned_cleaner_id = u.id
     WHERE u.role='CLEANER' AND u.local_hub_id = $1 GROUP BY u.id`,
    [hubId]
  );
  const pendingRequests = await query(`SELECT * FROM pickup_requests WHERE local_hub_id = $1 AND status IN ('PENDING','ASSIGNED') ORDER BY priority_score DESC`, [hubId]);
  const transfers = await query(`SELECT * FROM transfers WHERE local_hub_id = $1 ORDER BY requested_at DESC LIMIT 20`, [hubId]);
  res.json({ hub, cleaners, pendingRequests, transfers, fillPct: Number(((hub.current_load_kg / hub.capacity_kg) * 100).toFixed(1)) });
});

/** Recycling manager: fleet status + inbound transfers + batch throughput. */
router.get('/recycling-hub', authRequired, requireRole('ADMIN', 'RECYCLING_MANAGER'), async (req, res) => {
  const hubId = req.query.hubId || req.user.recyclingHubId;
  const inbound = await query(
    `SELECT * FROM transfers WHERE (recycling_hub_id = $1 OR recycling_hub_id IS NULL) AND status NOT IN ('COMPLETED','CANCELLED') ORDER BY requested_at ASC`,
    [hubId || null]
  );
  const availableDrivers = await query(
    `SELECT u.id, u.name FROM users u JOIN driver_profiles d ON d.user_id=u.id WHERE d.availability='AVAILABLE' AND u.status='ACTIVE'`
  );
  const idleVehicles = await query(`SELECT * FROM vehicles WHERE status = 'IDLE'`);
  const recentBatches = hubId ? await query(`SELECT * FROM recycling_batches WHERE recycling_hub_id = $1 ORDER BY created_at DESC LIMIT 10`, [hubId]) : [];
  res.json({ inbound, availableDrivers, idleVehicles, recentBatches });
});

module.exports = router;
