import { useCurrentAccount } from '@mysten/dapp-kit';
import { useApiAuth } from '../contexts/ApiAuthContext';
import { Button } from './ui/button';
import { Shield, ArrowRight } from 'lucide-react';

export function AuthPrompt() {
  const currentAccount = useCurrentAccount();
  const { signAndConnect, isConnecting } = useApiAuth();

  const formatAddress = (address: string) =>
    `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <div className="mx-auto mt-20 p-8">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-6">
          <Shield className="w-10 h-10 text-blue-600" />
        </div>

        <h1 className="text-3xl font-bold mb-3">
          Authenticate Your Wallet
        </h1>

        <p className="text-gray-600 mb-8">
          Sign a message to securely connect your wallet to Sagat
        </p>

        <div className="bg-gray-50 rounded-lg p-4 mb-8">
          <p className="text-sm text-gray-500 mb-1">Connected Wallet</p>
          <p className="font-mono font-medium">
            {currentAccount ? formatAddress(currentAccount.address) : ''}
          </p>
        </div>

        <Button
          onClick={signAndConnect}
          disabled={isConnecting}
          size="lg"
          className="w-full"
        >
          {isConnecting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Signing message...
            </>
          ) : (
            <>
              Sign Message to Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>

        <p className="text-xs text-gray-500 mt-4">
          This creates a secure session between your wallet and our service.
          No transactions will be sent.
        </p>
      </div>
    </div>
  );
}
