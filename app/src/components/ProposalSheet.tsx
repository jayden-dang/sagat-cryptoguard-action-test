import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from './ui/sheet';
import { Button } from './ui/button';
import { useDryRun } from '../hooks/useDryRun';
import { EffectsPreview } from './preview-effects/EffectsPreview';
import { Eye, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useNetwork } from '../contexts/NetworkContext';

interface ProposalSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  multisigAddress: string;
}

const proposalSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  transactionData: z.string().min(1, 'Transaction data is required').refine((data) => {
    try {
      JSON.parse(data);
      return true;
    } catch {
      return false;
    }
  }, 'Must be valid JSON'),
});

type ProposalFormData = z.infer<typeof proposalSchema>;

export function ProposalSheet({ open, onOpenChange, multisigAddress }: ProposalSheetProps) {
  const { network } = useNetwork();

  const form = useForm<ProposalFormData>({
    resolver: zodResolver(proposalSchema),
    defaultValues: {
      description: '',
      transactionData: '',
    },
  });

  const dryRunMutation = useDryRun();

  // Check if dry run was successful
  const isDryRunSuccessful = dryRunMutation.isSuccess && dryRunMutation.data?.effects?.status?.status === 'success';

  const onSubmit = (data: ProposalFormData) => {
    if (!isDryRunSuccessful) {
      toast.error('Please preview the transaction first');
      return;
    }

    // TODO: Implement proposal creation
    console.log({
      description: data.description,
      transactionData: JSON.parse(data.transactionData),
      multisigAddress,
      network
    });

    toast.success('Proposal created successfully');

    // Close sheet and reset form
    onOpenChange(false);
    form.reset();
  };

  const handleClose = (open: boolean) => {
    onOpenChange(open);
    if (!open) {
      form.reset();
      dryRunMutation.reset();
    }
  };

  const handlePreview = () => {
    const transactionData = form.getValues('transactionData');
    if (transactionData) {
      dryRunMutation.mutate(transactionData);
    }
  };

  // Watch for transaction data changes
  const transactionData = form.watch('transactionData');

  // Reset mutation when transaction data changes (user edits after preview)
  const handleTransactionDataChange = () => {
    if (dryRunMutation.data || dryRunMutation.error) {
      dryRunMutation.reset();
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="!w-[60vw] sm:!w-[70vw] !max-w-none px-8">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle>Create New Proposal</SheetTitle>
              <SheetDescription>
                Create a new proposal for the multisig to vote on.
              </SheetDescription>
            </div>
            <span className={`text-xs px-2 py-1 rounded ${
              network === "testnet"
                ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                : "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
            }`}>
              {network}
            </span>
          </div>
        </SheetHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 mt-8 pb-8">
          {/* Description */}
          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="description"
              placeholder="Describe what this proposal does..."
              {...form.register('description')}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            {form.formState.errors.description && (
              <p className="text-sm text-red-600">{form.formState.errors.description.message}</p>
            )}
          </div>

          {/* Transaction Data */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="transaction-data" className="text-sm font-medium text-gray-700">
                Transaction Data (JSON)
              </label>
              {transactionData && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePreview}
                  disabled={dryRunMutation.isPending || !transactionData}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  {dryRunMutation.isPending ? 'Previewing...' : 'Preview Effects'}
                </Button>
              )}
            </div>
            <textarea
              id="transaction-data"
              placeholder="Enter transaction data in JSON format..."
              {...form.register('transactionData', {
                onChange: handleTransactionDataChange
              })}
              rows={dryRunMutation.data ? 6 : 12}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm"
            />
            {form.formState.errors.transactionData && (
              <p className="text-sm text-red-600">{form.formState.errors.transactionData.message}</p>
            )}
          </div>

          {/* Preview Results */}
          {(dryRunMutation.data || dryRunMutation.error) && (
            <div className={`border rounded-lg p-4 ${
              isDryRunSuccessful
                ? 'border-green-200 bg-green-50'
                : 'border-red-200 bg-red-50'
            }`}>
              <div className="flex items-center gap-2 mb-3">
                {isDryRunSuccessful ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <h3 className="font-medium text-green-900">Transaction Preview - Success</h3>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <h3 className="font-medium text-red-900">Transaction Preview - Failed</h3>
                  </>
                )}
              </div>
              {isDryRunSuccessful ? (
                <EffectsPreview output={dryRunMutation.data} />
              ) : (
                <p className="text-sm text-red-600">
                  {dryRunMutation.error?.message || 'Transaction would fail on-chain'}
                </p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Cancel
            </Button>
            {!dryRunMutation.data ? (
              <Button
                type="button"
                disabled
                variant="outline"
              >
                Preview Required
              </Button>
            ) : isDryRunSuccessful ? (
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="bg-green-600 hover:bg-green-700"
              >
                {form.formState.isSubmitting ? 'Creating...' : 'Create Proposal'}
              </Button>
            ) : (
              <Button
                type="button"
                disabled
                variant="destructive"
              >
                Fix Transaction Errors
              </Button>
            )}</div>
        </form>
      </SheetContent>
    </Sheet>
  );
}