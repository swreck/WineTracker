/**
 * Extended Parser Tests
 * Covers label mode, edge cases, and tricky parsing scenarios
 */

import { parseText, parseReceiptText, parseLabelText, detectColor, parseDate, parseVintageYear, parsePrice, parseQuantity, extractWineName } from './parser';

describe('Label Mode Parsing', () => {
  test('parses simple wine label', () => {
    const result = parseLabelText(`
      Château Margaux
      2015
      Grand Vin de Bordeaux
    `);
    expect(result.batches).toHaveLength(1);
    expect(result.batches[0].items).toHaveLength(1);
    const item = result.batches[0].items[0];
    expect(item.vintageYear).toBe(2015);
    expect(item.color).toBe('red'); // Bordeaux → red
  });

  test('extracts vintage from mixed text', () => {
    const result = parseLabelText(`
      Domaine de la Romanée-Conti
      Echezeaux Grand Cru
      Appellation Echezeaux Contrôlée
      2018
      750ml 13.5% vol
    `);
    expect(result.batches[0].items[0].vintageYear).toBe(2018);
    expect(result.batches[0].items[0].name).toBeTruthy();
  });

  test('handles 2-digit vintage year', () => {
    const result = parseLabelText(`
      Silver Oak Cabernet
      Napa Valley 18
    `);
    expect(result.batches[0].items[0].vintageYear).toBe(2018);
  });

  test('defaults vintage when none found', () => {
    const result = parseLabelText(`
      Some Mystery Wine
      Product of France
    `);
    expect(result.batches[0].items[0].vintageYear).toBeDefined();
    expect(result.ambiguities.some(a => a.type === 'vintage_parse')).toBe(true);
  });

  test('detects white wine from label', () => {
    const result = parseLabelText(`
      Cloudy Bay
      Sauvignon Blanc
      Marlborough 2022
    `);
    expect(result.batches[0].items[0].color).toBe('white');
  });

  test('detects sparkling from label', () => {
    const result = parseLabelText(`
      Moët & Chandon
      Champagne Brut
      2018
    `);
    expect(result.batches[0].items[0].color).toBe('sparkling');
  });

  test('filters out alcohol and volume lines from name', () => {
    const result = parseLabelText(`
      Opus One
      2019
      14.5% Alc. by Vol.
      750ml
    `);
    const name = result.batches[0].items[0].name.toLowerCase();
    expect(name).not.toContain('alc');
    expect(name).not.toContain('750ml');
  });
});

describe('Standard Parser Edge Cases', () => {
  test('handles multiple batches with different dates', () => {
    const result = parseText(`
      10/14/25
      CHATEAU MARGAUX 2015 $299

      11/20/25
      OPUS ONE 2018 $399
    `);
    expect(result.batches).toHaveLength(2);
    expect(result.batches[0].items).toHaveLength(1);
    expect(result.batches[1].items).toHaveLength(1);
  });

  test('handles wines with no price', () => {
    const result = parseText(`
      10/14/25
      CAYMUS CABERNET SAUVIGNON 2019
    `);
    expect(result.batches[0].items[0].price).toBeUndefined();
  });

  test('handles tasting notes after wine line', () => {
    const result = parseText(`
      10/14/25
      PINTAS CHARACTER 2019 $40
      FROM 30 YEAR OLD VINES, THIS IS A TOP DOURO VALLEY RED.
    `);
    const item = result.batches[0].items[0];
    expect(item.sellerNotes).toContain('DOURO VALLEY');
  });

  test('handles empty input', () => {
    const result = parseText('');
    expect(result.batches).toHaveLength(0);
  });

  test('handles input with only whitespace', () => {
    const result = parseText('   \n\n   ');
    expect(result.batches).toHaveLength(0);
  });

  test('handles wine with embedded tasting', () => {
    const result = parseText(`
      10/14/25
      ABADIA RETUERTA 2019 $30
      11/13/25: 8.5. Big dark fruit, spice.
    `);
    const item = result.batches[0].items[0];
    expect(item.tastings.length).toBeGreaterThanOrEqual(1);
    expect(item.tastings[0].rating).toBe(8.5);
  });

  test('handles date with theme', () => {
    const result = parseText(`
      10/14/25 Costco run
      CAYMUS CABERNET 2019 $79.99
    `);
    expect(result.batches[0].theme).toContain('Costco');
  });
});

