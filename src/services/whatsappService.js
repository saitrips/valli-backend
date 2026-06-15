/**
 * Phase 1: wa.me link generation (no API).
 * Phase 2: swap sendMessage internals for Meta Cloud API.
 */

const TEMPLATES = {
  order_received: (o) =>
    `Hi ${first(o.customer.name)}! 👋 We received your order ${o.orderNumber}. ` +
    `Total: ${money(o.total)}. We'll confirm payment details shortly. Thank you! 🧵`,

  payment_request: (o, biz) => {
    const methods = [
      biz.zelleId && `💙 Zelle: ${biz.zelleId}`,
      biz.venmoHandle && `💜 Venmo: ${biz.venmoHandle}`,
      biz.cashappHandle && `💚 Cash App: ${biz.cashappHandle}`,
      biz.upiId && `🇮🇳 UPI: ${biz.upiId}`,
    ].filter(Boolean).join('\n');
    return `Hi ${first(o.customer.name)}! 🎉 Your order ${o.orderNumber} is ready!\n\n` +
      `Total: ${money(o.total)}\n\nPlease send payment to:\n${methods}\n\n` +
      `Once confirmed, we'll pack and ship! 📦`;
  },

  payment_confirmed: (o) =>
    `Hi ${first(o.customer.name)}! ✅ Payment confirmed for ${o.orderNumber}. ` +
    `Your items are being packed now. Tracking number coming soon! 📦`,

  shipped: (o) =>
    `Hi ${first(o.customer.name)}! 🚚 Your order ${o.orderNumber} has shipped!\n\n` +
    `Carrier: ${o.shipment?.carrier} ${o.shipment?.service}\n` +
    `Tracking: ${o.shipment?.trackingNumber}\n\nThank you for shopping with us! 💕`,

  delivered: (o) =>
    `Hi ${first(o.customer.name)}! 💕 Hope you love your order ${o.orderNumber}! ` +
    `Tag us on Instagram if you share a photo ✨`,
};

function first(name) { return (name || '').split(' ')[0]; }
function money(n) { return `$${Number(n).toFixed(2)}`; }

function buildWaLink(phone, message) {
  const clean = String(phone).replace(/\D/g, '');
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}

function getMessageLink(templateKey, order, business) {
  const fn = TEMPLATES[templateKey];
  if (!fn) {
    const err = new Error(`Unknown template: ${templateKey}`);
    err.status = 400; throw err;
  }
  const message = fn(order, business);
  return { message, waLink: buildWaLink(order.customer.phone, message) };
}

module.exports = { getMessageLink, buildWaLink, TEMPLATES };
