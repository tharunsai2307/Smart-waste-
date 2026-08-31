const express = require('express');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const { query, one } = require('../db');
const { authRequired, requireRole } = require('../middleware/auth');

const router = express.Router();

const STAFF_ROLES = ['ADMIN', 'LOCAL_HUB_MANAGER', 'CLEANER', 'RECYCLING_MANAGER', 'DRIVER'];

/**
 * Admin-exclusive: create a staff account and issue initial credentials.
 * The generated/given password must be changed on first login.
 */
const createStaffSchema = z.object({
  role: z.enum(STAFF_ROLES),
  name: z.string().min(1),
  username: z.string().min(3),
  password: z.string().min(6),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  localHubId: z.number().optional(),
  recyclingHubId: z.number().optional(),
  licenseNumber: z.string().optional(),
  licenseExpiry: z.string().optional(),
});

router.post('/', authRequired, requireRole('ADMIN'), async (req, res) => {
  const parsed = createStaffSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const p = parsed.data;

  const existing = await one(`SELECT id FROM users WHERE username = $1`, [p.username]);
  if (existing) return res.status(409).json({ error: 'Username already taken' });

  const hash = await bcrypt.hash(p.password, 10);
  const user = await one(
    `INSERT INTO users (role, name, username, password_hash, email, phone, local_hub_id, recycling_hub_id, created_by, must_change_password)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, TRUE) RETURNING *`,
    [p.role, p.name, p.username, hash, p.email || null, p.phone || null, p.localHubId || null, p.recyclingHubId || null, req.user.id]
  );

  if (p.role === 'DRIVER') {
    await query(
      `INSERT INTO driver_profiles (user_id, license_number, license_expiry) VALUES ($1,$2,$3)`,
      [user.id, p.licenseNumber || null, p.licenseExpiry || null]
    );
  }

  await query(`INSERT INTO audit_log (actor_id, action, entity_type, entity_id, detail) VALUES ($1,'CREATE_STAFF','user',$2,$3)`, [
    req.user.id,
    user.id,
    JSON.stringify({ role: p.role, username: p.username }),
  ]);

  const { password_hash, ...safe } = user;
  res.status(201).json({ user: safe });
});

/** Admin: full visibility over every user in the system. */
router.get('/', authRequired, requireRole('ADMIN'), async (req, res) => {
  const { role } = req.query;
  const rows = role
    ? await query(`SELECT id, role, name, username, email, phone, status, local_hub_id, recycling_hub_id, created_at FROM users WHERE role = $1 ORDER BY id`, [role])
    : await query(`SELECT id, role, name, username, email, phone, status, local_hub_id, recycling_hub_id, created_at FROM users ORDER BY id`);
  res.json({ users: rows });
});

/** Local hub manager: list cleaners assigned to their hub. */
router.get('/hub/:hubId/cleaners', authRequired, requireRole('ADMIN', 'LOCAL_HUB_MANAGER'), async (req, res) => {
  const hubId = Number(req.params.hubId);
  if (req.user.role === 'LOCAL_HUB_MANAGER' && req.user.localHubId !== hubId) {
    return res.status(403).json({ error: 'Not your hub' });
  }
  const rows = await query(
    `SELECT id, name, username, phone, status FROM users WHERE role = 'CLEANER' AND local_hub_id = $1 ORDER BY name`,
    [hubId]
  );
  res.json({ cleaners: rows });
});

/** Recycling manager / admin: list drivers, with profile + current vehicle + availability. */
router.get('/drivers', authRequired, requireRole('ADMIN', 'RECYCLING_MANAGER'), async (req, res) => {
  const rows = await query(
    `SELECT u.id, u.name, u.username, u.phone, u.status, u.recycling_hub_id,
            d.license_number, d.employment_status, d.availability, d.current_vehicle_id,
            d.total_trips, d.total_kg_hauled,
            v.plate_number, v.vehicle_type, v.capacity_kg
     FROM users u
     JOIN driver_profiles d ON d.user_id = u.id
     LEFT JOIN vehicles v ON v.id = d.current_vehicle_id
     WHERE u.role = 'DRIVER'
     ORDER BY u.name`
  );
  res.json({ drivers: rows });
});

/** Admin: suspend / reactivate any account. */
router.patch('/:id/status', authRequired, requireRole('ADMIN'), async (req, res) => {
  const { status } = req.body;
  if (!['ACTIVE', 'SUSPENDED'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  const user = await one(`UPDATE users SET status=$1, updated_at=now() WHERE id=$2 RETURNING id, role, name, status`, [status, req.params.id]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  await query(`INSERT INTO audit_log (actor_id, action, entity_type, entity_id, detail) VALUES ($1,'SET_USER_STATUS','user',$2,$3)`, [
    req.user.id, user.id, JSON.stringify({ status }),
  ]);
  res.json({ user });
});

/** Admin: reset a staff member's password (issues a new temp password). */
router.post('/:id/reset-password', authRequired, requireRole('ADMIN'), async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'newPassword must be at least 6 characters' });
  const hash = await bcrypt.hash(newPassword, 10);
  const user = await one(
    `UPDATE users SET password_hash=$1, must_change_password=TRUE, updated_at=now() WHERE id=$2 AND role != 'RESIDENT' RETURNING id, name, username`,
    [hash, req.params.id]
  );
  if (!user) return res.status(404).json({ error: 'Staff user not found' });
  res.json({ success: true, user });
});

module.exports = router;
