/**
 * Tests for new features:
 * - Optional purchase date (null allowed)
 * - Import execute with edited batches
 * - Import with inline tastings
 * - Error handling for empty/malformed imports
 * - Corrections API
 *
 * Runs against live backend. Set TEST_API_BASE env var.
 */

const API_BASE = process.env.TEST_API_BASE || 'http://localhost:3001/api';

const createdWineIds: number[] = [];

async function api<T = any>(path: string, options?: RequestInit): Promise<{ status: number; data: T }> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (response.status === 204) return { status: 204, data: undefined as T };
  const data = await response.json() as T;
  return { status: response.status, data };
}

afterAll(async () => {
  for (const id of createdWineIds) {
    try { await api(`/wines/${id}`, { method: 'DELETE' }); } catch (_) {}
  }
}, 30000);

// ============ OPTIONAL PURCHASE DATE ============

describe('Optional Purchase Date', () => {
  test('creates wine with no purchase date', async () => {
    const { status, data } = await api('/wines/create-with-vintage', {
      method: 'POST',
      body: JSON.stringify({
        name: `__TEST_NODATE_${Date.now()}`,
        color: 'red',
        vintageYear: 2021,
        price: 25,
        quantity: 1,
        // no purchaseDate
      }),
    });
    createdWineIds.push(data.wine.id);
    expect([200, 201]).toContain(status);
    expect(data.wine.id).toBeDefined();
    expect(data.vintageCreated).toBe(true);
  }, 15000);

  test('creates wine with explicit purchase date', async () => {
    const { status, data } = await api('/wines/create-with-vintage', {
      method: 'POST',
      body: JSON.stringify({
        name: `__TEST_WITHDATE_${Date.now()}`,
        color: 'white',
        vintageYear: 2022,
        price: 30,
        quantity: 2,
        purchaseDate: '2026-01-15',
      }),
    });
    createdWineIds.push(data.wine.id);
    expect([200, 201]).toContain(status);
    expect(data.wine.id).toBeDefined();
  }, 15000);

  test('creates wine with no price and no date', async () => {
    const { status, data } = await api('/wines/create-with-vintage', {
      method: 'POST',
      body: JSON.stringify({
        name: `__TEST_BARE_${Date.now()}`,
        color: 'rose',
        vintageYear: 2023,
        // no price, no date, no quantity
      }),
    });
    createdWineIds.push(data.wine.id);
    expect([200, 201]).toContain(status);
    expect(data.wine.id).toBeDefined();
  }, 15000);
});

// ============ IMPORT WITH EDITED BATCHES ============

