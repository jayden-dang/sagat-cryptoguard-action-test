import { useState } from 'react';
import { Button } from './ui/button';
import { Plus, Users, FileText, ExternalLink } from 'lucide-react';

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
  const [selectedMultisig, setSelectedMultisig] = useState<string | null>(null);

  const formatAddress = (address: string) =>
    `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <div className="max-w-6xl mx-auto mt-8 px-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Your Multisigs</h1>
          <p className="text-gray-600 mt-1">
            Manage your multi-signature wallets
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create New Multisig
        </Button>
      </div>

      {/* Multisig Cards Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {multisigs.map((multisig) => (
          <div
            key={multisig.address}
            className="border rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => setSelectedMultisig(multisig.address)}
          >
            {/* Card Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div className="ml-3">
                  <h3 className="font-semibold">
                    {multisig.name || 'Unnamed Multisig'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {formatAddress(multisig.address)}
                  </p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400" />
            </div>

            {/* Stats */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Threshold</span>
                <span className="text-sm font-medium">
                  {multisig.threshold}/{multisig.totalMembers || 'N/A'}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Status</span>
                <span className={`text-sm font-medium ${
                  multisig.isAccepted ? 'text-green-600' : 'text-orange-600'
                }`}>
                  {multisig.isAccepted ? 'Active' : 'Pending Invitation'}
                </span>
              </div>

              {multisig.pendingProposals > 0 && (
                <div className="flex justify-between items-center pt-3 border-t">
                  <span className="text-sm text-gray-600 flex items-center">
                    <FileText className="w-4 h-4 mr-1" />
                    Pending Proposals
                  </span>
                  <span className="text-sm font-medium text-orange-600">
                    {multisig.pendingProposals}
                  </span>
                </div>
              )}
            </div>

            {/* Action Button */}
            <Button
              className="w-full mt-4"
              variant={multisig.isAccepted ? "outline" : "default"}
              onClick={(e) => {
                e.stopPropagation();
                if (!multisig.isAccepted) {
                  // TODO: Implement accept invitation flow
                  console.log('Accept invitation for:', multisig.address);
                } else {
                  setSelectedMultisig(multisig.address);
                }
              }}
            >
              {multisig.isAccepted ? 'View Details' : 'Accept Invitation'}
            </Button>
          </div>
        ))}
      </div>

      {/* Empty State (shouldn't show but just in case) */}
      {multisigs.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No multisigs yet
          </h3>
          <p className="text-gray-500 mb-4">
            Create your first multisig wallet to get started
          </p>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Multisig
          </Button>
        </div>
      )}
    </div>
  );
}