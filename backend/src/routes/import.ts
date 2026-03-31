import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { parseText } from '../parser/parser';
import { aiParseLabel, aiParseLabelImage, aiParseReceipt } from '../parser/ai-parser';
import { findPotentialMatches, normalizeWineName, shouldAutoMatch, PotentialMatch } from '../utils/fuzzy';

const router = Router();

// Parse date string as local date (avoiding timezone issues)
function parseLocalDate(dateStr: string): Date {
  return new Date(dateStr + 'T12:00:00');
}

// Preview endpoint - AI-powered for labels, rules+AI for receipts
router.post('/preview', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const { text, mode } = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Text is required' });
  }

  try {
    let batches: any[];
    let ambiguities: any[] = [];

    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (mode === 'label') {
      // Pure AI parsing for labels
      if (!apiKey) {
        return res.status(500).json({ error: 'AI service not configured' });
      }
      const result = await aiParseLabel(text, apiKey, prisma);
      batches = result.batches;
      ambiguities = result.ambiguities;
    } else if (mode === 'receipt' && apiKey) {
      // Rules first, then AI cleanup for receipts
      const rulesResult = parseText(text);
      const aiResult = await aiParseReceipt(text, rulesResult, apiKey, prisma);
      batches = aiResult.batches;
      ambiguities = [...rulesResult.ambiguities, ...aiResult.ambiguities];
    } else {
      // Fallback to pure rules (standard mode or no API key)
      const result = parseText(text);
      batches = result.batches;
      ambiguities = result.ambiguities;
    }

    // Normalize batch dates - ensure purchaseDate is set
    for (const batch of batches) {
      if (batch.purchaseDate && typeof batch.purchaseDate === 'string') {
        batch.purchaseDate = new Date(batch.purchaseDate);
      } else if (!batch.purchaseDate) {
        batch.purchaseDate = new Date();
      }
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

    // Track existing exact matches
    const existingMatches: { name: string; vintageYear: number; message: string }[] = [];

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      for (let itemIndex = 0; itemIndex < (batch.items || []).length; itemIndex++) {
        const item = batch.items[itemIndex];

        // Check for exact case-insensitive match
        const exactMatch = existingWines.find(
          w => w.name.toLowerCase() === item.name.toLowerCase()
        );

        if (exactMatch) {
          existingMatches.push({
            name: item.name,
            vintageYear: item.vintageYear,
            message: 'Will add new purchase record to existing wine',
          });
          continue;
        }

        // Look for fuzzy matches
        const matches = findPotentialMatches(item.name, existingWines);
        const needsAttention = matches.filter(m => !shouldAutoMatch(m));

        if (needsAttention.length > 0) {
          potentialMatches.push({
            batchIndex,
            itemIndex,
            importedName: item.name,
            matches: needsAttention.slice(0, 3)
          });
        }
      }
    }

    const itemCount = batches.reduce((sum: number, b: any) => sum + (b.items?.length || 0), 0);
    const tastingCount = batches.reduce(
      (sum: number, b: any) => sum + (b.items || []).reduce((s: number, i: any) => s + (i.tastings?.length || 0), 0),
      0
    );

    res.json({
      batches,
      ambiguities,
      potentialMatches,
      existingMatches,
      summary: {
        batchCount: batches.length,
        itemCount,
        tastingCount,
        ambiguityCount: ambiguities.length,
        existingCount: existingMatches.length,
        newCount: itemCount - existingMatches.length,
        potentialMatchCount: potentialMatches.length,
      },
    });
  } catch (error) {
    console.error('Error parsing import:', error);
    res.status(500).json({ error: 'Failed to parse import text' });
  }
});

