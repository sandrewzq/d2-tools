import { CommunityPerkRecommendationService } from "@d2-tools/core/community-perks";
import { createAiLightggSource, type AiLightggConfig } from "./aiLightggSource.js";
import { createDimWishlistSource } from "./dimWishlistSource.js";
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
    service.addSource(createDimWishlistSource(dataDir));
  }
  return service;
}

export function createFullCommunityPerkService(config: AiLightggConfig): CommunityPerkRecommendationService {
  const service = createDefaultCommunityPerkService(config);
  const ai = config?.ai;
  if (ai?.protocol && ai.api_key && ai.model) {
    service.addSource(createAiLightggSource(config));
  }
  return service;
}

export { createDimWishlistSource } from "./dimWishlistSource.js";
