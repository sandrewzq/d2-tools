import type {
  ArmorSocketLabel,
  ArmorStatTrack,
  SelectedItemSourceKind,
  WeaponDetailAmmo,
  WeaponDetailEntryKind,
  WeaponSocketColumnLabel,
  WeaponStatTrack
} from "@d2-tools/app/items";
import type { ItemDetailCopy } from "../i18n/types.js";
import { itemDetailTemplate, itemDetailText } from "./itemDetailCopy.js";

/**
 * 装备详情里由 app 判种类、由 UI 定措辞的那些标签。
 *
 * `packages/app` 不认识界面语言，标签只给「是哪一项」，措辞在这里按 `copy` 现算。
 * zh-CN 侧 `inline` 留空、key 就是最终显示的中文原文，所以这里的每个 key 都必须
 * 写成迁移前 app 直接产出的那句中文，逐字一致。
 */

type WeaponStatKey = WeaponStatTrack["key"];
type AmmoTypeKey = WeaponDetailAmmo["key"];
type ArmorStatKey = ArmorStatTrack["key"];
type ItemDetailEntryKind = WeaponDetailEntryKind;

const weaponStatNames: Record<WeaponStatKey, string> = {
  impact: "伤害",
  range: "射程",
  stability: "稳定性",
  handling: "操控性",
  reload_speed: "装填速度",
  aim_assistance: "辅助瞄准",
  recoil_direction: "后坐方向",
  airborne_effectiveness: "空中效率",
  ammo_generation: "弹药生成",
  magazine: "弹匣",
  rounds_per_minute: "射速",
  charge_time: "蓄力时间",
  draw_time: "拉弓时间"
};

const armorStatNames: Record<ArmorStatKey, string> = {
  health: "生命值",
  melee: "近战",
  grenade: "手雷",
  super: "超能",
  class: "职业",
  weapon: "武器"
};

const ammoNames: Record<AmmoTypeKey, string> = {
  primary: "主要弹药",
  special: "特殊弹药",
  heavy: "重型弹药"
};

/** 武器属性名。 */
export function weaponStatLabel(copy: ItemDetailCopy, key: WeaponStatKey): string {
  return itemDetailText(copy, weaponStatNames[key]);
}

/** 护甲属性名。 */
export function armorStatLabel(copy: ItemDetailCopy, key: ArmorStatKey): string {
  return itemDetailText(copy, armorStatNames[key]);
}

/** 弹药类型名，摘要里那颗图标旁边的字。 */
export function weaponAmmoLabel(copy: ItemDetailCopy, key: AmmoTypeKey): string {
  return itemDetailText(copy, ammoNames[key]);
}

/** 锻造标识。只做锻造，不标强化。 */
export function weaponCraftingLabel(copy: ItemDetailCopy, kind: "crafted" | "craftable"): string {
  return itemDetailText(copy, kind === "crafted" ? "锻造" : "可锻造");
}

/** 身份标签：这件东西是从哪个入口打开的。 */
export function itemDetailEntryLabel(copy: ItemDetailCopy, entry: ItemDetailEntryKind): string {
  switch (entry) {
    case "vendor": return itemDetailText(copy, "商人");
    case "vault": return itemDetailText(copy, "仓库");
    case "account": return itemDetailText(copy, "账号");
    case "loadout": return itemDetailText(copy, "配装");
    default: return itemDetailText(copy, "资料库");
  }
}

/** 账号实例的所在位置名。调用方没给现成标签时按来源种类现查。 */
export function itemDetailSourceLocationLabel(copy: ItemDetailCopy, kind: SelectedItemSourceKind): string {
  switch (kind) {
    case "equipped": return itemDetailText(copy, "已装备");
    case "inventory": return itemDetailText(copy, "角色背包");
    case "postmaster": return itemDetailText(copy, "邮政官");
    default: return itemDetailText(copy, "仓库");
  }
}

/** 武器插槽列名。编号由 app 定，`Perk 1` / `插槽 2` 这类写法在这里现算。 */
export function weaponSocketColumnLabelText(copy: ItemDetailCopy, label: WeaponSocketColumnLabel): string {
  switch (label.kind) {
    case "core_upgrade": return itemDetailText(copy, "核心升级");
    case "sword_core": return itemDetailText(copy, "柄芯");
    case "grip": return itemDetailText(copy, "握把");
    case "bowstring": return itemDetailText(copy, "弓弦");
    case "arrow": return itemDetailText(copy, "箭杆");
    case "haft": return itemDetailText(copy, "偃月杆");
    case "sight": return itemDetailText(copy, "瞄具");
    case "blade": return itemDetailText(copy, "剑刃");
    case "guard": return itemDetailText(copy, "护手");
    case "battery": return itemDetailText(copy, "电池");
    case "stock": return itemDetailText(copy, "枪托");
    case "role": return weaponColumnRoleLabel(copy, label.role);
    case "perk_index": return itemDetailTemplate(copy, "Perk {index}", { index: label.index });
    case "roll_slot": return weaponRollSlotLabel(copy, label.slot);
    default: return itemDetailTemplate(copy, "插槽 {index}", { index: label.index });
  }
}

type WeaponColumnRole = Extract<WeaponSocketColumnLabel, { kind: "role" }>["role"];
type WeaponRollSlot = Extract<WeaponSocketColumnLabel, { kind: "roll_slot" }>["slot"];

function weaponColumnRoleLabel(copy: ItemDetailCopy, role: WeaponColumnRole): string {
  switch (role) {
    case "intrinsic": return itemDetailText(copy, "固有能力");
    case "barrel": return itemDetailText(copy, "枪管");
    case "magazine": return itemDetailText(copy, "弹匣");
    case "origin": return itemDetailText(copy, "起源特性");
    default: return itemDetailText(copy, "武器特性");
  }
}

/**
 * 账号 Roll 快照的栏位名。这几句跟 `packages/core/src/account/summary.ts` 的
 * `weaponRollSlotLabel` 逐字对齐：快照路径原来直接用那套中文，迁移后必须一字不差。
 */
function weaponRollSlotLabel(copy: ItemDetailCopy, slot: WeaponRollSlot): string {
  switch (slot) {
    case "barrel": return itemDetailText(copy, "枪管/瞄具");
    case "magazine": return itemDetailText(copy, "第二列");
    case "masterwork": return itemDetailText(copy, "大师");
    case "perk1": return itemDetailTemplate(copy, "Perk {index}", { index: 1 });
    case "perk2": return itemDetailTemplate(copy, "Perk {index}", { index: 2 });
    case "origin": return itemDetailText(copy, "起源特性");
    default: return itemDetailText(copy, "其他插槽");
  }
}

/** 护甲插槽列名。 */
export function armorSocketLabelText(copy: ItemDetailCopy, label: ArmorSocketLabel): string {
  switch (label.kind) {
    case "upgrade": return itemDetailText(copy, "护甲升级");
    case "special": return itemDetailText(copy, "特殊插槽");
    case "activity_mod": return itemDetailText(copy, "通用／活动模组位");
    case "tuning_mod": return itemDetailText(copy, "调整模组位");
    default: return itemDetailTemplate(copy, "部位模组位 {index}", { index: label.index });
  }
}
