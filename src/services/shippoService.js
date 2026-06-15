/**
 * Shippo integration — live rate shopping + label purchase.
 * Docs: https://docs.goshippo.com
 * Free tier: 30 labels/month, $0.05/label after.
 */
const shippo = require('shippo')({
  apiKey: process.env.SHIPPO_API_KEY || 'test'
});
/**
 * Fetch live rates for a shipment.
 * Returns normalized rate objects sorted by price.
 */
async function getRates({ fromAddress, toAddress, parcel }) {
  const shipment = await shippo.shipment.create({
    address_from: fromAddress,
    address_to: toAddress,
    parcels: [parcel],
    async: false,
  });

  const rates = (shipment.rates || [])
    .filter(r => r.amount && r.servicelevel)
    .map(r => ({
      rateObjectId: r.object_id,
      carrier: r.provider,
      service: r.servicelevel.name,
      amount: parseFloat(r.amount),
      currency: r.currency,
      estimatedDays: r.estimated_days,
      durationTerms: r.duration_terms,
      attributes: r.attributes || [], // CHEAPEST | FASTEST | BESTVALUE
    }))
    .sort((a, b) => a.amount - b.amount);

  return { shipmentObjectId: shipment.object_id, rates };
}

/**
 * Purchase a label for a chosen rate.
 * Returns tracking number + label PDF URL.
 */
async function buyLabel(rateObjectId) {
  const transaction = await shippo.transaction.create({
    rate: rateObjectId,
    label_file_type: 'PDF_4x6',
    async: false,
  });

  if (transaction.status !== 'SUCCESS') {
    const err = new Error(transaction.messages?.[0]?.text || 'Label purchase failed');
    err.status = 502; err.code = 'SHIPPO_ERROR';
    throw err;
  }

  return {
    trackingNumber: transaction.tracking_number,
    trackingUrl: transaction.tracking_url_provider,
    labelUrl: transaction.label_url,
    shippoObjectId: transaction.object_id,
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
