import { LoadoutsPage } from "../../features/loadouts/LoadoutsPage";
import { useAccountSummaryStore } from "../../shared/stores/accountEntityStore";
import { useDesktopMenuSession } from "./DesktopMenuProviderContext";

export function LoadoutsMenuProvider() {
  const session = useDesktopMenuSession();
  const loadouts = session.loadouts;
  const accountSummary = useAccountSummaryStore();
  const writeActions = session.writeActions;
  const localPlans = session.localLoadoutPlans;

  return (
    <LoadoutsPage
      accountSummary={accountSummary}
      templates={loadouts.templates}
      selectedTemplateId={loadouts.selectedTemplateId}
      compareTemplateId={loadouts.compareTemplateId}
      renameDraft={loadouts.renameDraft}
      showDiffOnly={loadouts.showDiffOnly}
      message={writeActions.loadoutMessage}
      isRunningItemAction={writeActions.isRunningItemAction}
      actionFeedback={writeActions.loadoutActionFeedback.actionFeedback}
      localPlanWorkspace={localPlans.workspace}
      localPlanDraft={localPlans.draft}
      localPlanEditingId={localPlans.editingPlanId}
      localPlanIsSaving={localPlans.isSaving}
      localPlanError={localPlans.error}
      dimPreview={localPlans.dimPreview}
      localPlanIsPreviewingDim={localPlans.isPreviewingDim}
      localPlanExecutionPlan={localPlans.executionPlan}
      localPlanExecutionReport={localPlans.executionReport}
      localPlanIsExecuting={localPlans.isExecuting}
      localPlanIsImportingGuide={localPlans.isImportingGuide}
      onSelectTemplate={loadouts.selectTemplate}
      onSelectCompareTemplate={loadouts.setCompareTemplateId}
      onRenameDraftChange={loadouts.setRenameDraft}
      onShowDiffOnlyChange={loadouts.setShowDiffOnly}
      onRenameTemplate={(template) => void writeActions.loadoutWriteActions.renameLoadoutTemplate(template)}
      onDeleteTemplate={(id) => void writeActions.loadoutWriteActions.deleteLoadoutTemplate(id)}
      onCreateLocalPlanFromCharacter={(character) => void writeActions.loadoutWriteActions.saveCharacterLoadout(character)}
      onCreateTransferPlan={(template) => void writeActions.loadoutTemplateActions.createTemplateTransferPlan(template)}
      onCopyMissingItems={(template, analysis) => void writeActions.loadoutTemplateActions.copyMissingLoadoutItems(template, analysis)}
      onExecuteMissingTransfer={(template, analysis) => void writeActions.loadoutWriteActions.executeMissingLoadoutTransfer(template, analysis)}
      onExecuteSingleItemTransfer={(template, item) => void writeActions.loadoutWriteActions.executeSingleLoadoutItemTransfer(template, item)}
      onEquipSingleItem={(template, item) => void writeActions.loadoutWriteActions.equipSingleLoadoutItem(template, item)}
      onEquipSavedLoadout={(character, slot) => void writeActions.loadoutWriteActions.equipSavedLoadout(character, slot)}
      onSnapshotCurrentLoadout={(character, slot) => void writeActions.loadoutWriteActions.snapshotCurrentLoadout(character, slot)}
      onClearSavedLoadout={(character, slot) => void writeActions.loadoutWriteActions.clearSavedLoadout(character, slot)}
      onUpdateSavedLoadoutIdentifiers={(character, slot, identifiers) => void writeActions.loadoutWriteActions.updateSavedLoadoutIdentifiers(character, slot, identifiers)}
      onOpenTemplateSourceItem={(item, characterId) => void writeActions.loadoutWriteActions.openTemplateSourceItem(item, characterId)}
      onSelectLocalPlan={localPlans.selectPlan}
      onStartNewLocalPlan={localPlans.startNewPlan}
      onStartLocalPlanFromCharacter={localPlans.startFromCurrentCharacter}
      onStartLocalPlanFromInGameLoadout={localPlans.startFromInGameLoadout}
      onLocalPlanDraftChange={(draft) => localPlans.setDraft(draft)}
      onSaveLocalPlan={() => void localPlans.saveDraft()}
      onCloseLocalPlanEditor={localPlans.closeEditor}
      onDeleteLocalPlan={(id) => void localPlans.deletePlan(id)}
      onPreviewDimImport={(url) => void localPlans.previewDimImport(url)}
      onAcceptDimImport={localPlans.acceptDimImport}
      onDismissDimImport={localPlans.dismissDimImport}
      onExecuteLocalPlan={() => void localPlans.executeDraft()}
      onImportGuideText={(rawText, character) => void localPlans.importGuideText(rawText, character)}
    />
  );
}
