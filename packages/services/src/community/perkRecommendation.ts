import { CommunityPerkRecommendationService } from "@d2-tools/core/community-perks";
import { createDimWishlistSources } from "./dimWishlistSource.js";
import { createLocalCommunitySource } from "./localCommunityRecommendations.js";
import { createWeaponRecommendationKnowledgeSource } from "./weaponRecommendationKnowledge.js";

export function createDefaultCommunityPerkService(
  config: { data?: { data_dir?: string } } | null | undefined
): CommunityPerkRecommendationService {
  const service = new CommunityPerkRecommendationService();
  const dataDir = config?.data?.data_dir;
  if (dataDir) {
    service.addSource(createWeaponRecommendationKnowledgeSource(dataDir));
    service.addSource(createLocalCommunitySource(dataDir));
    for (const source of createDimWishlistSources(dataDir)) service.addSource(source);
  }
  return service;
}

export { createDimWishlistSources } from "./dimWishlistSource.js";
