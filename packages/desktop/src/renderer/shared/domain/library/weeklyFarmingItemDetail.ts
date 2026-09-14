import type { ItemSearchResult, LibraryWeeklyFarmingItemView } from "@d2-tools/app/library";
import type { AccountItemSummary, AccountSummary } from "../../../api/types";

export function findWeeklyFarmingAccountItem(
  accountSummary: AccountSummary | null,
  row: LibraryWeeklyFarmingItemView
): AccountItemSummary | undefined {
  if (!accountSummary) return undefined;
  const items = [
    ...accountSummary.vault.items,
    ...accountSummary.characters.flatMap((character) => [
      ...character.equipped_items,
      ...character.inventory_items,
      ...character.postmaster_items
    ])
  ];
  if (row.bestInstance?.instanceId) {
    const best = items.find((item) => item.instance_id === row.bestInstance?.instanceId);
    if (best) return best;
  }
  return items.find((item) => item.hash === row.item.hash);
}

export function toWeeklyFarmingDefinitionItem(row: LibraryWeeklyFarmingItemView): ItemSearchResult {
  return {
    hash: row.item.hash,
    name: row.item.name,
    description: "",
    ...(row.item.icon ? { icon: row.item.icon } : {}),
    ...(row.item.item_type ? { item_type: row.item.item_type } : {}),
    group_key: "weapons",
    source: {
      status: "ready",
      label: "本周活动来源",
      description: row.item.source_label,
      source_hash: row.item.source_hash
    }
  };
}
