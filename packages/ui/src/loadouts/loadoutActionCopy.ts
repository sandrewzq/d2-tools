import type {
  LoadoutActionMessageToken,
  LoadoutActionResultPart,
  LoadoutConfirmToken,
  LoadoutSlotActionLabelToken,
  LoadoutTemplateNameToken,
  LoadoutTransferStepPhase
} from "@d2-tools/app/loadouts";
import type { HighestPowerMessageToken } from "@d2-tools/app/vault";
import type { LoadoutsCopy } from "../i18n/types.js";
import { loadoutTemplate, loadoutText } from "./loadoutCopy.js";

/**
 * 配装写操作回执的成句处。
 *
 * app 侧只产出 `kind` 和值，句子在这里查表拼出来。逐条回来对过 zh-CN 原文，
 * 换语言不换分支：同一段 `switch` 中英各查一次表。
 */

/**
 * 槽位级动作名。`equip` / `snapshot` 会点名配装栏，名字为空才是「槽位 N」；
 * `clear` / `update-identifiers` 不点名，别给它补上槽位号。
 */
export function loadoutSlotActionLabelText(copy: LoadoutsCopy, label: LoadoutSlotActionLabelToken): string {
  if (label.action === "clear") return loadoutText(copy, "清空游戏内配装栏");
  if (label.action === "update-identifiers") return loadoutText(copy, "更新游戏内配装标识");
  const slotName = label.slot_name || loadoutTemplate(copy, "槽位 {index}", { index: label.slot_index + 1 });
  return label.action === "equip"
    ? loadoutTemplate(copy, "应用游戏内配装栏「{slot}」", { slot: slotName })
    : loadoutTemplate(copy, "用当前装备覆盖游戏内配装栏「{slot}」", { slot: slotName });
}

/** 角色默认方案名。只在新建时成句，之后它就是存下来的用户数据。 */
export function loadoutTemplateNameText(copy: LoadoutsCopy, token: LoadoutTemplateNameToken): string {
  return loadoutTemplate(copy, "{class} 光等 {light}", {
    class: token.class_name,
    light: token.light ?? "-"
  });
}

/** 「转入 3 件，自动装备 2 件」里的单个片段。 */
function loadoutResultPartText(copy: LoadoutsCopy, part: LoadoutActionResultPart): string {
  switch (part.kind) {
    case "transferred": return loadoutTemplate(copy, "转入 {count} 件", { count: part.count });
    case "auto-equipped": return loadoutTemplate(copy, "自动装备 {count} 件", { count: part.count });
    case "prepared": return loadoutTemplate(copy, "前置处理 {count} 步", { count: part.count });
    case "blocked": return loadoutTemplate(copy, "仍有 {count} 件需手动处理", { count: part.count });
  }
}

/** 计数片段之间的顿号跟着语言走：中文用「，」，英文用「, 」。 */
function loadoutResultPartsText(copy: LoadoutsCopy, parts: readonly LoadoutActionResultPart[]): string {
  return parts.map((part) => loadoutResultPartText(copy, part)).join(loadoutText(copy, "，"));
}

/** 补齐步骤的进行中提示。`to-character` 和 `equip-target` 都要点名角色，其余不用。 */
function loadoutStepPhaseText(
  copy: LoadoutsCopy,
  phase: LoadoutTransferStepPhase,
  targetClassName: string,
  values: { count: number } | { item: string }
): string {
  const count = "count" in values ? values.count : 0;
  const item = "item" in values ? values.item : "";
  switch (phase) {
    case "equip-swap":
      return "count" in values
        ? loadoutTemplate(copy, "正在在来源角色身上装备 {count} 件替代装备...", { count })
        : loadoutTemplate(copy, "正在为来源角色换下 {item}...", { item });
    case "pull-postmaster":
      return "count" in values
        ? loadoutTemplate(copy, "正在从邮政官取回 {count} 件装备...", { count })
        : loadoutTemplate(copy, "正在从邮政官取回 {item}...", { item });
    case "equip-target":
      return "count" in values
        ? loadoutTemplate(copy, "正在给 {class} 自动装备 {count} 件方案装备...", { class: targetClassName, count })
        : loadoutTemplate(copy, "正在给 {class} 装备 {item}...", { class: targetClassName, item });
    case "to-vault":
      return "count" in values
        ? loadoutTemplate(copy, "正在从来源角色移回 {count} 件装备到仓库...", { count })
        : loadoutTemplate(copy, "正在把 {item} 转回仓库...", { item });
    default:
      return "count" in values
        ? loadoutTemplate(copy, "正在转入 {count} 件装备到 {class}...", { class: targetClassName, count })
        : loadoutTemplate(copy, "正在把 {item} 转入 {class}...", { class: targetClassName, item });
  }
}

