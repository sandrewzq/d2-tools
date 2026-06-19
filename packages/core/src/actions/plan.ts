import type { AccountItemSummary } from "../account/summary.js";

export type ItemActionPlanAction = "set-lock" | "equip" | "transfer";

export type ItemActionPlanInput = {
  action: ItemActionPlanAction;
  item_name: string;
  item_instance_id?: string;
  item_reference_hash?: number;
  character_id?: string;
  state?: boolean;
  transfer_to_vault?: boolean;
};

export type ItemActionPlan = {
  action: ItemActionPlanAction;
  title: string;
  description: string;
  requires_confirmation: true;
  executable: false;
  input: ItemActionPlanInput;
};

export type BatchTransferPlan = {
  summary: string;
  steps: ItemActionPlan[];
};

export function createItemActionPlan(input: ItemActionPlanInput): ItemActionPlan {
  return {
    action: input.action,
    title: actionTitle(input),
    description: actionDescription(input),
    requires_confirmation: true,
    executable: false,
    input
  };
}

export function createBatchTransferPlan(input: {
  character_id: string;
  transfer_to_vault: boolean;
  items: AccountItemSummary[];
}): BatchTransferPlan {
  const steps = input.items
    .filter((item) => item.instance_id)
    .map((item) => createItemActionPlan({
      action: "transfer",
      item_name: item.name,
      item_instance_id: item.instance_id,
      item_reference_hash: item.hash,
      character_id: input.character_id,
      transfer_to_vault: input.transfer_to_vault
    }));

  return {
    summary: input.transfer_to_vault
      ? `计划转移 ${steps.length} 件装备到仓库。`
      : `计划取出 ${steps.length} 件装备到角色。`,
    steps
  };
}

function actionTitle(input: ItemActionPlanInput): string {
  if (input.action === "set-lock") {
    return `${input.state ? "锁定" : "解锁"} ${input.item_name}`;
  }
  if (input.action === "equip") {
    return `装备 ${input.item_name}`;
  }
  return `转移 ${input.item_name}`;
}

function actionDescription(input: ItemActionPlanInput): string {
  if (input.action === "transfer") {
    return input.transfer_to_vault ? "确认后移入仓库。" : "确认后从仓库取出到角色。";
  }
  if (input.action === "equip") {
    return "确认后装备到选中的角色。";
  }
  return "确认后修改装备锁定状态。";
}
