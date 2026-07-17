import { expandAliasQuery } from "@d2-tools/core/items/aliases";
import {
  searchPerkDefinitions,
  type PerkSearchResult
} from "@d2-tools/core/items/perkSearch";
import {
  getItemSearchResultByHash,
  type ItemSearchResult
} from "@d2-tools/core/items/search";
import type {
  DefinitionComponentData,
  DefinitionRecord
} from "@d2-tools/core/manifest/definitions";
import type { GameDataCatalog } from "./catalog.js";
import type { DefinitionReader } from "./definitionReader.js";
import { toUnsignedHash } from "./definitionReader.js";
import type { GameDataSearchIndex } from "./searchIndex.js";

export type ReaderGameDataCatalogOptions = {
  reader: DefinitionReader;
  searchIndex: GameDataSearchIndex;
};

export type ManagedGameDataCatalog = GameDataCatalog & {
  close(): void;
};

export function createReaderGameDataCatalog(
  options: ReaderGameDataCatalogOptions
): ManagedGameDataCatalog {
  return {
    async searchItems(input) {
      const terms = input.aliases
        ? expandAliasQuery(input.query, input.aliases)
        : [input.query.trim()];
      const limit = input.limit ?? 20;
      const matchedHashes = options.searchIndex.search(
        "item",
        terms,
        Math.max(limit * 4, 40)
      );
      const candidateHashes = options.searchIndex.getItemVersionHashes(
        matchedHashes,
        Math.max(limit * 4, 40)
      );
      const candidates = options.reader.getMany(
        "DestinyInventoryItemDefinition",
        candidateHashes
      );
      const context = hydrateItemContext(
        options.reader,
        options.searchIndex,
        Object.values(candidates)
      );
      const results = candidateHashes
        .map((hash) => getItemSearchResultByHash(context.items, hash, {
          plugSetDefinitions: context.plugSets,
          statDefinitions: context.stats,
          collectibleDefinitions: context.collectibles,
          breakerTypeDefinitions: context.breakerTypes,
          damageTypeDefinitions: context.damageTypes
        }))
        .filter((result): result is ItemSearchResult => Boolean(result));

      return results.slice(0, limit);
    },

    async searchPerks(input) {
      const terms = input.aliases
        ? expandAliasQuery(input.query, input.aliases)
        : [input.query.trim()];
      const limit = input.limit ?? 20;
      const perkHashes = options.searchIndex.search(
        "perk",
        terms,
        Math.max(limit * 4, 40)
      );
      const perkDefinitions = options.reader.getMany(
        "DestinySandboxPerkDefinition",
        perkHashes
      );
      const relatedItemHashes = options.searchIndex.getRelatedItemHashes(perkHashes);
      const plugHashes = options.searchIndex.getPlugHashes(perkHashes);
      const relatedItems = options.reader.getMany(
        "DestinyInventoryItemDefinition",
        [...relatedItemHashes, ...plugHashes]
      );
      const plugSets = options.reader.getMany(
        "DestinyPlugSetDefinition",
        collectPlugSetHashes(Object.values(relatedItems))
      );

      return projectPerkSearchResults(perkHashes, perkDefinitions, {
        limit,
        itemDefinitions: relatedItems,
        plugSetDefinitions: plugSets
      });
    },

    async getItemDetail(input) {
      const definition = options.reader.get("DestinyInventoryItemDefinition", input.hash);
      if (!definition) {
        return null;
      }
      const context = hydrateItemContext(options.reader, options.searchIndex, [definition]);
      return getItemSearchResultByHash(context.items, input.hash, {
        plugSetDefinitions: context.plugSets,
        statDefinitions: context.stats,
        collectibleDefinitions: context.collectibles,
        breakerTypeDefinitions: context.breakerTypes,
        damageTypeDefinitions: context.damageTypes,
        includeAllPerks: true
      });
    },

    close() {
      try {
        options.searchIndex.close();
      } finally {
        options.reader.close();
      }
    }
  };
}

type PerkProjectionOptions = {
  limit: number;
  itemDefinitions: DefinitionComponentData;
  plugSetDefinitions: DefinitionComponentData;
};

function projectPerkSearchResults(
  candidateHashes: number[],
  perkDefinitions: DefinitionComponentData,
  options: PerkProjectionOptions
): PerkSearchResult[] {
  const results: PerkSearchResult[] = [];
  for (const hash of candidateHashes) {
    const unsignedHash = toUnsignedHash(hash);
    const definition = perkDefinitions[String(unsignedHash)];
    const localizedName = definition?.displayProperties?.name?.trim();
    if (!definition || !localizedName) {
      continue;
    }

    const [result] = searchPerkDefinitions(
      { [String(unsignedHash)]: definition },
      localizedName,
      {
        limit: 1,
        itemDefinitions: options.itemDefinitions,
        plugSetDefinitions: options.plugSetDefinitions
      }
    );
    if (result) {
      results.push(result);
    }
    if (results.length >= options.limit) {
      break;
    }
  }
  return results;
}

