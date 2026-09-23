import type { AmmoTypeKey } from "@d2-tools/core/account/summary";
import { GameCombatIcon, gameDamageTypeKey } from "../media/GameCombatIcon.js";

export type VaultChampionType = "barrier" | "overload" | "unstoppable";

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

/** 弹药槽位就是三个已知槽位键，按键判定；显示名会随界面语言变，不能拿它反推。 */
export function weaponSlotTypeFromKey(key: string): VaultWeaponSlotType | undefined {
  return key === "kinetic" || key === "energy" || key === "power" ? key : undefined;
}

/** 锻造标识字形：沿用仓库卡片“锻造”文字的菱形语言，不仿造游戏图标。 */
export function VaultCraftingGlyph(props: { kind: "crafted" | "uncrafted" }) {
  return <span className="vault-crafting-glyph" data-crafting-kind={props.kind} aria-hidden="true" />;
}
