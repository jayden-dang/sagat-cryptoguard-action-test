import { useState } from 'react';
import { ChevronDown, ChevronRight, Eye, ExternalLink, CheckCircle, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../ui/button';
import { ProposalWithSignatures, ProposalStatus } from '../../lib/types';
import { useNetwork } from '../../contexts/NetworkContext';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { extractPublicKey } from '@/lib/wallet';
import { ProposalPreview } from './ProposalPreview';
import { apiClient } from '../../lib/api';
import { calculateCurrentWeight, getTotalWeight } from '../../lib/proposalUtils';
import { QueryKeys } from '../../lib/queryKeys';

interface ProposalCardProps {
  proposal: ProposalWithSignatures;
}

export function ProposalCard({ proposal }: ProposalCardProps) {
  const { network } = useNetwork();
  const currentAccount = useCurrentAccount();
  const [isExpanded, setIsExpanded] = useState(false);

  // Query to get full multisig details (including members with weights)
  const { data: multisigDetails } = useQuery({
    queryKey: [QueryKeys.Multisig, proposal.multisigAddress],
    queryFn: () => apiClient.getMultisig(proposal.multisigAddress),
    enabled: !!proposal.multisigAddress,
    staleTime: Infinity, // Cache forever since multisig details are immutable
    gcTime: Infinity, // Keep in cache forever
  });

  // Check if current user has already signed this proposal
  const userHasSigned = () => {
    if (!currentAccount?.publicKey) return false;
    const userPublicKey = extractPublicKey(
      new Uint8Array(currentAccount.publicKey),
      currentAccount.address
    ).toBase64();

    return proposal.signatures.some(sig => sig.publicKey === userPublicKey);
  };

  const getProposalTitle = () => {
    // Use description if available, otherwise use a truncated digest
    if (proposal.description?.trim()) {
      return proposal.description.trim();
    }
    return `Transaction ${proposal.digest.slice(0, 8)}...${proposal.digest.slice(-4)}`;
  };

  const getStatusBadge = () => {
    if (proposal.status === ProposalStatus.SUCCESS) {
      return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Executed</span>;
    }
    if (proposal.status === ProposalStatus.CANCELLED) {
      return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">Cancelled</span>;
    }
    if (proposal.status === ProposalStatus.FAILURE) {
      return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">Failed</span>;
    }

    // Pending - check if ready to execute using the proper helpers
    const currentWeight = calculateCurrentWeight(proposal, multisigDetails);
    const totalWeight = getTotalWeight(multisigDetails);
    if (currentWeight >= totalWeight) {
      return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">Ready to Execute</span>;
    }
    return <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-800">Pending</span>;
  };

  const getExplorerUrl = (digest: string) => {
    return network === 'testnet'
      ? `https://suiscan.xyz/testnet/tx/${digest}`
      : `https://suiscan.xyz/mainnet/tx/${digest}`;
  };

  const getToggleButtonText = () => {
    if (proposal.status === ProposalStatus.SUCCESS) {
      return isExpanded ? 'Hide Transaction' : 'View Transaction';
    }
    if (proposal.status === ProposalStatus.PENDING) {
      return isExpanded ? 'Hide Preview' : 'Preview Effects';
    }
    return isExpanded ? 'Hide Details' : 'View Details';
  };

  const getToggleIcon = () => {
    if (proposal.status === ProposalStatus.SUCCESS) {
      return ExternalLink;
    }
    if (proposal.status === ProposalStatus.PENDING) {
      return Eye;
    }
    return isExpanded ? ChevronDown : ChevronRight;
  };

  const getSignatureStatus = () => {
    if (proposal.status !== ProposalStatus.PENDING) return null;

    if (userHasSigned()) {
      return (
        <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
          <CheckCircle className="w-3 h-3" />
          Already Signed
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
        <Clock className="w-3 h-3" />
        Pending Signature
      </div>
    );
  };

  const Icon = getToggleIcon();

  return (
    <div className="bg-white border rounded-lg hover:shadow-sm transition-shadow">
      {/* Main proposal row */}
      <div className="flex items-start justify-between p-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h4 className="font-medium text-gray-900 line-clamp-1">
              {getProposalTitle()}
            </h4>
            {getStatusBadge()}
            {getSignatureStatus()}
          </div>

          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>Signatures: {calculateCurrentWeight(proposal, multisigDetails)}/{getTotalWeight(multisigDetails)}</span>
            <span>Digest: {proposal.digest.slice(0, 8)}...{proposal.digest.slice(-8)}</span>
          </div>
        </div>

        <div className="ml-4">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <Icon className="w-4 h-4 mr-1" />
            {getToggleButtonText()}
          </Button>
        </div>
      </div>

      {/* Expandable content */}
      {isExpanded && (
        <div className="border-t px-4 py-4">
          {proposal.status === ProposalStatus.SUCCESS && (
            <div className="space-y-3">
              <h5 className="font-medium text-gray-900">Transaction Executed</h5>
              <p className="text-sm text-gray-600">
                This proposal has been successfully executed on-chain.
              </p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  asChild
                >
                  <a
                    href={getExplorerUrl(proposal.digest)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View on Explorer
                  </a>
                </Button>
                <span className="text-xs text-gray-500">
                  Digest: {proposal.digest}
                </span>
              </div>
            </div>
          )}

          {proposal.status === ProposalStatus.PENDING && (
            <ProposalPreview
              proposal={proposal}
              userHasSigned={userHasSigned()}
            />
          )}

          {(proposal.status === ProposalStatus.FAILURE || proposal.status === ProposalStatus.CANCELLED) && (
            <div className="space-y-3">
              <h5 className="font-medium text-gray-900">
                {proposal.status === ProposalStatus.FAILURE ? 'Transaction Failed' : 'Proposal Cancelled'}
              </h5>
              <p className="text-sm text-gray-600">
                {proposal.status === ProposalStatus.FAILURE
                  ? 'This proposal failed during execution.'
                  : 'This proposal was cancelled and will not be executed.'
                }
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}