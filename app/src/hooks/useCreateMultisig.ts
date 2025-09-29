import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../lib/api';
import { toast } from 'sonner';
import type { CreateMultisigForm } from '../lib/validations/multisig';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { extractPublicKey } from '../lib/wallet';

export function useCreateMultisig() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const currentAccount = useCurrentAccount();

  return useMutation({
    mutationFn: async (data: CreateMultisigForm) => {
      if (!currentAccount) {
        throw new Error('No wallet connected');
      }

      // Get creator's public key
      const creatorPubKey = extractPublicKey(
        new Uint8Array(currentAccount.publicKey),
        currentAccount.address
      );

      // Extract public keys and weights directly
      const publicKeys = data.members.map(m => m.publicKey);
      const weights = data.members.map(m => m.weight);

      const payload = {
        publicKey: creatorPubKey.toBase64(),
        publicKeys,
        weights,
        threshold: data.threshold,
        name: data.name || undefined,
      };

      return apiClient.createMultisig(payload);
    },
    onSuccess: () => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['multisigs'] });

      toast.success('Multisig created successfully!');

      // Navigate to dashboard
      navigate('/');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create multisig: ${error.message}`);
    },
  });
}
