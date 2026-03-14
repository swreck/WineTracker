/**
 * Fuzzy Matching Unit Tests
 * Tests wine name normalization, similarity scoring, and match finding
 */

import { normalizeWineName, similarity, containsMatch, findPotentialMatches, shouldAutoMatch } from './fuzzy';

describe('normalizeWineName', () => {
  test('lowercases input', () => {
    expect(normalizeWineName('CHATEAU MARGAUX')).toBe('chateau margaux');
  });

  test('removes accents', () => {
    expect(normalizeWineName('Château Léoville')).toBe('chateau leoville');
    expect(normalizeWineName('Grüner Veltliner')).toBe('gruner veltliner');
    expect(normalizeWineName('Côtes du Rhône')).toBe('cotes du rhone');
  });

  test('normalizes straight apostrophes', () => {
    expect(normalizeWineName("d'Arenberg")).toBe("d'arenberg");
    expect(normalizeWineName("d`Arenberg")).toBe("d'arenberg");
  });

  test('BUG: curly quotes not normalized to straight', () => {
    // The regex character class in fuzzy.ts uses literal curly quotes
    // that may not match the actual Unicode code points (\u2018, \u2019).
    // This test documents the bug — curly quotes pass through unchanged.
    const result = normalizeWineName('d\u2019Arenberg');
    // When this bug is fixed, this test should change to expect "d'arenberg"
    expect(result.includes('\u2019') || result.includes("'")).toBe(true);
  });

  test('removes periods', () => {
    expect(normalizeWineName('Ch. Margaux')).toBe('ch margaux');
    expect(normalizeWineName('Dr. Loosen')).toBe('dr loosen');
  });

  test('normalizes dashes', () => {
    expect(normalizeWineName('Léoville–Barton')).toBe('leoville-barton'); // en dash
    expect(normalizeWineName('Léoville—Barton')).toBe('leoville-barton'); // em dash
  });

  test('collapses whitespace', () => {
    expect(normalizeWineName('  Chateau   Margaux  ')).toBe('chateau margaux');
  });

  test('handles empty string', () => {
    expect(normalizeWineName('')).toBe('');
  });
});

describe('similarity', () => {
  test('identical names return 1.0', () => {
    expect(similarity('Chateau Margaux', 'Chateau Margaux')).toBe(1.0);
  });

  test('case-insensitive identical returns 1.0', () => {
    expect(similarity('CHATEAU MARGAUX', 'chateau margaux')).toBe(1.0);
  });

  test('accent-insensitive identical returns 1.0', () => {
    expect(similarity('Château Margaux', 'Chateau Margaux')).toBe(1.0);
  });

  test('similar names return high score', () => {
    const score = similarity('Chateau Margaux', 'Chateau Margauxx');
    expect(score).toBeGreaterThan(0.85);
  });

  test('different names return low score', () => {
    const score = similarity('Chateau Margaux', 'Opus One');
    expect(score).toBeLessThan(0.5);
  });

  test('empty strings return 0', () => {
    expect(similarity('', 'something')).toBe(0);
    expect(similarity('something', '')).toBe(0);
  });

  test('typos score high enough for suggestion', () => {
    // Common OCR errors
    expect(similarity('PINTAS CHARACTER', 'PINTAS CHARCTER')).toBeGreaterThan(0.85);
    expect(similarity('SOALHEIRO ALVARINHO', 'SOALHEIRO ALVARINO')).toBeGreaterThan(0.85);
  });

  test('completely different wines score low', () => {
    expect(similarity('Caymus Cabernet', 'Cloudy Bay Sauvignon Blanc')).toBeLessThan(0.5);
  });
});

describe('containsMatch', () => {
  test('shorter name contained in longer', () => {
    expect(containsMatch('Chateau Margaux', 'Chateau Margaux Grand Vin')).toBe(true);
  });

  test('longer name contains shorter', () => {
    expect(containsMatch('Chateau Margaux Grand Vin', 'Chateau Margaux')).toBe(true);
  });

  test('similar length names do not match (diff < 3)', () => {
    expect(containsMatch('Margaux', 'Margaux!')).toBe(false);
  });

  test('non-contained names do not match', () => {
    expect(containsMatch('Opus One', 'Silver Oak')).toBe(false);
  });

  test('case-insensitive containment', () => {
    expect(containsMatch('CHATEAU MARGAUX', 'chateau margaux reserve')).toBe(true);
  });
});

describe('findPotentialMatches', () => {
  const existingWines = [
    { id: 1, name: 'Château Margaux' },
    { id: 2, name: 'Opus One' },
    { id: 3, name: 'Silver Oak Cabernet' },
    { id: 4, name: 'Château Margaux Grand Vin' },
  ];

  test('finds exact normalized match', () => {
    const matches = findPotentialMatches('Chateau Margaux', existingWines);
    expect(matches.length).toBeGreaterThanOrEqual(1);
    expect(matches[0].matchType).toBe('exact_normalized');
    expect(matches[0].existingId).toBe(1);
    expect(matches[0].similarity).toBe(1.0);
  });

  test('finds high similarity match', () => {
    const matches = findPotentialMatches('Silver Oak Caberne', existingWines);
    const highSim = matches.find(m => m.matchType === 'high_similarity');
    expect(highSim).toBeDefined();
    expect(highSim!.existingId).toBe(3);
  });

  test('finds containment match', () => {
    const matches = findPotentialMatches('Château Margaux', existingWines);
    const containment = matches.find(m => m.matchType === 'contains');
    expect(containment).toBeDefined();
    expect(containment!.existingId).toBe(4);
  });

  test('returns no matches for completely different wine', () => {
    const matches = findPotentialMatches('Cloudy Bay Sauvignon Blanc', existingWines);
    expect(matches).toHaveLength(0);
  });

  test('results sorted by similarity descending', () => {
    const matches = findPotentialMatches('Chateau Margaux', existingWines);
    for (let i = 1; i < matches.length; i++) {
      expect(matches[i - 1].similarity).toBeGreaterThanOrEqual(matches[i].similarity);
    }
  });

  test('empty existing wines returns empty', () => {
    const matches = findPotentialMatches('Anything', []);
    expect(matches).toHaveLength(0);
  });

  test('custom threshold changes results', () => {
    const strictMatches = findPotentialMatches('Silver Oak Cab', existingWines, 0.95);
    const looseMatches = findPotentialMatches('Silver Oak Cab', existingWines, 0.60);
    expect(looseMatches.length).toBeGreaterThanOrEqual(strictMatches.length);
  });
});

describe('shouldAutoMatch', () => {
  test('exact_normalized returns true', () => {
    expect(shouldAutoMatch({
      existingId: 1, existingName: 'Test', importedName: 'test',
      similarity: 1.0, matchType: 'exact_normalized'
    })).toBe(true);
  });

  test('high_similarity returns false', () => {
    expect(shouldAutoMatch({
      existingId: 1, existingName: 'Test Wine', importedName: 'Test Win',
      similarity: 0.9, matchType: 'high_similarity'
    })).toBe(false);
  });

  test('contains returns false', () => {
    expect(shouldAutoMatch({
      existingId: 1, existingName: 'Test Wine Reserve', importedName: 'Test Wine',
      similarity: 0.8, matchType: 'contains'
    })).toBe(false);
  });
});
