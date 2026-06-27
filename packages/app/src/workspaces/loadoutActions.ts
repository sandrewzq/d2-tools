import type { AccountSummary, CharacterSummary } from "@d2-tools/core/account/summary";
import type { LoadoutTemplate } from "@d2-tools/core/loadouts/templates";
import type { MissingLoadoutTransferPlan, MissingLoadoutTransferStep } from "./loadoutTransfer.js";

export type LoadoutActionResultCounts = {
  targetTransferCount: number;
  autoEquipCount: number;
  prepStepCount: number;
  blockedCount?: number;
};

export function buildCharacterLoadoutTemplateName(character: CharacterSummary): string {
  return `${character.class_name} 光等 ${character.light ?? "-"}`;
}

export function buildSaveCharacterLoadoutSuccessMessage(templateName: string): string {
  return `已保存本地配装模板：${templateName}`;
}

export function buildLoadoutTemplateDeletedMessage(): string {
  return "已删除本地配装模板。";
}

export function buildLoadoutTemplateRenamedMessage(templateName: string): string {
  return `已重命名本地方案：${templateName}`;
}

export function buildLoadoutTemplateTransferNoTargetMessage(): string {
  return "没有可用角色，无法生成转移计划。";
}

export function buildLoadoutTemplateTransferClipboardText(plan: {
  summary: string;
  steps: Array<{ title: string; description: string }>;
}): string {
  return [
    "d2-tools 配装转移计划",
    plan.summary,
    ...plan.steps.map((step, index) => `${index + 1}. ${step.title}：${step.description}`),
    "说明：这只是计划，不会执行 Bungie 写操作。"
  ].join("\n");
}

export function buildLoadoutTemplateTransferCopiedMessage(summary: string): string {
  return summary || "已复制配装转移计划。";
}

export function buildLoadoutCopyMissingNoAccountMessage(): string {
  return "请先读取账号数据。";
}

export function buildMissingLoadoutAllReadyMessage(): string {
  return "当前方案装备已全部就位。";
}

export function buildMissingLoadoutItemsCopiedMessage(itemCount: number): string {
  return `已复制待补齐清单，共 ${itemCount} 件。`;
}

export function buildLoadoutSlotActionLabel(
  action: "equip" | "snapshot",
  slot: AccountSummary["characters"][number]["loadout_slots"][number]
): string {
  const slotName = slot.name || `槽位 ${slot.index + 1}`;
  return action === "equip"
    ? `应用游戏内配装栏「${slotName}」`
    : `用当前装备覆盖游戏内配装栏「${slotName}」`;
}

export function buildLoadoutSlotActionProgressMessage(label: string): string {
  return `${label}执行中...`;
}

export function buildLoadoutSlotActionConfirmText(input: {
  label: string;
  characterClassName: string;
  slotName?: string;
  slotIndex: number;
}): string {
  return [
    `确认要${input.label}吗？`,
    `角色：${input.characterClassName}`,
    `配装栏：${input.slotName || `槽位 ${input.slotIndex + 1}`}`,
    "说明：这会直接调用 Bungie 的游戏内配装栏接口，并写入本地操作日志。"
  ].join("\n");
}

export function getMissingLoadoutActionableCount(plan: MissingLoadoutTransferPlan): number {
  return new Set(
    plan.steps
      .filter((step) => step.phase !== "equip-swap")
      .flatMap((step) => step.items.map((entry) => entry.item_id))
  ).size;
}

export function buildMissingLoadoutNoActionMessage(plan: MissingLoadoutTransferPlan): string {
  return plan.blocked.length > 0
    ? `当前没有可自动转移的缺失件，还有 ${plan.blocked.length} 件需要手动处理。`
    : "当前方案装备已全部就位。";
}

export function buildMissingLoadoutConfirmText(input: {
  targetCharacterClassName: string;
  actionableItemCount: number;
  transferPlan: MissingLoadoutTransferPlan;
}): string {
  return [
    `确认给 ${input.targetCharacterClassName} 补齐 ${input.actionableItemCount} 件缺失装备？`,
    input.transferPlan.steps.some((step) => step.phase === "equip-swap")
      ? "其中一部分会先在来源角色身上装备替代装备，再把目标装备转出。"
      : null,
    input.transferPlan.steps.some((step) => step.phase === "pull-postmaster")
      ? "其中一部分会先从邮政官取回，再继续后续转移。"
      : null,
    input.transferPlan.steps.some((step) => step.phase === "to-vault")
      ? "其中一部分会先从其他角色背包移回仓库，再转到当前角色。"
      : "这次可以直接从仓库补齐到当前角色。",
    input.transferPlan.steps.some((step) => step.phase === "equip-target")
      ? "补齐完成后，会自动把这些方案装备穿到目标角色身上。"
      : null,
    input.transferPlan.blocked.length > 0
      ? `还有 ${input.transferPlan.blocked.length} 件暂时不会自动转移，例如其他角色已装备或仍在邮政官。`
      : null
  ].filter(Boolean).join("\n");
}