describe('Import Execute with Edited Batches', () => {
  test('imports using editedBatches directly (bypass re-parse)', async () => {
    const wineName = `__TEST_EDITED_IMPORT_${Date.now()}`;
    const { status, data } = await api('/import/execute', {
      method: 'POST',
      body: JSON.stringify({
        mode: 'standard',
        editedBatches: [{
          purchaseDate: '2026-03-01',
          items: [{
            name: wineName,
            color: 'red',
            vintageYear: 2019,
            price: 45,
            quantity: 1,
          }],
        }],
        matchDecisions: {},
      }),
    });
    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.results.winesCreated).toBe(1);
    expect(data.results.vintagesCreated).toBe(1);
    expect(data.importedWineIds).toHaveLength(1);
    createdWineIds.push(data.importedWineIds[0]);
  }, 15000);

  test('imports with null purchaseDate in batch', async () => {
    const wineName = `__TEST_NODATE_BATCH_${Date.now()}`;
    const { status, data } = await api('/import/execute', {
      method: 'POST',
      body: JSON.stringify({
        mode: 'standard',
        editedBatches: [{
          purchaseDate: null,
          items: [{
            name: wineName,
            color: 'white',
            vintageYear: 2020,
            price: 20,
            quantity: 1,
          }],
        }],
        matchDecisions: {},
      }),
    });
    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.results.winesCreated).toBe(1);
    createdWineIds.push(data.importedWineIds[0]);
  }, 15000);

  test('imports with inline tasting in edited batch', async () => {
    const wineName = `__TEST_TASTING_IMPORT_${Date.now()}`;
    const { status, data } = await api('/import/execute', {
      method: 'POST',
      body: JSON.stringify({
        mode: 'standard',
        editedBatches: [{
          purchaseDate: '2026-03-15',
          items: [{
            name: wineName,
            color: 'red',
            vintageYear: 2018,
            price: 60,
            quantity: 1,
            tastings: [{
              rating: 8.5,
              notes: 'Excellent depth and complexity',
              date: '2026-03-15T12:00:00.000Z',
            }],
          }],
        }],
        matchDecisions: {},
      }),
    });
    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.results.winesCreated).toBe(1);
    expect(data.results.tastingsCreated).toBe(1);
    createdWineIds.push(data.importedWineIds[0]);
  }, 15000);

  test('imports multiple wines in single batch', async () => {
    const ts = Date.now();
    const { status, data } = await api('/import/execute', {
      method: 'POST',
      body: JSON.stringify({
        mode: 'standard',
        editedBatches: [{
          purchaseDate: '2026-02-20',
          items: [
            { name: `__TEST_MULTI_A_${ts}`, color: 'red', vintageYear: 2019, price: 30, quantity: 1 },
            { name: `__TEST_MULTI_B_${ts}`, color: 'white', vintageYear: 2021, price: 22, quantity: 2 },
            { name: `__TEST_MULTI_C_${ts}`, color: 'sparkling', vintageYear: 2020, price: 45, quantity: 1 },
          ],
        }],
        matchDecisions: {},
      }),
    });
    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.results.winesCreated).toBe(3);
    expect(data.results.vintagesCreated).toBe(3);
    expect(data.results.purchaseItemsCreated).toBe(3);
    expect(data.importedWineIds).toHaveLength(3);
    data.importedWineIds.forEach((id: number) => createdWineIds.push(id));
  }, 15000);
});

// ============ IMPORT EDGE CASES & ERROR HANDLING ============

describe('Import Error Handling', () => {
  test('rejects import with no text and no editedBatches', async () => {
    const { status } = await api('/import/execute', {
      method: 'POST',
      body: JSON.stringify({ mode: 'standard' }),
    });
    expect(status).toBe(400);
  }, 15000);

  test('skips items with empty or too-short names', async () => {
    const ts = Date.now();
    const { status, data } = await api('/import/execute', {
      method: 'POST',
      body: JSON.stringify({
        mode: 'standard',
        editedBatches: [{
          items: [
            { name: '', color: 'red', vintageYear: 2020 },
            { name: 'A', color: 'red', vintageYear: 2020 },
            { name: `__TEST_VALID_${ts}`, color: 'red', vintageYear: 2020, price: 10, quantity: 1 },
          ],
        }],
        matchDecisions: {},
      }),
    });
    expect(status).toBe(200);
    expect(data.results.winesCreated).toBe(1);
    createdWineIds.push(data.importedWineIds[0]);
  }, 15000);

  test('skips vintage creation when vintageYear is 0', async () => {
    const wineName = `__TEST_NOYEAR_${Date.now()}`;
    const { status, data } = await api('/import/execute', {
      method: 'POST',
      body: JSON.stringify({
        mode: 'standard',
        editedBatches: [{
          items: [{ name: wineName, color: 'red', vintageYear: 0 }],
        }],
        matchDecisions: {},
      }),
    });
    expect(status).toBe(200);
    expect(data.results.winesCreated).toBe(1);
    expect(data.results.vintagesCreated).toBe(0);
    createdWineIds.push(data.importedWineIds[0]);
  }, 15000);

  test('import matches existing wine by name (case insensitive)', async () => {
    // Create a wine first
    const ts = Date.now();
    const wineName = `__TEST_MATCH_${ts}`;
    const { data: created } = await api('/wines/create-with-vintage', {
      method: 'POST',
      body: JSON.stringify({ name: wineName, color: 'red', vintageYear: 2020 }),
    });
    createdWineIds.push(created.wine.id);

    // Import with same name different case
    const { status, data } = await api('/import/execute', {
      method: 'POST',
      body: JSON.stringify({
        mode: 'standard',
        editedBatches: [{
          items: [{ name: wineName.toLowerCase(), color: 'red', vintageYear: 2021, price: 35 }],
        }],
        matchDecisions: {},
      }),
    });
    expect(status).toBe(200);
    expect(data.results.winesCreated).toBe(0);
    expect(data.results.winesMatched).toBe(1);
    expect(data.results.vintagesCreated).toBe(1);
  }, 15000);

  test('preview with garbage text returns empty but no crash', async () => {
    const { status, data } = await api('/import/preview', {
      method: 'POST',
      body: JSON.stringify({ text: '💀🎃 random emoji garbage !@#$%^&*()', mode: 'standard' }),
    });
    expect(status).toBe(200);
    expect(data.batches).toBeDefined();
  }, 15000);

  test('preview with empty text returns 400', async () => {
    const { status } = await api('/import/preview', {
      method: 'POST',
      body: JSON.stringify({ text: '', mode: 'standard' }),
    });
    expect(status).toBe(400);
  }, 15000);
});

