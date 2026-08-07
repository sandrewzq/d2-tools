import type { DefinitionComponentData, DefinitionRecord } from "../manifest/definitions.js";
import { classifyBucket, type EquipmentGroupKey } from "./classification.js";
import { expandAliasQuery, type ItemAliases } from "./aliases.js";
import { selectCanonicalEquipmentDefinitions } from "./search.js";

export type PerkSearchResult = {
  key: string;
  hash: number;
  hashes: number[];
  name: string;
  description: string;
  icon?: string;
  variants: PerkVariant[];
  related_count: number;
  related_groups: EquipmentGroupKey[];
};

export type PerkVariantKind = "standard" | "enhanced" | "other";

export type PerkVariant = {
  sandbox_perk_hash: number;
  plug_hashes: number[];
  kind: PerkVariantKind;
  description: string;
  related_count: number;
};

export type PerkRelatedEquipmentQuery = {
  perk_hashes: number[];
  offset?: number;
  limit?: number;
};

export type PerkRelatedEquipmentItem<TItem> = {
  item: TItem;
  matched_perk_hashes: number[];
  matched_variants: PerkVariantKind[];
};

export type PerkRelatedEquipmentPage<TItem> = {
  total: number;
  items: Array<PerkRelatedEquipmentItem<TItem>>;
  offset: number;
  has_more: boolean;
};

export type PerkSearchOptions = {
  limit?: number;
  itemDefinitions?: DefinitionComponentData;
  perkIconDefinitions?: DefinitionComponentData;
  plugSetDefinitions?: DefinitionComponentData;
  aliases?: ItemAliases;
};

const bungieStaticBaseUrl = "https://www.bungie.net";
const nonEquipmentItemTypes = new Set([0, 19, 20, 30]);

export function searchPerkDefinitions(
  perkDefinitions: DefinitionComponentData,
  query: string,
  options: PerkSearchOptions = {}
): PerkSearchResult[] {
  const terms = options.aliases ? expandAliasQuery(query, options.aliases) : [query.trim()];
  const normalizedTerms = terms.map(normalizeSearchText).filter(Boolean);
  if (!normalizedTerms.length) {
    return [];
  }

  const candidateHashes = Object.values(perkDefinitions)
    .filter((definition) => {
      const name = cleanDisplayText(definition.displayProperties?.name);
      const description = cleanDisplayText(definition.displayProperties?.description);
      if (!name) return false;
      const searchable = normalizeSearchText(`${name}\n${description}`);
      return normalizedTerms.some((term) => searchable.includes(term));
    })
    .map((definition) => Number(definition.hash))
    .filter(Number.isFinite);

  return projectPerkSearchResults(candidateHashes, perkDefinitions, {
    limit: options.limit ?? 20,
    itemDefinitions: options.itemDefinitions,
    perkIconDefinitions: options.perkIconDefinitions ?? options.itemDefinitions,
    plugSetDefinitions: options.plugSetDefinitions
  });
}

export function projectPerkSearchResults(
  candidateHashes: Iterable<number>,
  perkDefinitions: DefinitionComponentData,
  options: Pick<PerkSearchOptions, "limit" | "itemDefinitions" | "perkIconDefinitions" | "plugSetDefinitions"> = {}
): PerkSearchResult[] {
  const groups = new Map<string, {
    variants: Map<number, PerkVariant>;
    name: string;
    icon?: string;
  }>();

  for (const candidateHash of candidateHashes) {
    const hash = Number(candidateHash) >>> 0;
    const definition = perkDefinitions[String(hash)];
    const name = cleanDisplayText(definition?.displayProperties?.name);
    if (!definition || !name) continue;

    const plugDefinitions = findPerkPlugDefinitions(hash, options.perkIconDefinitions);
    const description = cleanDisplayText(definition.displayProperties?.description);
    const icon = findPreferredPerkIcon(definition, plugDefinitions);
    const identity = buildPerkFamilyIdentity(name, definition, plugDefinitions);
    const relatedCount = options.itemDefinitions
      ? findRelatedEquipmentDefinitions([hash], options.itemDefinitions, options.plugSetDefinitions).length
      : 0;
    const variant: PerkVariant = {
      sandbox_perk_hash: hash,
      plug_hashes: plugDefinitions
        .map((plug) => Number(plug.hash))
        .filter(Number.isFinite)
        .map((plugHash) => plugHash >>> 0)
        .sort((left, right) => left - right),
      kind: classifyPerkVariantKind(hash, options.perkIconDefinitions),
      description,
      related_count: relatedCount
    };
    const current = groups.get(identity);
    if (current) {
      current.variants.set(hash, variant);
      if (!current.icon && icon) current.icon = icon;
      continue;
    }
    groups.set(identity, {
      variants: new Map([[hash, variant]]),
      name,
      ...(icon ? { icon } : {})
    });
  }

  return [...groups.values()]
    .slice(0, options.limit ?? 20)
    .map((group) => {
      const variants = [...group.variants.values()].sort(comparePerkVariants);
      const hashes = variants.map((variant) => variant.sandbox_perk_hash).sort((left, right) => left - right);
      const icon = group.icon ?? findPerkIcon(hashes, options.perkIconDefinitions);
      const description = variants.find((variant) => variant.kind === "standard")?.description
        ?? variants[0]?.description
        ?? "";
      const relatedDefinitions = options.itemDefinitions
        ? findRelatedEquipmentDefinitions(
          hashes,
          options.itemDefinitions,
          options.plugSetDefinitions
        )
        : [];
      return {
        key: `perk:${hashes.join(",")}`,
        hash: hashes[0]!,
        hashes,
        name: group.name,
        description,
        ...(icon ? { icon } : {}),
        variants,
        related_count: relatedDefinitions.length,
        related_groups: collectRelatedGroups(relatedDefinitions)
      };
    });
}

