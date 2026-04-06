/**
 * Functional tests for Wine Tracker — run against production after every deploy.
 *
 * Usage: npx tsx test-functional.ts
 *
 * Tests hit the live production API at winetracker.up.railway.app.
 * They are read-only (GET requests only) so they can't break data.
 * If any test fails, the deploy is broken.
 */

const BASE = 'https://winetracker.up.railway.app/api';

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    passed++;
    console.log(`  PASS  ${name}`);
  } catch (err: any) {
    failed++;
    console.log(`  FAIL  ${name}: ${err.message}`);
  }
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

async function get(path: string) {
  const res = await fetch(`${BASE}${path}`);
  assert(res.ok, `${path} returned ${res.status}`);
  return res.json();
}

// ── Tests ──

async function run() {
  console.log('\nWine Tracker — Functional Tests');
  console.log(`Target: ${BASE}\n`);

  // 1. Health: server responds
  await test('Server responds', async () => {
    const res = await fetch(BASE.replace('/api', '/'));
    assert(res.ok, `Root returned ${res.status}`);
  });

  // 2. Wines list loads
  await test('GET /wines returns array', async () => {
    const wines = await get('/wines');
    assert(Array.isArray(wines), 'Expected array');
    assert(wines.length > 0, 'Expected at least 1 wine');
  });

  // 3. Wine has expected shape
  await test('Wine object has required fields', async () => {
    const wines = await get('/wines');
    const wine = wines[0];
    assert(typeof wine.id === 'number', 'Missing id');
    assert(typeof wine.name === 'string', 'Missing name');
    assert(typeof wine.color === 'string', 'Missing color');
    assert(['red', 'white', 'rose', 'sparkling'].includes(wine.color), `Unexpected color: ${wine.color}`);
  });

  // 4. Wine includes vintages
  await test('Wine includes vintages array', async () => {
    const wines = await get('/wines');
    const wineWithVintages = wines.find((w: any) => w.vintages?.length > 0);
    assert(wineWithVintages, 'No wine has vintages');
    assert(typeof wineWithVintages.vintages[0].vintageYear === 'number', 'Vintage missing year');
  });

  // 5. Single wine by ID
  await test('GET /wines/:id returns single wine', async () => {
    const wines = await get('/wines');
    const wine = await get(`/wines/${wines[0].id}`);
    assert(wine.id === wines[0].id, 'ID mismatch');
    assert(wine.name === wines[0].name, 'Name mismatch');
  });

  // 6. Favorites endpoint
  await test('GET /wines/favorites/list returns array', async () => {
    const favs = await get('/wines/favorites/list?minRating=7');
    assert(Array.isArray(favs), 'Expected array');
  });

  // 7. Tastings endpoint
  await test('GET /tastings returns array', async () => {
    const tastings = await get('/tastings');
    assert(Array.isArray(tastings), 'Expected array');
  });

  // 8. Purchases endpoint
  await test('GET /purchases returns array', async () => {
    const purchases = await get('/purchases');
    assert(Array.isArray(purchases), 'Expected array');
  });

  // 9. Remi chat history
  await test('GET /remi/chat returns messages', async () => {
    const chat = await get('/remi/chat');
    assert(Array.isArray(chat.messages), 'Expected messages array');
  });

  // 10. Want-to-try list
  await test('GET /remi/want-to-try returns object with items', async () => {
    const data = await get('/remi/want-to-try');
    assert(Array.isArray(data.items), 'Expected items array');
  });

  // 11. Frontend serves (HTML with correct bundle)
  await test('Frontend HTML loads with JS bundle', async () => {
    const res = await fetch(BASE.replace('/api', '/'));
    const html = await res.text();
    assert(html.includes('</html>'), 'Not valid HTML');
    assert(html.includes('/assets/index-'), 'Missing JS bundle reference');
  });

  // Summary
  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

run().catch(err => {
  console.error('Test runner crashed:', err);
  process.exit(1);
});
