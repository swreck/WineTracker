# Next Session Tasks — Wine Tracker

## Context
Case Builder v6 deployed at winetracker.up.railway.app (2026-04-01).
All 8 original feedback items + two rounds of delight audit fixes are live.

## What's Live Now
1. **"Build a Case"** in main nav — one tap, no intermediate page
2. **Case shelf** — horizontal scrollable, sticky on mobile scroll, all cases visible with mini box icons (flaps hinge from outer edges)
3. **Cardboard box** — lighter warm tan (#e0ccaa), thin paper flaps (10px, outer-edge hinged, V-tent when open, flat when closed), no top border (seamless with flaps)
4. **Remi auto-suggest** — fires on mount for existing cases, on first wine added, and on switching to unnamed case. Theme popup shows Remi's guesses first + custom input.
5. **Price range filter** — min/max inputs, replaces old price sort chip
6. **Peek/add swap** — tap card to peek (flip bottle), tap + to add
7. **Wine wall stays visible** when case is full (+ buttons removed, "case is full" note)
8. **Clear filters** button appears when any filter is active
9. **Email button** positioned between box and wine wall (not buried below)
10. **Sealed box** shows full wine list (no truncation) for review before emailing
11. **Empty state** guides action: "Tap a wine below to peek, or tap + to add"
12. Case numbering sequential (caseNumber field, no skips)

## Known Limitations
- Sticky shelf offset (116px + safe-top) is estimated — verify on Ken's iPhone
- 5+ shelf items require horizontal scrolling
- No "clear entire case" action for single case
- Flap animation is subtle (8deg rotation on 10px strips) — Ken may want more dramatic

## Pending Items
- Browser history navigation (back button within app)
- Ken needs to judge the flaps on his phone — he directed the current design (outer-edge hinged, thin paper). If still not right, next step is to try a completely different visual metaphor.

## Architecture Notes
- Case Builder state: localStorage key 'winetracker-casebuilder-v5' (includes caseNumber migration)
- Theme suggestions: POST /api/remi/case-suggest-theme (Haiku)
- Email drafting: POST /api/remi/case-email (Sonnet)
- Railway URL: winetracker.up.railway.app
- Always `railway up` from backend/ for manual deploys (bypasses build cache)
