import { useState } from "react";
import { Users, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "../ui/button";
import { CopyButton } from "../ui/CopyButton";
import { useAcceptInvitation } from "../../hooks/useAcceptInvitation";
import { apiClient } from "../../lib/api";
import { InvitationDetails } from "./InvitationDetails";
import { SimplifiedMultisig } from "../../types/multisig";
import { formatAddress } from "../../lib/formatters";

interface InvitationCardProps {
  multisig: SimplifiedMultisig;
}

export function InvitationCard({ multisig }: InvitationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [multisigDetails, setMultisigDetails] = useState<any>(null);
  const [processingInvite, setProcessingInvite] = useState(false);
  const acceptInvitation = useAcceptInvitation();

  const toggleExpanded = async () => {
    if (isExpanded) {
      setIsExpanded(false);
    } else {
      setIsExpanded(true);

      // Fetch multisig details if we don't have them yet
      if (!multisigDetails) {
        try {
          const details = await apiClient.getMultisig(multisig.address);
          setMultisigDetails(details);
        } catch (error) {
          console.warn(`Failed to fetch details for ${multisig.address}:`, error);
        }
      }
    }
  };

  const handleAccept = () => {
    setProcessingInvite(true);
    acceptInvitation.mutate(multisig.address, {
      onSettled: () => setProcessingInvite(false)
    });
  };

  const handleReject = () => {
    // TODO: Implement reject functionality
    console.log('Reject invitation for:', multisig.address);
  };

  return (
    <div className="bg-white border rounded-lg hover:shadow-sm transition-shadow">
      {/* Main invitation row */}
      <div className="flex items-center justify-between p-4">
        {/* Left side - Multisig info */}
        <div className="flex items-center space-x-4 flex-1">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-gray-900">
              {multisig.name || 'Unnamed Multisig'}
            </h3>
            <div className="flex items-center gap-1">
              <p className="text-sm text-gray-500">
                {formatAddress(multisig.address)}
              </p>
              <CopyButton value={multisig.address} size="xs" />
            </div>
            <p className="text-xs text-gray-400">
              {multisigDetails ?
                `${multisigDetails.members.filter((m: any) => m.isAccepted).length} out of ${multisigDetails.members.length} members accepted` :
                `${multisig.totalMembers} members total`
              }
            </p>
          </div>
        </div>

        {/* Right side - More info button */}
        <div className="flex items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleExpanded}
            className="text-blue-600 hover:text-blue-700 hover:border-blue-200"
          >
            {isExpanded ? (
              <>
                <ChevronDown className="w-4 h-4 mr-1" />
                Hide Details
              </>
            ) : (
              <>
                <ChevronRight className="w-4 h-4 mr-1" />
                More Information
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Expandable member details */}
      {isExpanded && (
        <InvitationDetails
          multisig={multisig}
          details={multisigDetails}
          onAccept={handleAccept}
          onReject={handleReject}
          isProcessing={processingInvite}
        />
      )}
    </div>
  );
}