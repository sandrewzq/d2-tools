import type {
  AccountItemSummary,
  AccountSummary,
  CharacterLoadoutSlotItemSummary,
  CharacterLoadoutSlotSummary,
  CharacterSummary
} from "@d2-tools/core/account/summary";
import {
  matchLocalLoadoutPlan,
  type LocalLoadoutPlan
} from "@d2-tools/core/loadouts/plans";

/**
 * 跨来源标记（T58 已确认第 1、2 条）。
 *
 * 游戏内配装与应用配装是两个独立业务对象：各存各的、分开计数，不合并记录，也不因为内容相同藏起一条。
 * 两边靠**内容比对**互相指认。比对的只有装备和子职业两层——护甲约束、优先级、备注这些应用侧独有的
 * 设置游戏内根本不返回，一旦参与相等判断，任何一套配装都会被判成「不一致」。
 */
export type CrossSourceLink = {
  tone: "neutral" | "success";
  label: string;
};

/** 内容比对的三种结果。`unknown` 和 `different` 是两回事：没返回不等于不一样。 */
type ContentComparison = "match" | "different" | "unknown";

type ComparableItem = {
  item_hash?: number;
  instance_id?: string;
  slotKey: string;
};

export function normalizeCompareSlot(rawSlot: string): { key: string; label: string } {
  const value = rawSlot.trim().toLocaleLowerCase();
  const knownSlots: Array<{ key: string; label: string; patterns: RegExp[] }> = [
    // 「职业分支」是 `bucketLabels`（`packages/core/src/items/classification.ts`）给子职业 bucket
    // 起的名字，比对表里的 `subclass` 必须在同一次归一化里认得出它。少了这一条，
    // `compareSubclassToPlan` 找不到子职业，跨来源的「内容一致」永远判不出来。
    { key: "subclass", label: "子职业", patterns: [/子职业/, /职业分支/, /subclass/] },
    { key: "kinetic", label: "动能武器", patterns: [/动能/, /kinetic/] },
    { key: "energy", label: "能量武器", patterns: [/能量武器/, /^energy/] },
    { key: "power", label: "威能武器", patterns: [/威能/, /重武器/, /power weapon/, /heavy/] },
    { key: "helmet", label: "头盔", patterns: [/头盔/, /helmet/] },
    { key: "gauntlets", label: "臂铠", patterns: [/臂铠/, /手套/, /gauntlet/] },
    { key: "chest", label: "胸甲", patterns: [/胸甲/, /chest/] },
    { key: "legs", label: "腿甲", patterns: [/腿甲/, /leg armor/, /boots/] },
    { key: "class-item", label: "职业物品", patterns: [/职业物品/, /class item/] }
  ];
  const known = knownSlots.find((slot) => slot.patterns.some((pattern) => pattern.test(value)));
  if (known) return { key: known.key, label: known.label };
  const key = value.replace(/[^\p{Letter}\p{Number}]+/gu, "-").replace(/^-|-$/g, "") || "unknown-slot";
  return { key: `custom:${key}`, label: rawSlot || "未命名槽位" };
}

/**
 * 一套应用配装在游戏内槽位上的落点。按「内容一致的槽位 → 角色当前装备就是这一套 → 目标角色可穿戴」取第一条成立的。
 * 账号没读或都对不上时不给标记——不按名称或相似配置猜对应关系。
 */
export function selectApplicationLoadoutInGameLink(
  plan: LocalLoadoutPlan,
  accountSummary: AccountSummary | null
): CrossSourceLink | null {
  if (!accountSummary) return null;
  const characters = resolvePlanCharacters(plan, accountSummary);
  if (!characters.length) return { tone: "neutral", label: "未对应游戏内槽位" };
  for (const character of characters) {
    for (const slot of character.loadout_slots) {
      if (!slot.items.length) continue;
      if (compareSlotToPlan(plan, toComparableSlotItems(slot.items)) === "match") {
        return { tone: "success", label: `游戏内槽位 ${slot.index + 1} · 内容一致` };
      }
    }
  }
  for (const character of characters) {
    if (compareSlotToPlan(plan, toComparableAccountItems(character.equipped_items)) === "match") {
      return { tone: "success", label: "角色当前装备就是这一套" };
    }
  }
  const matchSummary = matchLocalLoadoutPlan(plan, accountSummary);
  if (plan.item_targets.length && matchSummary.selected_count === plan.item_targets.length) {
    return { tone: "neutral", label: `${characters[0].class_name}身上有可穿戴对应槽位` };
  }
  return { tone: "neutral", label: "未对应游戏内槽位" };
}

