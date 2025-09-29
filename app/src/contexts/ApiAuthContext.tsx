import React, { createContext, useContext, useEffect } from "react";
import { useCurrentAccount, useSignPersonalMessage } from "@mysten/dapp-kit";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/api";
import { AuthCheckResponse } from "../lib/types";
import {
  getExpiryTime,
  createAuthMessage,
  extractPublicKey,
} from "../lib/wallet";
import { toast } from "sonner";
import { QueryKeys } from "../lib/queryKeys";

interface ApiAuthContextType {
  // Auth state from API
  isAuthenticated: boolean;
  authenticatedAddresses: string[];
  isCheckingAuth: boolean;

  // Current wallet account state
  currentAddress: string | null;
  isCurrentAddressAuthenticated: boolean;

  // Actions
  signAndConnect: () => Promise<void>;
  disconnect: () => Promise<void>;
  isConnecting: boolean;
  isDisconnecting: boolean;
}

const ApiAuthContext = createContext<ApiAuthContextType | undefined>(undefined);

const AUTH_QUERY_KEY = ["auth", "check"] as const;

export function ApiAuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  // Get current account from dApp Kit
  const currentAccount = useCurrentAccount();
  const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();

  // Check auth status with API whenever wallet changes
  const {
    data: authData,
    isLoading: isCheckingAuth,
    refetch: refetchAuth,
  } = useQuery<AuthCheckResponse>({
    queryKey: [...AUTH_QUERY_KEY, currentAccount?.address],
    queryFn: () => apiClient.checkAuth(),
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
    // Always check when account changes
    enabled: true,
  });

  // Re-check auth when wallet account changes
  useEffect(() => {
    refetchAuth();
  }, [currentAccount?.address, refetchAuth]);

  // Connect mutation - signs message and sends to API
  const connectMutation = useMutation({
    mutationFn: async () => {
      if (!currentAccount) {
        throw new Error("No wallet connected");
      }

      const expiry = getExpiryTime();
      const message = createAuthMessage(expiry);

      // Sign with current account
      const signResult = await signPersonalMessage({
        message: new TextEncoder().encode(message),
        account: currentAccount,
      });

      const pubKey = extractPublicKey(
        new Uint8Array(currentAccount.publicKey),
        currentAccount.address,
      );

      // Send to API
      return apiClient.connect({
        publicKey: pubKey.toBase64(),
        signature: signResult.signature,
        expiry,
      });
    },
    onSuccess: async () => {
      await refetchAuth();
      await queryClient.invalidateQueries({ queryKey: [QueryKeys.Multisigs] });
      await queryClient.invalidateQueries({ queryKey: [QueryKeys.Proposals] });
      toast.success("Successfully authenticated");
    },
    onError: (error: Error) => {
      toast.error(`Authentication failed: ${error.message}`);
    },
  });

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: () => apiClient.disconnect(),
    onSuccess: async () => {
      queryClient.clear();
      await refetchAuth();
      toast.success("Disconnected");
    },
    onError: (error: Error) => {
      toast.error(`Disconnect failed: ${error.message}`);
    },
  });

  const currentAddress = currentAccount?.address || null;
  const isCurrentAddressAuthenticated =
    !!currentAddress &&
    (authData?.addresses?.includes(currentAddress) ?? false);

  const value: ApiAuthContextType = {
    // Auth state
    isAuthenticated: authData?.authenticated ?? false,
    authenticatedAddresses: authData?.addresses ?? [],
    isCheckingAuth,

    // Current wallet
    currentAddress,
    isCurrentAddressAuthenticated,

    // Actions
    signAndConnect: async () => {
      await connectMutation.mutateAsync();
    },
    disconnect: async () => {
      await disconnectMutation.mutateAsync();
    },
    isConnecting: connectMutation.isPending,
    isDisconnecting: disconnectMutation.isPending,
  };

  return (
    <ApiAuthContext.Provider value={value}>{children}</ApiAuthContext.Provider>
  );
}

export function useApiAuth() {
  const context = useContext(ApiAuthContext);
  if (!context) {
    throw new Error("useApiAuth must be used within ApiAuthProvider");
  }
  return context;
}