export function classifyPerkVariantKind(
  sandboxPerkHash: number,
  definitions: DefinitionComponentData | undefined
): PerkVariantKind {
  const plugs = findPerkPlugDefinitions(sandboxPerkHash, definitions);
  if (plugs.some((plug) => plug.inventory?.tierType === 3)) return "enhanced";
  if (plugs.some((plug) => plug.inventory?.tierType === 2)) return "standard";

  const displayTypes = plugs.map((plug) => normalizeSearchText(plug.itemTypeDisplayName ?? ""));
  if (displayTypes.some((type) => type.includes("强化") || type.includes("enhanced"))) return "enhanced";
  return "other";
}

function findPerkPlugDefinitions(
  sandboxPerkHash: number,
  definitions: DefinitionComponentData | undefined
): DefinitionRecord[] {
  if (!definitions) return [];
  const hash = Number(sandboxPerkHash) >>> 0;
  return Object.values(definitions).filter((definition) => (
    (definition.perks ?? []).some((perk) => (
      typeof perk.perkHash === "number" && (perk.perkHash >>> 0) === hash
    ))
  ));
}

function findPreferredPerkIcon(
  definition: DefinitionRecord,
  plugDefinitions: DefinitionRecord[]
): string | undefined {
  return plugDefinitions
    .map((plug) => normalizeBungieAssetUrl(plug.displayProperties?.icon))
    .find(Boolean)
    ?? normalizeBungieAssetUrl(definition.displayProperties?.icon);
}

function buildPerkFamilyIdentity(
  name: string,
  definition: DefinitionRecord,
  plugDefinitions: DefinitionRecord[]
): string {
  const plugIdentities = plugDefinitions.map((plug) => [
    normalizeSearchText(plug.displayProperties?.name ?? name),
    plug.displayProperties?.iconHash ?? normalizeBungieAssetUrl(plug.displayProperties?.icon) ?? "",
    plug.plug?.plugCategoryHash ?? plug.plug?.plugCategoryIdentifier ?? "",
    [...(plug.itemCategoryHashes ?? [])].sort((left, right) => left - right).join(",")
  ].join("\u0000"));
  const preferredIdentity = plugIdentities.sort()[0];
  if (preferredIdentity) return preferredIdentity;

  return [
    normalizeSearchText(name),
    definition.displayProperties?.iconHash ?? normalizeBungieAssetUrl(definition.displayProperties?.icon) ?? ""
  ].join("\u0000");
}

function comparePerkVariants(left: PerkVariant, right: PerkVariant): number {
  const order: Record<PerkVariantKind, number> = { standard: 0, enhanced: 1, other: 2 };
  return order[left.kind] - order[right.kind]
    || left.sandbox_perk_hash - right.sandbox_perk_hash;
}

function findPerkIcon(
  sandboxPerkHashes: Iterable<number>,
  definitions: DefinitionComponentData | undefined
): string | undefined {
  if (!definitions) return undefined;
  const hashes = new Set([...sandboxPerkHashes].map((hash) => Number(hash) >>> 0));
  for (const definition of Object.values(definitions)) {
    if (!(definition.perks ?? []).some((perk) => (
      typeof perk.perkHash === "number" && hashes.has(perk.perkHash >>> 0)
    ))) continue;
    const icon = normalizeBungieAssetUrl(definition.displayProperties?.icon);
    if (icon) return icon;
  }
  return undefined;
}

