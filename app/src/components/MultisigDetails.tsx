import { useState } from "react";
import { Users, Eye, Copy, Check } from "lucide-react";
import { Button } from "./ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from './ui/sheet';
import { apiClient } from "../lib/api";
import { MembersList } from "./invitations/MembersList";
import { formatAddress } from "../lib/formatters";
import { useCopyToClipboard } from "../hooks/useCopyToClipboard";

interface SimplifiedMultisig {
  address: string;
  name: string | null;
  threshold: number;
  totalMembers: number;
  isAccepted: boolean;
  isVerified: boolean;
  pendingProposals: number;
}

interface MultisigDetailsProps {
  multisig: SimplifiedMultisig;
}

export function MultisigDetails({ multisig }: MultisigDetailsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [multisigDetails, setMultisigDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { copied, copy } = useCopyToClipboard();

  const handleOpen = async () => {
    setIsOpen(true);

    // Fetch multisig details if we don't have them yet
    if (!multisigDetails && !isLoading) {
      setIsLoading(true);
      try {
        const details = await apiClient.getMultisig(multisig.address);
        setMultisigDetails(details);
      } catch (error) {
        console.warn(`Failed to fetch details for ${multisig.address}:`, error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleOpen}
        className="text-blue-600 hover:text-blue-700 hover:border-blue-200"
      >
        <Eye className="w-4 h-4 mr-1" />
        View Details
      </Button>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent className="!w-full sm:!w-[600px] !max-w-none px-4 sm:px-6">
          <SheetHeader>
            <SheetTitle>{multisig.name || 'Unnamed Multisig'}</SheetTitle>
            <SheetDescription>
              <div className="flex items-center gap-2 flex-wrap">
                <span>{formatAddress(multisig.address)}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copy(multisig.address)}
                  className="h-6 px-2 text-xs"
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </Button>
                <span>• {multisig.threshold}/{multisig.totalMembers} threshold</span>
              </div>
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Multisig Info */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                <Users className="w-4 h-4 mr-2" />
                Members ({multisig.totalMembers})
              </h3>
              <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full">
                  {multisig.threshold}/{multisig.totalMembers} signature threshold
                </span>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
                  {multisig.isVerified ? 'Verified' : 'Pending'}
                </span>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-sm text-gray-500">Loading member details...</div>
                </div>
              ) : multisigDetails ? (
                <MembersList members={multisigDetails.members} />
              ) : (
                <div className="text-sm text-gray-500 text-center py-8">
                  Failed to load member details
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}