import { evaluateLocalTargets, summarizeLocalTargetMatches, type LocalTargetRules } from "@d2-tools/core/analysis/targets";
import type { AccountItemSummary, AmmoTypeKey, EquipmentGroupKey } from "@d2-tools/core/account/summary";
import type { RecommendationCardSummary } from "@d2-tools/core/community-perks";
import type { ArmorSetCatalogItem } from "@d2-tools/core/items/equipableItemSet";
import type { ArmorStatKey } from "@d2-tools/core/loadouts/analysis";
import type { VaultTags, VaultTagValue } from "@d2-tools/core/vault/tags";

export type VaultGroupFilter = EquipmentGroupKey | "all";
export type VaultSlotFilter = string | "all";
/**
 * 槽位身份。仓库的槽位筛选、分区和排序都按它比，不再比显示名——显示名会随界面语言变，
 * 认不出的 bucket 还要回落到游戏数据语言，拿它当标识迟早对不上。
 *
 * 前 8 个是装备槽，和 `packages/core/src/account/power.ts` 的 `bucketHashToSlot` 一致；
 * 后面是仓库里能出现的其它规范桶。`hash:<n>` 是认不出的桶，`label:<名字>` 是连 bucket
 * hash 都没有的条目（沿用旧分组，不把它们并到一起）。
 */
export type VaultKnownSlotKey =
  | "kinetic"
  | "energy"
  | "power"
  | "helmet"
  | "gauntlets"
  | "chest"
  | "legs"
  | "class-item"
  | "subclass"
  | "ghost"
  | "vehicle"
  | "ship"
  | "emblem"
  | "clan-banner"
  | "finisher"
  | "emote";

export type VaultSlotKey = VaultKnownSlotKey | `hash:${number}` | `label:${string}`;
export type VaultLocationFilter = "vault" | "all" | "current_inventory" | "current_equipped" | "current_postmaster" | "other_characters";
export type VaultItemSourceKind = "equipped" | "inventory" | "vault" | "postmaster";
export type VaultLocatedItem = AccountItemSummary & {
  source_character_id?: string;
  source_kind: VaultItemSourceKind;
  source_label: string;
  /**
   * 位置名原文（`仓库` / `已装备` / `背包` / `邮政官`）和角色职业名分开给。
   *
   * `source_label` 是拼好的显示串，供剪贴板清单和验收报告这类不看界面语言的输出用；
   * 界面侧要按 `interfaceLocale` 翻译位置名，所以得拿得到零件，不能只拿拼好的那句。
   */
  source_location_label: string;
  source_character_class?: string;
  is_vault_item?: boolean;
  is_postmaster_item?: boolean;
};
export type VaultAmmoFilter = AmmoTypeKey | "all";
export type VaultCraftingFilter = "all" | "crafted" | "uncrafted";
export type VaultArmorStatFilter = ArmorStatKey | "total" | "all";
export type VaultSortKey = "recommendation" | "name" | "group" | "tier" | "power" | "armor-total" | ArmorStatKey;
export type VaultTagFilter = Exclude<VaultTagValue, "none"> | "all" | "untagged" | "noted" | "target";
export type VaultLockFilter = "all" | "locked" | "unlocked";
export type VaultRarityFilter = "all" | "legendary" | "exotic";
export type VaultGearTierFilter = "all" | "0" | "1" | "2" | "3" | "4" | "5";
export type VaultClassFilter = "all" | "titan" | "hunter" | "warlock";
export type VaultDamageFilter = "all" | "kinetic" | "arc" | "solar" | "void" | "stasis" | "strand";
export type VaultChampionFilter = "all" | "barrier" | "overload" | "unstoppable";
export type VaultArmorSetFilter = string | "all";
export type VaultViewMode = "list" | "duplicates";

export type VaultArmorStatRule = {
  stat: ArmorStatKey | "";
  min: number;
};

export type VaultFilter = {
  group: VaultGroupFilter;
  query: string;
  tag?: VaultTagFilter;
  lock?: VaultLockFilter;
  slot?: VaultSlotFilter;
  location?: VaultLocationFilter;
  currentCharacterId?: string;
  ammo?: VaultAmmoFilter;
  crafting?: VaultCraftingFilter;
  itemType?: string;
  rarity?: VaultRarityFilter;
  gearTier?: VaultGearTierFilter;
  classType?: VaultClassFilter;
  damageType?: VaultDamageFilter;
  championType?: VaultChampionFilter;
  armorSet?: VaultArmorSetFilter;
  armorStatRules?: VaultArmorStatRule[];
  frame?: string;
  tags?: VaultTags;
  localTargetRules?: LocalTargetRules | null;
};

type ParsedVaultQuery = {
  text: string;
  tag?: VaultTagFilter;
  locked?: boolean;
  type?: VaultGroupFilter;
};

export type VaultGroupSummary = {
  key: VaultGroupFilter;
  count: number;
};

