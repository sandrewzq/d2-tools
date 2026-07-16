import type { DefinitionComponentData, DefinitionRecord } from "../manifest/definitions.js";

export type DamageTypeKey = "kinetic" | "arc" | "solar" | "void" | "raid" | "stasis" | "strand";

export type DamageTypeSummary = {
  hash: number;
  enum_value: number;
  key: DamageTypeKey;
  name: string;
  description: string;
  icon?: string;
};

const bungieStaticBaseUrl = "https://www.bungie.net";
const damageTypeKeys: Partial<Record<number, DamageTypeKey>> = {
  1: "kinetic",
  2: "arc",
  3: "solar",
  4: "void",
  5: "raid",
  6: "stasis",
  7: "strand"
};

export function summarizeItemDamageType(
  item: DefinitionRecord,
  damageTypeDefinitions: DefinitionComponentData | undefined
): DamageTypeSummary | undefined {
  const enumValue = item.equippingBlock?.damageType ?? item.defaultDamageType;
  const explicitHash = item.defaultDamageTypeHash
    ?? item.damageTypeHashes?.find((hash) => typeof hash === "number");
  const definitionEntry = (explicitHash !== undefined
    ? definitionByHash(damageTypeDefinitions, explicitHash)
    : undefined) ?? definitionByEnum(damageTypeDefinitions, enumValue);
  if (!definitionEntry) {
    return undefined;
  }

  const resolvedEnumValue = Number(definitionEntry.definition.enumValue ?? enumValue);
  const key = damageTypeKeys[resolvedEnumValue];
  if (!key) {
    return undefined;
  }
  const icon = normalizeBungieAssetUrl(definitionEntry.definition.displayProperties?.icon);
  return {
    hash: definitionEntry.hash,
    enum_value: resolvedEnumValue,
    key,
    name: definitionEntry.definition.displayProperties?.name?.trim() ?? "",
    description: definitionEntry.definition.displayProperties?.description?.trim() ?? "",
    ...(icon ? { icon } : {})
  };
}

function definitionByHash(
  definitions: DefinitionComponentData | undefined,
  hash: number
): { hash: number; definition: DefinitionRecord } | undefined {
  const definition = definitions?.[String(hash)];
  return definition ? { hash, definition } : undefined;
}

function definitionByEnum(
  definitions: DefinitionComponentData | undefined,
  enumValue: number | undefined
): { hash: number; definition: DefinitionRecord } | undefined {
  if (typeof enumValue !== "number") {
    return undefined;
  }
  for (const [key, definition] of Object.entries(definitions ?? {})) {
    if (definition.enumValue !== enumValue) {
      continue;
    }
    const hash = Number(definition.hash ?? key);
    if (Number.isFinite(hash)) {
      return { hash, definition };
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
