import type { AccountSummary, CharacterSummary } from "@d2-tools/core/account/summary";
import type { MissingLoadoutTransferPlan, MissingLoadoutTransferStep } from "./loadoutTransfer.js";

export type LoadoutActionResultCounts = {
  targetTransferCount: number;
  autoEquipCount: number;
  prepStepCount: number;
  blockedCount?: number;
};

/**
 * 配装写操作的回执与确认句。
 *
 * 这里只产出结构，不产出中文句子：界面按 `kind` 查表成句，`item_name`、`slot_name`
 * 这类不透明值原样带走。原先这些函数直接返回拼好的展示串，中文换英文时整条链路
 * 都得改；改成结构之后，同一条回执在中英两侧共用同一份分支逻辑。
 */
export type LoadoutTransferStepPhase = MissingLoadoutTransferStep["phase"];

/** 槽位级动作名。`equip` / `snapshot` 会点名配装栏，`clear` / `update-identifiers` 不点名。 */
export type LoadoutSlotActionLabelToken =
  | { action: "equip"; slot_name: string | null; slot_index: number }
  | { action: "snapshot"; slot_name: string | null; slot_index: number }
  | { action: "clear" }
  | { action: "update-identifiers" };

/** 补齐结果里的一个计数片段。没有计数的片段不出现，所以用数组而不是四个可选字段。 */
export type LoadoutActionResultPart =
  | { kind: "transferred"; count: number }
  | { kind: "auto-equipped"; count: number }
  | { kind: "prepared"; count: number }
  | { kind: "blocked"; count: number };

export type LoadoutActionMessageToken =
  | { kind: "template-saved"; template_name: string }
  | { kind: "template-deleted" }
  | { kind: "template-renamed"; template_name: string }
  | { kind: "no-target-character" }
  | { kind: "transfer-plan-copied"; template_name: string; step_count: number }
  | { kind: "account-required" }
  | { kind: "all-ready" }
  | { kind: "missing-items-copied"; item_count: number }
  | { kind: "slot-action-progress"; label: LoadoutSlotActionLabelToken }
  | { kind: "slot-action-failed"; label: LoadoutSlotActionLabelToken }
  | { kind: "missing-none-actionable"; blocked_count: number }
  | { kind: "missing-prepare"; item_count: number }
  | {
      kind: "missing-step-progress";
      phase: LoadoutTransferStepPhase;
      item_count: number;
      target_class_name: string;
    }
  | { kind: "missing-result"; parts: LoadoutActionResultPart[] }
  | { kind: "single-transfer-no-action"; item_name: string; blocked: boolean }
  | { kind: "single-transfer-start"; item_name: string }
  | { kind: "single-transfer-cancelled" }
  | { kind: "single-transfer-no-target" }
  | {
      kind: "single-transfer-step-progress";
      phase: LoadoutTransferStepPhase;
      item_name: string;
      target_class_name: string;
    }
  | { kind: "single-transfer-result"; item_name: string; parts: LoadoutActionResultPart[] }
  | { kind: "single-equip-no-instance"; item_name: string }
  | { kind: "single-equip-wrong-location"; item_name: string }
  | { kind: "single-equip-progress"; item_name: string }
  | { kind: "item-action-failed"; action: "transfer" | "equip"; item_name: string };

/** 确认框正文。多行且分行有分支，所以整句一个 token，界面负责拼行。 */
export type LoadoutConfirmToken =
  | {
      kind: "slot-action";
      label: LoadoutSlotActionLabelToken;
      class_name: string;
      slot_name: string | null;
      slot_index: number;
    }
  | {
      kind: "missing-fill";
      class_name: string;
      item_count: number;
      has_equip_swap: boolean;
      has_pull_postmaster: boolean;
      has_to_vault: boolean;
      has_equip_target: boolean;
      blocked_count: number;
    }
  | { kind: "single-transfer"; item_name: string }
  | { kind: "single-equip"; item_name: string };

/**
 * 角色默认方案名。这串会写进本地模板并长期保存，所以跟创建时的界面语言走：
 * 中文用户建出来是「术士 光等 1800」，英文用户建出来是「Warlock Light 1800」。
 * 已存下来的名字不再随语言变，它是用户数据。
 */