export type VaultSlotSummary = {
  key: VaultSlotFilter;
  label: string;
  /** 槽位所属大类，工具栏按当前浏览的分类过滤槽位按钮。`all` 行是 `all`。 */
  group: EquipmentGroupKey | "all";
  count: number;
};

export type VaultLocationSummary = {
  key: VaultLocationFilter;
  count: number;
};

export type VaultSection = {
  /** `VaultSlotKey`，不是显示名：分区身份不能跟着界面语言变。 */
  key: string;
  label: string;
  group: EquipmentGroupKey;
  count: number;
  items: AccountItemSummary[];
};

export type VaultFrameFilter = string;

export type VaultFrameOption = {
  key: string;
  label: string;
  count: number;
};

export type VaultArmorSetOption = {
  key: string;
  label: string;
  count: number;
};

export type VaultListWorkspace = {
  armorSetFilters: VaultArmorSetOption[];
  availableFrameFilters: VaultFrameOption[];
  /** 结构化筛选事实，成句由 UI 侧按界面语言拼，见 `vaultContextFactLine`。 */
  contextFacts: VaultFilterFactToken[];
  filteredItems: AccountItemSummary[];
  groups: VaultGroupSummary[];
  localTargetMatchCount: number;
  sections: VaultSection[];
  slotFilters: VaultSlotSummary[];
};

export const vaultGroupOrder: VaultGroupFilter[] = ["all", "weapons", "armor", "equipment", "other"];
export const defaultVaultGroupTab: VaultGroupFilter = "weapons";

const visibleVaultLocationFilters: Array<Exclude<VaultLocationFilter, "all">> = [
  "vault",
  "current_inventory",
  "current_equipped",
  "current_postmaster",
  "other_characters"
];

/**
 * 护甲属性名。仓库侧已迁到 `VaultCopy.labels`，这张表只剩 `VaultTargetRulesPanel` 在用，
 * 那个组件目前是孤儿，等 S10 决定去留时一并处理。
 */
export const armorStatLabels: Record<ArmorStatKey, string> = {
  health: "生命值",
  melee: "近战",
  grenade: "手雷",
  super: "超能",
  class: "职业",
  weapon: "武器"
};

export const groupSortOrder: Record<EquipmentGroupKey, number> = {
  weapons: 0,
  armor: 1,
  equipment: 2,
  other: 3
};

export function createVaultListWorkspace(input: {
  items: AccountItemSummary[];
  armorSetCatalog?: ArmorSetCatalogItem[];
  filter: VaultFilter;
  sortKey: VaultSortKey;
  tags: VaultTags;
  localTargetRules?: LocalTargetRules | null;
}): VaultListWorkspace {
  const baseFilter = {
    ...input.filter,
    tags: input.tags,
    localTargetRules: input.localTargetRules
  };
  const availableFrameFilters = buildVaultFrameFilters(filterVaultItems(input.items, {
    ...baseFilter,
    query: "",
    frame: undefined
  }));
  const slotFilters = buildVaultSlotFilters(filterVaultItems(input.items, {
    ...baseFilter,
    query: "",
    slot: "all"
  }));
  const filteredItems = sortVaultItems(filterVaultItems(input.items, baseFilter), input.sortKey, input.tags);
  const filter = input.filter;
  const armorSetFilters = buildVaultArmorSetFilters(input.armorSetCatalog ?? [], input.items);

  return {
    armorSetFilters,
    availableFrameFilters,
    contextFacts: buildVaultContextFacts({
      group: filter.group,
      query: filter.query,
      tagFilter: filter.tag ?? "all",
      lockFilter: filter.lock ?? "all",
      slotFilter: filter.slot ?? "all",
      locationFilter: filter.location ?? "all",
      ammoFilter: filter.ammo ?? "all",
      craftingFilter: filter.crafting ?? "all",
      itemTypeFilter: filter.itemType ?? "all",
      rarityFilter: filter.rarity ?? "all",
      gearTierFilter: filter.gearTier ?? "all",
      classFilter: filter.classType ?? "all",
      damageFilter: filter.damageType ?? "all",
      armorSetFilter: filter.armorSet ?? "all",
      armorSetLabel: armorSetFilters.find((option) => option.key === filter.armorSet)?.label,
      frameFilter: filter.frame ?? "all",
      frameLabel: availableFrameFilters.find((option) => option.key === filter.frame)?.label,
      armorStatRules: filter.armorStatRules ?? []
    }),
    filteredItems,
    groups: buildVaultGroups(input.items),
    localTargetMatchCount: countLocalTargetMatches(input.items, input.localTargetRules),
    sections: buildVaultSections(filteredItems),
    slotFilters
  };
}

