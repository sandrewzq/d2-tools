import type { ActivityHistorySummary } from "@d2-tools/core/activities/history";
import type { AccountSummary } from "@d2-tools/core/account/summary";
import type { LocalTargetRules } from "@d2-tools/core/analysis/targets";
import type { DimWishlist } from "@d2-tools/core/analysis/wishlistImport";
import type { LocalCommunityRecommendationTable, VaultItemMatchInfo } from "@d2-tools/core/community-perks";
import type { SaveVaultNoteInput, SaveVaultTagInput, VaultTags } from "@d2-tools/core/vault/tags";
import type { D2Services } from "./contracts.js";
import type { AiChatReplyResult, AiChatRequest } from "./types.js";

export type MemoryServicesSeed = {
  account: AccountSummary;
  activitySummary?: ActivityHistorySummary;
  vaultTags?: VaultTags;
  wishlist?: DimWishlist | null;
  localTargetRules?: LocalTargetRules;
  communityRecommendations?: LocalCommunityRecommendationTable | null;
  communityMatches?: Array<{ hash: number } & VaultItemMatchInfo>;
  manifestDefinitions?: Record<string, Record<number, unknown>>;
  aiReply?: AiChatReplyResult | ((input: AiChatRequest) => AiChatReplyResult | Promise<AiChatReplyResult>);
};

export function createMemoryServices(seed: MemoryServicesSeed): D2Services {
  let vaultTags = seed.vaultTags ?? { items: {} };
  let wishlist = seed.wishlist ?? null;
  let localTargetRules = seed.localTargetRules ?? {
    action_policy: "notify_only" as const,
    armor: [],
    weapons: []
  };
  let communityRecommendations = seed.communityRecommendations ?? null;
  const activitySummary = seed.activitySummary ?? {
    recent: { total: 0, pve: { total: 0, completed: 0 }, pvp: { total: 0, completed: 0 }, other: { total: 0, completed: 0 } },
    raids: { entries: [] },
    recent_items: []
  };
  const communityMatches = seed.communityMatches ?? [];
  const aiReply = seed.aiReply ?? {
    provider: "memory",
    model: "memory",
    text: ""
  };
  const manifestDefinitions = seed.manifestDefinitions ?? {};

  return {
    profile: {
      async getAccountSummary() {
        return seed.account;
      },
      async getActivitySummary() {
        return activitySummary;
      },
      async matchCommunityVaultItems(items) {
        const requestedHashes = new Set(items.map((item) => item.hash));
        return communityMatches.filter((item) => requestedHashes.has(item.hash));
      }
    },
    manifest: {
      async getDefinition<TDefinition = unknown>(tableName: string, hash: number): Promise<TDefinition | null> {
        return (manifestDefinitions[tableName]?.[hash] ?? null) as TDefinition | null;
      }
    },
    localData: {
      async getDimWishlist() {
        return wishlist;
      },
      async saveDimWishlist(nextWishlist) {
        wishlist = nextWishlist;
        return wishlist;
      },
      async clearDimWishlist() {
        wishlist = null;
        return null;
      },
      async getLocalCommunityRecommendations() {
        return communityRecommendations;
      },
      async saveLocalCommunityRecommendations(table) {
        communityRecommendations = table;
        return communityRecommendations;
      },
      async clearLocalCommunityRecommendations() {
        communityRecommendations = null;
        return null;
      },
      async getVaultTags() {
        return vaultTags;
      },
      async saveVaultTag(input) {
        vaultTags = applyVaultTag(vaultTags, input);
        return vaultTags;
      },
      async saveVaultTagsBatch(inputs) {
        vaultTags = inputs.reduce((current, input) => applyVaultTag(current, input), vaultTags);
        return vaultTags;
      },
      async saveVaultNote(input) {
        vaultTags = applyVaultNote(vaultTags, input);
        return vaultTags;
      },
      async getLocalTargetRules() {
        return localTargetRules;
      },
      async saveLocalTargetRules(rules) {
        localTargetRules = rules;
        return localTargetRules;
      },
      async clearLocalTargetRules() {
        localTargetRules = {
          action_policy: "notify_only",
          armor: [],
          weapons: []
        };
        return localTargetRules;
      }
    },
    ai: {
      async sendChat(input) {
        return typeof aiReply === "function" ? aiReply(input) : aiReply;
      }
    }
  };
}

function applyVaultTag(tags: VaultTags, input: SaveVaultTagInput): VaultTags {
  const items = { ...tags.items };
  const existing = items[input.item_key];
  if (input.tag === "none") {
    if (existing?.note) {
      items[input.item_key] = { note: existing.note };
    } else {
      delete items[input.item_key];
    }
  } else {
    items[input.item_key] = {
      ...existing,
      tag: input.tag
    };
  }
  return { items };
}

function applyVaultNote(tags: VaultTags, input: SaveVaultNoteInput): VaultTags {
  const items = { ...tags.items };
  const existing = items[input.item_key];
  const note = input.note.trim();
  if (note) {
    items[input.item_key] = {
      ...existing,
      note
    };
  } else if (existing?.tag) {
    items[input.item_key] = { tag: existing.tag };
  } else {
    delete items[input.item_key];
  }
  return { items };
}
