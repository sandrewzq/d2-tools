import { useState } from "react";
import { LoadoutsPageContentView, type LoadoutActionFeedbackState, type LoadoutsPageActions } from "@d2-tools/ui";
import { analyzeLoadoutTemplate } from "@d2-tools/core/loadouts/analysis";
import type { AccountSummary, LoadoutTemplate } from "../../api/types";
import { selectLoadoutsPageModel } from "@d2-tools/app/loadouts";

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
  onSelectTemplate: (id: string) => void;
  onSelectCompareTemplate: (id: string) => void;
  onRenameDraftChange: (value: string) => void;
  onShowDiffOnlyChange: (value: boolean) => void;
  onRenameTemplate: (template: LoadoutTemplate) => void;
  onDeleteTemplate: (id: string) => void;
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
  onOpenTemplateSourceItem: (
    item: LoadoutTemplate["items"][number],
    templateCharacterId?: string
  ) => void;
};

export function LoadoutsPage(props: LoadoutsPageProps) {
  const [selectedEntryId, setSelectedEntryId] = useState("");
  const model = selectLoadoutsPageModel({
    accountSummary: props.accountSummary,
    templates: props.templates,
    selectedTemplateId: props.selectedTemplateId,
    selectedEntryId,
    compareTemplateId: props.compareTemplateId,
    showDiffOnly: props.showDiffOnly
  });
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
    createTransferPlan: props.onCreateTransferPlan,
    copyMissingItems: props.onCopyMissingItems,
    executeMissingTransfer: props.onExecuteMissingTransfer,
    executeSingleItemTransfer: props.onExecuteSingleItemTransfer,
    equipSingleItem: props.onEquipSingleItem,
    equipSavedLoadout: props.onEquipSavedLoadout,
    snapshotCurrentLoadout: props.onSnapshotCurrentLoadout,
    openTemplateSourceItem: props.onOpenTemplateSourceItem
  };

  return (
    <LoadoutsPageContentView
      model={model}
      actions={actions}
      compareTemplateId={props.compareTemplateId}
      renameDraft={props.renameDraft}
      showDiffOnly={props.showDiffOnly}
      message={props.message}
      isRunningItemAction={props.isRunningItemAction}
      actionFeedback={props.actionFeedback}
    />
  );
}
