import type { ActivityHistorySummary } from "@d2-tools/core/activities/history";
import type { AccountSummary } from "@d2-tools/core/account/summary";
import type { LocalTargetRules } from "@d2-tools/core/analysis/targets";
import type { DimWishlist } from "@d2-tools/core/analysis/wishlistImport";
import type { LocalCommunityRecommendationTable, VaultItemMatchInfo } from "@d2-tools/core/community-perks";
import type { PersonalWeaponKnowledgeTable } from "@d2-tools/core/community-perks/personalWeaponKnowledge";
import type { SaveVaultNoteInput, SaveVaultTagInput, VaultTags } from "@d2-tools/core/vault/tags";
import type { D2Services } from "./contracts.js";
import { createD2SkillService } from "./d2SkillService.js";
import type { AiChatReplyResult, AiChatRequest } from "./types.js";

export type MemoryServicesSeed = {
  account: AccountSummary;
  activitySummary?: ActivityHistorySummary;
  vaultTags?: VaultTags;
  wishlist?: DimWishlist | null;
  localTargetRules?: LocalTargetRules;
  communityRecommendations?: LocalCommunityRecommendationTable | null;
  personalWeaponKnowledge?: PersonalWeaponKnowledgeTable;
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
  let personalWeaponKnowledge = seed.personalWeaponKnowledge ?? { version: 1 as const, entries: [] };
  const activitySummary = seed.activitySummary ?? {
    recent: { total: 0, pve: { total: 0, completed: 0 }, pvp: { total: 0, completed: 0 }, other: { total: 0, completed: 0 } },
    raids: { entries: [] },
    review: {
      total_activities: 0,
      completed_count: 0,
      completion_rate: 0,
      groups: [],
      recent_10: [],
      completions_in_a_row: 0
    },
    recent_items: []
  };
  const communityMatches = seed.communityMatches ?? [];
  const aiReply = seed.aiReply ?? {
    provider: "memory",
    model: "memory",
    text: ""
  };
  const manifestDefinitions = seed.manifestDefinitions ?? {};

  const profile: D2Services["profile"] = {
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
  };
  const localData: D2Services["localData"] = {
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
    async getPersonalWeaponKnowledge(weaponName) {
      if (!weaponName) return personalWeaponKnowledge;
      const normalizedName = weaponName.trim().toLocaleLowerCase();
      return {
        ...personalWeaponKnowledge,
        entries: personalWeaponKnowledge.entries.filter((entry) => entry.weapon_name.trim().toLocaleLowerCase() === normalizedName)
      };
    },
    async savePersonalWeaponKnowledge(input) {
      if (input.confirmed !== true) throw new Error("保存到我的推荐前必须由用户明确确认。");
      const now = new Date().toISOString();
      const existing = input.entry.id
        ? personalWeaponKnowledge.entries.find((entry) => entry.id === input.entry.id)
        : undefined;
      const entry = {
        ...input.entry,
        id: input.entry.id ?? `memory-${Date.now()}`,
        created_at: existing?.created_at ?? now,
        updated_at: now
      };
      personalWeaponKnowledge = {
        version: 1,
        entries: [entry, ...personalWeaponKnowledge.entries.filter((current) => current.id !== entry.id)]
      };
      return personalWeaponKnowledge;
    },
    async setPersonalWeaponKnowledgeEnabled(id, enabled) {
      personalWeaponKnowledge = {
        version: 1,
        entries: personalWeaponKnowledge.entries.map((entry) => entry.id === id ? { ...entry, enabled } : entry)
      };
      return personalWeaponKnowledge;
    },
    async deletePersonalWeaponKnowledge(id) {
      personalWeaponKnowledge = {
        version: 1,
        entries: personalWeaponKnowledge.entries.filter((entry) => entry.id !== id)
      };
      return personalWeaponKnowledge;
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
  };

  return {
    profile,
    manifest: {
      async getDefinition<TDefinition = unknown>(tableName: string, hash: number): Promise<TDefinition | null> {
        return (manifestDefinitions[tableName]?.[hash] ?? null) as TDefinition | null;
      }
    },
    localData,
    d2Skill: createD2SkillService({ profile, localData }),
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
