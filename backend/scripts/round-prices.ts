import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function roundPrices() {
  console.log('Rounding all prices to nearest dollar...');

  // Get all purchase items with prices
  const items = await prisma.purchaseItem.findMany({
    where: {
      pricePaid: { not: null }
    }
  });

  let updated = 0;
  for (const item of items) {
    if (item.pricePaid !== null) {
      const currentPrice = Number(item.pricePaid);
      const roundedPrice = Math.round(currentPrice);

      if (currentPrice !== roundedPrice) {
        await prisma.purchaseItem.update({
          where: { id: item.id },
          data: { pricePaid: roundedPrice }
        });
        console.log(`  Item ${item.id}: $${currentPrice} → $${roundedPrice}`);
        updated++;
      }
    }
  }

  console.log(`Done. Updated ${updated} prices.`);
  await prisma.$disconnect();
}

roundPrices().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
