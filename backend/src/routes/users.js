const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { z } = require('zod');
const { query, one, getDb } = require('../db');
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

  // A cleaner without a home hub can never log collections — enforce the
  // assignment at creation so the field workflow cannot break downstream.
  if (p.role === 'CLEANER' && !p.localHubId) {
    return res.status(400).json({ error: 'Cleaners must be assigned to a local hub' });
  }

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
    JSON.stringify({ role: p.role, username: p.username, name: p.name }),
  ]);

  const { password_hash, ...safe } = user;
  res.status(201).json({ user: safe });
});

/** Admin: full visibility over every user in the system. */
router.get('/', authRequired, requireRole('ADMIN'), async (req, res) => {
  const { role } = req.query;
  const rows = role
    ? await query(`SELECT id, role, name, username, email, phone, status, local_hub_id, recycling_hub_id, must_change_password, failed_attempts, created_at FROM users WHERE role = $1 ORDER BY id`, [role])
    : await query(`SELECT id, role, name, username, email, phone, status, local_hub_id, recycling_hub_id, must_change_password, failed_attempts, created_at FROM users ORDER BY id`);
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

const TEMP_PW_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

function generateTempPassword() {
  // 12 chars from an unambiguous alphabet (no 0/O, 1/l/I) — strong enough for
  // a temporary credential that must be changed at first login anyway.
  let out = '';
  for (let i = 0; i < 12; i++) out += TEMP_PW_ALPHABET[crypto.randomInt(TEMP_PW_ALPHABET.length)];
  return out;
}

/**
 * Admin: reset a staff member's password.
 * Either sets a custom password (newPassword) or generates a temporary one.
 * The plaintext password is returned exactly ONCE so the admin can share it —
 * it is never stored or logged anywhere. The user must change it at next
 * login (unless the admin is resetting their own password).
 */
router.post('/:id/reset-password', authRequired, requireRole('ADMIN'), async (req, res) => {
  const target = await one(`SELECT * FROM users WHERE id = $1`, [req.params.id]);
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (target.role === 'RESIDENT') {
    return res.status(400).json({ error: 'Residents sign in with Google — their accounts have no password' });
  }

  const custom = typeof req.body?.newPassword === 'string' ? req.body.newPassword.trim() : '';
  if (custom && custom.length < 6) {
    return res.status(400).json({ error: 'Custom password must be at least 6 characters' });
  }
  const newPassword = custom || generateTempPassword();
  const isSelf = target.id === req.user.id;

  const hash = await bcrypt.hash(newPassword, 10);
  const user = await one(
    `UPDATE users
       SET password_hash = $1, failed_attempts = 0,
           must_change_password = $2, updated_at = now()
     WHERE id = $3
     RETURNING id, role, name, username, status, must_change_password`,
    [hash, !isSelf, target.id]
  );

  await query(`INSERT INTO audit_log (actor_id, action, entity_type, entity_id, detail) VALUES ($1,'RESET_PASSWORD','user',$2,$3)`, [
    req.user.id,
    target.id,
    JSON.stringify({ username: target.username, generated: !custom }),
  ]);

  res.json({ user, password: newPassword, mustChangePassword: !isSelf });
});

/** Admin: one account in full — profile, hubs, and its footprint across the system. */
router.get('/:id', authRequired, requireRole('ADMIN'), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid user id' });

  const user = await one(
    `SELECT u.*, lh.name AS local_hub_name, rh.name AS recycling_hub_name, cb.name AS created_by_name
     FROM users u
     LEFT JOIN local_hubs lh ON lh.id = u.local_hub_id
     LEFT JOIN recycling_hubs rh ON rh.id = u.recycling_hub_id
     LEFT JOIN users cb ON cb.id = u.created_by
     WHERE u.id = $1`,
    [id]
  );
  if (!user) return res.status(404).json({ error: 'User not found' });

  const residentProfile = user.role === 'RESIDENT'
    ? await one(`SELECT * FROM resident_profiles WHERE user_id = $1`, [id])
    : null;
  const driverProfile = user.role === 'DRIVER'
    ? await one(`SELECT * FROM driver_profiles WHERE user_id = $1`, [id])
    : null;

  const stats = {
    collections_as_cleaner: 0,
    kg_collected: 0,
    pickups_requested: 0,
    transfers_requested: 0,
    transfers_driven: 0,
    batches_created: 0,
  };
  const asCleaner = await one(
    `SELECT COUNT(*)::int AS n, COALESCE(SUM(weight_kg), 0)::float AS kg FROM collections WHERE cleaner_id = $1`, [id]);
  stats.collections_as_cleaner = asCleaner.n;
  stats.kg_collected = asCleaner.kg;
  if (user.role === 'RESIDENT') {
    stats.pickups_requested = (await one(`SELECT COUNT(*)::int AS n FROM pickup_requests WHERE resident_id = $1`, [id])).n;
  }
  stats.transfers_requested = (await one(`SELECT COUNT(*)::int AS n FROM transfers WHERE requested_by = $1`, [id])).n;
  stats.transfers_driven = (await one(`SELECT COUNT(*)::int AS n FROM transfers WHERE driver_id = $1`, [id])).n;
  stats.batches_created = (await one(`SELECT COUNT(*)::int AS n FROM recycling_batches WHERE created_by = $1`, [id])).n;

  const recentCollections = await query(
    `SELECT c.*, h.name AS hub_name, r.name AS resident_name
     FROM collections c
     LEFT JOIN local_hubs h ON h.id = c.local_hub_id
     LEFT JOIN users r ON r.id = c.resident_id
     WHERE c.cleaner_id = $1 OR c.resident_id = $1
     ORDER BY c.collected_at DESC LIMIT 5`,
    [id]
  );
  const recentPickups = user.role === 'RESIDENT'
    ? await query(`SELECT * FROM pickup_requests WHERE resident_id = $1 ORDER BY created_at DESC LIMIT 5`, [id])
    : [];
  const recentLedger = user.role === 'RESIDENT'
    ? await query(`SELECT id, points, reason, created_at FROM eco_points_ledger WHERE resident_id = $1 ORDER BY created_at DESC LIMIT 5`, [id])
    : [];
  const activity = await query(
    `SELECT a.id, a.action, a.entity_type, a.entity_id, a.detail, a.created_at,
            u.name AS actor_name, u.role AS actor_role
     FROM audit_log a LEFT JOIN users u ON u.id = a.actor_id
     WHERE a.entity_type = 'user' AND a.entity_id = $1
     ORDER BY a.created_at DESC, a.id DESC LIMIT 10`,
    [id]
  );

  const { password_hash, google_uid, ...safe } = user;
  res.json({
    user: safe,
    resident_profile: residentProfile,
    driver_profile: driverProfile,
    stats,
    recent_collections: recentCollections,
    recent_pickups: recentPickups,
    recent_ledger: recentLedger,
    activity,
  });
});

/**
 * Admin: permanently delete an account.
 * References that must survive (hubs, historical transfers, collections) are
 * anonymized (SET NULL); the account's own personal data (profiles, pickup
 * requests, eco ledger) is removed. Open pickups return to the PENDING pool,
 * and the account's sessions die instantly (auth checks account existence).
 */
router.delete('/:id', authRequired, requireRole('ADMIN'), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid user id' });
  if (id === req.user.id) return res.status(400).json({ error: 'You cannot delete your own account' });

  const target = await one(`SELECT * FROM users WHERE id = $1`, [id]);
  if (!target) return res.status(404).json({ error: 'User not found' });

  if (target.role === 'ADMIN') {
    const others = await one(`SELECT COUNT(*)::int AS n FROM users WHERE role = 'ADMIN' AND id != $1`, [id]);
    if (others.n === 0) return res.status(400).json({ error: 'Cannot delete the last administrator account' });
  }

  const db = await getDb();
  try {
    await db.transaction(async (tx) => {
      // 1) Detach the account from things that must keep working without it.
      await tx.query(`UPDATE local_hubs SET manager_id = NULL WHERE manager_id = $1`, [id]);
      await tx.query(`UPDATE recycling_hubs SET manager_id = NULL WHERE manager_id = $1`, [id]);
      await tx.query(`UPDATE users SET created_by = NULL WHERE created_by = $1`, [id]);
      await tx.query(`UPDATE recycling_batches SET created_by = NULL WHERE created_by = $1`, [id]);
      await tx.query(`UPDATE alerts SET acknowledged_by = NULL WHERE acknowledged_by = $1`, [id]);
      await tx.query(`UPDATE audit_log SET actor_id = NULL WHERE actor_id = $1`, [id]);

      // 2) Open work returns to the unassigned pool; historical records keep
      //    their status/weights with the person anonymized out.
      await tx.query(
        `UPDATE pickup_requests SET status = 'PENDING', assigned_cleaner_id = NULL, assigned_at = NULL
          WHERE assigned_cleaner_id = $1 AND status IN ('PENDING','ASSIGNED')`,
        [id]
      );
      await tx.query(`UPDATE pickup_requests SET assigned_cleaner_id = NULL WHERE assigned_cleaner_id = $1`, [id]);
      await tx.query(`UPDATE transfers SET driver_id = NULL WHERE driver_id = $1`, [id]);
      await tx.query(`UPDATE transfers SET assigned_by = NULL WHERE assigned_by = $1`, [id]);
      await tx.query(`UPDATE transfers SET requested_by = NULL WHERE requested_by = $1`, [id]);
      await tx.query(`UPDATE transfer_events SET actor_id = NULL WHERE actor_id = $1`, [id]);
      await tx.query(`UPDATE collections SET cleaner_id = NULL WHERE cleaner_id = $1`, [id]);
      await tx.query(`UPDATE collections SET resident_id = NULL WHERE resident_id = $1`, [id]);

      // 3) Remove the account's personal data.
      await tx.query(`DELETE FROM eco_points_ledger WHERE resident_id = $1`, [id]);
      await tx.query(
        `UPDATE pickup_requests SET original_request_id = NULL
          WHERE original_request_id IN (SELECT id FROM pickup_requests WHERE resident_id = $1)`,
        [id]
      );
      await tx.query(
        `UPDATE collections SET pickup_request_id = NULL
          WHERE pickup_request_id IN (SELECT id FROM pickup_requests WHERE resident_id = $1)`,
        [id]
      );
      await tx.query(`DELETE FROM pickup_requests WHERE resident_id = $1`, [id]);

      // 4) Audit trail — the deleted person's name snapshot survives in detail.
      await tx.query(`INSERT INTO audit_log (actor_id, action, entity_type, entity_id, detail) VALUES ($1,'DELETE_USER','user',$2,$3)`, [
        req.user.id,
        id,
        JSON.stringify({ name: target.name, username: target.username, role: target.role }),
      ]);

      // 5) resident_profiles / driver_profiles cascade; then the account itself.
      await tx.query(`DELETE FROM users WHERE id = $1`, [id]);
    });
  } catch (e) {
    console.error('[delete-user] transaction failed:', e.message);
    return res.status(409).json({ error: 'This account still has records that could not be detached. Try suspending it instead.' });
  }

  res.json({ success: true, deleted: { id: target.id, name: target.name, username: target.username, role: target.role } });
});

module.exports = router;
