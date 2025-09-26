import { Hono } from 'hono';

const proposalsRouter = new Hono();

// Create a new proposed multi-sig transaction.
proposalsRouter.post('/', (c) => {
  // 1. Check if multisig exists.
  // 2. Verify that the proposer is a part of the multisig (sui signature).
  // 3. Verify that the proposal is valid (no other pending proposal with the same owned objects in them).
  // 4. Add proposal to the table.
  return c.text('Creating proposal!');
});

// Cancel a transaction as a valid member of the commitee.
// TODO: this is pretty powerful (but probably safe to do).
proposalsRouter.post('/:proposalId/cancel', (c) => {
  // 1. Check if proposal exists
  // 2. Verify that the proposer is a part of the multisig (sui signature).
  // 3. Cancel the proposal.
  return c.text('Cancelling proposal!');
});

// Adds a signature for the transaction.
proposalsRouter.post('/:proposalId/vote', (c) => {
  // 1. Check if proposal exists.
  // 2. Verify that the voter is a part of the multisig (sui signature) & that the signature is valid for the tx hash.
  // 3. Save signature for the proposal.
  return c.text('Voting for proposal!');
});

proposalsRouter.post('/:proposalId/verify', (c) => {
  // 1. Check if proposal exists.
  // 2. Verify that the proposal has been executed.
  // 3. Update the proposal status to "executed".
  return c.text('Verifying execution!');
});

// List all the proposals for a supplied multisig.
// Paginated query (100 / page), order by time (ID Desc).
proposalsRouter.get('/', (c) => {
  // 1. Check if multisig exists.
  // 2. Return all proposals for the multisig (allow filtering on status, active/completed/pending)
  return c.text('Returning proposals!');
});

export default proposalsRouter;
