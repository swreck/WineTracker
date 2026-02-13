import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import winesRouter from './routes/wines';
import vintagesRouter from './routes/vintages';
import tastingsRouter from './routes/tastings';
import purchasesRouter from './routes/purchases';
import importRouter from './routes/import';
import { warmupDatabase, withRetry } from './utils/db';

const app = express();

// Add connection timeout parameters to DATABASE_URL for Neon serverless cold starts
function getDatabaseUrl(): string {
  let url = process.env.DATABASE_URL || '';

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

// Health check with version to verify deployments
app.get('/api/health', (req, res) => {
  const dbUrl = getDatabaseUrl();
  const hasPoolTimeout = dbUrl.includes('pool_timeout');
  const hasConnectTimeout = dbUrl.includes('connect_timeout');
  res.json({
    status: 'ok',
    version: '2.2',
    urlHasPoolTimeout: hasPoolTimeout,
    urlHasConnectTimeout: hasConnectTimeout,
    urlEndsWithParams: dbUrl.slice(-50).replace(/:[^@]+@/, ':****@')
  });
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

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
