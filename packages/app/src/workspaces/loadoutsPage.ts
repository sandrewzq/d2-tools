import type { AccountSummary } from "@d2-tools/core/account/summary";
import { analyzeLoadoutTemplate, type LoadoutTemplateAnalysis } from "@d2-tools/core/loadouts/analysis";
import type { LoadoutTemplate } from "@d2-tools/core/loadouts/templates";
import {
  buildLoadoutCompareRows,
  isMatchingTemplateItem,
  isTemplateItemReady,
  isTemplateItemReadyFromPlan,
  type LoadoutCompareRow
} from "./loadoutViewModel.js";
import {
  buildMissingLoadoutTransferPlan,
  describeMissingLoadoutBlockedReason,
  type MissingLoadoutBlockedDescription,
  type MissingLoadoutTransferPlan
} from "./loadoutTransfer.js";
import {
  findBestTemplateSourceItem,
  getAllKnownAccountItemsWithSource
} from "./loadoutSources.js";
import {
  buildLoadoutItemStatus,
  summarizeLoadoutItemStatuses,
  type LoadoutItemStatus
} from "./loadoutItemStatus.js";
import { getMissingLoadoutActionableCount } from "./loadoutActions.js";

export type LoadoutsPageWorkspace = {
  selectedTemplate: LoadoutTemplate | null;
  compareTemplate: LoadoutTemplate | null;
  selectedAnalysis: LoadoutTemplateAnalysis | null;
  transferPlan: MissingLoadoutTransferPlan | null;
  statusSummary: Array<{ key: LoadoutItemStatus["summary_key"]; label: string; count: number }>;
  visibleCompareRows: LoadoutCompareRow[];
  missingCount: number;
  readyCount: number;
  actionableCount: number;
};

export function createLoadoutsPageWorkspace(input: {
  accountSummary: AccountSummary | null;
  templates: LoadoutTemplate[];
  selectedTemplateId: string;
  compareTemplateId: string;
  showDiffOnly: boolean;
}): LoadoutsPageWorkspace {
  const selectedTemplate = input.templates.find((template) => template.id === input.selectedTemplateId)
    ?? input.templates[0]
    ?? null;
  const compareTemplate = input.templates.find((template) => template.id === input.compareTemplateId)
    ?? null;
  const availableItems = input.accountSummary
    ? normalizeAccountItemsForCore(getAllKnownAccountItemsWithSource(input.accountSummary))
    : [];
  const selectedAnalysis = selectedTemplate
    ? analyzeLoadoutTemplate(selectedTemplate, availableItems)
    : null;
  const transferPlan = selectedTemplate && input.accountSummary
    ? buildMissingLoadoutTransferPlan({
      template: selectedTemplate,
      missingItems: selectedTemplate.items,
      accountSummary: input.accountSummary
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
    ? selectedTemplate.items.map((item) => getLoadoutItemStatus({
      item,
      template: selectedTemplate,
      selectedAnalysis,
      transferPlan,
      accountSummary: input.accountSummary
    }))
    : [];
  const compareRows = selectedTemplate && compareTemplate
    ? buildLoadoutCompareRows(selectedTemplate, compareTemplate)
    : [];

  return {
    selectedTemplate,
    compareTemplate,
    selectedAnalysis,
    transferPlan,
    statusSummary: summarizeLoadoutItemStatuses(statuses),
    visibleCompareRows: input.showDiffOnly ? compareRows.filter((row) => row.changed) : compareRows,
    missingCount,
    readyCount,
    actionableCount
  };
}

export function getLoadoutItemStatus(input: {
  item: LoadoutTemplate["items"][number];
  template: LoadoutTemplate;
  selectedAnalysis: LoadoutTemplateAnalysis | null;
  transferPlan: MissingLoadoutTransferPlan | null;
  accountSummary: AccountSummary | null;
}): LoadoutItemStatus {
  const isReady = input.transferPlan
    ? isTemplateItemReadyFromPlan(input.item, input.transferPlan)
    : isTemplateItemReady(input.item, input.selectedAnalysis);
  const sourceItem = !isReady
    ? findBestTemplateSourceItem(input.item, input.accountSummary, input.template.character_id)
    : null;
  return buildLoadoutItemStatus({
    isReady,
    sourceItem,
    targetCharacterId: input.template.character_id,
    accountSummary: input.accountSummary
  });
}

export function getLoadoutItemBlockedDetails(
  item: LoadoutTemplate["items"][number],
  transferPlan: MissingLoadoutTransferPlan | null
): MissingLoadoutBlockedDescription | null {
  const blockedEntry = transferPlan?.blocked.find((entry) => isMatchingTemplateItem(item, entry.item)) ?? null;
  return blockedEntry ? describeMissingLoadoutBlockedReason(blockedEntry.reason) : null;
}

function normalizeAccountItemsForCore(
  items: AccountSummary["vault"]["items"]
): Array<AccountSummary["vault"]["items"][number] & { socket_plugs: NonNullable<AccountSummary["vault"]["items"][number]["socket_plugs"]> }> {
  return items.map((item) => ({
    ...item,
    socket_plugs: item.socket_plugs ?? []
  }));
}
