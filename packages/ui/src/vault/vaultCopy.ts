import type { AccountItemSummary } from "@d2-tools/core/account/summary";
import type { VaultTagValue } from "@d2-tools/core/vault/tags";
import { isVaultLocatedItem, type VaultActionMessageToken, type VaultFilterFactToken, type VaultGroupFilter, type VaultKnownSlotKey, type VaultSelectionSummary, type VaultTagFilter } from "@d2-tools/app/vault";
import type { VaultCopy } from "../i18n/types.js";

/**
 * 仓库文案兜底查表。zh-CN 侧 `inline` 留空，key 本身就是最终展示的中文原文；
 * en-US 侧以同一段中文原文为 key 查英文，查不到就退回中文原文，不会渲染成空白。
 */
export function vaultText(copy: VaultCopy, key: string): string {
  return copy.inline[key] ?? key;
}

/**
 * 带占位符的句子走这里：zh-CN 侧 key 就是最终展示的中文原文（含 `{名字}` 占位），
 * en-US 侧以同一段原文为 key 查英文。查不到就退回原文，不会渲染成空白。
 */
export function vaultTemplate(copy: VaultCopy, key: string, values: Record<string, string | number>): string {
  return vaultText(copy, key).replace(/\{(\w+)\}/gu, (match, name: string) =>
    name in values ? String(values[name]) : match);
}

/**
 * 槽位名按 `VaultSlotKey` 查表，不再用 bucket 显示名——显示名会随界面语言变。
 * `hash:` 认不出的桶和 `label:` 没有 bucket hash 的条目查不到表，回落到 app 给的原始名；
 * 其中 `label:` 那批是 app 侧写死的分类名，再过一次 `vaultText` 就能跟着界面语言走。
 */
export function vaultSlotLabel(copy: VaultCopy, slotKey: string, fallback?: string): string {
  if (slotKey === "all") return copy.labels.slotAll.label;
  const known = copy.labels.slots[slotKey as VaultKnownSlotKey];
  if (known) return known.label;
  const raw = fallback ?? slotKey;
  return slotKey.startsWith("label:") ? vaultText(copy, raw) : raw;
}

/** 同 `vaultSlotLabel`，取短名给槽位按钮用；没有短名的兜底类别就用全名。 */
export function vaultSlotShortLabel(copy: VaultCopy, slotKey: string, fallback?: string): string {
  if (slotKey === "all") return copy.labels.slotAll.short;
  const known = copy.labels.slots[slotKey as VaultKnownSlotKey];
  if (known) return known.short;
  const raw = fallback ?? slotKey;
  return slotKey.startsWith("label:") ? vaultText(copy, raw) : raw;
}

/** `buildVaultSelectionSummary` 只判是哪一种情况，成句在界面侧。 */
export function vaultSelectionSummaryText(copy: VaultCopy, summary: VaultSelectionSummary): string {
  if (summary.kind === "none") return vaultText(copy, "未选择任何装备。");
  if (summary.kind === "all-visible") {
    return vaultTemplate(copy, "已选 {count} 件，全部都在当前结果中。", { count: summary.total });
  }
  return vaultTemplate(copy, "已选 {count} 件，其中当前结果 {visible} 件，另外 {hidden} 件来自其他筛选结果。", {
    count: summary.total,
    visible: summary.visible,
    hidden: summary.hidden
  });
}

/** 整理状态那一档：武器组用「未整理」，其余组也有「未标记」的说法。 */
function vaultTagFilterLabel(copy: VaultCopy, tag: VaultTagFilter, group: VaultGroupFilter): string {
  return tag === "untagged" && group === "weapons" ? vaultText(copy, "未整理") : copy.labels.tags[tag];
}

/** 筛选摘要里的单个片段。片段由 app 判种类，措辞在这里现算。 */
export function vaultFilterFactLabel(copy: VaultCopy, fact: VaultFilterFactToken): string {
  switch (fact.kind) {
    case "group": return copy.labels.groups[fact.group];
    case "query_tag": return vaultTemplate(copy, "查询标签：{tag}", { tag: vaultTagFilterLabel(copy, fact.tag, fact.group) });
    case "query_locked": return vaultTemplate(copy, "查询锁定：{state}", { state: copy.labels.locks[fact.locked ? "locked" : "unlocked"] });
    case "query_type": return vaultTemplate(copy, "查询类型：{type}", { type: copy.labels.groups[fact.group] });
    case "query_text": return vaultTemplate(copy, "搜索：{query}", { query: fact.text });
    case "tag": return vaultTagFilterLabel(copy, fact.tag, fact.group);
    case "lock": return copy.labels.locks[fact.lock];
    case "slot": return vaultTemplate(copy, "位置：{slot}", { slot: fact.label });
    case "location": return vaultTemplate(copy, "所在位置：{location}", { location: copy.labels.locations[fact.location] });
    case "ammo": return copy.labels.ammo[fact.ammo];
    case "crafting": return vaultTemplate(copy, "锻造状态：{crafting}", { crafting: copy.labels.crafting[fact.crafting] });
    case "itemType": return vaultTemplate(copy, "类型：{type}", { type: fact.value });
    case "rarity": return vaultTemplate(copy, "稀有度：{rarity}", { rarity: copy.labels.rarity[fact.rarity] });
    case "gearTier": return vaultTemplate(copy, "装备阶级：{tier}", { tier: copy.labels.gearTiers[fact.tier] });
    case "class": return vaultTemplate(copy, "职业：{className}", { className: copy.labels.classes[fact.className] });
    case "damage": return vaultTemplate(copy, "伤害属性：{damage}", { damage: copy.labels.damage[fact.damage] });
    case "armorSet": return vaultTemplate(copy, "护甲套装：{set}", { set: fact.label });
    case "frame": return vaultTemplate(copy, "武器框架：{frame}", { frame: fact.label });
    case "armorStats": return vaultTemplate(copy, "护甲属性条件：{count} 条", { count: fact.count });
  }
}

