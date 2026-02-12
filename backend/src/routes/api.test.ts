/**
 * API Integration Tests
 * Tests the actual HTTP endpoints to verify they work correctly
 */

import { PrismaClient } from '@prisma/client';

const API_BASE = 'http://localhost:3001/api';

// Helper to make API requests
async function apiRequest<T = any>(path: string, options?: RequestInit): Promise<{ status: number; data: T }> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });
  const data = await response.json() as T;
  return { status: response.status, data };
}

describe('Import API', () => {
  test('preview with standard mode parses wine notes', async () => {
    const text = `6/20
ABADIA RETUERTA ESPECIAL, 29.99, 2015
MUCH IN THE STYLE OF REALLY FINE RED BORDEAUX.`;

    const { status, data } = await apiRequest('/import/preview', {
      method: 'POST',
      body: JSON.stringify({ text, mode: 'standard' }),
    });

    expect(status).toBe(200);
    expect(data.batches).toHaveLength(1);
    expect(data.batches[0].items).toHaveLength(1);
    expect(data.batches[0].items[0].name).toBe('ABADIA RETUERTA ESPECIAL');
    expect(data.batches[0].items[0].vintageYear).toBe(2015);
    expect(data.batches[0].items[0].sellerNotes).toContain('RED BORDEAUX');
  });

  test('preview with receipt mode parses OCR text', async () => {
    const text = `14248 PINTAS CHARACTER 2019
2 @ 39.99        S        79.98 T
REGULAR    50.00
FROM 30 YEAR OLD VINES, THIS IS A TOP
DOURO VALLEY FIELD BLEND RED.`;

    const { status, data } = await apiRequest('/import/preview', {
      method: 'POST',
      body: JSON.stringify({ text, mode: 'receipt' }),
    });

    expect(status).toBe(200);
    expect(data.batches).toHaveLength(1);
    expect(data.batches[0].items).toHaveLength(1);

    const item = data.batches[0].items[0];
    expect(item.name).toBe('PINTAS CHARACTER');
    expect(item.vintageYear).toBe(2019);
    expect(item.quantity).toBe(2);
    expect(item.price).toBe(39.99);
    expect(item.sellerNotes).toContain('DOURO VALLEY');
    expect(item.sellerNotes).not.toContain('REGULAR');
  });

  test('preview with receipt mode handles 2-digit vintage', async () => {
    const text = `15075 POEIRINHO BAIRRADA BAGA 16
1 @ 49.99        5.00        44.99 T
FAMOUS WINEMAKER.`;

    const { status, data } = await apiRequest('/import/preview', {
      method: 'POST',
      body: JSON.stringify({ text, mode: 'receipt' }),
    });

    expect(status).toBe(200);
    expect(data.batches[0].items[0].vintageYear).toBe(2016);
  });

  test('preview detects wine colors correctly', async () => {
    const text = `10668 SOALHEIRO ALVARINHO 2022
2 @ 24.99        2.50        44.98 T
GREAT SEAFOOD WHITE.`;

    const { status, data } = await apiRequest('/import/preview', {
      method: 'POST',
      body: JSON.stringify({ text, mode: 'receipt' }),
    });

    expect(status).toBe(200);
    expect(data.batches[0].items[0].color).toBe('white');
  });
});

describe('Wine CRUD API', () => {
  let testWineId: number;
  let testVintageId: number;
  const prisma = new PrismaClient();

  beforeAll(async () => {
    // Create a test wine directly in DB for delete tests
    const wine = await prisma.wine.create({
      data: {
        name: 'TEST WINE FOR DELETE',
        color: 'red',
      },
    });
    testWineId = wine.id;

    const vintage = await prisma.vintage.create({
      data: {
        wineId: wine.id,
        vintageYear: 2020,
        sellerNotes: 'Test vintage',
      },
    });
    testVintageId = vintage.id;
  });

  afterAll(async () => {
    // Clean up any remaining test data
    await prisma.vintage.deleteMany({ where: { wine: { name: 'TEST WINE FOR DELETE' } } });
    await prisma.wine.deleteMany({ where: { name: 'TEST WINE FOR DELETE' } });
    await prisma.$disconnect();
  });

  test('GET /wines returns list', async () => {
    const { status, data } = await apiRequest('/wines');
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });

  test('GET /wines/:id returns wine details', async () => {
    const { status, data } = await apiRequest(`/wines/${testWineId}`);
    expect(status).toBe(200);
    expect(data.name).toBe('TEST WINE FOR DELETE');
    expect(data.vintages).toBeDefined();
  });

  test('DELETE /wines/:wineId/vintages/:vintageId deletes vintage', async () => {
    // Create another vintage to delete
    const vintage = await prisma.vintage.create({
      data: {
        wineId: testWineId,
        vintageYear: 2021,
      },
    });

    const { status, data } = await apiRequest(`/wines/${testWineId}/vintages/${vintage.id}`, {
      method: 'DELETE',
    });

    expect(status).toBe(200);
    expect(data.success).toBe(true);

    // Verify it's deleted
    const deleted = await prisma.vintage.findUnique({ where: { id: vintage.id } });
    expect(deleted).toBeNull();
  });

  test('DELETE /wines/:id deletes wine and related data', async () => {
    // Create a new wine specifically for this test
    const wine = await prisma.wine.create({
      data: {
        name: 'WINE TO DELETE',
        color: 'white',
      },
    });
    await prisma.vintage.create({
      data: {
        wineId: wine.id,
        vintageYear: 2022,
      },
    });

    const { status, data } = await apiRequest(`/wines/${wine.id}`, {
      method: 'DELETE',
    });

    expect(status).toBe(200);
    expect(data.success).toBe(true);

    // Verify wine is deleted
    const deletedWine = await prisma.wine.findUnique({ where: { id: wine.id } });
    expect(deletedWine).toBeNull();

    // Verify vintages are also deleted
    const vintages = await prisma.vintage.findMany({ where: { wineId: wine.id } });
    expect(vintages).toHaveLength(0);
  });
});

describe('Import Execute API', () => {
  const prisma = new PrismaClient();

  afterAll(async () => {
    // Clean up test imports
    await prisma.tastingEvent.deleteMany({
      where: { vintage: { wine: { name: { contains: 'TEST IMPORT' } } } },
    });
    await prisma.purchaseItem.deleteMany({
      where: { wine: { name: { contains: 'TEST IMPORT' } } },
    });
    await prisma.vintage.deleteMany({
      where: { wine: { name: { contains: 'TEST IMPORT' } } },
    });
    await prisma.wine.deleteMany({
      where: { name: { contains: 'TEST IMPORT' } },
    });
    await prisma.purchaseBatch.deleteMany({
      where: { theme: 'TEST IMPORT BATCH' },
    });
    await prisma.$disconnect();
  });

  test('execute import creates wines and vintages', async () => {
    const text = `1/1/24 TEST IMPORT BATCH
TEST IMPORT WINE 2020 $50
TEST SELLER NOTES HERE.`;

    const { status, data } = await apiRequest('/import/execute', {
      method: 'POST',
      body: JSON.stringify({ text, mode: 'standard' }),
    });

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.results.winesCreated).toBeGreaterThanOrEqual(1);
    expect(data.results.vintagesCreated).toBeGreaterThanOrEqual(1);

    // Verify wine was created
    const wine = await prisma.wine.findFirst({
      where: { name: { contains: 'TEST IMPORT WINE' } },
    });
    expect(wine).not.toBeNull();
  });
});
