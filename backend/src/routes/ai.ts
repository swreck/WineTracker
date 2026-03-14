import { Router, Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';

const router = Router();

router.post('/tell-me-more', async (req: Request, res: Response) => {
  const { wineName, vintageYear, color, region, appellation, grapeVarietyOrBlend } = req.body;

  if (!wineName) {
    return res.status(400).json({ error: 'Wine name is required' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'AI service not configured' });
  }

  try {
    const client = new Anthropic({ apiKey });

    // Build context from what we know
    const details: string[] = [];
    if (vintageYear) details.push(`vintage: ${vintageYear}`);
    if (color) details.push(`type: ${color}`);
    if (region) details.push(`region: ${region}`);
    if (appellation) details.push(`appellation: ${appellation}`);
    if (grapeVarietyOrBlend) details.push(`grape/blend: ${grapeVarietyOrBlend}`);

    const wineDescription = details.length > 0
      ? `${wineName} (${details.join(', ')})`
      : wineName;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `Tell me about this wine: ${wineDescription}

Write exactly 3 short paragraphs. Straightforward and conversational — just talk, like someone who knows wine well but isn't selling anything. No promotional language, no superlatives, no "you'll love this." Just what the wine is.

1. What it typically tastes like. Nose, palate, finish. If a specific vintage, mention how that year's conditions affected it.

2. The grape or blend, where it's from, how it's made. A sentence or two on what's distinctive about the producer or place.

3. One genuinely interesting detail — historical, cultural, about the winemaker, whatever. Do NOT announce it as interesting or set it up with phrases like "here's the fun part" or "what's really cool is." Just say it. Transition naturally from paragraph 2, ideally with a logical connection to something you already mentioned.

Keep the total response under 160 words. No headings, no labels, no bullet points.`
      }],
    });

    const content = message.content[0];
    const text = content.type === 'text' ? content.text : '';

    res.json({ text });
  } catch (error: any) {
    console.error('Error calling AI:', error?.message || error);
    const detail = error?.message || 'Unknown error';
    res.status(500).json({ error: `Failed to get wine information: ${detail}` });
  }
});

export default router;
