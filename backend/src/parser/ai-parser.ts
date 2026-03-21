import Anthropic from '@anthropic-ai/sdk';
import { PrismaClient } from '@prisma/client';

export interface AIParsedItem {
  name: string;
  color: 'red' | 'white' | 'rose' | 'sparkling';
  vintageYear: number;
  price?: number;
  quantity: number;
  sellerNotes?: string;
}

export interface AIParsedBatch {
  purchaseDate: string | null; // ISO date string or null
  theme?: string;
  items: AIParsedItem[];
}

export interface AIParseResult {
  batches: AIParsedBatch[];
  ambiguities: { type: string; message: string; context: string; suggestion?: string }[];
}

async function getCorrections(prisma: PrismaClient, mode: string): Promise<string> {
  const corrections = await prisma.parseCorrection.findMany({
    where: { mode },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  if (corrections.length === 0) return '';

  const lines = corrections.map(c =>
    `- Field "${c.fieldName}": "${c.wrongValue}" should be "${c.correctValue}"`
  );
  return `\nPast corrections to learn from (apply similar logic to new inputs):\n${lines.join('\n')}`;
}

export async function aiParseLabelImage(imageBase64: string, mediaType: string, apiKey: string, prisma: PrismaClient): Promise<AIParseResult> {
  const corrections = await getCorrections(prisma, 'label');
  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
            data: imageBase64,
          },
        },
        {
          type: 'text',
          text: `This is a photo of a wine bottle label. Extract the wine information.

Rules:
- Extract: wine name (producer + wine/cuvée if applicable), vintage year, color (red/white/rose/sparkling), region/appellation
- The wine name should be how a wine enthusiast would refer to this wine — proper capitalization, producer name included
- If you recognize the appellation (e.g., Chablis = white, Margaux = red, Champagne = sparkling), use that for color
- Ignore: decorative elements, legal text, alcohol %, "contains sulfites," barcodes, importer info
- There is NO price, NO seller notes, NO purchase date on a bottle label — never invent these
- If you cannot determine vintage year, use null
${corrections}

Respond with ONLY valid JSON, no markdown, no explanation:
{
  "name": "Producer Name - Wine Name",
  "color": "red|white|rose|sparkling",
  "vintageYear": 2023,
  "region": "Region/Appellation or null"
}`,
        },
      ],
    }],
  });

  const content = message.content[0];
  const responseText = content.type === 'text' ? content.text : '';

  try {
    const parsed = JSON.parse(responseText);
    return {
      batches: [{
        purchaseDate: null,
        items: [{
          name: parsed.name || 'Unknown Wine',
          color: parsed.color || 'red',
          vintageYear: parsed.vintageYear || 0,
          quantity: 1,
        }],
      }],
      ambiguities: parsed.vintageYear ? [] : [{
        type: 'vintage_parse',
        message: 'Could not determine vintage year from label photo',
        context: 'image',
      }],
    };
  } catch {
    return {
      batches: [],
      ambiguities: [{
        type: 'vintage_parse',
        message: 'Failed to parse label from photo',
        context: responseText.slice(0, 100),
      }],
    };
  }
}

