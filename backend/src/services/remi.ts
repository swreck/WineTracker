import Anthropic from '@anthropic-ai/sdk';
import { PrismaClient } from '@prisma/client';

// Strip markdown code fences from AI responses before JSON parsing
function extractJSON(text: string): string {
  // Remove ```json ... ``` or ``` ... ``` wrapping
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  // Try to find JSON array or object directly
  const jsonMatch = text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
  if (jsonMatch) return jsonMatch[1];
  return text.trim();
}

// Ken's Voice — shared with Maria (Messaging app)
// This is the canonical voice definition. If it evolves, update it here.
const KENS_VOICE = `Write like a smart colleague stating facts plainly. No marketing language. No corporate polish. No buzzwords. State the result directly. Keep it conversational — one smart person talking to another over a drink. Be direct, warm, specific. No sommelier theater, no hedging, no "I'd suggest perhaps considering." If you wouldn't say it out loud to a smart friend who doesn't know wine deeply, don't write it. One thought per sentence. Use plain language, not jargon.`;

const REMI_PERSONA = `You are Remi, a knowledgeable wine companion. You know wine at the vintage-specific level — not generalities about grapes or regions, but what makes a specific producer's specific vintage distinctive. Your knowledge comes from the wine world broadly (critics, publications, producer histories, vintage conditions). You also know Ken's personal collection, his ratings, and his tasting notes.

You keep your own perspective separate from other sources. When you reference what Gerald (Ken's wine merchant) said in seller notes, or what critics scored, you cite them as separate voices — you don't blend them into your own view.

${KENS_VOICE}

Keep responses to 2-3 sentences unless asked for more.`;

export async function enrichWineVintage(
  prisma: PrismaClient,
  apiKey: string,
  wineId: number,
  wineName: string,
  vintageYear: number,
  color: string,
  region?: string | null,
  appellation?: string | null,
  grape?: string | null,
): Promise<string> {
  // Validate wine exists
  const wine = await prisma.wine.findUnique({ where: { id: wineId } });
  if (!wine) return 'Wine not found in collection.';

  // Check if already enriched
  const existing = await prisma.remiEnrichment.findUnique({
    where: { wineId_vintageYear: { wineId, vintageYear } },
  });
  if (existing) return existing.profile;

  const client = new Anthropic({ apiKey });

  const details = [
    `Wine: ${wineName}`,
    `Vintage: ${vintageYear}`,
    `Color: ${color}`,
    region ? `Region: ${region}` : null,
    appellation ? `Appellation: ${appellation}` : null,
    grape ? `Grape/Blend: ${grape}` : null,
  ].filter(Boolean).join('\n');

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    system: REMI_PERSONA,
    messages: [{
      role: 'user',
      content: `Write a 2-3 sentence profile of this specific wine and vintage. What is it like? How does this vintage compare to others from this producer? Anything notable about the vintage conditions or winemaking? Be specific to this wine and year — not generic descriptions of the grape or region.

${details}

If you don't have specific knowledge of this wine, say what you can about the producer and vintage year honestly. Don't invent details.`,
    }],
  });

  const content = message.content[0];
  const profile = content.type === 'text' ? content.text : 'No profile available.';

  await prisma.remiEnrichment.create({
    data: { wineId, vintageYear, profile },
  });

  return profile;
}

