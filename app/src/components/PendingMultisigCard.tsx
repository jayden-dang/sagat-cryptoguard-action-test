import { formatAddress } from "../lib/formatters";

interface PendingMultisigCardProps {
  address: string;
  name?: string | null;
  threshold: number;
  totalMembers: number;
}

export function PendingMultisigCard({ address, name, threshold, totalMembers }: PendingMultisigCardProps) {
  return (
    <div className="bg-white border rounded-lg p-4 flex items-center justify-between">
      <div>
        <h3 className="font-medium">
          {name || "Unnamed Multisig"}
        </h3>
        <p className="text-sm text-gray-500">
          {threshold}/{totalMembers} threshold • {formatAddress(address)}
        </p>
      </div>
      <div className="flex items-center gap-2 text-sm text-orange-600">
        <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
        Creating...
      </div>
    </div>
  );
}