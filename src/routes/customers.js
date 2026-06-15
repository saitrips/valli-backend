const router = require('express').Router();
const prisma = require('../lib/prisma');

router.get('/', async (req, res, next) => {
  try {
    const { search, page = 1, limit = 25 } = req.query;
    const where = { businessId: req.business.id };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }
    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where, orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit, take: Number(limit),
      }),
      prisma.customer.count({ where }),
    ]);
    res.json({ data: customers, meta: { page: Number(page), total } });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const customer = await prisma.customer.findFirstOrThrow({
      where: { id: req.params.id, businessId: req.business.id },
      include: {
        orders: { orderBy: { createdAt: 'desc' }, take: 20, include: { items: true } },
        addresses: true,
      },
    });
    res.json({ data: customer });
  } catch (err) { next(err); }
});

module.exports = router;
