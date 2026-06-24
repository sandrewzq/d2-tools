export type VaultItemType = "weapon" | "armor" | "other";

export interface VaultItemSummary {
  readonly instanceId: string;
  readonly itemHash: number;
  readonly name: string;
  readonly type: VaultItemType;
  readonly power: number | null;
}

export interface VaultItemCounts {
  readonly total: number;
  readonly weapons: number;
  readonly armor: number;
  readonly other: number;
}

export function summarizeVaultItems(items: readonly VaultItemSummary[]): VaultItemCounts {
  return items.reduce<VaultItemCounts>(
    (counts, item) => ({
      total: counts.total + 1,
      weapons: counts.weapons + (item.type === "weapon" ? 1 : 0),
      armor: counts.armor + (item.type === "armor" ? 1 : 0),
      other: counts.other + (item.type === "other" ? 1 : 0)
    }),
    { total: 0, weapons: 0, armor: 0, other: 0 }
  );
}
