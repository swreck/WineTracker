# Wine Tracker 2.0 — Comprehensive Audit Report

**Date:** 2026-03-31
**Target:** https://wine-tracker-backend-production.up.railway.app/api
**Collection size:** 194 wines (171 real, 23 test pollutants), 157 tasting events with ratings

---

## Part 1: Existing Test Suite Results

| Suite | Tests | Passed | Failed | Notes |
|-------|-------|--------|--------|-------|
| new-features.test.ts | 22 | 22 | 0 | All pass cleanly |
| api-comprehensive.test.ts | 45 | 45 | 0* | Tests pass, but afterAll cleanup times out (5s limit). Not a code bug but leaves test data behind. |
| parser.test.ts | 35 | 35 | 0 | All pass |
| parser-extended.test.ts | 35 | 35 | 0 | All pass |

**Total: 137 tests passed, 0 functional failures.**

*The afterAll timeout in api-comprehensive is a test infrastructure issue — the cleanup loop deleting test wines exceeds Jest's 5-second hook timeout when running against a remote deployment. This is why 23 `__TEST_*` wines are polluting the production database.

---

## Part 2: Remi Endpoint Test Results

### POST /api/remi/enrich
- **Status:** 200 OK
- **Response time:** 8.6s (first call, AI generation) / 0.17s (cached)
- **Quality:** Excellent. Profile for Shafer TD-9 2019 was specific to the vintage, referenced the producer's lineup positioning, and described 2019 Napa conditions accurately. Honestly noted when it lacked specific critic data.

### POST /api/remi/enrich-all
- **Status:** 200 OK (started, running in background during audit)
- **Response time:** Very long (expected — ~170 wines to enrich sequentially)
- **Note:** This is a synchronous endpoint that blocks the HTTP response until all wines are enriched. For 170+ wines at ~5-8s each, that's 15-25 minutes blocking a single HTTP connection. Risk of timeout.

### GET /api/remi/enrichment/:wineId/:vintageYear
- **Status:** 200 OK (when exists), 404 (when not found)
- **Response time:** 0.2s
- **Quality:** Returns cached profile correctly.

### POST /api/remi/suggestions
- **Status:** 200 OK
- **Response time:** 22.7s (first call), 19.7s (second call)
- **Quality:** Outstanding. Suggestions reference specific wines, specific ratings, specific tasting notes from the collection. Draws real connections ("this is from the same producer, same style"). References Gerald's notes where relevant. 6 suggestions generated.

### GET /api/remi/suggestions
- **Status:** 200 OK
- **Response time:** 0.2s
- **Quality:** Returns persisted suggestions with wineId mapping.

### POST /api/remi/chat
- **Status:** 200 OK
- **Response time:** 2.7–4.5s (consistently under 5s)
- **Quality:** Very good. Conversational, asks clarifying questions naturally. Stays in character.

### GET /api/remi/chat
- **Status:** 200 OK
- **Response time:** 0.2s
- **Quality:** Returns full message history.

### POST /api/remi/themes
- **Status:** 200 OK
- **Response time:** 14–20s
- **Quality:** BROKEN. Returns empty array every time, even with 93 qualifying wines at minRating 7.0 and 47 at minRating 8.0. See Bug #1 below.

---

## Part 3: Chaos Test Results

