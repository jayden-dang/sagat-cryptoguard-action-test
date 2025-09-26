import {
  pgTable,
  integer,
  boolean,
  index,
  uniqueIndex,
  serial,
  text,
  smallint,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { ValidationError } from '../errors';

export enum ProposalStatus {
  PENDING = 0,
  EXECUTED = 1,
  CANCELLED = 2,
}

export const proposalStatusFromString = (status: string) => {
  switch (status) {
    case 'PENDING':
      return ProposalStatus.PENDING;
    case 'EXECUTED':
      return ProposalStatus.EXECUTED;
    case 'CANCELLED':
      return ProposalStatus.CANCELLED;
  }
  throw new ValidationError('Invalid status');
};

// Multisig addresses table
const multisigs = pgTable(
  'multisigs',
  {
    // The address (combined) of the multisig
    address: text('address').notNull().primaryKey(),
    isVerified: boolean('is_verified').default(false).notNull(),
    threshold: integer('threshold').notNull(),
  },
  (table) => [index('multisig_address_idx').on(table.address)],
);

// Store the members of a multisig and their weight.
const multisigMembers = pgTable(
  'multisig_members',
  {
    // The multisig address
    multisigAddress: text('multisig_address')
      .notNull()
      .references(() => multisigs.address),
    // The public key of the member
    publicKey: text('public_key')
      .notNull()
      .references(() => addresses.publicKey),
    // The weight of the member
    weight: integer('weight').default(1).notNull(),
    // Whether the member has accepted the invitations
    isAccepted: boolean('is_accepted').default(false).notNull(),
  },
  // We only allow a pub key once per multisig address
  (table) => [
    uniqueIndex('multisig_member_idx').on(
      table.multisigAddress,
      table.publicKey,
    ),
  ],
);

// Save a table of `pubKey -> address` to make lookups easier.
const addresses = pgTable('addresses', {
  publicKey: text('public_key').notNull().primaryKey(),
  address: text('address').notNull().unique(),
});

type ProposalSignatures = Record<string, string>;

const proposals = pgTable('proposals', {
  // The id of the proposal (sequential, so we can keep ordering)
  id: serial('id').primaryKey(),
  // The multisig address.
  multisigAddress: text('multisig_address')
    .notNull()
    .references(() => multisigs.address),
  // the digest of the proposed transaction (avoid duplicates)
  digest: text('digest').notNull().unique(),
  // The status of the proposal.
  status: smallint('status').notNull().default(ProposalStatus.PENDING),
  // The tx bytes of the proposed transaction.
  transactionBytes: text('transaction_bytes').notNull(),
  // The "built" tx bytes (after calling tx.build() with a client)
  builtTransactionBytes: text('built_transaction_bytes').notNull(),
  // The address of the proposer.
  proposerAddress: text('proposer_address').notNull(),
});

// Store the signatures for a proposal.
const proposalSignatures = pgTable(
  'proposal_signatures',
  {
    proposalId: integer('proposal_id')
      .notNull()
      .references(() => proposals.id),
    publicKey: text('public_key')
      .notNull()
      .references(() => addresses.publicKey),
    signature: text('signature').notNull(),
  },
  (table) => [primaryKey({ columns: [table.proposalId, table.publicKey] })],
);

// Export re-usable types.

export const SchemaAddresses = addresses;
export const SchemaMultisigs = multisigs;
export const SchemaMultisigMembers = multisigMembers;
export const SchemaProposals = proposals;
export const SchemaProposalSignatures = proposalSignatures;

export type Proposal = typeof proposals.$inferSelect;
export type Multisig = typeof multisigs.$inferSelect;
export type MultisigMember = typeof multisigMembers.$inferSelect;
export type Address = typeof addresses.$inferSelect;
export type ProposalSignature = typeof proposalSignatures.$inferSelect;

export type ProposalWithSignatures = Proposal & {
  signatures: ProposalSignature[];
};
