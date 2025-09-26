import { Hono } from "hono";

const app = new Hono();

// Health check.
app.get("/", (c) => { return c.text("Multisig API is up and running!") });

// Create a new multisig address

// A single multisig consists of:
// 1. 1 to 10 sui addresses (+ their weights)
// 2. It needs to have "approvals" (a signed private message) from each address to be a valid one 
// (meaning that it can start issuing proposals).
// (Add some time bound for this and clean up if it's not finalized within X amount?).
app.post("/multisig", (c) => {
  // TODO: Do we need to potentially request "acceptance" from each pubkey
  // through the service (so there's a request pattern) to avoid people
  // being able to spam a pubkey?

  // 1. Check if multisig exists.
  // 2. Verify that you have a message from each multi-sig member.
  // 3. Add pub keys to the table.
  // 4. Add multisig key + the connection to pub keys (+ weights).
  return c.text("Registered multi-sig!");
});

// Create a new proposed multi-sig transaction.
app.post("/proposals", (c) => {
  // 1. Check if multisig exists.
  // 2. Verify that the proposer is a part of the multisig (sui signature).
  // 3. Verify that the proposal is valid (no other pending proposal with the same owned objects in them).
  // 4. Add proposal to the table.
  return c.text("Creating proposal!");
});

// Cancel a transaction as a valid member of the commitee.
// TODO: this is pretty powerful (but probably safe to do).
app.post("/proposals/:proposalId/cancel", (c) => {
  // 1. Check if proposal exists
  // 2. Verify that the proposer is a part of the multisig (sui signature).
  // 3. Cancel the proposal.
  return c.text("Cancelling proposal!");
});

// Adds a signature for the transaction.
app.post("/proposals/:proposalId/vote", (c) => {
  // 1. Check if proposal exists.
  // 2. Verify that the voter is a part of the multisig (sui signature) & that the signature is valid for the tx hash.
  // 3. Save signature for the proposal.
  return c.text("Voting for proposal!");
});

// List all the proposals for a supplied multisig.
// Paginated query (100 / page), order by time (ID Desc).
app.get("/proposals", (c) => {
  // 1. Check if multisig exists.
  // 2. Return all proposals for the multisig (allow filtering on status, active/completed/pending)
  return c.text("Returning proposals!");
});

export default app;
