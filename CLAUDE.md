# Wine Tracker — Project Notes

## What this is

A personal PWA for tracking wines, vintages, tastings, and purchases. Simple data-management app with AI-powered import parsing.

## Product Intent

**Why this exists:** Ken buys wine regularly from stores like Weimax and Costco. He wants to remember what he bought, what he paid, and what he thought of each wine over time. Before this app, that information lived in scattered notes and receipts.

**Core workflow:** Buy wine → snap a photo of the receipt → paste OCR text into the app → parser extracts wine names, vintages, prices → review/edit → confirm. Later, open a bottle → add a tasting note with a rating. Over time, build a personal database of preferences.

**Key design decisions:**
- Mobile-first — this is used standing in a wine store or at a dinner table, not at a desk
- Import-heavy — most data enters via receipt/label OCR parsing, not manual typing
- AI parsing with learning — the parser uses Anthropic (Haiku) to clean up messy OCR, and corrections feed back into future parsing
- Ratings are 4.0–9.0 scale in 0.5 steps — Ken's personal scale, not a universal standard
- Wine → Vintage → Tasting hierarchy — same wine can have multiple vintages, each with multiple tasting events
- Sources (Weimax, Costco, Other) track where wines were purchased
- Merge capability — because OCR often creates slight name variations of the same wine
- Dark wine-red theme (#722f37), Apple UX conventions

**What makes this app "Ken's":** The rating scale, the import workflow optimized for Weimax receipts, the seller-notes preservation, and the assumption that wine tracking is a solo activity (no sharing, no social features).

## Running the app

```bash
# Backend (port 3001)
cd backend && npm run dev

# Frontend (port 5173)
cd frontend && npm run dev
```

Frontend uses `VITE_API_URL` env var to reach the backend (defaults to `http://localhost:3001/api`).

## Architecture

**Frontend**: React 19 + TypeScript + Vite. No router library — uses discriminated union state in `App.tsx` for page navigation. NavigationContext preserves filter/sort/scroll state across pages.

- Pages: `WinesList`, `WineDetail`, `Favorites`, `QuickTasting`, `Import`
- Components: `SearchWithHistory`, `AlphabeticalJump`
- API client: `src/api/client.ts` (typed fetch wrapper)

**Backend**: Express 5 + TypeScript + Prisma ORM → PostgreSQL (Neon cloud).

- Entry point: `src/index.ts`
- Routes: `wines.ts`, `vintages.ts`, `tastings.ts`, `purchases.ts`, `import.ts`
- Parser: `src/parser/parser.ts` (text/receipt/label parsing with fuzzy matching)
- Utils: `db.ts` (Neon cold-start retry logic), `fuzzy.ts` (name matching)

**Database models**: Wine → Vintage → TastingEvent, plus PurchaseBatch → PurchaseItem. Cascading deletes from wine down. Rating scale: 4.0–9.0 in 0.5 steps.

**Enums**: WineColor (red, white, rose, sparkling), WineSource (weimax, costco, other).

## Key commands

```bash
# Type-check
cd backend && npx tsc --noEmit
cd frontend && npx tsc --noEmit

# Tests (Jest)
cd backend && npm test

# Database
cd backend && npx prisma db push
cd backend && npx prisma studio
```

## Deployment (Railway monorepo)

Single Railway service serves both frontend and API. Push to main triggers auto-deploy.

- **URL**: `https://winetracker.up.railway.app`
- **Railway project**: `wine-tracker`, service: `wine-tracker-backend`
- **Root directory**: `backend/` (Railway config)
- **Build**: `npm install → frontend build → copy dist to backend/public/ → prisma generate → tsc`
- **Start**: `node dist/index.js`
- **Database**: Neon PostgreSQL (same as before)
- **Deploy**: `railway up` or push to main
- **Logs**: `railway logs`

- **Icons**: SVG + PNGs in `frontend/public/icons/` (copied to `backend/public/icons/` at build)
  - favicon: `/icons/icon.svg`
  - apple-touch-icon: `/icons/icon-180.png`
  - manifest icons: `/icons/icon-192.png`, `/icons/icon-512.png`

- **Legacy (decommissioned)**: Vercel frontend (`wine-tracker-ten.vercel.app`) and Render backend (`winetracker.onrender.com`) are no longer the primary deployment. Can be deleted when ready.

## Key gotchas

- **Neon cold starts**: Backend has retry logic with 30s timeout + warmup query in `db.ts`. Railway keeps the service warm (no Render-style cold starts).
- **Import parser**: Three modes (standard, receipt, label) with fuzzy matching. Conflicts are surfaced for user decision before executing.
- **Wine merging**: Preview endpoint shows conflicts; execute endpoint applies resolution strategy. Cascades vintage/tasting/purchase data.
- **No service worker**: PWA manifest exists but no offline support — just installability.
- **Unique constraint**: (wineId, vintageYear) on Vintage table — can't have duplicate years for the same wine.

## UI conventions

- Mobile-first, dark wine-red theme (#722f37)
- Apple UX conventions (no confirmation on swipe delete, native-feeling interactions)
- Touch targets ≥44px
- Inline expand/collapse for detail views (not separate pages for vintages)

## Architecture note

Migrated to Railway monorepo pattern (March 2026) to match Wander, Maria, and ActionMgr. Eliminated Render cold starts, single URL, consistent deployment.
