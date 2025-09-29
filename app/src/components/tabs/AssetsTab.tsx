import { useOutletContext } from 'react-router-dom';
import { Coins, ExternalLink } from 'lucide-react';
import { Button } from '../ui/button';
import { useNetwork } from '../../contexts/NetworkContext';
import { SimplifiedMultisig } from '../../types/multisig';

interface AssetsTabContext {
  multisig: SimplifiedMultisig;
}

export function AssetsTab() {
  const { multisig } = useOutletContext<AssetsTabContext>();
  const { network } = useNetwork();

  const getExplorerUrl = (address: string) => {
    const baseUrl = network === "testnet"
      ? "https://suiscan.xyz/testnet"
      : "https://suiscan.xyz/mainnet";
    return `${baseUrl}/account/${address}`;
  };

  return (
    <div className="space-y-6">
      {/* Coming Soon Card */}
      <div className="bg-white border rounded-lg p-8 text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Coins className="w-8 h-8 text-blue-600" />
        </div>

        <h2 className="text-xl font-semibold mb-2">Asset Management</h2>
        <p className="text-gray-600 mb-6">
          Assets management is not supported. You can view this multisig's assets directly on the Sui explorer.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={() => window.open(getExplorerUrl(multisig.address), '_blank')}
            className="inline-flex items-center"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            View Assets on Explorer
          </Button>
        </div>
      </div>
    </div>
  );
}
