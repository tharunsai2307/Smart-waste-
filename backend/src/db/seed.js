/**
 * Bootstrap seed: creates ONLY the first admin account (chicken-and-egg
 * problem — admin is the sole issuer of staff credentials, so one must
 * exist before anyone can log in). Everything else (hubs, staff, vehicles,
 * pickups, transfers, batches) is meant to be created through the real
 * app flows by that admin, not pre-populated with fake data.
 *
 * Run with: node src/db/seed.js
 */
const bcrypt = require('bcryptjs');
const { query, one, runMigrations } = require('./index');

async function seed() {
  await runMigrations();

  const existingAdmin = await one(`SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1`);
  if (existingAdmin) {
    console.log('[seed] An admin account already exists. Skipping bootstrap.');
    return;
  }

  const username = process.env.SEED_ADMIN_USERNAME || 'admin';
  const password = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!';
  const hash = await bcrypt.hash(password, 10);

  await query(
    `INSERT INTO users (role, name, username, password_hash, email, must_change_password)
     VALUES ('ADMIN', 'System Administrator', $1, $2, 'admin@smartwaste.local', TRUE)`,
    [username, hash]
  );

  console.log('[seed] Bootstrap admin created.');
  console.log(`[seed]   username: ${username}`);
  console.log(`[seed]   password: ${password}`);
  console.log('[seed] IMPORTANT: log in and change this password immediately (must_change_password is set).');
}

seed()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('[seed] failed:', e);
    process.exit(1);
  });
