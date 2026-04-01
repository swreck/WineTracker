# Next Session Tasks — Wine Tracker (Case Builder Focus)

## Context
Case Builder has gone through v1-v5. Current version (v5) is deployed at winetracker.up.railway.app.
The core architecture is now right (single screen, one active box, sealed cases as chips, full wine collection with filters, peek cards for detail). But there are 9 specific issues from Ken's latest feedback that need fixing.

## Ken's Feedback on v5 (2026-04-01) — Fix These

### 1. "Build a Case" should be in main nav
Next Case page is redundant — it's just a gateway. Add "Build" to the main nav bar in App.tsx header and go straight to the Case Builder UI. Remove the intermediate Next Case page (or make it a sub-section of the builder).

### 2. Price is a range picker, not a sort
Price filter should be a min/max range picker (like "$20-$60"), NOT a sort chip. Remove price from sort chips, add a price range filter.

### 3. Active case box color is too dark
The cardboard brown (#d4b896 light, #5a4530 dark) reads as inactive/disabled. Lighten the active box color so it clearly looks active and open.

### 4. The ⋮ (three dots) peek button is wrong
Three vertical dots reads as a drag handle for rearranging, not "more info." Need a different affordance for the quick-view peek card. Consider: tap the wine name itself opens the peek, or use an info icon (i), or just make the whole right side of the card the peek target.

### 5. CARDBOARD BOX WITH OPEN FLAPS — DO IT THIS TIME
Ken has asked for this 4+ times. CSS flaps that are visually open when the case is active/being filled, and visually close (fold down) when the case is sealed at 12. This is NOT optional. This is the visual metaphor that makes the feature fun. Use CSS triangles/shapes or clip-path to create flap shapes at the top of the box. Open flaps angle outward, closed flaps fold flat across the top. Ken explicitly said: "I just want to see it even if it is dumb."

### 6. Case numbering bug
When sealing case 1 and starting a new case, it labels the new case "Case 3" instead of "Case 2." The genId() function creates random IDs but the case number display uses the index. After sealing box at index 0, the new box is pushed to the end of the array at index 2 (sealed box is at 0). Fix: either renumber display labels or maintain proper ordering.

### 7. All cases should always be visible as a list
Not just sealed cases as chips. ALL cases (full or partial) should be listed with their theme name readable, stacked to the side. Think of it as a shelf where you can see all your boxes. The active one is open and front-center, the others are on the shelf with their labels showing.

### 8. Remi should auto-suggest theme from FIRST wine added
When the first wine goes into a box, Remi should immediately hypothesize what theme this case might be building toward (using the case-suggest-theme API). The theme dropdown should always show Remi's guesses plus a field for the user to type their own. Currently Remi only suggests when explicitly asked via "Suggest" button. Instead: auto-suggest on first wine, update suggestions as more wines are added (debounced).

### 9. (Ken was typing more feedback — session ended before completing point 9)

## Other Pending Tasks (from original list)

### Sorting on Next Case favorites
Sort chips between min rating and color filter: vintage, purchase date, rating, alphabetical. (May be superseded by putting Build a Case in main nav)

### Browser history navigation
Add browser history integration so the back button navigates within the app instead of leaving it. Push history entries on page changes.

### Remove critic "Sources" button idea
Ken confirmed — do NOT add a Sources section. Already noted, no action needed.

## Architecture Notes
- Case Builder state persists in localStorage key 'winetracker-case-builder-v5'
- Wine collection loaded via api.getWines() (full collection, not just favorites)
- Theme suggestions via POST /api/remi/case-suggest-theme
- Email drafting via POST /api/remi/case-email
- Both use Anthropic API (Haiku for themes, Sonnet for email)
- Peek card shows tasting notes + seller notes from the Wine object (no extra API call)
- Railway URL: winetracker.up.railway.app
- Vercel project has been deleted — only Railway deploys now

## Key Design Lessons Learned This Session
- Ken thinks about wine shopping physically: wall of wines, picking bottles, putting them in boxes, reading back labels
- The visual metaphor (cardboard box with flaps) is NOT decoration — it's the core experience
- Filters are "walking to a wall" — they change your view of the collection, not constrain it
- Theme emerges from what's in the box; Remi guesses, Ken can override
- One screen, one active box, other boxes visible but compact
- Phone-first but wide screen must also feel intentional (side-by-side on desktop)
