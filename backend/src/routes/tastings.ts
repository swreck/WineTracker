import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();

// Get all tasting events with optional filters
router.get('/', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const { startDate, endDate, minRating, maxRating, limit = 50 } = req.query;

  try {
    const where: any = {};

    if (startDate) {
      where.tastingDate = { ...where.tastingDate, gte: new Date(startDate as string) };
    }
    if (endDate) {
      where.tastingDate = { ...where.tastingDate, lte: new Date(endDate as string) };
    }
    if (minRating) {
      where.rating = { ...where.rating, gte: Number(minRating) };
    }
    if (maxRating) {
      where.rating = { ...where.rating, lte: Number(maxRating) };
    }

    const tastings = await prisma.tastingEvent.findMany({
      where,
      include: {
        vintage: {
          include: {
            wine: true,
          },
        },
      },
      orderBy: { tastingDate: 'desc' },
      take: Number(limit),
    });

    res.json(tastings);
  } catch (error) {
    console.error('Error fetching tastings:', error);
    res.status(500).json({ error: 'Failed to fetch tastings' });
  }
});

// Create tasting event
router.post('/', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const { vintageId, tastingDate, rating, notes } = req.body;

  try {
    const tasting = await prisma.tastingEvent.create({
      data: {
        vintageId,
        tastingDate: new Date(tastingDate),
        rating,
        notes,
      },
      include: {
        vintage: {
          include: {
            wine: true,
          },
        },
      },
    });
    res.status(201).json(tasting);
  } catch (error) {
    console.error('Error creating tasting:', error);
    res.status(500).json({ error: 'Failed to create tasting' });
  }
});

// Update tasting event
router.put('/:id', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const id = req.params.id as string;
  const { tastingDate, rating, notes } = req.body;

  try {
    const tasting = await prisma.tastingEvent.update({
      where: { id: parseInt(id, 10) },
      data: {
        tastingDate: tastingDate ? new Date(tastingDate) : undefined,
        rating,
        notes,
      },
    });
    res.json(tasting);
  } catch (error) {
    console.error('Error updating tasting:', error);
    res.status(500).json({ error: 'Failed to update tasting' });
  }
});

// Delete tasting event
router.delete('/:id', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const id = req.params.id as string;

  try {
    await prisma.tastingEvent.delete({
      where: { id: parseInt(id, 10) },
    });
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting tasting:', error);
    res.status(500).json({ error: 'Failed to delete tasting' });
  }
});

export default router;
