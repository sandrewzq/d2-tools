import type { AmmoTypeKey } from "@d2-tools/core/account/summary";
import { GameCombatIcon, gameDamageTypeKey } from "../media/GameCombatIcon.js";

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
