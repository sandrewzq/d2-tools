export type { LoadoutTemplateLookup } from "./workspaces/loadoutTemplateLookup.js";
export type { LoadoutTemplate, LoadoutTemplateItem } from "@d2-tools/core/loadouts/templates";
export { buildLoadoutTemplateLookup, matchesLoadoutTemplateItem } from "./workspaces/loadoutTemplateLookup.js";
export type {
  MissingLoadoutBlockedDescription,
  MissingLoadoutEquipSwapItem,
  MissingLoadoutTransferItem,
  MissingLoadoutTransferPlan,
  MissingLoadoutTransferReason,
  MissingLoadoutTransferStep
} from "./workspaces/loadoutTransfer.js";
export {
  buildMissingLoadoutTransferPlan,
  describeMissingLoadoutBlockedReason
} from "./workspaces/loadoutTransfer.js";
export type { LoadoutSourceItem } from "./workspaces/loadoutSources.js";
export {
  findBestTemplateSourceItem,
  getAllKnownAccountItemsWithSource
} from "./workspaces/loadoutSources.js";
export type { LoadoutCompareCell, LoadoutCompareRow } from "./workspaces/loadoutViewModel.js";
export {
  buildLoadoutCompareRows,
  buildMissingLoadoutItemsText,
  formatLoadoutComparePerks,
  isMatchingTemplateItem,
  isTemplateItemReady,
  isTemplateItemReadyFromPlan
} from "./workspaces/loadoutViewModel.js";
export type { LoadoutItemStatus, LoadoutStatusSourceItem } from "./workspaces/loadoutItemStatus.js";
export {
  buildLoadoutItemStatus,
  summarizeLoadoutItemStatuses
} from "./workspaces/loadoutItemStatus.js";
export type {
  InGameLoadoutItemView,
  LoadoutCompareView,
  LoadoutEntry,
  LoadoutEntryView,
  LoadoutsPageInput,
  LoadoutRiskSummaryView,
  LoadoutsPageModel,
  LoadoutsPageWorkspace,
  LoadoutsSelectedDetailView,
  LoadoutTemplateItemRowView
} from "./workspaces/loadoutsPage.js";
export {
  createLoadoutsPageWorkspace,
  getLoadoutItemBlockedDetails,
  getLoadoutItemStatus,
  selectLoadoutsPageModel
} from "./workspaces/loadoutsPage.js";
export type { LoadoutActionResultCounts } from "./workspaces/loadoutActions.js";
export {
  buildCharacterLoadoutTemplateName,
  buildLoadoutItemActionFailureMessage,
  buildLoadoutSlotActionConfirmText,
  buildLoadoutSlotActionLabel,
  buildLoadoutSlotActionProgressMessage,
  buildLoadoutCopyMissingNoAccountMessage,
  buildLoadoutTemplateDeletedMessage,
  buildLoadoutTemplateRenamedMessage,
  buildLoadoutTemplateTransferClipboardText,
  buildLoadoutTemplateTransferCopiedMessage,
  buildLoadoutTemplateTransferNoTargetMessage,
  buildMissingLoadoutAllReadyMessage,
  buildMissingLoadoutConfirmText,
  buildMissingLoadoutItemsCopiedMessage,
  buildMissingLoadoutNoActionMessage,
  buildMissingLoadoutPrepareMessage,
  buildMissingLoadoutResultMessage,
  buildMissingLoadoutStepProgressMessage,
  buildSaveCharacterLoadoutSuccessMessage,
  buildSingleLoadoutEquipConfirmText,
  buildSingleLoadoutEquipMissingSourceMessage,
  buildSingleLoadoutEquipProgressMessage,
  buildSingleLoadoutEquipWrongLocationMessage,
  buildSingleLoadoutTransferConfirmText,
  buildSingleLoadoutTransferCancelledMessage,
  buildSingleLoadoutTransferNoActionMessage,
  buildSingleLoadoutTransferNoTargetMessage,
  buildSingleLoadoutTransferResultMessage,
  buildSingleLoadoutTransferStartMessage,
  buildSingleLoadoutTransferStepProgressMessage,
  getMissingLoadoutActionableCount
} from "./workspaces/loadoutActions.js";
