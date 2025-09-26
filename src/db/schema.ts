import {
  pgTable,
  varchar,
  integer,
  boolean,
  index,
  pgEnum,
  uniqueIndex,
  serial,
} from 'drizzle-orm/pg-core';

// Multisig addresses table
const multisigs = pgTable(
  'multisigs',
  {
    // The address (combined) of the multisig
    address: varchar('address', { length: 66 }).notNull().primaryKey(),
    isVerified: boolean('is_verified').default(false).notNull(),
  },
  (table) => [index('multisig_address_idx').on(table.address)],
);

// Store the members of a multisig and their weight.
const multisigMembers = pgTable(
  'multisig_members',
  {
    // The multisig address
    multisigAddress: varchar('multisig_address', { length: 66 })
      .notNull()
      .references(() => multisigs.address),
    // The public key of the member
    publicKey: varchar('public_key', { length: 66 })
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
  publicKey: varchar('public_key', { length: 66 }).notNull().primaryKey(),
  address: varchar('address', { length: 66 }).notNull().unique(),
});

// TODO.
const proposals = pgTable('proposals', {
  id: serial('id').primaryKey(),
  multisigAddress: varchar('multisig_address', { length: 66 })
    .notNull()
    .references(() => multisigs.address),
  digest: varchar('digest', { length: 66 }).notNull(),
  status: varchar('status', { length: 255 }).notNull(),
});

// Export re-usable types.

export const SchemaAddresses = addresses;
export const SchemaMultisigs = multisigs;
export const SchemaMultisigMembers = multisigMembers;
export const SchemaProposals = proposals;

export type Proposal = typeof proposals.$inferSelect;

export type Multisig = typeof multisigs.$inferSelect;

export type MultisigMember = typeof multisigMembers.$inferSelect;

export type Address = typeof addresses.$inferSelect;
