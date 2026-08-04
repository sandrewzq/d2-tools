import type { ImgHTMLAttributes } from "react";
import { GameAssetImage } from "./GameAssetImage.js";

export type GameDamageTypeKey = "kinetic" | "arc" | "solar" | "void" | "stasis" | "strand";
export type GameChampionTypeKey = "barrier" | "overload" | "unstoppable";
export type GameAmmoTypeKey = "primary" | "special" | "heavy";

export type GameCombatIconProps = {
  kind: "damage" | "champion" | "ammo";
  type: string;
  src?: string | null;
  className?: string;
  size?: "default" | "compact";
  loading?: ImgHTMLAttributes<HTMLImageElement>["loading"];
};

const damageIconPaths: Record<GameDamageTypeKey, string> = {
  kinetic: "DestinyDamageTypeDefinition_3385a924fd3ccb92c343ade19f19a370.png",
  arc: "DestinyDamageTypeDefinition_092d066688b879c807c3b460afdd61e6.png",
  solar: "DestinyDamageTypeDefinition_2a1773e10968f2d088b97c22b22bba9e.png",
  void: "DestinyDamageTypeDefinition_ceb2f6197dccf3958bb31cc783eb97a0.png",
  stasis: "DestinyDamageTypeDefinition_530c4c3e7981dc2aefd24fd3293482bf.png",
  strand: "DestinyDamageTypeDefinition_b2fe51a94f3533f97079dfa0d27a4096.png"
};

const damageTypeKeys: Partial<Record<number, GameDamageTypeKey>> = {
  1: "kinetic",
  2: "arc",
  3: "solar",
  4: "void",
  6: "stasis",
  7: "strand"
};

export function GameCombatIcon(props: GameCombatIconProps) {
  const src = props.kind === "ammo"
    ? undefined
    : props.src?.trim() || (props.kind === "damage" && isDamageTypeKey(props.type)
      ? damageIconUrl(props.type)
      : undefined);
  const ammoSegments = props.kind === "ammo" && isAmmoTypeKey(props.type)
    ? props.type === "heavy" ? 3 : props.type === "special" ? 2 : 1
    : 0;
  return (
    <span
      className={["game-combat-icon", props.size === "compact" ? "is-compact" : "", props.className].filter(Boolean).join(" ")}
      data-combat-kind={props.kind}
      data-combat-type={props.type}
      aria-hidden="true"
    >
      {src
        ? <GameAssetImage src={src} alt="" loading={props.loading ?? "eager"} />
        : ammoSegments
          ? <span className="game-ammo-glyph">{Array.from({ length: ammoSegments }, (_, index) => <i key={index} />)}</span>
          : null}
    </span>
  );
}

export function gameDamageTypeKey(value: number | undefined): GameDamageTypeKey | undefined {
  return value === undefined ? undefined : damageTypeKeys[value];
}

function damageIconUrl(type: GameDamageTypeKey): string {
  return `https://www.bungie.net/common/destiny2_content/icons/${damageIconPaths[type]}`;
}

function isDamageTypeKey(value: string): value is GameDamageTypeKey {
  return value in damageIconPaths;
}

function isAmmoTypeKey(value: string): value is GameAmmoTypeKey {
  return value === "primary" || value === "special" || value === "heavy";
}
