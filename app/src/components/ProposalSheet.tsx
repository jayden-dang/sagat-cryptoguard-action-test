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
  const form = useForm<ProposalFormData>({
    resolver: zodResolver(proposalSchema),
    defaultValues: {
      description: '',
      transactionData: '',
    },
  });

  const onSubmit = (data: ProposalFormData) => {
    // TODO: Implement proposal creation
    console.log({
      description: data.description,
      transactionData: JSON.parse(data.transactionData),
      multisigAddress
    });

    // Close sheet and reset form
    onOpenChange(false);
    form.reset();
  };

  const handleClose = (open: boolean) => {
    onOpenChange(open);
    if (!open) {
      form.reset();
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="!w-[60vw] sm:!w-[70vw] !max-w-none px-8">
        <SheetHeader>
          <SheetTitle>Create New Proposal</SheetTitle>
          <SheetDescription>
            Create a new proposal for the multisig to vote on.
          </SheetDescription>
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
            <label htmlFor="transaction-data" className="text-sm font-medium text-gray-700">
              Transaction Data (JSON)
            </label>
            <textarea
              id="transaction-data"
              placeholder="Enter transaction data in JSON format..."
              {...form.register('transactionData')}
              rows={12}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm"
            />
            {form.formState.errors.transactionData && (
              <p className="text-sm text-red-600">{form.formState.errors.transactionData.message}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={form.formState.isSubmitting || !form.formState.isValid}
            >
              Create Proposal
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}