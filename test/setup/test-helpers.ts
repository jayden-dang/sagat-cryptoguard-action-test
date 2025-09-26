import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SchemaAddresses } from '../../src/db/schema';

export function generateKeypair() {
  const keypair = new Ed25519Keypair();
  return {
    keypair,
    address: keypair.getPublicKey().toSuiAddress(),
    publicKey: keypair.getPublicKey().toBase64(),
  };
}

export async function seedAddresses(db: any, count: number) {
  const keypairs = Array.from({ length: count }, generateKeypair);
  await db.insert(SchemaAddresses).values(
    keypairs.map(kp => ({
      address: kp.address,
      publicKey: kp.publicKey,
    }))
  );
  return keypairs;
}

export async function signMessage(keypair: Ed25519Keypair, message: string) {
  const bytes = new TextEncoder().encode(message);
  const { signature } = await keypair.signPersonalMessage(bytes);
  return signature;
}