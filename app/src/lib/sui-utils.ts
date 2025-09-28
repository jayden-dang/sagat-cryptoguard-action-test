import { PublicKey } from '@mysten/sui/cryptography';
import { Ed25519PublicKey } from '@mysten/sui/keypairs/ed25519';
import { Secp256k1PublicKey } from '@mysten/sui/keypairs/secp256k1';
import { Secp256r1PublicKey } from '@mysten/sui/keypairs/secp256r1';
import { MultiSigPublicKey } from '@mysten/sui/multisig';

/**
 * Validates and parses a public key string
 */
export function validatePublicKey(publicKeyString: string): {
  isValid: boolean;
  address?: string;
  error?: string;
} {
  try {
    // Try to parse as different key types
    let pubKey: PublicKey | null = null;

    // Try Ed25519 (most common)
    try {
      pubKey = new Ed25519PublicKey(publicKeyString);
    } catch {
      // Try Secp256k1
      try {
        pubKey = new Secp256k1PublicKey(publicKeyString);
      } catch {
        // Try Secp256r1
        try {
          pubKey = new Secp256r1PublicKey(publicKeyString);
        } catch {
          return {
            isValid: false,
            error: 'Invalid public key format'
          };
        }
      }
    }

    if (pubKey) {
      return {
        isValid: true,
        address: pubKey.toSuiAddress()
      };
    }

    return {
      isValid: false,
      error: 'Failed to parse public key'
    };
  } catch (error) {
    return {
      isValid: false,
      error: 'Invalid public key'
    };
  }
}

/**
 * Computes the multisig address from public keys and threshold
 */
export function computeMultisigAddress(
  publicKeys: string[],
  weights: number[],
  threshold: number
): { address: string | null; error: string | null } {
  try {
    if (publicKeys.length === 0) {
      return { address: null, error: 'No public keys provided' };
    }

    // Filter out empty public keys
    const validKeys = publicKeys.filter(Boolean);
    if (validKeys.length !== publicKeys.length) {
      return { address: null, error: 'Some public keys are empty' };
    }

    // Convert public key strings to PublicKey objects
    const pubKeys = validKeys.map(keyStr => {
      const validation = validatePublicKey(keyStr);
      if (!validation.isValid) {
        throw new Error(`Invalid public key: ${validation.error}`);
      }

      // Re-parse to get the actual PublicKey object
      let pubKey: PublicKey;
      try {
        pubKey = new Ed25519PublicKey(keyStr);
      } catch {
        try {
          pubKey = new Secp256k1PublicKey(keyStr);
        } catch {
          pubKey = new Secp256r1PublicKey(keyStr);
        }
      }
      return pubKey;
    });

    // Create multisig public key
    const multisig = MultiSigPublicKey.fromPublicKeys({
      threshold,
      publicKeys: pubKeys.map((key, index) => ({
        publicKey: key,
        weight: weights[index],
      })),
    });

    return { address: multisig.toSuiAddress(), error: null };
  } catch (error) {
    console.error('Error computing multisig address:', error);
    return {
      address: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
