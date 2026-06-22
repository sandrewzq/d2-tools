import type { analyzeLoadoutTemplate } from "@d2-tools/core/loadouts/analysis";
import { api, type AccountSummary, type LoadoutTemplate } from "../../api/client";
import { buildMissingLoadoutTransferPlan } from "../../utils/loadoutTransfer";
import { buildMissingLoadoutItemsText, isTemplateItemReadyFromPlan } from "./loadoutViewModel";

export function useLoadoutTemplateActions(input: {
  accountSummary: AccountSummary | null;
  setLoadoutMessage: (message: string) => void;
}) {
  async function createTemplateTransferPlan(template: LoadoutTemplate) {
    if (!input.accountSummary) return;

    const targetCharacter = input.accountSummary.characters.find((character) => character.character_id === template.character_id)
      ?? input.accountSummary.characters[0];
    if (!targetCharacter) {
      input.setLoadoutMessage("没有可用角色，无法生成转移计划。");
      return;
    }

    try {
      const plan = await api.createLoadoutTemplateTransferPlan({
        template,
        target_character_id: targetCharacter.character_id,
        available_items: input.accountSummary.vault.items,
        equipped_items: targetCharacter.equipped_items
      });
      await navigator.clipboard.writeText([
        "d2-tools 配装转移计划",
        plan.summary,
        ...plan.steps.map((step, index) => `${index + 1}. ${step.title}：${step.description}`),
        "说明：这只是计划，不会执行 Bungie 写操作。"
      ].join("\n"));
      input.setLoadoutMessage(plan.summary || "已复制配装转移计划。");
    } catch (error) {
      input.setLoadoutMessage(error instanceof Error ? error.message : "配装转移计划生成失败");
    }
  }

  async function copyMissingLoadoutItems(
    template: LoadoutTemplate,
    _analysis: ReturnType<typeof analyzeLoadoutTemplate> | null
  ) {
    if (!input.accountSummary) {
      input.setLoadoutMessage("请先读取账号数据。");
      return;
    }

    const transferPlan = buildMissingLoadoutTransferPlan({
      template,
      missingItems: template.items,
      accountSummary: input.accountSummary
    });
    const pendingItems = template.items.filter((item) => !isTemplateItemReadyFromPlan(item, transferPlan));
    if (!pendingItems.length) {
      input.setLoadoutMessage("当前方案装备已全部就位。");
      return;
    }

    try {
      await navigator.clipboard.writeText(
        buildMissingLoadoutItemsText(template, pendingItems, input.accountSummary)
      );
      input.setLoadoutMessage(`已复制待补齐清单，共 ${pendingItems.length} 件。`);
    } catch {
      input.setLoadoutMessage("复制缺失清单失败，请检查系统剪贴板权限。");
    }
  }

  return {
    createTemplateTransferPlan,
    copyMissingLoadoutItems
  };
}
