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
import {
  isMultisigFinalized,
  validateQuorum,
} from '../services/multisig.service';
import { validatePersonalMessage } from '../services/addresses.service';

const multisigRouter = new Hono();

multisigRouter.post('/', async (c) => {
  const {
    publicKey,
    addresses,
    weights,
  }: { publicKey: string; addresses: string[]; weights: number[] } =
    await c.req.json();

  // Validate the quorum.
  await validateQuorum(addresses, weights);

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
      weight: weights[index],
    })),
  });

  // Create a map of address to weight
  const addressWeightMap = new Map(
    addresses.map((addr, i) => [addr, weights[i]]),
  );

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
        parsedPubKeys.map((key) => ({
          multisigAddress: msig.address,
          publicKey: key.toBase64(),
          weight: addressWeightMap.get(key.toSuiAddress()),
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
multisigRouter.post('/:address/accept', async (c) => {
  const { publicKey, signature } = await c.req.json();
  const { address } = c.req.param();

  const pubKey = await parsePublicKey(publicKey);

  const senderAddress = await validatePersonalMessage(
    publicKey,
    signature,
    `Participating in multisig ${address}`,
  );

  if (!senderAddress) return c.json({ error: 'Invalid signature' }, 400);

  await db.transaction(async (tx) => {
    const msig = await tx.query.SchemaMultisigs.findFirst({
      where: eq(SchemaMultisigs.address, address),
    });

    if (!msig) throw new Error('Multisig not found');

    await tx
      .update(SchemaMultisigMembers)
      .set({ isAccepted: true })
      .where(
        and(
          eq(SchemaMultisigMembers.multisigAddress, address),
          eq(SchemaMultisigMembers.publicKey, pubKey.toBase64()),
        ),
      );

    const isFinalized = await isMultisigFinalized(address);
    // if all members have accepted, we can finalize the multisig.
    if (isFinalized) {
      await tx
        .update(SchemaMultisigs)
        .set({ isVerified: true })
        .where(eq(SchemaMultisigs.address, address));
    }
  });

  return c.text('Accepted multisig!');
});

export default multisigRouter;
