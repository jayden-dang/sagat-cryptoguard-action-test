import { Hono } from 'hono';
import {
  MultisigMember,
  SchemaAddresses,
  SchemaMultisigMembers,
} from '../db/schema';
import { db } from '../db';
import { and, eq, inArray } from 'drizzle-orm';
import { authMiddleware, AuthEnv } from '../services/auth.service';
import { Context } from 'hono';
import { ValidationError } from '../errors';
import { parsePublicKey } from '../utils/pubKey';
import { registerPublicKeys } from '../services/addresses.service';

const addressesRouter = new Hono();

/**
 * Register addresses from authenticated JWT context.
 * No signature required - uses JWT authentication.
 */
addressesRouter.post('/', authMiddleware, async (c: Context<AuthEnv>) => {
  const publicKeys = c.get('publicKeys');
  const { extraPublicKeys } = await c.req.json().catch(() => ({ extraPublicKeys: [] }));

  // Parse extra public keys using the existing utility
  const parsedExtraKeys = extraPublicKeys.map((keyStr: string) => {
    try {
      return parsePublicKey(keyStr);
    } catch (error) {
      console.warn('Failed to parse public key:', keyStr, error);
      return null;
    }
  }).filter(Boolean);

  // Combine all public keys
  const allPublicKeys = [...publicKeys, ...parsedExtraKeys];

  // Register all public keys using the service
  await registerPublicKeys(allPublicKeys);

  return c.json({ success: true });
});

// Return a list of all multisigs that the JWT has active.
// Add a `?showPending=true` query to get invitations too.
addressesRouter.get(
  '/connections',
  authMiddleware,
  async (c: Context<AuthEnv>) => {
    const { showPending } = c.req.query();
    const publicKeys = c.get('publicKeys');

    const whereConditions = [
      inArray(
        SchemaMultisigMembers.publicKey,
        publicKeys.map((pubKey) => pubKey.toBase64()),
      ),
    ];

    // Show only accepted by default, show ALL (both accepted and pending) when showPending=true
    if (showPending !== 'true') {
      whereConditions.push(eq(SchemaMultisigMembers.isAccepted, true));
    }

    const members = await db.query.SchemaMultisigMembers.findMany({
      where: and(...whereConditions),
    });

    // group per public key from the active JWT.
    const grouped = members.reduce(
      (acc, member) => {
        acc[member.publicKey] = acc[member.publicKey] || [];
        acc[member.publicKey].push(member);
        return acc;
      },
      {} as Record<string, MultisigMember[]>,
    );

    return c.json(grouped);
  },
);

// Get the public key for an address registered in the system.
addressesRouter.get('/:address', async (c) => {
  const { address } = c.req.param();

  const addr = await db.query.SchemaAddresses.findFirst({
    where: eq(SchemaAddresses.address, address),
  });

  if (!addr)
    throw new ValidationError('Address is not registered in the system.');

  return c.json(addr);
});

export default addressesRouter;