/** 整句：把片段用 ` / ` 连起来，空列表回落到「默认筛选」。 */
export function vaultContextFactLine(
  copy: VaultCopy,
  facts: readonly VaultFilterFactToken[],
  counts: { filteredCount: number; totalCount: number }
): string {
  const filters = facts.map((fact) => vaultFilterFactLabel(copy, fact)).join(" / ");
  return vaultTemplate(copy, "仓库筛选：{filters}，命中 {filtered} / {total} 件。", {
    filters: filters || vaultText(copy, "默认筛选"),
    filtered: counts.filteredCount,
    total: counts.totalCount
  });
}

/** 卡片上的所在位置。角色的那条是「职业名 · 位置」，位置名要跟着界面语言。 */
export function vaultItemLocationLabel(copy: VaultCopy, item: AccountItemSummary): string {
  if (!isVaultLocatedItem(item)) return vaultText(copy, "仓库");
  return vaultSourceLocationLabel(copy, item.source_location_label, item.source_character_class);
}

/** 位置名和角色职业名分开传的入口，给已经拆开过的调用方用。 */
export function vaultSourceLocationLabel(copy: VaultCopy, sourceLocationLabel: string, characterClass?: string): string {
  const location = vaultText(copy, sourceLocationLabel);
  return characterClass ? vaultTemplate(copy, "{className} · {location}", { className: characterClass, location }) : location;
}

/** 护甲属性的一行摘要，拼在卡片 `title` 和整理清单里。 */
export function vaultArmorStatsInline(copy: VaultCopy, item: AccountItemSummary): string | undefined {
  if (!item.armor_stats) return undefined;
  return [
    vaultTemplate(copy, "总值 {total}", { total: item.armor_stats.total }),
    vaultTemplate(copy, "生命值 {health}", { health: item.armor_stats.health }),
    vaultTemplate(copy, "职业 {class}", { class: item.armor_stats.class }),
    vaultTemplate(copy, "手雷 {grenade}", { grenade: item.armor_stats.grenade })
  ].join(" / ");
}

/** 批量标记的口径名：动作按钮、进行中提示共用同一批标记词。 */
function vaultTagWord(copy: VaultCopy, tag: VaultTagValue): string {
  switch (tag) {
    case "review": return vaultText(copy, "待定");
    case "junk": return vaultText(copy, "清理");
    case "farm": return vaultText(copy, "待刷");
    case "loadout": return vaultText(copy, "配装用");
    case "keep": return vaultText(copy, "保留");
    default: return vaultText(copy, "本地标记");
  }
}

/** 批量操作回执的成句。token 由 app 判种类，措辞在这里现算。 */
export function vaultActionMessageText(copy: VaultCopy, token: VaultActionMessageToken): string {
  switch (token.kind) {
    case "bulkMoveResult": {
      const targetLabel = token.targetLabel || vaultText(copy, "目标角色");
      return token.failedCount
        ? vaultTemplate(copy, "部分转移到{target}：成功 {success} 件，失败 {failed} 件。可到设置 -> 操作日志查看失败详情。", {
            target: targetLabel,
            success: token.successCount,
            failed: token.failedCount
          })
        : vaultTemplate(copy, "已转移到{target}：共 {count} 件，页面已更新。", {
            target: targetLabel,
            count: token.successCount
          });
    }
    case "batchTagAction":
      return token.tag === "none"
        ? vaultText(copy, "批量清除")
        : vaultTemplate(copy, "批量{word}", { word: vaultTagWord(copy, token.tag) });
    case "batchTagLoading":
      return token.tag === "none"
        ? vaultText(copy, "正在批量清除本地标记...")
        : vaultTemplate(copy, "正在批量标记为{word}...", { word: vaultTagWord(copy, token.tag) });
    case "batchTagResult":
      return vaultTemplate(copy, "已处理 {count} 件装备。", { count: token.itemCount });
    case "bulkMovePrepare":
      return vaultTemplate(copy, "正在准备移动 {count} 件装备...", { count: token.itemCount });
    case "bulkMoveNoSelection":
      return vaultText(copy, "请先选择要移动的装备。");
    case "cleanupNoTarget":
      return vaultText(copy, "请先选择目标角色。");
    case "cleanupAction":
      return token.action === "unlock" ? vaultText(copy, "批量解锁") : vaultText(copy, "转移到角色背包");
    case "cleanupActionProgress":
      return token.action === "unlock" ? vaultText(copy, "正在批量解锁...") : vaultText(copy, "正在转移到角色背包...");
    case "cleanupWriteResult":
      return token.failedCount
        ? vaultTemplate(copy, "{label}部分完成：成功 {success} 件，失败 {failed} 件。", {
            label: token.label,
            success: token.successCount,
            failed: token.failedCount
          })
        : vaultTemplate(copy, "{label}完成：成功 {success} 件。", {
            label: token.label,
            success: token.successCount
          });
  }
}
