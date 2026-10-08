import type { ArmorStatKey } from "@d2-tools/core/loadouts/analysis";
import type {
  VaultAmmoFilter,
  VaultArmorSetFilter,
  VaultArmorStatRule,
  VaultChampionFilter,
  VaultClassFilter,
  VaultCraftingFilter,
  VaultDamageFilter,
  VaultFrameFilter,
  VaultGearTierFilter,
  VaultGroupFilter,
  VaultLocationFilter,
  VaultLockFilter,
  VaultRarityFilter,
  VaultSlotFilter,
  VaultSortKey,
  VaultTagFilter
} from "@d2-tools/app/vault";
import type {
  VaultRecommendationCompleteFilter,
  VaultRecommendationMetricKey,
  VaultRecommendationPrimaryFilter
} from "../recommendationMatchView.js";

/**
 * 仓库筛选的状态模型，以及它在「这一次运行内」的持久化。
 *
 * 筛选原本只活在 `VaultPageContentView` 的 `useState` 里，而卸载重挂是常态：切菜单、启动门在登录态抖一下时盖住页面、
 * 账号快照短暂变空，都会把整棵内容树拆掉重来，回来时所有筛选一起回到默认值——用户看到的就是「页面刷新了、筛选没了」。
 *
 * 所以把筛选写进 sessionStorage：同一个窗口内（切菜单、启动门、Ctrl+R、整页重载）恢复，关掉应用就是新的一次。
 * 只存筛选，不存批量勾选、清理目标角色、回执这类跟当前这一屏数据绑定的临时状态。
 */

export type VaultWorkspaceTab = "filters" | "recommendations";

/** 一条「推荐来源」勾选。来源名册由渲染层按当前数据现算，这里只记选择本身。 */
export type VaultRecommendationSourceSelection = {
  sourceId: string;
  primaryFilter: VaultRecommendationPrimaryFilter;
  completeFilter: VaultRecommendationCompleteFilter;
};

/** 会被记住的筛选状态，字段与 `VaultPageContentView` 里的筛选状态一一对应。 */
export type VaultFilterState = {
  query: string;
  group: VaultGroupFilter;
  sortKey: VaultSortKey;
  tagFilter: VaultTagFilter;
  recommendationSourceSelections: VaultRecommendationSourceSelection[];
  recommendationUnmatchedOnly: boolean;
  lockFilter: VaultLockFilter;
  slotFilter: VaultSlotFilter;
  locationFilter: VaultLocationFilter;
  ammoFilter: VaultAmmoFilter;
  itemTypeFilter: string;
  rarityFilter: VaultRarityFilter;
  gearTierFilter: VaultGearTierFilter;
  classFilter: VaultClassFilter;
  damageFilter: VaultDamageFilter;
  championFilter: VaultChampionFilter;
  craftingFilter: VaultCraftingFilter;
  armorSetFilter: VaultArmorSetFilter;
  armorStatRules: VaultArmorStatRule[];
  frameFilter: VaultFrameFilter;
  activeVaultTab: VaultWorkspaceTab;
};

/**
 * 读回来的快照：认得出的字段才有值。
 *
 * 存储里可能是上一个版本写下的、也可能被人手改过，所以每个值都要过校验，
 * 认不出的直接缺席、由调用方回落到默认值——不能让一个已经不存在的筛选项把列表清空，
 * 那种「列表空了但看不出为什么」比没恢复更糟。
 */
export type VaultFilterStateSnapshot = {
  [Key in keyof VaultFilterState]?: VaultFilterState[Key] | undefined;
};

/** 带上版本号：以后快照结构变了直接换成新键，旧内容自然作废，不需要写迁移。 */
const storageKey = "d2-tools.vault.filters.v1";
/** 搜索框的文本长度上限，防止一份被改坏的存储值原样回到输入框。 */
const queryMaxLength = 500;
/** 槽位、装备类型、框架、护甲套装的取值来自游戏数据与目录，没法写死清单，只做长度兜底。 */
const openKeyMaxLength = 200;

