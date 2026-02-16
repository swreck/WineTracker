import { Router, Request, Response } from 'express';
import { PrismaClient, WineColor } from '@prisma/client';
import { withRetry } from '../utils/db';

const router = Router();

// Get all wines with optional filters
router.get('/', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const { color, search, sortBy = 'createdAt', order = 'desc' } = req.query;

  try {
    const where: any = {};

    if (color && typeof color === 'string') {
      where.color = color as WineColor;
    }

    if (search && typeof search === 'string') {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { region: { contains: search, mode: 'insensitive' } },
      ];
    }

    const wines = await withRetry(() => prisma.wine.findMany({
      where,
      include: {
        vintages: {
          include: {
            tastingEvents: true,
            purchaseItems: true,
          },
        },
      },
      orderBy: { [sortBy as string]: order },
    }));

    // Calculate average rating for each wine
    const winesWithRatings = wines.map(wine => {
      const allRatings = wine.vintages.flatMap(v =>
        v.tastingEvents.map(t => Number(t.rating))
      );
      const avgRating = allRatings.length > 0
        ? allRatings.reduce((a, b) => a + b, 0) / allRatings.length
        : null;

      return {
        ...wine,
        averageRating: avgRating ? Math.round(avgRating * 10) / 10 : null,
        tastingCount: allRatings.length,
      };
    });

    res.json(winesWithRatings);
  } catch (error) {
    console.error('Error fetching wines:', error);
    res.status(500).json({ error: 'Failed to fetch wines' });
  }
});

// Get single wine by ID
router.get('/:id', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const id = req.params.id as string;

  try {
    const wine = await prisma.wine.findUnique({
      where: { id: parseInt(id, 10) },
      include: {
        vintages: {
          include: {
            tastingEvents: {
              orderBy: { tastingDate: 'desc' },
            },
            purchaseItems: {
              include: {
                purchaseBatch: true,
              },
            },
          },
          orderBy: { vintageYear: 'desc' },
        },
      },
    });

    if (!wine) {
      return res.status(404).json({ error: 'Wine not found' });
    }

    res.json(wine);
  } catch (error) {
    console.error('Error fetching wine:', error);
    res.status(500).json({ error: 'Failed to fetch wine' });
  }
});

// Create wine
router.post('/', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const { name, color, region, appellation, grapeVarietyOrBlend } = req.body;

  try {
    const wine = await prisma.wine.create({
      data: {
        name,
        color,
        region,
        appellation,
        grapeVarietyOrBlend,
      },
    });
    res.status(201).json(wine);
  } catch (error) {
    console.error('Error creating wine:', error);
    res.status(500).json({ error: 'Failed to create wine' });
  }
});

// Create wine with vintage and optional purchase (manual entry)
router.post('/create-with-vintage', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const {
    name,
    color,
    vintageYear,
    price,
    quantity = 1,
    purchaseDate,
    sellerNotes,
    source,
    sourceCustom,
    tasting, // { rating, notes, tastingDate? }
  } = req.body;

  try {
    let wineCreated = false;
    let vintageCreated = false;
    let tastingCreated = false;

    // Find or create wine
    let wine = await prisma.wine.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });

    if (!wine) {
      wine = await prisma.wine.create({
        data: { name, color },
      });
      wineCreated = true;
    }

    // Find or create vintage
    let vintage = await prisma.vintage.findFirst({
      where: { wineId: wine.id, vintageYear },
    });

    if (!vintage) {
      vintage = await prisma.vintage.create({
        data: {
          wineId: wine.id,
          vintageYear,
          sellerNotes: sellerNotes || null,
          source: source || null,
          sourceCustom: sourceCustom || null,
        },
      });
      vintageCreated = true;
    } else if (sellerNotes || source) {
      // Update existing vintage with new info if provided
      vintage = await prisma.vintage.update({
        where: { id: vintage.id },
        data: {
          ...(sellerNotes && !vintage.sellerNotes && { sellerNotes }),
          ...(source && !vintage.source && { source, sourceCustom }),
        },
      });
    }

    // Create purchase batch and item if price or quantity provided
    if (price || quantity > 0) {
      const purchaseBatch = await prisma.purchaseBatch.create({
        data: {
          purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
        },
      });

      await prisma.purchaseItem.create({
        data: {
          purchaseBatchId: purchaseBatch.id,
          wineId: wine.id,
          vintageId: vintage.id,
          pricePaid: price || null,
          quantityPurchased: quantity || 1,
        },
      });
    }

    // Create tasting if provided
    if (tasting && tasting.rating) {
      await prisma.tastingEvent.create({
        data: {
          vintageId: vintage.id,
          rating: tasting.rating,
          notes: tasting.notes || null,
          tastingDate: tasting.tastingDate ? new Date(tasting.tastingDate) : null,
        },
      });
      tastingCreated = true;
    }

    res.status(201).json({
      wineCreated,
      vintageCreated,
      tastingCreated,
      wine,
      vintage,
    });
  } catch (error) {
    console.error('Error creating wine with vintage:', error);
    res.status(500).json({ error: 'Failed to create wine' });
  }
});

