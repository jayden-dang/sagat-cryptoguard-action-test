import { useCurrentAccount } from "@mysten/dapp-kit";
import { Button } from "./components/ui/button";
import { toast } from "sonner";

export function WalletStatus() {
  const account = useCurrentAccount();


  toast.success("Hello");

  return (
    <div className="my-2">
      <div className="mb-2">Wallet Status</div>

      <Button>Test</Button>
      {account ? (
        <div className="flex">
          <p>Wallet connected</p>
          <p>Address: {account.address}</p>
        </div>
      ) : (
        <div>Wallet not connected</div>
      )}
    </div>
  );
}
