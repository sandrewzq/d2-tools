import type { DefinitionComponentData, DefinitionRecord } from "../manifest/definitions.js";
import { classifyBucket } from "./classification.js";

export type WeaponBreakerTypeKey = "shield-piercing" | "disruption" | "stagger";
export type ChampionTypeKey = "barrier" | "overload" | "unstoppable";
export type WeaponBreakerTypeSource = "item" | "plug" | "intrinsic-perk";

export type WeaponBreakerTypeSummary = {
  hash: number;
  key: WeaponBreakerTypeKey;
  name: string;
  description: string;
  icon?: string;
  champion_type: ChampionTypeKey;
  champion_name: string;
  source: WeaponBreakerTypeSource;
  source_hash?: number;
};

export type WeaponBreakerTypeOptions = {
  breakerTypeDefinitions?: DefinitionComponentData;
  plugSetDefinitions?: DefinitionComponentData;
  insertedPlugHashes?: number[];
};

type BreakerIdentity = {
  key: WeaponBreakerTypeKey;
  championType: ChampionTypeKey;
  championName: string;
  fallbackName: string;
  fallbackDescription: string;
};

const bungieStaticBaseUrl = "https://www.bungie.net";
const hiddenIntrinsicPerkBreakerEnum = new Map<number, number>([
  [3469621377, 1],
  [472686235, 2],
  [2917776374, 3]
]);
const breakerIdentities: Record<number, BreakerIdentity> = {
  1: {
    key: "shield-piercing",
    championType: "barrier",
    championName: "屏障勇士",
    fallbackName: "贯穿护盾",
    fallbackDescription: "可击破屏障勇士的护盾。"
  },
  2: {
    key: "disruption",
    championType: "overload",
    championName: "过载勇士",
    fallbackName: "干扰",
    fallbackDescription: "可干扰并眩晕过载勇士。"
  },
  3: {
    key: "stagger",
    championType: "unstoppable",
    championName: "势不可挡勇士",
    fallbackName: "眩晕",
    fallbackDescription: "可眩晕势不可挡勇士。"
  }
};

export function summarizeWeaponBreakerType(
  item: DefinitionRecord,
  itemDefinitions: DefinitionComponentData,
  options: WeaponBreakerTypeOptions = {}
): WeaponBreakerTypeSummary | undefined {
  if (classifyBucket(item.inventory?.bucketTypeHash)?.group !== "weapons") {
    return undefined;
  }

  if (typeof item.breakerTypeHash === "number") {
    const summary = breakerSummary(
      item.breakerTypeHash,
      "item",
      item.hash,
      options.breakerTypeDefinitions
    );
    if (summary) {
      return summary;
    }
  }
  if (typeof item.breakerType === "number" && item.breakerType > 0) {
    return breakerSummaryByEnum(
      item.breakerType,
      "item",
      item.hash,
      options.breakerTypeDefinitions
    );
  }

  const initialPlugHashes = [...new Set([
    ...(options.insertedPlugHashes ?? []),
    ...collectInitialSocketPlugHashes(item)
  ])];
  for (const plugHash of initialPlugHashes) {
    const plug = itemDefinitions[String(plugHash)];
    if (typeof plug?.breakerTypeHash === "number") {
      const summary = breakerSummary(plug.breakerTypeHash, "plug", plugHash, options.breakerTypeDefinitions);
      if (summary) {
        return summary;
      }
    }
    if (typeof plug?.breakerType === "number" && plug.breakerType > 0) {
      const summary = breakerSummaryByEnum(
        plug.breakerType,
        "plug",
        plugHash,
        options.breakerTypeDefinitions
      );
      if (summary) {
        return summary;
      }
    }
  }

  const plugHashes = collectSocketPlugHashes(item, options.plugSetDefinitions);
  for (const plugHash of plugHashes) {
    const plug = itemDefinitions[String(plugHash)];
    if (!isIntrinsicPlug(plug)) {
      continue;
    }
    for (const perk of plug.perks ?? []) {
      const breakerEnum = hiddenIntrinsicPerkBreakerEnum.get(Number(perk.perkHash));
      if (!breakerEnum) {
        continue;
      }
      const breakerDefinition = findBreakerDefinitionByEnum(options.breakerTypeDefinitions, breakerEnum);
      if (!breakerDefinition) {
        continue;
      }
      const summary = breakerSummary(
        breakerDefinition.hash,
        "intrinsic-perk",
        plugHash,
        options.breakerTypeDefinitions
      );
      if (summary) {
        return summary;
      }
    }
  }

  return undefined;
}

