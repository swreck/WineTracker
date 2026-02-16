import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { parseText, parseReceiptText, parseLabelText } from '../parser/parser';
import { findPotentialMatches, normalizeWineName, shouldAutoMatch, PotentialMatch } from '../utils/fuzzy';

const router = Router();

// Preview endpoint - now includes fuzzy match detection
router.post('/preview', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
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

    // Get all existing wines for fuzzy matching
    const existingWines = await prisma.wine.findMany({
      select: { id: true, name: true }
    });

    // Check each parsed item for potential matches
    const potentialMatches: {
      itemIndex: number;
      batchIndex: number;
      importedName: string;
      matches: PotentialMatch[];
    }[] = [];

    for (let batchIndex = 0; batchIndex < result.batches.length; batchIndex++) {
      const batch = result.batches[batchIndex];
      for (let itemIndex = 0; itemIndex < batch.items.length; itemIndex++) {
        const item = batch.items[itemIndex];

        // Check for exact case-insensitive match first
        const exactMatch = existingWines.find(
          w => w.name.toLowerCase() === item.name.toLowerCase()
        );

        if (exactMatch) {
          // Exact match - no need to flag
          continue;
        }

        // Look for fuzzy matches
        const matches = findPotentialMatches(item.name, existingWines);

        // Filter to only non-exact matches that need user attention
        const needsAttention = matches.filter(m => !shouldAutoMatch(m));

        if (needsAttention.length > 0) {
          potentialMatches.push({
            batchIndex,
            itemIndex,
            importedName: item.name,
            matches: needsAttention.slice(0, 3) // Top 3 suggestions
          });
        }
      }
    }

    const itemCount = result.batches.reduce((sum, b) => sum + b.items.length, 0);
    const tastingCount = result.batches.reduce(
      (sum, b) => sum + b.items.reduce((s, i) => s + i.tastings.length, 0),
      0
    );

    res.json({
      batches: result.batches,
      ambiguities: result.ambiguities,
      potentialMatches,
      summary: {
        batchCount: result.batches.length,
        itemCount,
        tastingCount,
        ambiguityCount: result.ambiguities.length,
        potentialMatchCount: potentialMatches.length,
      },
    });
  } catch (error) {
    console.error('Error parsing import:', error);
    res.status(500).json({ error: 'Failed to parse import text' });
  }
});

// Execute import - uses normalized matching and accepts user match decisions
router.post('/execute', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const { text, mode, matchDecisions } = req.body;

  // matchDecisions: { [importedName: string]: number | null }
  // - number = use existing wine with this ID
  // - null = create new wine (user rejected match)

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

    // Get all existing wines for matching
    const existingWines = await prisma.wine.findMany({
      select: { id: true, name: true }
    });

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
        let wine = null;

        // Check if user made an explicit match decision
        if (matchDecisions && matchDecisions[item.name] !== undefined) {
          const decision = matchDecisions[item.name];
          if (decision !== null) {
            // User chose to match with existing wine
            wine = await prisma.wine.findUnique({ where: { id: decision } });
            if (wine) {
              results.winesMatched++;
            }
          }
          // If decision is null, user wants a new wine (fall through)
        }

        // If no explicit decision, try to match
        if (!wine) {
          // First: exact case-insensitive match
          wine = await prisma.wine.findFirst({
            where: {
              name: { equals: item.name, mode: 'insensitive' },
            },
          });

          // Second: normalized exact match (catches accent differences)
          if (!wine) {
            const normImported = normalizeWineName(item.name);
            const normalizedMatch = existingWines.find(
              w => normalizeWineName(w.name) === normImported
            );
            if (normalizedMatch) {
              wine = await prisma.wine.findUnique({
                where: { id: normalizedMatch.id }
              });
            }
          }

          if (wine) {
            results.winesMatched++;
          }
        }

        // Create new wine if no match
        if (!wine) {
          wine = await prisma.wine.create({
            data: {
              name: item.name,
              color: item.color,
            },
          });
          results.winesCreated++;
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

        // Create purchase item (round price to nearest dollar)
        await prisma.purchaseItem.create({
          data: {
            purchaseBatchId: purchaseBatch.id,
            wineId: wine.id,
            vintageId: vintage.id,
            pricePaid: item.price ? Math.round(item.price) : null,
            quantityPurchased: item.quantity,
          },
        });
        results.purchaseItemsCreated++;

        // Create tastings (skip duplicates)
        for (const tasting of item.tastings) {
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
