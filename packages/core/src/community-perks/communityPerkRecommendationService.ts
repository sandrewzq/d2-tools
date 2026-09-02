import type {
  CommunityPerkSource,
  PerkCombo,
  PerkRef,
  SourceOptions,
  VaultItemInstanceMatchInfo,
  VaultItemMatchInfo,
  VaultItemMatchInput,
  WeaponRecommendation
} from "./types.js";

export class CommunityPerkRecommendationService {
  private sources: CommunityPerkSource[];

  constructor(sources?: CommunityPerkSource[]) {
    this.sources = sources ?? [];
  }

  addSource(source: CommunityPerkSource): void {
    this.sources.push(source);
  }

  async getRecommendations(
    item_hash: number,
    options: SourceOptions
  ): Promise<WeaponRecommendation | null> {
    for (const source of this.sources) {
      if (!source.isAvailable()) {
        continue;
      }
      try {
        const result = await source.getRecommendations(item_hash, options);
        if (result && isUsefulRecommendation(result)) {
          return result;
        }
      } catch {
        // 单个数据源失败时继续尝试下一个数据源
      }
    }
    return null;
  }

  async getRecommendationsWithAllSources(
    item_hash: number,
    options: SourceOptions
  ): Promise<WeaponRecommendation | null> {
    const available = this.sources.filter((s) => s.isAvailable());
    if (available.length === 0) return null;

    const results = await Promise.allSettled(
      available.map((s) => s.getRecommendations(item_hash, options))
    );
    const sourceWarnings = results.flatMap((result, index) => {
      if (result.status === "fulfilled") return [];
      const fallbackLabel = available.find((_, fallbackIndex) => {
        const fallbackResult = results[fallbackIndex];
        return fallbackIndex !== index
          && fallbackResult.status === "fulfilled"
          && fallbackResult.value
          && isUsefulRecommendation(fallbackResult.value);
      })?.name;
      return [`${available[index].name} 查询失败${fallbackLabel ? `，已显示 ${fallbackLabel} 数据` : ""}。`];
    });
    const valid = results
      .map((r) => (r.status === "fulfilled" ? r.value : null))
      .filter((r): r is WeaponRecommendation => r !== null && isUsefulRecommendation(r));
    if (valid.length === 0) return null;

    const combos = valid.flatMap((r) => r.combos);
    const weaponLevelRecommendations = valid.flatMap((recommendation) => (
      recommendation.weapon_level_recommendations ?? []
    ));
    const modes = Array.from(new Set([
      ...combos.map((combo) => combo.mode),
      ...weaponLevelRecommendations.map((entry) => entry.mode)
    ]));

    return {
      item_hash,
      item_name: options.item_name ?? valid[0].item_name,
      combos,
      matched_modes: modes,
      individual_perks: uniquePerks(valid),
      weapon_level_recommendations: weaponLevelRecommendations,
      sample_size: valid.reduce((sum, recommendation) => sum + (recommendation.sample_size ?? recommendation.combos.length), 0),
      source_label: Array.from(new Set(valid.map((r) => r.source_label).filter(Boolean))).join(" / ") || undefined,
      ai_analysis: valid.map((r) => r.ai_analysis).filter(Boolean).join("\n\n") || undefined,
      source_warnings: sourceWarnings.length ? sourceWarnings : undefined,
      disclaimer: valid.map((r) => r.disclaimer).filter(Boolean).join(" | ")
    };
  }

  async matchVaultItems(
    items: VaultItemMatchInput[],
    options: SourceOptions = {}
  ): Promise<Map<number, VaultItemMatchInfo>> {
    const uniqueHashes = Array.from(new Set(items.map((i) => i.hash)));

    const hashResults = new Map<number, WeaponRecommendation | null>();
    await Promise.all(
      uniqueHashes.map(async (hash) => {
        try {
          hashResults.set(hash, await this.getRecommendationsWithAllSources(hash, options));
        } catch {
          hashResults.set(hash, null);
        }
      })
    );

    const result = new Map<number, VaultItemMatchInfo>();
    for (const hash of uniqueHashes) {
      const rec = hashResults.get(hash);
      if (!rec) {
        result.set(hash, { matched: 0, available: 0, modes: [] });
        continue;
      }

      const itemsForHash = items.filter((item) => item.hash === hash);
      const matchedComboIndexes = new Set<number>();
      const matchedModes = new Set<"pve" | "pvp" | "general">();

      for (let index = 0; index < rec.combos.length; index++) {
        const combo = rec.combos[index];
        for (const item of itemsForHash) {
          const actualHashes = ownedPlugHashes(item);
          const allIn = combo.perks.every((perk) => actualHashes.has(perk.hash));
          if (allIn) {
            matchedComboIndexes.add(index);
            matchedModes.add(combo.mode);
            break;
          }
        }
      }

      result.set(hash, {
        matched: matchedComboIndexes.size,
        available: rec.combos.length,
        modes: Array.from(matchedModes.size ? matchedModes : new Set(rec.matched_modes)),
        sample_perks: previewPerks(rec),
        source_label: rec.source_label
      });
    }

    return result;
  }

