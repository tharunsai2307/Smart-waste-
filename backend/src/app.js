const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { runMigrations } = require('./db');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const hubRoutes = require('./routes/hubs');
const collectionRoutes = require('./routes/collections');
const pickupRoutes = require('./routes/pickups');
const transferRoutes = require('./routes/transfers');
const vehicleRoutes = require('./routes/vehicles');
const recyclingRoutes = require('./routes/recycling');
const alertRoutes = require('./routes/alerts');
const dashboardRoutes = require('./routes/dashboard');
const activityRoutes = require('./routes/activity');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'smart-waste-backend', time: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/hubs', hubRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/pickups', pickupRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/recycling', recyclingRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/activity', activityRoutes);

app.use((err, req, res, next) => {
  console.error('[unhandled error]', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 8081;

async function start() {
  await runMigrations();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[server] Smart Waste backend listening on 0.0.0.0:${PORT}`);
  });
}

start().catch((e) => {
  console.error('[startup error]', e);
  process.exit(1);
});

module.exports = app;