type ItemDefinitionContext = {
  items: DefinitionComponentData;
  plugSets: DefinitionComponentData;
  stats: DefinitionComponentData;
  collectibles: DefinitionComponentData;
  breakerTypes: DefinitionComponentData;
  damageTypes: DefinitionComponentData;
};

function hydrateItemContext(
  reader: DefinitionReader,
  searchIndex: GameDataSearchIndex,
  roots: DefinitionRecord[]
): ItemDefinitionContext {
  const linkedItemHashes = roots.flatMap(collectLinkedItemHashes);
  const linkedItems = reader.getMany("DestinyInventoryItemDefinition", linkedItemHashes);
  const itemSeeds = [...roots, ...Object.values(linkedItems)];
  const plugSets = reader.getMany(
    "DestinyPlugSetDefinition",
    collectPlugSetHashes(itemSeeds)
  );
  const plugHashes = uniqueNumbers([
    ...itemSeeds.flatMap(collectDirectPlugHashes),
    ...Object.values(plugSets).flatMap((definition) => (
      (definition.reusablePlugItems ?? [])
        .map((item) => item.plugItemHash)
        .filter((hash): hash is number => typeof hash === "number")
    ))
  ]);
  const plugs = reader.getMany("DestinyInventoryItemDefinition", plugHashes);
  const allItems = definitionData([...roots, ...Object.values(linkedItems), ...Object.values(plugs)]);
  const relevantRecords = Object.values(allItems);

  return {
    items: allItems,
    plugSets,
    stats: reader.getMany("DestinyStatDefinition", collectStatHashes(roots)),
    collectibles: reader.getMany(
      "DestinyCollectibleDefinition",
      relevantRecords
        .map((definition) => definition.collectibleHash)
        .filter((hash): hash is number => typeof hash === "number")
    ),
    breakerTypes: reader.getMany(
      "DestinyBreakerTypeDefinition",
      [
        ...relevantRecords
          .map((definition) => definition.breakerTypeHash)
          .filter((hash): hash is number => typeof hash === "number"),
        ...searchIndex.getEnumHashes(
          "breaker",
          relevantRecords
            .map((definition) => definition.breakerType)
            .filter((value): value is number => typeof value === "number")
        )
      ]
    ),
    damageTypes: reader.getMany(
      "DestinyDamageTypeDefinition",
      [
        ...relevantRecords.flatMap((definition) => [
          ...(typeof definition.defaultDamageTypeHash === "number"
            ? [definition.defaultDamageTypeHash]
            : []),
          ...(definition.damageTypeHashes ?? [])
        ]),
        ...searchIndex.getEnumHashes(
          "damage",
          relevantRecords.flatMap((definition) => [
            ...(typeof definition.defaultDamageType === "number"
              ? [definition.defaultDamageType]
              : []),
            ...(typeof definition.equippingBlock?.damageType === "number"
              ? [definition.equippingBlock.damageType]
              : [])
          ])
        )
      ]
    )
  };
}

function definitionData(records: DefinitionRecord[]): DefinitionComponentData {
  return Object.fromEntries(
    records
      .map((record) => [String(toUnsignedHash(Number(record.hash))), record] as const)
      .filter(([hash]) => hash !== "0")
  );
}

function collectPlugSetHashes(definitions: DefinitionRecord[]): number[] {
  return uniqueNumbers(definitions.flatMap((definition) => (
    (definition.sockets?.socketEntries ?? []).flatMap((entry) => [
      ...(typeof entry.reusablePlugSetHash === "number" ? [entry.reusablePlugSetHash] : []),
      ...(typeof entry.randomizedPlugSetHash === "number" ? [entry.randomizedPlugSetHash] : [])
    ])
  )));
}

function collectDirectPlugHashes(definition: DefinitionRecord): number[] {
  return uniqueNumbers((definition.sockets?.socketEntries ?? []).flatMap((entry) => [
    ...(typeof entry.singleInitialItemHash === "number" ? [entry.singleInitialItemHash] : []),
    ...(entry.reusablePlugItems ?? [])
      .map((item) => item.plugItemHash)
      .filter((hash): hash is number => typeof hash === "number")
  ]));
}

function collectLinkedItemHashes(definition: DefinitionRecord): number[] {
  return uniqueNumbers([
    ...(typeof definition.translationBlock?.artArrangementHash === "number"
      ? [definition.translationBlock.artArrangementHash]
      : []),
    ...(definition.translationBlock?.arrangements ?? [])
      .map((arrangement) => arrangement.artArrangementHash)
      .filter((hash): hash is number => typeof hash === "number")
  ]).filter((hash) => hash !== toUnsignedHash(Number(definition.hash)));
}

function collectStatHashes(definitions: DefinitionRecord[]): number[] {
  return uniqueNumbers(definitions.flatMap((definition) => (
    Object.entries(definition.stats?.stats ?? {}).map(([key, stat]) => (
      Number(stat.statHash ?? key)
    ))
  )));
}

function uniqueNumbers(values: number[]): number[] {
  return [...new Set(
    values
      .map(toUnsignedHash)
      .filter((hash) => hash > 0)
  )];
}
