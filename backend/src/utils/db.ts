import { PrismaClient } from '@prisma/client';

// Retry wrapper for database operations
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 2000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      // Check if it's a connection timeout error (Neon cold start)
      const isConnectionError =
        error.message?.includes('connection pool') ||
        error.message?.includes('Timed out') ||
        error.code === 'P2024';

      if (isConnectionError && attempt < maxRetries) {
        console.log(`Database connection attempt ${attempt} failed, retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}

// Wake up database by making a simple query
export async function warmupDatabase(prisma: PrismaClient): Promise<boolean> {
  try {
    await withRetry(
      () => prisma.$queryRaw`SELECT 1`,
      3,
      3000
    );
    console.log('Database connection warmed up');
    return true;
  } catch (error) {
    console.error('Failed to warm up database:', error);
    return false;
  }
}
