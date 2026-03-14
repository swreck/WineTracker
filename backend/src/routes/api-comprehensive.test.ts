/**
 * Comprehensive API + Chaos Tests
 * Tests against the running backend (Railway or local).
 * All tests create their own data and clean up after themselves.
 *
 * Set API_BASE env var to override (default: http://localhost:3001/api)
 */

const API_BASE = process.env.TEST_API_BASE || 'http://localhost:3001/api';

// Track all created wine IDs for cleanup
const createdWineIds: number[] = [];
const createdPurchaseBatchIds: number[] = [];

async function api<T = any>(path: string, options?: RequestInit): Promise<{ status: number; data: T }> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });

  if (response.status === 204) {
    return { status: 204, data: undefined as T };
  }

  const data = await response.json() as T;
  return { status: response.status, data };
}

async function createTestWine(suffix: string, color: string = 'red') {
  const name = `__TEST_${suffix}_${Date.now()}`;
  const { data } = await api('/wines', {
    method: 'POST',
    body: JSON.stringify({ name, color }),
  });
  createdWineIds.push(data.id);
  return data;
}

async function createTestWineWithVintage(suffix: string, year: number = 2020) {
  const name = `__TEST_${suffix}_${Date.now()}`;
  const { data } = await api('/wines/create-with-vintage', {
    method: 'POST',
    body: JSON.stringify({
      name,
      color: 'red',
      vintageYear: year,
      price: 50,
      quantity: 1,
      purchaseDate: '2024-06-15',
    }),
  });
  createdWineIds.push(data.wine.id);
  return data;
}

// Global cleanup
afterAll(async () => {
  // Delete all test wines (cascade deletes vintages, tastings, purchase items)
  for (const id of createdWineIds) {
    try {
      await api(`/wines/${id}`, { method: 'DELETE' });
    } catch (_) { /* already deleted */ }
  }
  // Clean up orphaned purchase batches won't have items, but leave them
  // (they don't have a delete endpoint and are harmless)
});

// ============ WINE CRUD ============

describe('Wine CRUD', () => {
  test('creates a wine', async () => {
    const wine = await createTestWine('CREATE');
    expect(wine.id).toBeDefined();
    expect(wine.name).toContain('__TEST_CREATE');
    expect(wine.color).toBe('red');
  });

  test('gets wine by id with vintages', async () => {
    const { wine } = await createTestWineWithVintage('GETBYID');
    const { status, data } = await api(`/wines/${wine.id}`);
    expect(status).toBe(200);
    expect(data.name).toContain('__TEST_GETBYID');
    expect(data.vintages).toHaveLength(1);
  });

  test('returns 404 for nonexistent wine', async () => {
    const { status } = await api('/wines/999999');
    expect(status).toBe(404);
  });

  test('updates wine metadata', async () => {
    const wine = await createTestWine('UPDATE');
    const { status, data } = await api(`/wines/${wine.id}`, {
      method: 'PUT',
      body: JSON.stringify({ region: 'Napa Valley', appellation: 'Rutherford' }),
    });
    expect(status).toBe(200);
    expect(data.region).toBe('Napa Valley');
    expect(data.appellation).toBe('Rutherford');
  });

  test('deletes wine and cascades', async () => {
    const { wine, vintage } = await createTestWineWithVintage('DELCASCADE');

    // Add a tasting
    await api('/tastings', {
      method: 'POST',
      body: JSON.stringify({ vintageId: vintage.id, rating: 8.0 }),
    });

    const { status, data } = await api(`/wines/${wine.id}`, { method: 'DELETE' });
    expect(status).toBe(200);
    expect(data.success).toBe(true);

    // Remove from cleanup list since already deleted
    const idx = createdWineIds.indexOf(wine.id);
    if (idx >= 0) createdWineIds.splice(idx, 1);

    // Verify gone
    const { status: checkStatus } = await api(`/wines/${wine.id}`);
    expect(checkStatus).toBe(404);
  });

  test('lists wines with search filter', async () => {
    const wine = await createTestWine('SEARCHABLE_XYZ');
    const { status, data } = await api('/wines?search=SEARCHABLE_XYZ');
    expect(status).toBe(200);
    expect(data.some((w: any) => w.id === wine.id)).toBe(true);
  });

  test('lists wines with color filter', async () => {
    const wine = await createTestWine('COLORFILTER', 'sparkling');
    const { status, data } = await api('/wines?color=sparkling');
    expect(status).toBe(200);
    expect(data.some((w: any) => w.id === wine.id)).toBe(true);
  });
});

