import type { AccountItemSummary, CharacterSummary } from "@d2-tools/core/account/summary";
import {
  accountPowerSlotLabels,
  accountPowerSlotOrder,
  selectMaxEquippablePowerCandidates,
  type AccountPowerCandidate
} from "@d2-tools/core/account/power";

export type HighestPowerItemSource = "equipped" | "inventory" | "vault";

export type HighestPowerEquipPlanItem = {
  slot_label: string;
  item: AccountItemSummary;
  source: HighestPowerItemSource;
  already_equipped: boolean;
  needs_transfer: boolean;
  needs_equip: boolean;
};

export type HighestPowerEquipPlan = {
  summary: string;
  items: HighestPowerEquipPlanItem[];
  executable_items: HighestPowerEquipPlanItem[];
};

export type HighestPowerExecutionPlan = {
  summary: string;
  transfer_items: HighestPowerEquipPlanItem[];
  equip_items: HighestPowerEquipPlanItem[];
};

type Candidate = AccountPowerCandidate<HighestPowerItemSource>;

export function createHighestPowerEquipPlan(input: {
  character: CharacterSummary;
  vaultItems: AccountItemSummary[];
}): HighestPowerEquipPlan {
  const candidates: Candidate[] = [
    ...input.character.equipped_items.map((item) => ({ item, source: "equipped" as const, source_rank: 0 })),
    ...input.character.inventory_items.map((item) => ({ item, source: "inventory" as const, source_rank: 1 })),
    ...input.vaultItems.map((item) => ({ item, source: "vault" as const, source_rank: 2 }))
  ];
  const bestBySlot = selectMaxEquippablePowerCandidates({
    candidates,
    characterClassName: input.character.class_name
  });

  const items: HighestPowerEquipPlanItem[] = [];
  for (const slot of accountPowerSlotOrder) {
    const candidate = bestBySlot.get(slot);
    if (!candidate) continue;

    const alreadyEquipped = candidate.source === "equipped";
    items.push({
      slot_label: accountPowerSlotLabels[slot],
      item: candidate.item,
      source: candidate.source,
      already_equipped: alreadyEquipped,
      needs_transfer: candidate.source === "vault",
      needs_equip: !alreadyEquipped
    });
  }

  const executableItems = items.filter((entry) => entry.needs_transfer || entry.needs_equip);
  return {
    summary: executableItems.length
      ? `准备装备 ${executableItems.length} 件最高光等装备，涉及 ${items.length} 个位置。`
      : "当前已经是最高光等组合。",
    items,
    executable_items: executableItems
  };
}

export function createHighestPowerExecutionPlan(
  plan: HighestPowerEquipPlan
): HighestPowerExecutionPlan {
  const transferItems = plan.executable_items.filter((entry) => entry.needs_transfer);
  const equipItems = plan.executable_items.filter((entry) => entry.needs_equip);

  const summaryParts: string[] = [];
  if (transferItems.length) {
    summaryParts.push(`先转移 ${transferItems.length} 件`);
  }
  if (equipItems.length) {
    summaryParts.push(`再装备 ${equipItems.length} 件`);
  }

  return {
    summary: summaryParts.length ? `${summaryParts.join("，")}。` : "当前没有需要执行的最高光等操作。",
    transfer_items: transferItems,
    equip_items: equipItems
  };
}

export function formatHighestPowerSource(source: HighestPowerItemSource): string {
  if (source === "equipped") return "已装备";
  if (source === "inventory") return "角色背包";
  return "仓库";
}

export function buildHighestPowerConfirmText(input: {
  characterClassName: string;
  plan: HighestPowerEquipPlan;
  executionPlan: HighestPowerExecutionPlan;
}): string {
  const executionSummary = [input.plan.summary, input.executionPlan.summary]
    .filter(Boolean)
    .join("\n");
  const actionPreview = input.plan.executable_items
    .map((entry) => `${entry.slot_label}：${entry.item.name} / 光等 ${entry.item.power ?? "-"} / ${formatHighestPowerSource(entry.source)}`)
    .join("\n");

  return [
    `确认给 ${input.characterClassName} 装备最高光等组合？`,
    executionSummary,
    actionPreview,
    "说明：仓库里的装备会先取出到该角色，再执行装备。不会分解装备。"
  ].filter(Boolean).join("\n");
}

export function buildHighestPowerAlreadyOptimalMessage(characterClassName: string): string {
  return `${characterClassName} 当前已经是最高光等组合。`;
}

export function buildHighestPowerTransferProgressMessage(itemCount: number): string {
  return `正在从仓库取出 ${itemCount} 件最高光等装备...`;
}

export function buildHighestPowerEquipProgressMessage(itemCount: number): string {
  return `正在装备最高光等 ${itemCount} 件装备...`;
}

export function buildHighestPowerResultMessage(input: {
  characterClassName: string;
  transferSuccessCount: number;
  transferTotalCount: number;
  equipSuccessCount: number;
  equipTotalCount: number;
  failedCount: number;
  failureReason?: string;
}): string {
  if (input.failedCount > 0) {
    const reason = input.failureReason?.trim();
    const outcome = input.transferSuccessCount > 0 || input.equipSuccessCount > 0
      ? "部分提交"
      : "执行失败";
    return `最高光等${outcome}：转移受理 ${input.transferSuccessCount}/${input.transferTotalCount}，装备受理 ${input.equipSuccessCount}/${input.equipTotalCount}，失败步骤 ${input.failedCount}。${reason ? `首个失败原因：${reason}` : "可在设置页查看操作日志。"}`;
  }
  return `已提交给 ${input.characterClassName} 装备 ${input.equipSuccessCount} 件最高光等装备，正在确认游戏内状态。`;
}
