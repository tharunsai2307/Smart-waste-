const express = require('express');
const { query } = require('../db');
const { authRequired, requireRole } = require('../middleware/auth');

const router = express.Router();

/**
 * Admin: the system's audit trail — every privileged action ever recorded
 * (staff created, passwords reset, accounts deleted/suspended, SLA breaches).
 * Optional filters: ?action=, ?entityId=, ?q= (search), ?limit= (default 100).
 */
router.get('/', authRequired, requireRole('ADMIN'), async (req, res) => {
  const { action, entityId, q } = req.query;
  const limit = Math.max(1, Math.min(parseInt(req.query.limit, 10) || 100, 500));

  const where = [];
  const params = [];
  if (action) {
    params.push(String(action));
    where.push(`a.action = $${params.length}`);
  }
  if (entityId && Number.isInteger(Number(entityId))) {
    params.push(Number(entityId));
    where.push(`a.entity_id = $${params.length}`);
  }
  if (q) {
    params.push(`%${String(q)}%`);
    where.push(`(u.name ILIKE $${params.length} OR a.action ILIKE $${params.length} OR CAST(a.detail AS TEXT) ILIKE $${params.length})`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const activity = await query(
    `SELECT a.id, a.action, a.entity_type, a.entity_id, a.detail, a.created_at,
            u.id AS actor_id, u.name AS actor_name, u.role AS actor_role
     FROM audit_log a
     LEFT JOIN users u ON u.id = a.actor_id
     ${whereSql}
     ORDER BY a.created_at DESC, a.id DESC
     LIMIT ${limit}`,
    params
  );

  const counts = await query(`SELECT action, COUNT(*)::int AS n FROM audit_log GROUP BY action ORDER BY n DESC, action ASC`);

  res.json({ activity, counts });
});

module.exports = router;
