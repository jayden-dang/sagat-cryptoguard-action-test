import { useState, useMemo, useEffect } from 'react';
import { Button } from './ui/button';
import { Plus, FileText, Users } from 'lucide-react';
import { MultisigSelector } from './MultisigSelector';
import { ProposalSheet } from './ProposalSheet';
import { MultisigDetails } from './MultisigDetails';

interface SimplifiedMultisig {
  address: string;
  name: string | null;
  threshold: number;
  totalMembers: number;
  isAccepted: boolean;
  isVerified: boolean;
  pendingProposals: number;
}

interface DashboardProps {
  multisigs: SimplifiedMultisig[];
}

export function Dashboard({ multisigs }: DashboardProps) {
  // Filter for verified multisigs only
  const verifiedMultisigs = useMemo(
    () => multisigs.filter(m => m.isVerified && m.isAccepted),
    [multisigs]
  );

  const [selectedMultisig, setSelectedMultisig] = useState<string>(
    verifiedMultisigs[0]?.address || ''
  );
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'ready' | 'executed'>('all');
  const [showProposalSheet, setShowProposalSheet] = useState(false);

  // Update selected multisig when the list changes (e.g., wallet switch)
  useEffect(() => {
    if (verifiedMultisigs.length > 0) {
      // If current selection is not in the new list, reset to first available
      const currentExists = verifiedMultisigs.some(m => m.address === selectedMultisig);
      if (!currentExists) {
        setSelectedMultisig(verifiedMultisigs[0].address);
      }
    } else {
      // No multisigs available, clear selection
      setSelectedMultisig('');
    }
  }, [verifiedMultisigs, selectedMultisig]);

  const currentMultisig = verifiedMultisigs.find(m => m.address === selectedMultisig);

  // No verified multisigs - show empty state
  if (verifiedMultisigs.length === 0) {
    return (
      <div className="max-w-6xl mx-auto mt-8 px-4">
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Active Multisigs Yet
          </h3>
          <p className="text-gray-500 mb-4">
            You don't have any verified multisigs. Accept pending invitations to get started.
          </p>
          <Button onClick={() => window.location.href = '/invitations'}>
            View Invitations
          </Button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'all' as const, label: 'All Proposals', count: 0 },
    { id: 'pending' as const, label: 'Pending', count: 0, color: 'text-orange-600' },
    { id: 'ready' as const, label: 'Ready to Execute', count: 0, color: 'text-green-600' },
    { id: 'executed' as const, label: 'Executed', count: 0 },
  ];

  return (
    <div className="container mx-auto mt-8 px-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-4">Multisig Dashboard</h1>

        {/* Multisig Selector Bar */}
        <div className="bg-white border rounded-lg p-4 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Multisig Selector */}
            <div className="flex-1 min-w-0">
              <MultisigSelector
                multisigs={verifiedMultisigs}
                selectedMultisig={selectedMultisig}
                onSelectMultisig={setSelectedMultisig}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3 flex-shrink-0">
              {currentMultisig && <MultisigDetails multisig={currentMultisig} />}
              <Button onClick={() => setShowProposalSheet(true)} className="whitespace-nowrap">
                <Plus className="w-4 h-4 mr-2" />
                New Proposal
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="overflow-x-auto border-b">
          <div className="flex space-x-1 min-w-max">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium transition-colors relative whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                    tab.color || 'bg-gray-100 text-gray-600'
                  } ${tab.color?.includes('orange') ? 'bg-orange-100' : ''} ${
                    tab.color?.includes('green') ? 'bg-green-100' : ''
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Proposals Content Area */}
      <div className="space-y-4">
        {/* Empty State for now */}
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Proposals Yet
          </h3>
          <p className="text-gray-500 mb-4">
            Create your first proposal to get started with this multisig.
          </p>
          <Button onClick={() => setShowProposalSheet(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Proposal
          </Button>
        </div>
      </div>

      {/* Proposal Creation Sheet */}
      <ProposalSheet
        open={showProposalSheet}
        onOpenChange={setShowProposalSheet}
        multisigAddress={selectedMultisig}
      />
    </div>
  );
}
