import type { AccountSummary } from "@d2-tools/core/account/summary";
import type { ActivityHistorySummary } from "@d2-tools/core/activities/history";
import type { DimWishlist } from "@d2-tools/core/analysis/wishlistImport";
import type { LocalTargetRules } from "@d2-tools/core/analysis/targets";
import type { LocalCommunityRecommendationTable } from "@d2-tools/core/community-perks";
import type {
  PersonalWeaponKnowledgeTable,
  SavePersonalWeaponKnowledgeInput
} from "@d2-tools/core/community-perks/personalWeaponKnowledge";
import type { VaultItemMatchInfo, WeaponRecommendation } from "./sharedTypes.js";
import type { VaultTags, SaveVaultNoteInput, SaveVaultTagInput } from "@d2-tools/core/vault/tags";
import type { D2SkillService } from "./d2SkillService.js";
import type { AiChatReplyResult, AiChatRequest } from "./types.js";

export type ProfileService = {
  getAccountSummary(options?: { force?: boolean }): Promise<AccountSummary>;
  getActivitySummary(input: {
    membership_type: number;
    membership_id: string;
    character_ids: string[];
  }): Promise<ActivityHistorySummary>;
  matchCommunityVaultItems?: (items: Array<{ hash: number; socket_plugs?: Array<{ hash: number }> }>) => Promise<Array<{ hash: number } & VaultItemMatchInfo>>;
};

export type LocalDataService = {
  getDimWishlist(): Promise<DimWishlist | null>;
  saveDimWishlist(wishlist: DimWishlist): Promise<DimWishlist>;
  clearDimWishlist(): Promise<null>;
  getLocalCommunityRecommendations(): Promise<LocalCommunityRecommendationTable | null>;
  saveLocalCommunityRecommendations(
    table: LocalCommunityRecommendationTable
  ): Promise<LocalCommunityRecommendationTable>;
  clearLocalCommunityRecommendations(): Promise<null>;
  getPersonalWeaponKnowledge?: (weaponName?: string) => Promise<PersonalWeaponKnowledgeTable>;
  savePersonalWeaponKnowledge?: (input: SavePersonalWeaponKnowledgeInput) => Promise<PersonalWeaponKnowledgeTable>;
  setPersonalWeaponKnowledgeEnabled?: (id: string, enabled: boolean) => Promise<PersonalWeaponKnowledgeTable>;
  deletePersonalWeaponKnowledge?: (id: string) => Promise<PersonalWeaponKnowledgeTable>;
  getVaultTags(): Promise<VaultTags>;
  saveVaultTag(input: SaveVaultTagInput): Promise<VaultTags>;
  saveVaultTagsBatch(inputs: SaveVaultTagInput[]): Promise<VaultTags>;
  saveVaultNote(input: SaveVaultNoteInput): Promise<VaultTags>;
  getLocalTargetRules(): Promise<LocalTargetRules>;
  saveLocalTargetRules(rules: LocalTargetRules): Promise<LocalTargetRules>;
  clearLocalTargetRules(): Promise<LocalTargetRules>;
};

export type AiService = {
  sendChat(input: AiChatRequest): Promise<AiChatReplyResult>;
};

export type D2Services = {
  profile: ProfileService;
  localData: LocalDataService;
  d2Skill: D2SkillService;
  ai: AiService;
};
