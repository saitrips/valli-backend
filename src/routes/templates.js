const router = require('express').Router();
const prisma = require('../lib/prisma');

router.get('/', async (req, res, next) => {
  try {
    const templates = await prisma.quickReplyTemplate.findMany({
      where: { businessId: req.business.id }, orderBy: { sortOrder: 'asc' },
    });
    res.json({ data: templates });
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const template = await prisma.quickReplyTemplate.create({
      data: { businessId: req.business.id, name: req.body.name, body: req.body.body },
    });
    res.status(201).json({ data: template });
  } catch (err) { next(err); }
});

router.patch('/:id', async (req, res, next) => {
  try {
    await prisma.quickReplyTemplate.findFirstOrThrow({ where: { id: req.params.id, businessId: req.business.id } });
    const template = await prisma.quickReplyTemplate.update({
      where: { id: req.params.id },
      data: { name: req.body.name, body: req.body.body, sortOrder: req.body.sortOrder },
    });
    res.json({ data: template });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.quickReplyTemplate.findFirstOrThrow({ where: { id: req.params.id, businessId: req.business.id } });
    await prisma.quickReplyTemplate.delete({ where: { id: req.params.id } });
    res.json({ data: { deleted: true } });
  } catch (err) { next(err); }
});

module.exports = router;
