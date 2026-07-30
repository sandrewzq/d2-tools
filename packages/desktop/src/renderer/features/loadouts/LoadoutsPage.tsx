import { useMemo, useState } from "react";
import { LoadoutsPageContentView, type LoadoutActionFeedbackState, type LoadoutsPageActions } from "@d2-tools/ui";
import { analyzeLoadoutTemplate } from "@d2-tools/core/loadouts/analysis";
import type { AccountSummary, CharacterSummary, LoadoutTemplate } from "../../api/types";
import type { CreateLocalLoadoutPlanInput } from "@d2-tools/core/loadouts/plans";
import type { DimLoadoutImportPreview } from "@d2-tools/core/loadouts/dimImport";
import type { LocalLoadoutPlanExecutionPlan } from "@d2-tools/core/loadouts/localPlanExecution";
import { selectLoadoutsPageModel, type LocalLoadoutPlanWorkbenchModel } from "@d2-tools/app/loadouts";
import type { LocalPlanExecutionReport } from "./useLocalLoadoutPlans";

export type LoadoutsPageProps = {
  accountSummary: AccountSummary | null;
  templates: LoadoutTemplate[];
  selectedTemplateId: string;
  compareTemplateId: string;
  renameDraft: string;
  showDiffOnly: boolean;
  message: string;
  isRunningItemAction: boolean;
  actionFeedback: Record<string, LoadoutActionFeedbackState>;
  localPlanWorkspace: LocalLoadoutPlanWorkbenchModel;
  localPlanDraft: CreateLocalLoadoutPlanInput | null;
  localPlanEditingId: string | null;
  localPlanIsSaving: boolean;
  localPlanError: string;
  dimPreview: DimLoadoutImportPreview | null;
  localPlanIsPreviewingDim: boolean;
  localPlanExecutionPlan: LocalLoadoutPlanExecutionPlan | null;
  localPlanExecutionReport: LocalPlanExecutionReport | null;
  localPlanIsExecuting: boolean;
  localPlanIsImportingGuide: boolean;
  onSelectTemplate: (id: string) => void;
  onSelectCompareTemplate: (id: string) => void;
  onRenameDraftChange: (value: string) => void;
  onShowDiffOnlyChange: (value: boolean) => void;
  onRenameTemplate: (template: LoadoutTemplate) => void;
  onDeleteTemplate: (id: string) => void;
  onCreateLocalPlanFromCharacter: (character: AccountSummary["characters"][number]) => void;
  onCreateTransferPlan: (template: LoadoutTemplate) => void;
  onCopyMissingItems: (
    template: LoadoutTemplate,
    analysis: ReturnType<typeof analyzeLoadoutTemplate> | null
  ) => void;
  onExecuteMissingTransfer: (
    template: LoadoutTemplate,
    analysis: ReturnType<typeof analyzeLoadoutTemplate> | null
  ) => void;
  onExecuteSingleItemTransfer: (
    template: LoadoutTemplate,
    item: LoadoutTemplate["items"][number]
  ) => void;
  onEquipSingleItem: (
    template: LoadoutTemplate,
    item: LoadoutTemplate["items"][number]
  ) => void;
  onEquipSavedLoadout: (
    character: AccountSummary["characters"][number],
    slot: AccountSummary["characters"][number]["loadout_slots"][number]
  ) => void;
  onSnapshotCurrentLoadout: (
    character: AccountSummary["characters"][number],
    slot: AccountSummary["characters"][number]["loadout_slots"][number]
  ) => void;
  onClearSavedLoadout: (
    character: AccountSummary["characters"][number],
    slot: AccountSummary["characters"][number]["loadout_slots"][number]
  ) => void;
  onUpdateSavedLoadoutIdentifiers: (
    character: AccountSummary["characters"][number],
    slot: AccountSummary["characters"][number]["loadout_slots"][number],
    identifiers: { name_hash?: number; icon_hash?: number; color_hash?: number }
  ) => void;
  onOpenTemplateSourceItem: (
    item: LoadoutTemplate["items"][number],
    templateCharacterId?: string
  ) => void;
  onSelectLocalPlan: (id: string) => void;
  onStartNewLocalPlan: (character: CharacterSummary | null) => void;
  onStartLocalPlanFromCharacter: (character: CharacterSummary | null) => void;
  onStartLocalPlanFromInGameLoadout: (
    character: CharacterSummary,
    slot: CharacterSummary["loadout_slots"][number]
  ) => void;
  onLocalPlanDraftChange: (draft: CreateLocalLoadoutPlanInput) => void;
  onSaveLocalPlan: () => void;
  onCloseLocalPlanEditor: () => void;
  onDeleteLocalPlan: (id: string) => void;
  onPreviewDimImport: (url: string) => void;
  onAcceptDimImport: (character: CharacterSummary | null) => void;
  onDismissDimImport: () => void;
  onExecuteLocalPlan: () => void;
  onImportGuideText: (rawText: string, character: CharacterSummary | null) => void;
};

