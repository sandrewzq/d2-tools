import { evaluateLocalTargets, type LocalTargetRules } from "@d2-tools/core/analysis/targets";
import type { AccountItemSummary } from "@d2-tools/core/account/summary";
import type { SaveVaultTagInput, VaultTags, VaultTagValue } from "@d2-tools/core/vault/tags";

export type VaultBatchSelectionMode = "visible" | "junk" | "review" | "farm" | "loadout" | "untagged" | "noted" | "target";
export type VaultVisibleSelectionMode = "replace" | "append" | "remove";

export function getVaultSelectionItemKey(item: AccountItemSummary): string {
  return item.instance_id ?? `hash:${item.hash}`;
}

export const getVaultItemKey = getVaultSelectionItemKey;

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
    return items.filter((item) => !tags.items[getVaultSelectionItemKey(item)]?.tag);
  }
  if (mode === "noted") {
    return items.filter((item) => Boolean(tags.items[getVaultSelectionItemKey(item)]?.note));
  }

  return items.filter((item) => tags.items[getVaultSelectionItemKey(item)]?.tag === mode);
}

export function applyVisibleVaultSelection(
  current: Set<string>,
  visibleItems: AccountItemSummary[],
  mode: VaultVisibleSelectionMode
): Set<string> {
  const visibleKeys = visibleItems.map(getVaultSelectionItemKey);
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

/**
 * 选中摘要只给结构，不给成句。
 *
 * `packages/app` 不认识界面语言（也不该认识：`packages/ui` 依赖 app，反过来不行），
 * 所以这里判断完是哪一种情况就把计数交出去，由 UI 按 `copy` 成句。
 */
export type VaultSelectionSummary =
  | { kind: "none" }
  | { kind: "all-visible"; total: number }
  | { kind: "partial"; total: number; visible: number; hidden: number };

export function buildVaultSelectionSummary(input: {
  selectedTotalCount: number;
  selectedVisibleCount: number;
}): VaultSelectionSummary {
  if (!input.selectedTotalCount) {
    return { kind: "none" };
  }

  const hiddenCount = Math.max(0, input.selectedTotalCount - input.selectedVisibleCount);
  if (!hiddenCount) {
    return { kind: "all-visible", total: input.selectedTotalCount };
  }

  return {
    kind: "partial",
    total: input.selectedTotalCount,
    visible: input.selectedVisibleCount,
    hidden: hiddenCount
  };
}

export function selectMarkedCleanupItems(items: AccountItemSummary[], tags: VaultTags): AccountItemSummary[] {
  return items.filter((item) => tags.items[getVaultSelectionItemKey(item)]?.tag === "junk");
}

export function buildVaultTagInput(item: AccountItemSummary, tag: VaultTagValue): SaveVaultTagInput {
  return {
    item_key: getVaultSelectionItemKey(item),
    tag
  };
}