function collectInitialSocketPlugHashes(item: DefinitionRecord): number[] {
  return [...new Set((item.sockets?.socketEntries ?? [])
    .map((entry) => entry.singleInitialItemHash)
    .filter((hash): hash is number => typeof hash === "number"))];
}

function collectSocketPlugHashes(
  item: DefinitionRecord,
  plugSetDefinitions: DefinitionComponentData | undefined
): number[] {
  const hashes = (item.sockets?.socketEntries ?? []).flatMap((entry) => [
    ...(typeof entry.singleInitialItemHash === "number" ? [entry.singleInitialItemHash] : []),
    ...plugHashes(entry.reusablePlugItems),
    ...plugSetHashes(plugSetDefinitions, entry.reusablePlugSetHash),
    ...plugSetHashes(plugSetDefinitions, entry.randomizedPlugSetHash)
  ]);
  return [...new Set(hashes)];
}

function plugHashes(items: Array<{ plugItemHash?: number }> | undefined): number[] {
  return (items ?? [])
    .map((item) => item.plugItemHash)
    .filter((hash): hash is number => typeof hash === "number");
}

function plugSetHashes(
  definitions: DefinitionComponentData | undefined,
  hash: number | undefined
): number[] {
  return typeof hash === "number"
    ? plugHashes(definitions?.[String(hash)]?.reusablePlugItems)
    : [];
}

function isIntrinsicPlug(definition: DefinitionRecord | undefined): boolean {
  if (!definition) {
    return false;
  }
  const category = definition.plug?.plugCategoryIdentifier?.toLocaleLowerCase() ?? "";
  const type = definition.itemTypeDisplayName?.toLocaleLowerCase() ?? "";
  return category.includes("intrinsic")
    || type.includes("intrinsic")
    || type.includes("内在")
    || type.includes("固有");
}

function breakerSummary(
  breakerHash: number,
  source: WeaponBreakerTypeSource,
  sourceHash: number | undefined,
  definitions: DefinitionComponentData | undefined
): WeaponBreakerTypeSummary | undefined {
  const definition = definitions?.[String(breakerHash)];
  const enumValue = Number(definition?.enumValue);
  const identity = breakerIdentities[enumValue];
  if (!definition || !identity) {
    return undefined;
  }
  const icon = normalizeBungieAssetUrl(definition.displayProperties?.icon);
  return {
    hash: breakerHash,
    key: identity.key,
    name: definition.displayProperties?.name?.trim() || identity.fallbackName,
    description: definition.displayProperties?.description?.trim() || identity.fallbackDescription,
    ...(icon ? { icon } : {}),
    champion_type: identity.championType,
    champion_name: identity.championName,
    source,
    ...(typeof sourceHash === "number" ? { source_hash: sourceHash } : {})
  };
}

function breakerSummaryByEnum(
  enumValue: number,
  source: WeaponBreakerTypeSource,
  sourceHash: number | undefined,
  definitions: DefinitionComponentData | undefined
): WeaponBreakerTypeSummary | undefined {
  const definition = findBreakerDefinitionByEnum(definitions, enumValue);
  return definition
    ? breakerSummary(definition.hash, source, sourceHash, definitions)
    : undefined;
}

function findBreakerDefinitionByEnum(
  definitions: DefinitionComponentData | undefined,
  enumValue: number
): { hash: number } | undefined {
  for (const [key, definition] of Object.entries(definitions ?? {})) {
    if (definition.enumValue !== enumValue) {
      continue;
    }
    const hash = Number(definition.hash ?? key);
    if (Number.isFinite(hash)) {
      return { hash };
    }
  }
  return undefined;
}

function normalizeBungieAssetUrl(path: string | undefined): string | undefined {
  if (!path) {
    return undefined;
  }
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  return new URL(path, bungieStaticBaseUrl).toString();
}