| # | Test | Result | Details |
|---|------|--------|---------|
| 1 | Empty message to chat | PASS | Returns 400 `{"error":"message is required"}` |
| 2 | Very long message (1000+ chars) | PASS | Remi handled gracefully: "That's a lot... Pick one thread and I'll go deep on it." |
| 3 | Enrich non-existent wine (id=999999) | FAIL | Returns 200 with a polite "I don't know this wine" profile, but **stores the enrichment in the database** for a wine that doesn't exist. See Bug #3. |
| 4 | Enrich same wine twice | PASS | Second call returns cached result in 0.17s (vs 8.6s first call). No duplicate storage. |
| 5 | Generate suggestions twice rapidly | PARTIAL | Second call deactivates all previous suggestions, then generates new ones. The POST itself returned empty `[]`, suggesting the AI response failed to parse on the second attempt. |
| 6 | Chat about wine not in collection | PASS | "I only know what's in your collection, and Opus One isn't there." Appropriate boundary. |
| 7 | Winemaking technique question | PASS | Asks clarifying follow-up: "What Zinfandel? What specifically is making it taste like Cab?" |
| 8 | Themes with minRating=10 | PASS | Returns empty array, no crash. Fast (0.9s — skipped AI call because <4 wines qualify). |
| 9 | Themes with minRating=1 | FAIL | Returns empty array despite 104 qualifying wines. Same root cause as Bug #1. |
| 10 | Special characters, unicode, emoji | PASS | Emoji, accented chars (côtes-du-rhône, grüner veltliner), all handled fine. XSS attempt (`<script>alert(1)</script>`) handled perfectly: "Nice try. What do you actually want to know about wine?" |
| 11 | Rapid-fire 5 chat messages | PASS | All 5 responded in 2.7–3.0s each. No errors, no rate limiting issues. Chat history correctly accumulated (26 messages after test). |
| 12 | Enrich wine with missing region/appellation | PASS | Handled gracefully. Remi honestly notes it doesn't know the producer, gives vintage-year context instead. |
| 13 | Scan-label with no image | N/A | Endpoint doesn't exist (404). Not yet implemented. |
| 14 | Import execute with existing wine (dedup) | FAIL | Created a purchase batch but matched 0 wines, created 0 purchase items. Orphaned batch. See Bug #6. |

---

## Bugs Found

### Bug #1 (P0): Themes endpoint always returns empty
**Severity:** Feature completely broken
**Reproduction:** `POST /api/remi/themes` with any minRating value that qualifies >4 wines
**Root cause:** The AI returns JSON that fails to parse (likely wrapped in markdown code fences), and the catch block silently returns `[]`. The JSON parsing error is swallowed completely — no error log makes it to the response.
**Impact:** The themes feature is non-functional. Users see nothing.
**Fix:** Strip markdown fences from AI response before parsing. Add logging when parse fails. Consider using structured output or a more explicit JSON extraction regex.

### Bug #2 (P1): Collection context truncated at 8000 characters
**Severity:** High — causes Remi to deny knowledge of wines it should know about
**Reproduction:** `POST /api/remi/chat` with `{"message":"Tell me about my Shafer TD-9"}` — Remi responds "You don't have a Shafer TD-9 in your collection."
**Root cause:** Line 242 of `remi.ts`: `collectionContext.slice(0, 8000)`. With 194 wines, many wines (including Shafer) fall outside the 8000-char window. Wines are loaded by DB default order (typically by ID), so recently added wines may be visible while older ones are cut.
**Impact:** Remi cannot answer questions about a large portion of the collection. Breaks trust.
**Fix:** Either increase the limit significantly (Sonnet supports ~200K context), or build a smarter summary (e.g., just names + ratings without full notes, then fetch details for relevant wines on demand).

### Bug #3 (P2): Enrich endpoint stores enrichments for non-existent wines
**Severity:** Medium — data integrity issue
**Reproduction:** `POST /api/remi/enrich` with `wineId=999999` — creates a RemiEnrichment record pointing to a wine that doesn't exist.
**Root cause:** No validation that wineId corresponds to an actual wine in the database before calling the AI and storing the result.
**Fix:** Add a `prisma.wine.findUnique({ where: { id: wineId } })` check before enriching.

### Bug #4 (P2): Non-numeric enrichment params cause unhandled 500
**Severity:** Medium — poor error handling
**Reproduction:** `GET /api/remi/enrichment/abc/def` — returns raw HTML 500 error page
**Root cause:** `parseInt("abc")` returns NaN, which Prisma throws on when used in a query.
**Fix:** Validate params are numeric, return 400 JSON error if not.

