import { PublicKey } from "@mysten/sui/cryptography";
import { Ed25519PublicKey } from "@mysten/sui/keypairs/ed25519";
import { Secp256k1PublicKey } from "@mysten/sui/keypairs/secp256k1";
import { Secp256r1PublicKey } from "@mysten/sui/keypairs/secp256r1";

// Format the expiry time for the signature message
export function getExpiryTime(): string {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + 30); // 30 minutes from now
  return expiry.toISOString();
}

// Create the auth message that needs to be signed
export function createAuthMessage(expiry: string): string {
  return `Verifying address ownership until: ${expiry}`;
}

export function extractPublicKeyFromBase64(publicKey: string): PublicKey {
  try {
    return new Ed25519PublicKey(publicKey);
  } catch (err) {}
  try {
    return new Secp256k1PublicKey(publicKey);
  } catch (err) {}
  try {
    return new Secp256r1PublicKey(publicKey);
  } catch (err) {}
  throw new Error("Invalid public key");
}

export function extractPublicKey(
  publicKey: Uint8Array,
  expectedAddress: string,
): PublicKey {
  try {
    const ed25519PubKey = new Ed25519PublicKey(
      new Uint8Array(publicKey).slice(1),
    );
    if (ed25519PubKey.toSuiAddress() !== expectedAddress) {
      throw new Error("Invalid public key");
    }
    return ed25519PubKey;
  } catch (error) {}

  try {
    const secp256k1PubKey = new Secp256k1PublicKey(new Uint8Array(publicKey));
    if (secp256k1PubKey.toSuiAddress() !== expectedAddress) {
      throw new Error("Invalid public key");
    }
    return secp256k1PubKey;
  } catch (error) {}

  try {
    const secp256r1PubKey = new Secp256r1PublicKey(new Uint8Array(publicKey));
    if (secp256r1PubKey.toSuiAddress() !== expectedAddress) {
      throw new Error("Invalid public key");
    }
    return secp256r1PubKey;
  } catch (error) {}

  throw new Error("Public key type is not supported.");
}