export function filterVaultItems(items: AccountItemSummary[], filter: VaultFilter): AccountItemSummary[] {
  const parsedQuery = parseVaultQuery(filter.query);
  const query = parsedQuery.text.toLocaleLowerCase();
  return items.filter((item) => {
    const entry = (filter.tags ?? { items: {} }).items[getVaultItemKey(item)];
    const matchesGroup = filter.group === "all" || item.group_key === filter.group;
    if (!matchesGroup) return false;
    if (!matchesTag(item, filter.tag ?? "all", filter.tags ?? { items: {} }, filter.localTargetRules)) return false;
    if (parsedQuery.tag && !matchesTag(item, parsedQuery.tag, filter.tags ?? { items: {} }, filter.localTargetRules)) return false;
    if (!matchesArmorStatRules(item, filter.armorStatRules ?? [])) return false;
    if (!matchesLock(item, filter.lock ?? "all")) return false;
    if (!matchesSlot(item, filter.slot ?? "all")) return false;
    if (!matchesLocation(item, filter.location ?? "all", filter.currentCharacterId)) return false;
    if (!matchesAmmo(item, filter.ammo ?? "all")) return false;
    if (!matchesItemType(item, filter.itemType ?? "all")) return false;
    if (!matchesRarity(item, filter.rarity ?? "all")) return false;
    if (!matchesGearTier(item, filter.gearTier ?? "all")) return false;
    if (!matchesClass(item, filter.classType ?? "all")) return false;
    if (!matchesDamage(item, filter.damageType ?? "all")) return false;
    if (!matchesChampion(item, filter.championType ?? "all")) return false;
    if (!matchesCrafting(item, filter.crafting ?? "all")) return false;
    if (!matchesArmorSet(item, filter.armorSet ?? "all")) return false;
    if (!matchesFrame(item, filter.frame ?? "all")) return false;
    if (parsedQuery.locked !== undefined && item.locked !== parsedQuery.locked) return false;
    if (parsedQuery.type && parsedQuery.type !== "all" && item.group_key !== parsedQuery.type) return false;
    if (!query) return true;

    return [
      String(item.hash),
      item.name,
      item.item_type,
      item.tier,
      item.bucket_name,
      item.equipment_bucket_name,
      getVaultItemLocationLabel(item),
      item.armor_set?.name,
      item.weapon_frame?.name,
      formatArmorStatsInline(item),
      tierAlias(item.tier),
      entry?.note
    ]
      .filter(Boolean)
      .some((value) => value?.toLocaleLowerCase().includes(query));
  });
}

function matchesChampion(item: AccountItemSummary, filter: VaultChampionFilter): boolean {
  if (filter === "all") return true;
  return item.breaker_type?.champion_type === filter;
}

export function parseVaultQuery(query: string): ParsedVaultQuery {
  const textParts: string[] = [];
  const parsed: ParsedVaultQuery = { text: "" };
  for (const token of query.trim().split(/\s+/).filter(Boolean)) {
    const lower = token.toLocaleLowerCase();
    if (lower.startsWith("tag:")) {
      const tag = lower.slice("tag:".length);
      if (isVaultTagFilter(tag)) {
        parsed.tag = tag;
        continue;
      }
    }
    if (lower.startsWith("locked:")) {
      const value = lower.slice("locked:".length);
      if (value === "true" || value === "yes" || value === "已锁定") {
        parsed.locked = true;
        continue;
      }
      if (value === "false" || value === "no" || value === "未锁定") {
        parsed.locked = false;
        continue;
      }
    }
    if (lower.startsWith("type:")) {
      const type = typeFilterFor(lower.slice("type:".length));
      if (type) {
        parsed.type = type;
        continue;
      }
    }
    textParts.push(token);
  }
  parsed.text = textParts.join(" ").trim();
  return parsed;
}

export function buildVaultGroups(items: AccountItemSummary[]): VaultGroupSummary[] {
  return vaultGroupOrder.map((key) => ({
    key,
    count: key === "all" ? items.length : items.filter((item) => item.group_key === key).length
  }));
}

export function buildVaultSlotFilters(items: AccountItemSummary[]): VaultSlotSummary[] {
  const sections = buildVaultSections(items);
  // 顺序沿用 `buildVaultSections` 的固定槽位次序（`slotRank`），**不按件数排**：
  // 筛选按钮的位置不该随库存数量变来变去，武器三槽也必须是动能 → 能量 → 威能。
  return [
    { key: "all", label: "全部位置", group: "all", count: items.length },
    ...sections.map((section) => ({
      key: section.key,
      label: section.label,
      group: section.group,
      count: section.count
    }))
  ];
}

export function buildVaultLocationFilters(
  items: readonly AccountItemSummary[],
  currentCharacterId?: string
): VaultLocationSummary[] {
  const counts = new Map<Exclude<VaultLocationFilter, "all">, number>(
    visibleVaultLocationFilters.map((key) => [key, 0])
  );
  for (const item of items) {
    if (item.group_key !== "weapons") continue;
    const location = visibleVaultLocationForItem(item, currentCharacterId);
    if (!location) continue;
    counts.set(location, (counts.get(location) ?? 0) + 1);
  }
  return visibleVaultLocationFilters
    .map((key, index) => ({
      key,
      count: counts.get(key) ?? 0,
      order: index
    }))
    .sort((left, right) => right.count - left.count || left.order - right.order)
    .map((option) => ({ key: option.key, count: option.count }));
}

