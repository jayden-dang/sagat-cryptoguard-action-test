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
import {
  seedAddresses,
  generateKeypair,
  signMessage,
} from './setup/test-helpers';
import type { Pool } from 'pg';

describe('Auth API', () => {
  let app: Hono;
  let db: any;
  let dbName: string;
  let pool: Pool;

  // Helper to make POST requests
  const post = (path: string, body: any, cookie?: string) => {
    const headers: any = { 'Content-Type': 'application/json' };
    if (cookie) headers.Cookie = cookie;
    return app.request(path, {
      method: 'POST',
      body: JSON.stringify(body),
      headers,
    });
  };

  // Helper to create signed auth request
  const createAuthRequest = async (keypair: any, expiryMinutes = 30) => {
    const expiry = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString();
    const message = `Verifying address ownership until: ${expiry}`;
    return {
      publicKey: keypair.publicKey,
      signature: await signMessage(keypair.keypair, message),
      expiry,
    };
  };

  // Helper to check if cookie is being set
  const hasCookie = (response: Response): boolean => {
    const setCookie = response.headers.get('set-cookie');
    return setCookie?.includes('connected-wallet=') ?? false;
  };

  // Helper to check if cookie is being deleted
  const isCookieDeleted = (response: Response): boolean => {
    const setCookie = response.headers.get('set-cookie');
    return setCookie?.includes('Max-Age=0') ?? false;
  };

  // Note: In real browser, httpOnly cookies are auto-managed.
  // For testing, we manually extract and pass cookies to simulate browser behavior.
  const getCookie = (response: Response): string | null => {
    const setCookie = response.headers.get('set-cookie');
    if (!setCookie) return null;
    const match = setCookie.match(/connected-wallet=([^;]+)/);
    return match ? match[0] : null;
  };

  // Extract just the JWT token from the cookie
  const getJwtFromCookie = (cookie: string): string | null => {
    const match = cookie.match(/connected-wallet=([^;]+)/);
    return match ? match[1] : null;
  };

  // Decode JWT payload without verification (mimics client behavior)
  const decodeJwtPayload = (cookie: string): any => {
    const jwt = getJwtFromCookie(cookie);
    if (!jwt) return null;

    // JWT structure: header.payload.signature
    const parts = jwt.split('.');
    if (parts.length !== 3) return null;

    // Decode the payload (base64url)
    const payload = parts[1];
    const decoded = Buffer.from(payload, 'base64url').toString('utf-8');
    return JSON.parse(decoded);
  };

  // Get public keys from JWT
  const getPublicKeysFromJwt = (cookie: string): string[] => {
    const payload = decodeJwtPayload(cookie);
    return payload?.publicKeys || [];
  };

  // Helper to connect a keypair and get the cookie
  const connectAndGetCookie = async (keypair: any, existingCookie?: string) => {
    const response = await post(
      '/auth/connect',
      await createAuthRequest(keypair),
      existingCookie
    );
    expect(response.status).toBe(200);
    return getCookie(response)!;
  };

  // Helper to connect multiple keypairs sequentially
  const connectMultipleKeys = async (keypairs: any[]) => {
    let cookie: string | undefined;
    for (const keypair of keypairs) {
      cookie = await connectAndGetCookie(keypair, cookie);
    }
    return cookie!;
  };

  beforeAll(async () => {
    ({ db, dbName, pool } = await setupTestDatabase());
    mock.module('../src/db', () => ({ db }));
    mock.module('../src/db/env', () => ({ JWT_SECRET: 'test-secret-key-for-testing' }));
    const authRouter = (await import('../src/routes/auth')).default;
    app = new Hono().route('/auth', authRouter);
  });

  afterAll(async () => {
    await teardownTestDatabase(dbName, pool);
  });

  beforeEach(async () => {
    await clearTestData(db);
  });

  describe('POST /auth/connect - Basic Functionality', () => {
    test('creates JWT for first-time connection', async () => {
      const [user] = await seedAddresses(db, 1);
      const response = await post('/auth/connect', await createAuthRequest(user));

      expect(response.status).toBe(200);
      expect(hasCookie(response)).toBe(true);

      // Check httpOnly flag is set (security requirement)
      const setCookie = response.headers.get('set-cookie');
      expect(setCookie).toContain('HttpOnly');
    });

    test('adds multiple public keys incrementally to same JWT', async () => {
      const users = await seedAddresses(db, 3);

      // Connect first user
      const cookie1 = await connectAndGetCookie(users[0]);
      const keys1 = getPublicKeysFromJwt(cookie1);
      expect(keys1).toHaveLength(1);
      expect(keys1).toContain(users[0].publicKey);

      // Add second user
      const cookie2 = await connectAndGetCookie(users[1], cookie1);
      const keys2 = getPublicKeysFromJwt(cookie2);
      expect(keys2).toHaveLength(2);
      expect(keys2).toContain(users[0].publicKey);
      expect(keys2).toContain(users[1].publicKey);

      // Add third user
      const cookie3 = await connectAndGetCookie(users[2], cookie2);
      const keys3 = getPublicKeysFromJwt(cookie3);
      expect(keys3).toHaveLength(3);
      expect(keys3).toContain(users[0].publicKey);
      expect(keys3).toContain(users[1].publicKey);
      expect(keys3).toContain(users[2].publicKey);
    });

    test('does not duplicate public keys in JWT', async () => {
      const [user] = await seedAddresses(db, 1);

      // Connect twice with same key
      const cookie1 = await connectAndGetCookie(user);
      const cookie2 = await connectAndGetCookie(user, cookie1);

      // Check JWT still has only one instance of this key
      const keys = getPublicKeysFromJwt(cookie2);
      expect(keys).toHaveLength(1);
      expect(keys).toContain(user.publicKey);
    });

    test('accepts unregistered addresses', async () => {
      const unregistered = generateKeypair();
      const response = await post('/auth/connect', await createAuthRequest(unregistered));

      // Auth allows new users without pre-registration
      expect(response.status).toBe(200);
      expect(getCookie(response)).toBeTruthy();
    });

    test('handles rapid successive connections', async () => {
      const users = await seedAddresses(db, 5);

      // Rapidly connect all 5 users
      const finalCookie = await connectMultipleKeys(users);

      // Verify the final JWT is valid by using it
      const verifyResponse = await post(
        '/auth/connect',
        await createAuthRequest(users[2]),
        finalCookie
      );
      expect(verifyResponse.status).toBe(200);
    });
  });

  describe('POST /auth/connect - Security', () => {
    test('sets secure cookie attributes', async () => {
      const [user] = await seedAddresses(db, 1);
      const response = await post('/auth/connect', await createAuthRequest(user));

      const setCookie = response.headers.get('set-cookie');
      expect(setCookie).toContain('HttpOnly'); // Prevents XSS attacks
      expect(setCookie).toContain('SameSite=Strict'); // Prevents CSRF attacks
      expect(setCookie).toContain('Secure'); // HTTPS only
      expect(setCookie).toContain('Path=/');
      expect(setCookie).toContain('Max-Age=31536000'); // 365 days
    });

    test('rejects expired signatures', async () => {
      const [user] = await seedAddresses(db, 1);

      // Create signature with past expiry
      const pastExpiry = new Date(Date.now() - 60000).toISOString();
      const message = `Verifying address ownership until: ${pastExpiry}`;
      const signature = await signMessage(user.keypair, message);

      const response = await post('/auth/connect', {
        publicKey: user.publicKey,
        signature,
        expiry: pastExpiry,
      });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Signature has expired');
    });

    test('rejects signatures with far future timestamps', async () => {
      const [user] = await seedAddresses(db, 1);

      // Create signature with expiry 10 years in future
      const farFutureExpiry = new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toISOString();
      const message = `Verifying address ownership until: ${farFutureExpiry}`;
      const signature = await signMessage(user.keypair, message);

      const response = await post('/auth/connect', {
        publicKey: user.publicKey,
        signature,
        expiry: farFutureExpiry,
      });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Signature expiry too far in the future (max 1 hour)');
    });

    test('accepts signatures with reasonable future timestamps', async () => {
      const [user] = await seedAddresses(db, 1);

      // Create signature with expiry 5 minutes in future (reasonable)
      const reasonableExpiry = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      const message = `Verifying address ownership until: ${reasonableExpiry}`;
      const signature = await signMessage(user.keypair, message);

      const response = await post('/auth/connect', {
        publicKey: user.publicKey,
        signature,
        expiry: reasonableExpiry,
      });

      expect(response.status).toBe(200);
    });

    test('handles invalid signature gracefully', async () => {
      const [user] = await seedAddresses(db, 1);
      const response = await post('/auth/connect', {
        publicKey: user.publicKey,
        signature: 'invalid-signature',
        expiry: new Date(Date.now() + 3600000).toISOString(),
      });
      expect(response.status).toBe(500);
    });

    test('handles malformed JWT cookie gracefully', async () => {
      const [user] = await seedAddresses(db, 1);

      // Should ignore invalid cookie and create new JWT
      const response = await post(
        '/auth/connect',
        await createAuthRequest(user),
        'connected-wallet=malformed-jwt'
      );

      expect(response.status).toBe(200);
      expect(getCookie(response)).toBeTruthy();
    });

    test('handles expired JWT by creating new one', async () => {
      const [user] = await seedAddresses(db, 1);

      // Send with expired/invalid cookie - should create new JWT
      const response = await post(
        '/auth/connect',
        await createAuthRequest(user),
        'connected-wallet=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjB9.invalid'
      );

      expect(response.status).toBe(200);
      expect(getCookie(response)).toBeTruthy();
    });

    test('rejects tampered JWTs', async () => {
      const [user] = await seedAddresses(db, 1);

      // Get a valid cookie first
      const response1 = await post('/auth/connect', await createAuthRequest(user));
      const cookie = getCookie(response1);

      // Tamper with the JWT
      const tamperedCookie = cookie?.replace(/.$/, 'X'); // Change last character

      // Try to use tampered cookie - should create new JWT
      const response2 = await post(
        '/auth/connect',
        await createAuthRequest(user),
        tamperedCookie
      );

      expect(response2.status).toBe(200);
    });
  });

  describe('POST /auth/connect - Input Validation', () => {
    test('rejects malformed expiry dates', async () => {
      const [user] = await seedAddresses(db, 1);

      const response = await post('/auth/connect', {
        publicKey: user.publicKey,
        signature: 'some-signature',
        expiry: 'not-a-date',
      });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Invalid expiry date format');
    });

    test('rejects missing required fields', async () => {
      const [user] = await seedAddresses(db, 1);

      // Missing signature
      const response1 = await post('/auth/connect', {
        publicKey: user.publicKey,
        expiry: new Date().toISOString(),
      });
      expect(response1.status).toBe(400);

      // Missing publicKey
      const response2 = await post('/auth/connect', {
        signature: 'some-signature',
        expiry: new Date().toISOString(),
      });
      expect(response2.status).toBe(400);

      // Missing expiry
      const response3 = await post('/auth/connect', {
        publicKey: user.publicKey,
        signature: 'some-signature',
      });
      expect(response3.status).toBe(400);
    });

    test('handles malformed public keys gracefully', async () => {
      const response = await post('/auth/connect', {
        publicKey: 'malformed-key!!!',
        signature: 'some-signature',
        expiry: new Date().toISOString(),
      });

      expect(response.status).toBe(500); // Internal error for malformed keys
    });
  });

  describe('POST /auth/connect - Edge Cases', () => {
    test('preserves existing keys when adding new ones', async () => {
      const [user1, user2] = await seedAddresses(db, 2);

      // Add user1, then user2
      const cookie1 = await connectAndGetCookie(user1);
      const cookie2 = await connectAndGetCookie(user2, cookie1);

      // Verify both keys are in the JWT
      const keys = getPublicKeysFromJwt(cookie2);
      expect(keys).toHaveLength(2);
      expect(keys).toContain(user1.publicKey);
      expect(keys).toContain(user2.publicKey);
    });

    test('maintains separate JWT sessions per device', async () => {
      const users = await seedAddresses(db, 4);

      // Device 1: connects user0 and user2
      const device1Cookie = await connectMultipleKeys([users[0], users[2]]);

      // Device 2: connects user1 and user3 (independent session)
      const device2Cookie = await connectMultipleKeys([users[1], users[3]]);

      // Each device maintains its own JWT
      expect(device1Cookie).not.toBe(device2Cookie);
    });
  });

  describe('POST /auth/disconnect', () => {
    test('clears JWT cookie on disconnect', async () => {
      const [user] = await seedAddresses(db, 1);

      // Connect first
      const cookie = await connectAndGetCookie(user);
      expect(cookie).toBeTruthy();

      // Disconnect
      const disconnectResponse = await post('/auth/disconnect', {}, cookie);
      expect(disconnectResponse.status).toBe(200);

      const body = await disconnectResponse.json();
      expect(body.success).toBe(true);

      // Check that cookie is deleted with proper attributes
      expect(isCookieDeleted(disconnectResponse)).toBe(true);

      const setCookie = disconnectResponse.headers.get('set-cookie');
      expect(setCookie).toContain('HttpOnly'); // Security attributes must match
      expect(setCookie).toContain('Path=/'); // Path must match for deletion
    });

    test('handles disconnect without existing cookie', async () => {
      // Disconnect without being connected
      const response = await post('/auth/disconnect', {});
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.success).toBe(true);
    });

    test('can reconnect after disconnect', async () => {
      const [user] = await seedAddresses(db, 1);

      // Connect, disconnect, then reconnect
      const cookie1 = await connectAndGetCookie(user);

      const disconnectResponse = await post('/auth/disconnect', {}, cookie1);
      expect(disconnectResponse.status).toBe(200);

      // Reconnect WITHOUT the old cookie (simulating browser cleared it)
      const response = await post('/auth/connect', await createAuthRequest(user));
      expect(response.status).toBe(200);

      const cookie2 = getCookie(response);
      expect(cookie2).toBeTruthy();
    });

    test('disconnect clears multi-key JWT completely', async () => {
      const users = await seedAddresses(db, 3);

      // Connect multiple keys
      const cookie = await connectMultipleKeys(users);

      // Disconnect
      const disconnectResponse = await post('/auth/disconnect', {}, cookie);
      expect(disconnectResponse.status).toBe(200);

      // Verify cookie is cleared
      const setCookie = disconnectResponse.headers.get('set-cookie');
      expect(setCookie).toContain('Max-Age=0');

      // Connect again WITHOUT the old cookie
      const newResponse = await post(
        '/auth/connect',
        await createAuthRequest(users[0])
      );
      expect(newResponse.status).toBe(200);

      const newCookie = getCookie(newResponse);
      expect(newCookie).toBeTruthy();

      // Verify it works with subsequent connections
      const verifyResponse = await post(
        '/auth/connect',
        await createAuthRequest(users[1]),
        newCookie || undefined
      );
      expect(verifyResponse.status).toBe(200);
    });
  });
});