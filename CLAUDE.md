# Wine Tracker — Project Notes

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

## Consolidation candidate
Could be migrated to Railway monorepo pattern to match Wander, Maria, and ActionMgr. Main benefit: eliminates cold starts, single URL, consistent deployment. Do not migrate without user approval.
