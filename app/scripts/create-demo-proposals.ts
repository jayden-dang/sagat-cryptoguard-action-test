import { Transaction } from "@mysten/sui/transactions";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { toBase64 } from "@mysten/sui/utils";

const client = new SuiClient({ url: getFullnodeUrl("testnet") });
const MULTISIG_ADDRESS =
  "0x5102c1e04def18e8f673b05be04db3247ec2f18698099cdce6212e1af0aa375e";

const buildSimpleTx = async () => {
  const tx = new Transaction();

  tx.setSender(MULTISIG_ADDRESS);

  const coin = tx.splitCoins(tx.gas, [100000000]);
  tx.transferObjects([coin], "0x1");

  const built = await tx.build({ client });

  console.log(toBase64(built));
};


buildSimpleTx();
