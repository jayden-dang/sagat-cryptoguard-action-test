import { ConnectButton, useCurrentAccount } from "@mysten/dapp-kit";
import { Link, useLocation } from "react-router-dom";
import { LucideLock, Plus, Mail } from "lucide-react";
import { Button } from "./ui/button";
import { useApiAuth } from "../contexts/ApiAuthContext";
import { useUserMultisigs } from "../hooks/useUserMultisigs";

export function Header() {
  const location = useLocation();
  const currentAccount = useCurrentAccount();
  const { isCurrentAddressAuthenticated } = useApiAuth();
  const { data: multisigs } = useUserMultisigs(true); // Include pending

  // Count pending invitations
  const pendingCount = multisigs?.filter(m => !m.isAccepted).length ?? 0;

  return (
    <div className="border-b">
      <div className="p-4 max-w-[1600px] mx-auto flex justify-between items-center">
        {/* Logo */}
        <Link to="/">
          <h1 className="text-xl flex items-center gap-3 hover:opacity-80 transition-opacity">
            <LucideLock />
            SAGAT
          </h1>
        </Link>

        {/* Right side navigation */}
        <div className="flex items-center gap-4">
          {/* Show nav buttons only when authenticated */}
          {currentAccount && isCurrentAddressAuthenticated && (
            <>
              {/* Invitations button - always visible */}
              <Link to="/invitations">
                <Button
                  variant={location.pathname === "/invitations" ? "default" : "outline"}
                  size="sm"
                  className="relative"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Invitations
                  {pendingCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {pendingCount}
                    </span>
                  )}
                </Button>
              </Link>

              {/* Create multisig button */}
              <Link to="/create">
                <Button
                  variant={location.pathname === "/create" ? "default" : "outline"}
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Multisig
                </Button>
              </Link>
            </>
          )}

          {/* Wallet connect button */}
          <ConnectButton />
        </div>
      </div>
    </div>
  );
}