export function buildVaultFrameFilters(items: AccountItemSummary[]): VaultFrameOption[] {
  const frameCounts = new Map<string, VaultFrameOption>();

  for (const item of items) {
    if (!item.weapon_frame) continue;
    const current = frameCounts.get(item.weapon_frame.key) ?? {
      key: item.weapon_frame.key,
      label: item.weapon_frame.name,
      count: 0
    };
    current.count += 1;
    frameCounts.set(item.weapon_frame.key, current);
  }

  return [...frameCounts.values()].sort((left, right) => right.count - left.count || compareText(left.label, right.label));
}

export function buildVaultArmorSetFilters(
  catalog: ArmorSetCatalogItem[],
  items: AccountItemSummary[]
): VaultArmorSetOption[] {
  const heldCounts = new Map<string, number>();

  for (const item of items) {
    if (item.group_key !== "armor" || !item.armor_set) continue;
    const key = String(item.armor_set.hash);
    heldCounts.set(key, (heldCounts.get(key) ?? 0) + 1);
  }

  const options = new Map<string, VaultArmorSetOption>();
  for (const item of catalog) {
    const hash = Number(item.hash);
    const label = item.name.trim();
    if (!Number.isFinite(hash) || !label) continue;
    const key = String(hash >>> 0);
    if (!options.has(key)) {
      options.set(key, { key, label, count: heldCounts.get(key) ?? 0 });
    }
  }

  return [...options.values()].sort((left, right) => right.count - left.count || compareText(left.label, right.label) || left.key.localeCompare(right.key));
}

export function buildVaultSections(items: AccountItemSummary[]): VaultSection[] {
  const sectionMap = new Map<string, VaultSection>();
  for (const item of items) {
    const key = getAccountItemSlotKey(item);
    const section = sectionMap.get(key) ?? {
      key,
      label: getAccountItemSlotLabel(item),
      group: item.group_key,
      count: 0,
      items: []
    };
    section.items.push(item);
    section.count = section.items.length;
    sectionMap.set(key, section);
  }

  return [...sectionMap.values()].sort(compareVaultSections);
}

export function sortVaultItems(
  items: AccountItemSummary[],
  sortKey: VaultSortKey,
  tags: VaultTags = { items: {} },
  recommendationSummaries?: ReadonlyMap<string, RecommendationCardSummary>
): AccountItemSummary[] {
  void tags;
  return [...items].sort((left, right) => {
    if (sortKey === "recommendation") {
      return compareRecommendationWeight(left, right, recommendationSummaries)
        || compareVaultItemIdentity(left, right);
    }

    if (sortKey === "power") {
      return (right.power ?? 0) - (left.power ?? 0)
        || compareVaultItemIdentity(left, right);
    }

    if (isArmorStatSortKey(sortKey)) {
      return armorStatValue(right, sortKey) - armorStatValue(left, sortKey)
        || compareVaultItemIdentity(left, right);
    }

    if (sortKey === "group") {
      return groupSortOrder[left.group_key] - groupSortOrder[right.group_key]
        || compareVaultItemIdentity(left, right);
    }

    if (sortKey === "tier") {
      return tierRank(left.tier) - tierRank(right.tier)
        || compareVaultItemIdentity(left, right);
    }

    return compareVaultItemIdentity(left, right);
  });
}

/**
 * 推荐权重只消费扫描生成的轻量摘要，保证仓库列表不会为排序重新读取完整规则。
 * 优先级状态先于来源状态；同级再比较命中率、命中数和部分命中数。
 */
function compareRecommendationWeight(
  left: AccountItemSummary,
  right: AccountItemSummary,
  summaries?: ReadonlyMap<string, RecommendationCardSummary>
): number {
  const leftSummary = recommendationSummaryForItem(left, summaries);
  const rightSummary = recommendationSummaryForItem(right, summaries);
  const stateDifference = recommendationStateRank(leftSummary) - recommendationStateRank(rightSummary);
  if (stateDifference) return stateDifference;

  const sourceDifference = recommendationSourceRank(leftSummary) - recommendationSourceRank(rightSummary);
  if (sourceDifference) return sourceDifference;

  const leftRatio = recommendationMatchRatio(leftSummary);
  const rightRatio = recommendationMatchRatio(rightSummary);
  const ratioDifference = rightRatio - leftRatio;
  if (ratioDifference) return ratioDifference;

  const matchedDifference = (rightSummary?.matched ?? 0) - (leftSummary?.matched ?? 0);
  if (matchedDifference) return matchedDifference;

  const partialDifference = (rightSummary?.partial ?? 0) - (leftSummary?.partial ?? 0);
  if (partialDifference) return partialDifference;

  return (rightSummary?.available ?? 0) - (leftSummary?.available ?? 0);
}

function recommendationMatchRatio(summary?: RecommendationCardSummary): number {
  if (!summary || summary.available <= 0) return 0;
  return summary.matched / summary.available;
}

function recommendationSummaryForItem(
  item: AccountItemSummary,
  summaries?: ReadonlyMap<string, RecommendationCardSummary>
): RecommendationCardSummary | undefined {
  if (!summaries) return undefined;
  return summaries.get(item.instance_id ?? `hash:${item.hash}`);
}