export function loadoutActionMessageText(copy: LoadoutsCopy, token: LoadoutActionMessageToken): string {
  switch (token.kind) {
    case "template-saved":
      return loadoutTemplate(copy, "已保存本地配装模板：{name}", { name: token.template_name });
    case "template-deleted":
      return loadoutText(copy, "已删除本地配装模板。");
    case "template-renamed":
      return loadoutTemplate(copy, "已重命名本地方案：{name}", { name: token.template_name });
    case "no-target-character":
      return loadoutText(copy, "没有可用角色，无法生成转移计划。");
    case "transfer-plan-copied":
      return loadoutTemplate(copy, "计划为模板「{name}」转移 {count} 件装备到角色。", {
        name: token.template_name,
        count: token.step_count
      });
    case "account-required":
      return loadoutText(copy, "请先读取账号数据。");
    case "all-ready":
      return loadoutText(copy, "当前方案装备已全部就位。");
    case "missing-items-copied":
      return loadoutTemplate(copy, "已复制待补齐清单，共 {count} 件。", { count: token.item_count });
    case "slot-action-progress":
      return loadoutTemplate(copy, "{label}执行中...", { label: loadoutSlotActionLabelText(copy, token.label) });
    case "slot-action-failed":
      return loadoutTemplate(copy, "{label}失败", { label: loadoutSlotActionLabelText(copy, token.label) });
    case "missing-none-actionable":
      return loadoutTemplate(copy, "当前没有可自动转移的缺失件，还有 {count} 件需要手动处理。", {
        count: token.blocked_count
      });
    case "missing-prepare":
      return loadoutTemplate(copy, "正在准备 {count} 件缺失装备...", { count: token.item_count });
    case "missing-step-progress":
      return loadoutStepPhaseText(copy, token.phase, token.target_class_name, { count: token.item_count });
    case "missing-result":
      return token.parts.length
        ? loadoutTemplate(copy, "方案补齐完成：{parts}。", { parts: loadoutResultPartsText(copy, token.parts) })
        : loadoutText(copy, "方案补齐完成。");
    case "single-transfer-no-action":
      return token.blocked
        ? loadoutTemplate(copy, "这件装备当前无法自动补齐：{item}。", { item: token.item_name })
        : loadoutTemplate(copy, "这件装备已经就位：{item}。", { item: token.item_name });
    case "single-transfer-start":
      return loadoutTemplate(copy, "正在补齐 {item}...", { item: token.item_name });
    case "single-transfer-cancelled":
      return loadoutText(copy, "已取消单件补齐。");
    case "single-transfer-no-target":
      return loadoutText(copy, "没有可用角色，无法补齐这件装备。");
    case "single-transfer-step-progress":
      return loadoutStepPhaseText(copy, token.phase, token.target_class_name, { item: token.item_name });
    case "single-transfer-result":
      return token.parts.length
        ? loadoutTemplate(copy, "单件补齐完成：{item}，{parts}。", {
            item: token.item_name,
            parts: loadoutResultPartsText(copy, token.parts)
          })
        : loadoutTemplate(copy, "单件补齐完成：{item}。", { item: token.item_name });
    case "single-equip-no-instance":
      return loadoutTemplate(copy, "找不到可直接装备的物品实例：{item}。", { item: token.item_name });
    case "single-equip-wrong-location":
      return loadoutTemplate(copy, "「{item}」当前不在目标角色背包，请先用“只补这一件”。", { item: token.item_name });
    case "single-equip-progress":
      return loadoutTemplate(copy, "正在装备 {item}...", { item: token.item_name });
    case "item-action-failed":
      return token.action === "transfer"
        ? loadoutTemplate(copy, "单件补齐失败：{item}", { item: token.item_name })
        : loadoutTemplate(copy, "单件装备失败：{item}", { item: token.item_name });
  }
}

