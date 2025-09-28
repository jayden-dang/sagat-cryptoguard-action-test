export interface SimplifiedMultisig {
  address: string;
  name: string | null;
  threshold: number;
  totalMembers: number;
  isAccepted: boolean;
  isVerified: boolean;
  pendingProposals: number;
}

export interface MultisigMember {
  publicKey: string;
  weight: number;
  isAccepted: boolean;
  order: number;
}

export interface MultisigDetails {
  address: string;
  name?: string;
  threshold: number;
  isVerified: boolean;
  members: MultisigMember[];
}