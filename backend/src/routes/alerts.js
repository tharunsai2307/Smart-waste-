const express = require('express');
const { query, one } = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

router.get('/', authRequired, async (req, res) => {
  const status = req.query.status || 'ACTIVE';
  let rows;
  if (req.user.role === 'LOCAL_HUB_MANAGER' && req.user.localHubId) {
    rows = await query(
      `SELECT * FROM alerts WHERE status = $1 AND (entity_type != 'local_hub' OR entity_id = $2) ORDER BY created_at DESC`,
      [status, req.user.localHubId]
    );
  } else {
    rows = await query(`SELECT * FROM alerts WHERE status = $1 ORDER BY created_at DESC LIMIT 300`, [status]);
  }
  res.json({ alerts: rows });
});

router.patch('/:id/acknowledge', authRequired, async (req, res) => {
  const alert = await one(
    `UPDATE alerts SET status='ACKNOWLEDGED', acknowledged_by=$1 WHERE id=$2 RETURNING *`,
    [req.user.id, req.params.id]
  );
  if (!alert) return res.status(404).json({ error: 'Alert not found' });
  res.json({ alert });
});

router.patch('/:id/resolve', authRequired, async (req, res) => {
  const alert = await one(
    `UPDATE alerts SET status='RESOLVED', resolved_at=now() WHERE id=$1 RETURNING *`,
    [req.params.id]
  );
  if (!alert) return res.status(404).json({ error: 'Alert not found' });
  res.json({ alert });
});

module.exports = router;
