import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();

// Get all purchase batches
router.get('/', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;

  try {
    const batches = await prisma.purchaseBatch.findMany({
      include: {
        items: {
          include: {
            wine: true,
            vintage: true,
          },
        },
      },
      orderBy: { purchaseDate: 'desc' },
    });

    res.json(batches);
  } catch (error) {
    console.error('Error fetching purchases:', error);
    res.status(500).json({ error: 'Failed to fetch purchases' });
  }
});

// Get single purchase batch
router.get('/:id', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const id = req.params.id as string;

  try {
    const batch = await prisma.purchaseBatch.findUnique({
      where: { id: parseInt(id, 10) },
      include: {
        items: {
          include: {
            wine: true,
            vintage: true,
          },
        },
      },
    });

    if (!batch) {
      return res.status(404).json({ error: 'Purchase batch not found' });
    }

    res.json(batch);
  } catch (error) {
    console.error('Error fetching purchase:', error);
    res.status(500).json({ error: 'Failed to fetch purchase' });
  }
});

// Update a purchase item (price, quantity)
router.put('/items/:id', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const id = parseInt(req.params.id as string, 10);
  const { pricePaid, quantityPurchased } = req.body;

  try {
    const item = await prisma.purchaseItem.update({
      where: { id },
      data: {
        ...(pricePaid !== undefined && { pricePaid }),
        ...(quantityPurchased !== undefined && { quantityPurchased }),
      },
      include: {
        wine: true,
        vintage: true,
        purchaseBatch: true,
      },
    });

    res.json(item);
  } catch (error) {
    console.error('Error updating purchase item:', error);
    res.status(500).json({ error: 'Failed to update purchase item' });
  }
});

// Create a purchase item for a vintage (when adding price to existing vintage)
router.post('/items', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const { vintageId, wineId, pricePaid, quantityPurchased = 1, purchaseDate } = req.body;

  try {
    // Create or find a purchase batch for this date
    const date = purchaseDate ? new Date(purchaseDate) : new Date();
    let batch = await prisma.purchaseBatch.findFirst({
      where: {
        purchaseDate: {
          gte: new Date(date.setHours(0, 0, 0, 0)),
          lt: new Date(date.setHours(23, 59, 59, 999)),
        },
      },
    });

    if (!batch) {
      batch = await prisma.purchaseBatch.create({
        data: {
          purchaseDate: new Date(purchaseDate || Date.now()),
        },
      });
    }

    const item = await prisma.purchaseItem.create({
      data: {
        purchaseBatchId: batch.id,
        vintageId,
        wineId,
        pricePaid,
        quantityPurchased,
      },
      include: {
        wine: true,
        vintage: true,
        purchaseBatch: true,
      },
    });

    res.status(201).json(item);
  } catch (error) {
    console.error('Error creating purchase item:', error);
    res.status(500).json({ error: 'Failed to create purchase item' });
  }
});

// Update a purchase batch (date, theme)
router.put('/batches/:id', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const id = parseInt(req.params.id as string, 10);
  const { purchaseDate, theme } = req.body;

  try {
    const batch = await prisma.purchaseBatch.update({
      where: { id },
      data: {
        ...(purchaseDate !== undefined && { purchaseDate: new Date(purchaseDate) }),
        ...(theme !== undefined && { theme }),
      },
    });

    res.json(batch);
  } catch (error) {
    console.error('Error updating purchase batch:', error);
    res.status(500).json({ error: 'Failed to update purchase batch' });
  }
});

export default router;
