import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { enrichWineVintage, generateSuggestions, chatWithRemi, findThemes, suggestBoxTheme, draftCaseEmail } from '../services/remi';

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

  // Validate wine exists before enriching
  const wineExists = await prisma.wine.findUnique({ where: { id: wineId } });
  if (!wineExists) {
    return res.status(404).json({ error: 'Wine not found in collection' });
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

  res.json({ profile: enrichment.profile, drinkWindow: enrichment.drinkWindow, foodPairing: enrichment.foodPairing });
});

// Generate suggestions (with debounce — reject if generated within last 30 seconds)
let lastSuggestionTime = 0;
router.post('/suggestions', async (req: Request, res: Response) => {
  const now = Date.now();
  if (now - lastSuggestionTime < 30000) {
    // Return existing suggestions instead of regenerating
    const prismaForDebounce: PrismaClient = req.app.locals.prisma;
    const existing = await prismaForDebounce.remiSuggestion.findMany({ where: { active: true }, orderBy: { createdAt: 'desc' } });
    return res.json({ suggestions: existing.map(s => ({ id: s.id, content: s.content, wineId: s.wineId })) });
  }
  lastSuggestionTime = now;

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

  const suggestion = await prisma.remiSuggestion.findUnique({ where: { id } });
  if (!suggestion) {
    return res.status(404).json({ error: 'Suggestion not found' });
  }
  await prisma.remiSuggestion.update({
    where: { id },
    data: { active: false },
  });
  res.json({ dismissed: true });
});

// Chat with Remi
router.post('/chat', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'AI service not configured' });

  const { message, focusWineId } = req.body;
  if (!message || typeof message !== 'string' || !message.trim()) {
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

// ===== CASE BUILDER =====

// Suggest themes for a case box based on its wines
router.post('/case-suggest-theme', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'AI service not configured' });

  const { wines } = req.body;
  if (!wines || !Array.isArray(wines)) {
    return res.status(400).json({ error: 'wines array is required' });
  }

  try {
    const themes = await suggestBoxTheme(prisma, apiKey, wines);
    res.json({ themes });
  } catch (error) {
    console.error('Error suggesting box theme:', error);
    res.status(500).json({ error: 'Failed to suggest theme' });
  }
});

// Draft an email to Gerald from case boxes
router.post('/case-email', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'AI service not configured' });

  const { boxes, revision } = req.body;
  if (!boxes || !Array.isArray(boxes) || boxes.length === 0) {
    return res.status(400).json({ error: 'boxes array is required' });
  }

  try {
    const email = await draftCaseEmail(prisma, apiKey, boxes, revision);
    res.json({ email });
  } catch (error) {
    console.error('Error drafting case email:', error);
    res.status(500).json({ error: 'Failed to draft email' });
  }
});

// ===== WANT TO TRY LIST =====

router.get('/want-to-try', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const items = await prisma.wantToTry.findMany({ orderBy: { createdAt: 'desc' } });
  res.json({ items });
});

router.post('/want-to-try', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const { name, note, theme } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'name is required' });
  }
  const item = await prisma.wantToTry.create({
    data: { name: name.trim(), note: note?.trim() || null, theme: theme?.trim() || null },
  });
  res.status(201).json(item);
});

router.delete('/want-to-try/:id', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) return res.status(400).json({ error: 'id must be a number' });

  try {
    await prisma.wantToTry.delete({ where: { id } });
    res.json({ deleted: true });
  } catch {
    res.status(404).json({ error: 'Item not found' });
  }
});

export default router;