export async function aiParseLabel(text: string, apiKey: string, prisma: PrismaClient): Promise<AIParseResult> {
  const corrections = await getCorrections(prisma, 'label');
  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: `Parse this wine bottle label OCR text into structured data. The OCR may contain errors, logo text read as words, and decorative elements misread as text. Use your wine knowledge to figure out what's real and what's noise.

OCR text:
${text}

Rules:
- Extract: wine name (producer + wine/cuvée if applicable), vintage year, color (red/white/rose/sparkling), region/appellation
- The wine name should be how a wine enthusiast would refer to this wine — proper capitalization, producer name included
- "RÉCOLTE" or "MILLÉSIME" followed by a year means vintage year
- Ignore: logos read as text (short uppercase fragments like "MG"), OCR artifacts, legal text, alcohol percentages, "contains sulfites," barcodes
- If you recognize the appellation (e.g., Chablis = white, Margaux = red), use that for color
- There is NO price, NO seller notes, NO purchase date on a bottle label — never invent these
- If you cannot determine vintage year, use null
${corrections}

Respond with ONLY valid JSON, no markdown, no explanation:
{
  "name": "Producer Name - Wine Name",
  "color": "red|white|rose|sparkling",
  "vintageYear": 2023,
  "region": "Region/Appellation or null"
}`
    }],
  });

  const content = message.content[0];
  const responseText = content.type === 'text' ? content.text : '';

  try {
    const parsed = JSON.parse(responseText);
    return {
      batches: [{
        purchaseDate: null,
        items: [{
          name: parsed.name || 'Unknown Wine',
          color: parsed.color || 'red',
          vintageYear: parsed.vintageYear || 0,
          quantity: 1,
        }],
      }],
      ambiguities: parsed.vintageYear ? [] : [{
        type: 'vintage_parse',
        message: 'Could not determine vintage year from label',
        context: text.slice(0, 100),
      }],
    };
  } catch {
    return {
      batches: [],
      ambiguities: [{
        type: 'vintage_parse',
        message: 'Failed to parse label text',
        context: text.slice(0, 100),
      }],
    };
  }
}

export async function aiParseReceipt(text: string, rulesParsed: any, apiKey: string, prisma: PrismaClient): Promise<AIParseResult> {
  const corrections = await getCorrections(prisma, 'receipt');
  const client = new Anthropic({ apiKey });

  // Summarize what the rules parser found
  const rulesSummary = rulesParsed.batches.map((b: any) => ({
    purchaseDate: b.purchaseDate,
    theme: b.theme,
    items: b.items.map((item: any) => ({
      name: item.name,
      color: item.color,
      vintageYear: item.vintageYear,
      price: item.price,
      quantity: item.quantity,
      sellerNotes: item.sellerNotes,
    })),
  }));

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4000,
    messages: [{
      role: 'user',
      content: `A rule-based parser extracted wine data from a store receipt. Review and fix any errors. The original receipt OCR text and the parser's output are below.

Original receipt text:
${text}

Parser output:
${JSON.stringify(rulesSummary, null, 2)}

Rules:
- Fix wine names: proper capitalization, remove leftover SKU fragments, add region if obvious (e.g., "PINTAS CHARACTER" → "Pintas Character - Douro")
- Fix colors if wrong (use your wine knowledge — Chablis is white, Barolo is red, etc.)
- Fix vintage years if they look wrong
- Prices and quantities from the parser are usually correct — only fix if clearly wrong
- Seller notes (ALL CAPS descriptions from the receipt) are valid — keep them but fix obvious OCR errors in them
- Do NOT invent data that isn't in the original text
- purchaseDate can be null if not found in the receipt
${corrections}

Respond with ONLY valid JSON, no markdown:
{
  "batches": [
    {
      "purchaseDate": "2024-01-15T12:00:00.000Z or null",
      "theme": "optional theme or null",
      "items": [
        {
          "name": "Corrected Wine Name",
          "color": "red|white|rose|sparkling",
          "vintageYear": 2020,
          "price": 39.99,
          "quantity": 2,
          "sellerNotes": "seller description or null"
        }
      ]
    }
  ]
}`
    }],
  });

  const content = message.content[0];
  const responseText = content.type === 'text' ? content.text : '';

  try {
    const parsed = JSON.parse(responseText);
    return {
      batches: (parsed.batches || []).map((b: any) => ({
        purchaseDate: b.purchaseDate || null,
        theme: b.theme || undefined,
        items: (b.items || []).map((item: any) => ({
          name: item.name || 'Unknown Wine',
          color: item.color || 'red',
          vintageYear: item.vintageYear || 0,
          price: item.price || undefined,
          quantity: item.quantity || 1,
          sellerNotes: item.sellerNotes || undefined,
        })),
      })),
      ambiguities: [],
    };
  } catch {
    // If AI cleanup fails, fall back to rule-based results
    return {
      batches: rulesSummary,
      ambiguities: [{
        type: 'wine_match',
        message: 'AI cleanup failed, using rule-based results',
        context: responseText.slice(0, 100),
      }],
    };
  }
}
