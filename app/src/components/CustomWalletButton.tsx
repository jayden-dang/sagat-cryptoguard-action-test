import { useState, useEffect, useRef } from "react";
import { useCurrentAccount, useConnectWallet, useDisconnectWallet, useWallets, useSwitchAccount, useAccounts } from "@mysten/dapp-kit";
import { useApiAuth } from "../contexts/ApiAuthContext";
import { Button } from "./ui/button";
import { Wallet, ChevronDown, LogOut, Copy, Check, Shield, ArrowRight } from "lucide-react";

type WalletVariant = "header" | "sidebar";

interface CustomWalletButtonProps {
  variant?: WalletVariant;
  disableAccountSwitching?: boolean;
}

export function CustomWalletButton({ variant = "header", disableAccountSwitching = false }: CustomWalletButtonProps) {
  const currentAccount = useCurrentAccount();
  const accounts = useAccounts();
  const { mutate: connect } = useConnectWallet();
  const { mutate: disconnect } = useDisconnectWallet();
  const { mutate: switchAccount } = useSwitchAccount();
  const wallets = useWallets();
  const { isCurrentAddressAuthenticated, signAndConnect, isConnecting, disconnect: apiDisconnect } = useApiAuth();
  const [showWallets, setShowWallets] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowWallets(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const formatAddress = (address: string) =>
    `${address.slice(0, 6)}...${address.slice(-4)}`;

  const handleCopyAddress = async () => {
    if (currentAccount?.address) {
      await navigator.clipboard.writeText(currentAccount.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleWalletConnect = (walletName: string) => {
    connect(
      { wallet: wallets.find((w) => w.name === walletName)! },
      {
        onSuccess: () => setShowWallets(false),
        onError: (error) => console.error("Connection failed:", error),
      }
    );
  };

  const handleFullDisconnect = async () => {
    try {
      // First disconnect from our API (clears JWT and auth state)
      await apiDisconnect();

      // Then disconnect the wallet
      disconnect();

      setShowWallets(false);
    } catch (error) {
      console.error("Full disconnect failed:", error);
      // Still try to disconnect wallet even if API disconnect fails
      disconnect();
      setShowWallets(false);
    }
  };

  // No wallet connected
  if (!currentAccount) {
    if (variant === "sidebar") {
      return (
        <div className="mt-8 p-4 bg-white rounded-lg border border-slate-200">
          <div className="text-center">
            <Wallet className="w-6 h-6 text-slate-600 mx-auto mb-3" />
            <h3 className="font-medium text-slate-900 mb-2">Connect Wallet</h3>
            <p className="text-sm text-slate-600 mb-4">
              Connect your wallet to create a multisig
            </p>

            <div className="relative">
              <Button
                onClick={() => setShowWallets(!showWallets)}
                size="sm"
                className="w-full"
              >
                <Wallet className="w-4 h-4 mr-2" />
                Choose Wallet
              </Button>

              {showWallets && (
                <div className="absolute top-full mt-2 left-0 right-0 bg-white border rounded-lg shadow-lg py-2 z-50">
                  {wallets.map((wallet) => (
                    <button
                      key={wallet.name}
                      onClick={() => handleWalletConnect(wallet.name)}
                      className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-gray-50 w-full text-left"
                    >
                      <img
                        src={wallet.icon}
                        alt={wallet.name}
                        className="w-5 h-5 rounded"
                      />
                      {wallet.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Header variant
    return (
      <div className="relative" ref={dropdownRef}>
        <Button
          variant="default"
          size="sm"
          onClick={() => setShowWallets(!showWallets)}
          className="flex items-center gap-2"
        >
          <Wallet className="w-4 h-4" />
          Connect Wallet
          <ChevronDown className="w-3 h-3" />
        </Button>

        {showWallets && (
          <div className="absolute top-full mt-1 right-0 bg-white border rounded-lg shadow-lg py-2 min-w-48 z-50">
            <div className="px-3 py-2 border-b">
              <p className="text-sm font-medium">Choose Wallet</p>
            </div>
            {wallets.map((wallet) => (
              <button
                key={wallet.name}
                onClick={() => handleWalletConnect(wallet.name)}
                className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-gray-50 w-full text-left"
              >
                <img
                  src={wallet.icon}
                  alt={wallet.name}
                  className="w-5 h-5 rounded"
                />
                {wallet.name}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Wallet connected but not authenticated
  if (!isCurrentAddressAuthenticated) {
    if (variant === "sidebar") {
      return (
        <div className="mt-8 p-4 bg-white rounded-lg border border-slate-200">
          <div className="text-center">
            <Shield className="w-6 h-6 text-blue-600 mx-auto mb-3" />
            <h3 className="font-medium text-slate-900 mb-2">Authenticate Wallet</h3>
            <p className="text-sm text-slate-600 mb-3">
              {formatAddress(currentAccount.address)}
            </p>
            <Button
              onClick={signAndConnect}
              disabled={isConnecting}
              size="sm"
              className="w-full mb-2"
            >
              {isConnecting ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2" />
                  Signing...
                </>
              ) : (
                <>
                  Sign Message
                  <ArrowRight className="ml-2 h-3 w-3" />
                </>
              )}
            </Button>
            <Button
              onClick={handleFullDisconnect}
              variant="ghost"
              size="sm"
              className="w-full text-xs text-slate-500 hover:text-red-600"
            >
              <LogOut className="w-3 h-3 mr-1" />
              Disconnect
            </Button>
          </div>
        </div>
      );
    }

    // For header variant, still show the dropdown but with auth prompt
    return (
      <div className="relative" ref={dropdownRef}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowWallets(!showWallets)}
          className="flex items-center gap-2"
        >
          <Shield className="w-3 h-3 text-blue-600" />
          {formatAddress(currentAccount.address)}
          <ChevronDown className="w-3 h-3" />
        </Button>

        {showWallets && (
          <div className="absolute top-full mt-1 right-0 bg-white border rounded-lg shadow-lg py-2 min-w-64 z-50">
            <div className="px-3 py-2 border-b text-center">
              <p className="text-sm font-medium text-blue-700">Authentication Required</p>
            </div>
            <div className="px-3 py-2">
              <Button
                onClick={signAndConnect}
                disabled={isConnecting}
                size="sm"
                className="w-full mb-2"
              >
                {isConnecting ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2" />
                    Signing...
                  </>
                ) : (
                  <>
                    Sign Message
                    <ArrowRight className="ml-2 h-3 w-3" />
                  </>
                )}
              </Button>
            </div>
            <button
              onClick={handleFullDisconnect}
              className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 w-full text-left text-red-600"
            >
              <LogOut className="w-4 h-4" />
              Disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  // Wallet connected and authenticated
  if (variant === "sidebar") {
    return (
      <div className="mt-8 p-4 bg-white rounded-lg border border-slate-200">
        <div className="text-center">
          <div className="w-6 h-6 bg-green-100 rounded-full mx-auto mb-3 flex items-center justify-center">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          </div>
          <h3 className="font-medium text-slate-900 mb-2">Wallet Connected</h3>
          <p className="text-sm text-slate-600 mb-3">
            {formatAddress(currentAccount.address)}
          </p>
          {!disableAccountSwitching && accounts.length > 1 && (
            <div className="mb-3">
              <p className="text-xs text-slate-500 mb-2">Switch Account</p>
              <div className="max-h-24 overflow-y-auto space-y-1">
                {accounts.filter(acc => acc.address !== currentAccount.address).map((account) => (
                  <button
                    key={account.address}
                    onClick={() => switchAccount({ account })}
                    className="w-full text-left p-2 text-xs bg-slate-50 hover:bg-slate-100 rounded border"
                  >
                    <p className="font-mono truncate">
                      {formatAddress(account.address)}
                    </p>
                    {account.label && (
                      <p className="text-slate-400 truncate mt-1">
                        {account.label}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <Button
              onClick={handleCopyAddress}
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
            >
              {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
              {copied ? "Copied!" : "Copy"}
            </Button>
            <Button
              onClick={handleFullDisconnect}
              variant="outline"
              size="sm"
              className="flex-1 text-xs hover:text-red-600 hover:border-red-200"
            >
              <LogOut className="w-3 h-3 mr-1" />
              Disconnect
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Header variant - authenticated
  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowWallets(!showWallets)}
        className="flex items-center gap-2"
      >
        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        {formatAddress(currentAccount.address)}
        <ChevronDown className="w-3 h-3" />
      </Button>

      {showWallets && (
        <div className="absolute top-full mt-1 right-0 bg-white border rounded-lg shadow-lg py-2 min-w-64 z-50">
          {accounts.length > 1 && (
            <>
              <div className="px-3 py-2 border-b">
                <p className="text-sm font-medium">Switch Account</p>
              </div>
              {accounts.map((account) => (
                <button
                  key={account.address}
                  onClick={() => {
                    if (account.address !== currentAccount.address) {
                      switchAccount({ account });
                    }
                    setShowWallets(false);
                  }}
                  className={`flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 w-full text-left ${
                    account.address === currentAccount.address ? 'bg-blue-50 text-blue-700' : ''
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs truncate">
                      {formatAddress(account.address)}
                    </p>
                    {account.label && (
                      <p className="text-xs text-gray-500 mt-1 truncate">
                        {account.label}
                      </p>
                    )}
                  </div>
                  {account.address === currentAccount.address && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full ml-2"></div>
                  )}
                </button>
              ))}
              <div className="border-t my-1"></div>
            </>
          )}

          <button
            onClick={handleCopyAddress}
            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 w-full text-left"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied!" : "Copy Address"}
          </button>
          <button
            onClick={handleFullDisconnect}
            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 w-full text-left text-red-600"
          >
            <LogOut className="w-4 h-4" />
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}