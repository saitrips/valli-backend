const router = require('express').Router();
const prisma = require('../lib/prisma');
const { stockAdjustSchema } = require('../validators/schemas');

/** GET /api/inventory — all variants with stock + product info */
router.get('/', async (req, res, next) => {
  try {
    const items = await prisma.productVariant.findMany({
      where: { product: { businessId: req.business.id } },
      include: { product: { select: { name: true, category: true } }, inventory: true },
      orderBy: { product: { name: 'asc' } },
    });
    const data = items.map(v => ({
      variantId: v.id,
      product: v.product.name,
      size: v.sizeLabel, colour: v.colourLabel,
      inStock: v.inventory?.inStock ?? 0,
      reserved: v.inventory?.reserved ?? 0,
      available: Math.max(0, (v.inventory?.inStock ?? 0) - (v.inventory?.reserved ?? 0)),
      lowStockThreshold: v.inventory?.lowStockThreshold ?? 3,
      isLow: (v.inventory?.inStock ?? 0) - (v.inventory?.reserved ?? 0) <= (v.inventory?.lowStockThreshold ?? 3),
    }));
    res.json({ data });
  } catch (err) { next(err); }
});

/** PATCH /api/inventory/:variantId — adjust stock */
router.patch('/:variantId', async (req, res, next) => {
  try {
    const body = stockAdjustSchema.parse(req.body);
    const variant = await prisma.productVariant.findFirstOrThrow({
      where: { id: req.params.variantId, product: { businessId: req.business.id } },
      include: { inventory: true },
    });

    const inv = variant.inventory
      ? await prisma.inventory.update({
          where: { variantId: variant.id },
          data: { inStock: { increment: body.change } },
        })
      : await prisma.inventory.create({
          data: { variantId: variant.id, inStock: Math.max(0, body.change) },
        });

    await prisma.inventoryLog.create({
      data: { inventoryId: inv.id, change: body.change, reason: body.reason, note: body.note || null },
    });

    res.json({ data: inv });
  } catch (err) { next(err); }
});

/** GET /api/inventory/low-stock */
router.get('/low-stock', async (req, res, next) => {
  try {
    const items = await prisma.$queryRaw`
      SELECT pv.id as variant_id, p.name as product, pv.size_label, pv.colour_label,
             i.in_stock, i.reserved, i.low_stock_threshold
      FROM inventory i
      JOIN product_variants pv ON pv.id = i.variant_id
      JOIN products p ON p.id = pv.product_id
      WHERE p.business_id = ${req.business.id}
        AND (i.in_stock - i.reserved) <= i.low_stock_threshold
      ORDER BY (i.in_stock - i.reserved) ASC`;
    res.json({ data: items });
  } catch (err) { next(err); }
});

module.exports = router;
