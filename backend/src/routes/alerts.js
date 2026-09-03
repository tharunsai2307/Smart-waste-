const express = require('express');
const { query, one } = require('../db');
const { authRequired, requireRole } = require('../middleware/auth');

const router = express.Router();

/**
 * List alerts — scoped by role:
 *  - ADMIN / RECYCLING_MANAGER: all alerts
 *  - LOCAL_HUB_MANAGER: only alerts for their own hub + non-hub-specific alerts
 *  - CLEANER / DRIVER: only MISSED_PICKUP alerts relevant to their hub
 *  - RESIDENT: no access (403)
 */
router.get('/', authRequired, async (req, res) => {
  const status = req.query.status || 'ACTIVE';
  let rows;
  if (req.user.role === 'RESIDENT') {
    return res.status(403).json({ error: 'Residents cannot view alerts' });
  } else if (req.user.role === 'LOCAL_HUB_MANAGER' && req.user.localHubId) {
    rows = await query(
      `SELECT * FROM alerts WHERE status = $1 AND (entity_type != 'local_hub' OR entity_id = $2) ORDER BY created_at DESC`,
      [status, req.user.localHubId]
    );
  } else if (req.user.role === 'CLEANER') {
    // Cleaners only see missed-pickup and hub alerts for their own hub.
    rows = await query(
      `SELECT * FROM alerts WHERE status = $1
        AND (
          (type IN ('MISSED_PICKUP','HUB_WARNING','HUB_CRITICAL'))
        )
        ORDER BY created_at DESC LIMIT 100`,
      [status]
    );
  } else {
    rows = await query(`SELECT * FROM alerts WHERE status = $1 ORDER BY created_at DESC LIMIT 300`, [status]);
  }
  res.json({ alerts: rows });
});

/** Acknowledge an alert — staff only (admin, hub managers, recycling manager). */
router.patch('/:id/acknowledge', authRequired, requireRole('ADMIN', 'LOCAL_HUB_MANAGER', 'RECYCLING_MANAGER'), async (req, res) => {
  const alert = await one(
    `UPDATE alerts SET status='ACKNOWLEDGED', acknowledged_by=$1, resolved_at=now() WHERE id=$2 AND status='ACTIVE' RETURNING *`,
    [req.user.id, req.params.id]
  );
  if (!alert) return res.status(404).json({ error: 'Alert not found or not in ACTIVE state' });
  res.json({ alert });
});

/** Resolve an alert — staff only. */
router.patch('/:id/resolve', authRequired, requireRole('ADMIN', 'LOCAL_HUB_MANAGER', 'RECYCLING_MANAGER'), async (req, res) => {
  const alert = await one(
    `UPDATE alerts SET status='RESOLVED', resolved_at=now() WHERE id=$1 AND status IN ('ACTIVE','ACKNOWLEDGED') RETURNING *`,
    [req.params.id]
  );
  if (!alert) return res.status(404).json({ error: 'Alert not found or already resolved' });
  res.json({ alert });
});

module.exports = router;
