import type { AccountSummary } from "@d2-tools/core/account/summary";
import type { ActivityHistorySummary } from "@d2-tools/core/activities/history";
import type { DimWishlist } from "@d2-tools/core/analysis/wishlistImport";
import type { LocalTargetRules } from "@d2-tools/core/analysis/targets";
import type { LocalCommunityRecommendationTable } from "@d2-tools/core/community-perks";
import type {
  PersonalWeaponKnowledgeTable,
  SavePersonalWeaponKnowledgeInput
} from "@d2-tools/core/community-perks/personalWeaponKnowledge";
import type { VaultItemMatchInfo, WeaponRecommendation } from "@d2-tools/core/community-perks";
import type { VaultTags, SaveVaultNoteInput, SaveVaultTagInput } from "@d2-tools/core/vault/tags";
import type { AiChatReplyResult, AiChatRequest } from "./types.js";
import type { D2Services } from "./contracts.js";
import { createD2SkillService } from "./d2SkillService.js";

export type DesktopBridgeApi = {
  getAccountSummary(): Promise<AccountSummary>;
  getActivitySummary(input: { membership_type: number; membership_id: string; character_ids: string[] }): Promise<ActivityHistorySummary>;
  matchCommunityVaultItems(items: Array<{ hash: number; socket_plugs?: Array<{ hash: number }> }>): Promise<Array<{ hash: number } & VaultItemMatchInfo>>;
  getDimWishlist(): Promise<DimWishlist | null>;
  saveDimWishlist(wishlist: DimWishlist): Promise<DimWishlist>;
  clearDimWishlist(): Promise<null>;
  getLocalCommunityRecommendations(): Promise<LocalCommunityRecommendationTable | null>;
  saveLocalCommunityRecommendations(table: LocalCommunityRecommendationTable): Promise<LocalCommunityRecommendationTable>;
  clearLocalCommunityRecommendations(): Promise<null>;
  getPersonalWeaponKnowledge(weaponName?: string): Promise<PersonalWeaponKnowledgeTable>;
  savePersonalWeaponKnowledge(input: SavePersonalWeaponKnowledgeInput): Promise<PersonalWeaponKnowledgeTable>;
  setPersonalWeaponKnowledgeEnabled(id: string, enabled: boolean): Promise<PersonalWeaponKnowledgeTable>;
  deletePersonalWeaponKnowledge(id: string): Promise<PersonalWeaponKnowledgeTable>;
  getVaultTags(): Promise<VaultTags>;
  saveVaultTag(input: SaveVaultTagInput): Promise<VaultTags>;
  saveVaultTagsBatch(inputs: SaveVaultTagInput[]): Promise<VaultTags>;
  saveVaultNote(input: SaveVaultNoteInput): Promise<VaultTags>;
  getLocalTargetRules(): Promise<LocalTargetRules>;
  saveLocalTargetRules(rules: LocalTargetRules): Promise<LocalTargetRules>;
  clearLocalTargetRules(): Promise<LocalTargetRules>;
  sendAiChat(input: AiChatRequest): Promise<AiChatReplyResult>;
};

export function createDesktopBridgeServices(api: DesktopBridgeApi): D2Services {
  const profile: D2Services["profile"] = {
      getAccountSummary: () => api.getAccountSummary(),
      getActivitySummary: (input) => api.getActivitySummary(input),
      matchCommunityVaultItems: (items) => api.matchCommunityVaultItems(items)
    };
  const localData: D2Services["localData"] = {
      getDimWishlist: () => api.getDimWishlist(),
      saveDimWishlist: (wishlist) => api.saveDimWishlist(wishlist),
      clearDimWishlist: () => api.clearDimWishlist(),
      getLocalCommunityRecommendations: () => api.getLocalCommunityRecommendations(),
      saveLocalCommunityRecommendations: (table) => api.saveLocalCommunityRecommendations(table),
      clearLocalCommunityRecommendations: () => api.clearLocalCommunityRecommendations(),
      getPersonalWeaponKnowledge: (weaponName) => api.getPersonalWeaponKnowledge(weaponName),
      savePersonalWeaponKnowledge: (input) => api.savePersonalWeaponKnowledge(input),
      setPersonalWeaponKnowledgeEnabled: (id, enabled) => api.setPersonalWeaponKnowledgeEnabled(id, enabled),
      deletePersonalWeaponKnowledge: (id) => api.deletePersonalWeaponKnowledge(id),
      getVaultTags: () => api.getVaultTags(),
      saveVaultTag: (input) => api.saveVaultTag(input),
      saveVaultTagsBatch: (inputs) => api.saveVaultTagsBatch(inputs),
      saveVaultNote: (input) => api.saveVaultNote(input),
      getLocalTargetRules: () => api.getLocalTargetRules(),
      saveLocalTargetRules: (rules) => api.saveLocalTargetRules(rules),
      clearLocalTargetRules: () => api.clearLocalTargetRules()
    };

  return {
    profile,
    manifest: {
      getDefinition: async () => null
    },
    localData,
    d2Skill: createD2SkillService({ profile, localData }),
    ai: {
      sendChat: (input) => api.sendAiChat(input)
    }
  };
}