export async function generateSuggestions(
  prisma: PrismaClient,
  apiKey: string,
): Promise<{ id: number; content: string; wineId: number | null }[]> {
  // Gather context: recent tastings, all wines with ratings
  const recentTastings = await prisma.tastingEvent.findMany({
    orderBy: { tastingDate: 'desc' },
    take: 20,
    include: {
      vintage: {
        include: { wine: true },
      },
    },
  });

  const allWines = await prisma.wine.findMany({
    include: {
      vintages: {
        include: {
          tastingEvents: { orderBy: { tastingDate: 'desc' }, take: 2 },
          purchaseItems: { take: 1, include: { purchaseBatch: true } },
        },
      },
    },
  });

  // Build context summary
  const recentSummary = recentTastings.slice(0, 10).map(t => {
    const wine = t.vintage?.wine;
    return `- ${wine?.name || '?'} ${t.vintage?.vintageYear || ''}: rated ${t.rating}${t.notes ? ` ("${t.notes.slice(0, 80)}")` : ''} — ${t.tastingDate ? new Date(t.tastingDate).toLocaleDateString() : 'no date'}`;
  }).join('\n');

  const collectionSummary = allWines.map(w => {
    const vintages = w.vintages || [];
    const ratings = vintages.flatMap(v =>
      (v.tastingEvents || []).map(t => Number(t.rating))
    );
    const avgRating = ratings.length > 0
      ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
      : null;
    const latestNote = vintages.flatMap(v => v.tastingEvents || [])
      .sort((a, b) => new Date(b.tastingDate || 0).getTime() - new Date(a.tastingDate || 0).getTime())
      [0]?.notes;
    const lastTasted = vintages.flatMap(v => v.tastingEvents || [])
      .sort((a, b) => new Date(b.tastingDate || 0).getTime() - new Date(a.tastingDate || 0).getTime())
      [0]?.tastingDate;

    return `- ${w.name} (${w.color}): ${vintages.map(v => v.vintageYear).join(', ')}${avgRating ? ` avg:${avgRating}` : ''}${lastTasted ? ` last:${new Date(lastTasted).toLocaleDateString()}` : ''}${latestNote ? ` note:"${latestNote.slice(0, 50)}"` : ''}`;
  }).join('\n');

  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    system: REMI_PERSONA,
    messages: [{
      role: 'user',
      content: `Based on Ken's wine collection and recent tastings, generate 4-6 specific suggestions. Each should be 2-3 sentences. Suggestions can be:
- A specific bottle to open tonight (with a reason tied to his taste)
- A connection between wines ("this one shares DNA with that one you loved")
- A seasonal or timing suggestion ("this drinks best young, don't wait")
- A comparison idea ("Coravin these two side by side")

Recent tastings:
${recentSummary}

Full collection:
${collectionSummary}

Respond with a JSON array of objects, each with "content" (the suggestion text) and "wineName" (the wine being suggested, or null if it's a general suggestion). JSON only, no markdown:
[{"content": "...", "wineName": "..."}]`,
    }],
  });

  const responseText = message.content[0].type === 'text' ? message.content[0].text : '[]';

  try {
    const parsed = JSON.parse(extractJSON(responseText));

    if (!Array.isArray(parsed) || parsed.length === 0) {
      // Don't deactivate old suggestions if we got nothing new
      const existing = await prisma.remiSuggestion.findMany({ where: { active: true } });
      return existing.map(s => ({ id: s.id, content: s.content, wineId: s.wineId }));
    }

    // Only deactivate old suggestions after we've confirmed new ones parsed
    await prisma.remiSuggestion.updateMany({
      where: { active: true },
      data: { active: false },
    });

    const suggestions: { id: number; content: string; wineId: number | null }[] = [];

    for (const s of parsed) {
      // Try to match wine name to ID (skip empty names)
      let wineId: number | null = null;
      if (s.wineName) {
        const searchName = s.wineName.toLowerCase();
        const validWines = allWines.filter(w => w.name && w.name.trim().length > 1);
        // Prefer exact match, then contains
        const exact = validWines.find(w => w.name.toLowerCase() === searchName);
        const partial = !exact ? validWines.find(w =>
          w.name.toLowerCase().includes(searchName) ||
          searchName.includes(w.name.toLowerCase())
        ) : null;
        const match = exact || partial;
        if (match) wineId = match.id;
      }

      const created = await prisma.remiSuggestion.create({
        data: { content: s.content, wineId, active: true },
      });
      suggestions.push({ id: created.id, content: created.content, wineId });
    }

    return suggestions;
  } catch {
    return [];
  }
}

