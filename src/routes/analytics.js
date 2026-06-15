const router = require('express').Router();
const prisma = require('../lib/prisma');

function rangeToDate(range) {
  const now = new Date();
  if (range === 'today') { const d = new Date(now); d.setHours(0,0,0,0); return d; }
  if (range === 'week')  { const d = new Date(now); d.setDate(d.getDate() - 7); return d; }
  if (range === 'month') { const d = new Date(now); d.setDate(d.getDate() - 30); return d; }
  return new Date(0);
}

/** GET /api/analytics/summary?range=today|week|month */
router.get('/summary', async (req, res, next) => {
  try {
    const since = rangeToDate(req.query.range || 'month');
    const businessId = req.business.id;

    const [orderAgg, revenueAgg, newCustomers, lowStockCount] = await Promise.all([
      prisma.order.aggregate({
        where: { businessId, createdAt: { gte: since }, status: { not: 'CANCELLED' } },
        _count: true, _avg: { total: true },
      }),
      prisma.order.aggregate({
        where: { businessId, createdAt: { gte: since }, status: { in: ['PAYMENT_CONFIRMED', 'SHIPPED', 'DELIVERED'] } },
        _sum: { total: true },
      }),
      prisma.customer.count({ where: { businessId, createdAt: { gte: since } } }),
      prisma.$queryRaw`
        SELECT COUNT(*)::int as count FROM inventory i
        JOIN product_variants pv ON pv.id = i.variant_id
        JOIN products p ON p.id = pv.product_id
        WHERE p.business_id = ${businessId}
          AND (i.in_stock - i.reserved) <= i.low_stock_threshold`,
    ]);

    res.json({
      data: {
        orders: orderAgg._count,
        revenue: Number(revenueAgg._sum.total || 0),
        avgOrderValue: Number(orderAgg._avg.total || 0),
        newCustomers,
        lowStockItems: lowStockCount[0]?.count || 0,
      },
      range: { from: since.toISOString(), to: new Date().toISOString() },
    });
  } catch (err) { next(err); }
});

/** GET /api/analytics/revenue-trend?days=30 */
router.get('/revenue-trend', async (req, res, next) => {
  try {
    const days = Math.min(Number(req.query.days || 30), 90);
    const since = new Date(); since.setDate(since.getDate() - days);
    const rows = await prisma.$queryRaw`
      SELECT DATE(created_at) as day, SUM(total)::float as revenue, COUNT(*)::int as orders
      FROM orders
      WHERE business_id = ${req.business.id}
        AND created_at >= ${since}
        AND status IN ('PAYMENT_CONFIRMED', 'SHIPPED', 'DELIVERED')
      GROUP BY DATE(created_at) ORDER BY day ASC`;
    res.json({ data: rows });
  } catch (err) { next(err); }
});

/** GET /api/analytics/orders-by-status */
router.get('/orders-by-status', async (req, res, next) => {
  try {
    const rows = await prisma.order.groupBy({
      by: ['status'], where: { businessId: req.business.id }, _count: true,
    });
    res.json({ data: rows.map(r => ({ status: r.status, count: r._count })) });
  } catch (err) { next(err); }
});

/** GET /api/analytics/orders-by-source */
router.get('/orders-by-source', async (req, res, next) => {
  try {
    const rows = await prisma.order.groupBy({
      by: ['source'], where: { businessId: req.business.id }, _count: true,
    });
    res.json({ data: rows.map(r => ({ source: r.source, count: r._count })) });
  } catch (err) { next(err); }
});

/** GET /api/analytics/top-products?limit=5 */
router.get('/top-products', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit || 5), 20);
    const rows = await prisma.$queryRaw`
      SELECT oi.product_name, SUM(oi.quantity)::int as units, SUM(oi.line_total)::float as revenue
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE o.business_id = ${req.business.id} AND o.status != 'CANCELLED'
      GROUP BY oi.product_name
      ORDER BY units DESC LIMIT ${limit}`;
    res.json({ data: rows });
  } catch (err) { next(err); }
});

module.exports = router;
