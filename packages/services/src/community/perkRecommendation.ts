import { CommunityPerkRecommendationService } from "@d2-tools/core/community-perks";
import { createCsvRecommendationSources } from "./csvRecommendationSource.js";
import { createDimWishlistSources } from "./dimWishlistSource.js";

/**
 * 应用内全部社区推荐来源。
 *
 * 两个适配器**并排注册、无主次**：格式差异在各自的适配器里终止（分层图 ②），
 * 装上服务之后就是一组同构的 `CommunityPerkSource`。谁的来源先显示由数据决定
 * （各自带来源标签），不存在「哪个格式更权威」这种写入合同层的概念。
 */
export function createDefaultCommunityPerkService(
  config: { data?: { data_dir?: string } } | null | undefined
): CommunityPerkRecommendationService {
  const service = new CommunityPerkRecommendationService();
  const dataDir = config?.data?.data_dir;
  if (dataDir) {
    for (const source of createCsvRecommendationSources(dataDir)) service.addSource(source);
    for (const source of createDimWishlistSources(dataDir)) service.addSource(source);
  }
  return service;
}

export { createCsvRecommendationSources } from "./csvRecommendationSource.js";
export { createDimWishlistSources } from "./dimWishlistSource.js";
