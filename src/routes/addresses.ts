import { Hono } from 'hono';
import { parsePublicKey } from '../utils/pubKey';
import { SchemaAddresses } from '../db/schema';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { authMiddleware, AuthEnv } from '../services/auth.service';
import { Context } from 'hono';

const addressesRouter = new Hono();
/**
 * Register addresses from authenticated JWT context.
 * No signature required - uses JWT authentication.
 */
addressesRouter.post('/', authMiddleware, async (c: Context<AuthEnv>) => {
  // Get all public keys from the JWT
  const publicKeys = c.get('publicKeys');

  // Prepare bulk insert data
  const addressData = publicKeys.map((pubKey) => ({
    publicKey: pubKey.toBase64(),
    address: pubKey.toSuiAddress(),
  }));

  // Bulk insert all addresses
  await db.insert(SchemaAddresses).values(addressData).onConflictDoNothing();

  return c.json({ success: true });
});

// Get the public key for an address registered in the system.
addressesRouter.get('/:address', async (c) => {
  const { address } = c.req.param();

  const addr = await db.query.SchemaAddresses.findFirst({
    where: eq(SchemaAddresses.address, address),
  });

  return c.json(addr);
});

export default addressesRouter;
