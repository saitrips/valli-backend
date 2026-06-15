const router = require('express').Router();
const prisma = require('../lib/prisma');

router.get('/', (req, res) => res.json({ data: req.business }));

router.patch('/', async (req, res, next) => {
  try {
    const allowed = [
      'name', 'logoUrl', 'whatsappNumber', 'email', 'currency',
      'upiId', 'zelleId', 'venmoHandle', 'cashappHandle',
      'accentColor', 'heroMessage', 'alertThresholdHours',
      'shipFromName', 'shipFromStreet', 'shipFromCity', 'shipFromState', 'shipFromZip', 'shipFromCountry',
      'freeShipThreshold', 'flatShipRate',
    ];
    const data = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => allowed.includes(k))
    );
    const business = await prisma.business.update({ where: { id: req.business.id }, data });
    res.json({ data: business });
  } catch (err) { next(err); }
});

module.exports = router;
