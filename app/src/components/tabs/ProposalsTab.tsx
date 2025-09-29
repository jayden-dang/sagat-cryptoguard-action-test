import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { FileText, Plus } from 'lucide-react';
import { Button } from '../ui/button';
import { SimplifiedMultisig } from '../../types/multisig';

interface ProposalsTabContext {
  multisig: SimplifiedMultisig;
}

export function ProposalsTab() {
  const { multisig } = useOutletContext<ProposalsTabContext>();
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'ready' | 'executed'>('all');

  const filters = [
    { id: 'all' as const, label: 'All Proposals', count: 0 },
    { id: 'pending' as const, label: 'Pending', count: multisig.pendingProposals, color: 'text-orange-600' },
    { id: 'ready' as const, label: 'Ready to Execute', count: 0, color: 'text-green-600' },
    { id: 'executed' as const, label: 'Executed', count: 0 },
  ];

  return (
    <div>
      {/* Filter Tabs */}
      <div className="mb-6">
        <div className="overflow-x-auto">
          <div className="flex space-x-1 min-w-max">
            {filters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={`px-4 py-2 text-sm font-medium transition-colors relative whitespace-nowrap ${
                  activeFilter === filter.id
                    ? 'text-blue-600 bg-blue-50 border border-blue-200 rounded-lg'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg'
                }`}
              >
                {filter.label}
                {filter.count > 0 && (
                  <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                    filter.color?.includes('orange') ? 'bg-orange-100 text-orange-600' :
                    filter.color?.includes('green') ? 'bg-green-100 text-green-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {filter.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Proposals Content */}
      <div className="space-y-4">
        {/* Empty State - Will be replaced with actual proposals list when API is integrated */}
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Proposals Yet
          </h3>
          <p className="text-gray-500 mb-4">
            Create your first proposal to get started with this multisig.
          </p>
          <Button onClick={() => {
            // This would trigger the parent's proposal sheet
            // We'll need to pass this function down from the parent
          }}>
            <Plus className="w-4 h-4 mr-2" />
            Create Proposal
          </Button>
        </div>
      </div>
    </div>
  );
}