const { verifyToken } = require('@clerk/backend');

const CLERK_JWT_KEY = process.env.CLERK_JWT_KEY;
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
const CLERK_FRONTEND_API = process.env.VITE_CLERK_FRONTEND_API || process.env.CLERK_FRONTEND_API;

// Returns JWT payload (truthy) on success, or false on failure (also sends 401).
// Uses jwtKey for offline verification when set; falls back to secretKey.
async function authorize(req, res) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  const token = authHeader?.split(' ')[1];
  if (!token) { res.status(401).json({ error: 'Unauthorized' }); return false; }
  try {
    const opts = { authorizedParties: CLERK_FRONTEND_API ? [CLERK_FRONTEND_API] : undefined };
    if (CLERK_JWT_KEY) opts.jwtKey = CLERK_JWT_KEY;
    else opts.secretKey = CLERK_SECRET_KEY;
    const payload = await verifyToken(token, opts);
    return payload;
  } catch (err) {
    console.error('Clerk auth failed', err);
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
}

module.exports = { authorize };
