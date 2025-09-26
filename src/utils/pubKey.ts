import { PublicKey } from '@mysten/sui/cryptography';
import { Ed25519PublicKey } from '@mysten/sui/keypairs/ed25519';
import { Secp256k1PublicKey } from '@mysten/sui/keypairs/secp256k1';
import { Secp256r1PublicKey } from '@mysten/sui/keypairs/secp256r1';

const tryEd25519 = (publicKey: string) => {
  try {
    return new Ed25519PublicKey(publicKey);
  } catch (error) {
    return null;
  }
};

const trySecp256k1 = (publicKey: string) => {
  try {
    return new Secp256k1PublicKey(publicKey);
  } catch (error) {
    return null;
  }
};

const trySecp256r1 = (publicKey: string) => {
  try {
    return new Secp256r1PublicKey(publicKey);
  } catch (error) {
    return null;
  }
};

export const parsePublicKey = (publicKey: string): PublicKey => {
  try {
    return new Ed25519PublicKey(publicKey);
  } catch (error) {}
  try {
    return new Secp256k1PublicKey(publicKey);
  } catch (error) {}
  try {
    return new Secp256r1PublicKey(publicKey);
  } catch (error) {}

  throw new Error('Invalid public key');
};
