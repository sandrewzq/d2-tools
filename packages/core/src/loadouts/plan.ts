import { createBatchTransferPlan, type BatchTransferPlan } from "../actions/plan.js";
import type { AccountItemSummary } from "../account/summary.js";
import type { LoadoutTemplate, LoadoutTemplateItem } from "./templates.js";

export type LoadoutTemplateComparison = {
  equipped: LoadoutTemplateItem[];
  missing: LoadoutTemplateItem[];
};

export function compareLoadoutTemplate(
  template: LoadoutTemplate,
  equippedItems: AccountItemSummary[]
): LoadoutTemplateComparison {
  const equippedIds = new Set(equippedItems.map((item) => item.instance_id).filter(Boolean));
  return {
    equipped: template.items.filter((item) => item.instance_id && equippedIds.has(item.instance_id)),
    missing: template.items.filter((item) => !item.instance_id || !equippedIds.has(item.instance_id))
  };
}

export function createLoadoutTemplateTransferPlan(input: {
  template: LoadoutTemplate;
  target_character_id: string;
  available_items: AccountItemSummary[];
  equipped_items: AccountItemSummary[];
}): BatchTransferPlan {
  const comparison = compareLoadoutTemplate(input.template, input.equipped_items);
  const missingIds = new Set(comparison.missing.map((item) => item.instance_id).filter(Boolean));
  const transferableItems = input.available_items.filter((item) => item.instance_id && missingIds.has(item.instance_id));
  const plan = createBatchTransferPlan({
    character_id: input.target_character_id,
    transfer_to_vault: false,
    items: transferableItems
  });

  return {
    ...plan,
    summary: `计划为模板「${input.template.name}」转移 ${plan.steps.length} 件装备到角色。`
  };
}
