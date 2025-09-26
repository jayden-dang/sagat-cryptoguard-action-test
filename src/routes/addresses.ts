import { Hono } from 'hono';
import { parsePublicKey } from '../utils/pubKey';
import { SchemaAddresses } from '../db/schema';
import { db } from '../db';
import { eq } from 'drizzle-orm';

const addressesRouter = new Hono();
/**
 * Register an address (and its public key) on the system.
 */
addressesRouter.post('/', async (c) => {
  // Register an address to the system (throgh the public key)
  const { publicKey, signature } = await c.req.json();
  const pubKey = await parsePublicKey(publicKey);

  // Verify that the sender is the owner of that pubkey, to avoid spamming
  // our database.
  const address = pubKey.toSuiAddress();
  const message = new TextEncoder().encode(`Verifying address ${address}`);

  const isValid = await pubKey.verifyPersonalMessage(message, signature);
  if (!isValid) {
    return c.json({ error: 'Invalid signature' }, 400);
  }

  // insert (or read).
  const addr = await db
    .insert(SchemaAddresses)
    .values({ publicKey, address })
    .onConflictDoNothing()
    .returning();

  return c.json(addr);
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
