import { expandAliasQuery } from "@d2-tools/core/items/aliases";
import type { PerkSearchResult } from "@d2-tools/core/items/perkSearch";
import type { ItemSearchResult } from "@d2-tools/core/items/search";
import type { GameDataCatalog, ItemSearchQuery, PerkSearchQuery } from "./catalog.js";

export type MemoryGameDataCatalogSeed = {
  items?: ItemSearchResult[];
  perks?: PerkSearchResult[];
  itemDetails?: Record<string, ItemSearchResult>;
};

export function createMemoryGameDataCatalog(seed: MemoryGameDataCatalogSeed = {}): GameDataCatalog {
  const items = seed.items ?? [];
  const perks = seed.perks ?? [];

  return {
    async searchItems(input) {
      return filterSearchResults(items, input, (item) => `${item.name}\n${item.description}`);
    },

    async searchPerks(input) {
      return filterSearchResults(perks, input, (perk) => `${perk.name}\n${perk.description}`);
    },

    async getItemDetail(input) {
      return seed.itemDetails?.[String(input.hash)]
        ?? items.find((item) => item.hash === input.hash)
        ?? null;
    }
  };
}

function filterSearchResults<TResult>(
  results: TResult[],
  input: ItemSearchQuery | PerkSearchQuery,
  searchableText: (result: TResult) => string
): TResult[] {
  const terms = input.aliases ? expandAliasQuery(input.query, input.aliases) : [input.query.trim()];
  const normalizedTerms = terms.map((term) => term.toLocaleLowerCase()).filter(Boolean);
  if (!normalizedTerms.length) {
    return [];
  }

  return results
    .filter((result) => {
      const text = searchableText(result).toLocaleLowerCase();
      return normalizedTerms.some((term) => text.includes(term));
    })
    .slice(0, input.limit ?? 20);
}