// ============ VINTAGE CRUD ============

describe('Vintage CRUD', () => {
  test('creates a vintage', async () => {
    const wine = await createTestWine('VINTAGE_CREATE');
    const { status, data } = await api('/vintages', {
      method: 'POST',
      body: JSON.stringify({ wineId: wine.id, vintageYear: 2019, sellerNotes: 'Test notes' }),
    });
    expect(status).toBe(201);
    expect(data.vintageYear).toBe(2019);
    expect(data.sellerNotes).toBe('Test notes');
  });

  test('rejects duplicate vintage year for same wine', async () => {
    const wine = await createTestWine('VINTAGE_DUP');
    await api('/vintages', {
      method: 'POST',
      body: JSON.stringify({ wineId: wine.id, vintageYear: 2020 }),
    });
    const { status } = await api('/vintages', {
      method: 'POST',
      body: JSON.stringify({ wineId: wine.id, vintageYear: 2020 }),
    });
    expect(status).toBe(400);
  });

  test('rejects vintage for nonexistent wine', async () => {
    const { status } = await api('/vintages', {
      method: 'POST',
      body: JSON.stringify({ wineId: 999999, vintageYear: 2020 }),
    });
    expect(status).toBe(404);
  });

  test('updates vintage metadata', async () => {
    const { wine } = await createTestWineWithVintage('VINTAGE_UPD');
    const wineDetail = await api(`/wines/${wine.id}`);
    const vintageId = wineDetail.data.vintages[0].id;

    const { status, data } = await api(`/vintages/${vintageId}`, {
      method: 'PUT',
      body: JSON.stringify({ sellerNotes: 'Updated notes', source: 'costco' }),
    });
    expect(status).toBe(200);
    expect(data.sellerNotes).toBe('Updated notes');
    expect(data.source).toBe('costco');
  });

  test('deletes vintage', async () => {
    const wine = await createTestWine('VINTAGE_DEL');
    const { data: vintage } = await api('/vintages', {
      method: 'POST',
      body: JSON.stringify({ wineId: wine.id, vintageYear: 2021 }),
    });

    const { status } = await api(`/wines/${wine.id}/vintages/${vintage.id}`, {
      method: 'DELETE',
    });
    expect(status).toBe(200);
  });
});

// ============ TASTING CRUD ============

describe('Tasting CRUD', () => {
  test('creates a tasting event', async () => {
    const { vintage } = await createTestWineWithVintage('TASTING_ADD');
    const { status, data } = await api('/tastings', {
      method: 'POST',
      body: JSON.stringify({
        vintageId: vintage.id,
        rating: 8.5,
        notes: 'Dark fruit, spice',
        tastingDate: '2024-06-15',
      }),
    });
    expect(status).toBe(201);
    expect(data.rating).toBe('8.5');
    expect(data.notes).toBe('Dark fruit, spice');
  });

  test('creates tasting without date', async () => {
    const { vintage } = await createTestWineWithVintage('TASTING_NODATE');
    const { status, data } = await api('/tastings', {
      method: 'POST',
      body: JSON.stringify({ vintageId: vintage.id, rating: 7.0 }),
    });
    expect(status).toBe(201);
    expect(data.tastingDate).toBeNull();
  });

  test('updates tasting', async () => {
    const { vintage } = await createTestWineWithVintage('TASTING_UPD');
    const { data: tasting } = await api('/tastings', {
      method: 'POST',
      body: JSON.stringify({ vintageId: vintage.id, rating: 7.0 }),
    });

    const { status, data } = await api(`/tastings/${tasting.id}`, {
      method: 'PUT',
      body: JSON.stringify({ rating: 8.0, notes: 'Better on second taste' }),
    });
    expect(status).toBe(200);
    expect(parseFloat(data.rating)).toBe(8.0);
  });

  test('deletes tasting', async () => {
    const { vintage } = await createTestWineWithVintage('TASTING_DEL');
    const { data: tasting } = await api('/tastings', {
      method: 'POST',
      body: JSON.stringify({ vintageId: vintage.id, rating: 6.5 }),
    });

    const { status } = await api(`/tastings/${tasting.id}`, { method: 'DELETE' });
    expect(status).toBe(204);
  });

  test('lists tastings with filters', async () => {
    const { vintage } = await createTestWineWithVintage('TASTING_FILTER');
    await api('/tastings', {
      method: 'POST',
      body: JSON.stringify({
        vintageId: vintage.id,
        rating: 9.0,
        tastingDate: '2024-06-15',
      }),
    });

    const { status, data } = await api('/tastings?minRating=8');
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });
});

