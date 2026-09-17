import {
  summarizeItemPerks,
  type ItemPlugSummary
} from "@d2-tools/core/items/perks";
import { classifyWeaponRollSocket } from "@d2-tools/core/account/summary";
import {
  isRecommendationRequirementSlot,
  type DimWishlistDiagnosticSlot,
  type DimWishlistPerkDiagnostic,
  type PerkRef,
  type SourceOptions
} from "@d2-tools/core/community-perks";

/**
 * 「一条 DIM 规则里的每个 perk 落在这把枪的哪一栏」的**唯一一份**判定。
 *
 * 读取期（`dimWishlistSource.ts`）与导入期校验（`dimWishlistValidation.ts`）都读这里。
 * 这两处过去各写一份的话，就会出现「导入时认为这行没问题、读取时归不到栏」这类
 * 只在改一方的时候才暴露的分叉——T56 反复踩的正是同一个坑。
 */

type SlotCatalogEntry = {
  hash: number;
  name: string;
  slot: DimWishlistDiagnosticSlot;
};

export type DimWishlistRequirement = {
  slot: string;
  hashes: number[];
  name: string;
};

export type DiagnosedDimWishlistRule<T> = {
  rule: T;
  diagnostics: DimWishlistPerkDiagnostic[];
  requirements: DimWishlistRequirement[];
};

/**
 * 逐条诊断规则里的 perk。
 *
 * `options` 就是读取期那份来源选项：定义池覆盖不到这把武器时目录为空，
 * 每个 perk 都会落成 `unknown_slot`——导入期据此**必须放行而不是判笔误**，
 * 否则资料库缺一把枪就会把整份文件判没。
 */
export function diagnoseDimWishlistRules<T extends { perk_hashes: number[] }>(
  itemHash: number,
  rules: readonly T[],
  options: SourceOptions
): { evaluated: Array<DiagnosedDimWishlistRule<T>>; perkHashToRef: Map<number, PerkRef> } {
  const perkHashToRef = buildPerkRefMap(itemHash, options, rules);
  const slotCatalog = buildWeaponSlotCatalog(itemHash, options);
  const evaluated = rules.map((rule) => {
    const diagnostics = diagnoseDimWishlistRule(rule.perk_hashes, perkHashToRef, slotCatalog);
    const requirements = diagnostics.map((perk) => ({
      slot: perk.slot_candidates[0] ?? "special",
      hashes: perk.resolved_hashes?.length ? perk.resolved_hashes : [perk.resolved_hash ?? perk.original_hash],
      name: perk.name
    }));
    return { rule, diagnostics, requirements };
  });
  return { evaluated, perkHashToRef };
}

/**
 * 归约判据的输入：每条规则落在**标准栏位**上的要求（`{slot, hashes}`）。
 * 非标准栏位（`special` / `unknown`）不参与归约——它们不是「每栏任选其一」里的一栏。
 */
export function dimColumnRequirementSets(
  evaluated: ReadonlyArray<DiagnosedDimWishlistRule<unknown>>
): Array<Array<{ slot: string; hashes: number[] }>> {
  return evaluated.map(({ requirements }) => (
    requirements
      .filter((requirement) => isRecommendationRequirementSlot(requirement.slot))
      .map((requirement) => ({ slot: requirement.slot, hashes: requirement.hashes }))
  ));
}

/** 这把枪的定义在资料库里的目录是不是空的——空目录表示「无法判定」，不是「全是错的」。 */
export function hasWeaponSlotCatalog(itemHash: number, options: SourceOptions): boolean {
  return buildWeaponSlotCatalog(itemHash, options).length > 0;
}

function buildWeaponSlotCatalog(itemHash: number, options: SourceOptions): SlotCatalogEntry[] {
  const weaponDefinition = options.itemDefinitions?.[String(itemHash)];
  if (!weaponDefinition || !options.itemDefinitions) return [];
  const groups = summarizeItemPerks(weaponDefinition, options.itemDefinitions, {
    plugSetDefinitions: options.plugSetDefinitions,
    maxPlugsPerSocket: null
  }).sort((left, right) => left.socket_index - right.socket_index);
  let traitIndex = 0;
  return groups.flatMap((group) => {
    const role = classifyWeaponRollSocket(group.plugs.map((plug) => ({
      hash: plug.hash,
      name: plug.name,
      ...(plug.category_identifier ? { category_identifier: plug.category_identifier } : {}),
      ...(plug.item_type ? { item_type: plug.item_type } : {}),
      selected: false
    })));
    const slot: DimWishlistDiagnosticSlot = role === "trait"
      ? (++traitIndex === 1 ? "perk1" : traitIndex === 2 ? "perk2" : "special")
      : role === "other"
        ? "special"
        : role ?? "special";
    return group.plugs.map((plug) => ({ hash: plug.hash, name: plug.name, slot }));
  });
}

