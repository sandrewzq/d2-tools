import { summarizeItemPerks, type ItemPlugSummary } from "@d2-tools/core/items/perks";
import { resolveDimWishlistRuleMetadata } from "@d2-tools/core/analysis/wishlistImport";
import type { CommunityPerkSource, PerkCombo, PerkRef, SourceOptions, WeaponRecommendation } from "@d2-tools/core/community-perks";
import { loadDimWishlist } from "../analysis/wishlistStore.js";

export function createDimWishlistSource(dataDir: string): CommunityPerkSource {
  return {
    name: "DIM Wishlist",
    isAvailable: () => {
      try {
        return loadDimWishlist(dataDir) !== null;
      } catch {
        return false;
      }
    },
    async getRecommendations(itemHash: number, options: SourceOptions): Promise<WeaponRecommendation | null> {
      const wishlist = loadDimWishlist(dataDir);
      if (!wishlist) return null;
      const matchingRules = wishlist.rules.filter((rule) => rule.item_hash === itemHash);
      if (!matchingRules.length) return null;
      const perkHashToRef = buildPerkRefMap(itemHash, options, matchingRules);
      const combos: PerkCombo[] = matchingRules
        .filter((rule) => rule.perk_hashes.length > 0)
        .map((rule) => {
          const metadata = resolveDimWishlistRuleMetadata(wishlist, rule);
          return {
            perks: rule.perk_hashes.map((hash) => perkHashToRef.get(hash) ?? { hash, name: String(hash) }),
            popularity: undefined,
            source: "dim_wishlist" as const,
            mode: rule.mode,
            note: metadata.note || metadata.source_title || undefined
          };
        });
      if (!combos.length) return null;
      const modeOrder = { pve: 0, pvp: 1, general: 2 } as const;
      combos.sort((a, b) => modeOrder[a.mode] - modeOrder[b.mode]);
      return {
        item_hash: itemHash,
        item_name: options.item_name ?? String(itemHash),
        combos,
        matched_modes: Array.from(new Set(combos.map((combo) => combo.mode))),
        individual_perks: uniquePerks(combos),
        sample_size: matchingRules.length,
        source_label: "DIM Wishlist",
        disclaimer: wishlist.title ? `来自 ${wishlist.title}，仅反映愿望单作者的偏好。` : "来自本地导入的 DIM Wishlist，仅反映愿望单作者的偏好。"
      };
    }
  };
}

function uniquePerks(combos: PerkCombo[]): PerkRef[] {
  const perks = new Map<number, PerkRef>();
  for (const combo of combos) for (const perk of combo.perks) if (!perks.has(perk.hash)) perks.set(perk.hash, perk);
  return [...perks.values()];
}

function buildPerkRefMap(itemHash: number, options: SourceOptions, rules: Array<{ perk_hashes: number[] }>): Map<number, PerkRef> {
  const map = new Map<number, PerkRef>();
  const allHashes = new Set(rules.flatMap((rule) => rule.perk_hashes));
  if (options.itemDefinitions && allHashes.size > 0) {
    const weaponDef = options.itemDefinitions[String(itemHash)];
    if (weaponDef) {
      const perkGroups = summarizeItemPerks(weaponDef, options.itemDefinitions, { plugSetDefinitions: options.plugSetDefinitions, maxPlugsPerSocket: 24 });
      for (const plug of perkGroups.flatMap((group) => group.plugs) as ItemPlugSummary[]) {
        if (allHashes.has(plug.hash)) map.set(plug.hash, { hash: plug.hash, name: plug.name, description: plug.description, icon: plug.icon });
      }
    }
  }
  if (options.englishItemDefinitions && allHashes.size > 0) {
    for (const hash of allHashes) {
      const englishName = options.englishItemDefinitions[String(hash)]?.displayProperties?.name?.trim();
      if (englishName) map.set(hash, { ...(map.get(hash) ?? { hash, name: String(hash) }), englishName });
    }
  }
  for (const hash of allHashes) if (!map.has(hash)) map.set(hash, { hash, name: String(hash) });
  return map;
}
