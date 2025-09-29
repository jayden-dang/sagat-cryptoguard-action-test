import React, { createContext, useContext, useState, useEffect } from "react";

export type SuiNetwork = "testnet" | "mainnet";

interface NetworkContextType {
  network: SuiNetwork;
  setNetwork: (network: SuiNetwork) => void;
  isTestMode: boolean;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  // Network state - default to testnet (test mode)
  const [network, setNetwork] = useState<SuiNetwork>(() => {
    const stored = localStorage.getItem("suiNetwork");
    return (stored as SuiNetwork) || "testnet";
  });

  // Handle network changes
  const handleSetNetwork = (newNetwork: SuiNetwork) => {
    setNetwork(newNetwork);
    localStorage.setItem("suiNetwork", newNetwork);

    // Force a page reload to switch the SuiClientProvider network
    // This is needed because SuiClientProvider doesn't support dynamic network switching
    window.location.reload();
  };

  const value: NetworkContextType = {
    network,
    setNetwork: handleSetNetwork,
    isTestMode: network === "testnet",
  };

  return (
    <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>
  );
}

export function useNetwork() {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error("useNetwork must be used within NetworkProvider");
  }
  return context;
}