function recommendationStateRank(summary?: RecommendationCardSummary): number {
  if (!summary) return 3;
  if (summary.recommendation_state === "priority") return 0;
  if (summary.recommendation_state === "compare") return 1;
  return 2;
}

function recommendationSourceRank(summary?: RecommendationCardSummary): number {
  if (!summary?.sources.length) return 99;
  // 只看命中程度；不再把来源类型折算成权重。
  return summary.sources.reduce((best, source) => Math.min(
    best,
    recommendationSourceStateRank(source.state)
  ), 99);
}

function recommendationSourceStateRank(state: RecommendationCardSummary["sources"][number]["state"]): number {
  if (state === "full") return 0;
  if (state === "core") return 1;
  if (state === "close" || state === "weapon_only") return 2;
  if (state === "key_missing" || state === "not_matched") return 3;
  return 4;
}


/**
 * 名称相同（同一把武器的多个实例）时按实例 ID 固定次序，
 * 保证取出等账号操作后同名卡片不互换位置。
 */
function compareVaultItemIdentity(left: AccountItemSummary, right: AccountItemSummary): number {
  return compareText(left.name, right.name)
    || compareText(left.instance_id, right.instance_id);
}

export function countLocalTargetMatches(items: AccountItemSummary[], rules?: LocalTargetRules | null): number {
  return summarizeLocalTargetMatches(items.map(normalizeCoreItem), rules ?? undefined).matched_count;
}

/**
 * 筛选摘要的一个片段。
 *
 * `packages/app` 不认识界面语言，所以这里只给「是哪一个筛选项、值是什么」，
 * 措辞和成句交给 UI 按 `copy` 现算。
 */
export type VaultFilterFactToken =
  | { kind: "group"; group: VaultGroupFilter }
  | { kind: "query_tag"; tag: VaultTagFilter; group: VaultGroupFilter }
  | { kind: "query_locked"; locked: boolean }
  | { kind: "query_type"; group: VaultGroupFilter }
  | { kind: "query_text"; text: string }
  | { kind: "tag"; tag: VaultTagFilter; group: VaultGroupFilter }
  | { kind: "lock"; lock: VaultLockFilter }
  | { kind: "slot"; label: string }
  | { kind: "location"; location: VaultLocationFilter }
  | { kind: "ammo"; ammo: VaultAmmoFilter }
  | { kind: "crafting"; crafting: VaultCraftingFilter }
  | { kind: "itemType"; value: string }
  | { kind: "rarity"; rarity: VaultRarityFilter }
  | { kind: "gearTier"; tier: VaultGearTierFilter }
  | { kind: "class"; className: VaultClassFilter }
  | { kind: "damage"; damage: VaultDamageFilter }
  | { kind: "armorSet"; label: string }
  | { kind: "frame"; label: string }
  | { kind: "armorStats"; count: number };

export function buildVaultContextFacts(input: {
  group: VaultGroupFilter;
  query: string;
  tagFilter: VaultTagFilter;
  lockFilter: VaultLockFilter;
  slotFilter: VaultSlotFilter;
  /** `VaultSlotFilter` 现在是槽位键，摘要串要显示名时由 UI 侧查表后传进来。 */
  slotLabel?: string;
  locationFilter?: VaultLocationFilter;
  ammoFilter: VaultAmmoFilter;
  craftingFilter?: VaultCraftingFilter;
  itemTypeFilter?: string;
  rarityFilter?: VaultRarityFilter;
  gearTierFilter?: VaultGearTierFilter;
  classFilter?: VaultClassFilter;
  damageFilter?: VaultDamageFilter;
  armorSetFilter?: VaultArmorSetFilter;
  armorSetLabel?: string;
  frameFilter: VaultFrameFilter;
  frameLabel?: string;
  armorStatRules: VaultArmorStatRule[];
}): VaultFilterFactToken[] {
  const parsedQuery = parseVaultQuery(input.query);
  return [
    { kind: "group", group: input.group },
    ...(parsedQuery.tag ? [{ kind: "query_tag" as const, tag: parsedQuery.tag, group: input.group }] : []),
    ...(parsedQuery.locked !== undefined ? [{ kind: "query_locked" as const, locked: parsedQuery.locked }] : []),
    ...(parsedQuery.type ? [{ kind: "query_type" as const, group: parsedQuery.type }] : []),
    ...(parsedQuery.text.trim() ? [{ kind: "query_text" as const, text: parsedQuery.text.trim() }] : []),
    ...(input.tagFilter !== "all" ? [{ kind: "tag" as const, tag: input.tagFilter, group: input.group }] : []),
    ...(input.lockFilter !== "all" ? [{ kind: "lock" as const, lock: input.lockFilter }] : []),
    ...(input.slotFilter !== "all" ? [{ kind: "slot" as const, label: input.slotLabel ?? input.slotFilter }] : []),
    ...(input.locationFilter && input.locationFilter !== "all"
      ? [{ kind: "location" as const, location: input.locationFilter }]
      : []),
    ...(input.ammoFilter !== "all" ? [{ kind: "ammo" as const, ammo: input.ammoFilter }] : []),
    ...(input.craftingFilter && input.craftingFilter !== "all"
      ? [{ kind: "crafting" as const, crafting: input.craftingFilter }]
      : []),
    ...(input.itemTypeFilter && input.itemTypeFilter !== "all"
      ? [{ kind: "itemType" as const, value: input.itemTypeFilter }]
      : []),
    ...(input.rarityFilter && input.rarityFilter !== "all"
      ? [{ kind: "rarity" as const, rarity: input.rarityFilter }]
      : []),
    ...(input.gearTierFilter && input.gearTierFilter !== "all"
      ? [{ kind: "gearTier" as const, tier: input.gearTierFilter }]
      : []),
    ...(input.classFilter && input.classFilter !== "all"
      ? [{ kind: "class" as const, className: input.classFilter }]
      : []),
    ...(input.damageFilter && input.damageFilter !== "all"
      ? [{ kind: "damage" as const, damage: input.damageFilter }]
      : []),
    ...(input.armorSetFilter && input.armorSetFilter !== "all"
      ? [{ kind: "armorSet" as const, label: input.armorSetLabel ?? input.armorSetFilter }]
      : []),
    ...(input.frameFilter && input.frameFilter !== "all"
      ? [{ kind: "frame" as const, label: input.frameLabel ?? input.frameFilter }]
      : []),
    ...(input.armorStatRules.length ? [{ kind: "armorStats" as const, count: input.armorStatRules.length }] : [])
  ];
}

