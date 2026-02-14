// Fuzzy matching utilities for wine name comparison
// Goal: Catch OCR variations while avoiding false positives

/**
 * Normalize a wine name for comparison:
 * - Remove accents (é→e, ô→o, ü→u)
 * - Lowercase
 * - Normalize whitespace
 * - Remove common punctuation variations
 * - Remove common filler words
 */
export function normalizeWineName(name: string): string {
  return name
    // Remove accents
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Lowercase
    .toLowerCase()
    // Normalize apostrophes and quotes
    .replace(/[''`]/g, "'")
    .replace(/[""]/g, '"')
    // Remove periods (Ch. vs Château)
    .replace(/\./g, '')
    // Normalize hyphens and dashes
    .replace(/[–—−]/g, '-')
    // Remove extra whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= b.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[a.length][b.length];
}

/**
 * Calculate similarity ratio (0-1) between two strings
 */
export function similarity(a: string, b: string): number {
  const normA = normalizeWineName(a);
  const normB = normalizeWineName(b);

  if (normA === normB) return 1.0;
  if (normA.length === 0 || normB.length === 0) return 0;

  const distance = levenshteinDistance(normA, normB);
  const maxLen = Math.max(normA.length, normB.length);

  return 1 - distance / maxLen;
}

/**
 * Check if one name contains the other (after normalization)
 * Useful for catching "Château Margaux" vs "Château Margaux Grand Vin"
 */
export function containsMatch(a: string, b: string): boolean {
  const normA = normalizeWineName(a);
  const normB = normalizeWineName(b);

  // One must be significantly shorter than the other
  if (Math.abs(normA.length - normB.length) < 3) return false;

  return normA.includes(normB) || normB.includes(normA);
}

export interface PotentialMatch {
  existingId: number;
  existingName: string;
  importedName: string;
  similarity: number;
  matchType: 'exact_normalized' | 'high_similarity' | 'contains';
}

/**
 * Find potential matches for an imported wine name against existing wines
 *
 * Returns matches in order of confidence:
 * 1. exact_normalized - Names are identical after normalization (auto-match safe)
 * 2. high_similarity - Names are >85% similar (suggest to user)
 * 3. contains - One name contains the other (suggest to user)
 */
export function findPotentialMatches(
  importedName: string,
  existingWines: { id: number; name: string }[],
  similarityThreshold: number = 0.85
): PotentialMatch[] {
  const matches: PotentialMatch[] = [];
  const normImported = normalizeWineName(importedName);

  for (const wine of existingWines) {
    const normExisting = normalizeWineName(wine.name);

    // Exact match after normalization
    if (normImported === normExisting) {
      matches.push({
        existingId: wine.id,
        existingName: wine.name,
        importedName,
        similarity: 1.0,
        matchType: 'exact_normalized'
      });
      continue;
    }

    // Calculate similarity
    const sim = similarity(importedName, wine.name);

    if (sim >= similarityThreshold) {
      matches.push({
        existingId: wine.id,
        existingName: wine.name,
        importedName,
        similarity: sim,
        matchType: 'high_similarity'
      });
      continue;
    }

    // Check containment (but only if reasonably similar)
    if (sim >= 0.5 && containsMatch(importedName, wine.name)) {
      matches.push({
        existingId: wine.id,
        existingName: wine.name,
        importedName,
        similarity: sim,
        matchType: 'contains'
      });
    }
  }

  // Sort by similarity (highest first)
  matches.sort((a, b) => b.similarity - a.similarity);

  return matches;
}

/**
 * Determine the best action for a potential match
 */
export function shouldAutoMatch(match: PotentialMatch): boolean {
  // Only auto-match on exact normalized matches
  // Everything else should be confirmed by user
  return match.matchType === 'exact_normalized';
}
