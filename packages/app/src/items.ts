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
  BuildWeaponDetailViewModelInput,
  WeaponCatalystSummary,
  WeaponConfigurationKind,
  WeaponDetailAmmo,
  WeaponDetailChampionEffect,
  WeaponDetailConfiguration,
  WeaponDetailDamage,
  WeaponDetailIdentity,
  WeaponDetailInstance,
  WeaponDetailObjectContext,
  WeaponDetailSources,
  WeaponDetailUpgrades,
  WeaponDetailViewModel,
  WeaponPerkCandidate,
  WeaponPerkPoolColumn,
  WeaponPerkSelectionColumn,
  WeaponRecommendation,
  WeaponRecommendationMatch,
  WeaponSourceEntry,
  WeaponStatTrack,
  WeaponVendorOfferSummary
} from "./workspaces/weaponDetail.js";
export {
  buildWeaponDetailViewModel,
  buildWeaponStatTracks,
  perkGroupsToPoolColumns
} from "./workspaces/weaponDetail.js";