export type LoadoutTemplateNameToken = {
  kind: "character-default";
  class_name: string;
  light: number | null;
};

export function buildCharacterLoadoutTemplateName(character: CharacterSummary): LoadoutTemplateNameToken {
  return { kind: "character-default", class_name: character.class_name, light: character.light ?? null };
}

export function buildSaveCharacterLoadoutSuccessMessage(templateName: string): LoadoutActionMessageToken {
  return { kind: "template-saved", template_name: templateName };
}

export function buildLoadoutTemplateDeletedMessage(): LoadoutActionMessageToken {
  return { kind: "template-deleted" };
}

export function buildLoadoutTemplateRenamedMessage(templateName: string): LoadoutActionMessageToken {
  return { kind: "template-renamed", template_name: templateName };
}

export function buildLoadoutTemplateTransferNoTargetMessage(): LoadoutActionMessageToken {
  return { kind: "no-target-character" };
}

export function buildLoadoutTemplateTransferCopiedMessage(input: {
  template_name: string;
  step_count: number;
}): LoadoutActionMessageToken {
  return { kind: "transfer-plan-copied", template_name: input.template_name, step_count: input.step_count };
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

export function buildLoadoutCopyMissingNoAccountMessage(): LoadoutActionMessageToken {
  return { kind: "account-required" };
}

export function buildMissingLoadoutAllReadyMessage(): LoadoutActionMessageToken {
  return { kind: "all-ready" };
}

export function buildMissingLoadoutItemsCopiedMessage(itemCount: number): LoadoutActionMessageToken {
  return { kind: "missing-items-copied", item_count: itemCount };
}

export function buildLoadoutSlotActionLabel(
  action: "equip" | "snapshot",
  slot: AccountSummary["characters"][number]["loadout_slots"][number]
): LoadoutSlotActionLabelToken {
  return { action, slot_name: slot.name || null, slot_index: slot.index };
}

/** `clear` 和 `update-identifiers` 的动作名不点配装栏名，和上面两个分开建。 */
export function buildLoadoutSlotActionCommandLabel(
  action: "clear" | "update-identifiers"
): LoadoutSlotActionLabelToken {
  return { action };
}

export function buildLoadoutSlotActionProgressMessage(
  label: LoadoutSlotActionLabelToken
): LoadoutActionMessageToken {
  return { kind: "slot-action-progress", label };
}

export function buildLoadoutSlotActionFailedMessage(
  label: LoadoutSlotActionLabelToken
): LoadoutActionMessageToken {
  return { kind: "slot-action-failed", label };
}

export function buildLoadoutSlotActionConfirmText(input: {
  label: LoadoutSlotActionLabelToken;
  characterClassName: string;
  slotName?: string;
  slotIndex: number;
}): LoadoutConfirmToken {
  return {
    kind: "slot-action",
    label: input.label,
    class_name: input.characterClassName,
    slot_name: input.slotName ?? null,
    slot_index: input.slotIndex
  };
}

export function getMissingLoadoutActionableCount(plan: MissingLoadoutTransferPlan): number {
  return new Set(
    plan.steps
      .filter((step) => step.phase !== "equip-swap")
      .flatMap((step) => step.items.map((entry) => entry.item_id))
  ).size;
}

export function buildMissingLoadoutNoActionMessage(plan: MissingLoadoutTransferPlan): LoadoutActionMessageToken {
  return plan.blocked.length > 0
    ? { kind: "missing-none-actionable", blocked_count: plan.blocked.length }
    : { kind: "all-ready" };
}

export function buildMissingLoadoutConfirmText(input: {
  targetCharacterClassName: string;
  actionableItemCount: number;
  transferPlan: MissingLoadoutTransferPlan;
}): LoadoutConfirmToken {
  return {
    kind: "missing-fill",
    class_name: input.targetCharacterClassName,
    item_count: input.actionableItemCount,
    has_equip_swap: input.transferPlan.steps.some((step) => step.phase === "equip-swap"),
    has_pull_postmaster: input.transferPlan.steps.some((step) => step.phase === "pull-postmaster"),
    has_to_vault: input.transferPlan.steps.some((step) => step.phase === "to-vault"),
    has_equip_target: input.transferPlan.steps.some((step) => step.phase === "equip-target"),
    blocked_count: input.transferPlan.blocked.length
  };
}

export function buildMissingLoadoutPrepareMessage(itemCount: number): LoadoutActionMessageToken {
  return { kind: "missing-prepare", item_count: itemCount };
}

export function buildMissingLoadoutStepProgressMessage(
  step: MissingLoadoutTransferStep,
  targetCharacterClassName: string
): LoadoutActionMessageToken {
  return {
    kind: "missing-step-progress",
    phase: step.phase,
    item_count: step.items.length,
    target_class_name: targetCharacterClassName
  };
}

export function buildMissingLoadoutResultMessage(input: LoadoutActionResultCounts): LoadoutActionMessageToken {
  return { kind: "missing-result", parts: loadoutResultParts(input, true) };
}

export function buildSingleLoadoutTransferNoActionMessage(input: {
  itemName: string;
  transferPlan: MissingLoadoutTransferPlan;
}): LoadoutActionMessageToken {
  return {
    kind: "single-transfer-no-action",
    item_name: input.itemName,
    blocked: input.transferPlan.blocked.length > 0
  };
}

export function buildSingleLoadoutTransferConfirmText(itemName: string): LoadoutConfirmToken {
  return { kind: "single-transfer", item_name: itemName };
}

export function buildSingleLoadoutTransferStartMessage(itemName: string): LoadoutActionMessageToken {
  return { kind: "single-transfer-start", item_name: itemName };
}

export function buildSingleLoadoutTransferNoTargetMessage(): LoadoutActionMessageToken {
  return { kind: "single-transfer-no-target" };
}

export function buildSingleLoadoutTransferCancelledMessage(): LoadoutActionMessageToken {
  return { kind: "single-transfer-cancelled" };
}

export function buildSingleLoadoutTransferStepProgressMessage(input: {
  step: MissingLoadoutTransferStep;
  itemName: string;
  targetCharacterClassName: string;
}): LoadoutActionMessageToken {
  return {
    kind: "single-transfer-step-progress",
    phase: input.step.phase,
    item_name: input.itemName,
    target_class_name: input.targetCharacterClassName
  };
}

export function buildSingleLoadoutTransferResultMessage(input: {
  itemName: string;
} & LoadoutActionResultCounts): LoadoutActionMessageToken {
  return { kind: "single-transfer-result", item_name: input.itemName, parts: loadoutResultParts(input, false) };
}

export function buildSingleLoadoutEquipMissingSourceMessage(itemName: string): LoadoutActionMessageToken {
  return { kind: "single-equip-no-instance", item_name: itemName };
}

export function buildSingleLoadoutEquipWrongLocationMessage(itemName: string): LoadoutActionMessageToken {
  return { kind: "single-equip-wrong-location", item_name: itemName };
}

export function buildSingleLoadoutEquipConfirmText(itemName: string): LoadoutConfirmToken {
  return { kind: "single-equip", item_name: itemName };
}

export function buildSingleLoadoutEquipProgressMessage(itemName: string): LoadoutActionMessageToken {
  return { kind: "single-equip-progress", item_name: itemName };
}

export function buildLoadoutItemActionFailureMessage(
  action: "transfer" | "equip",
  itemName: string
): LoadoutActionMessageToken {
  return { kind: "item-action-failed", action, item_name: itemName };
}

/** 只有非零计数才成段，顺序固定：转入、自动装备、前置处理，单件补齐不带「仍有」那段。 */
function loadoutResultParts(input: LoadoutActionResultCounts, includeBlocked: boolean): LoadoutActionResultPart[] {
  const parts: LoadoutActionResultPart[] = [];
  if (input.targetTransferCount > 0) parts.push({ kind: "transferred", count: input.targetTransferCount });
  if (input.autoEquipCount > 0) parts.push({ kind: "auto-equipped", count: input.autoEquipCount });
  if (input.prepStepCount > 0) parts.push({ kind: "prepared", count: input.prepStepCount });
  if (includeBlocked && (input.blockedCount ?? 0) > 0) {
    parts.push({ kind: "blocked", count: input.blockedCount ?? 0 });
  }
  return parts;
}
