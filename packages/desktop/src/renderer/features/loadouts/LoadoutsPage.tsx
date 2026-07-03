import { LoadoutsPageContentView, type LoadoutActionFeedbackState } from "@d2-tools/ui";
import { analyzeLoadoutTemplate } from "@d2-tools/core/loadouts/analysis";
import type { AccountSummary, LoadoutTemplate } from "../../api/types";
import { buildLoadoutActionFeedbackKey } from "../../utils/loadoutActionFeedback";
import {
  createLoadoutsPageWorkspace,
  formatLoadoutComparePerks,
  getLoadoutItemBlockedDetails,
  getLoadoutItemStatus
} from "@d2-tools/app";
import {
  findBestTemplateSourceItem
} from "../../shared/domain/loadouts/loadoutSources";

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
  const workspace = createLoadoutsPageWorkspace({
    accountSummary: props.accountSummary,
    templates: props.templates,
    selectedTemplateId: props.selectedTemplateId,
    compareTemplateId: props.compareTemplateId,
    showDiffOnly: props.showDiffOnly
  });

  return (
    <LoadoutsPageContentView
      {...props}
      selectedTemplate={workspace.selectedTemplate}
      compareTemplate={workspace.compareTemplate}
      selectedAnalysis={workspace.selectedAnalysis}
      transferPlan={workspace.transferPlan}
      statusSummary={workspace.statusSummary}
      visibleCompareRows={workspace.visibleCompareRows}
      missingCount={workspace.missingCount}
      readyCount={workspace.readyCount}
      actionableCount={workspace.actionableCount}
      showInternalHeading={false}
      getItemStatus={(item, template, analysis, plan, summary) => {
        return getLoadoutItemStatus({
          item,
          template,
          selectedAnalysis: analysis,
          transferPlan: plan,
          accountSummary: summary
        });
      }}
      getBlockedDetails={getLoadoutItemBlockedDetails}
      getSourceItem={(item, summary, templateCharacterId) => findBestTemplateSourceItem(item, summary, templateCharacterId)}
      getActionFeedbackKey={buildLoadoutActionFeedbackKey}
      formatComparePerks={formatLoadoutComparePerks}
    />
  );
}