// Update wine
router.put('/:id', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const id = req.params.id as string;
  const { name, color, region, appellation, grapeVarietyOrBlend } = req.body;

  try {
    const wine = await prisma.wine.update({
      where: { id: parseInt(id, 10) },
      data: {
        name,
        color,
        region,
        appellation,
        grapeVarietyOrBlend,
      },
    });
    res.json(wine);
  } catch (error) {
    console.error('Error updating wine:', error);
    res.status(500).json({ error: 'Failed to update wine' });
  }
});

// Delete wine and all related data
router.delete('/:id', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const id = parseInt(req.params.id as string, 10);

  try {
    // Delete in order: tasting events, purchase items, vintages, then wine
    // First get all vintage IDs for this wine
    const vintages = await prisma.vintage.findMany({
      where: { wineId: id },
      select: { id: true },
    });
    const vintageIds = vintages.map(v => v.id);

    // Delete tasting events for all vintages
    await prisma.tastingEvent.deleteMany({
      where: { vintageId: { in: vintageIds } },
    });

    // Delete purchase items for this wine
    await prisma.purchaseItem.deleteMany({
      where: { wineId: id },
    });

    // Delete all vintages
    await prisma.vintage.deleteMany({
      where: { wineId: id },
    });

    // Delete the wine
    await prisma.wine.delete({
      where: { id },
    });

    res.json({ success: true, message: 'Wine and all related data deleted' });
  } catch (error) {
    console.error('Error deleting wine:', error);
    res.status(500).json({ error: 'Failed to delete wine' });
  }
});

// Delete a specific vintage
router.delete('/:wineId/vintages/:vintageId', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const vintageId = parseInt(req.params.vintageId as string, 10);

  try {
    // Delete tasting events for this vintage
    await prisma.tastingEvent.deleteMany({
      where: { vintageId },
    });

    // Delete purchase items for this vintage
    await prisma.purchaseItem.deleteMany({
      where: { vintageId },
    });

    // Delete the vintage
    await prisma.vintage.delete({
      where: { id: vintageId },
    });

    res.json({ success: true, message: 'Vintage and all related data deleted' });
  } catch (error) {
    console.error('Error deleting vintage:', error);
    res.status(500).json({ error: 'Failed to delete vintage' });
  }
});

