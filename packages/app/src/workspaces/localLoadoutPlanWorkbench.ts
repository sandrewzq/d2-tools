import type { AccountItemSummary, AccountSummary, CharacterSummary } from "@d2-tools/core/account/summary";
import {
  createLocalLoadoutPlanFromEquippedItems,
  matchLocalLoadoutPlan,
  type CreateLocalLoadoutPlanInput,
  type LocalLoadoutPlan,
  type LocalLoadoutPlanItemMatch,
  type LocalLoadoutPlanItemMatchStatus,
  type LocalLoadoutPlanMatch
} from "@d2-tools/core/loadouts/plans";

export type LocalLoadoutPlanWorkbenchInput = {
  accountSummary: AccountSummary | null;
  plans: LocalLoadoutPlan[];
  selectedPlanId: string;
};

export type LocalLoadoutPlanDirectoryEntry = {
  id: string;
  title: string;
  subtitle: string;
  status_label: string;
  status_tone: "neutral" | "ready" | "warning";
  source_label: string;
};

export type LocalLoadoutPlanItemRow = {
  target: LocalLoadoutPlan["item_targets"][number];
  match: LocalLoadoutPlanItemMatch | null;
  status_label: string;
  status_tone: "neutral" | "ready" | "warning";
};

export type LocalLoadoutPlanWorkbenchModel = {
  entries: LocalLoadoutPlanDirectoryEntry[];
  selected_plan: LocalLoadoutPlan | null;
  item_rows: LocalLoadoutPlanItemRow[];
  summary: LocalLoadoutPlanMatch | null;
};

export function createEmptyLocalLoadoutPlanDraft(input: {
  class_name: string;
  target_character_id?: string;
}): CreateLocalLoadoutPlanInput {
  return {
    name: `${input.class_name || "未限定职业"} 本地方案`,
    class_name: input.class_name,
    target_character_id: input.target_character_id,
    source: { kind: "manual" },
    item_targets: []
  };
}

export function createLocalLoadoutPlanDraftFromCharacter(
  character: CharacterSummary
): CreateLocalLoadoutPlanInput {
  return createLocalLoadoutPlanFromEquippedItems({
    name: `${character.class_name} 光等 ${character.light ?? "-"}`,
    class_name: character.class_name,
    target_character_id: character.character_id,
    equipped_items: character.equipped_items
  });
}

export function createLocalLoadoutPlanDraftFromInGameLoadout(input: {
  accountSummary: AccountSummary;
  character: CharacterSummary;
  slot: CharacterSummary["loadout_slots"][number];
}): CreateLocalLoadoutPlanInput {
  const itemsByInstanceId = new Map(
    getLocalLoadoutPlanAccountItems(input.accountSummary)
      .filter((item) => item.instance_id)
      .map((item) => [item.instance_id as string, item] as const)
  );
  return {
    name: `${input.slot.name} 本地副本`,
    class_name: input.character.class_name,
    target_character_id: input.character.character_id,
    source: { kind: "bungie-loadout", label: `Bungie 槽位 ${input.slot.index + 1}` },
    item_targets: input.slot.items.map((slotItem, index) => {
      const item = slotItem.instance_id ? itemsByInstanceId.get(slotItem.instance_id) : undefined;
      return {
        slot: slotItem.bucket_name ?? item?.bucket_name ?? `Bungie 装备 ${index + 1}`,
        item_hash: slotItem.item_hash ?? item?.hash,
        ...(slotItem.instance_id ? { selected_instance_id: slotItem.instance_id } : {}),
        plug_hashes: slotItem.plug_hashes ?? []
      };
    })
  };
}

export function toLocalLoadoutPlanDraft(plan: LocalLoadoutPlan): CreateLocalLoadoutPlanInput {
  const { id: _id, created_at: _createdAt, updated_at: _updatedAt, ...draft } = plan;
  return draft;
}

export function selectLocalLoadoutPlanWorkbench(
  input: LocalLoadoutPlanWorkbenchInput
): LocalLoadoutPlanWorkbenchModel {
  const selectedPlan = input.plans.find((plan) => plan.id === input.selectedPlanId)
    ?? input.plans[0]
    ?? null;
  const summary = selectedPlan && input.accountSummary
    ? matchLocalLoadoutPlan(selectedPlan, input.accountSummary)
    : null;
  const itemRows = selectedPlan
    ? selectedPlan.item_targets.map((target, index) => {
      const match = summary?.item_matches[index] ?? null;
      const presentation = getItemMatchPresentation(match?.status);
      return { target, match, ...presentation };
    })
    : [];

  return {
    entries: input.plans.map((plan) => buildDirectoryEntry(plan, input.accountSummary)),
    selected_plan: selectedPlan,
    item_rows: itemRows,
    summary
  };
}

export function getLocalLoadoutPlanAccountItems(accountSummary: AccountSummary | null): AccountItemSummary[] {
  if (!accountSummary) return [];
  return [
    ...accountSummary.characters.flatMap((character) => [
      ...character.equipped_items,
      ...character.inventory_items,
      ...character.postmaster_items
    ]),
    ...accountSummary.vault.items
  ];
}

function buildDirectoryEntry(
  plan: LocalLoadoutPlan,
  accountSummary: AccountSummary | null
): LocalLoadoutPlanDirectoryEntry {
  const summary = accountSummary ? matchLocalLoadoutPlan(plan, accountSummary) : null;
  const unresolvedCount = summary
    ? summary.missing_count + summary.plug_unavailable_count + summary.needs_selection_count
    : 0;
  return {
    id: plan.id,
    title: plan.name,
    subtitle: `${plan.class_name} / ${plan.item_targets.length} 个装备目标`,
    status_label: !accountSummary
      ? "等待账号"
      : unresolvedCount > 0
        ? `${unresolvedCount} 项待确认`
        : "可编辑",
    status_tone: unresolvedCount > 0 ? "warning" : accountSummary ? "ready" : "neutral",
    source_label: sourceLabel(plan.source.kind)
  };
}

function getItemMatchPresentation(status: LocalLoadoutPlanItemMatchStatus | undefined): Pick<LocalLoadoutPlanItemRow, "status_label" | "status_tone"> {
  if (status === "selected") return { status_label: "已选实例", status_tone: "ready" };
  if (status === "available") return { status_label: "可选择", status_tone: "neutral" };
  if (status === "needs-selection") return { status_label: "需要选择实例", status_tone: "warning" };
  if (status === "missing") return { status_label: "账号内未找到", status_tone: "warning" };
  if (status === "plug-unavailable") return { status_label: "目标 Plug 不可用", status_tone: "warning" };
  return { status_label: "尚未配置", status_tone: "neutral" };
}

function sourceLabel(source: LocalLoadoutPlan["source"]["kind"]): string {
  switch (source) {
    case "current-equipment": return "当前装备";
    case "bungie-loadout": return "Bungie 槽位";
    case "dim-link": return "DIM 链接";
    case "guide": return "攻略";
    default: return "手动创建";
  }
}
