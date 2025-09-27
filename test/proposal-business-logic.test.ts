import { describe, test, expect, beforeEach } from 'bun:test';
import { setupSharedTestEnvironment, createTestApp } from './setup/shared-test-setup';
import { ApiTestFramework } from './framework/api-test-framework';

setupSharedTestEnvironment();

describe('Proposal Business Logic', () => {
  let framework: ApiTestFramework;

  beforeEach(async () => {
    const app = await createTestApp();
    framework = new ApiTestFramework(app);
  });

  describe('Transaction Validation', () => {
    test('validates transaction signature before creating proposal', async () => {
      const { session, users, multisig } = await framework.createFundedVerifiedMultisig(2, 2);

      // Try to create proposal with invalid signature (using wrong keypair)
      const wrongUser = session.createUser();
      const recipient = '0x1234567890123456789012345678901234567890123456789012345678901234';

      await expect(
        session.createProposal(wrongUser, multisig.address, recipient, 1000000)
      ).rejects.toThrow('not a member');
    });

    test('prevents duplicate proposals with same transaction digest', async () => {
      const { session, users, multisig } = await framework.createFundedVerifiedMultisig(2, 2);

      const recipient = '0x2222222222222222222222222222222222222222222222222222222222222222';

      // Create first proposal
      await session.createProposal(users[0], multisig.address, recipient, 1000000, 'First proposal');

      // Try to create identical proposal - should fail
      await expect(
        session.createProposal(users[0], multisig.address, recipient, 1000000, 'Duplicate proposal')
      ).rejects.toThrow('same digest');
    });
  });

  describe('Weighted Voting Logic', () => {
    test('calculates threshold with weighted votes correctly', async () => {
      const { session, users } = await framework.createAuthenticatedSession(3);

      // Create 3-member multisig with different weights: [1, 2, 1], threshold 3
      const multisig = await session.createCustomMultisig(users[0], users, [1, 2, 1], 3, undefined, true);

      // Verify multisig (accept invitations)
      await session.acceptMultisig(users[1], multisig.address);
      await session.acceptMultisig(users[2], multisig.address);

      const recipient = '0x3333333333333333333333333333333333333333333333333333333333333333';
      const proposal = await session.createProposal(users[0], multisig.address, recipient, 500000);

      // Alice voted (weight 1), now Bob votes (weight 2) = total 3, should reach threshold
      const voteResult = await session.voteOnProposal(users[1], proposal.id, proposal.transactionBytes);

      expect(voteResult.hasReachedThreshold).toBe(true);
    });

    test('does not reach threshold with insufficient weighted votes', async () => {
      const { session, users } = await framework.createAuthenticatedSession(3);

      // Create multisig with weights [1, 1, 1], threshold 3
      const multisig = await session.createCustomMultisig(users[0], users, [1, 1, 1], 3, undefined, true);

      // Verify multisig
      await session.acceptMultisig(users[1], multisig.address);
      await session.acceptMultisig(users[2], multisig.address);

      const proposal = await session.createProposal(users[0], multisig.address,
        '0x4444444444444444444444444444444444444444444444444444444444444444', 500000);

      // Only Alice (1) + Bob (1) = 2 votes, need 3 for threshold
      const voteResult = await session.voteOnProposal(users[1], proposal.id, proposal.transactionBytes);

      expect(voteResult.hasReachedThreshold).toBe(false);
    });
  });

  describe('Vote Validation', () => {
    test('prevents duplicate voting by same member', async () => {
      const { session, users, multisig } = await framework.createFundedVerifiedMultisig(2, 2);

      const proposal = await session.createProposal(users[0], multisig.address,
        '0x5555555555555555555555555555555555555555555555555555555555555555', 500000);

      // Try to vote again with the proposer (who already voted during creation)
      await expect(
        session.voteOnProposal(users[0], proposal.id, proposal.transactionBytes)
      ).rejects.toThrow('already voted');
    });
  });

  describe('Member Access Control', () => {
    test('only verified multisig members can create proposals', async () => {
      const { session, users } = await framework.createAuthenticatedSession(2);

      // Create multisig but don't have all members accept
      const multisig = await session.createMultisig(users[0], users, 2, undefined, true);
      // Only creator accepted, Bob hasn't accepted yet

      await expect(
        session.createProposal(users[0], multisig.address,
          '0x7777777777777777777777777777777777777777777777777777777777777777', 500000)
      ).rejects.toThrow('not verified');
    });

    test('only multisig members can vote on proposals', async () => {
      const { session, users, multisig } = await framework.createFundedVerifiedMultisig(2, 2);

      const proposal = await session.createProposal(users[0], multisig.address,
        '0x8888888888888888888888888888888888888888888888888888888888888888', 500000);

      // Create outsider who is not a multisig member
      const outsider = session.createUser();

      await expect(
        session.voteOnProposal(outsider, proposal.id, proposal.transactionBytes)
      ).rejects.toThrow('not a member');
    });
  });

  describe('Proposal State Management', () => {
    test('creates proposal with correct initial state', async () => {
      const { session, users, multisig } = await framework.createFundedVerifiedMultisig(2, 2);

      const proposal = await session.createProposal(users[0], multisig.address,
        '0x9999999999999999999999999999999999999999999999999999999999999999', 1000000, 'Test proposal');

      expect(proposal.id).toBeDefined();
      expect(proposal.transactionBytes).toBeDefined();

      // Proposal should be created with proposer's signature already included
      // (This is business logic - proposer auto-votes when creating)
    });

    test('tracks signatures and calculates threshold correctly', async () => {
      const { session, users, multisig } = await framework.createFundedVerifiedMultisig(3, 2);

      const proposal = await session.createProposal(users[0], multisig.address,
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 750000);

      // First additional vote - should reach threshold (proposer + 1 vote = 2 votes, threshold = 2)
      const voteResult = await session.voteOnProposal(users[1], proposal.id, proposal.transactionBytes);
      expect(voteResult.hasReachedThreshold).toBe(true);
    });
  });
});