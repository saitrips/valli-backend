/** Seed: demo business with products, customers, orders */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const business = await prisma.business.upsert({
    where: { slug: 'varnieka' },
    update: {},
    create: {
      ownerId: 'demo-owner-uuid-0001',
      name: 'Varnieka',
      slug: 'varnieka',
      whatsappNumber: '+14708419549',
      currency: 'USD',
      zelleId: 'label.varnieka@gmail.com',
      venmoHandle: '@varnieka',
      heroMessage: 'A Celebration of Colors ✨ Indian & Indo-Western Outfits',
      shipFromName: 'Varnieka LLC',
      shipFromStreet: '245 Roswell Road',
      shipFromCity: 'Atlanta',
      shipFromState: 'GA',
      shipFromZip: '30328',
      freeShipThreshold: 150,
      flatShipRate: 15,
    },
  });

  const productsData = [
    { name: 'Kanjivaram Silk Saree', category: 'Sarees', basePrice: 189, compareAt: 220,
      variants: [{ sizeLabel: 'Free Size', colourLabel: 'Deep Red', colourHex: '#8B1A1A', stock: 8 },
                 { sizeLabel: 'Free Size', colourLabel: 'Royal Blue', colourHex: '#1A5276', stock: 5 }] },
    { name: 'Bridal Lehenga Set', category: 'Lehengas', basePrice: 420, compareAt: 500,
      variants: [{ sizeLabel: 'S', colourLabel: 'Maroon', colourHex: '#C0392B', stock: 3 },
                 { sizeLabel: 'M', colourLabel: 'Maroon', colourHex: '#C0392B', stock: 4 },
                 { sizeLabel: 'L', colourLabel: 'Maroon', colourHex: '#C0392B', stock: 2 }] },
    { name: 'Blue Anarkali Suit', category: 'Anarkalis', basePrice: 95, compareAt: 110,
      variants: [{ sizeLabel: 'S', colourLabel: 'Navy', colourHex: '#1A5276', stock: 6 },
                 { sizeLabel: 'M', colourLabel: 'Navy', colourHex: '#1A5276', stock: 10 },
                 { sizeLabel: 'L', colourLabel: 'Navy', colourHex: '#1A5276', stock: 7 },
                 { sizeLabel: 'XL', colourLabel: 'Navy', colourHex: '#1A5276', stock: 4 }] },
    { name: 'Floral Anarkali Kurta', category: 'Kurtas', basePrice: 68,
      variants: [{ sizeLabel: 'XS', colourLabel: 'Ivory', colourHex: '#E8D5B0', stock: 2 },
                 { sizeLabel: 'S', colourLabel: 'Ivory', colourHex: '#E8D5B0', stock: 9 },
                 { sizeLabel: 'M', colourLabel: 'Ivory', colourHex: '#E8D5B0', stock: 12 }] },
    { name: 'Indo-Western Co-ord Set', category: 'Co-ords', basePrice: 78,
      variants: [{ sizeLabel: 'S', colourLabel: 'Cream', colourHex: '#F0E6D3', stock: 5 },
                 { sizeLabel: 'M', colourLabel: 'Cream', colourHex: '#F0E6D3', stock: 0 }] },
  ];

  for (const [i, p] of productsData.entries()) {
    await prisma.product.create({
      data: {
        businessId: business.id,
        name: p.name, category: p.category,
        basePrice: p.basePrice, compareAt: p.compareAt || null,
        sortOrder: i,
        variants: {
          create: p.variants.map(v => ({
            sizeLabel: v.sizeLabel, colourLabel: v.colourLabel, colourHex: v.colourHex,
            inventory: { create: { inStock: v.stock } },
          })),
        },
      },
    });
  }

  console.log('✅ Seeded business:', business.slug);
}

main().catch(console.error).finally(() => prisma.$disconnect());