export async function chatWithRemi(
  prisma: PrismaClient,
  apiKey: string,
  userMessage: string,
): Promise<string> {
  // Save user message
  await prisma.remiChatMessage.create({
    data: { role: 'user', content: userMessage },
  });

  // Load chat history (last 30 messages for context)
  const history = await prisma.remiChatMessage.findMany({
    orderBy: { createdAt: 'asc' },
    take: 30,
  });

  // Build wine context
  const allWines = await prisma.wine.findMany({
    include: {
      vintages: {
        include: {
          tastingEvents: { orderBy: { tastingDate: 'desc' }, take: 3 },
          purchaseItems: { take: 1, include: { purchaseBatch: true } },
        },
      },
    },
  });

  // Get enrichments
  const enrichments = await prisma.remiEnrichment.findMany();
  const enrichmentMap = new Map(
    enrichments.map(e => [`${e.wineId}-${e.vintageYear}`, e.profile])
  );

  // Build compact collection context — fits all wines within Sonnet's context
  const collectionContext = allWines
    .filter(w => w.name && w.name.trim().length > 1) // skip empty names
    .map(w => {
      const vintages = (w.vintages || []).map(v => {
        const tastings = (v.tastingEvents || []).map(t =>
          `${t.rating}${t.notes ? ` "${t.notes.slice(0, 80)}"` : ''}`
        ).join('; ');
        const price = v.purchaseItems?.[0]?.pricePaid;
        const sellerNotes = v.sellerNotes;

        return `${v.vintageYear}: ${tastings || '-'}${price ? ` $${price}` : ''}${sellerNotes ? ` [Gerald: "${sellerNotes.slice(0, 60)}"]` : ''}`;
      }).join(' | ');

      return `${w.name} (${w.color}): ${vintages}`;
    }).join('\n');

  const client = new Anthropic({ apiKey });

  // Ensure proper message alternation (user/assistant/user/assistant)
  // Anthropic requires messages to alternate and end with 'user'
  const rawMessages = history.map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));

  // Merge consecutive same-role messages and ensure alternation
  const messages: { role: 'user' | 'assistant'; content: string }[] = [];
  for (const msg of rawMessages) {
    if (messages.length > 0 && messages[messages.length - 1].role === msg.role) {
      // Merge with previous message of same role
      messages[messages.length - 1].content += '\n' + msg.content;
    } else {
      messages.push({ ...msg });
    }
  }

  // Ensure it ends with user message (the one we just added)
  if (messages.length > 0 && messages[messages.length - 1].role !== 'user') {
    messages.push({ role: 'user', content: userMessage });
  }

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 800,
    system: `${REMI_PERSONA}

Ken's wine collection (for reference):
${collectionContext.slice(0, 40000)}

When Ken asks about a specific wine, use your knowledge of that wine AND his personal notes/ratings. When referencing Gerald's seller notes, attribute them: "Gerald described it as..." When making suggestions, be specific to wines Ken owns or has tried.`,
    messages,
  });

  const reply = response.content[0].type === 'text' ? response.content[0].text : 'I need a moment to think about that.';

  // Save assistant reply
  await prisma.remiChatMessage.create({
    data: { role: 'assistant', content: reply },
  });

  return reply;
}

export async function findThemes(
  prisma: PrismaClient,
  apiKey: string,
  minRating: number = 7.0,
): Promise<{ theme: string; wines: string[]; description: string }[]> {
  const favorites = await prisma.wine.findMany({
    include: {
      vintages: {
        include: {
          tastingEvents: true,
          purchaseItems: { take: 1 },
        },
      },
    },
  });

  // Filter to favorites above min rating
  const qualifiedWines = favorites.filter(w => {
    const ratings = (w.vintages || []).flatMap(v =>
      (v.tastingEvents || []).map(t => Number(t.rating))
    );
    if (ratings.length === 0) return false;
    const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    return avg >= minRating;
  });

  if (qualifiedWines.length < 4) return [];

  const wineSummary = qualifiedWines.map(w => {
    const ratings = (w.vintages || []).flatMap(v =>
      (v.tastingEvents || []).map(t => Number(t.rating))
    );
    const avg = ratings.length > 0
      ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
      : '?';
    const prices = (w.vintages || []).flatMap(v =>
      (v.purchaseItems || []).map(p => Number(p.pricePaid)).filter(p => p > 0)
    );
    const avgPrice = prices.length > 0
      ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
      : null;

    return `- ${w.name} (${w.color}, ${w.region || 'no region'}) avg rating: ${avg}${avgPrice ? `, ~$${avgPrice}` : ''}`;
  }).join('\n');

  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1000,
    system: REMI_PERSONA,
    messages: [{
      role: 'user',
      content: `Ken wants to identify natural case themes among his favorite wines. Look for groupings of 4+ wines that share something meaningful — style, region, weight, price range, aging potential. These themes should be specific enough to describe to a wine merchant as the basis for a case purchase.

Ken's favorites (rated ${minRating}+):
${wineSummary}

Find 2-4 natural groupings. For each, name the theme, list the wines that fit it, and write 1-2 sentences describing what they share (in Ken's voice — direct, specific, no marketing).

Respond with JSON only, no markdown:
[{"theme": "Northern Rhône Syrahs", "wines": ["Combier Crozes-Hermitage", "Guigal St Joseph"], "description": "These are all structured, peppery Syrahs from the northern Rhône..."}]`,
    }],
  });

  const responseText = message.content[0].type === 'text' ? message.content[0].text : '[]';

  try {
    return JSON.parse(extractJSON(responseText));
  } catch (e) {
    console.error('Failed to parse themes JSON:', responseText.slice(0, 200));
    return [];
  }
}
