import { Transaction } from '@mysten/sui/transactions';
import { Context, Hono } from 'hono';
import {
  getMultisig,
  isMultisigMember,
  validateProposedTransaction,
} from '../services/multisig.service';
import { ValidationError } from '../errors';
import { suiClient } from '../utils/client';
import {
  ProposalStatus,
  proposalStatusFromString,
  SchemaProposals,
  SchemaProposalSignatures,
} from '../db/schema';
import { db } from '../db';
import { parsePublicKey } from '../utils/pubKey';
import { fromBase64 } from '@mysten/sui/utils';
import {
  getProposalById,
  getProposalsByMultisigAddress,
} from '../services/proposals.service';
import { validatePersonalMessage } from '../services/addresses.service';
import { and, eq } from 'drizzle-orm';
import { AuthEnv, authMiddleware } from '../services/auth.service';

const proposalsRouter = new Hono();

// Create a new proposed multi-sig transaction.
proposalsRouter.post('/', async (c) => {
  const { multisigAddress, transactionBytes, publicKey, signature } =
    await c.req.json();

  if (!(await isMultisigMember(multisigAddress, publicKey)))
    throw new ValidationError('Proposer is not a member of the multisig');

  const multisig = await getMultisig(multisigAddress);

  if (!multisig.isVerified)
    throw new ValidationError(
      'Multisig is not verified. You need to first get acceptance from all members.',
    );

  const proposedTransaction = Transaction.from(transactionBytes);

  // Validate the proposed transaction for:
  // 1. No other pending proposal with the same owned objects in them.
  // 2. The transaction is fully resolved.
  // 3. The transaction is not already in a pending proposal.
  await validateProposedTransaction(proposedTransaction, multisigAddress);

  // Build the transaction to verify the supplied user signature
  const built = await proposedTransaction.build({
    client: suiClient,
  });

  // Verify the supplied user signature.
  const pubKey = await parsePublicKey(publicKey);
  const isValidSuiSignature = await pubKey.verifyTransaction(built, signature);

  if (!isValidSuiSignature)
    throw new ValidationError(
      'Invalid Sui signature for the proposed transaction.',
    );

  // Insert the proposal and the first sig!
  const proposal = await db.transaction(async (tx) => {
    const proposal = await tx
      .insert(SchemaProposals)
      .values({
        multisigAddress,
        digest: await proposedTransaction.getDigest(),
        transactionBytes,
        builtTransactionBytes: built.toBase64(),
        proposerAddress: publicKey.toSuiAddress(),
      })
      .returning();

    await tx.insert(SchemaProposalSignatures).values({
      proposalId: proposal[0].id,
      publicKey,
      signature,
    });

    return proposal[0];
  });

  return c.json(proposal);
});
// Adds a signature for the transaction.
proposalsRouter.post('/:proposalId/vote', async (c) => {
  const { publicKey, signature } = await c.req.json();
  const { proposalId } = c.req.param();

  const proposal = await getProposalById(parseInt(proposalId));

  if (!(await isMultisigMember(proposal.multisigAddress, publicKey)))
    throw new ValidationError('Voter is not a member of the multisig');

  if (proposal.status !== ProposalStatus.PENDING)
    throw new ValidationError('Proposal is not pending');

  if (proposal.signatures[publicKey])
    throw new ValidationError('Voter has already voted for this proposal');

  const pubKey = await parsePublicKey(publicKey);

  const isValidSuiSignature = await pubKey.verifyTransaction(
    fromBase64(proposal.builtTransactionBytes),
    signature,
  );

  if (!isValidSuiSignature)
    throw new ValidationError(
      'Invalid Sui signature for the proposed transaction.',
    );

  const signatureObject = {
    proposalId: proposal.id,
    publicKey,
    signature,
  };

  // cast the vote in the DB.
  await db.insert(SchemaProposalSignatures).values(signatureObject);
  proposal.signatures.push(signatureObject);

  const multisig = await getMultisig(proposal.multisigAddress);
  let totalVotes = 0;

  for (const sig of proposal.signatures) {
    totalVotes +=
      multisig.members.find((member) => member?.publicKey === sig?.publicKey)
        ?.weight || 0;
  }

  return c.json({ hasReachedThreshold: totalVotes >= multisig.threshold });
});

// Cancel a transaction as a valid member of the commitee.
// TODO: this is pretty powerful (but probably safe to do).
proposalsRouter.post('/:proposalId/cancel', async (c) => {
  const { proposalId } = c.req.param();
  const { publicKey, signature } = await c.req.json();

  const proposal = await getProposalById(parseInt(proposalId));

  if (proposal.status !== ProposalStatus.PENDING)
    throw new ValidationError('Proposal is not pending');

  if (!(await isMultisigMember(proposal.multisigAddress, publicKey)))
    throw new ValidationError('Not a member of the multisig');

  await validatePersonalMessage(
    publicKey,
    signature,
    `Cancel proposal ${proposalId}`,
  );

  await db
    .update(SchemaProposals)
    .set({ status: ProposalStatus.CANCELLED })
    .where(eq(SchemaProposals.id, proposal.id));

  return c.json({ message: 'Proposal cancelled successfully' });
});

// Verify the execution of a proposal.
proposalsRouter.post('/:proposalId/verify', (c) => {
  // 1. Check if proposal exists.
  // 2. Verify that the proposal has been executed.
  // 3. Update the proposal status to "executed".
  return c.text('Verifying execution!');
});

proposalsRouter.get('/', authMiddleware, async (c: Context<AuthEnv>) => {
  const publicKeys = c.get('publicKeys');
  const { multisigAddress, status, activeAddress } = c.req.query();

  const pubKey = publicKeys.find((key) => key.toSuiAddress() === activeAddress);

  if (!pubKey)
    throw new ValidationError('Not authorized to access this multisig');

  if (!(await isMultisigMember(multisigAddress, pubKey.toBase64())))
    throw new ValidationError('Not a member of the multisig');

  const proposals = await getProposalsByMultisigAddress(
    multisigAddress,
    status ? proposalStatusFromString(status) : undefined,
  );

  return c.json(proposals);
});

export default proposalsRouter;