  /**
   * Matches every owned weapon independently. Unlike the legacy hash map,
   * duplicate copies of the same weapon never share a match result.
   */
  async matchVaultItemInstances(
    items: VaultItemMatchInput[],
    options: SourceOptions = {}
  ): Promise<VaultItemInstanceMatchInfo[]> {
    const recommendationRequests = new Map<string, Promise<WeaponRecommendation | null>>();
    const recommendationFor = (item: VaultItemMatchInput): Promise<WeaponRecommendation | null> => {
      const itemName = item.item_name?.trim() ?? "";
      const key = `${item.hash}\u0000${itemName}`;
      const existing = recommendationRequests.get(key);
      if (existing) return existing;
      const pending = this.getRecommendationsWithAllSources(item.hash, {
        ...options,
        item_name: itemName || options.item_name
      }).catch(() => null);
      recommendationRequests.set(key, pending);
      return pending;
    };

    return Promise.all(items.map(async (item): Promise<VaultItemInstanceMatchInfo> => {
      const recommendation = await recommendationFor(item);
      const canonicalWeaponName = item.item_name?.trim()
        || options.itemDefinitions?.[String(item.hash)]?.displayProperties?.name?.trim()
        || recommendation?.item_name
        || `Hash ${item.hash}`;
      if (!recommendation) {
        return {
          hash: item.hash,
          ...(item.instance_id ? { instance_id: item.instance_id } : {}),
          canonical_weapon_name: canonicalWeaponName,
          coverage: "uncovered",
          match_status: "indeterminate",
          matched: 0,
          partial: 0,
          available: 0,
          modes: []
        };
      }

      const actualHashes = ownedPlugHashes(item);
      const weaponLevelRecommendations = recommendation.weapon_level_recommendations ?? [];
      if (actualHashes.size === 0 && weaponLevelRecommendations.length === 0) {
        return {
          hash: item.hash,
          ...(item.instance_id ? { instance_id: item.instance_id } : {}),
          canonical_weapon_name: canonicalWeaponName,
          coverage: "covered",
          match_status: "indeterminate",
          matched: 0,
          partial: 0,
          available: recommendation.combos.length,
          modes: recommendation.matched_modes,
          sample_perks: previewPerks(recommendation),
          source_label: recommendation.source_label
        };
      }

      if (item.weapon_roll && !item.weapon_roll.complete && recommendation.combos.length > 0) {
        return {
          hash: item.hash,
          ...(item.instance_id ? { instance_id: item.instance_id } : {}),
          canonical_weapon_name: canonicalWeaponName,
          coverage: "covered",
          match_status: "indeterminate",
          matched: weaponLevelRecommendations.length,
          partial: 0,
          available: weaponLevelRecommendations.length + recommendation.combos.length,
          modes: recommendation.matched_modes,
          sample_perks: previewPerks(recommendation),
          source_label: recommendation.source_label
        };
      }

      const fullMatches = recommendation.combos.filter((combo) => (
        combo.perks.every((perk) => actualHashes.has(perk.hash))
      ));
      const partialMatches = recommendation.combos.filter((combo) => {
        const matchedPerks = combo.perks.filter((perk) => actualHashes.has(perk.hash)).length;
        return matchedPerks > 0 && matchedPerks < combo.perks.length;
      });
      const matchedModes = Array.from(new Set(
        [
          ...weaponLevelRecommendations.map((entry) => entry.mode),
          ...(fullMatches.length > 0 ? fullMatches : partialMatches).map((combo) => combo.mode)
        ]
      ));
      const matched = weaponLevelRecommendations.length + fullMatches.length;
      const available = weaponLevelRecommendations.length + recommendation.combos.length;
      return {
        hash: item.hash,
        ...(item.instance_id ? { instance_id: item.instance_id } : {}),
        canonical_weapon_name: canonicalWeaponName,
        coverage: "covered",
        match_status: matched > 0
          ? "full_match"
          : partialMatches.length > 0
            ? "partial_match"
            : "no_match",
        matched,
        partial: partialMatches.length,
        available,
        modes: matchedModes.length ? matchedModes : recommendation.matched_modes,
        sample_perks: previewPerks(recommendation),
        source_label: recommendation.source_label
      };
    }));
  }
}

function ownedPlugHashes(item: VaultItemMatchInput): Set<number> {
  if (item.weapon_roll) {
    return new Set(item.weapon_roll.sockets.flatMap((socket) => (
      socket.owned_plugs.map((plug) => plug.hash)
    )));
  }
  return new Set(item.socket_plugs?.map((plug) => plug.hash) ?? []);
}

function isUsefulRecommendation(recommendation: WeaponRecommendation): boolean {
  return recommendation.combos.length > 0
    || Boolean(recommendation.weapon_level_recommendations?.length)
    || Boolean(recommendation.ai_analysis?.trim());
}

function uniquePerks(recommendations: WeaponRecommendation[]): PerkRef[] {
  const perks = new Map<number, PerkRef>();
  for (const recommendation of recommendations) {
    for (const perk of recommendation.individual_perks ?? recommendation.combos.flatMap((combo) => combo.perks)) {
      if (!perks.has(perk.hash)) {
        perks.set(perk.hash, perk);
      }
    }
  }
  return [...perks.values()];
}

function previewPerks(recommendation: WeaponRecommendation): PerkRef[] | undefined {
  const perks = recommendation.individual_perks ?? recommendation.combos.flatMap((combo) => combo.perks);
  if (!perks.length) {
    return undefined;
  }

  const deduped = new Map<number, PerkRef>();
  for (const perk of perks) {
    if (!deduped.has(perk.hash)) {
      deduped.set(perk.hash, perk);
    }
    if (deduped.size >= 3) {
      break;
    }
  }
  return [...deduped.values()];
}

export type { PerkCombo };
