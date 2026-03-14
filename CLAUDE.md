# Wine Tracker — Project Notes

## What this is

A personal PWA for tracking wines, vintages, tastings, and purchases. Simple data-management app — no AI, no background jobs.

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

## Deployment (split architecture — legacy)

This app uses a split frontend/backend deployment, unlike the standard Railway monorepo pattern.

- **Frontend**: Vercel (`wine-tracker-ten.vercel.app`)
  - Vercel project: `wine-tracker` under `kens-projects-c72c0ebe`
  - Deploy: `cd frontend && npx vercel --prod --yes` (or push to main for auto-deploy)
  - Root directory on Vercel: `frontend/`
  - Linked from project root (`WineTracker1/.vercel/`), NOT from `frontend/`

- **Backend**: Render (`winetracker.onrender.com`)
  - Free tier — has cold starts (~30-60s after 15min inactivity)
  - Database: Neon PostgreSQL

- **Icons**: SVG + PNGs in `frontend/public/icons/`
  - favicon: `/icons/icon.svg`
  - apple-touch-icon: `/icons/icon-180.png`
  - manifest icons: `/icons/icon-192.png`, `/icons/icon-512.png`

## Key gotchas

- **Neon cold starts**: Backend has retry logic with 30s timeout + warmup query in `db.ts`. Render free tier adds another 30–60s cold start on top.
- **Import parser**: Three modes (standard, receipt, label) with fuzzy matching. Conflicts are surfaced for user decision before executing.
- **Wine merging**: Preview endpoint shows conflicts; execute endpoint applies resolution strategy. Cascades vintage/tasting/purchase data.
- **No service worker**: PWA manifest exists but no offline support — just installability.
- **Unique constraint**: (wineId, vintageYear) on Vintage table — can't have duplicate years for the same wine.

## UI conventions

- Mobile-first, dark wine-red theme (#722f37)
- Apple UX conventions (no confirmation on swipe delete, native-feeling interactions)
- Touch targets ≥44px
- Inline expand/collapse for detail views (not separate pages for vintages)

## Consolidation candidate

Could be migrated to Railway monorepo pattern to match Wander, Maria, and ActionMgr. Main benefit: eliminates cold starts, single URL, consistent deployment. Do not migrate without user approval.
