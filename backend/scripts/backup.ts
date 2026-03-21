import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function backup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupDir = path.join(__dirname, '../../backups');
  const backupFile = path.join(backupDir, `wine-backup-${timestamp}.json`);

  // Ensure backup directory exists
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  console.log('Backing up database...');

  // Export all tables
  const [wines, vintages, tastingEvents, purchaseBatches, purchaseItems] = await Promise.all([
    prisma.wine.findMany(),
    prisma.vintage.findMany(),
    prisma.tastingEvent.findMany(),
    prisma.purchaseBatch.findMany(),
    prisma.purchaseItem.findMany(),
  ]);

  const backup = {
    exportedAt: new Date().toISOString(),
    counts: {
      wines: wines.length,
      vintages: vintages.length,
      tastingEvents: tastingEvents.length,
      purchaseBatches: purchaseBatches.length,
      purchaseItems: purchaseItems.length,
    },
    data: {
      wines,
      vintages,
      tastingEvents,
      purchaseBatches,
      purchaseItems,
    },
  };

  fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));

  console.log(`Backup complete: ${backupFile}`);
  console.log(`  Wines: ${wines.length}`);
  console.log(`  Vintages: ${vintages.length}`);
  console.log(`  Tastings: ${tastingEvents.length}`);
  console.log(`  Purchase Batches: ${purchaseBatches.length}`);
  console.log(`  Purchase Items: ${purchaseItems.length}`);

  await prisma.$disconnect();
}

backup().catch((e) => {
  console.error('Backup failed:', e);
  prisma.$disconnect();
  process.exit(1);
});