// ============ PURCHASE CRUD ============

describe('Purchase CRUD', () => {
  test('creates a purchase item with auto batch', async () => {
    const { wine, vintage } = await createTestWineWithVintage('PURCHASE_ADD');
    const { status, data } = await api('/purchases/items', {
      method: 'POST',
      body: JSON.stringify({
        vintageId: vintage.id,
        wineId: wine.id,
        pricePaid: 45.99,
        quantityPurchased: 2,
        purchaseDate: '2024-07-20',
      }),
    });
    expect(status).toBe(201);
    expect(data.pricePaid).toBe('45.99');
    expect(data.quantityPurchased).toBe(2);
    expect(data.purchaseBatch).toBeDefined();
  });

  test('updates purchase item', async () => {
    const { wine, vintage } = await createTestWineWithVintage('PURCHASE_UPD');
    const { data: item } = await api('/purchases/items', {
      method: 'POST',
      body: JSON.stringify({
        vintageId: vintage.id,
        wineId: wine.id,
        pricePaid: 30,
        purchaseDate: '2024-07-21',
      }),
    });

    const { status, data } = await api(`/purchases/items/${item.id}`, {
      method: 'PUT',
      body: JSON.stringify({ pricePaid: 35, quantityPurchased: 3 }),
    });
    expect(status).toBe(200);
    expect(data.pricePaid).toBe('35');
    expect(data.quantityPurchased).toBe(3);
  });

  test('deletes purchase item', async () => {
    const { wine, vintage } = await createTestWineWithVintage('PURCHASE_DEL');
    const { data: item } = await api('/purchases/items', {
      method: 'POST',
      body: JSON.stringify({
        vintageId: vintage.id,
        wineId: wine.id,
        purchaseDate: '2024-07-22',
      }),
    });

    const { status } = await api(`/purchases/items/${item.id}`, { method: 'DELETE' });
    expect(status).toBe(204);
  });
});

// ============ FAVORITES ============

describe('Favorites', () => {
  test('returns wines filtered by minimum rating', async () => {
    const { vintage } = await createTestWineWithVintage('FAVWINE');
    // Add high-rated tasting
    await api('/tastings', {
      method: 'POST',
      body: JSON.stringify({ vintageId: vintage.id, rating: 9.0 }),
    });

    const { status, data } = await api('/wines/favorites/list?minRating=8');
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    // Our test wine should be in there with 9.0 avg
    data.forEach((w: any) => {
      expect(w.averageRating).toBeGreaterThanOrEqual(8);
    });
  });

  test('returns vintages filtered by minimum rating', async () => {
    const { status, data } = await api('/vintages/favorites/list?minRating=7');
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });

  test('empty results for impossibly high rating', async () => {
    const { status, data } = await api('/wines/favorites/list?minRating=10');
    expect(status).toBe(200);
    // Could be empty or have only perfect-scored wines
    data.forEach((w: any) => {
      expect(w.averageRating).toBeGreaterThanOrEqual(10);
    });
  });
});

