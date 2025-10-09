import {
	SuiClient,
	SuiObjectData,
} from '@mysten/sui/client';

import { SUI_RPC_URL } from '../db/env';
import { rpcRequestDuration, rpcRequestErrors } from '../metrics';

export type SuiNetwork =
	| 'mainnet'
	| 'testnet'
	| 'devnet'
	| 'localnet';

// Wrap SuiClient to add metrics
class MetricsSuiClient extends SuiClient {
	private network: SuiNetwork;

	constructor(network: SuiNetwork, url: string) {
		super({ url });
		this.network = network;
	}

	private async wrapWithMetrics<T>(
		method: string,
		fn: () => Promise<T>,
	): Promise<T> {
		const start = Date.now();
		try {
			const result = await fn();
			const duration = (Date.now() - start) / 1000;
			rpcRequestDuration.observe(
				{ network: this.network, method },
				duration,
			);
			return result;
		} catch (error) {
			const duration = (Date.now() - start) / 1000;
			rpcRequestDuration.observe(
				{ network: this.network, method },
				duration,
			);
			rpcRequestErrors.inc({
				network: this.network,
				method,
				error_type: error instanceof Error ? error.name : 'unknown',
			});
			throw error;
		}
	}

	override async multiGetObjects(...args: Parameters<SuiClient['multiGetObjects']>) {
		return this.wrapWithMetrics('multiGetObjects', () =>
			super.multiGetObjects(...args),
		);
	}

	override async getTransactionBlock(...args: Parameters<SuiClient['getTransactionBlock']>) {
		return this.wrapWithMetrics('getTransactionBlock', () =>
			super.getTransactionBlock(...args),
		);
	}
}

export const getSuiClient = (network: SuiNetwork) => {
	return new MetricsSuiClient(network, SUI_RPC_URL[network]);
};

// Query a list of objects
// TODO: use a data loader to share queries across requests.
export const queryAllOwnedObjects = async (
	objectIds: string[],
	network: SuiNetwork,
) => {
	const uniqueObjectIds = Array.from(new Set(objectIds));

	if (uniqueObjectIds.length === 0) {
		return [];
	}

	const batches = batchObjectRequests(uniqueObjectIds, 100);

	const allOwnedObjects: SuiObjectData[] = [];

	// Go through the batches & query the objects, pick out the `AddressOwner` ones.
	await Promise.all(
		batches.map(async (batch) => {
			const objects = await getSuiClient(
				network,
			).multiGetObjects({
				ids: batch,
				options: { showOwner: true },
			});

			for (const object of objects) {
				if (
					object.data?.owner &&
					typeof object.data.owner === 'object' &&
					'AddressOwner' in object.data.owner
				) {
					allOwnedObjects.push(object.data);
				}
			}
		}),
	);

	return allOwnedObjects;
};

function batchObjectRequests<T>(
	objectIds: T[],
	batchSize: number,
) {
	const batches = [];
	for (let i = 0; i < objectIds.length; i += batchSize) {
		batches.push(objectIds.slice(i, i + batchSize));
	}
	return batches;
}