function diagnoseDimWishlistRule(
  perkHashes: number[],
  perkRefs: Map<number, PerkRef>,
  catalog: SlotCatalogEntry[]
): DimWishlistPerkDiagnostic[] {
  return perkHashes.map((hash): DimWishlistPerkDiagnostic => {
    const sourceName = perkRefs.get(hash)?.name ?? String(hash);
    const exactHashMatches = catalog.filter((entry) => entry.hash === hash);
    const nameMatches = exactHashMatches.length
      ? exactHashMatches
      : catalog.filter((entry) => normalizeComparableName(entry.name) === normalizeComparableName(sourceName));
    const slots = [...new Set(nameMatches.map((entry) => entry.slot))];
    const resolvedHashes = [...new Set(nameMatches.map((entry) => entry.hash))];
    if (!slots.length) {
      return {
        original_hash: hash,
        name: sourceName,
        slot_candidates: ["unknown"],
        status: "unknown_slot"
      };
    }
    if (slots.length > 1) {
      return {
        original_hash: hash,
        name: sourceName,
        slot_candidates: slots,
        status: "cross_slot_ambiguous"
      };
    }
    if (slots[0] === "special") {
      return {
        original_hash: hash,
        resolved_hash: resolvedHashes[0],
        resolved_hashes: resolvedHashes,
        name: sourceName,
        slot_candidates: slots,
        status: "special_socket"
      };
    }
    return {
      original_hash: hash,
      resolved_hash: resolvedHashes[0],
      resolved_hashes: resolvedHashes,
      name: sourceName,
      slot_candidates: slots,
      status: "exact"
    };
  });
}

function normalizeComparableName(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/[\p{P}\p{Z}\s]+/gu, "");
}

export function buildPerkRefMap(
  itemHash: number,
  options: SourceOptions,
  rules: ReadonlyArray<{ perk_hashes: number[] }>
): Map<number, PerkRef> {
  const map = new Map<number, PerkRef>();
  const allHashes = new Set(rules.flatMap((rule) => rule.perk_hashes));
  if (options.itemDefinitions && allHashes.size > 0) {
    const weaponDef = options.itemDefinitions[String(itemHash)];
    if (weaponDef) {
      const perkGroups = summarizeItemPerks(weaponDef, options.itemDefinitions, { plugSetDefinitions: options.plugSetDefinitions, maxPlugsPerSocket: 24 });
      for (const plug of perkGroups.flatMap((group) => group.plugs) as ItemPlugSummary[]) {
        if (allHashes.has(plug.hash)) map.set(plug.hash, { hash: plug.hash, name: plug.name, description: plug.description, icon: plug.icon });
      }
    }
    for (const hash of allHashes) {
      if (map.has(hash)) continue;
      const definition = options.itemDefinitions[String(hash)];
      const name = definition?.displayProperties?.name?.trim();
      if (!name) continue;
      map.set(hash, {
        hash,
        name,
        ...(definition.displayProperties?.description ? { description: definition.displayProperties.description } : {}),
        ...(definition.displayProperties?.icon ? { icon: definition.displayProperties.icon } : {})
      });
    }
  }
  if (options.englishItemDefinitions && allHashes.size > 0) {
    for (const hash of allHashes) {
      const englishName = options.englishItemDefinitions[String(hash)]?.displayProperties?.name?.trim();
      if (englishName) map.set(hash, { ...(map.get(hash) ?? { hash, name: String(hash) }), englishName });
    }
  }
  for (const hash of allHashes) if (!map.has(hash)) map.set(hash, { hash, name: String(hash) });
  return map;
}

/** 武器在定义池里的显示名；查不到就返回空串（不拿 Hash 冒充名字）。 */
export function weaponDisplayName(itemHash: number, options: SourceOptions): string {
  return options.itemDefinitions?.[String(itemHash)]?.displayProperties?.name?.trim() ?? "";
}

/**
 * Perk 在定义池里的显示名。查不到时**返回 Hash 本身**——这里的场景是「把这个 perk 指给用户看，
 * 让他去改文件」，写错的 Hash 正是他需要看到的东西，空着反而没法定位。
 */
export function perkDisplayName(perkHash: number, options: SourceOptions): string {
  return options.itemDefinitions?.[String(perkHash)]?.displayProperties?.name?.trim() ?? String(perkHash);
}
