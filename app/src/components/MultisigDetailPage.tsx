import { useParams, useNavigate, NavLink, Outlet } from "react-router-dom";
import { useUserMultisigs } from "../hooks/useUserMultisigs";
import { Loading } from "./ui/loading";
import { Button } from "./ui/button";
import { FileText, Info, Coins, Plus, Copy, Check } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { ProposalSheet } from "./ProposalSheet";
import { MultisigSelector } from "./MultisigSelector";
import { useNetwork } from "../contexts/NetworkContext";
import { useCopyToClipboard } from "../hooks/useCopyToClipboard";

export function MultisigDetailPage() {
  const { address, tab } = useParams<{ address: string; tab?: string }>();
  const navigate = useNavigate();
  const { network } = useNetwork();
  const [showProposalSheet, setShowProposalSheet] = useState(false);
  const { copied, copy } = useCopyToClipboard();

  const { data: multisigs, isLoading } = useUserMultisigs(true);

  // Filter for verified multisigs only
  const verifiedMultisigs = useMemo(
    () => multisigs?.filter(m => m.isVerified && m.isAccepted) ?? [],
    [multisigs]
  );

  // Handle multisig selection change
  const handleMultisigChange = (newAddress: string) => {
    navigate(`/multisig/${newAddress}/${tab || 'proposals'}`);
  };

  // Handle wallet changes - redirect to first available multisig or home
  useEffect(() => {
    if (!isLoading && verifiedMultisigs.length > 0) {
      const currentExists = verifiedMultisigs.some(m => m.address === address);
      if (!currentExists) {
        // Current multisig not available in new wallet, redirect to first available
        navigate(`/multisig/${verifiedMultisigs[0].address}/${tab || 'proposals'}`, { replace: true });
      }
    } else if (!isLoading && verifiedMultisigs.length === 0 && address) {
      // No multisigs available, go to welcome screen
      navigate('/', { replace: true });
    }
  }, [verifiedMultisigs, address, tab, navigate, isLoading]);

  if (isLoading) {
    return <Loading message="Loading multisig details..." />;
  }

  if (verifiedMultisigs.length === 0) {
    return (
      <div className="max-w-6xl mx-auto mt-8 px-4">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Active Multisigs
          </h3>
          <p className="text-gray-500 mb-4">
            You don't have any verified multisigs available.
          </p>
          <Button onClick={() => navigate('/create')}>
            Create Multisig
          </Button>
        </div>
      </div>
    );
  }

  const multisig = verifiedMultisigs.find(m => m.address === address);

  if (!multisig) {
    return (
      <div className="max-w-6xl mx-auto mt-8 px-4">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Multisig Not Found
          </h3>
          <p className="text-gray-500 mb-4">
            The multisig address you're looking for doesn't exist or you don't have access to it.
          </p>
          <Button onClick={() => navigate('/invitations')}>
            View Invitations
          </Button>
        </div>
      </div>
    );
  }

  const tabs = [
    {
      id: 'proposals',
      label: 'Proposals',
      icon: FileText,
      count: multisig.pendingProposals > 0 ? multisig.pendingProposals : undefined
    },
    { id: 'overview', label: 'Overview', icon: Info },
    { id: 'assets', label: 'Assets', icon: Coins },
  ];

  // Remove this line since we'll use NavLink's built-in active state

  return (
    <div className="container mx-auto mt-8 px-4">
      {/* Header */}
      <div className="mb-6">
        {/* Multisig Selector & Info */}
        <div className="bg-white border rounded-lg p-6 mb-6">
          <div className="flex flex-col gap-6">
            {/* Multisig Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex-1 min-w-0">
                <MultisigSelector
                  multisigs={verifiedMultisigs}
                  selectedMultisig={address!}
                  onSelectMultisig={handleMultisigChange}
                />
              </div>
              <div className="flex items-center space-x-3 flex-shrink-0">
                <Button
                  variant="outline"
                  onClick={() => copy(address!)}
                  className="whitespace-nowrap"
                  title="Copy multisig address"
                >
                  {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  Copy Address
                </Button>
                <Button onClick={() => setShowProposalSheet(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Proposal
                </Button>
              </div>
            </div>

            {/* Quick Info Bar */}
            <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap pt-4 border-t">
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full">
                {multisig.threshold}/{multisig.totalMembers} threshold
              </span>
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                {multisig.isVerified ? 'Verified' : 'Pending'}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs ${
                network === "testnet"
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-blue-100 text-blue-700"
              }`}>
                {network}
              </span>
              {multisig.pendingProposals > 0 && (
                <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full">
                  {multisig.pendingProposals} pending
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="overflow-x-auto border-b">
          <div className="flex space-x-1 min-w-max">
            {tabs.map((tabItem) => {
              const Icon = tabItem.icon;

              return (
                <NavLink
                  key={tabItem.id}
                  to={`/multisig/${address}/${tabItem.id}`}
                  className={({ isActive }) =>
                    `px-4 py-2 text-sm font-medium transition-colors relative whitespace-nowrap flex items-center gap-2 ${
                      isActive
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  {tabItem.label}
                  {tabItem.count && (
                    <span className="ml-1 px-2 py-0.5 text-xs bg-orange-100 text-orange-600 rounded-full">
                      {tabItem.count}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        <Outlet context={{ multisig }} />
      </div>

      {/* Proposal Creation Sheet */}
      <ProposalSheet
        open={showProposalSheet}
        onOpenChange={setShowProposalSheet}
        multisigAddress={address!}
      />
    </div>
  );
}
