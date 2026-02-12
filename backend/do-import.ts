import { parseText } from './src/parser/parser';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

// Read the real data file and extract the data string
const fileContent = fs.readFileSync('./real-data-test.ts', 'utf8');
const match = fileContent.match(/const realData = `([\s\S]*?)`;/);
if (!match) {
  console.error('Could not extract data from real-data-test.ts');
  process.exit(1);
}

const realData = match[1];

async function runImport() {
  console.log('Parsing data...');
  const result = parseText(realData);

  let stats = { wines: 0, vintages: 0, purchases: 0, tastings: 0 };

  for (const batch of result.batches) {
    const purchaseBatch = await prisma.purchaseBatch.create({
      data: { purchaseDate: batch.purchaseDate, theme: batch.theme }
    });

    for (const item of batch.items) {
      let wine = await prisma.wine.findFirst({
        where: { name: { equals: item.name, mode: 'insensitive' } }
      });

      if (!wine) {
        wine = await prisma.wine.create({
          data: { name: item.name, color: item.color }
        });
        stats.wines++;
      }

      let vintage = await prisma.vintage.findFirst({
        where: { wineId: wine.id, vintageYear: item.vintageYear }
      });

      if (!vintage) {
        vintage = await prisma.vintage.create({
          data: {
            wineId: wine.id,
            vintageYear: item.vintageYear,
            sellerNotes: item.sellerNotes
          }
        });
        stats.vintages++;
      }

      if (item.price) {
        await prisma.purchaseItem.create({
          data: {
            purchaseBatchId: purchaseBatch.id,
            wineId: wine.id,
            vintageId: vintage.id,
            pricePaid: item.price,
            quantityPurchased: item.quantity
          }
        });
        stats.purchases++;
      }

      for (const tasting of item.tastings) {
        if (tasting.rating === 0 && !tasting.notes) continue;
        await prisma.tastingEvent.create({
          data: {
            vintageId: vintage.id,
            tastingDate: tasting.date,
            rating: tasting.rating || 0,
            notes: tasting.notes
          }
        });
        stats.tastings++;
      }
    }
  }

  console.log('\n=== IMPORT COMPLETE ===');
  console.log('Wines:', stats.wines);
  console.log('Vintages:', stats.vintages);
  console.log('Purchases:', stats.purchases);
  console.log('Tastings:', stats.tastings);

  await prisma.$disconnect();
}

runImport().catch(console.error);
