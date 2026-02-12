# Wine Tracker

Personal wine inventory and tasting app.

## Local Development

### Prerequisites
- Node.js 18+
- PostgreSQL (via Docker, local install, or free cloud service)

### Option 1: With Docker

```bash
# Install dependencies
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
npm install

# Start PostgreSQL and initialize database
npm run setup

# Start both backend and frontend
npm run dev
```

### Option 2: Without Docker (using Neon/Supabase)

1. Create a free PostgreSQL database at [Neon](https://neon.tech) or [Supabase](https://supabase.com)
2. Copy your connection string

```bash
# Install dependencies
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
npm install

# Update backend/.env with your connection string
# DATABASE_URL="postgresql://user:pass@host/dbname?sslmode=require"

# Initialize database
cd backend
npm run db:push
npm run db:generate

# Start backend (terminal 1)
npm run dev

# Start frontend (terminal 2)
cd ../frontend
npm run dev
```

The app will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001/api

## Deployment (Railway)

### Backend

1. Create a new project on Railway
2. Add a PostgreSQL database
3. Create a new service from the `backend` directory
4. Set environment variables:
   - `DATABASE_URL` (auto-set by Railway if using their PostgreSQL)
   - `PORT` (optional, defaults to 3001)
5. Build command: `npm run build && npx prisma generate && npx prisma db push`
6. Start command: `npm start`

### Frontend

1. Create a new service on Railway (or Vercel/Netlify) from the `frontend` directory
2. Set environment variable:
   - `VITE_API_URL=https://your-backend-url.railway.app/api`
3. Build command: `npm run build`
4. Output directory: `dist`

## API Endpoints

- `GET /api/wines` - List all wines (with filters: `color`, `search`)
- `GET /api/wines/:id` - Get wine details with vintages
- `PUT /api/wines/:id` - Update wine
- `GET /api/wines/favorites/list` - Get favorite wines by rating

- `GET /api/vintages/:id` - Get vintage details
- `PUT /api/vintages/:id` - Update vintage
- `GET /api/vintages/favorites/list` - Get favorite vintages by rating

- `GET /api/tastings` - List tasting events (with filters: `startDate`, `endDate`, `minRating`)
- `POST /api/tastings` - Create tasting event
- `PUT /api/tastings/:id` - Update tasting
- `DELETE /api/tastings/:id` - Delete tasting

- `GET /api/purchases` - List purchase batches
- `GET /api/purchases/:id` - Get purchase batch details

- `POST /api/import/preview` - Preview import parsing
- `POST /api/import/execute` - Execute import

## Import Format

The import parser accepts semi-structured text like:

```
January 15, 2024 - Winter Reds

Chateau Margaux - Margaux 2018 $150
Elegant, complex nose with blackcurrant and cedar.
Tasted 2/1/2024: 9.0 - Incredible depth and length.
Tasted 6/15/2024: 9.2 - Opening up beautifully.

Ridge - Monte Bello 2019 $180 x2
California's answer to Bordeaux.
3/20/2024: 8.5 - Powerful but needs time.
```

## Ambiguities

Ambiguities from import parsing appear in two places:

1. **Preview step**: Before executing import, review flagged items
2. **Completion screen**: After import, a list of items that need manual verification

Common ambiguity types:
- `color_guess` - Wine color was assumed (defaulted to red)
- `wine_match` - Could not parse producer/wine name
- `date_parse` - Could not parse date, used today
- `rating_parse` - Could not parse rating from tasting note
