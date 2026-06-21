import { createDimWishlistSource } from "./dimWishlistSource.js";
import type {
  CommunityPerkSource,
  PerkCombo,
  SourceOptions,
  VaultItemMatchInfo,
  VaultItemMatchInput,
  WeaponRecommendation
} from "./types.js";

type FullServiceConfig = {
  data?: { data_dir?: string };
  ai?: { provider?: string; api_key?: string; model?: string; base_url?: string };
} | null | undefined;

export class CommunityPerkRecommendationService {
  private sources: CommunityPerkSource[];
  private config: FullServiceConfig;

  constructor(config: FullServiceConfig, sources?: CommunityPerkSource[]) {
    this.config = config;
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
      if (!source.isAvailable(this.config)) {
        continue;
      }
      const result = await source.getRecommendations(item_hash, options);
      if (result && result.combos.length > 0) {
        return result;
      }
    }
    return null;
  }

  async getRecommendationsWithAllSources(
    item_hash: number,
    options: SourceOptions
  ): Promise<WeaponRecommendation | null> {
    const available = this.sources.filter((s) => s.isAvailable(this.config));
    if (available.length === 0) return null;

    const results = await Promise.all(
      available.map((s) => s.getRecommendations(item_hash, options))
    );
    const valid = results.filter((r): r is WeaponRecommendation => r !== null && r.combos.length > 0);
    if (valid.length === 0) return null;

    const combos = valid.flatMap((r) => r.combos);
    const modes = Array.from(new Set(combos.map((c) => c.mode)));

    return {
      item_hash,
      item_name: options.item_name ?? valid[0].item_name,
      combos,
      matched_modes: modes,
      disclaimer: valid.map((r) => r.disclaimer).filter(Boolean).join(" | ")
    };
  }

  async matchVaultItems(
    items: VaultItemMatchInput[]
  ): Promise<Map<number, VaultItemMatchInfo>> {
    const uniqueHashes = Array.from(new Set(items.map((i) => i.hash)));

    const hashResults = new Map<number, WeaponRecommendation | null>();
    for (const hash of uniqueHashes) {
      try {
        hashResults.set(hash, await this.getRecommendations(hash, {}));
      } catch {
        hashResults.set(hash, null);
      }
    }

    const result = new Map<number, VaultItemMatchInfo>();
    for (const hash of uniqueHashes) {
      const rec = hashResults.get(hash);
      if (!rec) {
        result.set(hash, { matched: 0, modes: [] });
        continue;
      }

      const itemsForHash = items.filter((item) => item.hash === hash);
      const matchedComboIndexes = new Set<number>();
      const matchedModes = new Set<"pve" | "pvp" | "general">();

      for (let index = 0; index < rec.combos.length; index++) {
        const combo = rec.combos[index];
        for (const item of itemsForHash) {
          const actualHashes = new Set(item.socket_plugs?.map((p) => p.hash) ?? []);
          const allIn = combo.perks.every((perk) => actualHashes.has(perk.hash));
          if (allIn) {
            matchedComboIndexes.add(index);
            matchedModes.add(combo.mode);
            break;
          }
        }
      }

      result.set(hash, { matched: matchedComboIndexes.size, modes: Array.from(matchedModes) });
    }

    return result;
  }
}

export function createDefaultCommunityPerkService(
  config: { data?: { data_dir?: string } } | null | undefined
): CommunityPerkRecommendationService {
  const service = new CommunityPerkRecommendationService(config);
  const data_dir = config?.data?.data_dir;
  if (data_dir) {
    service.addSource(createDimWishlistSource(data_dir));
  }
  return service;
}

export function createFullCommunityPerkService(
  config: FullServiceConfig
): CommunityPerkRecommendationService {
  const service = new CommunityPerkRecommendationService(config);
  const data_dir = config?.data?.data_dir;

  if (data_dir) {
    service.addSource(createDimWishlistSource(data_dir));
  }

  const ai = config?.ai;
  if (ai?.provider && ai?.api_key && ai?.model) {
    // aiLightggSource 动态注册，避免在未配置 AI 时引入不必要依赖
    // Phase 3 实现在单独文件中被此函数通过 createAiLightggSource 引入
  }

  return service;
}

export type { PerkCombo };
