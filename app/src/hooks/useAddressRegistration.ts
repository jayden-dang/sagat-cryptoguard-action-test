import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api';

/**
 * Check if an address is registered
 */
export function useCheckAddress(address: string | undefined) {
  return useQuery({
    queryKey: ['address', address],
    queryFn: async () => {
      if (!address) throw new Error('No address provided');
      return apiClient.getAddressInfo(address);
    },
    enabled: !!address,
    retry: false, // Don't retry on 404
  });
}

/**
 * Register a new address with public key
 */
export function useRegisterAddress() {
  return useMutation({
    mutationFn: async (publicKey: string) => {
      return apiClient.registerPublicKey(publicKey);
    },
  });
}