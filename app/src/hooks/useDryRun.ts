import { useMutation } from "@tanstack/react-query";
import { useSuiClient } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { toast } from "sonner";

export function useDryRun() {
  const client = useSuiClient();

  return useMutation({
    mutationFn: async (transactionData: string) => {
      // Parse and create transaction from JSON
      const txData = JSON.parse(transactionData);
      const tx = Transaction.from(txData);

      // Execute dry run
      const result = await client.dryRunTransactionBlock({
        transactionBlock: await tx.build({ client }),
      });

      // Check for errors in the result
      if (result.effects.status.status === "failure") {
        const errorMsg = result.effects.status.error || "Transaction would fail";
        throw new Error(errorMsg);
      }

      return result;
    },
    onSuccess: () => {
      toast.success("Dry run successful");
    },
    onError: (error: Error) => {
      toast.error(`Dry run failed: ${error.message}`);
    },
  });
}
