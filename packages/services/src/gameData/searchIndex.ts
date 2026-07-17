export type GameDataSearchKind = "item" | "perk";

export type GameDataSearchIndex = {
  search(kind: GameDataSearchKind, terms: Iterable<string>, limit: number): number[];
  getItemVersionHashes(itemHashes: Iterable<number>, limit: number): number[];
  getRelatedItemHashes(perkHashes: Iterable<number>, limitPerPerk?: number): number[];
  getPlugHashes(perkHashes: Iterable<number>): number[];
  getEnumHashes(kind: "breaker" | "damage", enumValues: Iterable<number>): number[];
  close(): void;
};

export type GameDataSearchIndexBuildResult = {
  itemCount: number;
  perkCount: number;
  relationCount: number;
};
