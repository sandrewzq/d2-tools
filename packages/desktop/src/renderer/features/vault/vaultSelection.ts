import { evaluateLocalTargets } from "@d2-tools/core/analysis/targets";
import type {
  AccountItemSummary,
  LocalTargetRules,
  VaultTags,
  VaultTagValue
} from "../../api/client";

export type VaultBatchSelectionMode = "visible" | "junk" | "review" | "farm" | "loadout" | "untagged" | "noted" | "target";
export type VaultVisibleSelectionMode = "replace" | "append" | "remove";

export function getVaultItemKey(item: AccountItemSummary): string {
  return item.instance_id ?? `hash:${item.hash}`;
}

export function selectVaultBatchItems(
  items: AccountItemSummary[],
  mode: VaultBatchSelectionMode,
  tags: VaultTags,
  localTargetRules?: LocalTargetRules | null
): AccountItemSummary[] {
  if (mode === "visible") {
    return items;
  }
  if (mode === "target") {
    return items.filter((item) => evaluateLocalTargets({
      ...item,
      socket_plugs: item.socket_plugs ?? []
    }, localTargetRules ?? undefined).matched);
  }
  if (mode === "untagged") {
    return items.filter((item) => !tags.items[getVaultItemKey(item)]?.tag);
  }
  if (mode === "noted") {
    return items.filter((item) => Boolean(tags.items[getVaultItemKey(item)]?.note));
  }

  return items.filter((item) => tags.items[getVaultItemKey(item)]?.tag === mode);
}

export function applyVisibleVaultSelection(
  current: Set<string>,
  visibleItems: AccountItemSummary[],
  mode: VaultVisibleSelectionMode
): Set<string> {
  const visibleKeys = visibleItems.map(getVaultItemKey);
  if (mode === "replace") {
    return new Set(visibleKeys);
  }

  const next = new Set(current);
  if (mode === "append") {
    for (const key of visibleKeys) {
      next.add(key);
    }
    return next;
  }

  for (const key of visibleKeys) {
    next.delete(key);
  }
  return next;
}

export function buildVaultSelectionSummary(input: {
  selectedTotalCount: number;
  selectedVisibleCount: number;
}): string {
  if (!input.selectedTotalCount) {
    return "未选择任何装备。";
  }

  const hiddenCount = Math.max(0, input.selectedTotalCount - input.selectedVisibleCount);
  if (!hiddenCount) {
    return `已选 ${input.selectedTotalCount} 件，全部都在当前结果中。`;
  }

  return `已选 ${input.selectedTotalCount} 件，其中当前结果 ${input.selectedVisibleCount} 件，另外 ${hiddenCount} 件来自其他筛选结果。`;
}

export function selectMarkedCleanupItems(items: AccountItemSummary[], tags: VaultTags): AccountItemSummary[] {
  return items.filter((item) => tags.items[getVaultItemKey(item)]?.tag === "junk");
}

export function buildVaultTagInput(item: AccountItemSummary, tag: VaultTagValue) {
  return {
    item_key: getVaultItemKey(item),
    tag
  };
}
