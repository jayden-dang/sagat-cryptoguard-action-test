/**
 * Sui Network Test Utilities
 *
 * IMPORTANT: Before running tests, start a local Sui network:
 *
 * 1. Make sure Sui CLI is installed:
 *    cargo install --locked --git https://github.com/MystenLabs/sui.git --branch mainnet sui
 *
 * 2. Switch to localnet environment:
 *    sui client switch --env localnet
 *
 * 3. Start the local network with faucet:
 *    sui start --force-regenesis --with-faucet
 *
 * 4. Keep the network running in a separate terminal while running tests
 *
 * The tests assume a local Sui network is already running on:
 * - RPC: http://127.0.0.1:9000
 * - Faucet: http://127.0.0.1:9123
 */

import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { normalizeSuiAddress } from '@mysten/sui/utils';
import { getFaucetHost, requestSuiFromFaucetV2 } from '@mysten/sui/faucet';
import { Transaction } from '@mysten/sui/transactions';

/**
 * Get a Sui client for localnet
 */
export function getLocalClient(): SuiClient {
  return new SuiClient({ url: getFullnodeUrl('localnet') });
}

/**
 * Check if local network is running
 */
export async function isNetworkRunning(): Promise<boolean> {
  try {
    const client = getLocalClient();
    await client.getLatestCheckpointSequenceNumber();
    return true;
  } catch {
    return false;
  }
}

/**
 * Fund an address using the SDK faucet client
 * Assumes local faucet is running on default port 9123
 */
export async function fundAddress(address: string): Promise<boolean> {
  try {
    const normalizedAddress = normalizeSuiAddress(address);
    const faucetHost = getFaucetHost('localnet');

    const result = await requestSuiFromFaucetV2({
      host: faucetHost,
      recipient: normalizedAddress,
    });

    return true;
  } catch (error: any) {
    // Faucet might not be available, but that's ok for some tests
    console.warn(`Faucet funding failed: ${error.message}`);
    return false;
  }
}

/**
 * Create a new test keypair
 */
export function createTestKeypair(): Ed25519Keypair {
  return new Ed25519Keypair();
}


/**
 * Create multiple test keypairs
 */
export function createTestKeypairs(count: number): Ed25519Keypair[] {
  return Array.from({ length: count }, () => createTestKeypair());
}

/**
 * Get pre-configured test keypairs with deterministic addresses
 * These can be funded on localnet
 */
export function getTestKeypairs(): Ed25519Keypair[] {
  // Use deterministic seed phrases for test accounts
  const testMnemonics = [
    'film crazy soon outside stand loop subway crumble thrive popular green nuclear struggle pistol arm wife phrase warfare march wheat nephew ask sunny firm',
    'require decline left thought grid priority false tiny gasp angle royal system attack beef setup reward aunt skill wasp tray vital bounce inflict level',
    'organ crash swim stick traffic remember army arctic mesh slice swear summer police vast chaos cradle squirrel hood useless evidence pet hub soap lake'
  ];

  return testMnemonics.map(mnemonic =>
    Ed25519Keypair.deriveKeypair(mnemonic)
  );
}

/**
 * Get SUI balance for an address using SDK
 * @param address - The Sui address to check
 * @returns The SUI balance in MIST
 */
export async function getBalance(address: string): Promise<bigint> {
  try {
    const client = getLocalClient();
    const balance = await client.getBalance({
      owner: address,
      coinType: '0x2::sui::SUI',
    });

    return BigInt(balance.totalBalance);
  } catch (error) {
    throw new Error(`Failed to get balance for ${address}: ${error}`);
  }
}
