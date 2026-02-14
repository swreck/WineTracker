import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { parseText, parseReceiptText, parseLabelText } from '../parser/parser';

const router = Router();

// Preview endpoint
router.post('/preview', async (req: Request, res: Response) => {
  const { text, mode } = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Text is required' });
  }

  try {
    // Use appropriate parser based on mode
    let result;
    if (mode === 'receipt') {
      result = parseReceiptText(text);
    } else if (mode === 'label') {
      result = parseLabelText(text);
    } else {
      result = parseText(text);
    }

    const itemCount = result.batches.reduce((sum, b) => sum + b.items.length, 0);
    const tastingCount = result.batches.reduce(
      (sum, b) => sum + b.items.reduce((s, i) => s + i.tastings.length, 0),
      0
    );

    res.json({
      batches: result.batches,
      ambiguities: result.ambiguities,
      summary: {
        batchCount: result.batches.length,
        itemCount,
        tastingCount,
        ambiguityCount: result.ambiguities.length,
      },
    });
  } catch (error) {
    console.error('Error parsing import:', error);
    res.status(500).json({ error: 'Failed to parse import text' });
  }
});

// Execute import
router.post('/execute', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const { text, mode } = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Text is required' });
  }

  try {
    let parseResult;
    if (mode === 'receipt') {
      parseResult = parseReceiptText(text);
    } else if (mode === 'label') {
      parseResult = parseLabelText(text);
    } else {
      parseResult = parseText(text);
    }
    const { batches, ambiguities } = parseResult;

    const results = {
      winesCreated: 0,
      winesMatched: 0,
      vintagesCreated: 0,
      vintagesMatched: 0,
      purchaseBatchesCreated: 0,
      purchaseItemsCreated: 0,
      tastingsCreated: 0,
    };

    for (const batch of batches) {
      const purchaseBatch = await prisma.purchaseBatch.create({
        data: {
          purchaseDate: batch.purchaseDate,
          theme: batch.theme,
        },
      });
      results.purchaseBatchesCreated++;

      for (const item of batch.items) {
        // Find or create wine
        let wine = await prisma.wine.findFirst({
          where: {
            name: { equals: item.name, mode: 'insensitive' },
          },
        });

        if (!wine) {
          wine = await prisma.wine.create({
            data: {
              name: item.name,
              color: item.color,
            },
          });
          results.winesCreated++;
        } else {
          results.winesMatched++;
        }

        // Find or create vintage
        let vintage = await prisma.vintage.findFirst({
          where: {
            wineId: wine.id,
            vintageYear: item.vintageYear,
          },
        });

        if (!vintage) {
          vintage = await prisma.vintage.create({
            data: {
              wineId: wine.id,
              vintageYear: item.vintageYear,
              sellerNotes: item.sellerNotes,
            },
          });
          results.vintagesCreated++;
        } else {
          results.vintagesMatched++;
          if (item.sellerNotes && !vintage.sellerNotes) {
            await prisma.vintage.update({
              where: { id: vintage.id },
              data: { sellerNotes: item.sellerNotes },
            });
          }
        }

        // Create purchase item
        await prisma.purchaseItem.create({
          data: {
            purchaseBatchId: purchaseBatch.id,
            wineId: wine.id,
            vintageId: vintage.id,
            pricePaid: item.price,
            quantityPurchased: item.quantity,
          },
        });
        results.purchaseItemsCreated++;

        // Create tastings (skip duplicates)
        // Tastings can have: rating only, notes only, or both
        for (const tasting of item.tastings) {
          // Skip if no rating AND no notes
          if (tasting.rating === 0 && !tasting.notes) continue;

          const existingTasting = await prisma.tastingEvent.findFirst({
            where: {
              vintageId: vintage.id,
              tastingDate: tasting.date,
              ...(tasting.rating > 0 ? { rating: tasting.rating } : {}),
            },
          });

          if (!existingTasting) {
            await prisma.tastingEvent.create({
              data: {
                vintageId: vintage.id,
                tastingDate: tasting.date,
                rating: tasting.rating || 0,
                notes: tasting.notes,
              },
            });
            results.tastingsCreated++;
          }
        }

      }
    }

    res.json({
      success: true,
      results,
      ambiguities,
    });
  } catch (error) {
    console.error('Error executing import:', error);
    res.status(500).json({ error: 'Failed to execute import' });
  }
});

export default router;
