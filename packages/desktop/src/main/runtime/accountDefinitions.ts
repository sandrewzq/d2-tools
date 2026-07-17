import type {
  AccountDefinitionData,
  AccountDefinitionLoader,
  AccountDefinitionRequest
} from "@d2-tools/core/account/summary";
import type {
  DefinitionComponentData,
  DefinitionComponentName,
  DefinitionRecord
} from "@d2-tools/core/manifest/definitions";
import type { DefinitionProjection } from "./gameDataRuntime.js";

type DefinitionQuery = (
  component: DefinitionComponentName,
  hashes: Iterable<number>,
  options?: { projection?: DefinitionProjection }
) => Promise<DefinitionComponentData>;

export function createAccountDefinitionLoader(
  getDefinitions: DefinitionQuery
): AccountDefinitionLoader {
  return (request) => loadAccountDefinitions(request, getDefinitions);
}

export async function loadAccountDefinitions(
  request: AccountDefinitionRequest,
  getDefinitions: DefinitionQuery
): Promise<AccountDefinitionData> {
  const itemHashes = new Set(request.itemHashes.map(toUnsignedHash));
  const bucketHashes = new Set(request.bucketHashes.map(toUnsignedHash));
  const plugSetHashes = new Set(request.plugSetHashes.map(toUnsignedHash));
  const itemDefinitions: DefinitionComponentData = {};
  const plugSetDefinitions: DefinitionComponentData = {};
  const queriedItemHashes = new Set<number>();
  const queriedPlugSetHashes = new Set<number>();
  const definitionOptions = request.expandSocketPlugSets
    ? undefined
    : { projection: "account-snapshot" as const };

  while (
    hasUnqueriedHash(itemHashes, queriedItemHashes)
    || hasUnqueriedHash(plugSetHashes, queriedPlugSetHashes)
  ) {
    const loadedItems = await queryNewDefinitions(
      getDefinitions,
      "DestinyInventoryItemDefinition",
      itemHashes,
      queriedItemHashes,
      itemDefinitions,
      definitionOptions
    );
    for (const definition of loadedItems) {
      addHash(bucketHashes, definition.inventory?.bucketTypeHash);
      if (!request.expandSocketPlugSets) continue;
      for (const socket of definition.sockets?.socketEntries ?? []) {
        addHash(itemHashes, socket.singleInitialItemHash);
        addHash(plugSetHashes, socket.reusablePlugSetHash);
        addHash(plugSetHashes, socket.randomizedPlugSetHash);
        for (const plug of socket.reusablePlugItems ?? []) addHash(itemHashes, plug.plugItemHash);
      }
    }

    const loadedPlugSets = await queryNewDefinitions(
      getDefinitions,
      "DestinyPlugSetDefinition",
      plugSetHashes,
      queriedPlugSetHashes,
      plugSetDefinitions,
      definitionOptions
    );
    if (request.expandSocketPlugSets) {
      for (const definition of loadedPlugSets) {
        for (const plug of definition.reusablePlugItems ?? []) addHash(itemHashes, plug.plugItemHash);
      }
    }
  }

  const [bucketDefinitions, objectiveDefinitions, loadoutNameDefinitions] = await Promise.all([
    getDefinitions("DestinyInventoryBucketDefinition", bucketHashes, definitionOptions),
    getDefinitions("DestinyObjectiveDefinition", request.objectiveHashes, definitionOptions),
    getDefinitions("DestinyLoadoutNameDefinition", request.loadoutNameHashes, definitionOptions)
  ]);
  return {
    itemDefinitions,
    plugSetDefinitions,
    bucketDefinitions,
    objectiveDefinitions,
    loadoutNameDefinitions
  };
}

async function queryNewDefinitions(
  getDefinitions: DefinitionQuery,
  component: "DestinyInventoryItemDefinition" | "DestinyPlugSetDefinition",
  hashes: Set<number>,
  queriedHashes: Set<number>,
  target: DefinitionComponentData,
  options?: { projection?: DefinitionProjection }
): Promise<DefinitionRecord[]> {
  const pending = [...hashes].filter((hash) => !queriedHashes.has(hash));
  for (const hash of pending) queriedHashes.add(hash);
  if (!pending.length) return [];
  const loaded = await getDefinitions(component, pending, options);
  Object.assign(target, loaded);
  return Object.values(loaded);
}

function hasUnqueriedHash(hashes: Set<number>, queriedHashes: Set<number>): boolean {
  for (const hash of hashes) if (!queriedHashes.has(hash)) return true;
  return false;
}

function addHash(target: Set<number>, hash: number | undefined): void {
  if (typeof hash === "number" && Number.isFinite(hash)) target.add(toUnsignedHash(hash));
}

function toUnsignedHash(hash: number): number {
  return hash >>> 0;
}