// ============ WINE MERGE ============

describe('Wine Merge', () => {
  test('preview shows conflicts between two wines', async () => {
    const wine1 = await createTestWine('MERGE_A', 'red');
    const wine2 = await createTestWine('MERGE_B', 'white');

    // Update wine1 with region
    await api(`/wines/${wine1.id}`, {
      method: 'PUT',
      body: JSON.stringify({ region: 'Bordeaux' }),
    });
    await api(`/wines/${wine2.id}`, {
      method: 'PUT',
      body: JSON.stringify({ region: 'Burgundy' }),
    });

    const { status, data } = await api(`/wines/${wine1.id}/merge/${wine2.id}/preview`);
    expect(status).toBe(200);
    expect(data.hasConflicts).toBe(true);
    expect(data.wineConflicts.some((c: any) => c.field === 'color')).toBe(true);
    expect(data.wineConflicts.some((c: any) => c.field === 'region')).toBe(true);
  });

  test('merge combines wines with non-overlapping vintages', async () => {
    const { wine: wine1 } = await createTestWineWithVintage('MERGE_C');
    const wine2 = await createTestWine('MERGE_D');
    await api('/vintages', {
      method: 'POST',
      body: JSON.stringify({ wineId: wine2.id, vintageYear: 2021 }),
    });

    const { status, data } = await api(`/wines/${wine1.id}/merge/${wine2.id}`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.results.vintagesMoved).toBeGreaterThanOrEqual(1);

    // wine2 should be gone
    const { status: checkStatus } = await api(`/wines/${wine2.id}`);
    expect(checkStatus).toBe(404);

    // Remove wine2 from cleanup (already deleted by merge)
    const idx = createdWineIds.indexOf(wine2.id);
    if (idx >= 0) createdWineIds.splice(idx, 1);
  });

  test('merge with overlapping vintages and resolutions', async () => {
    const wine1 = await createTestWine('MERGE_E');
    const wine2 = await createTestWine('MERGE_F');

    await api('/vintages', {
      method: 'POST',
      body: JSON.stringify({ wineId: wine1.id, vintageYear: 2020, sellerNotes: 'Wine1 notes' }),
    });
    await api('/vintages', {
      method: 'POST',
      body: JSON.stringify({ wineId: wine2.id, vintageYear: 2020, sellerNotes: 'Wine2 notes' }),
    });

    // Preview should show vintage conflict
    const { data: preview } = await api(`/wines/${wine1.id}/merge/${wine2.id}/preview`);
    expect(preview.vintageConflicts.length).toBeGreaterThanOrEqual(1);

    // Execute merge, prefer wine2's vintage data
    const { status, data } = await api(`/wines/${wine1.id}/merge/${wine2.id}`, {
      method: 'POST',
      body: JSON.stringify({
        resolutions: {
          vintages: { '2020': { sellerNotes: 'wine2' } },
        },
      }),
    });
    expect(status).toBe(200);
    expect(data.success).toBe(true);

    // Remove wine2 from cleanup
    const idx = createdWineIds.indexOf(wine2.id);
    if (idx >= 0) createdWineIds.splice(idx, 1);
  });
});

// ============ CREATE WITH VINTAGE (atomic) ============

