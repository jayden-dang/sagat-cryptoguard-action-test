import { Hono } from 'hono';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { getLocalClient, fundAddress } from '../setup/sui-network';

const client = getLocalClient();

export interface TestUser {
  keypair: Ed25519Keypair;
  publicKey: string;
  address: string;
}

export interface TestMultisig {
  address: string;
  threshold: number;
  name?: string;
}

export interface TestProposal {
  id: number;
  transactionBytes: string;
}

export class TestSession {
  private cookie: string = '';
  private users: TestUser[] = [];

  constructor(private app: Hono) {}

  createUser(): TestUser {
    const keypair = new Ed25519Keypair();
    const user = {
      keypair,
      publicKey: keypair.getPublicKey().toBase64(),
      address: keypair.toSuiAddress(),
    };
    this.users.push(user);
    return user;
  }

  async signMessage(keypair: Ed25519Keypair, message: string): Promise<string> {
    const bytes = new TextEncoder().encode(message);
    const { signature } = await keypair.signPersonalMessage(bytes);
    return signature;
  }

  async connectUser(user: TestUser): Promise<void> {
    const expiry = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const message = `Verifying address ownership until: ${expiry}`;
    const signature = await this.signMessage(user.keypair, message);

    const headers: any = { 'Content-Type': 'application/json' };
    if (this.cookie) headers.Cookie = this.cookie;

    const response = await this.app.request('/auth/connect', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        publicKey: user.publicKey,
        signature: signature,
        expiry,
      }),
    });

    if (!response.ok) {
      throw new Error(`Auth failed for user ${user.address}: ${response.status}`);
    }

    this.cookie = response.headers.get('set-cookie')?.match(/connected-wallet=([^;]+)/)?.[0] || '';

    // Track connected user if not already tracked
    if (!this.users.find(u => u.address === user.address)) {
      this.users.push(user);
    }
  }

  async connectUsers(users: TestUser[]): Promise<void> {
    for (const user of users) {
      await this.connectUser(user);
    }
  }

  async registerAddresses(): Promise<void> {
    if (!this.cookie) {
      throw new Error('No users connected - call connectUsers first');
    }

    const response = await this.app.request('/addresses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: this.cookie
      },
    });

    if (!response.ok) {
      throw new Error(`Address registration failed: ${response.status}`);
    }
  }

  async createMultisig(
    creator: TestUser,
    members: TestUser[],
    threshold: number,
    name?: string,
    fund: boolean = false
  ): Promise<TestMultisig> {
    return this.createCustomMultisig(creator, members, members.map(() => 1), threshold, name, fund);
  }

  async createCustomMultisig(
    creator: TestUser,
    members: TestUser[],
    weights: number[],
    threshold: number,
    name?: string,
    fund: boolean = false
  ): Promise<TestMultisig> {
    const response = await this.app.request('/multisig', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        publicKey: creator.publicKey,
        addresses: members.map(m => m.address),
        weights,
        threshold,
        name,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Multisig creation failed: ${response.status} - ${error}`);
    }

    const { multisig } = await response.json();

    // Only fund if explicitly requested
    if (fund) {
      await fundAddress(multisig.address);
    }

    return multisig;
  }

  async fundMultisig(multisigAddress: string): Promise<void> {
    await fundAddress(multisigAddress);
  }

  async acceptMultisig(member: TestUser, multisigAddress: string): Promise<void> {
    const message = `Participating in multisig ${multisigAddress}`;
    const signature = await this.signMessage(member.keypair, message);

    const response = await this.app.request(`/multisig/${multisigAddress}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        publicKey: member.publicKey,
        signature: signature,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Multisig acceptance failed: ${response.status} - ${error}`);
    }
  }

  async createProposal(
    proposer: TestUser,
    multisigAddress: string,
    recipient: string,
    amount: number,
    description?: string
  ): Promise<TestProposal> {
    // Create transaction
    const tx = new Transaction();
    tx.setSender(multisigAddress);
    const [coin] = tx.splitCoins(tx.gas, [amount]);
    tx.transferObjects([coin], recipient);

    const txBytes = await tx.build({ client });
    const signature = await proposer.keypair.signTransaction(txBytes);

    const response = await this.app.request('/proposals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        multisigAddress,
        transactionBytes: txBytes.toBase64(),
        publicKey: proposer.publicKey,
        signature: signature.signature,
        description,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Proposal creation failed: ${response.status} - ${error}`);
    }

    const proposal = await response.json();
    return {
      id: proposal.id,
      transactionBytes: txBytes.toBase64(),
    };
  }

  async voteOnProposal(
    voter: TestUser,
    proposalId: number,
    transactionBytes: string
  ): Promise<{ hasReachedThreshold: boolean }> {
    const txBytes = Transaction.from(transactionBytes);
    const builtTx = await txBytes.build({ client });
    const signature = await voter.keypair.signTransaction(builtTx);

    const response = await this.app.request(`/proposals/${proposalId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        publicKey: voter.publicKey,
        signature: signature.signature,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      let message = `Voting failed: ${response.status}`;
      try {
        const parsed = JSON.parse(error);
        message = parsed.error || message;
      } catch {
        message += ` - ${error}`;
      }
      throw new Error(message);
    }

    return response.json();
  }

  async disconnect(): Promise<void> {
    await this.app.request('/auth/disconnect', { method: 'POST' });
    this.cookie = '';
    this.users = [];
  }

  getConnectedUsers(): TestUser[] {
    if (!this.cookie) return [];

    try {
      // Extract JWT from cookie
      const jwtMatch = this.cookie.match(/connected-wallet=([^;]+)/);
      if (!jwtMatch) return [];

      const jwt = jwtMatch[1];

      // Decode JWT payload (it's base64 encoded)
      const parts = jwt.split('.');
      if (parts.length !== 3) return [];

      const payload = JSON.parse(atob(parts[1]));
      const publicKeysFromJWT = payload.publicKeys || [];

      // Map JWT public keys back to our test users
      return this.users.filter(user =>
        publicKeysFromJWT.includes(user.publicKey)
      );
    } catch (error) {
      console.warn('Failed to decode JWT:', error);
      return [];
    }
  }

  hasActiveCookie(): boolean {
    return !!this.cookie && this.getConnectedUsers().length > 0;
  }
}

export class ApiTestFramework {
  constructor(private app: Hono) {}

  createSession(): TestSession {
    return new TestSession(this.app);
  }

  // Helper methods for common workflows
  async createAuthenticatedSession(userCount: number = 2): Promise<{
    session: TestSession;
    users: TestUser[];
  }> {
    const session = this.createSession();
    const users: TestUser[] = [];

    for (let i = 0; i < userCount; i++) {
      users.push(session.createUser());
    }

    await session.connectUsers(users);
    await session.registerAddresses();

    return { session, users };
  }

  async createVerifiedMultisig(
    userCount: number = 2,
    threshold?: number,
    name?: string,
    fund: boolean = false
  ): Promise<{
    session: TestSession;
    users: TestUser[];
    multisig: TestMultisig;
  }> {
    const { session, users } = await this.createAuthenticatedSession(userCount);
    const actualThreshold = threshold || userCount;

    const multisig = await session.createMultisig(users[0], users, actualThreshold, name, fund);

    // Accept for all non-creator members
    for (let i = 1; i < users.length; i++) {
      await session.acceptMultisig(users[i], multisig.address);
    }

    return { session, users, multisig };
  }

  async createFundedVerifiedMultisig(
    userCount: number = 2,
    threshold?: number,
    name?: string
  ): Promise<{
    session: TestSession;
    users: TestUser[];
    multisig: TestMultisig;
  }> {
    return this.createVerifiedMultisig(userCount, threshold, name, true);
  }
}