import { useEffect } from 'react';
import { CheckCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { ProposalWithSignatures } from '../../lib/types';
import { useDryRun } from '../../hooks/useDryRun';
import { useSignProposal } from '../../hooks/useSignProposal';
import { EffectsPreview } from '../preview-effects/EffectsPreview';

interface ProposalPreviewProps {
  proposal: ProposalWithSignatures;
  userHasSigned: boolean;
}

export function ProposalPreview({ proposal, userHasSigned }: ProposalPreviewProps) {
  const dryRunMutation = useDryRun();
  const signProposalMutation = useSignProposal();

  // Automatically run dry run when component mounts
  useEffect(() => {
    if (proposal.transactionBytes && !dryRunMutation.data && !dryRunMutation.error) {
      dryRunMutation.mutate(proposal.transactionBytes);
    }
  }, [proposal.transactionBytes]);

  const handleSignProposal = () => {
    signProposalMutation.mutate({
      proposalId: proposal.id,
      builtTransactionBytes: proposal.builtTransactionBytes
    });
  };

  const isDryRunSuccessful = dryRunMutation.data?.effects?.status?.status === 'success';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h5 className="font-medium text-gray-900">Transaction Preview</h5>
        {isDryRunSuccessful && (
          <div className="flex items-center gap-2">
            {userHasSigned ? (
              <div className="flex items-center gap-1 text-sm text-green-600">
                <CheckCircle className="w-4 h-4" />
                Already Signed
              </div>
            ) : (
              <Button
                size="sm"
                onClick={handleSignProposal}
                disabled={signProposalMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {signProposalMutation.isPending ? 'Signing...' : 'Sign Proposal'}
              </Button>
            )}
          </div>
        )}
      </div>

      {dryRunMutation.isPending && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          Loading preview...
        </div>
      )}

      {dryRunMutation.data && (
        <div className={`border rounded-lg p-3 ${
          isDryRunSuccessful
            ? 'border-green-200 bg-white'
            : 'border-red-200 bg-white'
        }`}>
          <EffectsPreview output={dryRunMutation.data} />
        </div>
      )}

      {dryRunMutation.error && (
        <div className="border border-red-200 bg-white rounded-lg p-3">
          <p className="text-sm text-red-600">
            {dryRunMutation.error.message || 'Transaction would fail on-chain'}
          </p>
        </div>
      )}

      {/* Sign Proposal Error */}
      {signProposalMutation.error && (
        <div className="border border-red-200 bg-red-50 rounded-lg p-3">
          <h6 className="font-medium text-red-800 mb-1">Failed to Sign Proposal</h6>
          <p className="text-sm text-red-600">
            {signProposalMutation.error.message}
          </p>
        </div>
      )}
    </div>
  );
}