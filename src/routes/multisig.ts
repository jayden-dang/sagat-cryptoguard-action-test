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
  isMultisigMember,
  validateQuorum,
} from '../services/multisig.service';
import { validatePersonalMessage } from '../services/addresses.service';
import { PublicKey } from '@mysten/sui/cryptography';
import { ValidationError } from '../errors';

const multisigRouter = new Hono();

multisigRouter.post('/', async (c) => {
  const {
    publicKey,
    addresses,
    weights,
    threshold,
  }: {
    publicKey: string;
    addresses: string[];
    weights: number[];
    threshold: number;
  } = await c.req.json();

  // Validate the quorum.
  await validateQuorum(addresses, weights, threshold);

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

  const parsedPubKeys: PublicKey[] = [];

  for (const address of addresses) {
    const key = dbPubKeys.find((key) => key.address === address);
    if (!key) {
      return c.json(
        { error: 'Some addresses are not registered in the system' },
        400,
      );
    }
    parsedPubKeys.push(await parsePublicKey(key.publicKey));
  }

  const multisig = MultiSigPublicKey.fromPublicKeys({
    threshold,
    publicKeys: parsedPubKeys.map((key, index) => ({
      publicKey: key,
      weight: weights[index],
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
        parsedPubKeys.map((key) => ({
          multisigAddress: msig.address,
          publicKey: key.toBase64(),
          weight:
            weights[addresses.findIndex((addr) => addr === key.toSuiAddress())],
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

  if (!senderAddress) throw new ValidationError('Invalid signature');

  if (!(await isMultisigMember(address, pubKey.toBase64(), false)))
    throw new ValidationError('You are not a member of this multisig');

  const result = await db.transaction(async (tx) => {
    const msig = await tx.query.SchemaMultisigs.findFirst({
      where: eq(SchemaMultisigs.address, address),
    });

    if (!msig) throw new ValidationError('Multisig not found');

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
    msig.isVerified = isFinalized;
    return msig;
  });

  return c.json(result);
});

export default multisigRouter;