// ============ CORRECTIONS API ============

describe('Corrections API', () => {
  test('saves parse corrections', async () => {
    const { status, data } = await api('/import/corrections', {
      method: 'POST',
      body: JSON.stringify({
        corrections: [
          { fieldName: 'name', wrongValue: 'CHATEU MARGAUX', correctValue: 'Chateau Margaux', originalText: 'test receipt' },
          { fieldName: 'color', wrongValue: 'white', correctValue: 'red', originalText: 'test receipt' },
        ],
        mode: 'receipt',
      }),
    });
    expect(status).toBe(200);
    expect(data.success).toBe(true);
  }, 15000);

  test('rejects corrections without array', async () => {
    const { status } = await api('/import/corrections', {
      method: 'POST',
      body: JSON.stringify({ corrections: 'not an array', mode: 'receipt' }),
    });
    expect(status).toBe(400);
  }, 15000);
});

// ============ CHAOS: RAPID-FIRE & EDGE CASES ============

describe('Chaos Tests - New Features', () => {
  test('rapid-fire create 5 wines with no dates', async () => {
    const promises = Array.from({ length: 5 }, (_, i) =>
      api('/wines/create-with-vintage', {
        method: 'POST',
        body: JSON.stringify({
          name: `__TEST_RAPID_${Date.now()}_${i}`,
          color: ['red', 'white', 'rose', 'sparkling'][i % 4],
          vintageYear: 2020 + i,
          price: 10 + i * 5,
          // no purchaseDate
        }),
      })
    );
    const results = await Promise.all(promises);
    for (const { status, data } of results) {
      expect([200, 201]).toContain(status);
      expect(data.wine.id).toBeDefined();
      createdWineIds.push(data.wine.id);
    }
  }, 30000);

  test('import then immediately re-import same wine (dedup via match)', async () => {
    const wineName = `__TEST_DEDUP_${Date.now()}`;

    // First import
    const { data: first } = await api('/import/execute', {
      method: 'POST',
      body: JSON.stringify({
        mode: 'standard',
        editedBatches: [{ items: [{ name: wineName, color: 'red', vintageYear: 2020, price: 30 }] }],
        matchDecisions: {},
      }),
    });
    expect(first.results.winesCreated).toBe(1);
    createdWineIds.push(first.importedWineIds[0]);

    // Second import - same name, different vintage
    const { data: second } = await api('/import/execute', {
      method: 'POST',
      body: JSON.stringify({
        mode: 'standard',
        editedBatches: [{ items: [{ name: wineName, color: 'red', vintageYear: 2021, price: 35 }] }],
        matchDecisions: {},
      }),
    });
    expect(second.results.winesCreated).toBe(0);
    expect(second.results.winesMatched).toBe(1);
    expect(second.results.vintagesCreated).toBe(1);
  }, 30000);

  test('import with multiple tastings on same wine', async () => {
    const wineName = `__TEST_MULTITASTE_${Date.now()}`;
    const { status, data } = await api('/import/execute', {
      method: 'POST',
      body: JSON.stringify({
        mode: 'standard',
        editedBatches: [{
          items: [{
            name: wineName,
            color: 'red',
            vintageYear: 2019,
            price: 50,
            tastings: [
              { rating: 7.5, notes: 'First impression', date: '2026-01-01T12:00:00Z' },
              { rating: 8.0, notes: 'Second tasting', date: '2026-02-01T12:00:00Z' },
              { rating: 8.5, notes: 'Getting better with age', date: '2026-03-01T12:00:00Z' },
            ],
          }],
        }],
        matchDecisions: {},
      }),
    });
    expect(status).toBe(200);
    expect(data.results.tastingsCreated).toBe(3);
    createdWineIds.push(data.importedWineIds[0]);
  }, 15000);

  test('import batch with mix of valid and invalid items', async () => {
    const ts = Date.now();
    const { status, data } = await api('/import/execute', {
      method: 'POST',
      body: JSON.stringify({
        mode: 'standard',
        editedBatches: [{
          items: [
            { name: `__TEST_MIXED_OK_${ts}`, color: 'red', vintageYear: 2020, price: 25 },
            { name: '', color: 'red', vintageYear: 2020 },                    // empty name - skip
            { name: 'X', color: 'red', vintageYear: 2020 },                   // too short - skip
            { name: `__TEST_MIXED_OK2_${ts}`, color: 'white', vintageYear: 0 }, // no vintage year
          ],
        }],
        matchDecisions: {},
      }),
    });
    expect(status).toBe(200);
    expect(data.results.winesCreated).toBe(2);
    expect(data.results.vintagesCreated).toBe(1); // only the one with vintageYear > 0
    data.importedWineIds.forEach((id: number) => createdWineIds.push(id));
  }, 15000);

  test('create wine with tasting but no purchase', async () => {
    const { status, data } = await api('/wines/create-with-vintage', {
      method: 'POST',
      body: JSON.stringify({
        name: `__TEST_TASTING_ONLY_${Date.now()}`,
        color: 'red',
        vintageYear: 2018,
        tasting: { rating: 9.0, notes: 'Outstanding' },
        // no price, no date
      }),
    });
    expect([200, 201]).toContain(status);
    expect(data.tastingCreated).toBe(true);
    createdWineIds.push(data.wine.id);
  }, 15000);

  test('unicode wine names survive round-trip', async () => {
    const unicodeName = `__TEST_Château Léoville-Barton Réserve_${Date.now()}`;
    const { status, data } = await api('/wines/create-with-vintage', {
      method: 'POST',
      body: JSON.stringify({
        name: unicodeName,
        color: 'red',
        vintageYear: 2015,
        price: 120,
      }),
    });
    expect([200, 201]).toContain(status);
    createdWineIds.push(data.wine.id);

    // Fetch it back
    const { data: fetched } = await api(`/wines/${data.wine.id}`);
    expect(fetched.name).toBe(unicodeName);
  }, 15000);

  test('concurrent imports of different wines do not interfere', async () => {
    const ts = Date.now();
    const imports = Array.from({ length: 3 }, (_, i) =>
      api('/import/execute', {
        method: 'POST',
        body: JSON.stringify({
          mode: 'standard',
          editedBatches: [{
            items: [{ name: `__TEST_CONCURRENT_${ts}_${i}`, color: 'red', vintageYear: 2020 + i, price: 20 + i }],
          }],
          matchDecisions: {},
        }),
      })
    );
    const results = await Promise.all(imports);
    for (const { status, data } of results) {
      expect(status).toBe(200);
      expect(data.results.winesCreated).toBe(1);
      createdWineIds.push(data.importedWineIds[0]);
    }
  }, 30000);
});
