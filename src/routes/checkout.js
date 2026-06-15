const router = require('express').Router();
const prisma = require('../lib/prisma');
const { checkoutOrderSchema } = require('../validators/schemas');
const { createOrder } = require('../services/orderService');

/** GET /api/shop/:slug — public storefront data */
router.get('/:slug', async (req, res, next) => {
  try {
    const business = await prisma.business.findUnique({
      where: { slug: req.params.slug },
      select: {
        id: true, name: true, slug: true, logoUrl: true, heroMessage: true,
        accentColor: true, currency: true, whatsappNumber: true,
        freeShipThreshold: true, flatShipRate: true,
        products: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true, name: true, description: true, category: true,
            basePrice: true, compareAt: true,
            photos: { orderBy: { sortOrder: 'asc' }, select: { url: true } },
            variants: {
              select: {
                id: true, sizeLabel: true, colourLabel: true, colourHex: true, priceOverride: true,
                inventory: { select: { inStock: true, reserved: true } },
              },
            },
          },
        },
      },
    });
    if (!business || !business.products) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Store not found' } });
    }

    // Compute availability per variant, hide internals
    const products = business.products.map(p => ({
      ...p,
      variants: p.variants.map(v => ({
        id: v.id, sizeLabel: v.sizeLabel, colourLabel: v.colourLabel,
        colourHex: v.colourHex, priceOverride: v.priceOverride,
        available: Math.max(0, (v.inventory?.inStock ?? 0) - (v.inventory?.reserved ?? 0)),
      })),
    }));

    res.json({ data: { ...business, products } });
  } catch (err) { next(err); }
});

/** POST /api/shop/:slug/orders — public order submission */
router.post('/:slug/orders', async (req, res, next) => {
  try {
    const business = await prisma.business.findUnique({ where: { slug: req.params.slug } });
    if (!business) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Store not found' } });

    const body = checkoutOrderSchema.parse(req.body);
    const order = await createOrder({
      businessId: business.id,
      customerData: body.customer,
      addressData: body.address,
      items: body.items,
      source: 'CHECKOUT',
      notes: body.notes,
    });

    // Track analytics event
    await prisma.analyticsEvent.create({
      data: { businessId: business.id, eventType: 'order_placed', metadata: { orderId: order.id, total: order.total } },
    });

    res.status(201).json({
      data: {
        orderNumber: order.orderNumber,
        total: order.total,
        businessWhatsApp: business.whatsappNumber,
      },
    });
  } catch (err) { next(err); }
});

module.exports = router;
