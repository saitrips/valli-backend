const router = require('express').Router();
const prisma = require('../lib/prisma');
const { ratesRequestSchema, buyLabelSchema } = require('../validators/schemas');
const { getRates, buyLabel, businessToAddress, orderToAddress } = require('../services/shippoService');
const { updateOrderStatus } = require('../services/orderService');

/** POST /api/shipping/rates — fetch live rates for an order */
router.post('/rates', async (req, res, next) => {
  try {
    const body = ratesRequestSchema.parse(req.body);
    const order = await prisma.order.findFirstOrThrow({
      where: { id: body.orderId, businessId: req.business.id },
      include: { customer: true, address: true },
    });
    if (!order.address) {
      return res.status(400).json({ error: { code: 'NO_ADDRESS', message: 'Order has no shipping address' } });
    }
    if (!req.business.shipFromStreet) {
      return res.status(400).json({ error: { code: 'NO_FROM_ADDRESS', message: 'Set your ship-from address in Settings first' } });
    }

    const result = await getRates({
      fromAddress: businessToAddress(req.business),
      toAddress: orderToAddress(order),
      parcel: {
        length: String(body.lengthIn),
        width: String(body.widthIn),
        height: String(body.heightIn),
        distanceUnit: 'in',
        weight: String(body.weightLbs),
        massUnit: 'lb',
      },
    });

    res.json({ data: result });
  } catch (err) { next(err); }
});

/** POST /api/shipping/buy-label — purchase chosen rate */
router.post('/buy-label', async (req, res, next) => {
  try {
    const body = buyLabelSchema.parse(req.body);
    const order = await prisma.order.findFirstOrThrow({
      where: { id: body.orderId, businessId: req.business.id },
      include: { shipment: true },
    });
    if (order.shipment?.labelUrl) {
      return res.status(409).json({ error: { code: 'LABEL_EXISTS', message: 'Label already purchased for this order' } });
    }

    const label = await buyLabel(body.rateObjectId);

    const shipment = await prisma.shipment.upsert({
      where: { orderId: order.id },
      update: {
        trackingNumber: label.trackingNumber,
        labelUrl: label.labelUrl,
        shippoObjectId: label.shippoObjectId,
      },
      create: {
        orderId: order.id,
        carrier: req.body.carrier || 'USPS',
        service: req.body.service || 'Priority Mail',
        rateAmount: req.body.amount || 0,
        trackingNumber: label.trackingNumber,
        labelUrl: label.labelUrl,
        shippoObjectId: label.shippoObjectId,
        weightLbs: req.body.weightLbs || null,
      },
    });

    // Auto-advance to SHIPPED (commits inventory)
    const updated = await updateOrderStatus(req.business.id, order.id, 'SHIPPED', `Label purchased — ${shipment.carrier} ${shipment.service}`);
    await prisma.shipment.update({ where: { id: shipment.id }, data: { shippedAt: new Date() } });

    res.status(201).json({ data: { shipment, order: updated } });
  } catch (err) { next(err); }
});

module.exports = router;