// Preview merge - shows conflicts that need resolution
router.get('/:wine1Id/merge/:wine2Id/preview', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const wine1Id = parseInt(req.params.wine1Id as string, 10);
  const wine2Id = parseInt(req.params.wine2Id as string, 10);

  try {
    const [wine1, wine2] = await Promise.all([
      prisma.wine.findUnique({
        where: { id: wine1Id },
        include: {
          vintages: {
            include: {
              tastingEvents: true,
              purchaseItems: true,
            },
          },
        },
      }),
      prisma.wine.findUnique({
        where: { id: wine2Id },
        include: {
          vintages: {
            include: {
              tastingEvents: true,
              purchaseItems: true,
            },
          },
        },
      }),
    ]);

    if (!wine1 || !wine2) {
      return res.status(404).json({ error: 'Wine not found' });
    }

    // Find conflicts at wine level
    const wineConflicts: Array<{
      field: string;
      wine1Value: string | null;
      wine2Value: string | null;
    }> = [];

    const wineFields = ['name', 'color', 'region', 'appellation', 'grapeVarietyOrBlend'] as const;
    for (const field of wineFields) {
      const v1 = wine1[field];
      const v2 = wine2[field];
      if (v1 && v2 && v1 !== v2) {
        wineConflicts.push({
          field,
          wine1Value: v1,
          wine2Value: v2,
        });
      }
    }

    // Find vintage conflicts (same year in both wines)
    const vintageConflicts: Array<{
      vintageYear: number;
      wine1VintageId: number;
      wine2VintageId: number;
      conflicts: Array<{
        field: string;
        wine1Value: string | null;
        wine2Value: string | null;
      }>;
      wine1Tastings: number;
      wine2Tastings: number;
      wine1Purchases: number;
      wine2Purchases: number;
    }> = [];

    for (const v1 of wine1.vintages) {
      const v2 = wine2.vintages.find(v => v.vintageYear === v1.vintageYear);
      if (v2) {
        const conflicts: Array<{ field: string; wine1Value: string | null; wine2Value: string | null }> = [];

        if (v1.sellerNotes && v2.sellerNotes && v1.sellerNotes !== v2.sellerNotes) {
          conflicts.push({
            field: 'sellerNotes',
            wine1Value: v1.sellerNotes,
            wine2Value: v2.sellerNotes,
          });
        }
        if (v1.source && v2.source && v1.source !== v2.source) {
          conflicts.push({
            field: 'source',
            wine1Value: v1.source + (v1.sourceCustom ? `: ${v1.sourceCustom}` : ''),
            wine2Value: v2.source + (v2.sourceCustom ? `: ${v2.sourceCustom}` : ''),
          });
        }

        vintageConflicts.push({
          vintageYear: v1.vintageYear,
          wine1VintageId: v1.id,
          wine2VintageId: v2.id,
          conflicts,
          wine1Tastings: v1.tastingEvents.length,
          wine2Tastings: v2.tastingEvents.length,
          wine1Purchases: v1.purchaseItems.length,
          wine2Purchases: v2.purchaseItems.length,
        });
      }
    }

    // Vintages unique to each wine
    const wine1UniqueVintages = wine1.vintages
      .filter(v => !wine2.vintages.some(v2 => v2.vintageYear === v.vintageYear))
      .map(v => ({ year: v.vintageYear, tastings: v.tastingEvents.length, purchases: v.purchaseItems.length }));

    const wine2UniqueVintages = wine2.vintages
      .filter(v => !wine1.vintages.some(v1 => v1.vintageYear === v.vintageYear))
      .map(v => ({ year: v.vintageYear, tastings: v.tastingEvents.length, purchases: v.purchaseItems.length }));

    res.json({
      wine1: { id: wine1.id, name: wine1.name },
      wine2: { id: wine2.id, name: wine2.name },
      wineConflicts,
      vintageConflicts,
      wine1UniqueVintages,
      wine2UniqueVintages,
      hasConflicts: wineConflicts.length > 0 || vintageConflicts.some(vc => vc.conflicts.length > 0),
    });
  } catch (error) {
    console.error('Error previewing merge:', error);
    res.status(500).json({ error: 'Failed to preview merge' });
  }
});

