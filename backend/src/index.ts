import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import winesRouter from './routes/wines';
import vintagesRouter from './routes/vintages';
import tastingsRouter from './routes/tastings';
import purchasesRouter from './routes/purchases';
import importRouter from './routes/import';

const app = express();
const prisma = new PrismaClient();

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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
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
