import type { AccountItemSummary } from "../account/summary.js";

export type TransferQueueStepStatus = "pending" | "success" | "failed";

export type TransferQueueStep = {
  id: string;
  item_id: string;
  item_reference_hash: number;
  item_name: string;
  character_id: string;
  transfer_to_vault: boolean;
  status: TransferQueueStepStatus;
  attempts: number;
  message?: string;
};

export type TransferQueue = {
  summary: string;
  steps: TransferQueueStep[];
};

export type TransferQueueInput = {
  character_id: string;
  transfer_to_vault: boolean;
  items: AccountItemSummary[];
};

export function createTransferQueue(input: TransferQueueInput): TransferQueue {
  const direction = input.transfer_to_vault ? "移入仓库" : "取出";
  return {
    summary: `准备${direction} ${input.items.length} 件装备${input.transfer_to_vault ? "" : "到角色背包"}。`,
    steps: input.items.map((item, index) => ({
      id: `${item.instance_id ?? item.hash}-${index}`,
      item_id: item.instance_id ?? "",
      item_reference_hash: item.hash,
      item_name: item.name,
      character_id: input.character_id,
      transfer_to_vault: input.transfer_to_vault,
      status: "pending",
      attempts: 0
    }))
  };
}

export async function runTransferQueue(
  queue: TransferQueue,
  executor: (step: TransferQueueStep) => Promise<string | void>,
  options: { retryFailedOnly?: boolean } = {}
): Promise<TransferQueue> {
  const steps: TransferQueueStep[] = [];

  for (const step of queue.steps) {
    const shouldRun = options.retryFailedOnly ? step.status === "failed" : step.status !== "success";
    if (!shouldRun) {
      steps.push(step);
      continue;
    }

    try {
      const message = await executor(step);
      steps.push({
        ...step,
        attempts: step.attempts + 1,
        status: "success",
        message: message || "完成"
      });
    } catch (error) {
      steps.push({
        ...step,
        attempts: step.attempts + 1,
        status: "failed",
        message: error instanceof Error ? error.message : "转移失败"
      });
    }
  }

  const successCount = steps.filter((step) => step.status === "success").length;
  const failedCount = steps.filter((step) => step.status === "failed").length;

  return {
    summary: `转移队列完成 ${successCount} 件，失败 ${failedCount} 件。`,
    steps
  };
}
