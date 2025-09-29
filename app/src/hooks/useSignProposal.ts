import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSignTransaction, useCurrentAccount } from '@mysten/dapp-kit';
import { apiClient } from '../lib/api';
import { toast } from 'sonner';
import { extractPublicKey } from '../lib/wallet';
import { Transaction } from '@mysten/sui/transactions';
import { QueryKeys } from '../lib/queryKeys';

interface SignProposalParams {
  proposalId: number;
  builtTransactionBytes: string;
}

export function useSignProposal() {
  const queryClient = useQueryClient();
  const currentAccount = useCurrentAccount();
  const { mutateAsync: signTransaction } = useSignTransaction();

  return useMutation({
    mutationFn: async ({ proposalId, builtTransactionBytes }: SignProposalParams) => {
      if (!currentAccount?.publicKey) {
        throw new Error("No connected account");
      }

      // Get current account's public key
      const publicKey = extractPublicKey(
        new Uint8Array(currentAccount.publicKey),
        currentAccount.address
      );

      // Create transaction from built bytes for signing
      const transaction = Transaction.from(builtTransactionBytes);

      // Sign the transaction
      const result = await signTransaction({
        transaction,
        account: currentAccount,
      });

      // Call API to vote on the proposal
      return apiClient.voteOnProposal(proposalId, {
        publicKey: publicKey.toBase64(),
        signature: result.signature as string,
      });
    },
    onSuccess: () => {
      // Invalidate queries to refresh proposal data
      queryClient.invalidateQueries({ queryKey: [QueryKeys.Proposals] });
      toast.success("Proposal signed successfully!");
    },
  });
}