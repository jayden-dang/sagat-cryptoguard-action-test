import { useQuery } from '@tanstack/react-query';
import { useApiAuth } from '../contexts/ApiAuthContext';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { apiClient } from '../lib/api';
import { extractPublicKey } from '../lib/wallet';
import { QueryKeys } from '../lib/queryKeys';

interface EnrichedMember {
  multisigAddress: string;
  publicKey: string;
  weight: number;
  isAccepted: boolean;
  order: number;
  // From JOIN with multisigs table
  name?: string;
  threshold: number;
  isVerified: boolean;
  totalMembers: number;
}

// Hook to fetch user's multisigs from the /addresses/connections endpoint
export function useUserMultisigs(showPending = false) {
  const { isCurrentAddressAuthenticated, currentAddress } = useApiAuth();
  const currentAccount = useCurrentAccount();

  return useQuery({
    queryKey: [QueryKeys.Multisigs, QueryKeys.User, currentAddress, showPending],
    queryFn: async () => {
      if (!currentAccount) {
        throw new Error('No wallet connected');
      }

      // Get the current account's public key in base64 format
      const publicKey = extractPublicKey(
        new Uint8Array(currentAccount.publicKey),
        currentAccount.address
      );
      const pubKeyBase64 = publicKey.toBase64();

      // Get multisig connections grouped by public key
      const connections = await apiClient.getMultisigConnections(showPending);

      // Get multisigs for the current connected public key
      const userMultisigs: EnrichedMember[] = connections[pubKeyBase64] || [];

      // Transform to the expected format for the Dashboard
      return userMultisigs.map(m => ({
        address: m.multisigAddress,
        name: m.name || null,
        threshold: m.threshold || 0,
        totalMembers: m.totalMembers || 0,
        isAccepted: m.isAccepted,
        isVerified: m.isVerified,
        pendingProposals: 0, // This would need to be fetched separately if needed
      }));
    },
    enabled: isCurrentAddressAuthenticated,
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // Refetch every minute
  });
}