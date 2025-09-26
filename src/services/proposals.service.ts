import { eq } from 'drizzle-orm';
import { db } from '../db';
import { SchemaProposals, SchemaProposalSignatures } from '../db/schema';
import { ValidationError } from '../errors';

// Get a proposal by id, and its signatures.
export const getProposalById = async (proposalId: number) => {
  const result = await db
    .select()
    .from(SchemaProposals)
    .leftJoin(
      SchemaProposalSignatures,
      eq(SchemaProposals.id, SchemaProposalSignatures.proposalId),
    )
    .where(eq(SchemaProposals.id, proposalId));

  if (!result || result.length === 0)
    throw new ValidationError('Proposal not found');

  const proposal = result[0].proposals;
  const signatures = result
    .filter((row) => row.proposal_signatures !== null)
    .map((row) => row.proposal_signatures);

  return {
    ...proposal,
    signatures,
  };
};
