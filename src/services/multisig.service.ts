import { and, eq } from 'drizzle-orm';
import { SchemaMultisigMembers } from '../db/schema';
import { db } from '../db';
import { ValidationError } from '../errors';

export const validateQuorum = async (
  addresses: string[],
  weights: number[],
  threshold: number,
) => {
  if (addresses.length !== weights.length) {
    throw new ValidationError('Addresses and weights must be the same length');
  }

  if (addresses.length > 10 || addresses.length < 2) {
    throw new ValidationError(
      'Addresses cannot be more than 10 or less than 2',
    );
  }

  // validate weights.
  weights.forEach((weight) => {
    if (weight <= 0) {
      throw new ValidationError('Weights must be greater than 0');
    }
    if (weight > 255) {
      throw new ValidationError('Weights must be less than 256');
    }
  });

  // prevent duplicates
  const uniqueAddresses = Array.from(new Set(addresses));
  if (uniqueAddresses.length !== addresses.length) {
    throw new ValidationError('Addresses must be unique');
  }

  if (threshold > weights.reduce((acc, weight) => acc + weight, 0)) {
    throw new ValidationError('Threshold must be less than the sum of weights');
  }

  if (threshold <= 1) {
    throw new ValidationError('Threshold must be greater than 1');
  }
};

// Returns true if the multisig is finalized (all members have accepted the invitation).
export const isMultisigFinalized = async (address: string) => {
  const isFinalized = await db.query.SchemaMultisigMembers.findMany({
    where: and(
      eq(SchemaMultisigMembers.multisigAddress, address),
      eq(SchemaMultisigMembers.isAccepted, false),
    ),
  });

  return isFinalized.length === 0;
};

// Returns true if the public key is a member of the multisig and has accepted the invitation.
export const isMultisigMember = async (
  msigAddress: string,
  publicKey: string,
  checkAcceptance: boolean = true,
) => {
  const whereConditions = [
    eq(SchemaMultisigMembers.multisigAddress, msigAddress),
    eq(SchemaMultisigMembers.publicKey, publicKey),
  ];

  if (checkAcceptance) {
    whereConditions.push(eq(SchemaMultisigMembers.isAccepted, true));
  }

  const member = await db.query.SchemaMultisigMembers.findFirst({
    where: and(...whereConditions),
  });
  return !!member;
};
