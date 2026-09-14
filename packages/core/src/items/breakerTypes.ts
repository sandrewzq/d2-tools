import type { DefinitionComponentData, DefinitionRecord } from "../manifest/definitions.js";
import { classifyBucket } from "./classification.js";
import { summarizeWeaponFrame, type WeaponFrameSummary } from "./weaponFrames.js";

export type WeaponBreakerTypeKey = "shield-piercing" | "disruption" | "stagger";
export type ChampionTypeKey = "barrier" | "overload" | "unstoppable";
export type WeaponBreakerTypeSource = "item" | "plug" | "intrinsic-perk" | "intrinsic-frame";

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
  source_frame_key?: string;
  source_frame_name?: string;
};

export type WeaponBreakerTypeOptions = {
  breakerTypeDefinitions?: DefinitionComponentData;
  plugSetDefinitions?: DefinitionComponentData;
  insertedPlugHashes?: number[];
  weaponFrame?: WeaponFrameSummary;
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

  const frame = options.weaponFrame ?? summarizeWeaponFrame(item, itemDefinitions, {
    plugSetDefinitions: options.plugSetDefinitions
  });
  const frameBreakerEnum = frame ? breakerEnumForFrame(frame) : undefined;
  if (frameBreakerEnum) {
    return breakerSummaryByEnum(
      frameBreakerEnum,
      "intrinsic-frame",
      undefined,
      options.breakerTypeDefinitions,
      frame
    );
  }

  // Account snapshots pass the currently inserted plug hashes because their
  // compact item definitions intentionally omit socketEntries. The library
  // path has full Manifest socket data instead. Keep both inputs in the same
  // candidate set so every surface resolves intrinsic champion perks alike.
  const candidatePlugHashes = [...new Set([
    ...(options.insertedPlugHashes ?? []),
    ...collectSocketPlugHashes(item, options.plugSetDefinitions)
  ])];
  for (const plugHash of candidatePlugHashes) {
    const plug = itemDefinitions[String(plugHash)];
    if (!plug) {
      continue;
    }
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
    if (!isIntrinsicPlug(plug)) {
      continue;
    }
    for (const perk of plug.perks ?? []) {
      const breakerEnum = hiddenIntrinsicPerkBreakerEnum.get(Number(perk.perkHash));
      if (!breakerEnum) {
        continue;
      }
      const breakerDefinition = findBreakerDefinitionByEnum(options.breakerTypeDefinitions, breakerEnum);
      const summary = breakerDefinition
        ? breakerSummary(breakerDefinition.hash, "intrinsic-perk", plugHash, options.breakerTypeDefinitions)
        : breakerSummaryByEnum(breakerEnum, "intrinsic-perk", plugHash, options.breakerTypeDefinitions);
      if (summary) {
        return summary;
      }
    }
  }

  return undefined;
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
  definitions: DefinitionComponentData | undefined,
  frame?: WeaponFrameSummary
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
    ...(typeof sourceHash === "number" ? { source_hash: sourceHash } : {}),
    ...(frame ? { source_frame_key: frame.key, source_frame_name: frame.name } : {})
  };
}

function breakerSummaryByEnum(
  enumValue: number,
  source: WeaponBreakerTypeSource,
  sourceHash: number | undefined,
  definitions: DefinitionComponentData | undefined,
  frame?: WeaponFrameSummary
): WeaponBreakerTypeSummary | undefined {
  const definition = findBreakerDefinitionByEnum(definitions, enumValue);
  if (definition) return breakerSummary(definition.hash, source, sourceHash, definitions, frame);
  const identity = breakerIdentities[enumValue];
  if (!identity) return undefined;
  return {
    hash: 0,
    key: identity.key,
    name: identity.fallbackName,
    description: identity.fallbackDescription,
    champion_type: identity.championType,
    champion_name: identity.championName,
    source,
    ...(typeof sourceHash === "number" ? { source_hash: sourceHash } : {}),
    ...(frame ? { source_frame_key: frame.key, source_frame_name: frame.name } : {})
  };
}

const frameBreakerEnums: Array<{ enumValue: number; aliases: string[]; localizedNames: string[] }> = [
  {
    enumValue: 3,
    aliases: ["aggressive-frame", "high-impact-frame", "heavy-burst", "aggressive-burst", "rocket-assisted-pulse", "rocket-assisted-sidearm", "double-fire", "micro-missile-frame", "wave-frame", "compressed-wave-frame", "wave-sword-frame"],
    localizedNames: [
      "攻击型框架", "高冲击力框架", "高衝擊力框架", "高冲击力长弓", "高衝擊力長弓",
      "重型点射", "重型點射", "重型爆发", "重型爆發",
      "激进爆弹", "激進爆彈", "攻击型偃月", "攻擊型偃月", "双重火力", "雙重火力",
      "微型导弹框架", "微型導彈框架", "波形框架", "压缩波", "壓縮波", "压缩波框架", "壓縮波框架",
      "波形刀剑框架", "波形刀劍框架"
    ]
  },
  {
    enumValue: 1,
    aliases: ["precision-frame", "adaptive-frame", "adaptive-burst", "adaptive-burst-frame", "legacy-pr-55", "legacy-pr-55-frame", "disruption", "disruption-frame", "caster", "caster-frame"],
    localizedNames: [
      "精密框架", "精確框架", "精确框架", "适配框架", "適配框架", "适应框架", "適應框架",
      "适配偃月", "適配偃月", "适配点射", "適配點射", "精确重击框架", "精確重擊框架",
      "铸造者框架", "鑄造者框架", "干扰框架", "干擾框架"
    ]
  },
  {
    enumValue: 2,
    aliases: ["lightweight-frame", "rapid-fire-frame", "support-frame", "area-denial", "area-denial-frame", "spread-shot", "spread-shot-frame", "vortex", "vortex-frame", "dynamic-heat-weapon", "balanced-heat-weapon"],
    localizedNames: [
      "轻质框架", "輕質框架", "轻型框架", "輕型框架", "速射框架", "速射偃月", "支援框架",
      "区域拒止框架", "區域拒止框架", "散射", "扩散射击", "擴散射擊", "扩散射击框架", "擴散射擊框架",
      "涡流框架", "渦流框架", "动态热量武器", "動態熱量武器", "动态热能武器", "動態熱能武器",
      "平衡热量武器", "平衡熱量武器", "平衡热能武器", "平衡熱能武器"
    ]
  }
];

function breakerEnumForFrame(frame: WeaponFrameSummary): number | undefined {
  const key = frame.key.toLocaleLowerCase();
  const name = frame.name.toLocaleLowerCase();
  for (const candidate of frameBreakerEnums) {
    if (candidate.localizedNames.some((localizedName) => frame.name.includes(localizedName))) {
      return candidate.enumValue;
    }
    if (candidate.aliases.some((alias) => key === alias || key.includes(alias) || name.includes(alias.replaceAll("-", " ")))) {
      return candidate.enumValue;
    }
  }
  return undefined;
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
