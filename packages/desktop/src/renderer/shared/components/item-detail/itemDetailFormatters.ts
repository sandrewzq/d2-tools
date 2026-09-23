import type { ItemDetailCopy } from "@d2-tools/ui";
import { itemDetailTemplate, itemDetailText } from "@d2-tools/ui";
import type { VaultTagValue } from "../../../api/types";
import type { SameNameItemSummary, SelectedItemDetail } from "../../hooks/useItemDetail";

export function getItemSourceStatusTone(item: Pick<SelectedItemDetail, "is_detail_loading" | "source">): "ready" | "pending" | "warning" | "neutral" {
  if (item.is_detail_loading) {
    return "pending";
  }

  if (item.source.status === "ready") {
    return "ready";
  }

  if (item.source.status === "missing") {
    return "warning";
  }

  return "neutral";
}

export function formatAccountItemMeta(copy: ItemDetailCopy, item: SameNameItemSummary): string {
  return [
    "source_label" in item ? itemDetailTemplate(copy, "来源：{value}", { value: item.source_label ?? "" }) : undefined,
    item.bucket_name,
    item.tier,
    item.power ? itemDetailTemplate(copy, "光等 {value}", { value: item.power }) : undefined,
    formatArmorStatsSummary(copy, item),
    item.locked ? itemDetailText(copy, "已锁定") : undefined
  ].filter(Boolean).join(" / ");
}

export function formatArmorStatsSummary(
  copy: ItemDetailCopy,
  item: Pick<SelectedItemDetail | SameNameItemSummary, "armor_stats">
): string | undefined {
  if (!item.armor_stats) {
    return undefined;
  }

  return [
    itemDetailTemplate(copy, "总值 {value}", { value: item.armor_stats.total }),
    itemDetailTemplate(copy, "生命值 {value}", { value: item.armor_stats.health }),
    itemDetailTemplate(copy, "职业 {value}", { value: item.armor_stats.class }),
    itemDetailTemplate(copy, "手雷 {value}", { value: item.armor_stats.grenade })
  ].join(" / ");
}

export function formatArmorEnergySummary(
  copy: ItemDetailCopy,
  energy: SelectedItemDetail["armor_energy"]
): string | undefined {
  if (!energy) {
    return undefined;
  }

  return itemDetailTemplate(copy, "已用 {used} / {capacity}，剩余 {unused}", {
    used: energy.used,
    capacity: energy.capacity,
    unused: energy.unused
  });
}

export function formatVaultTagLabel(copy: ItemDetailCopy, tag: VaultTagValue): string {
  if (tag === "keep") return itemDetailText(copy, "保留");
  if (tag === "review") return itemDetailText(copy, "待定");
  if (tag === "farm") return itemDetailText(copy, "待刷");
  if (tag === "loadout") return itemDetailText(copy, "配装用");
  if (tag === "junk") return itemDetailText(copy, "清理");
  return itemDetailText(copy, "未标记");
}