/**
 * 把「这个筛选允许的取值」写成一张表：`Record<联合类型, true>` 会在联合类型增删取值时直接编译报错，
 * 免得这里漏掉一个能选的筛选项、恢复时被悄悄丢掉。
 */
function filterValues<T extends string>(table: Record<T, true>): readonly T[] {
  return Object.keys(table) as T[];
}

/**
 * 分组只有这三个页签（`VaultFilterToolbar` 的 `visibleGroups`），目录里的 `all` / `other` 到不了这里。
 */
const groupValues: readonly VaultGroupFilter[] = ["weapons", "armor", "equipment"];
const sortKeyValues = filterValues<VaultSortKey>({
  recommendation: true,
  name: true,
  group: true,
  tier: true,
  power: true,
  "armor-total": true,
  health: true,
  melee: true,
  grenade: true,
  super: true,
  class: true,
  weapon: true
});
const tagFilterValues = filterValues<VaultTagFilter>({
  all: true,
  keep: true,
  review: true,
  junk: true,
  farm: true,
  loadout: true,
  untagged: true,
  noted: true,
  target: true
});
const lockFilterValues = filterValues<VaultLockFilter>({ all: true, locked: true, unlocked: true });
const locationFilterValues = filterValues<VaultLocationFilter>({
  all: true,
  vault: true,
  current_inventory: true,
  current_equipped: true,
  current_postmaster: true,
  other_characters: true
});
const ammoFilterValues = filterValues<VaultAmmoFilter>({ all: true, primary: true, special: true, heavy: true });
const rarityFilterValues = filterValues<VaultRarityFilter>({ all: true, legendary: true, exotic: true });
const gearTierFilterValues = filterValues<VaultGearTierFilter>({
  all: true,
  "0": true,
  "1": true,
  "2": true,
  "3": true,
  "4": true,
  "5": true
});
const classFilterValues = filterValues<VaultClassFilter>({ all: true, titan: true, hunter: true, warlock: true });
const damageFilterValues = filterValues<VaultDamageFilter>({
  all: true,
  kinetic: true,
  arc: true,
  solar: true,
  void: true,
  stasis: true,
  strand: true
});
const championFilterValues = filterValues<VaultChampionFilter>({
  all: true,
  barrier: true,
  overload: true,
  unstoppable: true
});
const craftingFilterValues = filterValues<VaultCraftingFilter>({ all: true, crafted: true, uncrafted: true });
const workspaceTabValues = filterValues<VaultWorkspaceTab>({ filters: true, recommendations: true });
const armorStatValues = filterValues<ArmorStatKey>({
  health: true,
  melee: true,
  grenade: true,
  super: true,
  class: true,
  weapon: true
});
/** 「perk 命中 n/m」这类计数键是开放取值（`${number}/${number}`），只能按形状认。 */
const recommendationMetricKeyPattern = /^\d+\/\d+$/;

/** 只用到读写两个方法：这样不依赖 `Storage` 这个 DOM 类型名，node 环境里也只是拿不到而已。 */
type VaultFilterStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

