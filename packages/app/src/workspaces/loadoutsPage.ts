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
  loadoutEntries: LoadoutEntry[];
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

export type LoadoutEntry = {
  id: string;
  source: "local-template" | "in-game";
  title: string;
  subtitle: string;
  statusLabel: string;
  statusTone: "neutral" | "ready" | "warning";
  preview: string;
  templateId?: string;
  characterId?: string;
  slotIndex?: number;
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
    loadoutEntries: buildLoadoutEntries({
      accountSummary: input.accountSummary,
      templates: input.templates,
      selectedTemplate,
      selectedTemplateMissingCount: missingCount
    }),
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

function buildLoadoutEntries(input: {
  accountSummary: AccountSummary | null;
  templates: LoadoutTemplate[];
  selectedTemplate: LoadoutTemplate | null;
  selectedTemplateMissingCount: number;
}): LoadoutEntry[] {
  const localEntries = input.templates.map((template): LoadoutEntry => {
    const isSelectedTemplate = input.selectedTemplate?.id === template.id;
    const updatedAt = template.updated_at ?? template.created_at;
    const statusLabel = isSelectedTemplate
      ? input.selectedTemplateMissingCount > 0
        ? `待补齐 ${input.selectedTemplateMissingCount} 件`
        : "可执行"
      : "未检查";

    return {
      id: `local-template-${template.id}`,
      source: "local-template",
      title: template.name,
      subtitle: `${template.class_name} / ${template.items.length} 件装备`,
      statusLabel,
      statusTone: statusLabel.startsWith("待补齐") ? "warning" : "ready",
      preview: updatedAt ? `更新于 ${updatedAt}` : "本地方案",
      templateId: template.id
    };
  });

  const inGameEntries = input.accountSummary
    ? input.accountSummary.characters.flatMap((character) => (
      character.loadout_slots.map((slot): LoadoutEntry => ({
        id: `in-game-${character.character_id}-${slot.index}`,
        source: "in-game",
        title: slot.name || `配装栏 ${slot.index + 1}`,
        subtitle: `${character.class_name} / 槽位 ${slot.index + 1} / ${slot.item_count} 件装备`,
        statusLabel: "可应用",
        statusTone: "neutral",
        preview: formatInGameLoadoutSlotPreview(slot.items),
        characterId: character.character_id,
        slotIndex: slot.index
      }))
    ))
    : [];

  return [...localEntries, ...inGameEntries];
}

function formatInGameLoadoutSlotPreview(
  items: AccountSummary["characters"][number]["loadout_slots"][number]["items"]
): string {
  return items.slice(0, 4).map((item) => item.name).join(" / ") || "当前槽位为空";
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