export function getVaultItemKey(item: AccountItemSummary): string {
  return item.instance_id ?? `hash:${item.hash}`;
}

/** 和 `@d2-tools/core` 的 `bucketLabels` 同一批 hash，键名对齐 `bucketHashToSlot` 的写法。 */
const vaultSlotKeyByBucketHash: Record<number, VaultSlotKey> = {
  1498876634: "kinetic",
  2465295065: "energy",
  953998645: "power",
  3448274439: "helmet",
  3551918588: "gauntlets",
  14239492: "chest",
  20886954: "legs",
  1585787867: "class-item",
  3284755031: "subclass",
  4023194814: "ghost",
  2025709351: "vehicle",
  284967655: "ship",
  4274335291: "emblem",
  4292445962: "clan-banner",
  3683254069: "finisher",
  1107761855: "emote"
};

export function getAccountItemSlotKey(item: AccountItemSummary): VaultSlotKey {
  const hash = item.equipment_bucket_hash;
  if (typeof hash === "number") {
    return vaultSlotKeyByBucketHash[hash] ?? `hash:${hash}`;
  }
  // 没有 bucket hash 的条目沿用旧的分组（按名字），不为它们凭空造一个桶。
  return `label:${getAccountItemSlotLabel(item)}`;
}

export function getAccountItemSlotLabel(item: AccountItemSummary): string {
  return item.equipment_bucket_name?.trim() || item.bucket_name?.trim() || inferOtherSlotName(item);
}

export function getVaultItemLocationLabel(item: AccountItemSummary): string {
  return isVaultLocatedItem(item) ? item.source_label : "仓库";
}

function formatArmorStatsInline(item: AccountItemSummary): string | undefined {
  if (!item.armor_stats) {
    return undefined;
  }

  return [
    `总值 ${item.armor_stats.total}`,
    `生命值 ${item.armor_stats.health}`,
    `职业 ${item.armor_stats.class}`,
    `手雷 ${item.armor_stats.grenade}`
  ].join(" / ");
}

export function normalizeCoreItem(item: AccountItemSummary): AccountItemSummary & { socket_plugs: NonNullable<AccountItemSummary["socket_plugs"]> } {
  return {
    ...item,
    socket_plugs: item.socket_plugs ?? []
  };
}

function matchesTag(
  item: AccountItemSummary,
  tag: VaultTagFilter,
  tags: VaultTags,
  localTargetRules?: LocalTargetRules | null
): boolean {
  if (tag === "all") {
    return true;
  }

  const itemTag = tags.items[getVaultItemKey(item)]?.tag;
  if (tag === "target") {
    return evaluateLocalTargets(normalizeCoreItem(item), localTargetRules ?? undefined).matched;
  }
  if (tag === "untagged") {
    return !itemTag;
  }
  if (tag === "noted") {
    return Boolean(tags.items[getVaultItemKey(item)]?.note);
  }

  return itemTag === tag;
}

function matchesArmorStatRules(item: AccountItemSummary, rules: VaultArmorStatRule[]): boolean {
  const activeRules = rules
    .map((rule) => ({
      stat: rule.stat,
      min: Number(rule.min)
    }))
    .filter((rule): rule is { stat: ArmorStatKey; min: number } =>
      isArmorStatKey(rule.stat) && Number.isFinite(rule.min)
    );

  if (!activeRules.length) {
    return true;
  }
  if (!item.armor_stats) {
    return false;
  }

  const stats = item.armor_stats;
  return activeRules.every((rule) => stats[rule.stat] >= rule.min);
}

