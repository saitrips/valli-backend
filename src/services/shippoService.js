/**
 * Shippo integration — live rate shopping + label purchase.
 * Docs: https://docs.goshippo.com
 * Free tier: 30 labels/month, $0.05/label after.
 */
const { Shippo } = require('shippo');

const shippo = new Shippo({
  apiKeyHeader: process.env.SHIPPO_API_KEY || 'test'
});
/**
 * Fetch live rates for a shipment.
 * Returns normalized rate objects sorted by price.
 */
async function getRates({ fromAddress, toAddress, parcel }) {
  const shipment = await shippo.shipments.create({
    addressFrom: fromAddress,
    addressTo: toAddress,
    parcels: [parcel],
    async: false,
  });

  const rates = (shipment.rates || [])
    .filter(r => r.amount && r.servicelevel)
    .map(r => ({
      rateObjectId: r.objectId,
      carrier: r.provider,
      service: r.servicelevel.name,
      amount: parseFloat(r.amount),
      currency: r.currency,
      estimatedDays: r.estimatedDays,
      durationTerms: r.durationTerms,
      attributes: r.attributes || [], // CHEAPEST | FASTEST | BESTVALUE
    }))
    .sort((a, b) => a.amount - b.amount);

  return { shipmentObjectId: shipment.objectId, rates };
}

/**
 * Purchase a label for a chosen rate.
 * Returns tracking number + label PDF URL.
 */
async function buyLabel(rateObjectId) {
  const transaction = await shippo.transactions.create({
    rate: rateObjectId,
    labelFileType: 'PDF_4x6',
    async: false,
  });

  if (transaction.status !== 'SUCCESS') {
    const err = new Error(transaction.messages?.[0]?.text || 'Label purchase failed');
    err.status = 502; err.code = 'SHIPPO_ERROR';
    throw err;
  }

  return {
    trackingNumber: transaction.trackingNumber,
    trackingUrl: transaction.trackingUrlProvider,
    labelUrl: transaction.labelUrl,
    shippoObjectId: transaction.objectId,
  };
}

/** Helper: business → Shippo from-address */
function businessToAddress(business) {
  return {
    name: business.shipFromName || business.name,
    street1: business.shipFromStreet,
    city: business.shipFromCity,
    state: business.shipFromState,
    zip: business.shipFromZip,
    country: business.shipFromCountry || 'US',
    phone: business.whatsappNumber || undefined,
  };
}

/** Helper: order address → Shippo to-address */
function orderToAddress(order) {
  return {
    name: order.customer.name,
    street1: order.address.line1,
    street2: order.address.line2 || undefined,
    city: order.address.city,
    state: order.address.state,
    zip: order.address.zip,
    country: order.address.country || 'US',
    phone: order.customer.phone,
    email: order.customer.email || undefined,
  };
}

module.exports = { getRates, buyLabel, businessToAddress, orderToAddress };
