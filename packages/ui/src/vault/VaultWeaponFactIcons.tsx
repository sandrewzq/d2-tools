import type { AmmoTypeKey } from "@d2-tools/core/account/summary";
import { GameCombatIcon, gameDamageTypeKey } from "../media/GameCombatIcon.js";

export type VaultChampionType = "barrier" | "overload" | "unstoppable";
export const championTypeLabels: Record<VaultChampionType, string> = {
  barrier: "反屏障",
  overload: "反过载",
  unstoppable: "反势不可挡"
};

export function championTypeFromBreakerType(value: number | undefined, summary?: string): VaultChampionType | undefined {
  if (summary === "barrier" || summary === "overload" || summary === "unstoppable") return summary;
  return value === 1 ? "barrier" : value === 2 ? "overload" : value === 3 ? "unstoppable" : undefined;
}

export function VaultChampionTypeIcon(props: { type: VaultChampionType; src?: string; size?: "default" | "compact" }) {
  return <GameCombatIcon kind="champion" type={props.type} src={props.src} size={props.size} />;
}

export function VaultAmmoTypeIcon(props: {
  type: AmmoTypeKey | undefined;
  size?: "default" | "compact";
}) {
  return props.type
    ? <GameCombatIcon kind="ammo" type={props.type} size={props.size} />
    : null;
}

export function VaultDamageTypeIcon(props: {
  damageType: number | undefined;
  src?: string;
  size?: "default" | "compact";
}) {
  const type = gameDamageTypeKey(props.damageType);
  return type ? (
    <GameCombatIcon
      kind="damage"
      type={type}
      src={props.src}
      size={props.size}
    />
  ) : null;
}

export type VaultWeaponSlotType = "kinetic" | "energy" | "power";

export function VaultSlotTypeIcon(props: {
  type: VaultWeaponSlotType;
  size?: "default" | "compact";
}) {
  return <GameCombatIcon kind="slot" type={props.type} size={props.size} />;
}

/** 按槽位文案解析动能 / 能量 / 威能，用于槽位筛选的图标与配色。 */
export function weaponSlotTypeFromLabel(label: string): VaultWeaponSlotType | undefined {
  if (label.includes("动能")) return "kinetic";
  if (label.includes("能量")) return "energy";
  if (label.includes("威能")) return "power";
  return undefined;
}

/** 锻造标识字形：沿用仓库卡片“锻造”文字的菱形语言，不仿造游戏图标。 */
export function VaultCraftingGlyph(props: { kind: "crafted" | "uncrafted" }) {
  return <span className="vault-crafting-glyph" data-crafting-kind={props.kind} aria-hidden="true" />;
}
