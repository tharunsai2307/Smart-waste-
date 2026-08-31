const express = require('express');
const { z } = require('zod');
const { query, one } = require('../db');
const { authRequired, requireRole } = require('../middleware/auth');
const { genCode } = require('../utils/codes');

const router = express.Router();

const WASTE_CATS = ['PLASTIC', 'PAPER', 'METAL', 'E_WASTE', 'BIODEGRADABLE', 'HAZARDOUS', 'MIXED'];

/**
 * Create a recycling batch out of a completed (RECEIVED) transfer, OR a
 * manual intake (e.g. waste brought in directly, not via a tracked transfer).
 * "No fake data" rule: input_weight_kg MUST equal a real received_weight_kg
 * from a transfer, or be manually entered by the recycling manager who is
 * accountable for that number (no IoT sensor assumed).
 */
const createBatchSchema = z.object({
  recyclingHubId: z.number(),
  transferId: z.number().optional(),
  inputWeightKg: z.number().positive().optional(), // required if no transferId
});

router.post('/batches', authRequired, requireRole('ADMIN', 'RECYCLING_MANAGER'), async (req, res) => {
  const parsed = createBatchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const p = parsed.data;

  let inputWeight = p.inputWeightKg;
  if (p.transferId) {
    const transfer = await one(`SELECT * FROM transfers WHERE id = $1 AND status='COMPLETED'`, [p.transferId]);
    if (!transfer) return res.status(400).json({ error: 'Transfer not found or not completed yet' });
    inputWeight = transfer.received_weight_kg;
    const already = await one(`SELECT id FROM recycling_batches WHERE transfer_id = $1`, [p.transferId]);
    if (already) return res.status(409).json({ error: 'A batch already exists for this transfer' });
  }
  if (!inputWeight || inputWeight <= 0) {
    return res.status(400).json({ error: 'inputWeightKg is required (manual entry) when no completed transferId is given' });
  }

  const batchCode = genCode('BATCH');
  const batch = await one(
    `INSERT INTO recycling_batches (batch_code, recycling_hub_id, transfer_id, input_weight_kg, created_by)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [batchCode, p.recyclingHubId, p.transferId || null, inputWeight, req.user.id]
  );
  res.status(201).json({ batch });
});

/** Classify a batch into waste categories (must sum to <= input weight). */
const classifySchema = z.object({
  classifications: z.array(z.object({
    category: z.enum(WASTE_CATS),
    weightKg: z.number().positive(),
    marketRatePerKg: z.number().nonnegative().default(0),
  })).min(1),
});

router.post('/batches/:id/classify', authRequired, requireRole('ADMIN', 'RECYCLING_MANAGER'), async (req, res) => {
  const parsed = classifySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const batch = await one(`SELECT * FROM recycling_batches WHERE id = $1`, [req.params.id]);
  if (!batch) return res.status(404).json({ error: 'Batch not found' });

  const totalClassified = parsed.data.classifications.reduce((s, c) => s + c.weightKg, 0);
  if (totalClassified > batch.input_weight_kg + 0.01) {
    return res.status(400).json({ error: `Classified weight (${totalClassified}kg) exceeds batch input weight (${batch.input_weight_kg}kg)` });
  }

  await query(`DELETE FROM waste_classifications WHERE batch_id = $1`, [batch.id]);
  for (const c of parsed.data.classifications) {
    await query(
      `INSERT INTO waste_classifications (batch_id, category, weight_kg, market_rate_per_kg, recovery_value)
       VALUES ($1,$2,$3,$4,$5)`,
      [batch.id, c.category, c.weightKg, c.marketRatePerKg, c.weightKg * c.marketRatePerKg]
    );
  }
  const updated = await one(`UPDATE recycling_batches SET status='CLASSIFIED' WHERE id=$1 RETURNING *`, [batch.id]);
  res.json({ batch: updated });
});

/**
 * Log processing outcome (recovered vs residual). Manual entry by the
 * responsible recycling-hub staff when no IoT sensor exists — per requirement,
 * numbers must be real logged entries, never fabricated defaults.
 */
const processSchema = z.object({
  processedWeightKg: z.number().nonnegative(),
  recoveredWeightKg: z.number().nonnegative(),
  residualWeightKg: z.number().nonnegative(),
});

router.post('/batches/:id/process', authRequired, requireRole('ADMIN', 'RECYCLING_MANAGER'), async (req, res) => {
  const parsed = processSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const p = parsed.data;
  const batch = await one(`SELECT * FROM recycling_batches WHERE id = $1`, [req.params.id]);
  if (!batch) return res.status(404).json({ error: 'Batch not found' });

  if (Math.abs(p.recoveredWeightKg + p.residualWeightKg - p.processedWeightKg) > 0.5) {
    return res.status(400).json({ error: 'recovered + residual must approximately equal processed weight' });
  }

  const recoveryRate = p.processedWeightKg > 0 ? (p.recoveredWeightKg / p.processedWeightKg) * 100 : 0;
  const updated = await one(
    `UPDATE recycling_batches SET processed_weight_kg=$1, recovered_weight_kg=$2, residual_weight_kg=$3,
       recovery_rate_pct=$4, status='COMPLETED', completed_at=now() WHERE id=$5 RETURNING *`,
    [p.processedWeightKg, p.recoveredWeightKg, p.residualWeightKg, recoveryRate, batch.id]
  );
  res.json({ batch: updated });
});

router.get('/batches', authRequired, async (req, res) => {
  let rows;
  if (req.user.role === 'RECYCLING_MANAGER' && req.user.recyclingHubId) {
    rows = await query(`SELECT * FROM recycling_batches WHERE recycling_hub_id = $1 ORDER BY created_at DESC`, [req.user.recyclingHubId]);
  } else {
    rows = await query(`SELECT * FROM recycling_batches ORDER BY created_at DESC LIMIT 300`);
  }
  res.json({ batches: rows });
});

router.get('/batches/:id', authRequired, async (req, res) => {
  const batch = await one(`SELECT * FROM recycling_batches WHERE id = $1`, [req.params.id]);
  if (!batch) return res.status(404).json({ error: 'Batch not found' });
  const classifications = await query(`SELECT * FROM waste_classifications WHERE batch_id = $1`, [req.params.id]);
  res.json({ batch, classifications });
});

/** Real aggregate stats for a recycling hub — 100% derived from logged batches, nothing fabricated. */
router.get('/hub/:hubId/stats', authRequired, async (req, res) => {
  const hubId = req.params.hubId;
  const totals = await one(
    `SELECT
       COALESCE(SUM(input_weight_kg),0) AS total_input_kg,
       COALESCE(SUM(processed_weight_kg),0) AS total_processed_kg,
       COALESCE(SUM(recovered_weight_kg),0) AS total_recovered_kg,
       COALESCE(SUM(residual_weight_kg),0) AS total_residual_kg,
       COUNT(*)::int AS batch_count,
       COUNT(*) FILTER (WHERE status='COMPLETED')::int AS completed_batch_count
     FROM recycling_batches WHERE recycling_hub_id = $1`,
    [hubId]
  );
  const byCategory = await query(
    `SELECT wc.category, SUM(wc.weight_kg) AS weight_kg, SUM(wc.recovery_value) AS recovery_value
     FROM waste_classifications wc
     JOIN recycling_batches b ON b.id = wc.batch_id
     WHERE b.recycling_hub_id = $1
     GROUP BY wc.category ORDER BY weight_kg DESC`,
    [hubId]
  );
  res.json({ totals, byCategory });
});

module.exports = router;
