import type { VaultItemMatchInfo, WeaponRecommendation } from "./sharedTypes";
import type { DimWishlist, LocalCommunityRecommendationTable } from "./vaultApi";

export type CommunityApi = {
  getDimWishlist(): Promise<DimWishlist | null>;
  saveDimWishlist(wishlist: DimWishlist): Promise<DimWishlist>;
  clearDimWishlist(): Promise<null>;
  getLocalCommunityRecommendations(): Promise<LocalCommunityRecommendationTable | null>;
  saveLocalCommunityRecommendations(table: LocalCommunityRecommendationTable): Promise<LocalCommunityRecommendationTable>;
  clearLocalCommunityRecommendations(): Promise<null>;
  getCommunityPerkRecommendations(item_hash: number, options?: { item_name?: string }): Promise<WeaponRecommendation | null>;
  matchCommunityVaultItems(items: Array<{ hash: number; socket_plugs?: Array<{ hash: number }> }>): Promise<Array<{ hash: number } & VaultItemMatchInfo>>;
  clearLightggCache(): Promise<void>;
};
