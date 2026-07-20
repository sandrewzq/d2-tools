export type {
  ItemDefinitionDetailLike,
  ItemSearchResultLike,
  SameNameItemSummary,
  SelectedItemDetail,
  SelectedItemSource,
  SelectedItemSourceKind
} from "./workspaces/itemDetail.js";
export {
  buildWishlistInsightText,
  collectSelectedSameNameItems,
  createSelectedItemPreview,
  formatVaultTagLabel as formatItemDetailVaultTagLabel,
  getItemKey,
  mergeSelectedItemDetail,
  selectBestSameNameItem,
  selectedItemToAccountItem,
  sortSameNameItems
} from "./workspaces/itemDetail.js";
export type {
  ArmorAbility,
  ArmorDetailEntryKind,
  ArmorDetailIdentity,
  ArmorDetailInstance,
  ArmorDetailInstanceLike,
  ArmorDetailObjectContext,
  ArmorDetailObjectKind,
  ArmorDetailSelectedItemLike,
  ArmorDetailSources,
  ArmorDetailViewModel,
  ArmorRecommendation,
  ArmorSocket,
  ArmorSourceEntry,
  ArmorStatTrack,
  BuildArmorDetailViewModelInput
} from "./workspaces/armorDetail.js";
export { buildArmorDetailViewModel } from "./workspaces/armorDetail.js";
export type {
  BuildWeaponDetailViewModelInput,
  WeaponCatalystSummary,
  WeaponConfigurationKind,
  WeaponDetailAmmo,
  WeaponDetailChampionEffect,
  WeaponDetailConfiguration,
  WeaponDetailDamage,
  WeaponEnhancementSummary,
  WeaponDetailIdentity,
  WeaponDetailInstance,
  WeaponDetailInstanceLike,
  WeaponDetailInstanceMetadata,
  WeaponDetailLoadoutReference,
  WeaponDetailObjectContext,
  WeaponDetailSources,
  WeaponDetailUpgrades,
  WeaponDetailViewModel,
  WeaponPerkCandidate,
  WeaponPerkColumnRole,
  WeaponPerkPoolColumn,
  WeaponPerkSelectionColumn,
  WeaponSocketPlugLike,
  WeaponRecommendation,
  WeaponRecommendationMatch,
  WeaponSourceEntry,
  WeaponStatTrack,
  WeaponVendorOfferSummary
} from "./workspaces/weaponDetail.js";
export {
  buildWeaponDetailViewModel,
  buildWeaponStatTracks,
  classifyWeaponSocketPlugs,
  isEnhancedWeaponPerk,
  isWeaponSystemPlug,
  perkGroupsToPoolColumns
} from "./workspaces/weaponDetail.js";
export type {
  ArmorAbility,
  ArmorAbilityKind,
  ArmorBuildFit,
  ArmorDetailEntryKind,
  ArmorDetailIdentity,
  ArmorDetailInstance,
  ArmorDetailInstanceLike,
  ArmorDetailObjectContext,
  ArmorDetailObjectKind,
  ArmorDetailRecommendations,
  ArmorDetailSelectedItemLike,
  ArmorDetailSources,
  ArmorDetailUpgrades,
  ArmorDetailVersion,
  ArmorDetailViewModel,
  ArmorInstalledMod,
  ArmorRecommendation,
  ArmorSourceEntry,
  ArmorStatProfile,
  ArmorStatTrack,
  ArmorTargetCondition,
  BuildArmorDetailViewModelInput
} from "./workspaces/armorDetail.js";
export {
  armorStatLabel,
  buildArmorDetailViewModel,
  buildArmorStatProfile
} from "./workspaces/armorDetail.js";
