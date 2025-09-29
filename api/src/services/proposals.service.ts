import { and, eq } from 'drizzle-orm';
import { db } from '../db';
import {
  ProposalStatus,
  ProposalWithSignatures,
  SchemaProposals,
  SchemaProposalSignatures,
} from '../db/schema';
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

export const getProposalsByMultisigAddress = async (
  multisigAddress: string,
  network: string,
  status?: ProposalStatus,
) => {
  const proposalsWithSignatures = await db
    .select()
    .from(SchemaProposals)
    .leftJoin(
      SchemaProposalSignatures,
      eq(SchemaProposals.id, SchemaProposalSignatures.proposalId),
    )
    .where(
      and(
        eq(SchemaProposals.multisigAddress, multisigAddress),
        status ? eq(SchemaProposals.status, status) : undefined,
        eq(SchemaProposals.network, network),
      ),
    );

  const proposals: Record<number, ProposalWithSignatures> = {};

  for (const proposal of proposalsWithSignatures) {
    if (!proposals[proposal.proposals.id]) {
      proposals[proposal.proposals.id] = {
        ...proposal.proposals,
        signatures: [],
      };
    }

    proposals[proposal.proposals.id].signatures = proposalsWithSignatures
      .filter(
        (p) => p.proposal_signatures?.proposalId === proposal.proposals.id,
      )
      .map((p) => p.proposal_signatures)
      .filter((p) => p !== null);
  }

  // return the proposals in descending order.
  return Object.values(proposals).sort((a, b) => b.id - a.id);
};
