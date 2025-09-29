import { ValidationError } from '../errors';
import { parsePublicKey } from '../utils/pubKey';
import { db } from '../db';
import { SchemaAddresses } from '../db/schema';
import type { PublicKey } from '@mysten/sui/cryptography';

// Takes a pub key, a signature, and a message, and validates it.
// Returns the Sui address if valid, or null if not.
export const validatePersonalMessage = async (
  publicKey: string,
  signature: string,
  message: string,
) => {
  const pubKey = await parsePublicKey(publicKey);
  const isValid = await pubKey.verifyPersonalMessage(
    new TextEncoder().encode(message),
    signature,
  );

  if (!isValid) {
    throw new ValidationError('Invalid signature for message');
  }

  return pubKey;
};

/**
 * Registers a single public key in the addresses table
 */
export async function registerPublicKey(publicKey: PublicKey): Promise<void> {
  await db
    .insert(SchemaAddresses)
    .values({
      publicKey: publicKey.toBase64(),
      address: publicKey.toSuiAddress(),
    })
    .onConflictDoNothing();
}

/**
 * Registers multiple public keys in the addresses table
 */
export async function registerPublicKeys(
  publicKeys: PublicKey[],
): Promise<void> {
  if (publicKeys.length === 0) return;

  const addressData = publicKeys.map((pubKey) => ({
    publicKey: pubKey.toBase64(),
    address: pubKey.toSuiAddress(),
  }));

  await db.insert(SchemaAddresses).values(addressData).onConflictDoNothing();
}

/**
 * Registers public keys from base64 strings
 */
export async function registerPublicKeyStrings(
  publicKeyStrings: string[],
): Promise<void> {
  if (publicKeyStrings.length === 0) return;

  const publicKeys = publicKeyStrings.map((keyStr) => parsePublicKey(keyStr));
  await registerPublicKeys(publicKeys);
}
