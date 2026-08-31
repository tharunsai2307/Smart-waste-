/** Eco points: 1 point per kg recycled/collected, +5 bonus for segregated (non-MIXED) waste. */
function computeEcoPoints(weightKg, wasteType) {
  const base = Math.round(weightKg);
  const bonus = wasteType && wasteType !== 'MIXED' ? 5 : 0;
  return base + bonus;
}

module.exports = { computeEcoPoints };
