import { useMutation } from '@tanstack/react-query';
import { useSignTransaction, useCurrentAccount } from '@mysten/dapp-kit';
import { apiClient } from '../lib/api';
import { toast } from 'sonner';
import { Transaction } from '@mysten/sui/transactions';
import { extractPublicKey } from '@/lib/wallet';
import { useNetwork } from '../contexts/NetworkContext';

interface CreateProposalParams {
  multisigAddress: string;
  transactionData: string;
  description?: string;
}

export function useCreateProposal() {
  const { network } = useNetwork();
  const currentAccount = useCurrentAccount();
  const { mutateAsync: signTransaction } = useSignTransaction();

  return useMutation({
    mutationFn: async ({ multisigAddress, transactionData, description }: CreateProposalParams) => {
      if (!currentAccount?.publicKey) {
        throw new Error("No connected account");
      }

      // Parse transaction data
      const transaction = Transaction.from(transactionData);

      // Sign the transaction (it will build and sign automatically)
      const signatureResult = await signTransaction({
        transaction,
        account: currentAccount,
      });

      // Create proposal via API
      return apiClient.createProposal({
        multisigAddress,
        transactionBytes: transactionData,
        publicKey: extractPublicKey(
          new Uint8Array(currentAccount.publicKey),
          currentAccount.address,
        ).toBase64(),
        signature: signatureResult.signature as string,
        description,
        network,
      });
    },
    onSuccess: () => {
      toast.success("Proposal created successfully!");
    },
  });
}