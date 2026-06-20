import type { AccountItemSummary } from "../account/summary.js";
import { createTransferQueue, type TransferQueueStep } from "./transferQueue.js";

export type FarmingModePlanInput = {
  character_id: string;
  inventory_items: AccountItemSummary[];
  max_inventory_slots: number;
  keep_free_slots: number;
};

export type FarmingModePlan = {
  summary: string;
  transfer_items: AccountItemSummary[];
  steps: TransferQueueStep[];
};

export function createFarmingModePlan(input: FarmingModePlanInput): FarmingModePlan {
  const occupied = input.inventory_items.length;
  const currentFree = Math.max(input.max_inventory_slots - occupied, 0);
  const moveCount = Math.max(input.keep_free_slots - currentFree, 0);
  const transferItems = [...input.inventory_items]
    .sort((left, right) => (left.power ?? 0) - (right.power ?? 0) || left.name.localeCompare(right.name, "zh-Hans-CN"))
    .slice(0, moveCount);
  const queue = createTransferQueue({
    character_id: input.character_id,
    transfer_to_vault: true,
    items: transferItems
  });

  return {
    summary: moveCount
      ? `需要移入仓库 ${moveCount} 件，保留 ${input.keep_free_slots} 个背包空位。`
      : `当前已经至少有 ${input.keep_free_slots} 个背包空位。`,
    transfer_items: transferItems,
    steps: queue.steps
  };
}
