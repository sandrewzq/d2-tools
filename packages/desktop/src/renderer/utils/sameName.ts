export type SameNameSourceKind = "equipped" | "inventory" | "vault" | "postmaster";

export type SameNameSourceItem = {
  source_kind: SameNameSourceKind;
};

export type SameNameSourceStats = {
  total: number;
  equipped: number;
  inventory: number;
  vault: number;
  postmaster: number;
};

export function buildSameNameSourceStats(items: SameNameSourceItem[]): SameNameSourceStats {
  return items.reduce<SameNameSourceStats>((stats, item) => {
    stats.total += 1;
    stats[item.source_kind] += 1;
    return stats;
  }, {
    total: 0,
    equipped: 0,
    inventory: 0,
    vault: 0,
    postmaster: 0
  });
}
