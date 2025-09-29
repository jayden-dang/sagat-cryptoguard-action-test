import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileText, Plus } from 'lucide-react';
import { Button } from '../ui/button';
import { SimplifiedMultisig } from '../../types/multisig';
import { apiClient } from '../../lib/api';
import { ProposalWithSignatures, ProposalStatus } from '../../lib/types';
import { useNetwork } from '../../contexts/NetworkContext';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { extractPublicKey } from '@/lib/wallet';

// Simple proposal card component
function ProposalCard({ proposal }: { proposal: ProposalWithSignatures }) {
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

    // Pending - check if ready to execute
    if (proposal.currentWeight >= proposal.totalWeight) {
      return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">Ready to Execute</span>;
    }
    return <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-800">Pending</span>;
  };

  return (
    <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h4 className="font-medium text-gray-900">
              Proposal #{proposal.id}
            </h4>
            {getStatusBadge()}
          </div>

          {proposal.description && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
              {proposal.description}
            </p>
          )}

          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>Signatures: {proposal.currentWeight}/{proposal.totalWeight}</span>
            <span>Digest: {proposal.digest.slice(0, 8)}...{proposal.digest.slice(-8)}</span>
          </div>
        </div>

        {proposal.status === ProposalStatus.PENDING && (
          <div className="ml-4">
            <Button size="sm" variant="outline">
              View Details
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

interface ProposalsTabContext {
  multisig: SimplifiedMultisig;
  openProposalSheet: () => void;
}

export function ProposalsTab() {
  const { multisig, openProposalSheet } = useOutletContext<ProposalsTabContext>();
  const { network } = useNetwork();
  const currentAccount = useCurrentAccount();
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'waiting' | 'ready' | 'executed'>('all');

  // Single query to fetch all proposals
  const { data: proposals = [], isLoading, error } = useQuery({
    queryKey: ['proposals', multisig.address, network],
    queryFn: () => apiClient.getProposals({
      multisigAddress: multisig.address,
      network: network
    }),
    refetchInterval: 30000,
  });

  // Helper to check if current user has signed a proposal
  const userHasSignedProposal = (proposal: ProposalWithSignatures) => {
    if (!currentAccount?.publicKey) return false;
    return proposal.signatures.some(sig =>
      sig.publicKey === extractPublicKey(new Uint8Array(currentAccount.publicKey), currentAccount.address).toBase64()
    );
  };

  // Filter proposals for each tab
  const pendingProposals = proposals.filter(p =>
    p.status === ProposalStatus.PENDING && p.currentWeight < p.totalWeight && !userHasSignedProposal(p)
  );
  const waitingProposals = proposals.filter(p =>
    p.status === ProposalStatus.PENDING && userHasSignedProposal(p)
  );
  const readyProposals = proposals.filter(p =>
    p.status === ProposalStatus.PENDING && p.currentWeight >= p.totalWeight
  );
  const executedProposals = proposals.filter(p => p.status === ProposalStatus.SUCCESS);

  const filters = [
    { id: 'all' as const, label: 'All Proposals', count: proposals.length },
    { id: 'pending' as const, label: 'Pending', count: pendingProposals.length, color: 'text-orange-600' },
    { id: 'waiting' as const, label: 'Waiting for Others', count: waitingProposals.length, color: 'text-blue-600' },
    { id: 'ready' as const, label: 'Ready to Execute', count: readyProposals.length, color: 'text-green-600' },
    { id: 'executed' as const, label: 'Executed', count: executedProposals.length },
  ];

  // Get filtered proposals for display
  const getFilteredProposals = () => {
    switch (activeFilter) {
      case 'pending':
        return pendingProposals;
      case 'waiting':
        return waitingProposals;
      case 'ready':
        return readyProposals;
      case 'executed':
        return executedProposals;
      default:
        return proposals;
    }
  };

  const filteredProposals = getFilteredProposals();

  return (
    <div>
      {/* Filter Tabs */}
      <div className="mb-6">
        <div className="overflow-x-auto">
          <div className="flex space-x-1 min-w-max">
            {filters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={`px-4 py-2 text-sm font-medium transition-colors relative whitespace-nowrap ${
                  activeFilter === filter.id
                    ? 'text-blue-600 bg-blue-50 border border-blue-200 rounded-lg'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg'
                }`}
              >
                {filter.label}
                {filter.count > 0 && (
                  <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                    filter.color?.includes('orange') ? 'bg-orange-100 text-orange-600' :
                    filter.color?.includes('green') ? 'bg-green-100 text-green-600' :
                    filter.color?.includes('blue') ? 'bg-blue-100 text-blue-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {filter.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Proposals Content */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-500">Loading proposals...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12 bg-red-50 rounded-lg">
            <p className="text-red-600 mb-4">Failed to load proposals</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        ) : filteredProposals.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {activeFilter === 'all' ? 'No Proposals Yet' : `No ${filters.find(f => f.id === activeFilter)?.label}`}
            </h3>
            <p className="text-gray-500 mb-4">
              {activeFilter === 'all'
                ? 'Create your first proposal to get started with this multisig.'
                : 'No proposals match the selected filter.'}
            </p>
            {activeFilter === 'all' && (
              <Button onClick={openProposalSheet}>
                <Plus className="w-4 h-4 mr-2" />
                Create Proposal
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredProposals.map((proposal) => (
              <ProposalCard key={proposal.id} proposal={proposal} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
