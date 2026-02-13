# Wine Tracker Deployment Fix

## The Problem

Your Render backend cannot connect to your Neon database. This is a common issue because:
1. Neon databases "sleep" after 5 minutes of inactivity
2. When they wake up, it takes a few seconds
3. The connection times out before Neon wakes up

## Two Solutions

### Solution A: Use Render's Built-in Database (RECOMMENDED)

Render offers a free PostgreSQL database that lives on the same network as your backend. No connection issues.

**Trade-offs:**
- Free tier expires after 30 days (you can recreate it)
- 1GB storage limit (plenty for your wines)
- Simpler, more reliable

### Solution B: Fix Neon Connection

Keep using Neon but with better timeout settings.

**Trade-offs:**
- Keeps your existing data
- May still have occasional cold-start delays
- More complex

---

## Solution A Instructions: Switch to Render Database

### Step 1: Create Render Database

1. Go to https://dashboard.render.com
2. Click **New** → **PostgreSQL**
3. Fill in:
   - **Name**: `winetracker-db`
   - **Database**: `winetracker`
   - **User**: leave blank (auto-generated)
   - **Region**: Oregon (same as your backend)
   - **PostgreSQL Version**: 16
   - **Instance Type**: **Free**
4. Click **Create Database**
5. Wait 1-2 minutes for it to create

### Step 2: Get the Connection URL

1. Once created, scroll to **Connections** section
2. Copy the **Internal Database URL** (starts with `postgres://`)

### Step 3: Update Your Backend

1. Go to your **WineTracker** web service in Render
2. Click **Environment**
3. Edit `DATABASE_URL` and paste the Internal Database URL
4. Click **Save Changes** (will redeploy)

### Step 4: Initialize the Database

After deploy completes, you need to create the tables. In the Render dashboard:

1. Go to your WineTracker **web service**
2. Click **Shell** (in left sidebar)
3. Type: `npx prisma db push`
4. Press Enter
5. Wait for "Your database is now in sync"

### Step 5: Re-import Your Wines

The new database is empty. Open your app and use the Import feature to add your wines, OR we can run the import script.

---

## Solution B Instructions: Fix Neon Connection

### Step 1: Update DATABASE_URL in Render

Use this exact URL with extended timeouts:

```
postgresql://neondb_owner:npg_RpLxulDg58dI@ep-long-rain-aha5oi2e-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&connect_timeout=60&pool_timeout=60
```

### Step 2: Wake Up Neon First

Before testing, go to https://console.neon.tech, open your project, and run any query in the SQL Editor. This wakes up the database.

### Step 3: Test Immediately

After waking Neon, immediately test: https://winetracker.onrender.com/api/wines

If it works, the issue was cold start. If not, use Solution A.

---

## Quick Reference

**Your URLs:**
- Frontend: https://wine-tracker-ten.vercel.app
- Backend: https://winetracker.onrender.com
- Backend health check: https://winetracker.onrender.com/api/health
- Backend wines: https://winetracker.onrender.com/api/wines

**Current Status:**
- Frontend: Deployed and working
- Backend: Deployed but can't reach database
- Database: Neon (connection issue)

---

## When You Return

Tell Claude: "Let's fix the database connection using Solution A" (or B)

I'll walk you through each step.
