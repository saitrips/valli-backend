const router = require('express').Router();
const prisma = require('../lib/prisma');
const { createOrderSchema, updateStatusSchema, paymentSchema } = require('../validators/schemas');
const { createOrder, updateOrderStatus } = require('../services/orderService');
const { getMessageLink } = require('../services/whatsappService');

/** GET /api/orders?status=&search=&page= */
router.get('/', async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 25 } = req.query;
    const where = { businessId: req.business.id };
    if (status && status !== 'ALL') where.status = status;
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { customer: { phone: { contains: search } } },
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: { customer: true, items: true, payments: true, shipment: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: Number(limit),
      }),
      prisma.order.count({ where }),
    ]);

    res.json({ data: orders, meta: { page: Number(page), limit: Number(limit), total } });
  } catch (err) { next(err); }
});

/** GET /api/orders/counts — for filter badges */
router.get('/counts', async (req, res, next) => {
  try {
    const counts = await prisma.order.groupBy({
      by: ['status'],
      where: { businessId: req.business.id },
      _count: true,
    });
    res.json({ data: Object.fromEntries(counts.map(c => [c.status, c._count])) });
  } catch (err) { next(err); }
});

/** GET /api/orders/:id */
router.get('/:id', async (req, res, next) => {
  try {
    const order = await prisma.order.findFirstOrThrow({
      where: { id: req.params.id, businessId: req.business.id },
      include: {
        customer: true, address: true, items: { include: { variant: { include: { product: true } } } },
        payments: true, shipment: true,
        statusHistory: { orderBy: { changedAt: 'desc' } },
      },
    });
    res.json({ data: order });
  } catch (err) { next(err); }
});

/** POST /api/orders — owner manual order */
router.post('/', async (req, res, next) => {
  try {
    const body = createOrderSchema.parse(req.body);
    const order = await createOrder({ businessId: req.business.id, ...body, customerData: body.customer, addressData: body.address });
    res.status(201).json({ data: order });
  } catch (err) { next(err); }
});

/** PATCH /api/orders/:id/status */
router.patch('/:id/status', async (req, res, next) => {
  try {
    const { status, note } = updateStatusSchema.parse(req.body);
    const order = await updateOrderStatus(req.business.id, req.params.id, status, note);
    res.json({ data: order });
  } catch (err) { next(err); }
});

/** POST /api/orders/:id/payments — record payment */
router.post('/:id/payments', async (req, res, next) => {
  try {
    const body = paymentSchema.parse(req.body);
    const order = await prisma.order.findFirstOrThrow({
      where: { id: req.params.id, businessId: req.business.id },
    });

    const payment = await prisma.payment.create({
      data: { orderId: order.id, amount: body.amount, method: body.method, reference: body.reference || null, confirmedAt: new Date() },
    });

    // Auto-advance status if fully paid
    const payments = await prisma.payment.aggregate({
      where: { orderId: order.id, confirmedAt: { not: null } },
      _sum: { amount: true },
    });
    let updatedOrder = order;
    if (Number(payments._sum.amount) >= Number(order.total) &&
        ['NEW', 'AWAITING_PAYMENT'].includes(order.status)) {
      updatedOrder = await updateOrderStatus(req.business.id, order.id, 'PAYMENT_CONFIRMED', `Payment via ${body.method}`);
    }

    res.status(201).json({ data: { payment, order: updatedOrder } });
  } catch (err) { next(err); }
});

/** GET /api/orders/:id/whatsapp-link?template=payment_request */
router.get('/:id/whatsapp-link', async (req, res, next) => {
  try {
    const order = await prisma.order.findFirstOrThrow({
      where: { id: req.params.id, businessId: req.business.id },
      include: { customer: true, shipment: true },
    });
    const result = getMessageLink(req.query.template || 'order_received', order, req.business);
    res.json({ data: result });
  } catch (err) { next(err); }
});

/** PATCH /api/orders/:id — update notes */
router.patch('/:id', async (req, res, next) => {
  try {
    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { internalNote: req.body.internalNote, notes: req.body.notes },
    });
    res.json({ data: order });
  } catch (err) { next(err); }
});

module.exports = router;