export function LoadoutsPage(props: LoadoutsPageProps) {
  const [selectedEntryId, setSelectedEntryId] = useState("");
  const model = useMemo(() => selectLoadoutsPageModel({
    accountSummary: props.accountSummary,
    templates: props.templates,
    selectedTemplateId: props.selectedTemplateId,
    selectedEntryId,
    compareTemplateId: props.compareTemplateId,
    showDiffOnly: props.showDiffOnly
  }), [
    props.accountSummary,
    props.templates,
    props.selectedTemplateId,
    selectedEntryId,
    props.compareTemplateId,
    props.showDiffOnly
  ]);
  const actions: LoadoutsPageActions = {
    selectEntry: setSelectedEntryId,
    selectTemplate: (id) => {
      setSelectedEntryId(`local-template-${id}`);
      props.onSelectTemplate(id);
    },
    selectCompareTemplate: props.onSelectCompareTemplate,
    renameDraftChange: props.onRenameDraftChange,
    showDiffOnlyChange: props.onShowDiffOnlyChange,
    renameTemplate: props.onRenameTemplate,
    deleteTemplate: props.onDeleteTemplate,
    createLocalPlanFromCharacter: props.onCreateLocalPlanFromCharacter,
    createTransferPlan: props.onCreateTransferPlan,
    copyMissingItems: props.onCopyMissingItems,
    executeMissingTransfer: props.onExecuteMissingTransfer,
    executeSingleItemTransfer: props.onExecuteSingleItemTransfer,
    equipSingleItem: props.onEquipSingleItem,
    equipSavedLoadout: props.onEquipSavedLoadout,
    snapshotCurrentLoadout: props.onSnapshotCurrentLoadout,
    clearSavedLoadout: props.onClearSavedLoadout,
    updateSavedLoadoutIdentifiers: props.onUpdateSavedLoadoutIdentifiers,
    openTemplateSourceItem: props.onOpenTemplateSourceItem,
    selectLocalPlan: props.onSelectLocalPlan,
    startNewLocalPlan: props.onStartNewLocalPlan,
    startLocalPlanFromCharacter: props.onStartLocalPlanFromCharacter,
    startLocalPlanFromInGameLoadout: props.onStartLocalPlanFromInGameLoadout,
    localPlanDraftChange: props.onLocalPlanDraftChange,
    saveLocalPlan: props.onSaveLocalPlan,
    closeLocalPlanEditor: props.onCloseLocalPlanEditor,
    deleteLocalPlan: props.onDeleteLocalPlan,
    previewDimImport: props.onPreviewDimImport,
    acceptDimImport: props.onAcceptDimImport,
    dismissDimImport: props.onDismissDimImport,
    executeLocalPlan: props.onExecuteLocalPlan,
    importGuideText: props.onImportGuideText
  };

  return (
    <LoadoutsPageContentView
      accountSummary={props.accountSummary}
      model={model}
      actions={actions}
      compareTemplateId={props.compareTemplateId}
      renameDraft={props.renameDraft}
      showDiffOnly={props.showDiffOnly}
      message={props.message}
      isRunningItemAction={props.isRunningItemAction}
      actionFeedback={props.actionFeedback}
      localPlanWorkspace={props.localPlanWorkspace}
      localPlanDraft={props.localPlanDraft}
      localPlanEditingId={props.localPlanEditingId}
      localPlanIsSaving={props.localPlanIsSaving}
      localPlanError={props.localPlanError}
      dimPreview={props.dimPreview}
      localPlanIsPreviewingDim={props.localPlanIsPreviewingDim}
      localPlanExecutionPlan={props.localPlanExecutionPlan}
      localPlanExecutionReport={props.localPlanExecutionReport}
      localPlanIsExecuting={props.localPlanIsExecuting}
      localPlanIsImportingGuide={props.localPlanIsImportingGuide}
    />
  );
}
