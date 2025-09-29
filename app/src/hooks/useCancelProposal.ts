import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSignPersonalMessage, useCurrentAccount } from '@mysten/dapp-kit';
import { apiClient } from '../lib/api';
import { toast } from 'sonner';
import { QueryKeys } from '../lib/queryKeys';
import { extractPublicKey } from '../lib/wallet';

export function useCancelProposal() {
  const queryClient = useQueryClient();
  const currentAccount = useCurrentAccount();
  const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();

  return useMutation({
    mutationFn: async (proposalId: number) => {
      if (!currentAccount) throw new Error('No wallet connected');
      

      // Create a message to sign for cancellation
      const message = `Cancel proposal ${proposalId}`;

      // Sign the message
      const signResult = await signPersonalMessage({
        message: new TextEncoder().encode(message),
        account: currentAccount,
      });

      const publicKey = extractPublicKey(
        new Uint8Array(currentAccount.publicKey),
        currentAccount.address
      );

      // Call API to cancel the proposal
      return apiClient.cancelProposal(proposalId, {
        publicKey: publicKey.toBase64(),
        signature: signResult.signature,
      });
    },
    onSuccess: () => {
      // Invalidate all proposal-related queries
      queryClient.invalidateQueries({ queryKey: [QueryKeys.Proposals] });
      toast.success('Proposal cancelled successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to cancel proposal: ${error.message}`);
    },
  });
}
