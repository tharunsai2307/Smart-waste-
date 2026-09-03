const jwt = require('jsonwebtoken');
const { one } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, name: user.name, localHubId: user.local_hub_id, recyclingHubId: user.recycling_hub_id },
    JWT_SECRET,
    { expiresIn: '12h' }
  );
}

/**
 * Verifies the JWT AND that the account still exists and is active.
 * Tokens outlive account deletion/suspension by up to 12h, so every request
 * re-checks the account — a deleted or suspended user is kicked out on their
 * very next API call instead of staying signed in until token expiry.
 */
async function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing authentication token' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  try {
    const account = await one(`SELECT id, status FROM users WHERE id = $1`, [req.user.id]);
    if (!account) return res.status(401).json({ error: 'This account no longer exists' });
    if (account.status === 'SUSPENDED') return res.status(401).json({ error: 'Account suspended. Contact admin.' });
    next();
  } catch (e) {
    console.error('[auth] account lookup failed:', e.message);
    return res.status(500).json({ error: 'Authentication check failed' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Forbidden: requires role ${roles.join(' or ')}` });
    }
    next();
  };
}

module.exports = { signToken, authRequired, requireRole, JWT_SECRET };
