const { PGlite } = require('@electric-sql/pglite');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'pgdata');

let dbInstance = null;

/**
 * Returns a singleton PGlite instance (a real embedded Postgres engine).
 * Persists to disk under backend/pgdata so data survives restarts.
 */
async function getDb() {
  if (dbInstance) return dbInstance;
  dbInstance = new PGlite(DATA_DIR);
  await dbInstance.waitReady;
  return dbInstance;
}

/** Thin query helper mimicking a pg-Pool-like interface: rows out. */
async function query(sql, params = []) {
  const db = await getDb();
  const result = await db.query(sql, params);
  return result.rows;
}

async function one(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

async function runMigrations() {
  const db = await getDb();
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  // Track whether schema already applied (idempotent: use IF NOT EXISTS everywhere,
  // but ALTER TABLE ADD CONSTRAINT is not IF-NOT-EXISTS safe, so guard with a marker table).
  await db.exec(`CREATE TABLE IF NOT EXISTS _schema_meta (key TEXT PRIMARY KEY, value TEXT);`);
  const applied = await db.query(`SELECT value FROM _schema_meta WHERE key = 'schema_version'`);

  if (applied.rows.length === 0) {
    console.log('[db] Applying schema (first run)...');
    await db.exec(schemaSql);
    await db.exec(`INSERT INTO _schema_meta (key, value) VALUES ('schema_version', '2') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;`);
    console.log('[db] Schema applied.');
  } else {
    console.log('[db] Schema already present, skipping migration.');
  }
}

module.exports = { getDb, query, one, runMigrations };