export function findRelatedEquipmentDefinitions(
  sandboxPerkHashes: Iterable<number>,
  itemDefinitions: DefinitionComponentData,
  plugSetDefinitions?: DefinitionComponentData
): DefinitionRecord[] {
  const relatedPlugHashes = buildRelatedPlugHashes(sandboxPerkHashes, itemDefinitions);
  const matches = Object.values(itemDefinitions).filter((definition) => {
    const name = cleanDisplayText(definition.displayProperties?.name);
    if (!name || !isSearchableEquipmentDefinition(definition)) return false;
    return definitionContainsPlug(definition, relatedPlugHashes, plugSetDefinitions);
  });

  return selectCanonicalEquipmentDefinitions(matches).sort(compareRelatedDefinitions);
}

export function collectRelatedGroups(definitions: Iterable<DefinitionRecord>): EquipmentGroupKey[] {
  const groups = new Set<EquipmentGroupKey>();
  for (const definition of definitions) {
    const group = classifyBucket(definition.inventory?.bucketTypeHash)?.group;
    if (group) groups.add(group);
  }
  return [...groups];
}

function definitionContainsPlug(
  definition: DefinitionRecord,
  perkHashes: Set<number>,
  plugSetDefinitions: DefinitionComponentData | undefined
): boolean {
  return (definition.sockets?.socketEntries ?? []).some((entry) => {
    if (typeof entry.singleInitialItemHash === "number" && perkHashes.has(entry.singleInitialItemHash >>> 0)) {
      return true;
    }
    if ((entry.reusablePlugItems ?? []).some((plug) => (
      typeof plug.plugItemHash === "number" && perkHashes.has(plug.plugItemHash >>> 0)
    ))) {
      return true;
    }

    return [entry.reusablePlugSetHash, entry.randomizedPlugSetHash]
      .some((plugSetHash) => plugSetContainsPlug(plugSetDefinitions, plugSetHash, perkHashes));
  });
}

function plugSetContainsPlug(
  plugSetDefinitions: DefinitionComponentData | undefined,
  plugSetHash: number | undefined,
  perkHashes: Set<number>
): boolean {
  if (!plugSetDefinitions || typeof plugSetHash !== "number") return false;
  return (plugSetDefinitions[String(plugSetHash >>> 0)]?.reusablePlugItems ?? [])
    .some((plug) => typeof plug.plugItemHash === "number" && perkHashes.has(plug.plugItemHash >>> 0));
}

function buildRelatedPlugHashes(
  sandboxPerkHashes: Iterable<number>,
  itemDefinitions: DefinitionComponentData
): Set<number> {
  const sandboxHashes = new Set([...sandboxPerkHashes].map((hash) => Number(hash) >>> 0));
  const hashes = new Set<number>(sandboxHashes);
  for (const definition of Object.values(itemDefinitions)) {
    const plugHash = Number(definition.hash);
    if (!Number.isFinite(plugHash)) continue;
    if ((definition.perks ?? []).some((perk) => (
      typeof perk.perkHash === "number" && sandboxHashes.has(perk.perkHash >>> 0)
    ))) {
      hashes.add(plugHash >>> 0);
    }
  }
  return hashes;
}

function compareRelatedDefinitions(left: DefinitionRecord, right: DefinitionRecord): number {
  const nameOrder = cleanDisplayText(left.displayProperties?.name)
    .localeCompare(cleanDisplayText(right.displayProperties?.name), "zh-Hans-CN");
  if (nameOrder !== 0) return nameOrder;
  const releaseOrder = releaseRank(right) - releaseRank(left);
  if (releaseOrder !== 0) return releaseOrder;
  return (Number(left.hash) >>> 0) - (Number(right.hash) >>> 0);
}

function releaseRank(definition: DefinitionRecord): number {
  const releaseVersion = (definition.traitIds ?? [])
    .flatMap((traitId) => /^releases\.v(\d+)/.exec(traitId)?.[1] ?? [])
    .map(Number)
    .filter(Number.isFinite)
    .sort((left, right) => right - left)[0] ?? 0;
  return releaseVersion * 1_000_000 + Number(definition.index ?? 0);
}

function isSearchableEquipmentDefinition(definition: DefinitionRecord): boolean {
  return typeof definition.itemType !== "number" || !nonEquipmentItemTypes.has(definition.itemType);
}

function cleanDisplayText(value: string | undefined): string {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function normalizeSearchText(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function normalizeBungieAssetUrl(path: string | undefined): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return new URL(path, bungieStaticBaseUrl).toString();
}