// Execute import - accepts edited items directly
router.post('/execute', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const { text, mode, matchDecisions, editedBatches } = req.body;

  // editedBatches: if provided, use these instead of re-parsing
  // This supports inline editing of parsed results
  // matchDecisions: { [importedName: string]: number | null }

  try {
    let batches: any[];

    if (editedBatches) {
      // Use the user-edited data directly
      batches = editedBatches;
    } else if (text) {
      // Re-parse from text (legacy path)
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (mode === 'label' && apiKey) {
        const result = await aiParseLabel(text, apiKey, prisma);
        batches = result.batches;
      } else if (mode === 'receipt' && apiKey) {
        const rulesResult = parseText(text);
        const aiResult = await aiParseReceipt(text, rulesResult, apiKey, prisma);
        batches = aiResult.batches;
      } else {
        const result = parseText(text);
        batches = result.batches;
      }
    } else {
      return res.status(400).json({ error: 'Either text or editedBatches is required' });
    }

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

    const importedWineIds: number[] = [];

    for (const batch of batches) {
      // Parse purchase date - truly optional
      let purchaseDate: Date | null = null;
      if (batch.purchaseDate) {
        purchaseDate = typeof batch.purchaseDate === 'string'
          ? new Date(batch.purchaseDate)
          : batch.purchaseDate;
      }

      // Defer purchase batch creation until we have at least one valid item
      let purchaseBatch: any = null;

      for (const item of (batch.items || [])) {
        // Skip items without a name
        if (!item.name || item.name.trim().length < 2) continue;

        let wine = null;

        // Check if user made an explicit match decision
        if (matchDecisions && matchDecisions[item.name] !== undefined) {
          const decision = matchDecisions[item.name];
          if (decision !== null) {
            wine = await prisma.wine.findUnique({ where: { id: decision } });
            if (wine) results.winesMatched++;
          }
        }

        // If no explicit decision, try to match
        if (!wine) {
          wine = await prisma.wine.findFirst({
            where: { name: { equals: item.name, mode: 'insensitive' } },
          });

          if (!wine) {
            const normImported = normalizeWineName(item.name);
            const normalizedMatch = existingWines.find(
              w => normalizeWineName(w.name) === normImported
            );
            if (normalizedMatch) {
              wine = await prisma.wine.findUnique({ where: { id: normalizedMatch.id } });
            }
          }

          if (wine) results.winesMatched++;
        }

        // Create new wine if no match
        if (!wine) {
          wine = await prisma.wine.create({
            data: { name: item.name, color: item.color || 'red' },
          });
          results.winesCreated++;
        }

        if (!importedWineIds.includes(wine.id)) {
          importedWineIds.push(wine.id);
        }

        // Skip vintage creation if no valid year
        const vintageYear = item.vintageYear || 0;
        if (vintageYear === 0) continue;

        // Find or create vintage
        let vintage = await prisma.vintage.findFirst({
          where: { wineId: wine.id, vintageYear },
        });

        if (!vintage) {
          vintage = await prisma.vintage.create({
            data: {
              wineId: wine.id,
              vintageYear,
              sellerNotes: item.sellerNotes || null,
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

        // Create purchase batch lazily on first item
        if (!purchaseBatch) {
          purchaseBatch = await prisma.purchaseBatch.create({
            data: { purchaseDate, theme: batch.theme },
          });
          results.purchaseBatchesCreated++;
        }

        // Create purchase item
        await prisma.purchaseItem.create({
          data: {
            purchaseBatchId: purchaseBatch.id,
            wineId: wine.id,
            vintageId: vintage.id,
            pricePaid: item.price ? Math.round(item.price) : null,
            quantityPurchased: item.quantity || 1,
          },
        });
        results.purchaseItemsCreated++;

        // Create tastings
        for (const tasting of (item.tastings || [])) {
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
                tastingDate: tasting.date || null,
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
      importedWineIds,
      ambiguities: [],
    });
  } catch (error) {
    console.error('Error executing import:', error);
    res.status(500).json({ error: 'Failed to execute import' });
  }
});

// Save corrections for learning
router.post('/corrections', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const { corrections, mode } = req.body;

  // corrections: [{ fieldName, wrongValue, correctValue, originalText }]
  if (!corrections || !Array.isArray(corrections)) {
    return res.status(400).json({ error: 'corrections array is required' });
  }

  try {
    for (const c of corrections) {
      if (c.wrongValue !== c.correctValue) {
        await prisma.parseCorrection.create({
          data: {
            mode: mode || 'receipt',
            originalText: (c.originalText || '').slice(0, 500),
            fieldName: c.fieldName,
            wrongValue: String(c.wrongValue),
            correctValue: String(c.correctValue),
          },
        });
      }
    }
    res.json({ success: true, saved: corrections.length });
  } catch (error) {
    console.error('Error saving corrections:', error);
    res.status(500).json({ error: 'Failed to save corrections' });
  }
});

// Label image scanning - accepts base64 image, returns parsed wine data
router.post('/scan-label', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const { image, mediaType } = req.body;

  if (!image || typeof image !== 'string') {
    return res.status(400).json({ error: 'Base64 image data is required' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'AI service not configured' });
  }

  const resolvedMediaType = mediaType || 'image/jpeg';

  try {
    const result = await aiParseLabelImage(image, resolvedMediaType, apiKey, prisma);

    // Get existing wines for fuzzy matching
    const existingWines = await prisma.wine.findMany({
      select: { id: true, name: true }
    });

    const potentialMatches: any[] = [];
    for (const batch of result.batches) {
      for (const item of (batch.items || [])) {
        const exactMatch = existingWines.find(
          w => w.name.toLowerCase() === item.name.toLowerCase()
        );
        if (!exactMatch) {
          const matches = findPotentialMatches(item.name, existingWines);
          const needsAttention = matches.filter(m => !shouldAutoMatch(m));
          if (needsAttention.length > 0) {
            potentialMatches.push({
              importedName: item.name,
              matches: needsAttention.slice(0, 3),
            });
          }
        }
      }
    }

    res.json({
      ...result,
      potentialMatches,
      summary: {
        batchCount: result.batches.length,
        itemCount: result.batches.reduce((sum, b) => sum + (b.items?.length || 0), 0),
        tastingCount: 0,
        ambiguityCount: result.ambiguities.length,
        potentialMatchCount: potentialMatches.length,
      },
    });
  } catch (error) {
    console.error('Error scanning label:', error);
    res.status(500).json({ error: 'Failed to scan label image' });
  }
});

export default router;
