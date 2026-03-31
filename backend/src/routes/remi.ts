import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { enrichWineVintage, generateSuggestions, chatWithRemi, findThemes } from '../services/remi';

const router = Router();

// Enrich a specific wine+vintage with Remi's profile
router.post('/enrich', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'AI service not configured' });

  const { wineId, vintageYear, wineName, color, region, appellation, grape } = req.body;

  if (!wineId || !vintageYear || !wineName) {
    return res.status(400).json({ error: 'wineId, vintageYear, and wineName are required' });
  }

  try {
    const profile = await enrichWineVintage(
      prisma, apiKey, wineId, wineName, vintageYear, color, region, appellation, grape
    );
    res.json({ profile });
  } catch (error) {
    console.error('Error enriching wine:', error);
    res.status(500).json({ error: 'Failed to enrich wine' });
  }
});

// Enrich all unenriched wines in the collection
router.post('/enrich-all', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'AI service not configured' });

  try {
    const wines = await prisma.wine.findMany({
      include: { vintages: true },
    });

    let enriched = 0;
    let skipped = 0;

    for (const wine of wines) {
      for (const vintage of wine.vintages) {
        const existing = await prisma.remiEnrichment.findUnique({
          where: { wineId_vintageYear: { wineId: wine.id, vintageYear: vintage.vintageYear } },
        });
        if (existing) {
          skipped++;
          continue;
        }

        await enrichWineVintage(
          prisma, apiKey, wine.id, wine.name, vintage.vintageYear,
          wine.color, wine.region, wine.appellation, wine.grapeVarietyOrBlend
        );
        enriched++;
      }
    }

    res.json({ enriched, skipped });
  } catch (error) {
    console.error('Error enriching all wines:', error);
    res.status(500).json({ error: 'Failed to enrich wines' });
  }
});

// Get enrichment for a specific wine+vintage
router.get('/enrichment/:wineId/:vintageYear', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const wineId = parseInt(String(req.params.wineId));
  const vintageYear = parseInt(String(req.params.vintageYear));

  if (isNaN(wineId) || isNaN(vintageYear)) {
    return res.status(400).json({ error: 'wineId and vintageYear must be numbers' });
  }

  const enrichment = await prisma.remiEnrichment.findUnique({
    where: { wineId_vintageYear: { wineId, vintageYear } },
  });

  if (!enrichment) {
    return res.status(404).json({ error: 'No enrichment found' });
  }

  res.json({ profile: enrichment.profile });
});

// Generate suggestions
router.post('/suggestions', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'AI service not configured' });

  try {
    const suggestions = await generateSuggestions(prisma, apiKey);
    res.json({ suggestions });
  } catch (error) {
    console.error('Error generating suggestions:', error);
    res.status(500).json({ error: 'Failed to generate suggestions' });
  }
});

// Get active suggestions
router.get('/suggestions', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const suggestions = await prisma.remiSuggestion.findMany({
    where: { active: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ suggestions });
});

// Dismiss a single suggestion
router.delete('/suggestions/:id', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) return res.status(400).json({ error: 'id must be a number' });

  await prisma.remiSuggestion.update({
    where: { id },
    data: { active: false },
  }).catch(() => null);

  res.json({ dismissed: true });
});

// Chat with Remi
router.post('/chat', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'AI service not configured' });

  const { message, focusWineId } = req.body;
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message is required' });
  }

  try {
    const reply = await chatWithRemi(prisma, apiKey, message, focusWineId || null);
    res.json({ reply });
  } catch (error) {
    console.error('Error in Remi chat:', error);
    res.status(500).json({ error: 'Remi is unavailable right now' });
  }
});

// Get chat history (last 50 messages)
router.get('/chat', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const messages = await prisma.remiChatMessage.findMany({
    orderBy: { createdAt: 'asc' },
    take: 50,
  });
  res.json({ messages });
});

// Clear chat history
router.delete('/chat', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const deleted = await prisma.remiChatMessage.deleteMany();
  res.json({ cleared: deleted.count });
});

// Find themes among favorites
router.post('/themes', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'AI service not configured' });

  const minRating = req.body.minRating || 7.0;

  try {
    const themes = await findThemes(prisma, apiKey, minRating);
    res.json({ themes });
  } catch (error) {
    console.error('Error finding themes:', error);
    res.status(500).json({ error: 'Failed to find themes' });
  }
});

export default router;