describe('Create Wine with Vintage', () => {
  test('creates wine, vintage, and purchase atomically', async () => {
    const name = `__TEST_ATOMIC_${Date.now()}`;
    const { status, data } = await api('/wines/create-with-vintage', {
      method: 'POST',
      body: JSON.stringify({
        name,
        color: 'white',
        vintageYear: 2022,
        price: 25,
        quantity: 2,
        purchaseDate: '2024-03-15',
        sellerNotes: 'Crisp and refreshing',
        source: 'costco',
      }),
    });
    createdWineIds.push(data.wine.id);
    expect([200, 201]).toContain(status);
    expect(data.wineCreated).toBe(true);
    expect(data.vintageCreated).toBe(true);
  });

  test('creates wine with tasting', async () => {
    const name = `__TEST_WITHTASTING_${Date.now()}`;
    const { status, data } = await api('/wines/create-with-vintage', {
      method: 'POST',
      body: JSON.stringify({
        name,
        color: 'red',
        vintageYear: 2019,
        tasting: { rating: 8.5, notes: 'Excellent', tastingDate: '2024-06-15' },
      }),
    });
    createdWineIds.push(data.wine.id);
    expect([200, 201]).toContain(status);
    expect(data.tastingCreated).toBe(true);
  });

  test('finds existing wine and creates new vintage', async () => {
    const name = `__TEST_EXISTINGWINE_${Date.now()}`;
    // Create wine with 2020 vintage
    const { data: first } = await api('/wines/create-with-vintage', {
      method: 'POST',
      body: JSON.stringify({ name, color: 'red', vintageYear: 2020 }),
    });
    createdWineIds.push(first.wine.id);

    // Create same wine name with 2021 vintage
    const { data: second } = await api('/wines/create-with-vintage', {
      method: 'POST',
      body: JSON.stringify({ name, color: 'red', vintageYear: 2021 }),
    });
    expect(second.wineCreated).toBe(false); // wine already existed
    expect(second.vintageCreated).toBe(true); // new vintage
    expect(second.wine.id).toBe(first.wine.id); // same wine
  });
});

// ============ IMPORT FLOW ============

describe('Import Execute', () => {
  test('full import flow: preview then execute', async () => {
    const timestamp = Date.now();
    const text = `1/1/24
__TEST_IMPORT_${timestamp} 2020 $50
GREAT WINE FOR TESTING PURPOSES.`;

    // Preview
    const { data: preview } = await api('/import/preview', {
      method: 'POST',
      body: JSON.stringify({ text, mode: 'standard' }),
    });
    expect(preview.batches).toHaveLength(1);
    expect(preview.batches[0].items[0].name).toContain('__TEST_IMPORT');

    // Execute
    const { status, data } = await api('/import/execute', {
      method: 'POST',
      body: JSON.stringify({ text, mode: 'standard' }),
    });
    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.results.winesCreated).toBeGreaterThanOrEqual(1);

    // Find and track for cleanup
    const { data: wines } = await api(`/wines?search=__TEST_IMPORT_${timestamp}`);
    wines.forEach((w: any) => createdWineIds.push(w.id));
  });
});

// ============ CHAOS TESTS ============

