import { Link, Navigate } from "react-router-dom";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useUserMultisigs } from "../hooks/useUserMultisigs";
import { Plus, Mail } from "lucide-react";
import { Button } from "./ui/button";
import { Loading } from "./ui/loading";
import { PendingMultisigCard } from "./PendingMultisigCard";

export function SmartDashboard() {
  const { data: multisigs, isLoading } = useUserMultisigs(true); // Include pending
  const currentAccount = useCurrentAccount();

  if (isLoading) {
    return <Loading message="Loading your multisigs..." />;
  }

  const activeMultisigs = multisigs?.filter((m) => m.isAccepted && m.isVerified) ?? [];
  const pendingInvites = multisigs?.filter((m) => !m.isAccepted) ?? [];
  const pendingMultisigs = multisigs?.filter((m) => m.isAccepted && !m.isVerified) ?? [];

  // Case 1: User has active multisigs - smart redirect
  if (activeMultisigs.length > 0) {
    // Check if there's a last viewed multisig for this wallet address
    const walletAddress = currentAccount?.address;
    const lastViewedKey = walletAddress ? `lastViewedMultisig_${walletAddress}` : null;
    const lastViewedMultisig = lastViewedKey ? localStorage.getItem(lastViewedKey) : null;

    if (lastViewedMultisig) {
      // Check if this multisig still belongs to the current address
      const isValidMultisig = activeMultisigs.some(m => m.address === lastViewedMultisig);
      if (isValidMultisig) {
        return <Navigate to={`/multisig/${lastViewedMultisig}/proposals`} replace />;
      }
    }

    // Default: redirect to first available multisig
    return <Navigate to={`/multisig/${activeMultisigs[0].address}/proposals`} replace />;
  }

  // Case 2: User has no active multisigs - show welcome screen
  return (
    <div className="max-w-4xl mx-auto mt-10 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Welcome to Sagat</h1>
        <p className="text-xl text-gray-600 mb-8">
          Get started by creating your first multisig
        </p>

        {/* Primary CTA - Create Multisig */}
        <Link to="/create">
          <Button size="lg" className="px-8">
            <Plus className="mr-2 h-5 w-5" />
            Create Your First Multisig
          </Button>
        </Link>

        {/* Secondary CTA - View Invitations */}
        <div className="mt-4">
          <Link to="/invitations">
            <Button
              variant={pendingInvites.length > 0 ? "outline" : "ghost"}
              className={pendingInvites.length > 0 ? "border-orange-300" : ""}
            >
              <Mail className="mr-2 h-4 w-4" />
              {pendingInvites.length > 0
                ? `View Invitations (${pendingInvites.length})`
                : "Check Invitations"}
            </Button>
          </Link>
        </div>
      </div>

      {/* Show pending multisigs if any */}
      {pendingMultisigs.length > 0 && (
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-semibold mb-4 text-center">Pending Multisigs</h2>
          <p className="text-gray-600 mb-6 text-center">
            These multisigs are being created on-chain. They'll be available once the creation transaction is confirmed.
          </p>
          <div className="space-y-3">
            {pendingMultisigs.map((multisig) => (
              <PendingMultisigCard
                key={multisig.address}
                address={multisig.address}
                name={multisig.name}
                threshold={multisig.threshold}
                totalMembers={multisig.totalMembers}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
