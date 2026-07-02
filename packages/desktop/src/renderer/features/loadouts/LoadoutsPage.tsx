import { LoadoutsPageContentView, type LoadoutActionFeedbackState } from "@d2-tools/ui";
import { analyzeLoadoutTemplate } from "@d2-tools/core/loadouts/analysis";
import type { AccountSummary, LoadoutTemplate } from "../../api/client";
import { buildLoadoutActionFeedbackKey } from "../../utils/loadoutActionFeedback";
import { buildLoadoutItemStatus, summarizeLoadoutItemStatuses } from "../../utils/loadoutItemStatus";
import { buildMissingLoadoutTransferPlan, describeMissingLoadoutBlockedReason } from "../../utils/loadoutTransfer";
import {
  buildLoadoutCompareRows,
  formatLoadoutComparePerks,
  getMissingLoadoutActionableCount,
  isMatchingTemplateItem,
  isTemplateItemReady,
  isTemplateItemReadyFromPlan
} from "./loadoutViewModel";
import {
  findBestTemplateSourceItem,
  getAllKnownAccountItemsWithSource
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
  const selectedTemplate = props.templates.find((template) => template.id === props.selectedTemplateId)
    ?? props.templates[0]
    ?? null;
  const compareTemplate = props.templates.find((template) => template.id === props.compareTemplateId)
    ?? null;
  const availableItems = props.accountSummary
    ? normalizeAccountItemsForCore(getAllKnownAccountItemsWithSource(props.accountSummary))
    : [];
  const selectedAnalysis = selectedTemplate
    ? analyzeLoadoutTemplate(selectedTemplate, availableItems)
    : null;
  const transferPlan = selectedTemplate && props.accountSummary
    ? buildMissingLoadoutTransferPlan({
      template: selectedTemplate,
      missingItems: selectedTemplate.items,
      accountSummary: props.accountSummary
    })
    : null;
  const actionableCount = transferPlan ? getMissingLoadoutActionableCount(transferPlan) : 0;
  const readyCount = selectedTemplate && transferPlan
    ? Math.max(selectedTemplate.items.length - actionableCount - transferPlan.blocked.length, 0)
    : selectedAnalysis?.equipped.length ?? 0;
  const missingCount = selectedTemplate && transferPlan
    ? actionableCount + transferPlan.blocked.length
    : selectedAnalysis?.missing.length ?? 0;
  const statuses = selectedTemplate
    ? selectedTemplate.items.map((item) => {
      const isReady = transferPlan
        ? isTemplateItemReadyFromPlan(item, transferPlan)
        : isTemplateItemReady(item, selectedAnalysis);
      const sourceItem = !isReady
        ? findBestTemplateSourceItem(item, props.accountSummary, selectedTemplate.character_id)
        : null;
      return buildLoadoutItemStatus({
        isReady,
        sourceItem,
        targetCharacterId: selectedTemplate.character_id,
        accountSummary: props.accountSummary
      });
    })
    : [];
  const statusSummary = summarizeLoadoutItemStatuses(statuses);
  const compareRows = selectedTemplate && compareTemplate
    ? buildLoadoutCompareRows(selectedTemplate, compareTemplate)
    : [];
  const visibleCompareRows = props.showDiffOnly ? compareRows.filter((row) => row.changed) : compareRows;

  return (
    <LoadoutsPageContentView
      {...props}
      selectedTemplate={selectedTemplate}
      compareTemplate={compareTemplate}
      selectedAnalysis={selectedAnalysis}
      transferPlan={transferPlan}
      statusSummary={statusSummary}
      visibleCompareRows={visibleCompareRows}
      missingCount={missingCount}
      readyCount={readyCount}
      actionableCount={actionableCount}
      getItemStatus={(item, template, analysis, plan, summary) => {
        const isReady = plan
          ? isTemplateItemReadyFromPlan(item, plan)
          : isTemplateItemReady(item, analysis);
        const sourceItem = !isReady
          ? findBestTemplateSourceItem(item, summary, template.character_id)
          : null;
        return buildLoadoutItemStatus({
          isReady,
          sourceItem,
          targetCharacterId: template.character_id,
          accountSummary: summary
        });
      }}
      getBlockedDetails={(item, plan) => {
        const blockedEntry = plan?.blocked.find((entry: any) => isMatchingTemplateItem(item, entry.item)) ?? null;
        return blockedEntry ? describeMissingLoadoutBlockedReason(blockedEntry.reason) : null;
      }}
      getSourceItem={(item, summary, templateCharacterId) => findBestTemplateSourceItem(item, summary, templateCharacterId)}
      getActionFeedbackKey={buildLoadoutActionFeedbackKey}
      formatComparePerks={formatLoadoutComparePerks}
    />
  );
}

function normalizeAccountItemsForCore(
  items: AccountSummary["vault"]["items"]
): Array<AccountSummary["vault"]["items"][number] & { socket_plugs: NonNullable<AccountSummary["vault"]["items"][number]["socket_plugs"]> }> {
  return items.map((item) => ({
    ...item,
    socket_plugs: item.socket_plugs ?? []
  }));
}
