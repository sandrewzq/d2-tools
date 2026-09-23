import type { WeaponIdentityRelation } from "@d2-tools/core/community-perks";

export type GameDataSearchKind = "item" | "perk";

export type GameDataSearchIndex = {
  search(kind: GameDataSearchKind, terms: Iterable<string>, limit: number): number[];
  /**
   * 按**官方名**取该名字下的全部装备 hash（同名武器的所有官方版本都在内）。
   *
   * 名字比对先看原样，再补一轮去掉空格、标点、大小写差异后的比对：官方名把中文与字母数字连写
   * （`迪凯特02`），人工表格按页面习惯写 `迪凯特 02`，只比原样的话这一行取不到 hash、会被判成
   * 「找不到可核对的武器」。
   *
   * 与 `search` 的区别是「搜索」和「身份」的区别：`search` 有排序、有上限，而且
   * `getItemVersionHashes` 只返回同一把武器的**代表版本**——拿它当「这个名字对应哪些官方版本」用，
   * 会漏掉被折叠的版本、也会被同名装备挤掉榜尾。要判定一份人工表格写没写错，必须拿全集。
   */
  getItemHashesByExactName(names: Iterable<string>): number[];
  getItemVersionHashes(itemHashes: Iterable<number>, limit: number): number[];
  getWeaponIdentityRelations(itemHashes: Iterable<number>): WeaponIdentityRelation[];
  getRelatedItemSummary(perkHashes: Iterable<number>): { total: number; hashes: number[] };
  getRelatedItemPage(perkHashes: Iterable<number>, offset: number, limit: number): {
    total: number;
    items: Array<{ hash: number; perk_hashes: number[] }>;
  };
  getPlugHashes(perkHashes: Iterable<number>): number[];
  getEnumHashes(kind: "breaker" | "damage", enumValues: Iterable<number>): number[];
  close(): void;
};

export type GameDataSearchIndexBuildResult = {
  itemCount: number;
  perkCount: number;
  relationCount: number;
};