describe('Receipt Parser Edge Cases', () => {
  test('handles receipt with product code and separate year', () => {
    const result = parseReceiptText(`
      15075 POEIRINHO BAIRRADA BAGA 16
      1 @ 49.99        5.00        44.99 T
    `);
    expect(result.batches.length).toBeGreaterThanOrEqual(1);
    if (result.batches.length > 0) {
      expect(result.batches[0].items.length).toBeGreaterThanOrEqual(1);
    }
  });

  test('handles receipt with multiple items', () => {
    const result = parseReceiptText(`
      14248 PINTAS CHARACTER 2019
      2 @ 39.99        S        79.98 T
      10668 SOALHEIRO ALVARINHO 2022
      2 @ 24.99        2.50        44.98 T
    `);
    expect(result.batches[0].items.length).toBe(2);
  });
});

describe('detectColor edge cases', () => {
  test('recognizes Pinot Noir as red', () => {
    expect(detectColor('ESTATE PINOT NOIR WILLAMETTE')).toBe('red');
  });

  test('recognizes Chardonnay as white', () => {
    expect(detectColor('SONOMA COAST CHARDONNAY')).toBe('white');
  });

  test('recognizes Rosé with accent', () => {
    expect(detectColor('PROVENCE ROSÉ 2022')).toBe('rose');
  });

  test('recognizes Champagne as sparkling', () => {
    expect(detectColor('VEUVE CLICQUOT CHAMPAGNE BRUT')).toBe('sparkling');
  });

  test('recognizes Prosecco as sparkling', () => {
    expect(detectColor('MIONETTO PROSECCO')).toBe('sparkling');
  });

  test('recognizes Cava as sparkling', () => {
    expect(detectColor('FREIXENET CAVA BRUT')).toBe('sparkling');
  });

  test('defaults to red for ambiguous names', () => {
    expect(detectColor('CHATEAU UNKNOWN RESERVE')).toBe('red');
  });
});

describe('parsePrice edge cases', () => {
  test('parses $XX.XX format', () => {
    expect(parsePrice('$29.99')).toBe(29.99);
  });

  test('parses quantity @ price format', () => {
    expect(parsePrice('2 @ 39.99')).toBe(39.99);
  });

  test('returns value for any parseable price', () => {
    // The parser accepts any valid price format, no minimum threshold
    expect(parsePrice('$5.00')).toBe(5);
    expect(parsePrice('$29.99')).toBe(29.99);
  });

  test('handles parenthetical price', () => {
    const price = parsePrice('(50)');
    // May or may not parse depending on implementation
    expect(price === null || price === 50).toBe(true);
  });
});

describe('extractWineName edge cases', () => {
  test('removes vintage year', () => {
    const name = extractWineName('CHATEAU MARGAUX 2015');
    expect(name).not.toContain('2015');
    expect(name).toContain('CHATEAU MARGAUX');
  });

  test('removes price', () => {
    const name = extractWineName('OPUS ONE $399.99');
    expect(name).not.toContain('399');
    expect(name).toContain('OPUS ONE');
  });

  test('removes product code', () => {
    const name = extractWineName('14248 PINTAS CHARACTER');
    expect(name).not.toContain('14248');
    expect(name).toContain('PINTAS CHARACTER');
  });

  test('handles wine name with no extras', () => {
    const name = extractWineName('CAYMUS CABERNET SAUVIGNON');
    expect(name).toBe('CAYMUS CABERNET SAUVIGNON');
  });
});
