import { analyzeDuplicateItems, type DuplicateAnalysisResult, type DuplicateItemGroup } from "@d2-tools/core/analysis/duplicates";
import { evaluateWishlistRoll } from "@d2-tools/core/analysis/wishlist";
import type {
  AccountItemSummary,
  DimWishlist,
  SaveVaultTagInput,
  VaultTags
} from "../../../api/client";

type VaultAmmoFilter = "all" | "primary" | "special" | "heavy";

const ammoFilterLabels: Record<VaultAmmoFilter, string> = {
  all: "全部弹药",
  primary: "主弹",
  special: "特殊",
  heavy: "重弹"
};

export function buildVaultCleanupText(items: AccountItemSummary[], tags: VaultTags): string {
  const lines = [
    "d2-tools 仓库清理清单",
    `生成时间：${new Date().toLocaleString("zh-CN")}`,
    `物品数量：${items.length}`,
    ""
  ];

  items.forEach((item, index) => {
    lines.push(`${index + 1}. ${item.name}`);
    lines.push(`   类型：${[item.bucket_name, item.item_type, item.tier].filter(Boolean).join(" / ") || "未知"}`);
    const note = tags.items[getVaultItemKey(item)]?.note;
    if (note) {
      lines.push(`   备注：${note}`);
    }
    lines.push("");
  });

  return lines.join("\n").trimEnd();
}

export function buildVaultCleanupLocatorText(items: AccountItemSummary[], tags: VaultTags): string {
  const duplicateNameCounts = items.reduce<Map<string, number>>((counts, item) => {
    counts.set(item.name, (counts.get(item.name) ?? 0) + 1);
    return counts;
  }, new Map());
  const lines = [
    "游戏内定位提示",
    "d2-tools 的标记只保存在本机，游戏里不会显示。建议先把候选装备转移到同一个角色背包，再按下面信息逐件核对。",
    ""
  ];

  items.forEach((item, index) => {
    const key = getVaultItemKey(item);
    const tag = tags.items[key]?.tag;
    const note = tags.items[key]?.note;
    const plugs = item.socket_plugs?.map((plug) => plug.name).filter(Boolean).slice(0, 5).join(" / ");
    const duplicateCount = duplicateNameCounts.get(item.name) ?? 0;
    lines.push(`${index + 1}. ${item.name}`);
    lines.push(`   定位：${formatVaultItemMeta(item) || "未知位置 / 未知类型"}`);
    if (item.power) lines.push(`   光等 ${item.power}`);
    lines.push(`   ${item.locked ? "已锁定" : "未锁定"}`);
    if (plugs) lines.push(`   Perk：${plugs}`);
    if (tag) lines.push(`   本地标记：${tagLabelsForCleanup[tag]}`);
    if (note) lines.push(`   备注：${note}`);
    if (duplicateCount > 1) lines.push(`   同名装备有 ${duplicateCount} 件，请按光等、锁定状态和 Perk 区分。`);
    lines.push("");
  });

  return lines.join("\n").trimEnd();
}

export function buildVaultDuplicateSummary(items: AccountItemSummary[], tags: VaultTags): DuplicateAnalysisResult {
  return analyzeDuplicateItems(items.map(normalizeCoreItem), tags);
}

export function countWishlistMatches(items: AccountItemSummary[], wishlist?: DimWishlist | null): number {
  if (!wishlist) {
    return 0;
  }

  return items.reduce((count, item) => (
    evaluateWishlistRoll(normalizeCoreItem(item), wishlist).matched ? count + 1 : count
  ), 0);
}

export type DuplicateGroupBatchTagMode =
  | "keep-best-review-rest"
  | "keep-best-junk-rest"
  | "clear-group-tags";

export type DuplicateGroupSelectionMode =
  | "rest"
  | "junk";

export function buildDuplicateGroupBatchTagPlan(
  group: DuplicateItemGroup,
  mode: DuplicateGroupBatchTagMode,
  keepItemKey = group.items[0]?.item_key ?? ""
): SaveVaultTagInput[] {
  if (mode === "clear-group-tags") {
    return group.items.map((item) => ({
      item_key: item.item_key,
      tag: "none"
    }));
  }

  return group.items.map((item, index) => ({
    item_key: item.item_key,
    tag: item.item_key === keepItemKey || (!keepItemKey && index === 0)
      ? "keep"
      : mode === "keep-best-review-rest"
        ? "review"
        : "junk"
  }));
}

export function selectDuplicateGroupItems(
  group: DuplicateItemGroup,
  mode: DuplicateGroupSelectionMode,
  keepItemKey = group.items[0]?.item_key ?? ""
): string[] {
  if (mode === "junk") {
    return group.items
      .filter((item) => item.item_key !== keepItemKey && item.tag === "junk")
      .map((item) => item.item_key);
  }

  return group.items
    .filter((item) => item.item_key !== keepItemKey)
    .map((item) => item.item_key);
}

function getVaultItemKey(item: AccountItemSummary): string {
  return item.instance_id ?? `hash:${item.hash}`;
}

function normalizeCoreItem(item: AccountItemSummary): AccountItemSummary & { socket_plugs: NonNullable<AccountItemSummary["socket_plugs"]> } {
  return {
    ...item,
    socket_plugs: item.socket_plugs ?? []
  };
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

function formatVaultItemMeta(item: AccountItemSummary): string {
  return [
    item.bucket_name,
    item.item_type,
    item.ammo_type ? ammoFilterLabels[item.ammo_type] : undefined,
    item.tier,
    item.power ? `光等 ${item.power}` : undefined,
    formatArmorStatsInline(item),
    item.locked ? "已锁定" : undefined
  ].filter(Boolean).join(" / ");
}

const tagLabelsForCleanup = {
  keep: "保留",
  review: "关注",
  junk: "可清理",
  farm: "待刷",
  loadout: "配装用"
} as const;
