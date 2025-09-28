import { Users, Check, X } from "lucide-react";
import { Button } from "../ui/button";
import { MembersList } from "./MembersList";
import { SimplifiedMultisig } from "../../types/multisig";

interface InvitationDetailsProps {
  multisig: SimplifiedMultisig;
  details: any;
  onAccept: () => void;
  onReject: () => void;
  isProcessing: boolean;
}

export function InvitationDetails({
  multisig,
  details,
  onAccept,
  onReject,
  isProcessing
}: InvitationDetailsProps) {
  return (
    <div className="border-t bg-gray-50 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-gray-900 flex items-center">
          <Users className="w-4 h-4 mr-2" />
          Members ({multisig.totalMembers})
        </h4>
        {details && (
          <p className="text-sm text-gray-600">
            {details.members.filter((m: any) => m.isAccepted).length} of {details.members.length} accepted
          </p>
        )}
      </div>

      {details ? (
        <div className="space-y-2">
          <MembersList members={details.members} />

          <div className="text-xs text-gray-500 mt-2">
            Full address: <span className="font-mono">{multisig.address}</span>
          </div>

          {/* Actions inside expanded section */}
          <div className="flex items-center justify-end space-x-2 mt-4 pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={onReject}
              disabled={isProcessing}
              className="text-red-600 hover:text-red-700 hover:border-red-200"
            >
              <X className="w-4 h-4 mr-1" />
              Reject Invitation
            </Button>
            <Button
              size="sm"
              onClick={onAccept}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2" />
                  Accepting...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-1" />
                  Accept Invitation
                </>
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-sm text-gray-500">
          <div className="animate-pulse">Loading member details...</div>
        </div>
      )}
    </div>
  );
}