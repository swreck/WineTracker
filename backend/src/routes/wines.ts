import { Router, Request, Response } from 'express';
import { PrismaClient, WineColor } from '@prisma/client';

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

    const wines = await prisma.wine.findMany({
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
    });

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
