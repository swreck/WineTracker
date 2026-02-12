# Wine Tracker Deployment Guide

## Current Status (Verified)

### Data Quality
- **Standard Import**: 199 wines, 87% with prices, 0 issues
- **Receipt OCR**: 10/12 wines parsed (2 missing due to no vintage year in product line - edge case)
- **Database**: 183 unique wines, 74 with tastings, 159 with prices

### Features
- **Wines List**: Search, filter by color, expandable vintages
- **Wine Detail**: Edit wine info, view all vintages with inline tastings
- **Vintage Detail**: Full tasting history, purchase history, add/edit prices
- **Quick Tasting** (NEW): Search wine → select vintage → add rating & notes
- **Import**: Standard notes format + Receipt OCR format
- **Favorites**: Filter by rating

---

## Deployment Steps (For Non-Technical User)

### Step 1: Deploy Backend to Railway (Free Tier)

1. Go to https://railway.app and click "Start a New Project"
2. Sign in with GitHub
3. Click "Deploy from GitHub repo" and select your WineTracker1 repository
4. Railway will auto-detect the backend - set these settings:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npx prisma generate`
   - **Start Command**: `npm start`
5. Click "Variables" and add:
   ```
   DATABASE_URL = (your existing Neon URL from backend/.env)
   PORT = 3001
   ```
6. Click "Deploy" - wait 2-3 minutes
7. Click "Settings" → "Generate Domain" to get your backend URL
   - Example: `wine-tracker-backend.up.railway.app`

### Step 2: Deploy Frontend to Vercel (Free)

1. Go to https://vercel.com and sign in with GitHub
2. Click "Add New Project" and import your WineTracker1 repository
3. Set these settings:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
4. Add Environment Variable:
   ```
   VITE_API_URL = https://your-railway-url.up.railway.app/api
   ```
   (Use your actual Railway URL from Step 1)
5. Click "Deploy" - wait 2-3 minutes
6. You'll get a URL like: `wine-tracker.vercel.app`

### Step 3: Add to iPhone Home Screen

1. Open Safari on your iPhone
2. Go to your Vercel URL (e.g., `wine-tracker.vercel.app`)
3. Tap the Share button (square with arrow)
4. Scroll down and tap "Add to Home Screen"
5. Name it "Wine Tracker" and tap "Add"

Now you have an app icon on your home screen!

---

## Using the App

### Import Your Wine Data

1. Open the app and tap "Import"
2. Select "Standard" mode for your notes
3. Paste your wine text (the format you've been using)
4. Tap "Preview Import" to review
5. Tap "Confirm Import"

### Import Receipt (iPhone Camera)

1. Take a photo of your wine store receipt
2. Open Photos app, select the image
3. Tap and hold on the text → "Copy All"
4. In Wine Tracker, tap "Import" → select "Receipt" mode
5. Paste the OCR text
6. Preview and confirm

### Quick Tasting (Most Common Use)

1. Tap "+ Tasting" in the nav bar
2. Type the wine name to search
3. Select the wine from results
4. Pick the vintage year
5. Enter date, rating (1-10), and optional notes
6. Tap "Save Tasting"

### View & Edit Wines

- **Wines tab**: Browse all wines, tap to see details
- **Favorites tab**: See highest-rated wines
- Tap any wine to edit its details or view tasting history
- Tap a vintage to add purchases or tasting notes

---

## Technical Notes

### Parser Handles These Formats

**Standard Notes:**
```
10/14/25 Mid-range unusual whites, reds

Delille Chaleur White 2022 $40 (3)
11/13/25: 8.5. big viscous tart honey, tart bitter finish.
//
Seller description here //
```

**Receipt OCR:**
```
20694 LA HONDA SC MINS CAB 2020 29
3/26/23: 7.5, soft, simple, very good
14708 RIOJA ALTA ARANA RSVA 14
6 0 44.99
```

### Known Limitations

1. Receipt wines without vintage year in product line are skipped
2. Vintage on description line (not product line) not parsed
3. Garbled OCR text may not parse correctly

### Database

- Hosted on Neon (PostgreSQL, free tier)
- Connection string in `backend/.env`
- Can be reset with: `npx prisma db push --force-reset`