export function buildMissingLoadoutPrepareMessage(itemCount: number): string {
  return `正在准备 ${itemCount} 件缺失装备...`;
}

export function buildMissingLoadoutStepProgressMessage(
  step: MissingLoadoutTransferStep,
  targetCharacterClassName: string
): string {
  if (step.phase === "equip-swap") {
    return `正在在来源角色身上装备 ${step.items.length} 件替代装备...`;
  }
  if (step.phase === "pull-postmaster") {
    return `正在从邮政官取回 ${step.items.length} 件装备...`;
  }
  if (step.phase === "equip-target") {
    return `正在给 ${targetCharacterClassName} 自动装备 ${step.items.length} 件方案装备...`;
  }
  return step.phase === "to-vault"
    ? `正在从来源角色移回 ${step.items.length} 件装备到仓库...`
    : `正在转入 ${step.items.length} 件装备到 ${targetCharacterClassName}...`;
}

export function buildMissingLoadoutResultMessage(input: LoadoutActionResultCounts): string {
  const finishedParts = [
    input.targetTransferCount > 0 ? `转入 ${input.targetTransferCount} 件` : null,
    input.autoEquipCount > 0 ? `自动装备 ${input.autoEquipCount} 件` : null,
    input.prepStepCount > 0 ? `前置处理 ${input.prepStepCount} 步` : null,
    (input.blockedCount ?? 0) > 0 ? `仍有 ${input.blockedCount} 件需手动处理` : null
  ].filter(Boolean);

  return finishedParts.length
    ? `方案补齐完成：${finishedParts.join("，")}。`
    : "方案补齐完成。";
}

export function buildSingleLoadoutTransferNoActionMessage(input: {
  itemName: string;
  transferPlan: MissingLoadoutTransferPlan;
}): string {
  return input.transferPlan.blocked.length > 0
    ? `这件装备当前无法自动补齐：${input.itemName}。`
    : `这件装备已经就位：${input.itemName}。`;
}

export function buildSingleLoadoutTransferConfirmText(itemName: string): string {
  return `确认只补齐「${itemName}」吗？`;
}

export function buildSingleLoadoutTransferStartMessage(itemName: string): string {
  return `正在补齐 ${itemName}...`;
}

export function buildSingleLoadoutTransferNoTargetMessage(): string {
  return "没有可用角色，无法补齐这件装备。";
}

export function buildSingleLoadoutTransferCancelledMessage(): string {
  return "已取消单件补齐。";
}

export function buildSingleLoadoutTransferStepProgressMessage(input: {
  step: MissingLoadoutTransferStep;
  itemName: string;
  targetCharacterClassName: string;
}): string {
  if (input.step.phase === "equip-swap") {
    return `正在为来源角色换下 ${input.itemName}...`;
  }
  if (input.step.phase === "pull-postmaster") {
    return `正在从邮政官取回 ${input.itemName}...`;
  }
  if (input.step.phase === "equip-target") {
    return `正在给 ${input.targetCharacterClassName} 装备 ${input.itemName}...`;
  }
  return input.step.phase === "to-vault"
    ? `正在把 ${input.itemName} 转回仓库...`
    : `正在把 ${input.itemName} 转入 ${input.targetCharacterClassName}...`;
}

export function buildSingleLoadoutTransferResultMessage(input: {
  itemName: string;
} & LoadoutActionResultCounts): string {
  const finishedParts = [
    input.targetTransferCount > 0 ? `转入 ${input.targetTransferCount} 件` : null,
    input.autoEquipCount > 0 ? `自动装备 ${input.autoEquipCount} 件` : null,
    input.prepStepCount > 0 ? `前置处理 ${input.prepStepCount} 步` : null
  ].filter(Boolean);

  return finishedParts.length
    ? `单件补齐完成：${input.itemName}，${finishedParts.join("，")}。`
    : `单件补齐完成：${input.itemName}。`;
}

export function buildSingleLoadoutEquipMissingSourceMessage(itemName: string): string {
  return `找不到可直接装备的物品实例：${itemName}。`;
}

export function buildSingleLoadoutEquipWrongLocationMessage(itemName: string): string {
  return `「${itemName}」当前不在目标角色背包，请先用“只补这一件”。`;
}

export function buildSingleLoadoutEquipConfirmText(itemName: string): string {
  return `确认只装备「${itemName}」吗？`;
}

export function buildSingleLoadoutEquipProgressMessage(itemName: string): string {
  return `正在装备 ${itemName}...`;
}

export function buildLoadoutItemActionFailureMessage(action: "transfer" | "equip", itemName: string): string {
  return action === "transfer"
    ? `单件补齐失败：${itemName}`
    : `单件装备失败：${itemName}`;
}