/**
 * 反过来：这个游戏内槽位对得上哪套应用配装。同样只认内容一致，
 * 内容不同时不给标记——说不清是哪一套变了，猜出来的对应关系比没有更糟。
 */
export function selectInGameSlotPlanLink(
  character: CharacterSummary,
  slot: CharacterLoadoutSlotSummary,
  plans: readonly LocalLoadoutPlan[],
  accountSummary: AccountSummary | null
): { plan_id: string; plan_name: string } | null {
  if (!accountSummary || !slot.items.length) return null;
  const items = toComparableSlotItems(slot.items);
  for (const plan of plans) {
    if (!planAppliesToCharacter(plan, character)) continue;
    if (compareSlotToPlan(plan, items) === "match") {
      return { plan_id: plan.id, plan_name: plan.name };
    }
  }
  return null;
}

/** 方案定了目标角色就用它；只定了职业时，同职业的每个角色都算候选。 */
function resolvePlanCharacters(plan: LocalLoadoutPlan, accountSummary: AccountSummary): CharacterSummary[] {
  if (plan.target_character_id) {
    const pinned = accountSummary.characters.find((character) => character.character_id === plan.target_character_id);
    return pinned ? [pinned] : [];
  }
  return accountSummary.characters.filter((character) => character.class_name === plan.class_name);
}

function planAppliesToCharacter(plan: LocalLoadoutPlan, character: CharacterSummary): boolean {
  return plan.target_character_id
    ? plan.target_character_id === character.character_id
    : plan.class_name === character.class_name;
}

/** 装备层必须逐件一致，子职业只要求不冲突（游戏内槽位可能不返回子职业插槽）。 */
function compareSlotToPlan(plan: LocalLoadoutPlan, items: readonly ComparableItem[]): ContentComparison {
  const equipment = compareEquipmentToPlan(plan, items);
  if (equipment !== "match") return equipment;
  return compareSubclassToPlan(plan, items);
}

function compareEquipmentToPlan(plan: LocalLoadoutPlan, items: readonly ComparableItem[]): ContentComparison {
  let comparedCount = 0;
  for (const target of plan.item_targets) {
    // 只限槽位、没点名具体装备的目标不参与内容比对，它本来就没写死是哪一件。
    if (!target.item_hash) continue;
    const slotKey = normalizeCompareSlot(target.slot).key;
    const item = items.find((candidate) => candidate.slotKey === slotKey);
    if (!item) return "different";
    if (item.item_hash === undefined) return "unknown";
    if (item.item_hash !== target.item_hash) return "different";
    if (target.selected_instance_id && item.instance_id && item.instance_id !== target.selected_instance_id) {
      return "different";
    }
    comparedCount += 1;
  }
  return comparedCount ? "match" : "unknown";
}

function compareSubclassToPlan(plan: LocalLoadoutPlan, items: readonly ComparableItem[]): ContentComparison {
  const expected = plan.subclass_target?.subclass_hash;
  if (!expected) return "match";
  const item = items.find((candidate) => candidate.slotKey === "subclass");
  if (!item || item.item_hash === undefined) return "unknown";
  return item.item_hash === expected ? "match" : "different";
}

function toComparableSlotItems(items: readonly CharacterLoadoutSlotItemSummary[]): ComparableItem[] {
  return items.map((item) => ({
    item_hash: item.item_hash,
    instance_id: item.instance_id,
    slotKey: normalizeCompareSlot(item.bucket_name ?? item.name).key
  }));
}

function toComparableAccountItems(items: readonly AccountItemSummary[]): ComparableItem[] {
  return items.map((item) => ({
    item_hash: item.hash,
    instance_id: item.instance_id,
    slotKey: normalizeCompareSlot(item.equipment_bucket_name ?? item.bucket_name ?? item.item_type ?? item.name).key
  }));
}
