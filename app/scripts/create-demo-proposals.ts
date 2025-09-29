import { Transaction } from "@mysten/sui/transactions";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { toBase64 } from "@mysten/sui/utils";

const client = new SuiClient({ url: getFullnodeUrl("testnet") });
const MULTISIG_ADDRESS =
  "0x1c86208f6a05baf38ea8caaaf712e5888da59a1a0d918515cd4a60cfd463096b";

const buildSimpleTx = async () => {
  const tx = new Transaction();

  tx.setSender(MULTISIG_ADDRESS);

  const coin = tx.splitCoins(tx.gas, [100000]);
  tx.transferObjects([coin], "0x1");

  const built = await tx.build({ client });

  console.log(toBase64(built));
};


buildSimpleTx();
