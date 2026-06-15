const { z } = require('zod');

const checkoutOrderSchema = z.object({
  customer: z.object({
    name: z.string().min(1).max(120),
    phone: z.string().min(7).max(20),
    email: z.string().email().optional().or(z.literal('')),
  }),
  address: z.object({
    line1: z.string().min(1).max(200),
    line2: z.string().max(200).optional().or(z.literal('')),
    city: z.string().min(1).max(100),
    state: z.string().min(2).max(60),
    zip: z.string().min(3).max(12),
    country: z.string().default('US'),
  }),
  items: z.array(z.object({
    variantId: z.string().uuid(),
    quantity: z.number().int().min(1).max(20),
  })).min(1).max(30),
  notes: z.string().max(1000).optional().or(z.literal('')),
});

const createOrderSchema = z.object({
  customerId: z.string().uuid().optional(),
  customer: z.object({
    name: z.string().min(1),
    phone: z.string().min(7),
    email: z.string().email().optional().or(z.literal('')),
  }).optional(),
  addressId: z.string().uuid().optional(),
  address: z.object({
    line1: z.string().min(1),
    line2: z.string().optional().or(z.literal('')),
    city: z.string().min(1),
    state: z.string().min(2),
    zip: z.string().min(3),
    country: z.string().default('US'),
  }).optional(),
  items: z.array(z.object({
    variantId: z.string().uuid(),
    quantity: z.number().int().min(1),
  })).min(1),
  source: z.enum(['CHECKOUT', 'WHATSAPP', 'INSTAGRAM', 'WALKIN', 'PHONE']).default('WHATSAPP'),
  notes: z.string().optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(['NEW', 'AWAITING_PAYMENT', 'PAYMENT_CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
  note: z.string().max(500).optional(),
});

const paymentSchema = z.object({
  amount: z.number().positive(),
  method: z.enum(['ZELLE', 'VENMO', 'CASHAPP', 'UPI', 'BANK_TRANSFER', 'CASH', 'CARD', 'OTHER']),
  reference: z.string().max(200).optional().or(z.literal('')),
});

const productSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().or(z.literal('')),
  category: z.string().max(100).optional().or(z.literal('')),
  basePrice: z.number().positive(),
  compareAt: z.number().positive().optional().nullable(),
  isActive: z.boolean().default(true),
  variants: z.array(z.object({
    sizeLabel: z.string().max(30).optional().or(z.literal('')),
    colourLabel: z.string().max(50).optional().or(z.literal('')),
    colourHex: z.string().max(9).optional().or(z.literal('')),
    sku: z.string().max(60).optional().or(z.literal('')),
    priceOverride: z.number().positive().optional().nullable(),
    initialStock: z.number().int().min(0).default(0),
  })).min(1),
});

const ratesRequestSchema = z.object({
  orderId: z.string().uuid(),
  weightLbs: z.number().positive().max(150),
  lengthIn: z.number().int().positive().max(108),
  widthIn: z.number().int().positive().max(108),
  heightIn: z.number().int().positive().max(108),
});

const buyLabelSchema = z.object({
  orderId: z.string().uuid(),
  rateObjectId: z.string(),
});

const stockAdjustSchema = z.object({
  change: z.number().int(),
  reason: z.enum(['RESTOCK', 'ADJUSTMENT', 'RETURN', 'DAMAGED']),
  note: z.string().max(300).optional().or(z.literal('')),
});

module.exports = {
  checkoutOrderSchema, createOrderSchema, updateStatusSchema,
  paymentSchema, productSchema, ratesRequestSchema, buyLabelSchema, stockAdjustSchema,
};
