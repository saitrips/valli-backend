const prisma = require('../lib/prisma');
const { reserveStock, releaseStock, commitStock } = require('./inventoryService');

/** Generates sequential order numbers like ZK-2026-00042 per business */
async function nextOrderNumber(businessId) {
  const year = new Date().getFullYear();
  const count = await prisma.order.count({ where: { businessId } });
  return `ZK-${year}-${String(count + 1).padStart(5, '0')}`;
}

/** Resolve unit price for a variant (override or base) */
function variantPrice(variant) {
  return variant.priceOverride ?? variant.product.basePrice;
}

/**
 * Creates an order with items, customer upsert, address, and totals.
 * Runs in a transaction. Used by both public checkout and owner manual creation.
 */
async function createOrder({ businessId, customerData, customerId, addressData, addressId, items, source, notes }) {
  return prisma.$transaction(async (tx) => {
    // 1. Customer — find existing by phone or create
    let customer;
    if (customerId) {
      customer = await tx.customer.findFirstOrThrow({ where: { id: customerId, businessId } });
    } else {
      customer = await tx.customer.upsert({
        where: { businessId_phone: { businessId, phone: customerData.phone } },
        update: { name: customerData.name, email: customerData.email || undefined },
        create: { businessId, name: customerData.name, phone: customerData.phone, email: customerData.email || null },
      });
    }

    // 2. Address
    let address = null;
    if (addressId) {
      address = await tx.customerAddress.findFirstOrThrow({ where: { id: addressId, customerId: customer.id } });
    } else if (addressData) {
      address = await tx.customerAddress.create({
        data: { customerId: customer.id, ...addressData, line2: addressData.line2 || null },
      });
    }

    // 3. Load variants with product + inventory, validate stock
    const variantIds = items.map(i => i.variantId);
    const variants = await tx.productVariant.findMany({
      where: { id: { in: variantIds }, product: { businessId, isActive: true } },
      include: { product: true, inventory: true },
    });
    if (variants.length !== variantIds.length) {
      const err = new Error('One or more items are unavailable');
      err.status = 400; err.code = 'ITEM_UNAVAILABLE';
      throw err;
    }

    for (const item of items) {
      const v = variants.find(x => x.id === item.variantId);
      const available = (v.inventory?.inStock ?? 0) - (v.inventory?.reserved ?? 0);
      if (available < item.quantity) {
        const err = new Error(`Insufficient stock for ${v.product.name} ${v.sizeLabel || ''}`);
        err.status = 409; err.code = 'OUT_OF_STOCK';
        throw err;
      }
    }

    // 4. Compute totals
    const business = await tx.business.findUniqueOrThrow({ where: { id: businessId } });
    let subtotal = 0;
    const orderItems = items.map(item => {
      const v = variants.find(x => x.id === item.variantId);
      const unitPrice = Number(variantPrice(v));
      const lineTotal = unitPrice * item.quantity;
      subtotal += lineTotal;
      return {
        variantId: v.id,
        productName: v.product.name,
        variantLabel: [v.sizeLabel, v.colourLabel].filter(Boolean).join(' · ') || null,
        quantity: item.quantity,
        unitPrice,
        lineTotal,
      };
    });

    const freeThreshold = business.freeShipThreshold ? Number(business.freeShipThreshold) : null;
    const flatRate = business.flatShipRate ? Number(business.flatShipRate) : 0;
    const shippingFee = freeThreshold !== null && subtotal >= freeThreshold ? 0 : flatRate;
    const total = subtotal + shippingFee;

    // 5. Create order
    const orderNumber = await nextOrderNumber(businessId);
    const order = await tx.order.create({
      data: {
        orderNumber, businessId, customerId: customer.id,
        addressId: address?.id || null,
        source, status: 'NEW',
        subtotal, shippingFee, total,
        notes: notes || null,
        items: { create: orderItems },
        statusHistory: { create: { toStatus: 'NEW', note: `Order created via ${source.toLowerCase()}` } },
      },
      include: { items: true, customer: true, address: true },
    });

    // 6. Reserve inventory inside same tx
    for (const item of items) {
      await reserveStock(tx, item.variantId, item.quantity, order.id);
    }

    // 7. Update customer aggregates
    await tx.customer.update({
      where: { id: customer.id },
      data: { totalOrders: { increment: 1 } },
    });

    return order;
  });
}

/** Status transition with side-effects (inventory commit/release, customer totals) */
const VALID_TRANSITIONS = {
  NEW: ['AWAITING_PAYMENT', 'PAYMENT_CONFIRMED', 'CANCELLED'],
  AWAITING_PAYMENT: ['PAYMENT_CONFIRMED', 'CANCELLED'],
  PAYMENT_CONFIRMED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

async function updateOrderStatus(businessId, orderId, newStatus, note) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirstOrThrow({
      where: { id: orderId, businessId },
      include: { items: true },
    });

    if (!VALID_TRANSITIONS[order.status]?.includes(newStatus)) {
      const err = new Error(`Cannot move order from ${order.status} to ${newStatus}`);
      err.status = 400; err.code = 'INVALID_TRANSITION';
      throw err;
    }

    // Side effects
    if (newStatus === 'SHIPPED') {
      for (const item of order.items) {
        if (item.variantId) await commitStock(tx, item.variantId, item.quantity, order.id);
      }
    }
    if (newStatus === 'CANCELLED') {
      for (const item of order.items) {
        if (item.variantId) await releaseStock(tx, item.variantId, item.quantity, order.id);
      }
    }
    if (newStatus === 'PAYMENT_CONFIRMED') {
      await tx.customer.update({
        where: { id: order.customerId },
        data: { totalSpent: { increment: order.total } },
      });
    }

    return tx.order.update({
      where: { id: orderId },
      data: {
        status: newStatus,
        statusHistory: { create: { fromStatus: order.status, toStatus: newStatus, note } },
      },
      include: { items: true, customer: true, address: true, payments: true, shipment: true },
    });
  });
}

module.exports = { createOrder, updateOrderStatus, nextOrderNumber };