function armorStatValue(item: AccountItemSummary, key: Exclude<VaultArmorStatFilter, "all"> | VaultSortKey): number {
  if (!item.armor_stats) {
    return 0;
  }
  if (key === "armor-total" || key === "total") {
    return item.armor_stats.total;
  }
  if (isArmorStatKey(key)) {
    return item.armor_stats[key];
  }
  return 0;
}

function isArmorStatSortKey(key: VaultSortKey): key is "armor-total" | ArmorStatKey {
  return key === "armor-total" || isArmorStatKey(key);
}

function isArmorStatKey(value: string): value is ArmorStatKey {
  return value === "health"
    || value === "melee"
    || value === "grenade"
    || value === "super"
    || value === "class"
    || value === "weapon";
}

function isVaultTagFilter(value: string): value is VaultTagFilter {
  return value === "all" || value === "keep" || value === "review" || value === "junk"
    || value === "farm" || value === "loadout"
    || value === "untagged" || value === "noted" || value === "target";
}

function typeFilterFor(value: string): VaultGroupFilter | undefined {
  if (value === "weapon" || value === "weapons" || value === "武器") return "weapons";
  if (value === "armor" || value === "护甲") return "armor";
  if (value === "equipment" || value === "装备") return "equipment";
  if (value === "other" || value === "其他") return "other";
  if (value === "all" || value === "全部") return "all";
  return undefined;
}

function matchesLock(item: AccountItemSummary, lock: VaultLockFilter): boolean {
  if (lock === "all") {
    return true;
  }
  if (lock === "locked") {
    return item.locked === true;
  }

  return item.locked === false;
}

function matchesSlot(item: AccountItemSummary, slot: VaultSlotFilter): boolean {
  return slot === "all" || getAccountItemSlotKey(item) === slot;
}

function matchesLocation(
  item: AccountItemSummary,
  location: VaultLocationFilter,
  currentCharacterId?: string
): boolean {
  if (location === "all") return true;
  const sourceKind = isVaultLocatedItem(item) ? item.source_kind : "vault";
  const sourceCharacterId = isVaultLocatedItem(item) ? item.source_character_id : undefined;
  if (location === "vault") return sourceKind === "vault";
  if (location === "current_inventory") {
    return sourceKind === "inventory" && sourceCharacterId === currentCharacterId;
  }
  if (location === "current_equipped") {
    return sourceKind === "equipped" && sourceCharacterId === currentCharacterId;
  }
  if (location === "current_postmaster") {
    return sourceKind === "postmaster" && sourceCharacterId === currentCharacterId;
  }
  return sourceKind !== "vault" && Boolean(sourceCharacterId) && sourceCharacterId !== currentCharacterId;
}

function visibleVaultLocationForItem(
  item: AccountItemSummary,
  currentCharacterId?: string
): Exclude<VaultLocationFilter, "all"> | undefined {
  const sourceKind = isVaultLocatedItem(item) ? item.source_kind : "vault";
  const sourceCharacterId = isVaultLocatedItem(item) ? item.source_character_id : undefined;
  if (sourceKind === "vault") return "vault";
  if (sourceCharacterId !== currentCharacterId) {
    return sourceCharacterId ? "other_characters" : undefined;
  }
  if (sourceKind === "equipped") return "current_equipped";
  if (sourceKind === "postmaster") return "current_postmaster";
  return sourceKind === "inventory" ? "current_inventory" : undefined;
}

export function isVaultLocatedItem(item: AccountItemSummary): item is VaultLocatedItem {
  return "source_kind" in item && typeof item.source_kind === "string" && "source_label" in item;
}

function matchesAmmo(item: AccountItemSummary, ammo: VaultAmmoFilter): boolean {
  return ammo === "all" || item.ammo_type === ammo;
}

function matchesItemType(item: AccountItemSummary, itemType: string): boolean {
  return itemType === "all" || item.item_type === itemType;
}

function matchesRarity(item: AccountItemSummary, rarity: VaultRarityFilter): boolean {
  if (rarity === "all") return true;
  const tier = item.tier?.trim().toLocaleLowerCase();
  if (rarity === "legendary") return tier === "legendary" || tier === "传说";
  return tier === "exotic" || tier === "异域";
}

function matchesGearTier(item: AccountItemSummary, gearTier: VaultGearTierFilter): boolean {
  return gearTier === "all" || String(item.instance?.gear_tier ?? 0) === gearTier;
}

function matchesClass(item: AccountItemSummary, classType: VaultClassFilter): boolean {
  if (classType === "all") return true;
  const expectedClassType = classType === "titan" ? 0 : classType === "hunter" ? 1 : 2;
  return item.class_type === expectedClassType;
}

function matchesDamage(item: AccountItemSummary, damageType: VaultDamageFilter): boolean {
  if (damageType === "all") return true;
  return damageTypeForItem(item) === damageType;
}

