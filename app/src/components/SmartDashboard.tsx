import { Link, Navigate } from "react-router-dom";
import { useUserMultisigs } from "../hooks/useUserMultisigs";
import { Plus, Mail } from "lucide-react";
import { Button } from "./ui/button";
import { Loading } from "./ui/loading";

export function SmartDashboard() {
  const { data: multisigs, isLoading } = useUserMultisigs(true); // Include pending

  if (isLoading) {
    return <Loading message="Loading your multisigs..." />;
  }

  const activeMultisigs = multisigs?.filter((m) => m.isAccepted && m.isVerified) ?? [];
  const pendingInvites = multisigs?.filter((m) => !m.isAccepted) ?? [];

  // Case 1: User has active multisigs - redirect to first one
  if (activeMultisigs.length > 0) {
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
    </div>
  );
}
