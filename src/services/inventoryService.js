/**
 * Inventory operations — always called inside a transaction (tx).
 * reserved = stock committed to confirmed-but-unshipped orders.
 * Available = inStock - reserved.
 */

async function reserveStock(tx, variantId, qty, orderId) {
  const inv = await tx.inventory.findUnique({ where: { variantId } });
  if (!inv) return; // variant without tracked inventory
  await tx.inventory.update({
    where: { variantId },
    data: { reserved: { increment: qty } },
  });
  await tx.inventoryLog.create({
    data: { inventoryId: inv.id, change: -qty, reason: 'RESERVATION', orderId, note: 'Reserved on order create' },
  });
}

async function releaseStock(tx, variantId, qty, orderId) {
  const inv = await tx.inventory.findUnique({ where: { variantId } });
  if (!inv) return;
  await tx.inventory.update({
    where: { variantId },
    data: { reserved: { decrement: Math.min(qty, inv.reserved) } },
  });
  await tx.inventoryLog.create({
    data: { inventoryId: inv.id, change: qty, reason: 'RELEASE', orderId, note: 'Released on cancel' },
  });
}

async function commitStock(tx, variantId, qty, orderId) {
  const inv = await tx.inventory.findUnique({ where: { variantId } });
  if (!inv) return;
  await tx.inventory.update({
    where: { variantId },
    data: {
      inStock: { decrement: qty },
      reserved: { decrement: Math.min(qty, inv.reserved) },
    },
  });
  await tx.inventoryLog.create({
    data: { inventoryId: inv.id, change: -qty, reason: 'SALE', orderId, note: 'Committed on ship' },
  });
}

module.exports = { reserveStock, releaseStock, commitStock };
