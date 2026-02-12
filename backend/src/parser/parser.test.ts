import {
  detectColor,
  parseDate,
  parseVintageYear,
  parsePrice,
  parseQuantity,
  extractWineName,
  parseText,
  parseReceiptText,
} from './parser';

describe('detectColor', () => {
  test('detects red wines by grape', () => {
    expect(detectColor('Cabernet Sauvignon')).toBe('red');
    expect(detectColor('Pinot Noir')).toBe('red');
    expect(detectColor('Merlot Reserve')).toBe('red');
    expect(detectColor('Syrah')).toBe('red');
    expect(detectColor('Shiraz')).toBe('red');
  });

  test('detects red wines by region', () => {
    expect(detectColor('Châteauneuf-du-Pape')).toBe('red');
    expect(detectColor('Barolo')).toBe('red');
    expect(detectColor('Brunello di Montalcino')).toBe('red');
    expect(detectColor('Douro Reserve')).toBe('red');
  });

  test('detects white wines', () => {
    expect(detectColor('Chardonnay')).toBe('white');
    expect(detectColor('Sauvignon Blanc')).toBe('white');
    expect(detectColor('Riesling')).toBe('white');
    expect(detectColor('Alvarinho')).toBe('white');
    expect(detectColor('Chablis')).toBe('white');
  });

  test('detects sparkling wines', () => {
    expect(detectColor('Champagne')).toBe('sparkling');
    expect(detectColor('Prosecco')).toBe('sparkling');
    expect(detectColor('Cremant d\'Alsace')).toBe('sparkling');
    expect(detectColor('Brut Reserve')).toBe('sparkling');
  });

  test('detects rosé wines', () => {
    expect(detectColor('Rosé')).toBe('rose');
    expect(detectColor('Rose Wine')).toBe('rose');
  });

  test('defaults to red for unknown', () => {
    expect(detectColor('Some Unknown Wine')).toBe('red');
  });
});

describe('parseDate', () => {
  test('parses MM/DD/YY format', () => {
    const date = parseDate('12/25/23');
    expect(date?.getFullYear()).toBe(2023);
    expect(date?.getMonth()).toBe(11); // December
    expect(date?.getDate()).toBe(25);
  });

  test('parses MM/DD/YYYY format', () => {
    const date = parseDate('06/15/2024');
    expect(date?.getFullYear()).toBe(2024);
    expect(date?.getMonth()).toBe(5); // June
    expect(date?.getDate()).toBe(15);
  });

  test('parses MM/YY format', () => {
    const date = parseDate('4/20');
    expect(date?.getFullYear()).toBe(2020);
    expect(date?.getMonth()).toBe(3); // April
  });

  test('parses YYYY-MM-DD format', () => {
    const date = parseDate('2024-03-15');
    expect(date?.getFullYear()).toBe(2024);
    expect(date?.getMonth()).toBe(2); // March
    expect(date?.getDate()).toBe(15);
  });

  test('returns null for invalid date', () => {
    expect(parseDate('not a date')).toBeNull();
    expect(parseDate('')).toBeNull();
  });
});

describe('parseVintageYear', () => {
  test('parses 4-digit years', () => {
    expect(parseVintageYear('Wine 2019')).toBe(2019);
    expect(parseVintageYear('1998 Vintage')).toBe(1998);
    expect(parseVintageYear('2023')).toBe(2023);
  });

  test('parses 2-digit years with apostrophe', () => {
    expect(parseVintageYear("Wine '18")).toBe(2018);
    expect(parseVintageYear("'95 Reserve")).toBe(1995);
  });

  test('parses glued 2-digit years', () => {
    expect(parseVintageYear('CHARDONNAY20')).toBe(2020);
    expect(parseVintageYear('MERLOT18')).toBe(2018);
  });

  test('returns null when no year found', () => {
    expect(parseVintageYear('Wine without year')).toBeNull();
    expect(parseVintageYear('NV')).toBeNull();
  });
});

describe('parsePrice', () => {
  test('parses dollar sign prices', () => {
    expect(parsePrice('$39.99')).toBe(39.99);
    expect(parsePrice('Wine $50')).toBe(50);
    expect(parsePrice('$ 25.00')).toBe(25);
  });

  test('parses @ prices', () => {
    expect(parsePrice('2 @ 39.99')).toBe(39.99);
    expect(parsePrice('3@ 25.00')).toBe(25);
  });

  test('parses comma-delimited prices', () => {
    expect(parsePrice('Chappellet Mountain Cuvee , 35')).toBe(35);
    expect(parsePrice('AALTO Tempranillo, Ribera del duero , 55')).toBe(55);
    expect(parsePrice('ABADIA RETUERTA ESPECIAL, 29.99, 2015')).toBeCloseTo(29.99);
  });

  test('parses YEAR, PRICE: format', () => {
    expect(parsePrice('Wine 2015, 25:')).toBe(25);
  });

  test('parses 50+ style prices', () => {
    expect(parsePrice('Wine 7.5, 50+')).toBe(50);
  });

  test('returns null for no price', () => {
    expect(parsePrice('Wine without price')).toBeNull();
    expect(parsePrice('Wine 5')).toBeNull(); // Too low
  });
});

