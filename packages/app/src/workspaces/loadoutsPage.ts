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
  getAllKnownAccountItemsWithSource,
  type LoadoutSourceItem
} from "./loadoutSources.js";
import {
  buildLoadoutItemStatus,
  summarizeLoadoutItemStatuses,
  type LoadoutItemStatus
} from "./loadoutItemStatus.js";
import { getMissingLoadoutActionableCount } from "./loadoutActions.js";

export type LoadoutsPageWorkspace = {
  model: LoadoutsPageModel;
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

export type LoadoutsPageModel = {
  entries: LoadoutEntryView[];
  selectedEntryId: string;
  selectedDetail: LoadoutsSelectedDetailView;
  riskSummary: LoadoutRiskSummaryView;
  compare: LoadoutCompareView;
};

export type LoadoutEntry = LoadoutEntryView;

export type LoadoutEntryView = {
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
  character?: AccountSummary["characters"][number];
  slot?: AccountSummary["characters"][number]["loadout_slots"][number];
};

export type LoadoutTemplateItemRowView = {
  item: LoadoutTemplate["items"][number];
  status: LoadoutItemStatus;
  blockedDetails: MissingLoadoutBlockedDescription | null;
  sourceItem: LoadoutSourceItem | null;
  transferFeedbackKey: string;
  equipFeedbackKey: string;
};

export type InGameLoadoutItemView = AccountSummary["characters"][number]["loadout_slots"][number]["items"][number];

export type LoadoutsSelectedDetailView =
  | {
    kind: "local-template";
    template: LoadoutTemplate;
    analysis: LoadoutTemplateAnalysis | null;
    transferPlan: MissingLoadoutTransferPlan | null;
    statusSummary: Array<{ key: LoadoutItemStatus["summary_key"]; label: string; count: number }>;
    itemRows: LoadoutTemplateItemRowView[];
  }
  | {
    kind: "in-game-slot";
    character: AccountSummary["characters"][number];
    characterId: string;
    characterName: string;
    className: string;
    slot: AccountSummary["characters"][number]["loadout_slots"][number];
    items: InGameLoadoutItemView[];
  }
  | {
    kind: "empty";
    title: string;
    message: string;
  };

export type LoadoutRiskSummaryView = {
  missingCount: number;
  readyCount: number;
  actionableCount: number;
};

export type LoadoutCompareView = {
  compareTemplate: LoadoutTemplate | null;
  options: Array<{ id: string; name: string }>;
  visibleRows: LoadoutCompareRow[];
};

export function createLoadoutsPageWorkspace(input: {
  accountSummary: AccountSummary | null;
  templates: LoadoutTemplate[];
  selectedTemplateId: string;
  selectedEntryId?: string;
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
  const statusSummary = summarizeLoadoutItemStatuses(statuses);
  const compareRows = selectedTemplate && compareTemplate
    ? buildLoadoutCompareRows(selectedTemplate, compareTemplate)
    : [];
  const visibleCompareRows = input.showDiffOnly ? compareRows.filter((row) => row.changed) : compareRows;
  const loadoutEntries = buildLoadoutEntries({
    accountSummary: input.accountSummary,
    templates: input.templates,
    selectedTemplate,
    selectedTemplateMissingCount: missingCount
  });
  const selectedEntryId = resolveSelectedEntryId({
    requestedEntryId: input.selectedEntryId,
    selectedTemplate,
    loadoutEntries
  });
  const model: LoadoutsPageModel = {
    entries: loadoutEntries,
    selectedEntryId,
    selectedDetail: selectLoadoutsSelectedDetail({
      accountSummary: input.accountSummary,
      selectedEntryId,
      selectedTemplate,
      selectedAnalysis,
      transferPlan,
      statusSummary,
      templates: input.templates
    }),
    riskSummary: {
      missingCount,
      readyCount,
      actionableCount
    },
    compare: {
      compareTemplate,
      options: input.templates
        .filter((template) => template.id !== selectedTemplate?.id)
        .map((template) => ({ id: template.id, name: template.name })),
      visibleRows: visibleCompareRows
    }
  };

  return {
    model,
    loadoutEntries,
    selectedTemplate,
    compareTemplate,
    selectedAnalysis,
    transferPlan,
    statusSummary,
    visibleCompareRows,
    missingCount,
    readyCount,
    actionableCount
  };
}

function resolveSelectedEntryId(input: {
  requestedEntryId?: string;
  selectedTemplate: LoadoutTemplate | null;
  loadoutEntries: LoadoutEntry[];
}): string {
  const defaultEntryId = input.selectedTemplate
    ? `local-template-${input.selectedTemplate.id}`
    : input.loadoutEntries[0]?.id ?? "";
  if (input.requestedEntryId && input.loadoutEntries.some((entry) => entry.id === input.requestedEntryId)) {
    return input.requestedEntryId;
  }
  return defaultEntryId;
}

function selectLoadoutsSelectedDetail(input: {
  accountSummary: AccountSummary | null;
  selectedEntryId: string;
  selectedTemplate: LoadoutTemplate | null;
  selectedAnalysis: LoadoutTemplateAnalysis | null;
  transferPlan: MissingLoadoutTransferPlan | null;
  statusSummary: Array<{ key: LoadoutItemStatus["summary_key"]; label: string; count: number }>;
  templates: LoadoutTemplate[];
}): LoadoutsSelectedDetailView {
  if (input.selectedEntryId.startsWith("in-game-")) {
    const inGameDetail = selectInGameLoadoutDetail(input.accountSummary, input.selectedEntryId);
    if (inGameDetail) return inGameDetail;
  }

  const templateId = input.selectedEntryId.startsWith("local-template-")
    ? input.selectedEntryId.slice("local-template-".length)
    : input.selectedTemplate?.id ?? "";
  const template = input.templates.find((item) => item.id === templateId) ?? input.selectedTemplate;
  if (!template) {
    return {
      kind: "empty",
      title: "还没有保存本地方案",
      message: "先到账号页选择角色，把当前装备保存为模板。保存后这里会集中处理补齐、对比和清单复制。"
    };
  }

  return {
    kind: "local-template",
    template,
    analysis: template.id === input.selectedTemplate?.id ? input.selectedAnalysis : null,
    transferPlan: template.id === input.selectedTemplate?.id ? input.transferPlan : null,
    statusSummary: template.id === input.selectedTemplate?.id ? input.statusSummary : [],
    itemRows: buildLoadoutTemplateItemRows({
      template,
      selectedAnalysis: template.id === input.selectedTemplate?.id ? input.selectedAnalysis : null,
      transferPlan: template.id === input.selectedTemplate?.id ? input.transferPlan : null,
      accountSummary: input.accountSummary
    })
  };
}

function selectInGameLoadoutDetail(
  accountSummary: AccountSummary | null,
  selectedEntryId: string
): LoadoutsSelectedDetailView | null {
  if (!accountSummary) return null;
  for (const character of accountSummary.characters) {
    for (const slot of character.loadout_slots) {
      if (`in-game-${character.character_id}-${slot.index}` === selectedEntryId) {
        return {
          kind: "in-game-slot",
          character,
          characterId: character.character_id,
          characterName: character.class_name,
          className: character.class_name,
          slot,
          items: slot.items
        };
      }
    }
  }
  return null;
}

function buildLoadoutTemplateItemRows(input: {
  template: LoadoutTemplate;
  selectedAnalysis: LoadoutTemplateAnalysis | null;
  transferPlan: MissingLoadoutTransferPlan | null;
  accountSummary: AccountSummary | null;
}): LoadoutTemplateItemRowView[] {
  return input.template.items.map((item) => {
    const status = getLoadoutItemStatus({
      item,
      template: input.template,
      selectedAnalysis: input.selectedAnalysis,
      transferPlan: input.transferPlan,
      accountSummary: input.accountSummary
    });
    const blockedDetails = getLoadoutItemBlockedDetails(item, input.transferPlan);
    const sourceItem = !blockedDetails
      ? findBestTemplateSourceItem(item, input.accountSummary, input.template.character_id)
      : null;
    return {
      item,
      status,
      blockedDetails,
      sourceItem,
      transferFeedbackKey: buildLoadoutActionFeedbackKey(input.template.id, item, "transfer"),
      equipFeedbackKey: buildLoadoutActionFeedbackKey(input.template.id, item, "equip")
    };
  });
}

function buildLoadoutActionFeedbackKey(
  templateId: string,
  item: { hash: number; instance_id?: string },
  action: "transfer" | "equip"
): string {
  return `${templateId}:${item.instance_id ?? `hash:${item.hash}`}:${action}`;
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
        slotIndex: slot.index,
        character,
        slot
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
