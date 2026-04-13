/**
 * Write tests for Wine Tracker — run against production to verify the
 * add-tasting and edit-vintage-year flows actually create/update real data.
 *
 * Usage: npx tsx test-write.ts
 *
 * This test CREATES a tasting, verifies it, then DELETES it. Each step is
 * guarded by try/finally so cleanup runs even on failure. Notes are tagged
 * "[TEST]" so if cleanup ever fails, you can find and remove it manually.
 */

const BASE = 'https://winetracker.up.railway.app/api';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

async function req(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${init?.method || 'GET'} ${path} → ${res.status}: ${body}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

async function reqRaw(path: string, init?: RequestInit) {
  return fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
}

async function step(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    passed++;
    console.log(`  PASS  ${name}`);
  } catch (err: any) {
    failed++;
    console.log(`  FAIL  ${name}: ${err.message}`);
  }
}

async function run() {
  console.log('\nWine Tracker — Write Tests (create/verify/cleanup)');
  console.log(`Target: ${BASE}\n`);

  // Find a wine with ≥2 vintages — best test of the multi-vintage flow.
  const wines: any[] = await req('/wines');
  const multiVintageWine = wines.find(w => (w.vintages?.length || 0) >= 2);
  assert(!!multiVintageWine, 'Need at least one wine with ≥2 vintages');
  const wineId = multiVintageWine.id;
  const vintage = multiVintageWine.vintages[0];
  const vintageId = vintage.id;
  const originalYear: number = vintage.vintageYear;
  const otherYears: number[] = multiVintageWine.vintages.map((v: any) => v.vintageYear);

  console.log(`Using wine "${multiVintageWine.name}" (id ${wineId}), vintages: ${otherYears.join(', ')}\n`);

  // ── Tasting create/verify/delete ──
  let createdTastingId: number | null = null;
  try {
    await step('POST /tastings creates a tasting on the picked vintage', async () => {
      const today = new Date().toISOString().split('T')[0];
      const created = await req('/tastings', {
        method: 'POST',
        body: JSON.stringify({
          vintageId,
          tastingDate: today,
          rating: 6.5,
          notes: '[TEST] write-test tasting — auto-cleanup',
        }),
      });
      assert(created?.id, 'No tasting id returned');
      assert(Number(created.rating) === 6.5, `Rating not stored correctly: got ${created.rating}`);
      assert((created.notes || '').includes('[TEST]'), 'Notes not stored');
      createdTastingId = created.id;
    });

    await step('GET /wines/:id shows the new tasting on the correct vintage', async () => {
      if (!createdTastingId) throw new Error('skipped — create failed');
      const wine = await req(`/wines/${wineId}`);
      const v = wine.vintages.find((x: any) => x.id === vintageId);
      assert(!!v, 'Vintage missing from wine payload');
      const t = (v.tastingEvents || []).find((x: any) => x.id === createdTastingId);
      assert(!!t, 'Created tasting not found when reading back wine');
      assert(Number(t.rating) === 6.5, `Rating mismatch on readback: ${t.rating}`);
      assert((t.notes || '').includes('[TEST]'), 'Notes mismatch on readback');
      assert(!!t.tastingDate, 'Tasting date not stored');
    });

    await step('Tasting appears in GET /tastings list', async () => {
      if (!createdTastingId) throw new Error('skipped — create failed');
      const all = await req('/tastings?limit=200');
      const found = all.find((t: any) => t.id === createdTastingId);
      assert(!!found, 'Tasting not returned by GET /tastings');
    });
  } finally {
    if (createdTastingId) {
      try {
        await req(`/tastings/${createdTastingId}`, { method: 'DELETE' });
        await step('DELETE /tastings/:id cleans up the test tasting', async () => {
          const wine = await req(`/wines/${wineId}`);
          const v = wine.vintages.find((x: any) => x.id === vintageId);
          const stillThere = (v.tastingEvents || []).find((x: any) => x.id === createdTastingId);
          assert(!stillThere, 'Tasting still present after DELETE');
        });
      } catch (err: any) {
        failed++;
        console.log(`  FAIL  cleanup tasting id=${createdTastingId}: ${err.message}`);
        console.log(`        Manual cleanup: DELETE ${BASE}/tastings/${createdTastingId}`);
      }
    }
  }

  // ── Vintage year update/verify/restore ──
  // Pick a year that doesn't collide with any existing vintage for this wine.
  let safeYear = 1901;
  while (otherYears.includes(safeYear)) safeYear++;

  let yearChanged = false;
  try {
    await step(`PUT /vintages/:id changes vintageYear ${originalYear} → ${safeYear}`, async () => {
      const updated = await req(`/vintages/${vintageId}`, {
        method: 'PUT',
        body: JSON.stringify({ vintageYear: safeYear }),
      });
      assert(updated.vintageYear === safeYear, `Year not updated: got ${updated.vintageYear}`);
      yearChanged = true;
    });

    await step('GET /wines/:id reflects the updated vintage year', async () => {
      const wine = await req(`/wines/${wineId}`);
      const v = wine.vintages.find((x: any) => x.id === vintageId);
      assert(v.vintageYear === safeYear, `Readback year mismatch: ${v.vintageYear}`);
    });

    await step('Duplicate-year update is rejected with non-2xx', async () => {
      const collidingYear = otherYears.find(y => y !== originalYear);
      if (!collidingYear) throw new Error('no other year to collide with');
      const res = await reqRaw(`/vintages/${vintageId}`, {
        method: 'PUT',
        body: JSON.stringify({ vintageYear: collidingYear }),
      });
      assert(!res.ok, `Expected error, got ${res.status}`);
      // New backend returns 409; old backend returns 500. Accept both.
      assert([409, 500].includes(res.status), `Expected 409 or 500, got ${res.status}`);
    });
  } finally {
    if (yearChanged) {
      try {
        await req(`/vintages/${vintageId}`, {
          method: 'PUT',
          body: JSON.stringify({ vintageYear: originalYear }),
        });
        await step(`Vintage year restored to ${originalYear}`, async () => {
          const wine = await req(`/wines/${wineId}`);
          const v = wine.vintages.find((x: any) => x.id === vintageId);
          assert(v.vintageYear === originalYear, `Restore failed: ${v.vintageYear}`);
        });
      } catch (err: any) {
        failed++;
        console.log(`  FAIL  restore vintage year id=${vintageId}: ${err.message}`);
        console.log(`        Manual restore: PUT ${BASE}/vintages/${vintageId} {vintageYear: ${originalYear}}`);
      }
    }
  }

  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

run().catch(err => {
  console.error('Test runner crashed:', err);
  process.exit(1);
});
