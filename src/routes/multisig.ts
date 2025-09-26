import { Hono } from 'hono';
import {
  SchemaAddresses,
  SchemaMultisigMembers,
  SchemaMultisigs,
} from '../db/schema';
import { parsePublicKey } from '../utils/pubKey';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../db';
import { MultiSigPublicKey } from '@mysten/sui/multisig';

const multisigRouter = new Hono();

multisigRouter.post('/multisig', async (c) => {
  const {
    publicKey,
    addresses,
    weights,
  }: { publicKey: string; addresses: string[]; weights: number[] } =
    await c.req.json();

  if (addresses.length !== weights.length) {
    return c.json(
      { error: 'Addresses and weights must be the same length' },
      400,
    );
  }

  if (addresses.length > 10) {
    return c.json({ error: 'Addresses cannot be more than 10' }, 400);
  }

  // validate weights.
  weights.forEach((weight) => {
    if (weight <= 0) {
      return c.json({ error: 'Weights must be greater than 0' }, 400);
    }
    if (weight > 255) {
      return c.json({ error: 'Weights must be less than 256' }, 400);
    }
  });

  const creatorPubKey = await parsePublicKey(publicKey);

  if (!addresses.some((address) => address === creatorPubKey.toSuiAddress())) {
    return c.json(
      { error: 'Creator address is not in the list of addresses' },
      400,
    );
  }

  // find the public keys in our addresses
  const dbPubKeys = await db.query.SchemaAddresses.findMany({
    where: inArray(SchemaAddresses.address, addresses),
  });

  if (dbPubKeys.length !== addresses.length) {
    return c.json(
      { error: 'Some addresses are not registered in the system' },
      400,
    );
  }

  const parsedPubKeys = await Promise.all(
    dbPubKeys.map(async (key) => await parsePublicKey(key.publicKey)),
  );

  const multisig = MultiSigPublicKey.fromPublicKeys({
    threshold: weights.reduce((acc, weight) => acc + weight, 0),
    publicKeys: parsedPubKeys.map((key, index) => ({
      publicKey: key,
      weight: weights[parsedPubKeys.indexOf(key)],
    })),
  });

  // add the multisig to the database.
  const database = await db.transaction(async (tx) => {
    const msig = (
      await tx
        .insert(SchemaMultisigs)
        .values({
          address: multisig.toSuiAddress(),
          isVerified: false,
        })
        .returning()
    )[0];

    // insert the multisig members in the DB.
    const members = await tx
      .insert(SchemaMultisigMembers)
      .values(
        parsedPubKeys.map((key, index) => ({
          multisigAddress: msig.address,
          publicKey: key.toSuiAddress(),
          weight: weights[parsedPubKeys.indexOf(key)],
          isAccepted: key.toSuiAddress() === creatorPubKey.toSuiAddress(),
        })),
      )
      .returning();

    return {
      multisig: msig,
      members,
    };
  });

  return c.json(database);
});

// Accept participation in a multisig scheme as a public key holder.
multisigRouter.post('/multisig/:address/accept', async (c) => {
  const { publicKey, signature } = await c.req.json();
  const { address } = c.req.param();

  const pubKey = await parsePublicKey(publicKey);

  const message = new TextEncoder().encode(
    `Participating in multisig ${address}`,
  );

  const isValid = await pubKey.verifyPersonalMessage(message, signature);

  if (!isValid) {
    return c.json({ error: 'Invalid signature' }, 400);
  }

  await db
    .update(SchemaMultisigMembers)
    .set({ isAccepted: true })
    .where(
      and(
        eq(SchemaMultisigMembers.multisigAddress, address),
        eq(SchemaMultisigMembers.publicKey, publicKey),
      ),
    );

  return c.text('Accepted multisig!');
});

export default multisigRouter;