describe('parseQuantity', () => {
  test('parses parenthetical quantity', () => {
    expect(parseQuantity('Wine (3)')).toBe(3);
    expect(parseQuantity('Wine $50 (2)')).toBe(2);
  });

  test('parses x quantity', () => {
    expect(parseQuantity('Wine x2')).toBe(2);
    expect(parseQuantity('Wine X3')).toBe(3);
  });

  test('parses @ quantity', () => {
    expect(parseQuantity('2 @ 39.99')).toBe(2);
    expect(parseQuantity('3@ 25.00')).toBe(3);
  });

  test('defaults to 1', () => {
    expect(parseQuantity('Wine without quantity')).toBe(1);
  });
});

describe('extractWineName', () => {
  test('removes product codes', () => {
    expect(extractWineName('14041 PENFOLDS BIN 389')).toBe('PENFOLDS BIN 389');
  });

  test('removes vintage year', () => {
    expect(extractWineName('Chateau Example 2019')).toBe('Chateau Example');
  });

  test('removes glued vintage', () => {
    expect(extractWineName('CHARDONNAY20')).toBe('CHARDONNAY');
  });

  test('removes prices', () => {
    expect(extractWineName('Wine $50')).toBe('Wine');
    expect(extractWineName('ABADIA RETUERTA ESPECIAL, 29.99')).toBe('ABADIA RETUERTA ESPECIAL');
    expect(extractWineName('Chappellet Mountain Cuvee , 35')).toBe('Chappellet Mountain Cuvee');
    expect(extractWineName('AALTO Tempranillo, Ribera del duero , 55')).toBe('AALTO Tempranillo, Ribera del duero');
  });

  test('removes trailing ratings', () => {
    expect(extractWineName('Wine 7.5')).toBe('Wine');
  });

  test('removes quantity markers', () => {
    expect(extractWineName('Wine (3)')).toBe('Wine');
    expect(extractWineName('Wine x2')).toBe('Wine');
  });

  test('removes inline tasting notes', () => {
    expect(extractWineName('Cedarville SYrah, 2015, 25: 8.5, Nice red fruit')).toBe('Cedarville SYrah');
  });
});

describe('parseText', () => {
  test('parses simple wine entry with seller notes', () => {
    const text = `6/20
ABADIA RETUERTA ESPECIAL, 29.99, 2015
MUCH IN THE STYLE OF REALLY FINE RED BORDEAUX.`;

    const result = parseText(text);
    expect(result.batches).toHaveLength(1);
    expect(result.batches[0].items).toHaveLength(1);
    expect(result.batches[0].items[0].name).toBe('ABADIA RETUERTA ESPECIAL');
    expect(result.batches[0].items[0].vintageYear).toBe(2015);
    expect(result.batches[0].items[0].sellerNotes).toContain('RED BORDEAUX');
  });

  test('parses wine with tasting note', () => {
    const text = `10/14/25 Mid-range unusual whites

Delille Chaleur White 2022 $40 (3)
11/13/25: 8.5. big viscous tart honey, tart bitter finish.`;

    const result = parseText(text);
    expect(result.batches).toHaveLength(1);
    expect(result.batches[0].theme).toBe('Mid-range unusual whites');
    expect(result.batches[0].items[0].tastings).toHaveLength(1);
    expect(result.batches[0].items[0].tastings[0].rating).toBe(8.5);
  });

  test('handles multiple wines with dates', () => {
    const text = `4/20
The Owl and the oak, Sonoma Cabernet 2013 (50) 7.5
Rich, minerally finish.

6/20
Another Wine 2020 $35`;

    const result = parseText(text);
    expect(result.batches).toHaveLength(2);
  });

  test('parses inline tasting format', () => {
    const text = `6/20
Cedarville SYrah, 2015, 25: 8.5, Nice simple red fruit nose`;

    const result = parseText(text);
    expect(result.batches[0].items[0].name).toBe('Cedarville SYrah');
    expect(result.batches[0].items[0].price).toBe(25);
    expect(result.batches[0].items[0].tastings).toHaveLength(1);
    expect(result.batches[0].items[0].tastings[0].rating).toBe(8.5);
  });
});

describe('parseReceiptText', () => {
  test('parses standard receipt format', () => {
    const text = `2/12/23 order
14248 PINTAS CHARACTER 2019
2 @ 39.99
FROM 30 YEAR OLD VINES, THIS IS A TOP
DOURO VALLEY FIELD BLEND RED.`;

    const result = parseReceiptText(text);
    expect(result.batches).toHaveLength(1);
    expect(result.batches[0].items).toHaveLength(1);

    const item = result.batches[0].items[0];
    expect(item.name).toBe('PINTAS CHARACTER');
    expect(item.vintageYear).toBe(2019);
    expect(item.quantity).toBe(2);
    expect(item.price).toBe(39.99);
    expect(item.sellerNotes).toContain('DOURO VALLEY');
  });

  test('parses multiple wines from receipt', () => {
    const text = `2/12/23 order
14248 PINTAS CHARACTER 2019
2 @ 39.99
RED FROM PORTUGAL

13006 QUINTA BACALHOA CS/M 2017
2 @ 35.99
CABERNET AND MERLOT BLEND`;

    const result = parseReceiptText(text);
    expect(result.batches[0].items).toHaveLength(2);

    expect(result.batches[0].items[0].name).toBe('PINTAS CHARACTER');
    expect(result.batches[0].items[1].name).toBe('QUINTA BACALHOA CS/M');
  });

  test('detects wine colors correctly', () => {
    const text = `2/12/23 order
10668 SOALHEIRO ALVARINHO 2022
2 @ 24.99
GREAT SEAFOOD WHITE.`;

    const result = parseReceiptText(text);
    expect(result.batches[0].items[0].color).toBe('white');
  });
});
