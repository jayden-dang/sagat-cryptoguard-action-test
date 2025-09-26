// TODO: should we bound this to a single env (have `testnet.mysten` and `mainnet.mysten` or not?)
import { SuiClient, ObjectOwner, SuiObjectData } from '@mysten/sui/client';
export const suiClient = new SuiClient({
  url: process.env.SUI_RPC_URL || 'https://fullnode.testnet.sui.io:443',
});

// Query a list of objects
// TODO: use a data loader to share queries across requests.
export const queryAllOwnedObjects = async (objectIds: string[]) => {
  const uniqueObjectIds = Array.from(new Set(objectIds));

  if (uniqueObjectIds.length === 0) {
    return [];
  }

  const batches = batchObjectRequests(uniqueObjectIds, 100);

  const allOwnedObjects: SuiObjectData[] = [];

  // Go through the batches & query the objects, pick out the `AddressOwner` ones.
  await Promise.all(
    batches.map(async (batch) => {
      const objects = await suiClient.multiGetObjects({
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

function batchObjectRequests<T>(objectIds: T[], batchSize: number) {
  const batches = [];
  for (let i = 0; i < objectIds.length; i += batchSize) {
    batches.push(objectIds.slice(i, i + batchSize));
  }
  return batches;
}
