import type { VaultItemMatchInfo, WeaponRecommendation } from "@d2-tools/core/community-perks";

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
export type { VaultItemMatchInfo, WeaponRecommendation };

export type AiAdviceSections = {
  facts: string[];
  analysis: string[];
  suggestions: string[];
  action_reminders: string[];
  raw: string;
};
