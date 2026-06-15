require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { errorHandler, notFound } = require('./middleware/error');
const { requireAuth } = require('./middleware/auth');

const authRoutes = require('./routes/auth');
const orderRoutes = require('./routes/orders');
const productRoutes = require('./routes/products');
const inventoryRoutes = require('./routes/inventory');
const shippingRoutes = require('./routes/shipping');
const analyticsRoutes = require('./routes/analytics');
const checkoutRoutes = require('./routes/checkout');
const settingsRoutes = require('./routes/settings');
const customerRoutes = require('./routes/customers');
const templateRoutes = require('./routes/templates');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Security & middleware ──
app.use(helmet());
app.use(compression());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Rate limiting ──
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
});
const checkoutLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20, // stricter for public checkout
  message: { error: { code: 'RATE_LIMITED', message: 'Too many checkout attempts' } },
});

app.use('/api', apiLimiter);

// ── Health ──
app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// ── Public routes (no auth) ──
app.use('/api/shop', checkoutLimiter, checkoutRoutes);
app.use('/api/auth', authRoutes);

// ── Protected routes ──
app.use('/api/orders', requireAuth, orderRoutes);
app.use('/api/products', requireAuth, productRoutes);
app.use('/api/inventory', requireAuth, inventoryRoutes);
app.use('/api/shipping', requireAuth, shippingRoutes);
app.use('/api/analytics', requireAuth, analyticsRoutes);
app.use('/api/settings', requireAuth, settingsRoutes);
app.use('/api/customers', requireAuth, customerRoutes);
app.use('/api/templates', requireAuth, templateRoutes);

// ── Errors ──
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => console.log(`🚀 VALLI API running on :${PORT}`));

module.exports = app;
