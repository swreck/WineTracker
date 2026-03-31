import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import winesRouter from './routes/wines';
import vintagesRouter from './routes/vintages';
import tastingsRouter from './routes/tastings';
import purchasesRouter from './routes/purchases';
import importRouter from './routes/import';
import aiRouter from './routes/ai';
import remiRouter from './routes/remi';
import { warmupDatabase, withRetry } from './utils/db';

const app = express();

// Add connection timeout parameters to DATABASE_URL for Neon serverless cold starts
function getDatabaseUrl(): string {
  // Clean URL - remove newlines and extra whitespace (fixes copy-paste issues)
  let url = (process.env.DATABASE_URL || '').replace(/[\r\n\s]+/g, '');

  // Add timeout parameters if not present
  if (url && !url.includes('connect_timeout')) {
    const separator = url.includes('?') ? '&' : '?';
    url += `${separator}connect_timeout=30&pool_timeout=30`;
  }

  return url;
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: getDatabaseUrl(),
    },
  },
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Pre-warm database connection on startup (handles Neon cold start)
warmupDatabase(prisma);

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Make prisma available to routes
app.locals.prisma = prisma;

// Routes
app.use('/api/wines', winesRouter);
app.use('/api/vintages', vintagesRouter);
app.use('/api/tastings', tastingsRouter);
app.use('/api/purchases', purchasesRouter);
app.use('/api/import', importRouter);
app.use('/api/ai', aiRouter);
app.use('/api/remi', remiRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Database connection test with retry
app.get('/api/db-test', async (req, res) => {
  try {
    const result = await withRetry(
      () => prisma.$queryRaw`SELECT 1 as test`,
      3,
      3000
    );
    res.json({ status: 'connected', result });
  } catch (error: any) {
    res.status(500).json({
      status: 'failed',
      error: error.message,
      code: error.code,
      meta: error.meta
    });
  }
});

// Serve frontend static files
const publicPath = path.join(__dirname, '..', 'public');
app.use(express.static(publicPath));

// SPA fallback: serve index.html for non-API routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }
  res.sendFile(path.join(publicPath, 'index.html'));
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
