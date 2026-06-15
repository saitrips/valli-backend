const router = require('express').Router();
const prisma = require('../lib/prisma');
const { productSchema } = require('../validators/schemas');

/** GET /api/products */
router.get('/', async (req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      where: { businessId: req.business.id },
      include: {
        photos: { orderBy: { sortOrder: 'asc' } },
        variants: { include: { inventory: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });
    res.json({ data: products });
  } catch (err) { next(err); }
});

/** POST /api/products — create with variants + initial stock */
router.post('/', async (req, res, next) => {
  try {
    const body = productSchema.parse(req.body);
    const product = await prisma.product.create({
      data: {
        businessId: req.business.id,
        name: body.name,
        description: body.description || null,
        category: body.category || null,
        basePrice: body.basePrice,
        compareAt: body.compareAt || null,
        isActive: body.isActive,
        variants: {
          create: body.variants.map(v => ({
            sizeLabel: v.sizeLabel || null,
            colourLabel: v.colourLabel || null,
            colourHex: v.colourHex || null,
            sku: v.sku || null,
            priceOverride: v.priceOverride || null,
            inventory: { create: { inStock: v.initialStock || 0 } },
          })),
        },
      },
      include: { variants: { include: { inventory: true } } },
    });
    res.status(201).json({ data: product });
  } catch (err) { next(err); }
});

/** PATCH /api/products/:id */
router.patch('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.product.findFirstOrThrow({
      where: { id: req.params.id, businessId: req.business.id },
    });
    const product = await prisma.product.update({
      where: { id: existing.id },
      data: {
        name: req.body.name, description: req.body.description,
        category: req.body.category, basePrice: req.body.basePrice,
        compareAt: req.body.compareAt, isActive: req.body.isActive,
        sortOrder: req.body.sortOrder,
      },
    });
    res.json({ data: product });
  } catch (err) { next(err); }
});

/** DELETE /api/products/:id */
router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.product.findFirstOrThrow({ where: { id: req.params.id, businessId: req.business.id } });
    await prisma.product.delete({ where: { id: req.params.id } });
    res.json({ data: { deleted: true } });
  } catch (err) { next(err); }
});

module.exports = router;
