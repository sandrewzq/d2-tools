import type { AmmoTypeKey } from "@d2-tools/core/account/summary";

export function VaultAmmoTypeIcon(props: { type: AmmoTypeKey | undefined }) {
  const count = props.type === "heavy" ? 3 : props.type === "special" ? 2 : 1;
  return (
    <span className={`vault-ammo-icon ammo-${props.type ?? "unknown"}`} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => <i key={index} />)}
    </span>
  );
}

export function VaultDamageTypeIcon(props: {
  damageType: number | undefined;
  src?: string;
  className?: string;
}) {
  const src = props.src ?? getVaultDamageTypeIconUrl(props.damageType);
  return src ? <img className={props.className} alt="" aria-hidden="true" src={src} /> : null;
}

function getVaultDamageTypeIconUrl(damageType: number | undefined): string | undefined {
  const paths: Partial<Record<number, string>> = {
    1: "DestinyDamageTypeDefinition_3385a924fd3ccb92c343ade19f19a370.png",
    2: "DestinyDamageTypeDefinition_092d066688b879c807c3b460afdd61e6.png",
    3: "DestinyDamageTypeDefinition_2a1773e10968f2d088b97c22b22bba9e.png",
    4: "DestinyDamageTypeDefinition_ceb2f6197dccf3958bb31cc783eb97a0.png",
    6: "DestinyDamageTypeDefinition_530c4c3e7981dc2aefd24fd3293482bf.png",
    7: "DestinyDamageTypeDefinition_b2fe51a94f3533f97079dfa0d27a4096.png"
  };
  const path = damageType === undefined ? undefined : paths[damageType];
  return path ? `https://www.bungie.net/common/destiny2_content/icons/${path}` : undefined;
}
