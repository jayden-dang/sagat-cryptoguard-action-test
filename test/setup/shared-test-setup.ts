import { beforeAll, afterAll, mock } from 'bun:test';
import { Hono } from 'hono';
import { setupTestDatabase, teardownTestDatabase, clearTestData } from './test-db';
import { isNetworkRunning } from './sui-network';
import type { Pool } from 'pg';

let testDbPool: Pool;
let testDbName: string;
let networkChecked = false;

export const setupSharedTestEnvironment = () => {
  beforeAll(async () => {
    // Check Sui network only once
    if (!networkChecked) {
      const running = await isNetworkRunning();
      if (!running) {
        console.error('❌ Local Sui network not running!');
        console.error('Start with: sui start --force-regenesis --with-faucet');
        process.exit(1);
      }
      networkChecked = true;
    }

    // Setup shared test database pool
    ({ dbName: testDbName, pool: testDbPool } = await setupTestDatabase());
  });

  afterAll(async () => {
    await teardownTestDatabase(testDbName, testDbPool);
  });
};

export const createTestApp = async (): Promise<Hono> => {
  // Use shared database pool instead of creating new database
  if (!testDbPool) {
    throw new Error('Test database pool not initialized. Call setupSharedTestEnvironment() first.');
  }

  const { drizzle } = await import('drizzle-orm/node-postgres');
  const schema = await import('../../src/db/schema');

  const db = drizzle(testDbPool, { schema });

  // Fast table cleanup instead of database recreation
  await clearTestData(db);

  // Mock modules with fresh db instance
  mock.module('../../src/db', () => ({ db }));
  mock.module('../../src/db/env', () => ({
    JWT_SECRET: 'test-secret-key-for-testing',
  }));

  // Create fresh router instances
  const authRouter = (await import('../../src/routes/auth')).default;
  const addressesRouter = (await import('../../src/routes/addresses')).default;
  const multisigRouter = (await import('../../src/routes/multisig')).default;
  const proposalsRouter = (await import('../../src/routes/proposals')).default;
  const { ValidationError } = await import('../../src/errors');

  const app = new Hono()
    .route('/auth', authRouter)
    .route('/addresses', addressesRouter)
    .route('/multisig', multisigRouter)
    .route('/proposals', proposalsRouter);

  app.onError((err, c) => {
    if (err instanceof ValidationError) {
      return c.json({ error: err.message }, 400);
    }
    console.error('Unhandled error:', err);
    return c.json({ error: 'Internal Server Error' }, 500);
  });

  return app;
};