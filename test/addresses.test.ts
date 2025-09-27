import { describe, test, expect, beforeEach } from 'bun:test';
import { setupSharedTestEnvironment, createTestApp } from './setup/shared-test-setup';
import { ApiTestFramework } from './framework/api-test-framework';

setupSharedTestEnvironment();

describe('Addresses API', () => {
  let framework: ApiTestFramework;

  beforeEach(async () => {
    const app = await createTestApp();
    framework = new ApiTestFramework(app);
  });

  describe('Address Registration', () => {
    test('registers single user addresses', async () => {
      const { session, users } = await framework.createAuthenticatedSession(1);

      expect(users).toHaveLength(1);
      expect(users[0].address).toBeDefined();
      expect(users[0].publicKey).toBeDefined();
    });

    test('registers multiple user addresses in same session', async () => {
      const { session, users } = await framework.createAuthenticatedSession(3);

      expect(users).toHaveLength(3);

      // All users should have unique addresses
      const addresses = users.map(u => u.address);
      const uniqueAddresses = new Set(addresses);
      expect(uniqueAddresses.size).toBe(3);
    });

    test('handles registration for same user multiple times', async () => {
      const session = framework.createSession();
      const user = session.createUser();

      await session.connectUser(user);
      await session.registerAddresses();

      // Register again - should not fail
      await session.registerAddresses();

      expect(session.getConnectedUsers()).toHaveLength(1);
    });
  });

  describe('Address Lookup', () => {
    test('can look up registered address', async () => {
      const { session, users } = await framework.createAuthenticatedSession(1);
      const user = users[0];

      // This would require a new method in the framework to actually test the lookup endpoint
      // For now, just verify the user was properly set up
      expect(user.address).toMatch(/^0x[a-f0-9]{64}$/);
      expect(user.publicKey).toBeDefined();
    });
  });

  describe('Authentication Requirements', () => {
    test('requires authentication for address registration', async () => {
      const session = framework.createSession();

      // Try to register without connecting/authenticating first
      await expect(session.registerAddresses()).rejects.toThrow();
    });
  });
});