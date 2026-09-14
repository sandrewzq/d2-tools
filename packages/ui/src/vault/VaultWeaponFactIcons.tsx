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
