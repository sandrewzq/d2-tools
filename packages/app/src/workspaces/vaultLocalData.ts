import type { DimWishlist } from "@d2-tools/core/analysis/wishlistImport";
import type { LocalTargetRules } from "@d2-tools/core/analysis/targets";
import type { LocalCommunityRecommendationTable } from "@d2-tools/core/community-perks";
import type { VaultTags } from "@d2-tools/core/vault/tags";
import type { D2Services } from "@d2-tools/services";
import { runQuery, type QueryState } from "../queryState.js";

export type VaultLocalDataState = {
  tags: VaultTags;
  wishlist: DimWishlist | null;
  targetRules: LocalTargetRules;
  localCommunityRecommendations: LocalCommunityRecommendationTable | null;
};

export function loadVaultLocalData(
  services: Pick<D2Services, "localData">
): Promise<QueryState<VaultLocalDataState>> {
  return runQuery(async () => {
    const [tags, wishlist, targetRules, localCommunityRecommendations] = await Promise.all([
      services.localData.getVaultTags(),
      services.localData.getDimWishlist(),
      services.localData.getLocalTargetRules(),
      services.localData.getLocalCommunityRecommendations()
    ]);

    return {
      tags,
      wishlist,
      targetRules,
      localCommunityRecommendations
    };
  });
}
