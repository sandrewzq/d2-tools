import type { AccountItemSummary, AccountSummary } from "@d2-tools/core/account/summary";
import type { LocalTargetRules } from "@d2-tools/core/analysis/targets";
import type { DimWishlist } from "@d2-tools/core/analysis/wishlistImport";
import type { LocalCommunityRecommendationTable } from "@d2-tools/core/community-perks";
import type { LocalDataService, ProfileService } from "./contracts.js";

export type GuideContext = {
  account: AccountSummary;
  items: AccountItemSummary[];
  localTargetRules: LocalTargetRules;
  wishlist: DimWishlist | null;
  communityRecommendations: LocalCommunityRecommendationTable | null;
};

export type GuideContextService = {
  getContext(): Promise<GuideContext>;
};

export function createGuideContextService(services: {
  profile: Pick<ProfileService, "getAccountSummary">;
  localData: Pick<LocalDataService, "getLocalTargetRules" | "getDimWishlist" | "getLocalCommunityRecommendations">;
}): GuideContextService {
  return {
    async getContext() {
      const [account, localTargetRules, wishlist, communityRecommendations] = await Promise.all([
        services.profile.getAccountSummary(),
        services.localData.getLocalTargetRules(),
        services.localData.getDimWishlist(),
        services.localData.getLocalCommunityRecommendations()
      ]);

      return {
        account,
        items: collectGuideAccountItems(account),
        localTargetRules,
        wishlist,
        communityRecommendations
      };
    }
  };
}

export function collectGuideAccountItems(account: AccountSummary): AccountItemSummary[] {
  return [
    ...account.vault.items,
    ...account.characters.flatMap((character) => [
      ...character.equipped_items,
      ...character.inventory_items,
      ...character.postmaster_items
    ])
  ];
}
