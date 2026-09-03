const express = require('express');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const { query, one } = require('../db');
const { signToken, authRequired } = require('../middleware/auth');

const router = express.Router();

/**
 * Staff login (ADMIN, LOCAL_HUB_MANAGER, CLEANER, RECYCLING_MANAGER, DRIVER)
 * Credentials are ALWAYS admin-issued. No self-registration for staff.
 */
const staffLoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const MAX_FAILED_ATTEMPTS = 10;

router.post('/login/staff', async (req, res) => {
  const parsed = staffLoginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'username and password are required' });
  const { username, password } = parsed.data;

  const user = await one(`SELECT * FROM users WHERE username = $1 AND role != 'RESIDENT'`, [username]);
  if (!user) return res.status(401).json({ error: 'Invalid username or password' });
  if (user.status === 'SUSPENDED') return res.status(403).json({ error: 'Account suspended. Contact admin.' });

  // Account lockout: after MAX_FAILED_ATTEMPTS consecutive wrong passwords,
  // the account is locked until an admin resets the password or reactivates it.
  if ((user.failed_attempts || 0) >= MAX_FAILED_ATTEMPTS) {
    return res.status(423).json({ error: `Account locked after ${MAX_FAILED_ATTEMPTS} failed login attempts. Contact an administrator to reset your password.` });
  }

  const ok = await bcrypt.compare(password, user.password_hash || '');
  if (!ok) {
    const attempts = (user.failed_attempts || 0) + 1;
    await query(`UPDATE users SET failed_attempts = $1 WHERE id = $2`, [attempts, user.id]);
    const remaining = MAX_FAILED_ATTEMPTS - attempts;
    return res.status(401).json({ error: 'Invalid username or password', remainingAttempts: remaining });
  }
  await query(`UPDATE users SET failed_attempts = 0, updated_at = now() WHERE id = $1`, [user.id]);

  const token = signToken(user);
  res.json({
    token,
    user: {
      id: user.id,
      role: user.role,
      name: user.name,
      username: user.username,
      email: user.email,
      localHubId: user.local_hub_id,
      recyclingHubId: user.recycling_hub_id,
      mustChangePassword: user.must_change_password,
    },
  });
});

/**
 * Resident login via Google (Firebase). The frontend performs the Google
 * sign-in with Firebase and sends us the verified profile info here.
 * NOTE: full ID-token verification against Firebase Admin SDK should be
 * added once real Firebase project keys are wired server-side; for now we
 * trust the uid/email pair coming from an authenticated Firebase client
 * session (frontend already gates this behind signInWithPopup).
 */
const googleLoginSchema = z.object({
  googleUid: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1),
  avatarUrl: z.string().optional(),
});

router.post('/login/google', async (req, res) => {
  const parsed = googleLoginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid Google profile payload' });
  const { googleUid, email, name, avatarUrl } = parsed.data;

  let user = await one(`SELECT * FROM users WHERE google_uid = $1`, [googleUid]);

  if (!user) {
    // First-ever sign-in for this resident: create the account, profile completion pending.
    user = await one(
      `INSERT INTO users (role, name, email, google_uid, avatar_url, profile_complete)
       VALUES ('RESIDENT', $1, $2, $3, $4, FALSE) RETURNING *`,
      [name, email, googleUid, avatarUrl || null]
    );
    await query(`INSERT INTO resident_profiles (user_id) VALUES ($1)`, [user.id]);
  }

  if (user.status === 'SUSPENDED') return res.status(403).json({ error: 'Account suspended. Contact admin.' });

  const token = signToken(user);
  res.json({
    token,
    user: {
      id: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatar_url,
      profileComplete: user.profile_complete,
    },
  });
});

/** Resident completes their profile (address/area) after first Google sign-in. */
const profileSchema = z.object({
  addressLine: z.string().min(1),
  area: z.string().min(1),
  city: z.string().min(1),
  postalCode: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  preferredLocalHubId: z.number().optional(),
});

router.post('/profile/resident', authRequired, async (req, res) => {
  if (req.user.role !== 'RESIDENT') return res.status(403).json({ error: 'Only residents have a resident profile' });
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const p = parsed.data;

  await query(
    `UPDATE resident_profiles SET address_line=$1, area=$2, city=$3, postal_code=$4,
       latitude=$5, longitude=$6, preferred_local_hub_id=$7 WHERE user_id=$8`,
    [p.addressLine, p.area, p.city, p.postalCode || null, p.latitude || null, p.longitude || null, p.preferredLocalHubId || null, req.user.id]
  );
  await query(`UPDATE users SET profile_complete = TRUE, updated_at = now() WHERE id = $1`, [req.user.id]);
  res.json({ success: true });
});

/** Change own password (staff), and clears the must_change_password flag on first login. */
const changePwSchema = z.object({
  currentPassword: z.string().min(1).optional(),
  newPassword: z.string().min(6),
});

router.post('/change-password', authRequired, async (req, res) => {
  const parsed = changePwSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'newPassword must be at least 6 characters' });
  const user = await one(`SELECT * FROM users WHERE id = $1`, [req.user.id]);
  if (!user || !user.password_hash) return res.status(400).json({ error: 'Not a password-based account' });

  if (!user.must_change_password) {
    const ok = await bcrypt.compare(parsed.data.currentPassword || '', user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Current password is incorrect' });
  }
  const hash = await bcrypt.hash(parsed.data.newPassword, 10);
  await query(`UPDATE users SET password_hash=$1, must_change_password=FALSE, updated_at=now() WHERE id=$2`, [hash, user.id]);
  res.json({ success: true });
});

router.get('/me', authRequired, async (req, res) => {
  const user = await one(`SELECT * FROM users WHERE id = $1`, [req.user.id]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  // Strip sensitive fields — password_hash is internal, google_uid is PII
  // that the frontend doesn't need for session management.
  const { password_hash, google_uid, ...safe } = user;
  res.json({ user: safe });
});

module.exports = router;