### Bug #5 (P2): Suggestions wineId mapping matches empty-name wine
**Severity:** Medium — misleading data
**Reproduction:** 4 of 6 suggestions are mapped to wineId=525 (an empty-name test wine)
**Root cause:** The wine name matching logic uses `s.wineName.toLowerCase().includes(w.name.toLowerCase())`. An empty string `""` is included in every string, so the empty-name wine matches everything.
**Fix:** Skip wines with empty names in matching. Also, the matching should prioritize exact matches over partial includes.

### Bug #6 (P2): Import dedup creates orphaned purchase batches
**Severity:** Medium — phantom data
**Reproduction:** `POST /api/import/execute` with `editedBatches` containing a wine name that already exists. Result: `winesCreated:0, winesMatched:0, purchaseBatchesCreated:1, purchaseItemsCreated:0`.
**Root cause:** The import via editedBatches appears to create a purchase batch regardless, but the matching logic doesn't connect it to the existing wine.
**Impact:** Orphaned purchase batches accumulate in the database.

### Bug #7 (P3): Test data polluting production database
**Severity:** Low (cosmetic, but accumulating)
**Details:** 23 `__TEST_*` wines exist in the production database from test suite runs. The afterAll cleanup in api-comprehensive.test.ts times out at 5s.
**Fix:** Increase afterAll timeout, or add a dedicated cleanup endpoint/script, or run tests against a separate database.

### Bug #8 (P3): Chat history grows unbounded
**Severity:** Low (currently 26 messages, but no pruning mechanism)
**Details:** All chat messages are stored forever. The chat endpoint loads the last 30 for context (line 191: `take: 30`), but all are returned by GET /chat. Over time this will grow large.
**Fix:** Add a way to clear/archive chat history. Consider only returning the last N messages on GET.

### Bug #9 (P3): Suggestions second generation can return empty
**Severity:** Low — race condition / parse failure
**Details:** The second POST to /suggestions deactivates all existing suggestions, then attempts to parse AI JSON. If parsing fails, user is left with zero active suggestions.
**Fix:** Only deactivate old suggestions after new ones are successfully parsed and saved.

---

## Part 4: UX Quality Audit

### Voice Assessment
Remi speaks well in Ken's voice. Examples:
- "That's a lot — and I could write a book on it, but you'd stop reading after page two." (Direct, no hedging)
- "Nice try. What do you actually want to know about wine?" (Handling XSS with personality)
- "What are you in the mood for — red, white, or no preference? And are you drinking solo or with food?" (Natural conversational follow-up)
- "I only know what's in your collection, and Opus One isn't there." (Honest boundaries)

**Grade: A-** — The voice is warm, direct, and specific. Occasionally a touch formal ("I don't have specific knowledge") but overall matches the prompt excellently.

### Suggestion Quality
**Grade: A** — Suggestions are genuinely impressive:
- References specific ratings and tasting notes from the collection
- Draws wine-to-wine connections ("same vintage, same valley, same grape — but Dead Arm is a notably bigger, denser wine")
- Makes timing-aware recommendations ("Barbaresco at 9 years old from a strong vintage is right in its early drinking window")
- References Gerald's seller notes where relevant
- Suggests specific actionable ideas (side-by-side comparisons, Coravin pulls)

### Enrichment Quality
**Grade: B+** — Profiles are vintage-specific and honest about knowledge limits. When it doesn't know a producer (Michel Gayot), it says so directly and pivots to what it does know (2023 Chablis vintage conditions). Could be improved by incorporating Gerald's seller notes and Ken's tasting notes into the enrichment prompt.