/** 确认框正文按行拼。`to-vault` 那两行是二选一，永远出且只出一行。 */
export function loadoutConfirmText(copy: LoadoutsCopy, token: LoadoutConfirmToken): string {
  if (token.kind === "single-transfer") {
    return loadoutTemplate(copy, "确认只补齐「{item}」吗？", { item: token.item_name });
  }
  if (token.kind === "single-equip") {
    return loadoutTemplate(copy, "确认只装备「{item}」吗？", { item: token.item_name });
  }
  if (token.kind === "slot-action") {
    const slotName = token.slot_name || loadoutTemplate(copy, "槽位 {index}", { index: token.slot_index + 1 });
    return [
      loadoutTemplate(copy, "确认要{label}吗？", { label: loadoutSlotActionLabelText(copy, token.label) }),
      loadoutTemplate(copy, "角色：{class}", { class: token.class_name }),
      loadoutTemplate(copy, "配装栏：{slot}", { slot: slotName }),
      loadoutText(copy, "说明：这会直接调用 Bungie 的游戏内配装栏接口，并写入本地操作日志。")
    ].join("\n");
  }
  const lines = [
    loadoutTemplate(copy, "确认给 {class} 补齐 {count} 件缺失装备？", {
      class: token.class_name,
      count: token.item_count
    })
  ];
  if (token.has_equip_swap) lines.push(loadoutText(copy, "其中一部分会先在来源角色身上装备替代装备，再把目标装备转出。"));
  if (token.has_pull_postmaster) lines.push(loadoutText(copy, "其中一部分会先从邮政官取回，再继续后续转移。"));
  lines.push(token.has_to_vault
    ? loadoutText(copy, "其中一部分会先从其他角色背包移回仓库，再转到当前角色。")
    : loadoutText(copy, "这次可以直接从仓库补齐到当前角色。"));
  if (token.has_equip_target) lines.push(loadoutText(copy, "补齐完成后，会自动把这些方案装备穿到目标角色身上。"));
  if (token.blocked_count > 0) {
    lines.push(loadoutTemplate(copy, "还有 {count} 件暂时不会自动转移，例如其他角色已装备或仍在邮政官。", {
      count: token.blocked_count
    }));
  }
  return lines.join("\n");
}

/**
 * 最高光等回执。失败那条的分数结构（转移受理 1/3）不能拆开拼，英文里
 * 数字和斜杠的位置跟中文一样，但「部分提交」和「执行失败」要分别选词。
 */
export function highestPowerMessageText(copy: LoadoutsCopy, token: HighestPowerMessageToken): string {
  switch (token.kind) {
    case "already-optimal":
      return loadoutTemplate(copy, "{class} 当前已经是最高光等组合。", { class: token.class_name });
    case "transfer-progress":
      return loadoutTemplate(copy, "正在从仓库取出 {count} 件最高光等装备...", { count: token.item_count });
    case "equip-progress":
      return loadoutTemplate(copy, "正在装备最高光等 {count} 件装备...", { count: token.item_count });
    case "result-with-failures":
      return loadoutTemplate(copy, "最高光等{outcome}：转移受理 {transfer}，装备受理 {equip}，失败步骤 {failed}。{tail}", {
        outcome: token.partial ? loadoutText(copy, "部分提交") : loadoutText(copy, "执行失败"),
        transfer: `${token.transfer_success_count}/${token.transfer_total_count}`,
        equip: `${token.equip_success_count}/${token.equip_total_count}`,
        failed: token.failed_count,
        tail: token.failure_reason
          ? loadoutTemplate(copy, "首个失败原因：{reason}", { reason: token.failure_reason })
          : loadoutText(copy, "可在设置页查看操作日志。")
      });
    case "result-submitted":
      return loadoutTemplate(copy, "已提交给 {class} 装备 {count} 件最高光等装备，正在确认游戏内状态。", {
        class: token.class_name,
        count: token.equip_count
      });
  }
}
