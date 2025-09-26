import {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  mock,
} from 'bun:test';
import { Hono } from 'hono';
import {
  setupTestDatabase,
  teardownTestDatabase,
  clearTestData,
} from './setup/test-db';
import { seedAddresses, signMessage } from './setup/test-helpers';
import type { Pool } from 'pg';

describe('Addresses API', () => {
  let app: Hono;
  let db: any;
  let dbName: string;
  let pool: Pool;

  // Helper to make requests with JWT cookie
  const requestWithAuth = async (
    path: string,
    method: string,
    cookie: string,
    body?: any,
  ) => {
    const options: any = {
      method,
      headers: { Cookie: cookie },
    };
    if (body) {
      options.body = JSON.stringify(body);
      options.headers['Content-Type'] = 'application/json';
    }
    return app.request(path, options);
  };

  // Helper to connect and get cookie (reuse from auth tests)
  const connectAndGetCookie = async (
    keypair: any,
    existingCookie?: string,
  ): Promise<string> => {
    const expiry = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const message = `Verifying address ownership until: ${expiry}`;
    const headers: any = { 'Content-Type': 'application/json' };
    if (existingCookie) headers.Cookie = existingCookie;

    const response = await app.request('/auth/connect', {
      method: 'POST',
      body: JSON.stringify({
        publicKey: keypair.publicKey,
        signature: await signMessage(keypair.keypair, message),
        expiry,
      }),
      headers,
    });
    expect(response.status).toBe(200);
    const setCookie = response.headers.get('set-cookie');
    const match = setCookie?.match(/connected-wallet=([^;]+)/);
    if (!match) throw new Error('No cookie returned');
    return match[0];
  };

  beforeAll(async () => {
    ({ db, dbName, pool } = await setupTestDatabase());
    mock.module('../src/db', () => ({ db }));
    mock.module('../src/db/env', () => ({
      JWT_SECRET: 'test-secret-key-for-testing',
    }));

    const authRouter = (await import('../src/routes/auth')).default;
    const addressesRouter = (await import('../src/routes/addresses')).default;

    app = new Hono()
      .route('/auth', authRouter)
      .route('/addresses', addressesRouter);
  });

  afterAll(async () => {
    await teardownTestDatabase(dbName, pool);
  });

  beforeEach(async () => {
    await clearTestData(db);
  });

  test('registers multiple addresses from JWT context', async () => {
    const [user1, user2, user3] = await seedAddresses(db, 3);

    // Connect multiple users to build up JWT with multiple keys
    let cookie = await connectAndGetCookie(user1);
    cookie = await connectAndGetCookie(user2, cookie); // Add user2 to existing JWT
    cookie = await connectAndGetCookie(user3, cookie); // Add user3 to existing JWT

    // Register all addresses from JWT context
    const response = await requestWithAuth('/addresses', 'POST', cookie);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);

    // Verify all addresses were registered correctly
    const { parsePublicKey } = await import('../src/utils/pubKey');
    const users = [user1, user2, user3];

    for (const user of users) {
      const response = await app.request(`/addresses/${user.address}`);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.publicKey).toBe(user.publicKey);
      expect(body.address).toBe(user.address);

      // Verify address is correctly derived from public key
      const parsedKey = parsePublicKey(user.publicKey);
      expect(parsedKey.toSuiAddress()).toBe(user.address);
    }
  });

  test('retrieves single address', async () => {
    const [user] = await seedAddresses(db, 1);
    const cookie = await connectAndGetCookie(user);

    // Register address first
    await requestWithAuth('/addresses', 'POST', cookie!);

    // Retrieve it
    const response = await app.request(`/addresses/${user.address}`);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.address).toBe(user.address);
    expect(body.publicKey).toBe(user.publicKey);
  });

  test('requires authentication for POST', async () => {
    const response = await app.request('/addresses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    expect(response.status).toBe(401);
  });
});
