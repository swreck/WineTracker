// Wine text parser v2 - complete rewrite with line classification

export type WineColor = 'red' | 'white' | 'rose' | 'sparkling';

export interface ParsedTasting {
  date: Date;
  rating: number;
  notes?: string;
}

export interface ParsedPurchaseItem {
  name: string;
  color: WineColor;
  vintageYear: number;
  price?: number;
  quantity: number;
  sellerNotes?: string;
  tastings: ParsedTasting[];
}

export interface ParsedBatch {
  purchaseDate: Date;
  theme?: string;
  items: ParsedPurchaseItem[];
}

export interface Ambiguity {
  type: 'wine_match' | 'vintage_parse' | 'date_parse' | 'color_guess' | 'rating_parse';
  message: string;
  context: string;
  suggestion?: string;
}

export interface ImportResult {
  batches: ParsedBatch[];
  ambiguities: Ambiguity[];
}

// ============ LINE CLASSIFICATION ============

type LineType = 'date_header' | 'wine' | 'tasting' | 'description' | 'skip' | 'receipt_wine' | 'receipt_price' | 'receipt_year';

interface ClassifiedLine {
  type: LineType;
  raw: string;
  data?: any;
}

// Patterns to skip entirely
const SKIP_PATTERNS = [
  /^see above/i,
  /^xx+$/i,
  /^—+$/,
  /^\s*$/,
  /TOTAL:/i,  // Order totals
  /^Number\s+Price/i,
  /^Whites you recommend/i,
  /^Sancerre\s+\d/i,
  /^\d+\s+Frank family/i,
  /^Reds you recommend/i,
  /^Value Full Reds$/i,
  /^EU Whites$/i,
  /^EU Reds$/i,
  /^Top Reds$/i,
  /^Medium Body Reds$/i,
  /^Italian\/Iberian$/i,
  /^Portuguese Wines$/i,
  /^CHARDONNAY$/i,
  /^CABERNET$/i,
  /^BIG REDS & PORT$/i,
  /^STONY WHITES$/i,
  /^Here's the cleaned/i,
  /^\d+\s+TOTAL/i,  // "48 TOTAL"
  /^:\s*\d/,  // Lines starting with colon and number (orphaned tasting)
  /^ABOVE TO/i,  // "ABOVE TO SO CAL"
];