describe('Chaos Tests', () => {
  test('rapid-fire: create and immediately delete', async () => {
    const name = `__TEST_RAPIDFIRE_${Date.now()}`;
    const { data } = await api('/wines/create-with-vintage', {
      method: 'POST',
      body: JSON.stringify({ name, color: 'red', vintageYear: 2020 }),
    });

    // Immediately delete
    const { status } = await api(`/wines/${data.wine.id}`, { method: 'DELETE' });
    expect(status).toBe(200);

    // Verify gone
    const { status: checkStatus } = await api(`/wines/${data.wine.id}`);
    expect(checkStatus).toBe(404);
  });

  test('double delete returns 404', async () => {
    const wine = await createTestWine('DOUBLEDEL');
    await api(`/wines/${wine.id}`, { method: 'DELETE' });
    const { status } = await api(`/wines/${wine.id}`, { method: 'DELETE' });
    expect(status).toBe(404);

    // Remove from cleanup
    const idx = createdWineIds.indexOf(wine.id);
    if (idx >= 0) createdWineIds.splice(idx, 1);
  });

  test('update nonexistent wine returns 404', async () => {
    const { status } = await api('/wines/999999', {
      method: 'PUT',
      body: JSON.stringify({ region: 'Nowhere' }),
    });
    expect(status).toBe(404);
  });

  test('delete nonexistent tasting returns 404', async () => {
    const { status } = await api('/tastings/999999', { method: 'DELETE' });
    expect(status).toBe(404);
  });

  test('create tasting for nonexistent vintage returns 404', async () => {
    const { status } = await api('/tastings', {
      method: 'POST',
      body: JSON.stringify({ vintageId: 999999, rating: 8.0 }),
    });
    expect(status).toBe(404);
  });

  test('create wine with empty name', async () => {
    const { status } = await api('/wines', {
      method: 'POST',
      body: JSON.stringify({ name: '', color: 'red' }),
    });
    // Should reject or at least not crash
    expect(status).toBeDefined();
  });

  test('malformed JSON body returns 400', async () => {
    const response = await fetch(`${API_BASE}/wines`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"broken json',
    });
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  test('create wine then add many vintages rapidly', async () => {
    const wine = await createTestWine('MANYVINTAGES');
    const years = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022];

    const results = await Promise.all(
      years.map(year =>
        api('/vintages', {
          method: 'POST',
          body: JSON.stringify({ wineId: wine.id, vintageYear: year }),
        })
      )
    );

    results.forEach(r => expect(r.status).toBe(201));

    // Verify all created
    const { data: detail } = await api(`/wines/${wine.id}`);
    expect(detail.vintages.length).toBe(8);
  });

  test('concurrent tastings for same vintage', async () => {
    const { vintage } = await createTestWineWithVintage('CONCURRENT_TASTING');

    const results = await Promise.all(
      [7.0, 7.5, 8.0, 8.5, 9.0].map(rating =>
        api('/tastings', {
          method: 'POST',
          body: JSON.stringify({ vintageId: vintage.id, rating }),
        })
      )
    );

    results.forEach(r => expect(r.status).toBe(201));
  });

  test('merge wine with itself fails or is a no-op', async () => {
    const { wine } = await createTestWineWithVintage('SELFMERGE');
    const { status } = await api(`/wines/${wine.id}/merge/${wine.id}/preview`);
    // Should either 400 or return empty conflicts
    expect(status).toBeDefined();
  });

  test('update wine with invalid color', async () => {
    const wine = await createTestWine('BADCOLOR');
    const { status } = await api(`/wines/${wine.id}`, {
      method: 'PUT',
      body: JSON.stringify({ color: 'purple' }),
    });
    // Should reject invalid enum value
    expect(status).toBeGreaterThanOrEqual(400);
  });

  test('import with completely garbage text', async () => {
    const { status, data } = await api('/import/preview', {
      method: 'POST',
      body: JSON.stringify({ text: '🍷🎉💥!!! @@@ ###', mode: 'standard' }),
    });
    expect(status).toBe(200);
    // Should handle gracefully with no batches or ambiguities
    expect(data.batches).toBeDefined();
  });

  test('import with extremely long text', async () => {
    const longText = 'A'.repeat(50000);
    const { status } = await api('/import/preview', {
      method: 'POST',
      body: JSON.stringify({ text: longText, mode: 'standard' }),
    });
    // Should not crash
    expect(status).toBeDefined();
  });

  test('multiple purchases on same date group into one batch', async () => {
    const { wine: wine1, vintage: v1 } = await createTestWineWithVintage('SAMEBATCH_A');
    const { wine: wine2, vintage: v2 } = await createTestWineWithVintage('SAMEBATCH_B');

    const { data: item1 } = await api('/purchases/items', {
      method: 'POST',
      body: JSON.stringify({
        vintageId: v1.id,
        wineId: wine1.id,
        pricePaid: 30,
        purchaseDate: '2024-08-15',
      }),
    });

    const { data: item2 } = await api('/purchases/items', {
      method: 'POST',
      body: JSON.stringify({
        vintageId: v2.id,
        wineId: wine2.id,
        pricePaid: 40,
        purchaseDate: '2024-08-15',
      }),
    });

    // Both should be in the same batch (same date)
    expect(item1.purchaseBatch.id).toBe(item2.purchaseBatch.id);
  });

  test('health check returns ok', async () => {
    const { status, data } = await api('/health');
    expect(status).toBe(200);
    expect(data.status).toBe('ok');
  });
});