// Merge two wines with conflict resolution
// Body: { resolutions: { wineFields: { field: 'wine1' | 'wine2' }, vintages: { year: { field: 'wine1' | 'wine2' } } } }
router.post('/:wine1Id/merge/:wine2Id', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const wine1Id = parseInt(req.params.wine1Id as string, 10);
  const wine2Id = parseInt(req.params.wine2Id as string, 10);
  const { resolutions } = req.body as {
    resolutions?: {
      wineFields?: Record<string, 'wine1' | 'wine2'>;
      vintages?: Record<string, Record<string, 'wine1' | 'wine2'>>;
    };
  };

  if (wine1Id === wine2Id) {
    return res.status(400).json({ error: 'Cannot merge wine with itself' });
  }

  try {
    // Get both wines with their vintages
    const [wine1, wine2] = await Promise.all([
      prisma.wine.findUnique({
        where: { id: wine1Id },
        include: {
          vintages: {
            include: {
              tastingEvents: true,
              purchaseItems: true,
            },
          },
        },
      }),
      prisma.wine.findUnique({
        where: { id: wine2Id },
        include: {
          vintages: {
            include: {
              tastingEvents: true,
              purchaseItems: true,
            },
          },
        },
      }),
    ]);

    if (!wine1) {
      return res.status(404).json({ error: 'First wine not found' });
    }
    if (!wine2) {
      return res.status(404).json({ error: 'Second wine not found' });
    }

    const results = {
      vintagesMoved: 0,
      vintagesMerged: 0,
      tastingsMoved: 0,
      purchaseItemsMoved: 0,
    };

    // Determine final wine field values based on resolutions
    const wineFieldResolutions = resolutions?.wineFields || {};
    const finalWineData: Record<string, string | null> = {};

    const wineFields = ['name', 'color', 'region', 'appellation', 'grapeVarietyOrBlend'] as const;
    for (const field of wineFields) {
      const choice = wineFieldResolutions[field];
      if (choice === 'wine2') {
        finalWineData[field] = wine2[field];
      } else if (choice === 'wine1') {
        finalWineData[field] = wine1[field];
      } else {
        // Default: use wine1's value if it has one, otherwise wine2's
        finalWineData[field] = wine1[field] || wine2[field];
      }
    }

    // Update wine1 with resolved values
    await prisma.wine.update({
      where: { id: wine1Id },
      data: finalWineData as any,
    });

    // Process vintages
    const vintageResolutions = resolutions?.vintages || {};

    for (const v2 of wine2.vintages) {
      const v1 = wine1.vintages.find(v => v.vintageYear === v2.vintageYear);

      if (v1) {
        // Same vintage year - merge with conflict resolution
        const yearRes = vintageResolutions[String(v2.vintageYear)] || {};

        // Determine seller notes
        let sellerNotes = v1.sellerNotes;
        if (yearRes.sellerNotes === 'wine2') {
          sellerNotes = v2.sellerNotes;
        } else if (!sellerNotes) {
          sellerNotes = v2.sellerNotes;
        }

        // Determine source
        let source = v1.source;
        let sourceCustom = v1.sourceCustom;
        if (yearRes.source === 'wine2') {
          source = v2.source;
          sourceCustom = v2.sourceCustom;
        } else if (!source) {
          source = v2.source;
          sourceCustom = v2.sourceCustom;
        }

        // Update v1 with resolved values
        await prisma.vintage.update({
          where: { id: v1.id },
          data: { sellerNotes, source, sourceCustom },
        });

        // Move tastings from v2 to v1
        await prisma.tastingEvent.updateMany({
          where: { vintageId: v2.id },
          data: { vintageId: v1.id },
        });
        results.tastingsMoved += v2.tastingEvents.length;

        // Move purchase items from v2 to v1
        await prisma.purchaseItem.updateMany({
          where: { vintageId: v2.id },
          data: { vintageId: v1.id, wineId: wine1Id },
        });
        results.purchaseItemsMoved += v2.purchaseItems.length;

        // Delete the now-empty v2
        await prisma.vintage.delete({
          where: { id: v2.id },
        });

        results.vintagesMerged++;
      } else {
        // Unique vintage year - move to wine1
        await prisma.vintage.update({
          where: { id: v2.id },
          data: { wineId: wine1Id },
        });

        await prisma.purchaseItem.updateMany({
          where: { vintageId: v2.id },
          data: { wineId: wine1Id },
        });

        results.vintagesMoved++;
        results.tastingsMoved += v2.tastingEvents.length;
        results.purchaseItemsMoved += v2.purchaseItems.length;
      }
    }

    // Delete the now-empty wine2
    await prisma.wine.delete({
      where: { id: wine2Id },
    });

    res.json({
      success: true,
      keptWine: wine1.name,
      deletedWine: wine2.name,
      results,
    });
  } catch (error) {
    console.error('Error merging wines:', error);
    res.status(500).json({ error: 'Failed to merge wines' });
  }
});

// Get favorites (highest rated wines)
router.get('/favorites/list', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const { minRating = 7, color, limit = 20 } = req.query;

  try {
    const wines = await prisma.wine.findMany({
      where: color ? { color: color as WineColor } : undefined,
      include: {
        vintages: {
          include: {
            tastingEvents: true,
          },
        },
      },
    });

    const winesWithRatings = wines
      .map(wine => {
        const allRatings = wine.vintages.flatMap(v =>
          v.tastingEvents.map(t => Number(t.rating))
        );
        const avgRating = allRatings.length > 0
          ? allRatings.reduce((a, b) => a + b, 0) / allRatings.length
          : null;

        return {
          ...wine,
          averageRating: avgRating ? Math.round(avgRating * 10) / 10 : null,
          tastingCount: allRatings.length,
        };
      })
      .filter(w => w.averageRating && w.averageRating >= Number(minRating))
      .sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0))
      .slice(0, Number(limit));

    res.json(winesWithRatings);
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
});

export default router;
