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

/**
 * 最高光等写操作的回执结构。
 *
 * 和 `loadoutActions.ts` 同一套口径：这里只报「哪种结果、带什么值」，成句交给界面。
 * 失败回执把两个计数都带上，界面要按「转移受理 1/3」这种分数渲染，不能自己估算。
 */
export type HighestPowerMessageToken =
  | { kind: "already-optimal"; class_name: string }
  | { kind: "transfer-progress"; item_count: number }
  | { kind: "equip-progress"; item_count: number }
  | {
      kind: "result-with-failures";
      partial: boolean;
      transfer_success_count: number;
      transfer_total_count: number;
      equip_success_count: number;
      equip_total_count: number;
      failed_count: number;
      failure_reason: string | null;
    }
  | { kind: "result-submitted"; class_name: string; equip_count: number };

export function buildHighestPowerAlreadyOptimalMessage(characterClassName: string): HighestPowerMessageToken {
  return { kind: "already-optimal", class_name: characterClassName };
}

export function buildHighestPowerTransferProgressMessage(itemCount: number): HighestPowerMessageToken {
  return { kind: "transfer-progress", item_count: itemCount };
}

export function buildHighestPowerEquipProgressMessage(itemCount: number): HighestPowerMessageToken {
  return { kind: "equip-progress", item_count: itemCount };
}

export function buildHighestPowerResultMessage(input: {
  characterClassName: string;
  transferSuccessCount: number;
  transferTotalCount: number;
  equipSuccessCount: number;
  equipTotalCount: number;
  failedCount: number;
  failureReason?: string;
}): HighestPowerMessageToken {
  if (input.failedCount > 0) {
    const reason = input.failureReason?.trim();
    return {
      kind: "result-with-failures",
      partial: input.transferSuccessCount > 0 || input.equipSuccessCount > 0,
      transfer_success_count: input.transferSuccessCount,
      transfer_total_count: input.transferTotalCount,
      equip_success_count: input.equipSuccessCount,
      equip_total_count: input.equipTotalCount,
      failed_count: input.failedCount,
      failure_reason: reason ? reason : null
    };
  }
  return { kind: "result-submitted", class_name: input.characterClassName, equip_count: input.equipSuccessCount };
}
