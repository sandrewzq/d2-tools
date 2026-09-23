export type {
  ItemDefinitionDetailLike,
  ItemSearchResultLike,
  SameNameItemSummary,
  SelectedItemDetail,
  SelectedItemSource,
  SelectedItemSourceKind
} from "./workspaces/itemDetail.js";
export {
  buildTargetInsightText,
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
  ArmorAbilityGroup,
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
  ArmorSocketLabel,
  ArmorSourceEntry,
  ArmorStatTrack,
  BuildArmorDetailViewModelInput
} from "./workspaces/armorDetail.js";
export { buildArmorDetailViewModel } from "./workspaces/armorDetail.js";
export type {
  BuildWeaponDetailViewModelInput,
  WeaponCatalystSummary,
  WeaponConfigurationClassification,
  WeaponConfigurationKind,
  WeaponDetailAmmo,
  WeaponDetailChampionEffect,
  WeaponDetailConfiguration,
  WeaponDetailDamage,
  WeaponDetailEntryKind,
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
  WeaponPerkPoolKind,
  WeaponPerkSelectionColumn,
  WeaponSocketPlugLike,
  WeaponSocketColumnLabel,
  WeaponRecommendation,
  WeaponRecommendationPerkCandidate,
  WeaponSourceEntry,
  WeaponStatTrack,
  WeaponVendorOfferSummary
} from "./workspaces/weaponDetail.js";
export {
  buildWeaponDetailViewModel,
  buildWeaponStatTracks,
  classifyWeaponConfiguration,
  classifyWeaponSocketPlugs,
  isEnhancedWeaponPerk,
  isWeaponSystemPlug,
  perkGroupsToPoolColumns,
  weaponSocketColumnLabel
} from "./workspaces/weaponDetail.js";
