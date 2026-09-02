import type {
  DimWishlistImportPreview,
  DimWishlistOnlineActivationResult,
  DimWishlistOnlinePreview,
  DimWishlistOnlineStatus,
  FileExportResult,
  VaultCommunityMatchResult,
  VaultItemMatchInput,
  WeaponKnowledgeImportResult,
  WeaponKnowledgeImportSelection,
  WeaponRecommendationKnowledgeStatus,
  WeaponRecommendation
} from "./sharedTypes";
import type { DimWishlist, LocalCommunityRecommendationTable } from "./vaultApi";
import type {
  PersonalWeaponKnowledgeTable,
  SavePersonalWeaponKnowledgeInput
} from "@d2-tools/core/community-perks/personalWeaponKnowledge";

export type CommunityApi = {
  getDimWishlist(): Promise<DimWishlist | null>;
  saveDimWishlist(wishlist: DimWishlist): Promise<DimWishlist>;
  clearDimWishlist(): Promise<null>;
  selectDimWishlistFile(): Promise<DimWishlistImportPreview | null>;
  confirmDimWishlistImport(token: string): Promise<DimWishlist>;
  getDimWishlistOnlineStatus(): Promise<DimWishlistOnlineStatus>;
  checkDimWishlistOnlineUpdate(): Promise<DimWishlistOnlinePreview>;
  confirmDimWishlistOnlineUpdate(token: string): Promise<DimWishlistOnlineActivationResult>;
  exportWeaponKnowledgeCsvTemplate(): Promise<FileExportResult>;
  selectWeaponKnowledgeCsv(): Promise<WeaponKnowledgeImportSelection | null>;
  confirmWeaponKnowledgeCsvImport(token: string): Promise<WeaponKnowledgeImportResult>;
  getWeaponKnowledgeStatus(): Promise<WeaponRecommendationKnowledgeStatus | null>;
  getLocalCommunityRecommendations(): Promise<LocalCommunityRecommendationTable | null>;
  saveLocalCommunityRecommendations(table: LocalCommunityRecommendationTable): Promise<LocalCommunityRecommendationTable>;
  clearLocalCommunityRecommendations(): Promise<null>;
  getPersonalWeaponKnowledge(weaponName?: string): Promise<PersonalWeaponKnowledgeTable>;
  savePersonalWeaponKnowledge(input: SavePersonalWeaponKnowledgeInput): Promise<PersonalWeaponKnowledgeTable>;
  setPersonalWeaponKnowledgeEnabled(id: string, enabled: boolean): Promise<PersonalWeaponKnowledgeTable>;
  deletePersonalWeaponKnowledge(id: string): Promise<PersonalWeaponKnowledgeTable>;
  getCommunityPerkRecommendations(item_hash: number, options?: { item_name?: string }): Promise<WeaponRecommendation | null>;
  matchCommunityVaultItems(items: VaultItemMatchInput[]): Promise<VaultCommunityMatchResult>;
  clearLightggCache(): Promise<void>;
};