// Lines that are clearly descriptions, not wines
const DESCRIPTION_STARTERS = [
  /^(FROM |MADE BY|THIS IS|WE |WE'VE |IN A BLIND|FIRST TASTE|HAVING BEEN|USING |CALLED |BASED ON|FEW AMERICAN|THOUGH |IF YOU|LAVISHLY|FAMOUS |BEAUTIFULLY|MODERN |NICELY |MILDLY |SHOWING |STYLED |REPLICATING|PRE-\d|NOSE:|SEE ABOVE|HERE'S|HERE IS|IT'S|AN AMERICAN)/i,
  /^[A-Z]{2,}[A-Z\s,.']+\.\s*$/,  // ALL CAPS sentence ending with period
  /^THE\s+\d{4}\s/i,  // "The 2021..." descriptions
  /^(THE|A|AN)\s+[A-Z][a-z]+\s+(IS|WAS|HAS|MAKES|COMES)/i,  // "The Scarrone vineyard is..."
  /\bIS\s+(A|AN|THE|AS|ONE|PERHAPS|MAYBE|EXCELLENT|ON|NOT|REGARDED)\b/i,  // Sentence patterns
  /\bWAS\s+(A|AN|THE|MY|OUR|EXCELLENT)\b/i,  // "was a", "was my", etc.
  /\bHIS\s+\d{4}\b/i,  // "His 2014..."
  /BEST\s+NOW/i,  // "BEST NOW-2030"
  /NOW-\d{4}\+?\.?\s*$/i,  // Ends with "NOW-2030+" pattern
  /\bTHAT\s+(OWNS|CAPTURES|COMES|MAKES|IS|WAS)\b/i,  // "that owns", "that captures"
  /\bPRETTY\s+MUCH\b/i,  // "Pretty much it's Brunello"
  /\bIT'S\s+(A|THE|AS|ENTIRELY|BASED|FROM|MADE)\b/i,  // "It's a", "It's the"
  /\bFOR\s+ME,?\s+THIS\b/i,  // "For me, this type..."
  /-type\s+\w+\.\s+For/i,  // "Veedercrest-type Cabernet. For me"
  /^\d{4}\s+IS\s+/i,  // "2018 IS LAVISHLY-OAKED" - year followed by IS
  /^IS\s+(A|AN|THE|LAVISHLY|FAIRLY|VERY|RATHER|QUITE)/i,  // Sentences starting with IS
];

function classifyLine(line: string, prevLineType?: LineType): ClassifiedLine {
  const trimmed = line.trim();

  // Empty or skip patterns
  if (!trimmed || SKIP_PATTERNS.some(p => p.test(trimmed))) {
    return { type: 'skip', raw: line };
  }

  // Skip lines with multiple vintage years (two wines on one line - can't parse reliably)
  if (hasMultipleVintageYears(trimmed)) {
    return { type: 'skip', raw: line };
  }

  // Section divider
  if (trimmed === '//') {
    return { type: 'skip', raw: line };
  }

  // Date header: starts with date pattern, not a tasting note
  // e.g., "10/14/25 Mid-range unusual whites" or "4/20" or "3/26/24"
  const dateHeaderMatch = trimmed.match(/^(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\s*(.*?)$/);
  if (dateHeaderMatch && !trimmed.includes(':')) {
    const dateStr = dateHeaderMatch[1];
    const theme = dateHeaderMatch[2]?.trim();
    // Make sure it's not just a year reference
    if (dateStr.includes('/')) {
      const date = parseDate(dateStr);
      if (date) {
        return {
          type: 'date_header',
          raw: line,
          data: { date, theme: theme && !theme.match(/^Order$/i) ? theme : undefined }
        };
      }
    }
  }

  // Tasting note: starts with date followed by colon and rating
  // e.g., "11/13/25: 8.5. notes..." or "4/25: 7. notes..." or "9/25: 7.5. notes"
  // Also handles "2019: 6/25, 8+" format (year: date, rating)
  const tastingMatch = trimmed.match(/^(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\s*[:\s]\s*(\d+(?:\.\d+)?)[.,]?\s*(.*)$/);
  if (tastingMatch) {
    const date = parseDate(tastingMatch[1]);
    const rating = parseFloat(tastingMatch[2]);
    if (date && rating >= 1 && rating <= 10) {
      return {
        type: 'tasting',
        raw: line,
        data: { date, rating, notes: tastingMatch[3]?.trim() || undefined }
      };
    }
  }

  // Tasting note without rating: "10/25/25: same" or "10/25/25: better than expected"
  // These are notes-only tastings, use rating 0 to indicate no rating
  const tastingNoRatingMatch = trimmed.match(/^(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\s*[:]\s*([A-Za-z].*)$/);
  if (tastingNoRatingMatch) {
    const date = parseDate(tastingNoRatingMatch[1]);
    if (date) {
      return {
        type: 'tasting',
        raw: line,
        data: { date, rating: 0, notes: tastingNoRatingMatch[2]?.trim() || undefined }
      };
    }
  }

  // Vintage tasting format: "2019: 6/25, 8+" or "2018: 2/22, 8"
  const vintageTastingMatch = trimmed.match(/^(20\d{2}):\s*(\d{1,2}\/\d{1,2}),?\s*(\d+(?:\.\d+)?)\+?[,.]?\s*(.*)$/);
  if (vintageTastingMatch) {
    // Parse the embedded date (MM/DD) with the vintage year
    const year = parseInt(vintageTastingMatch[1]);
    const dateStr = vintageTastingMatch[2];
    const rating = parseFloat(vintageTastingMatch[3]);
    const dateParts = dateStr.split('/');
    if (dateParts.length === 2 && rating >= 1 && rating <= 10) {
      const date = new Date(year, parseInt(dateParts[0]) - 1, parseInt(dateParts[1]));
      return {
        type: 'tasting',
        raw: line,
        data: { date, rating, notes: vintageTastingMatch[4]?.trim() || undefined }
      };
    }
  }

  // Simple "YEAR:" line often precedes tastings - skip it
  if (/^20\d{2}:/.test(trimmed) && trimmed.length < 20) {
    return { type: 'skip', raw: line };
  }

  // Lines starting with "YEAR: digit" followed by date pattern are tasting notes, not wines
  // e.g., "2019: 8 3/22: 8, no>light nose" or "2016: 7/20: 7.5, then 8"
  if (/^20\d{2}:\s*\d(?:\.\d)?\s+\d{1,2}\/\d{1,2}/i.test(trimmed)) {
    return { type: 'skip', raw: line };  // These are malformed tasting lines
  }

  // Lines starting with "YEAR: date/date: rating" pattern - skip orphaned vintage tastings
  // e.g., "2016: 8/20: Good weeks later..." or "2018: 3/5/22 about same"
  if (/^20\d{2}:\s*\d{1,2}\/\d{1,2}(?:\/\d{2,4})?[:\s]/i.test(trimmed)) {
    return { type: 'skip', raw: line };
  }

  // Receipt format: starts with 5-digit product code
  // e.g., "14041 PENFOLDS BIN 389 CAB/SH"
  const receiptWineMatch = trimmed.match(/^(\d{5})\s+(.+)$/);
  if (receiptWineMatch) {
    return {
      type: 'receipt_wine',
      raw: line,
      data: { code: receiptWineMatch[1], rest: receiptWineMatch[2] }
    };
  }

  // Standalone year line (for receipt format where year is on separate line)
  // e.g., "2014" alone on a line after "15174 FINCA MARTELO"
  if (prevLineType === 'receipt_wine' && /^(19[89]\d|20[0-2]\d)\s*$/.test(trimmed)) {
    return {
      type: 'receipt_year',
      raw: line,
      data: { year: parseInt(trimmed) }
    };
  }

  // Receipt price line: "N @ XX.XX" pattern
  const receiptPriceMatch = trimmed.match(/^(\d+)\s*@\s*(\d+(?:\.\d{2})?)/);
  if (receiptPriceMatch) {
    return {
      type: 'receipt_price',
      raw: line,
      data: { quantity: parseInt(receiptPriceMatch[1]), price: parseFloat(receiptPriceMatch[2]) }
    };
  }

  // REGULAR price line in receipts - skip
  if (/^REGULAR\s+\d+/i.test(trimmed)) {
    return { type: 'skip', raw: line };
  }

  // Description patterns
  if (DESCRIPTION_STARTERS.some(p => p.test(trimmed))) {
    return { type: 'description', raw: line };
  }

  // If previous line was receipt_wine and this looks like a price line
  if (prevLineType === 'receipt_wine' && /^\d+\s*[@0]\s*\d+/.test(trimmed)) {
    const priceMatch = trimmed.match(/(\d+)\s*[@0]\s*(\d+(?:\.\d{2})?)/);
    if (priceMatch) {
      return {
        type: 'receipt_price',
        raw: line,
        data: { quantity: parseInt(priceMatch[1]), price: parseFloat(priceMatch[2]) }
      };
    }
  }

  // Check if it looks like a wine line (has vintage year)
  if (hasVintageYear(trimmed)) {
    return { type: 'wine', raw: line };
  }

  // If it's ALL CAPS and doesn't have a vintage, probably description
  if (trimmed === trimmed.toUpperCase() && trimmed.length > 20) {
    return { type: 'description', raw: line };
  }

  // Default: if previous was wine/receipt_wine, this might be description
  if (prevLineType === 'wine' || prevLineType === 'receipt_wine') {
    return { type: 'description', raw: line };
  }

  return { type: 'skip', raw: line };
}

function hasMultipleVintageYears(text: string): boolean {
  // Check for two separate vintage years in the text (indicates two wines on one line)
  const matches = text.match(/\b(19[89]\d|200\d|201\d|202[0-5])\b/g);
  return matches !== null && matches.length >= 2;
}

function hasVintageYear(text: string): boolean {
  // 4-digit year (1980-2025, not future years)
  if (/\b(19[89]\d|200\d|201\d|202[0-5])\b/.test(text)) return true;
  // 2-digit year at end or before price/rating: "CHARDONNAY 20" or "WINE 19 $40"
  if (/\b[A-Z]{3,}\s*'?\d{2}\b/i.test(text)) return true;
  // Year with apostrophe: '18, '21
  if (/'(1[89]|[012]\d)\b/.test(text)) return true;
  // Vintage glued to name: "CHARDONNAY20"
  if (/[A-Z]\d{2}$/i.test(text.trim())) return true;
  return false;
}

// ============ DATA EXTRACTION ============

export function parseDate(text: string): Date | null {
  if (!text) return null;
  const cleaned = text.trim();

  // MM/DD/YY or MM/DD/YYYY
  let match = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (match) {
    let year = parseInt(match[3]);
    if (year < 100) year += 2000;
    return new Date(year, parseInt(match[1]) - 1, parseInt(match[2]));
  }

  // MM/YY (month/year only)
  match = cleaned.match(/^(\d{1,2})\/(\d{2})$/);
  if (match) {
    let year = parseInt(match[2]) + 2000;
    return new Date(year, parseInt(match[1]) - 1, 1);
  }

  // YYYY-MM-DD
  match = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
  }

  return null;
}

export function detectColor(text: string): WineColor {
  const t = text.toLowerCase();
  const normalized = t.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Sparkling
  if (/champagne|prosecco|cremant|cava|brut(?!\s+nature)|sparkling|spumante|blancs?\s+de\s+blancs?|methode|mousseux|agnes|cremant/i.test(t)) {
    return 'sparkling';
  }

  // Rosé
  if (/\brose\b|\brosé\b|pink\b/i.test(normalized) && !/rose\s*(de|di|du)/i.test(normalized)) {
    return 'rose';
  }

  // White
  if (/chardonnay|sauvignon\s*blanc|riesling|pinot\s*gri[os]|viognier|gewürz|gewurz|muscadet|albariño|albarino|alvarinho|chenin|sancerre|chablis|pouilly|meursault|montrachet|puligny|chassagne|viré|mâcon|fuissé|gruner|grüner|pecorino|arneis|vermentino|greco|falanghina|fiano|soave|gavi|roero\s*arneis|vouvray|white|blanc\b|bianco|weiss|stoan|godello|furmint|marsanne|roussanne/i.test(t)) {
    return 'white';
  }

  // Red
  if (/cabernet|merlot|pinot\s*noir|syrah|shiraz|malbec|zinfandel|zin\b|sangiovese|nebbiolo|tempranillo|grenache|barolo|barbaresco|brunello|chianti|valpolicella|amarone|rioja|ribera|douro|châteauneuf|chateauneuf|gigondas|bandol|côtes?\s*du\s*rhône|hermitage|crozes|st[\.\s]*julien|margaux|pauillac|st[\.\s]*estèphe|pomerol|médoc|haut[\-\s]*médoc|graves|pessac|fronsac|bourg|blaye|tannat|aglianico|primitivo|nero\s*d'avola|montepulciano|barbera|dolcetto|lagrein|petite?\s*sirah|mourvèdre|mourvedre|carignan|gamay|beaujolais|fleurie|morgon|moulin|touriga|tinta|sfursat|rosso|rouge|tinto|rot\b|susumaniello|madiran|taurasini|baga|cab\b|cab\/|meunier/i.test(t)) {
    return 'red';
  }

  return 'red';
}

export function parseVintageYear(text: string): number | null {
  // 4-digit year 1980-2025 (not future years like 2030 which appear in "NOW-2030+")
  const fourDigit = text.match(/\b(19[89]\d|200\d|201\d|202[0-5])\b/);
  if (fourDigit) {
    return parseInt(fourDigit[1]);
  }

  // 2-digit with apostrophe: '18, '21
  const apostrophe = text.match(/'(\d{2})\b/);
  if (apostrophe) {
    const year = parseInt(apostrophe[1]);
    return year < 50 ? 2000 + year : 1900 + year;
  }

  // 2-digit at end of wine name (e.g., "CHARDONNAY 20" or "WINE 18")
  // Must be after letters, and be a reasonable vintage (10-25 for 2010-2025, or 80-99 for 1980-1999)
  const twoDigitEnd = text.match(/[A-Z]\s+(\d{2})(?:\s|$|,)/i);
  if (twoDigitEnd) {
    const num = parseInt(twoDigitEnd[1]);
    if (num >= 10 && num <= 30) return 2000 + num;
    if (num >= 80 && num <= 99) return 1900 + num;
  }

  // Glued vintage: "CHARDONNAY20" or "MERLOT18"
  const gluedVintage = text.match(/[A-Z](\d{2})$/i);
  if (gluedVintage) {
    const num = parseInt(gluedVintage[1]);
    if (num >= 10 && num <= 30) return 2000 + num;
    if (num >= 80 && num <= 99) return 1900 + num;
  }

  return null;
}

export function parsePrice(text: string): number | null {
  // $XX or $XX.XX
  let match = text.match(/\$\s*(\d+(?:[.,]\d{2})?)/);
  if (match) {
    return parseFloat(match[1].replace(',', '.'));
  }

  // Price after @ sign: "2 @ 39.99"
  match = text.match(/@\s*(\d+(?:\.\d{2})?)/);
  if (match) {
    return parseFloat(match[1]);
  }

  // Format: "YEAR, PRICE:" like "2015, 25:" (price before colon+rating)
  match = text.match(/\d{4},\s*(\d{2,3}):/);
  if (match) {
    const val = parseInt(match[1]);
    if (val >= 15 && val <= 500) return val;
  }

  // Format: ", PRICE, YEAR" like ", 29.99, 2015" (price between commas before year)
  match = text.match(/,\s*(\d+(?:\.\d{2})?),\s*\d{4}/);
  if (match) {
    const val = parseFloat(match[1]);
    if (val >= 15 && val <= 500) return val;
  }

  // Format: "VINTAGE, PRICE" or ", PRICE" at end (e.g., "2018, 55" or ", 35")
  match = text.match(/,\s*(\d{2,3})\s*$/);
  if (match) {
    const val = parseInt(match[1]);
    if (val >= 15 && val <= 500) return val;
  }

  // Format: "PRICE+" like "50+"
  match = text.match(/\b(\d{2,3})\+/);
  if (match) {
    const val = parseInt(match[1]);
    if (val >= 15 && val <= 500) return val;
  }

  // Price in parentheses: "(50)" but not quantity like "(3)"
  match = text.match(/\((\d{2,3})\)/);
  if (match) {
    const val = parseInt(match[1]);
    if (val >= 15 && val <= 500) return val;
  }

  // Trailing number that looks like price (2-3 digits, reasonable range)
  // But NOT if it looks like a rating (has decimal or followed by comma+notes)
  match = text.match(/\s(\d{2,3})(?:\s*$|\s+T\s*$)/);
  if (match) {
    const val = parseInt(match[1]);
    if (val >= 15 && val <= 500) return val;
  }

  return null;
}

export function parseQuantity(text: string): number {
  // (N) format - but only single digit, not prices
  let match = text.match(/\((\d)\)/);
  if (match) return parseInt(match[1]);

  // xN or XN format
  match = text.match(/[xX](\d+)/);
  if (match) return parseInt(match[1]);

  // N @ price format
  match = text.match(/(\d+)\s*@/);
  if (match) return parseInt(match[1]);

  // Quantity: N format
  match = text.match(/Quantity:\s*(\d+)/i);
  if (match) return parseInt(match[1]);

  return 1;
}

export function extractWineName(text: string): string {
  let cleaned = text.trim();

  // Remove 5-digit product codes at start
  cleaned = cleaned.replace(/^\d{5}\s+/, '');

  // Remove inline tasting notes FIRST (everything after ": rating." or ", rating,")
  // This handles "Wine, 2015, 25: 8.5, notes..."
  cleaned = cleaned.replace(/:\s*\d+(?:\.\d+)?[.,]\s*.*/g, '').trim();
  cleaned = cleaned.replace(/,\s*\d+(?:\.\d+)?,\s*[A-Z].*/gi, '').trim();

  // Remove vintage years (4-digit)
  cleaned = cleaned.replace(/\b(19[89]\d|20[0-2]\d|2030)\b/g, '').trim();
  cleaned = cleaned.replace(/'(\d{2})\b/g, '').trim();

  // Remove glued vintage: "CHARDONNAY20" -> "CHARDONNAY"
  cleaned = cleaned.replace(/([A-Z])(\d{2})$/i, '$1').trim();

  // Remove 2-digit vintage at end (but preserve things like "BIN 389")
  if (!/\b(BIN|CRU|OPUS|LOT|BLOCK|NO|NUMBER|#)\s+\d{2,3}/i.test(cleaned)) {
    cleaned = cleaned.replace(/\s+\d{2}\s*$/, '').trim();
  }

  // Remove prices in various formats
  cleaned = cleaned.replace(/\$\s*\d+(?:[.,]\d{2})?/g, '').trim();
  cleaned = cleaned.replace(/,\s*\d+(?:\.\d{2})?,/g, ',').trim();  // ", 29.99," -> ","
  cleaned = cleaned.replace(/,\s*\d+(?:\.\d{2})?\s*$/g, '').trim();  // ", 55" or ", 29.99" at end
  // Remove trailing prices but preserve special names like "BIN 389"
  if (!/\b(BIN|CRU|OPUS|LOT|BLOCK|NO|NUMBER|#)\s+\d{2,3}/i.test(cleaned)) {
    cleaned = cleaned.replace(/\s+\d{2,3}\+?\s*$/, '').trim(); // "50+" or "35" at end
  }
  cleaned = cleaned.replace(/\(\d{2,3}\)/g, '').trim();  // "(50)" prices

  // Remove quantity markers
  cleaned = cleaned.replace(/\(\d\)/g, '').trim();  // (3)
  cleaned = cleaned.replace(/[xX]\d+/g, '').trim();  // x2
  cleaned = cleaned.replace(/\d+\s*@\s*[\d.]+/g, '').trim();  // 2 @ 39.99
  cleaned = cleaned.replace(/Quantity:\s*\d+/gi, '').trim();

  // Remove ratings (decimal numbers 1-10)
  cleaned = cleaned.replace(/\b\d\.\d\b/g, '').trim();
  cleaned = cleaned.replace(/(?<![A-Z0-9])\s+\d(?:\.\d)?\s*[,.]?\s*$/i, '').trim();

  // Remove "Regular $XX" patterns and leftover "(Regular )"
  cleaned = cleaned.replace(/\(Regular\s*\$?\d*\s*\)/gi, '').trim();
  cleaned = cleaned.replace(/Regular\s*\$?\d+/gi, '').trim();

  // Remove parenthetical comments like "(Gerald highly rec'ded)" or "(sic, ...)"
  cleaned = cleaned.replace(/\([^)]*rec['']?d[^)]*\)/gi, '').trim();
  cleaned = cleaned.replace(/\(sic[^)]*\)/gi, '').trim();
  cleaned = cleaned.replace(/\(\s*\)/g, '').trim();  // Empty parens

  // Clean up extra spaces and punctuation
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // Remove leading asterisks (used for favorites in notes)
  cleaned = cleaned.replace(/^\*+\s*/, '').trim();

  // Remove trailing punctuation garbage - run multiple passes to catch all cases
  for (let i = 0; i < 3; i++) {
    cleaned = cleaned.replace(/,\s*,+\s*$/, '').trim();  // ", ," -> ""
    cleaned = cleaned.replace(/[,\s]+[?,;:.]+\s*$/, '').trim();  // ", ?" or " :" -> ""
    cleaned = cleaned.replace(/[,\s]+$/, '').trim();  // trailing comma/space
  }
  cleaned = cleaned.replace(/^[,\s]+/, '').trim();  // leading comma/space

  // Remove trailing ", XX" where XX is a 2-digit number (leftover prices/years)
  cleaned = cleaned.replace(/,\s+\d{2}\s*$/, '').trim();

  return cleaned;
}

// Extract embedded tasting from wine line
// e.g., "Cedarville SYrah, 2015, 25: 8.5, Nice simple red fruit nose..."
function extractEmbeddedTasting(text: string): ParsedTasting | null {
  // Pattern: "PRICE: RATING, notes" or "PRICE: RATING. notes"
  const match = text.match(/:\s*(\d+(?:\.\d+)?)[.,]\s*(.+)$/);
  if (match) {
    const rating = parseFloat(match[1]);
    if (rating >= 1 && rating <= 10) {
      return {
        date: new Date(), // Use current date as we don't have one
        rating,
        notes: match[2].trim()
      };
    }
  }
  return null;
}

// ============ MAIN PARSER ============

export function parseText(text: string): ImportResult {
  const lines = text.split('\n');
  const batches: ParsedBatch[] = [];
  const ambiguities: Ambiguity[] = [];

  let currentBatch: ParsedBatch | null = null;
  let currentItem: ParsedPurchaseItem | null = null;
  let prevLineType: LineType | undefined;
  let descriptionBuffer: string[] = [];

  function finalizeItem() {
    if (currentItem && currentBatch) {
      // Skip items without a valid vintage year
      if (currentItem.vintageYear === 0) {
        descriptionBuffer = [];
        currentItem = null;
        return;
      }
      if (descriptionBuffer.length > 0) {
        let notes = descriptionBuffer.join(' ').trim();
        // Clean up trailing // markers
        notes = notes.replace(/\s*\/\/\s*$/, '').trim();
        currentItem.sellerNotes = notes;
        descriptionBuffer = [];
      }
      currentBatch.items.push(currentItem);
      currentItem = null;
    }
  }

  function finalizeBatch() {
    finalizeItem();
    if (currentBatch && currentBatch.items.length > 0) {
      batches.push(currentBatch);
    }
    currentBatch = null;
  }

  for (const line of lines) {
    const classified = classifyLine(line, prevLineType);

    switch (classified.type) {
      case 'date_header':
        finalizeBatch();
        currentBatch = {
          purchaseDate: classified.data.date,
          theme: classified.data.theme,
          items: []
        };
        break;

      case 'wine':
      case 'receipt_wine':
        finalizeItem();

        // Ensure we have a batch
        if (!currentBatch) {
          currentBatch = {
            purchaseDate: new Date(),
            items: []
          };
        }

        const rawText = classified.type === 'receipt_wine'
          ? classified.data.rest
          : classified.raw;

        let vintageYear = parseVintageYear(rawText);

        // For receipt_wine, allow missing vintage (will be filled from next line)
        if (!vintageYear && classified.type !== 'receipt_wine') {
          // Skip standard wine lines without vintage
          prevLineType = classified.type;
          break;
        }

        // Use placeholder for receipt wines without year (will update later)
        if (!vintageYear) {
          vintageYear = 0;
        }

        const name = extractWineName(rawText);
        if (!name || name.length < 2) {
          prevLineType = classified.type;
          break;
        }

        // Check for embedded tasting
        const embeddedTasting = extractEmbeddedTasting(classified.raw);

        currentItem = {
          name,
          color: detectColor(rawText),
          vintageYear,
          price: parsePrice(classified.raw) ?? undefined,
          quantity: parseQuantity(classified.raw),
          tastings: embeddedTasting ? [embeddedTasting] : [],
          sellerNotes: undefined
        };
        break;

      case 'receipt_year':
        // Fill in vintage year for receipt wine that had year on separate line
        if (currentItem && currentItem.vintageYear === 0) {
          currentItem.vintageYear = classified.data.year;
        }
        break;

      case 'receipt_price':
        if (currentItem) {
          currentItem.price = classified.data.price;
          currentItem.quantity = classified.data.quantity;
        }
        break;

      case 'tasting':
        if (currentItem) {
          currentItem.tastings.push({
            date: classified.data.date,
            rating: classified.data.rating,
            notes: classified.data.notes
          });
        }
        break;

      case 'description':
        if (currentItem) {
          const desc = classified.raw.trim();
          // Skip duplicate or very short descriptions
          if (desc.length > 10 && !descriptionBuffer.includes(desc)) {
            descriptionBuffer.push(desc);
          }
        }
        break;

      case 'skip':
      default:
        // If we hit a // divider, finalize description
        if (classified.raw.trim() === '//') {
          if (currentItem && descriptionBuffer.length > 0) {
            let notes = descriptionBuffer.join(' ').trim();
            notes = notes.replace(/\s*\/\/\s*$/, '').trim();
            currentItem.sellerNotes = notes;
            descriptionBuffer = [];
          }
        }
        break;
    }

    prevLineType = classified.type;
  }

  finalizeBatch();

  return { batches, ambiguities };
}

// Receipt-specific parser (for OCR text)
export function parseReceiptText(text: string): ImportResult {
  // Use the same parser - it handles receipt format via line classification
  return parseText(text);
}

// Label parser - flexible parsing for wine bottle label OCR
// This handles highly varied OCR output from photos of wine labels
export function parseLabelText(text: string): ImportResult {
  const ambiguities: Ambiguity[] = [];

  // Normalize the text
  const normalized = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();

  // Try to extract vintage year from anywhere in the text
  let vintageYear = parseVintageYear(normalized);

  // If no 4-digit year found, look for standalone 2-digit years
  if (!vintageYear) {
    const twoDigitMatch = normalized.match(/\b(\d{2})\b/g);
    if (twoDigitMatch) {
      for (const match of twoDigitMatch) {
        const num = parseInt(match);
        if (num >= 10 && num <= 30) {
          vintageYear = 2000 + num;
          break;
        }
        if (num >= 80 && num <= 99) {
          vintageYear = 1900 + num;
          break;
        }
      }
    }
  }

  // Default to recent year if nothing found
  if (!vintageYear) {
    vintageYear = new Date().getFullYear() - 2;
    ambiguities.push({
      type: 'vintage_parse',
      message: 'Could not find vintage year, defaulting to recent',
      context: normalized.slice(0, 100),
      suggestion: `Using ${vintageYear}`
    });
  }

  // Detect color from the full text
  const color = detectColor(normalized);

  // Extract wine name - this is the tricky part
  // Strategy: Clean up the text and use the most significant lines
  const lines = normalized.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // Remove lines that are clearly not wine names
  const significantLines = lines.filter(line => {
    const lower = line.toLowerCase();
    // Skip short lines (likely artifacts)
    if (line.length < 3) return false;
    // Skip pure numbers
    if (/^\d+$/.test(line)) return false;
    // Skip alcohol content
    if (/\d+(\.\d+)?%?\s*(alc|vol|alcohol)/i.test(line)) return false;
    if (/\balc\.?\s*\d/i.test(line)) return false;
    // Skip volume/size
    if (/\d+\s*ml/i.test(line)) return false;
    if (/750\s*ml/i.test(line)) return false;
    // Skip "contains sulfites" type warnings
    if (/contains?\s*sulfites/i.test(line)) return false;
    if (/government\s*warning/i.test(line)) return false;
    // Skip barcode numbers
    if (/^\d{8,}$/.test(line.replace(/\s/g, ''))) return false;
    // Skip "Product of" lines
    if (/^product\s+of/i.test(line)) return false;
    // Skip "Estate bottled" etc
    if (/^(estate\s+bottled|bottled\s+by|produced?\s+(by|and)|imported\s+by)/i.test(line)) return false;
    // Skip vintage year alone
    if (/^(19|20)\d{2}$/.test(line)) return false;
    return true;
  });

  // Build wine name from significant lines
  let wineName = '';

  if (significantLines.length === 0) {
    // Fallback: use first substantial part of original text
    wineName = normalized.split('\n')[0]?.trim() || 'Unknown Wine';
  } else if (significantLines.length === 1) {
    wineName = significantLines[0];
  } else {
    // Multiple lines - combine intelligently
    // Look for winery name (often first or has specific patterns)
    // Look for wine name/varietal
    // Look for region/appellation

    // First, check for common patterns
    const hasWinery = significantLines.some(l => /château|chateau|domaine|bodega|cave|cantina|weingut|tenuta|fattoria|podere|vignoble|vigneron|cellars?|winery|vineyards?|estate/i.test(l));

    if (hasWinery) {
      // Use winery line plus the next most significant line
      const wineryLine = significantLines.find(l => /château|chateau|domaine|bodega|cave|cantina|weingut|tenuta|fattoria|podere|vignoble|vigneron|cellars?|winery|vineyards?|estate/i.test(l));
      const otherLines = significantLines.filter(l => l !== wineryLine);

      // Find the most wine-like other line (varietal, region, or cuvée)
      const wineTypeLine = otherLines.find(l =>
        /cabernet|merlot|pinot|syrah|shiraz|chardonnay|sauvignon|riesling|malbec|zinfandel|sangiovese|nebbiolo|tempranillo|grenache|viognier|reserve|gran?\s*reserva|cuvée|cuvee|grand\s*cru|premier\s*cru|selection|single\s*vineyard/i.test(l)
      ) || otherLines[0];

      if (wineryLine && wineTypeLine) {
        wineName = `${wineryLine} ${wineTypeLine}`;
      } else {
        wineName = wineryLine || significantLines.slice(0, 2).join(' ');
      }
    } else {
      // No clear winery - combine first few lines
      wineName = significantLines.slice(0, 3).join(' ');
    }
  }

  // Clean up the wine name
  wineName = wineName
    .replace(/\b(19|20)\d{2}\b/g, '') // Remove years
    .replace(/\d+(\.\d+)?%/g, '')      // Remove percentages
    .replace(/\s+/g, ' ')              // Normalize whitespace
    .trim();

  // Remove trailing/leading punctuation
  wineName = wineName.replace(/^[,.\s-]+|[,.\s-]+$/g, '').trim();

  // If name is too short, it's probably wrong
  if (wineName.length < 3) {
    wineName = significantLines.join(' ').slice(0, 100);
  }

  // Create a single batch with one item
  const batch: ParsedBatch = {
    purchaseDate: new Date(),
    items: [{
      name: wineName,
      color,
      vintageYear,
      quantity: 1,
      tastings: []
    }]
  };

  return {
    batches: [batch],
    ambiguities
  };
}
