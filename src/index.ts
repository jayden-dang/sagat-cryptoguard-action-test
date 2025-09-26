import { Hono } from 'hono';
import { parsePublicKey } from './utils/pubKey';
import { db } from './db';
import {
  SchemaAddresses,
  SchemaMultisigMembers,
  SchemaMultisigs,
} from './db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { MultiSigPublicKey } from '@mysten/sui/dist/cjs/multisig/publickey';
import addressesRouter from './routes/addresses';

const app = new Hono();

// Health check.
app.get('/', (c) => {
  return c.text('Multisig API is up and running!');
});

app.route('/addresses', addressesRouter);

// Create a new proposed multi-sig transaction.
app.post('/proposals', (c) => {
  // 1. Check if multisig exists.
  // 2. Verify that the proposer is a part of the multisig (sui signature).
  // 3. Verify that the proposal is valid (no other pending proposal with the same owned objects in them).
  // 4. Add proposal to the table.
  return c.text('Creating proposal!');
});

// Cancel a transaction as a valid member of the commitee.
// TODO: this is pretty powerful (but probably safe to do).
app.post('/proposals/:proposalId/cancel', (c) => {
  // 1. Check if proposal exists
  // 2. Verify that the proposer is a part of the multisig (sui signature).
  // 3. Cancel the proposal.
  return c.text('Cancelling proposal!');
});

// Adds a signature for the transaction.
app.post('/proposals/:proposalId/vote', (c) => {
  // 1. Check if proposal exists.
  // 2. Verify that the voter is a part of the multisig (sui signature) & that the signature is valid for the tx hash.
  // 3. Save signature for the proposal.
  return c.text('Voting for proposal!');
});

app.post('/proposals/:proposalId/verify', (c) => {
  // 1. Check if proposal exists.
  // 2. Verify that the proposal has been executed.
  // 3. Update the proposal status to "executed".
  return c.text('Verifying execution!');
});

// List all the proposals for a supplied multisig.
// Paginated query (100 / page), order by time (ID Desc).
app.get('/proposals', (c) => {
  // 1. Check if multisig exists.
  // 2. Return all proposals for the multisig (allow filtering on status, active/completed/pending)
  return c.text('Returning proposals!');
});

export default app;
