import {
  CommunityPerkRecommendationService,
  createAiLightggSource,
  createLocalCommunitySource
} from "@d2-tools/core/community-perks";
import { createDimWishlistSource } from "./dimWishlistSource.js";

type FullServiceConfig = {
  data?: { data_dir?: string };
  ai?: {
    protocol?: string;
    provider?: string;
    api_key?: string;
    model?: string;
    base_url?: string;
    enable_lightgg?: boolean;
    force_lightgg?: boolean;
  };
} | null | undefined;

export function createDefaultCommunityPerkService(
  config: { data?: { data_dir?: string } } | null | undefined
): CommunityPerkRecommendationService {
  const service = new CommunityPerkRecommendationService(config);
  const dataDir = config?.data?.data_dir;
  if (dataDir) {
    service.addSource(createLocalCommunitySource(dataDir));
    service.addSource(createDimWishlistSource(dataDir));
  }
  return service;
}

export function createFullCommunityPerkService(config: FullServiceConfig): CommunityPerkRecommendationService {
  const service = createDefaultCommunityPerkService(config);
  const ai = config?.ai;
  if ((ai?.protocol || ai?.provider) && ai?.api_key && ai?.model) {
    service.addSource(createAiLightggSource(config));
  }
  return service;
}

export { createDimWishlistSource } from "./dimWishlistSource.js";
