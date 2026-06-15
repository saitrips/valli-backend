const { supabaseAdmin } = require('../lib/supabase');
const prisma = require('../lib/prisma');

/**
 * Validates Supabase JWT from Authorization header,
 * loads the user's business onto req.business.
 */
async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Missing bearer token' } });
    }

    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' } });
    }

    const business = await prisma.business.findUnique({ where: { ownerId: data.user.id } });
    if (!business) {
      return res.status(403).json({ error: { code: 'NO_BUSINESS', message: 'No business found for this account' } });
    }
    if (!business.isActive) {
      return res.status(403).json({ error: { code: 'SUSPENDED', message: 'Business account suspended' } });
    }

    req.user = data.user;
    req.business = business;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { requireAuth };
