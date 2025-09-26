import { ValidationError } from '../errors';
import { parsePublicKey } from '../utils/pubKey';

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
