import { useQuery } from '@tanstack/react-query';
import { useApiAuth } from '../contexts/ApiAuthContext';
import { apiClient } from '../lib/api';

interface MultisigMember {
  multisigAddress: string;
  publicKey: string;
  isAccepted: boolean;
  threshold: number;
  totalMembers: number;
  name?: string;
}

// Hook to fetch user's multisigs from the /addresses/connections endpoint
export function useUserMultisigs(showPending = false) {
  const { isCurrentAddressAuthenticated, currentAddress } = useApiAuth();

  return useQuery({
    queryKey: ['multisigs', 'user', currentAddress, showPending],
    queryFn: async () => {
      // Get multisig connections grouped by public key
      const connections = await apiClient.getMultisigConnections(showPending);

      // Flatten all multisigs from all public keys
      const allMultisigs: MultisigMember[] = [];
      Object.values(connections).forEach(multisigs => {
        allMultisigs.push(...multisigs);
      });

      // Deduplicate by multisig address and return formatted data
      const uniqueMultisigs = new Map<string, MultisigMember>();
      allMultisigs.forEach(m => {
        if (!uniqueMultisigs.has(m.multisigAddress)) {
          uniqueMultisigs.set(m.multisigAddress, m);
        }
      });

      return Array.from(uniqueMultisigs.values()).map(m => ({
        address: m.multisigAddress,
        name: m.name || null,
        threshold: m.threshold,
        totalMembers: m.totalMembers,
        isAccepted: m.isAccepted,
        isVerified: m.isAccepted,
        pendingProposals: 0, // This would need to be fetched separately if needed
      }));
    },
    enabled: isCurrentAddressAuthenticated,
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // Refetch every minute
  });
}