function matchesCrafting(item: AccountItemSummary, crafting: VaultCraftingFilter): boolean {
  if (crafting === "all") return true;
  const isCrafted = item.crafting?.kind === "crafted";
  return crafting === "crafted" ? isCrafted : !isCrafted;
}

function matchesArmorSet(item: AccountItemSummary, armorSet: VaultArmorSetFilter): boolean {
  return armorSet === "all" || String(item.armor_set?.hash ?? "") === armorSet;
}

function matchesFrame(item: AccountItemSummary, frame: string): boolean {
  return !frame || frame === "all" || item.weapon_frame?.key === frame;
}

function damageTypeForItem(item: AccountItemSummary): Exclude<VaultDamageFilter, "all"> | undefined {
  switch (item.instance?.damage_type) {
    case 1: return "kinetic";
    case 2: return "arc";
    case 3: return "solar";
    case 4: return "void";
    case 6: return "stasis";
    case 7: return "strand";
    default: return undefined;
  }
}

function compareVaultSections(left: VaultSection, right: VaultSection): number {
  return slotRank(left.key, left.label) - slotRank(right.key, right.label)
    || left.label.localeCompare(right.label, "zh-Hans-CN");
}

const vaultSlotOrder = [
  "kinetic",
  "energy",
  "power",
  "helmet",
  "gauntlets",
  "chest",
  "legs",
  "class-item",
  "subclass",
  "ghost",
  "ship",
  "vehicle",
  "emblem",
  "clan-banner",
  "finisher",
  "emote"
];

/** `vaultSlotOrder` 那批槽位的中文显示名，一一对应。给没有 bucket hash 的条目兜底用。 */
const vaultSlotLabelOrder = [
  "动能武器",
  "能量武器",
  "威能武器",
  "头盔",
  "臂铠",
  "胸甲",
  "腿甲",
  "职业物品",
  "职业分支",
  "机灵",
  "飞船",
  "载具",
  "徽标",
  "公会战旗",
  "终结技",
  "动作"
];

/** 没有 bucket hash 的条目没有槽位键可言，沿用旧次序，别让它们的相对顺序跟着变。 */
const untrackedSlotOrder = [
  "记忆水晶",
  "任务与追踪",
  "材料与货币",
  "消耗品",
  "模组与外观",
  "收藏与纪念",
  "未识别物品"
];

/** 已知槽位按固定次序排；认不出的桶排在它们之后，组内再按显示名比。 */
function slotRank(key: string, label: string): number {
  const slotIndex = vaultSlotOrder.indexOf(key);
  if (slotIndex !== -1) return slotIndex;
  // `label:<名字>` 的条目只有显示名能认槽位。不给它们按名字兜底，这批会被拼音序打散，
  // 「能量武器 → 威能武器 → 头盔」变成「能量武器 → 头盔 → 威能武器」。
  const labelIndex = vaultSlotLabelOrder.indexOf(label);
  if (labelIndex !== -1) return labelIndex;
  const untrackedIndex = untrackedSlotOrder.indexOf(label);
  return vaultSlotOrder.length + (untrackedIndex === -1 ? untrackedSlotOrder.length : untrackedIndex);
}

function inferOtherSlotName(item: AccountItemSummary): string {
  const type = item.item_type?.trim() ?? "";
  const name = item.name.trim();
  const text = `${type} ${name}`.toLowerCase();

  if (name.includes("记忆水晶") || text.includes("engram")) {
    return "记忆水晶";
  }
  if (includesAny(text, ["任务", "悬赏", "追踪", "证章", "行动", "召唤", "quest", "bounty"])) {
    return "任务与追踪";
  }
  if (includesAny(text, ["货币", "材料", "核心", "硬币", "水晶", "碎片", "currency", "material"])) {
    return "材料与货币";
  }
  if (includesAny(text, ["消耗品", "加成", "礼物", "钥匙", "consumable", "boost", "gift", "key"])) {
    return "消耗品";
  }
  if (includesAny(text, ["模组", "着色器", "皮肤", "投影", "mod", "shader", "ornament", "projection"])) {
    return "模组与外观";
  }
  if (includesAny(text, ["传承", "信条", "纪念", "收藏", "legacy", "collectible", "memento"])) {
    return "收藏与纪念";
  }
  return "未识别物品";
}

function includesAny(value: string, patterns: string[]): boolean {
  return patterns.some((pattern) => value.includes(pattern));
}

function tierAlias(tier: string | undefined): string | undefined {
  if (!tier) return undefined;
  if (tier.toLocaleLowerCase() === "exotic") return "异域";
  if (tier.toLocaleLowerCase() === "legendary") return "传说";
  return undefined;
}

function tierRank(tier: string | undefined): number {
  const normalized = tier?.toLocaleLowerCase();
  if (normalized === "exotic") return 0;
  if (normalized === "legendary") return 1;
  if (normalized === "rare") return 2;
  return 3;
}

function compareText(left: string | undefined, right: string | undefined): number {
  return (left ?? "").localeCompare(right ?? "", "zh-Hans-CN");
}
