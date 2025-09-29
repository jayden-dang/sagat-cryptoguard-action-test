import { useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Users, Copy, Check, ExternalLink } from 'lucide-react';
import { Button } from '../ui/button';
import { apiClient } from '../../lib/api';
import { MembersList } from '../invitations/MembersList';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';
import { useNetwork } from '../../contexts/NetworkContext';
import { SimplifiedMultisig } from '../../types/multisig';
import { CONFIG } from '../../lib/constants';

interface OverviewTabContext {
  multisig: SimplifiedMultisig;
}

export function OverviewTab() {
  const { multisig } = useOutletContext<OverviewTabContext>();
  const { copied, copy } = useCopyToClipboard();
  const { network } = useNetwork();

  const getExplorerUrl = (address: string) => {
    const baseUrl = CONFIG.EXPLORER_URLS[network];
    return `${baseUrl}/account/${address}`;
  };

  // Fetch multisig details using React Query
  const { data: multisigDetails, isLoading, error, refetch } = useQuery({
    queryKey: ['multisig', multisig.address],
    queryFn: () => apiClient.getMultisig(multisig.address),
    staleTime: CONFIG.STALE_TIME,
  });

  return (
    <div className="space-y-6">
      {/* Multisig Info Card */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Multisig Information</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Address
            </label>
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <code className="text-sm font-mono text-gray-900 flex-1 break-all">
                {multisig.address}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copy(multisig.address)}
                className="h-8 px-2 flex-shrink-0"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Signature Threshold
            </label>
            <div className="p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-900">
                {multisig.threshold} of {multisig.totalMembers} signatures required
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <div className="p-3 bg-gray-50 rounded-lg">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                multisig.isVerified
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {multisig.isVerified ? 'Verified' : 'Pending Verification'}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Network
            </label>
            <div className="p-3 bg-gray-50 rounded-lg">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                network === "testnet"
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-blue-100 text-blue-800"
              }`}>
                {network}
              </span>
            </div>
          </div>
        </div>

        {/* Explorer Link */}
        <div className="mt-6 pt-6 border-t">
          <Button
            variant="outline"
            onClick={() => window.open(getExplorerUrl(multisig.address), '_blank')}
            className="w-full sm:w-auto"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            View on Sui Explorer
          </Button>
        </div>
      </div>

      {/* Members Section */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <Users className="w-5 h-5 mr-2" />
          Members ({multisig.totalMembers})
        </h2>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-gray-500">Loading member details...</div>
          </div>
        ) : error ? (
          <div className="text-sm text-gray-500 text-center py-8">
            <p className="mb-4">Failed to load member details</p>
            <Button variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : multisigDetails ? (
          <MembersList members={multisigDetails.members} />
        ) : null}
      </div>
    </div>
  );
}