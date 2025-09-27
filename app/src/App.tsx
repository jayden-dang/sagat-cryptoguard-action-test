import { ConnectButton } from "@mysten/dapp-kit";
import { WalletStatus } from "./WalletStatus";

function App() {
  return (
    <>
      <ConnectButton />
      <WalletStatus />
    </>
  );
}

export default App;