function getSessionStorage(): VaultFilterStorage | null {
  try {
    // 没有 DOM 的环境里（node 测试、SSR）这个标识根本不存在；浏览器禁用存储时连读它都会抛。
    return typeof sessionStorage === "undefined" ? null : sessionStorage;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pickClosed<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : undefined;
}

function pickOpenKey(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 && value.length <= openKeyMaxLength
    ? value
    : undefined;
}

function pickRecommendationMetricKey(value: unknown): VaultRecommendationMetricKey | undefined {
  return typeof value === "string" && recommendationMetricKeyPattern.test(value)
    ? (value as VaultRecommendationMetricKey)
    : undefined;
}

function pickRecommendationPrimaryFilter(value: unknown): VaultRecommendationPrimaryFilter | undefined {
  // 「不限」是默认档，勾选里最常见的就是它，不能当成认不出的值丢掉。
  if (value === "all" || value === "unrequired" || value === "uncheckable" || value === "uncovered") return value;
  return pickRecommendationMetricKey(value);
}

function pickRecommendationCompleteFilter(value: unknown): VaultRecommendationCompleteFilter | undefined {
  if (value === "all") return value;
  return pickRecommendationMetricKey(value);
}

function pickRecommendationSourceSelections(value: unknown): VaultRecommendationSourceSelection[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const selections = value.flatMap((entry): VaultRecommendationSourceSelection[] => {
    if (!isRecord(entry)) return [];
    const sourceId = pickOpenKey(entry.sourceId);
    const primaryFilter = pickRecommendationPrimaryFilter(entry.primaryFilter);
    const completeFilter = pickRecommendationCompleteFilter(entry.completeFilter);
    if (sourceId === undefined || primaryFilter === undefined || completeFilter === undefined) return [];
    return [{ sourceId, primaryFilter, completeFilter }];
  });
  return selections.length ? selections : undefined;
}

function pickArmorStatRules(value: unknown): VaultArmorStatRule[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const rules = value.flatMap((entry): VaultArmorStatRule[] => {
    if (!isRecord(entry)) return [];
    // 空字符串是「已添加但还没选属性」的那一条，面板本来就会渲染它。
    const stat = entry.stat === "" ? "" : pickClosed(entry.stat, armorStatValues);
    if (stat === undefined) return [];
    if (typeof entry.min !== "number" || !Number.isFinite(entry.min)) return [];
    // 输入框的上下限是 0–100（`VaultArmorFilterPanel`），越界的值只会让结果恒空。
    return [{ stat, min: Math.min(100, Math.max(0, Math.round(entry.min))) }];
  });
  return rules.length ? rules : undefined;
}

export function readVaultFilterState(): VaultFilterStateSnapshot {
  const storage = getSessionStorage();
  if (!storage) return {};
  let parsed: unknown;
  try {
    const raw = storage.getItem(storageKey);
    if (!raw) return {};
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!isRecord(parsed)) return {};
  return {
    query: typeof parsed.query === "string" ? parsed.query.slice(0, queryMaxLength) : undefined,
    group: pickClosed(parsed.group, groupValues),
    sortKey: pickClosed(parsed.sortKey, sortKeyValues),
    tagFilter: pickClosed(parsed.tagFilter, tagFilterValues),
    recommendationSourceSelections: pickRecommendationSourceSelections(parsed.recommendationSourceSelections),
    recommendationUnmatchedOnly: typeof parsed.recommendationUnmatchedOnly === "boolean"
      ? parsed.recommendationUnmatchedOnly
      : undefined,
    lockFilter: pickClosed(parsed.lockFilter, lockFilterValues),
    slotFilter: pickOpenKey(parsed.slotFilter),
    locationFilter: pickClosed(parsed.locationFilter, locationFilterValues),
    ammoFilter: pickClosed(parsed.ammoFilter, ammoFilterValues),
    itemTypeFilter: pickOpenKey(parsed.itemTypeFilter),
    rarityFilter: pickClosed(parsed.rarityFilter, rarityFilterValues),
    gearTierFilter: pickClosed(parsed.gearTierFilter, gearTierFilterValues),
    classFilter: pickClosed(parsed.classFilter, classFilterValues),
    damageFilter: pickClosed(parsed.damageFilter, damageFilterValues),
    championFilter: pickClosed(parsed.championFilter, championFilterValues),
    craftingFilter: pickClosed(parsed.craftingFilter, craftingFilterValues),
    armorSetFilter: pickOpenKey(parsed.armorSetFilter),
    armorStatRules: pickArmorStatRules(parsed.armorStatRules),
    frameFilter: pickOpenKey(parsed.frameFilter),
    activeVaultTab: pickClosed(parsed.activeVaultTab, workspaceTabValues)
  };
}

export function writeVaultFilterState(state: VaultFilterState): void {
  const storage = getSessionStorage();
  if (!storage) return;
  try {
    storage.setItem(storageKey, JSON.stringify(state));
  } catch {
    // 存不下就算了：记住筛选是顺手的事，不能因为写存储失败影响浏览。
  }
}
