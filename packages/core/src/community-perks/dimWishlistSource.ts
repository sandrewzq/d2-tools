import { loadDimWishlist } from "../analysis/wishlistStore.js";
import { summarizeItemPerks, type ItemPlugSummary } from "../items/perks.js";
import type {
  CommunityPerkSource,
  PerkCombo,
  PerkRef,
  SourceOptions,
  WeaponRecommendation
} from "./types.js";

export function createDimWishlistSource(data_dir: string): CommunityPerkSource {
  return {
    name: "DIM Wishlist",
    isAvailable: (_config) => {
      try {
        return loadDimWishlist(data_dir) !== null;
      } catch {
        return false;
      }
    },
    async getRecommendations(item_hash: number, options: SourceOptions): Promise<WeaponRecommendation | null> {
      const wishlist = loadDimWishlist(data_dir);
      if (!wishlist) return null;

      const matchingRules = wishlist.rules.filter((rule) => rule.item_hash === item_hash);
      if (matchingRules.length === 0) return null;

      const perkHashToRef = buildPerkRefMap(item_hash, options, matchingRules);

      const combos: PerkCombo[] = matchingRules
        .filter((rule) => rule.perk_hashes.length > 0)
        .map((rule) => ({
          perks: rule.perk_hashes
            .map((hash) => perkHashToRef.get(hash) ?? { hash, name: String(hash) })
            .filter((ref): ref is PerkRef => Boolean(ref)),
          popularity: undefined,
          source: "dim_wishlist",
          mode: rule.mode,
          note: rule.note || undefined
        }));

      if (combos.length === 0) return null;

      combos.sort((a, b) => {
        const modeOrder = { pve: 0, pvp: 1, general: 2 } as const;
        return modeOrder[a.mode] - modeOrder[b.mode];
      });

      const modes = Array.from(new Set(combos.map((c) => c.mode)));

      return {
        item_hash,
        item_name: options.item_name ?? String(item_hash),
        combos,
        matched_modes: modes,
        disclaimer: wishlist.title ? `来自 ${wishlist.title}，仅反映愿望单作者的偏好。` : "来自本地导入的 DIM Wishlist，仅反映愿望单作者的偏好。"
      };
    }
  };
}

function buildPerkRefMap(
  item_hash: number,
  options: SourceOptions,
  rules: Array<{ perk_hashes: number[] }>
): Map<number, PerkRef> {
  const map = new Map<number, PerkRef>();
  const allHashes = new Set(rules.flatMap((r) => r.perk_hashes));

  if (options.itemDefinitions && allHashes.size > 0) {
    const weaponDef = options.itemDefinitions[String(item_hash)];
    if (weaponDef) {
      const perkGroups = summarizeItemPerks(weaponDef, options.itemDefinitions, {
        plugSetDefinitions: options.plugSetDefinitions,
        maxPlugsPerSocket: 24
      });

      const allPlugs: ItemPlugSummary[] = perkGroups.flatMap((g) => g.plugs);
      for (const plug of allPlugs) {
        if (allHashes.has(plug.hash)) {
          map.set(plug.hash, {
            hash: plug.hash,
            name: plug.name,
            description: plug.description,
            icon: plug.icon
          });
        }
      }
    }
  }

  if (options.englishItemDefinitions && allHashes.size > 0) {
    for (const hash of allHashes) {
      const englishDef = options.englishItemDefinitions[String(hash)];
      const englishName = englishDef?.displayProperties?.name?.trim();
      if (englishName) {
        const ref = map.get(hash) ?? { hash, name: String(hash) };
        ref.englishName = englishName;
        map.set(hash, ref);
      }
    }
  }

  for (const hash of allHashes) {
    if (!map.has(hash)) {
      map.set(hash, { hash, name: String(hash) });
    }
  }

  return map;
}