### Chat Contextual Awareness
**Grade: B-** — Chat is contextually aware of recent messages and follows up naturally. However, the 8000-char context truncation (Bug #2) means it frequently can't find wines the user asks about. When it does have context, it's excellent (the themes question via chat returned a thoughtful analysis referencing specific wines and notes).

### Theme Groupings
**Grade: F** — Completely non-functional (Bug #1). The themes endpoint always returns empty. When the same analysis is requested through chat, Remi produces excellent thematic groupings — confirming the issue is purely a JSON parsing problem, not an AI quality issue.

### Response Time
| Operation | Time | Mobile-acceptable? |
|-----------|------|-------------------|
| Enrich (cached) | 0.2s | Yes |
| Enrich (new) | 8.6s | Borderline — needs loading indicator |
| Suggestions (generate) | 20-23s | No — needs async/streaming |
| Suggestions (get) | 0.2s | Yes |
| Chat | 2.7-4.5s | Yes |
| Themes | 14-20s | No (and broken anyway) |
| Enrich-all | 15-25 min | No — must be async with progress |

---

## Part 5: Performance Observations

1. **enrich-all blocks the entire HTTP connection** for potentially 25+ minutes. This will almost certainly hit Railway's request timeout or the client will disconnect. Must be converted to an async job with progress polling.

2. **Chat loads ALL wines with vintages, tastings, and purchases on every message.** With 194 wines, this is a significant database query on every single chat. Should be cached or pre-computed.

3. **Suggestions query loads all wines with full nested data** (tastings, purchases, batches). Same concern as chat.

4. **No rate limiting on any Remi endpoint.** Each chat message costs an Anthropic API call. Could accumulate significant costs if left open.

---

## Prioritized Recommendations

### Must Fix Before Ship
1. **Fix themes JSON parsing** (Bug #1) — Strip markdown fences, add fallback extraction
2. **Expand collection context** (Bug #2) — Either use a smarter summary format or increase the limit to 30-40K chars (Sonnet handles it easily)
3. **Validate wineId exists before enriching** (Bug #3) — Prevents phantom data
4. **Make enrich-all async** — Current synchronous approach will timeout on Railway

### Should Fix Soon
5. **Fix suggestion wineId matching** (Bug #5) — Skip empty names, improve matching
6. **Fix enrichment param validation** (Bug #4) — Return proper JSON errors
7. **Fix suggestions deactivation race** (Bug #9) — Don't deactivate until new ones are saved
8. **Clean up test data** from production (Bug #7) — Delete __TEST_* wines, fix afterAll timeout
9. **Add rate limiting** to Remi endpoints — At minimum, debounce rapid calls

### Opportunities for Delight
10. **Streaming chat responses** — Show Remi "typing" with streaming instead of waiting 3-5s for a complete response. This would make the chat feel alive.
11. **Enrichment could incorporate seller notes and tasting history** — The enrich prompt currently only gets wine name/color/region. Including Gerald's seller notes and Ken's ratings would make enrichments richer and more personal.
12. **Chat should support "clear history"** — After testing, there are 28+ messages in history. No way to start fresh.
13. **Suggestions could include a "dismiss" action** — Currently all suggestions are active until the next generation. A dismiss per-suggestion would be more useful.
14. **Themes via chat works perfectly** — Consider whether the themes endpoint should just use the chat approach (return prose) instead of forcing JSON structure.
15. **enrich-all should show per-wine progress** — "Enriched 47/171 wines..." via SSE or polling endpoint.

---

## Summary

| Category | Score |
|----------|-------|
| Core API stability | A (137/137 tests pass) |
| Remi voice quality | A- |
| Remi suggestion quality | A |
| Remi chat quality | B+ |
| Remi themes | F (broken) |
| Error handling | C (several unhandled edge cases) |
| Performance | C+ (several blocking operations) |
| Data integrity | C (test pollution, orphaned records, phantom enrichments) |

**Bottom line:** Remi's AI quality is excellent when it works. The voice, suggestions, and enrichments are genuinely good — specific, personal, honest. The main issues are infrastructure: themes is broken due to JSON parsing, chat can't see the full collection due to context truncation, and several endpoints need better input validation and async handling. These are all fixable without changing the AI prompts or approach.
