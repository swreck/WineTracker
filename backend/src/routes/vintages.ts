import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();

// Get vintage by ID
router.get('/:id', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const id = req.params.id as string;

  try {
    const vintage = await prisma.vintage.findUnique({
      where: { id: parseInt(id, 10) },
      include: {
        wine: true,
        tastingEvents: {
          orderBy: { tastingDate: 'desc' },
        },
        purchaseItems: {
          include: {
            purchaseBatch: true,
          },
        },
      },
    });

    if (!vintage) {
      return res.status(404).json({ error: 'Vintage not found' });
    }

    // Calculate average rating
    const ratings = vintage.tastingEvents.map(t => Number(t.rating));
    const avgRating = ratings.length > 0
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
      : null;

    res.json({ ...vintage, averageRating: avgRating });
  } catch (error) {
    console.error('Error fetching vintage:', error);
    res.status(500).json({ error: 'Failed to fetch vintage' });
  }
});

// Create vintage for existing wine
router.post('/', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const { wineId, vintageYear, sellerNotes, source, sourceCustom } = req.body;

  if (!wineId || !vintageYear) {
    return res.status(400).json({ error: 'wineId and vintageYear are required' });
  }

  try {
    // Check if wine exists
    const wine = await prisma.wine.findUnique({ where: { id: wineId } });
    if (!wine) {
      return res.status(404).json({ error: 'Wine not found' });
    }

    // Check if vintage already exists
    const existing = await prisma.vintage.findFirst({
      where: { wineId, vintageYear },
    });
    if (existing) {
      return res.status(400).json({ error: `Vintage ${vintageYear} already exists for this wine` });
    }

    const vintage = await prisma.vintage.create({
      data: {
        wineId,
        vintageYear,
        sellerNotes: sellerNotes || null,
        source: source || null,
        sourceCustom: sourceCustom || null,
      },
      include: {
        wine: true,
      },
    });

    res.status(201).json(vintage);
  } catch (error) {
    console.error('Error creating vintage:', error);
    res.status(500).json({ error: 'Failed to create vintage' });
  }
});

// Update vintage
router.put('/:id', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const id = req.params.id as string;
  const { vintageYear, sellerNotes, source, sourceCustom } = req.body;

  try {
    const vintage = await prisma.vintage.update({
      where: { id: parseInt(id, 10) },
      data: {
        ...(vintageYear !== undefined && { vintageYear }),
        ...(sellerNotes !== undefined && { sellerNotes }),
        ...(source !== undefined && { source }),
        ...(sourceCustom !== undefined && { sourceCustom }),
      },
    });
    res.json(vintage);
  } catch (error) {
    console.error('Error updating vintage:', error);
    res.status(500).json({ error: 'Failed to update vintage' });
  }
});

// Get favorites at vintage level
router.get('/favorites/list', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const { minRating = 7, limit = 20 } = req.query;

  try {
    const vintages = await prisma.vintage.findMany({
      include: {
        wine: true,
        tastingEvents: true,
      },
    });

    const vintagesWithRatings = vintages
      .map(vintage => {
        const ratings = vintage.tastingEvents.map(t => Number(t.rating));
        const avgRating = ratings.length > 0
          ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
          : null;

        return {
          ...vintage,
          averageRating: avgRating,
          tastingCount: ratings.length,
        };
      })
      .filter(v => v.averageRating && v.averageRating >= Number(minRating))
      .sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0))
      .slice(0, Number(limit));

    res.json(vintagesWithRatings);
  } catch (error) {
    console.error('Error fetching vintage favorites:', error);
    res.status(500).json({ error: 'Failed to fetch vintage favorites' });
  }
});

export default router;
