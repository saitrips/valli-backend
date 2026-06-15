const router = require('express').Router();
const prisma = require('../lib/prisma');
const { supabaseAdmin } = require('../lib/supabase');
const { z } = require('zod');

const onboardSchema = z.object({
  businessName: z.string().min(1).max(120),
  slug: z.string().min(3).max(60).regex(/^[a-z0-9-]+$/),
  whatsappNumber: z.string().min(7).optional(),
});

/** POST /api/auth/onboard — create business after Supabase signup */
router.post('/onboard', async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Missing token' } });

    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) return res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Invalid token' } });

    const body = onboardSchema.parse(req.body);

    const existing = await prisma.business.findUnique({ where: { ownerId: data.user.id } });
    if (existing) return res.status(409).json({ error: { code: 'EXISTS', message: 'Business already created' } });

    const business = await prisma.business.create({
      data: {
        ownerId: data.user.id,
        name: body.businessName,
        slug: body.slug,
        email: data.user.email,
        whatsappNumber: body.whatsappNumber || null,
        templates: {
          create: [
            { name: 'Size Chart', body: 'Hi {{name}}! Here is our size guide 📏', sortOrder: 0 },
            { name: 'Payment Details', body: 'Total: {{total}}. Payment options coming in next message!', sortOrder: 1 },
            { name: 'Order Confirmed', body: 'Your order {{orderNumber}} is confirmed! 🎉', sortOrder: 2 },
            { name: 'Shipped', body: 'Your order is on its way! Tracking: {{tracking}} 🚚', sortOrder: 3 },
          ],
        },
      },
    });

    res.status(201).json({ data: business });
  } catch (err) { next(err); }
});

/** GET /api/auth/me */
router.get('/me', async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Missing token' } });
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) return res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Invalid token' } });
    const business = await prisma.business.findUnique({ where: { ownerId: data.user.id } });
    res.json({ data: { user: { id: data.user.id, email: data.user.email }, business } });
  } catch (err) { next(err); }
});

module.exports = router;
