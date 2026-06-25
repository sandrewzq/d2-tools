import type { DimWishlist } from "@d2-tools/core/analysis/wishlistImport";
import type { LocalTargetRules } from "@d2-tools/core/analysis/targets";
import type { LocalCommunityRecommendationTable } from "@d2-tools/core/community-perks";
import type { VaultTags, SaveVaultTagInput, SaveVaultNoteInput } from "@d2-tools/core/vault/tags";
import type { AiChatRequest, AiChatReplyResult } from "./types.js";
import type { DesktopBridgeApi } from "./desktopBridge.js";
import type { D2Services } from "./contracts.js";

export function createAppServices(api: DesktopBridgeApi): D2Services {
  return {
    profile: {
      getAccountSummary: () => api.getAccountSummary(),
      getActivitySummary: (input) => api.getActivitySummary(input),
      matchCommunityVaultItems: (items) => api.matchCommunityVaultItems(items)
    },
    manifest: {
      getDefinition: async () => null
    },
    localData: {
      getDimWishlist: () => api.getDimWishlist(),
      saveDimWishlist: (wishlist: DimWishlist) => api.saveDimWishlist(wishlist),
      clearDimWishlist: () => api.clearDimWishlist(),
      getLocalCommunityRecommendations: () => api.getLocalCommunityRecommendations(),
      saveLocalCommunityRecommendations: (table: LocalCommunityRecommendationTable) => api.saveLocalCommunityRecommendations(table),
      clearLocalCommunityRecommendations: () => api.clearLocalCommunityRecommendations(),
      getVaultTags: () => api.getVaultTags(),
      saveVaultTag: (input: SaveVaultTagInput) => api.saveVaultTag(input),
      saveVaultTagsBatch: (inputs: SaveVaultTagInput[]) => api.saveVaultTagsBatch(inputs),
      saveVaultNote: (input: SaveVaultNoteInput) => api.saveVaultNote(input),
      getLocalTargetRules: () => api.getLocalTargetRules(),
      saveLocalTargetRules: (rules: LocalTargetRules) => api.saveLocalTargetRules(rules),
      clearLocalTargetRules: () => api.clearLocalTargetRules()
    },
    ai: {
      sendChat: (input: AiChatRequest) => api.sendAiChat(input)
    }
  };
}
