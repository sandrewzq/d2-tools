import type {
  VaultItemInstanceMatchInfo,
  VaultCommunityMatchResult,
  VaultItemMatchInfo,
  VaultItemMatchInput,
  WeaponRecommendation
} from "@d2-tools/core/community-perks";
import type { DimWishlistImportPreview } from "@d2-tools/core/analysis/wishlistImport";

export type {
  AccountItemDetail,
  AccountItemPlugSummary,
  AccountItemSnapshot,
  AccountItemSummary,
  AccountSnapshot,
  AmmoTypeKey,
  ArmorEnergySummary,
  ArmorStatBreakdownSummary,
  ArmorStatSummary,
  EquipmentGroupKey,
  WeaponFrameSummary,
  WeaponStatKey,
  WeaponStatSummary
} from "@d2-tools/core/account/summary";
export type { ArmorStatKey } from "@d2-tools/core/loadouts/analysis";
export type { ItemPerkGroup, ItemPlugSummary } from "@d2-tools/core/items/perks";
export type { ItemDefinitionStat } from "@d2-tools/core/items/search";
export type { ItemDefinitionVersionSummary, ItemReleaseSummary } from "@d2-tools/core/items/release";
export type { ArmorSetCatalogEntry, ArmorSetCatalogItem, EquipableItemSetSummary } from "@d2-tools/core/items/equipableItemSet";
export type { WeaponBreakerTypeSummary } from "@d2-tools/core/items/breakerTypes";
export type { DamageTypeSummary } from "@d2-tools/core/items/damageTypes";
export type { LiveItemAvailability } from "@d2-tools/core/items/liveAvailability";
export type { ItemSourceSummary } from "@d2-tools/core/items/source";
export type {
  BuildGuideLoadoutDraft,
  BuildGuideMatchResult,
  BuildGuideParseResult,
  BuildGuideRequirement
} from "@d2-tools/core/assistant/guideSchema";
export type { VaultCommunityMatchResult, VaultItemInstanceMatchInfo, VaultItemMatchInfo, VaultItemMatchInput, WeaponRecommendation };
export type {
  DimWishlistImportPreview
};

export type DimWishlistOnlineStatus = {
  source_url: string;
  current_revision: string;
  current_fingerprint: string;
  activated_at: string;
  checked_at: string;
  latest_revision: string;
  latest_commit_at: string;
  rule_count: number;
  weapon_count: number;
};

export type DimWishlistOnlinePreview = DimWishlistOnlineStatus & {
  token?: string;
  update_available: boolean;
  file_name: string;
  title: string;
  preview_fingerprint: string;
  mode_counts: Record<"pve" | "pvp" | "general", number>;
  authors: string[];
  tags: string[];
};

export type DimWishlistOnlineActivationResult = {
  wishlist: import("./vaultApi").DimWishlist;
  status: DimWishlistOnlineStatus;
};

export type WeaponRecommendationKnowledgeStatus = {
  schema_version: number;
  database_path: string;
  source_fingerprint: string;
  imported_at: string;
  recommendation_count: number;
  weapon_count: number;
  source_count: number;
};

export type WeaponKnowledgeImportPreview = {
  file_name: string;
  recommendation_count: number;
  weapon_count: number;
  source_count: number;
  source_labels: string[];
  fingerprint: string;
};

export type WeaponKnowledgeImportResult = WeaponRecommendationKnowledgeStatus & {
  file_name: string;
};

export type WeaponKnowledgeImportSelection = WeaponKnowledgeImportPreview & {
  token: string;
};

export type FileExportResult = {
  canceled: boolean;
  file_path?: string;
  message: string;
};

export type AiAdviceSections = {
  facts: string[];
  analysis: string[];
  suggestions: string[];
  action_reminders: string[];
  raw: string;
};
