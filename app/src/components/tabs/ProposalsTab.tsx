import { useState, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FileText, Plus } from "lucide-react";
import { Button } from "../ui/button";
import { SimplifiedMultisig } from "../../types/multisig";
import { apiClient } from "../../lib/api";
import { ProposalWithSignatures, ProposalStatus } from "../../lib/types";
import { useNetwork } from "../../contexts/NetworkContext";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { extractPublicKey } from "@/lib/wallet";
import { ProposalCard } from "../proposals/ProposalCard";
import { calculateCurrentWeight, getTotalWeight } from "../../lib/proposalUtils";
import { QueryKeys } from "../../lib/queryKeys";

interface ProposalsTabContext {
  multisig: SimplifiedMultisig;
  openProposalSheet: () => void;
}

export function ProposalsTab() {
  const { multisig, openProposalSheet } =
    useOutletContext<ProposalsTabContext>();
  const { network } = useNetwork();
  const currentAccount = useCurrentAccount();
  const [activeFilter, setActiveFilter] = useState<
    "all" | "pending" | "waiting" | "ready" | "executed"
  >("all");

  // Get API query type based on active tab - simplified to 3 types
  const getApiQueryType = () => {
    switch (activeFilter) {
      case "executed":
        return "executed";
      case "pending":
      case "waiting":
      case "ready":
        return "pending";
      default:
        return "all";
    }
  };

  const apiQueryType = getApiQueryType();

  // Get API filter params based on query type
  const getQueryParams = () => {
    const baseParams = {
      multisigAddress: multisig.address,
      network: network,
    };

    switch (apiQueryType) {
      case "executed":
        return { ...baseParams, status: ProposalStatus.SUCCESS };
      case "pending":
        return { ...baseParams, status: ProposalStatus.PENDING };
      default:
        return baseParams; // All proposals
    }
  };

  // Query to get full multisig details (including members with weights)
  const { data: multisigDetails } = useQuery({
    queryKey: [QueryKeys.Multisig, multisig.address],
    queryFn: () => apiClient.getMultisig(multisig.address),
    enabled: !!multisig.address,
    staleTime: Infinity, // Cache forever since multisig details are immutable
    gcTime: Infinity, // Keep in cache forever
  });

  // Always fetch pending proposals for pending tabs (cached)
  const { data: pendingProposals = [] } = useQuery({
    queryKey: [QueryKeys.Proposals, QueryKeys.Pending, multisig.address, network],
    queryFn: () =>
      apiClient.getProposals({
        multisigAddress: multisig.address,
        network: network,
        status: ProposalStatus.PENDING,
      }),
    enabled: !!multisig.address && !!network,
    refetchInterval: 30000,
  });

  // Main data query - uses the cached data based on active filter
  const {
    data: proposals = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: [QueryKeys.Proposals, apiQueryType, multisig.address, network],
    queryFn: () => {
      const params = getQueryParams();
      console.log(
        "Query params for",
        apiQueryType,
        "(activeFilter:",
        activeFilter,
        "):",
        params,
      );
      return apiClient.getProposals(params);
    },
    enabled: !!multisig.address && !!network,
    refetchInterval: 30000,
  });


  // Helper to check if current user has signed a proposal
  const userHasSignedProposal = (proposal: ProposalWithSignatures) => {
    if (!currentAccount?.publicKey) return false;
    try {
      const userPublicKey = extractPublicKey(
        new Uint8Array(currentAccount.publicKey),
        currentAccount.address,
      ).toBase64();

      return proposal.signatures.some((sig) => sig.publicKey === userPublicKey);
    } catch (error) {
      console.error("Error checking user signature:", error);
      return false;
    }
  };

  // Memoized filtered proposals based on current tab
  const filteredProposals = useMemo(() => {
    switch (activeFilter) {
      case "pending":
        return proposals.filter((p) => {
          const hasUserSigned = userHasSignedProposal(p);
          const currentWeight = calculateCurrentWeight(p, multisigDetails);
          const totalWeight = getTotalWeight(multisigDetails);
          const needsMoreSigs = currentWeight < totalWeight;
          return !hasUserSigned && needsMoreSigs;
        });

      case "waiting":
        return proposals.filter((p) => {
          const hasUserSigned = userHasSignedProposal(p);
          const currentWeight = calculateCurrentWeight(p, multisigDetails);
          const totalWeight = getTotalWeight(multisigDetails);
          const needsMoreSigs = currentWeight < totalWeight;
          return hasUserSigned && needsMoreSigs;
        });

      case "ready":
        return proposals.filter((p) => {
          const currentWeight = calculateCurrentWeight(p, multisigDetails);
          const totalWeight = getTotalWeight(multisigDetails);
          return currentWeight >= totalWeight;
        });

      case "executed":
        return proposals;

      default:
        return proposals;
    }
  }, [proposals, activeFilter, currentAccount?.publicKey]);

  // Calculate counts only for pending state tabs
  const pendingTabCounts = useMemo(() => {
    if (!multisigDetails?.members || !pendingProposals.length) {
      return { pending: 0, waiting: 0, ready: 0 };
    }

    const pendingCount = pendingProposals.filter((p) => {
      const hasUserSigned = userHasSignedProposal(p);
      const currentWeight = calculateCurrentWeight(p, multisigDetails);
      const totalWeight = getTotalWeight(multisigDetails);
      const needsMoreSigs = currentWeight < totalWeight;
      return !hasUserSigned && needsMoreSigs;
    }).length;

    const waitingCount = pendingProposals.filter((p) => {
      const hasUserSigned = userHasSignedProposal(p);
      const currentWeight = calculateCurrentWeight(p, multisigDetails);
      const totalWeight = getTotalWeight(multisigDetails);
      const needsMoreSigs = currentWeight < totalWeight;
      return hasUserSigned && needsMoreSigs;
    }).length;

    const readyCount = pendingProposals.filter((p) => {
      const currentWeight = calculateCurrentWeight(p, multisigDetails);
      const totalWeight = getTotalWeight(multisigDetails);
      return currentWeight >= totalWeight;
    }).length;

    return { pending: pendingCount, waiting: waitingCount, ready: readyCount };
  }, [pendingProposals, multisigDetails?.members, currentAccount?.publicKey]);

  const filters = [
    { id: "all" as const, label: "All Proposals", count: undefined },
    {
      id: "pending" as const,
      label: "Need Your Signature",
      count: pendingTabCounts.pending,
      color: "text-orange-600",
    },
    {
      id: "waiting" as const,
      label: "Waiting for Others",
      count: pendingTabCounts.waiting,
      color: "text-blue-600",
    },
    {
      id: "ready" as const,
      label: "Ready to Execute",
      count: pendingTabCounts.ready,
      color: "text-green-600",
    },
    { id: "executed" as const, label: "Executed", count: undefined },
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
                    ? "text-blue-600 bg-blue-50 border border-blue-200 rounded-lg"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg"
                }`}
              >
                {filter.label}
                {filter.count !== undefined && filter.count > 0 && (
                  <span
                    className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                      filter.color?.includes("orange")
                        ? "bg-orange-100 text-orange-600"
                        : filter.color?.includes("green")
                          ? "bg-green-100 text-green-600"
                          : filter.color?.includes("blue")
                            ? "bg-blue-100 text-blue-600"
                            : "bg-gray-100 text-gray-600"
                    }`}
                  >
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
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-500">Loading proposals...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12 bg-red-50 rounded-lg">
            <p className="text-red-600 mb-4">Failed to load proposals</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        ) : filteredProposals.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {activeFilter === "all"
                ? "No Proposals Yet"
                : `No ${filters.find((f) => f.id === activeFilter)?.label}`}
            </h3>
            <p className="text-gray-500 mb-4">
              {activeFilter === "all"
                ? "Create your first proposal to get started with this multisig."
                : "No proposals match the selected filter."}
            </p>
            {activeFilter === "all" && (
              <Button onClick={openProposalSheet}>
                <Plus className="w-4 h-4 mr-2" />
                Create Proposal
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredProposals.map((proposal) => (
              <ProposalCard key={proposal.id} proposal={proposal} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
